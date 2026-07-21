(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine) {
    throw new Error('common effects runtime requires data and engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__commonEffectsRuntimeInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_COMMON_EFFECTS;
    return;
  }
  proto.__commonEffectsRuntimeInstalled = true;

  const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const valueAt = (effect, level, oc) => {
    if (Array.isArray(effect.values)) return Number(effect.values[Math.max(1, Math.min(10, level || 10)) - 1] || 0);
    if (Array.isArray(effect.ocValues)) return Number(effect.ocValues[Math.max(1, Math.min(5, oc || 1)) - 1] || 0);
    return Number(effect.value || 0);
  };

  const DEBUFF_TYPES = new Set([
    'charm', 'stun', 'burn', 'poison', 'curse', 'defenseDown', 'attackDown',
    'cardResist', 'critRateDown', 'critDamageDown', 'damageTakenUp'
  ]);
  const MENTAL_DEBUFF_TYPES = new Set(['charm', 'fear', 'confusion', 'sleep']);
  const ACTION_BLOCK_TYPES = new Set(['charm', 'stun']);
  const DOT_TYPES = ['poison', 'burn', 'curse'];
  const STATUS_NAMES = {
    charm: '魅了',
    stun: 'スタン',
    burn: 'やけど',
    poison: '毒',
    curse: '呪い',
    dotAmplify: '継続ダメージ増幅',
    debuffSuccess: '弱体付与成功率アップ',
    charmSuccessUp: '魅了付与成功率アップ',
    onNormalAttackApplyDebuff: '通常攻撃時弱体付与'
  };
  const DOT_NAMES = { poison: '毒', burn: 'やけど', curse: '呪い' };
  const STATUS_META_KEYS = [
    'debuffType', 'debuffDuration', 'debuffValue', 'debuffStatusIcon', 'chance',
    'normalCardsOnly', 'dotType', 'trigger', 'sureHitOnly', 'ignoreResistance'
  ];

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    STATUS_META_KEYS.forEach((key) => {
      if (effect[key] !== undefined) status[key] = effect[key];
    });
    return status;
  };

  proto._debuffSuccessChance = function (source, target, effect) {
    const debuffType = effect.debuffType || effect.type;
    const base = clampPercent(effect.chance == null ? 100 : effect.chance);
    const generalBonus = source ? this._statusTotal(source, 'debuffSuccess') : 0;
    const typeBonus = source && debuffType === 'charm'
      ? this._statusTotal(source, 'charmSuccessUp')
      : 0;
    const generalResist = target ? this._statusTotal(target, 'debuffResist') : 0;
    const mentalResist = target && MENTAL_DEBUFF_TYPES.has(debuffType)
      ? this._statusTotal(target, 'mentalResist')
      : 0;
    const finalChance = effect.ignoreResistance
      ? clampPercent(base + generalBonus + typeBonus)
      : clampPercent(base + generalBonus + typeBonus - generalResist - mentalResist);
    return {
      debuffType,
      base,
      generalBonus,
      typeBonus,
      generalResist,
      mentalResist,
      finalChance
    };
  };

  proto._tryApplyDebuff = function (source, target, effect, sourceLabel) {
    if (!target || !target.alive) return { success: false, invalidTarget: true };
    const calculation = this._debuffSuccessChance(source, target, effect);
    const success = this.rng() * 100 < calculation.finalChance;
    const label = STATUS_NAMES[calculation.debuffType] || calculation.debuffType;
    this._log(
      `${target.name}への${label}付与判定：基礎${calculation.base}%／補正後${calculation.finalChance}%／${success ? '成功' : '失敗'}。`,
      success ? 'debuff' : 'resist'
    );
    if (!success) return { success: false, calculation };

    const duration = effect.debuffDuration == null
      ? (effect.duration == null ? 1 : Number(effect.duration))
      : Number(effect.debuffDuration);
    const appliedEffect = {
      ...effect,
      type: calculation.debuffType,
      duration,
      debuff: true,
      statusIcon: effect.debuffStatusIcon || effect.statusIcon || null
    };
    const appliedValue = effect.debuffValue == null
      ? Number(effect.value || 0)
      : Number(effect.debuffValue);
    const status = this._addStatus(
      target,
      appliedEffect,
      appliedValue,
      sourceLabel || (source && source.name) || ''
    );
    return { success: true, calculation, status };
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    const isChanceDebuff = effect && effect.chance != null &&
      (effect.debuff === true || DEBUFF_TYPES.has(effect.type));
    if (!isChanceDebuff || effect.type === 'onNormalAttackApplyDebuff') {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const level = context && context.level ? context.level : 10;
    const oc = context && context.oc ? context.oc : 1;
    const resolvedEffect = { ...effect, value: valueAt(effect, level, oc) };
    const targets = this._effectTargets(effect, source, selectedTargetId);
    return targets.map((target) => this._tryApplyDebuff(source, target, resolvedEffect, source && source.name));
  };

  proto._runEffectHooks = function (eventName, context) {
    const detail = context || {};
    if (eventName === 'afterNormalAttack') {
      const actor = detail.actor;
      const target = detail.target;
      const action = detail.action || {};
      if (!actor || !target || action.type !== 'card' || !['quick', 'arts', 'buster'].includes(action.card)) return [];
      const triggerStatuses = (actor.statuses || [])
        .filter((status) => status.type === 'onNormalAttackApplyDebuff')
        .slice();
      return triggerStatuses.map((status) => this._tryApplyDebuff(actor, target, {
        type: status.debuffType,
        debuffType: status.debuffType,
        chance: status.chance == null ? 100 : status.chance,
        debuffDuration: status.debuffDuration == null ? 1 : status.debuffDuration,
        debuffValue: status.debuffValue,
        debuffStatusIcon: status.debuffStatusIcon,
        debuff: true
      }, status.source || actor.name));
    }

    if (eventName === 'beforeEnemyAction') {
      const actor = detail.actor;
      if (!actor) return { prevented: false };
      const blocking = (actor.statuses || []).find((status) => ACTION_BLOCK_TYPES.has(status.type));
      if (!blocking) return { prevented: false };
      const label = STATUS_NAMES[blocking.type] || blocking.type;
      this._log(`${actor.name}は${label}により行動できない。`, 'debuff');
      return { prevented: true, status: blocking };
    }

    if (eventName === 'turnEnd') return { handled: true };
    return undefined;
  };

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    const actor = this.getUnit(action.actorId);
    const target = this._currentEnemyTarget();
    const result = originalExecuteCard.call(this, action, chainContext);
    if (actor && target && ['quick', 'arts', 'buster'].includes(action.card)) {
      this._runEffectHooks('afterNormalAttack', { actor, target, action, chainContext });
    }
    return result;
  };

  proto._selectDefenseStatus = function (unit, type) {
    return (unit.statuses || [])
      .map((status, index) => ({ status, index }))
      .filter((entry) => entry.status.type === type && (entry.status.uses == null || entry.status.uses > 0))
      .sort((a, b) => {
        const aTurns = a.status.remaining < 0 ? Number.MAX_SAFE_INTEGER : a.status.remaining;
        const bTurns = b.status.remaining < 0 ? Number.MAX_SAFE_INTEGER : b.status.remaining;
        if (aTurns !== bTurns) return aTurns - bTurns;
        const aUnlimited = a.status.uses == null ? 0 : 1;
        const bUnlimited = b.status.uses == null ? 0 : 1;
        if (aUnlimited !== bUnlimited) return aUnlimited - bUnlimited;
        const aUses = a.status.uses == null ? Number.MAX_SAFE_INTEGER : a.status.uses;
        const bUses = b.status.uses == null ? Number.MAX_SAFE_INTEGER : b.status.uses;
        return aUses - bUses || a.index - b.index;
      })[0]?.status || null;
  };

  proto._consumeDefenseStatus = function (unit, status) {
    if (!status || status.uses == null) return false;
    this._consumeStatus(unit, status);
    return true;
  };

  proto._canAvoid = function (ally, enemy) {
    this._lastDefenseStatus = null;
    if (this._hasStatus(enemy, 'invinciblePierce')) return false;
    const sureHit = this._hasStatus(enemy, 'sureHit');
    let status = sureHit ? null : this._selectDefenseStatus(ally, 'evade');
    if (!status) status = this._selectDefenseStatus(ally, 'invincible');
    if (!status) return false;
    this._lastDefenseStatus = status;
    this._consumeDefenseStatus(ally, status);
    return true;
  };

  proto._dotDamage = function (unit, dotType) {
    const base = (unit.statuses || [])
      .filter((status) => status.type === dotType)
      .reduce((sum, status) => sum + Number(status.value || 0), 0);
    const amplify = (unit.statuses || [])
      .filter((status) => status.type === 'dotAmplify' && status.dotType === dotType)
      .reduce((sum, status) => sum + Number(status.value || 0), 0);
    return {
      base,
      amplify,
      total: Math.floor(Math.max(0, base * (1 + amplify / 100)))
    };
  };

  proto._applyTurnEndDots = function (unit) {
    const results = [];
    for (const dotType of DOT_TYPES) {
      if (!unit.alive) break;
      const damage = this._dotDamage(unit, dotType);
      if (damage.total <= 0) continue;
      this._takeDamage(unit, damage.total, DOT_NAMES[dotType]);
      this._log(
        `${unit.name}に${DOT_NAMES[dotType]}ダメージ${damage.total.toLocaleString('ja-JP')}。` +
        (damage.amplify ? `（増幅${damage.amplify}%）` : ''),
        'damage'
      );
      results.push({ dotType, ...damage });
    }
    return results;
  };

  proto._performEnemyTurn = function () {
    this.state.phase = 'enemy';
    this._log('敵フェイズ。', 'enemy');
    const enemies = this.getAliveEnemies().slice();
    for (const enemy of enemies) {
      if (!this.getAliveAllies().length) break;
      const prevention = this._runEffectHooks('beforeEnemyAction', { actor: enemy });
      if (prevention && prevention.prevented) continue;

      const isNp = enemy.charge >= enemy.chargeMax;
      const targets = isNp && enemy.npTarget === 'all'
        ? this.getAliveAllies().slice()
        : [this.getAliveAllies()[Math.floor(this.rng() * this.getAliveAllies().length)]];
      if (isNp) {
        enemy.charge = 0;
        this._log(`${enemy.name}が宝具を使用。`, 'enemyNp');
      }
      targets.forEach((ally) => {
        if (!ally || !ally.alive) return;
        if (this._canAvoid(ally, enemy, isNp)) {
          const defenseName = this._lastDefenseStatus
            ? (STATUS_NAMES[this._lastDefenseStatus.type] || (this._lastDefenseStatus.type === 'invincible' ? '無敵' : '回避'))
            : '回避';
          this._log(`${ally.name}は${enemy.name}の攻撃を防いだ（${defenseName}）。`, 'evade');
          return;
        }
        const critRateDown = this._statusTotal(enemy, 'critRateDown');
        const critical = !isNp && this.rng() * 100 < Math.max(0, enemy.critRate - critRateDown);
        const damage = this._enemyAttackDamage(enemy, ally, isNp, critical);
        this._takeDamage(ally, damage, enemy.name);
        if (ally.alive) {
          const receivedHits = isNp ? 3 : 1;
          const receivedNp = Math.floor((ally.data.nd * receivedHits + 1e-10) * 100) / 100;
          ally.np = Math.max(0, Math.min(300, ally.np + receivedNp));
          this._log(`${ally.name}は${damage.toLocaleString('ja-JP')}ダメージ${critical ? '（CRITICAL）' : ''}、被ダメージNP+${receivedNp.toFixed(2)}。`, critical ? 'critical' : 'damage');
          if (isNp) this._applyInstantDeath(enemy, ally);
        }
      });
      if (!isNp && enemy.alive) enemy.charge = Math.min(enemy.chargeMax, enemy.charge + 1);
    }

    if (!this.getAliveAllies().length) this._promoteReserve();
    if (!this.getAliveAllies().length) {
      this.state.winner = 'enemies';
      this.state.phase = 'finished';
      this._log('敗北。', 'defeat');
      return;
    }
    this._finishTurn();
  };

  proto._finishTurn = function () {
    this._runEffectHooks('turnEnd', { turn: this.state.turn });
    this.state.mysticCodeCooldowns = this.state.mysticCodeCooldowns.map((ct) => Math.max(0, ct - 1));

    this.state.allies.forEach((ally) => {
      if (ally.alive) {
        const npPerTurn = this._statusTotal(ally, 'npPerTurn');
        if (npPerTurn) {
          this._addNp(ally, npPerTurn, true);
          this._log(`${ally.name}のNPが毎ターン効果で${npPerTurn}%増加。`);
        }
        this._applyTurnEndDots(ally);
      }
      ally.cooldowns = ally.cooldowns.map((ct) => Math.max(0, ct - 1));
      this._removeExpiredStatuses(ally);
    });

    this.state.enemies.forEach((enemy) => {
      if (enemy.alive) this._applyTurnEndDots(enemy);
      this._removeExpiredStatuses(enemy);
    });

    while (this.getAliveAllies().length < 3) {
      const reserve = this.state.allies.find((unit) => unit.alive && unit.hp > 0 && !unit.frontline);
      if (!reserve) break;
      reserve.frontline = true;
      this._log(`${reserve.name}が控えから登場。`, 'turn');
    }
    if (!this.getAliveAllies().length) {
      this.state.winner = 'enemies';
      this.state.phase = 'finished';
      this._log('敗北。', 'defeat');
      return;
    }

    if (!this.getAliveEnemies().length) {
      if (!this._startNextWave()) {
        this.state.winner = 'allies';
        this.state.phase = 'finished';
        this._log('勝利。', 'victory');
        return;
      }
    }

    this.state.stars = Math.max(0, Math.min(50, this.state.nextStars));
    this.state.nextStars = 0;
    this.state.turn += 1;
    this.state.phase = 'command';
    if (this.state.deckCycle >= 3 || this.state.deck.length < 5) this._resetDeck();
    this._drawHand();
    this._log(`TURN ${this.state.turn} 開始。スター${this.state.stars}個。`, 'turn');
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => ({
      ...status,
      name: STATUS_NAMES[status.type] || status.name,
      debuffType: status.debuffType,
      chance: status.chance,
      dotType: status.dotType
    }));
  };

  const API = {
    debuffTypes: Array.from(DEBUFF_TYPES),
    mentalDebuffTypes: Array.from(MENTAL_DEBUFF_TYPES),
    actionBlockTypes: Array.from(ACTION_BLOCK_TYPES),
    dotTypes: DOT_TYPES.slice(),
    statusNames: { ...STATUS_NAMES },
    defensePriority: '残りターンが短い状態を優先し、同値なら回数無制限、残り回数が少ない状態、付与順の順に使用'
  };

  global.FGO_SIM_COMMON_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
