(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const COMMON = global.FGO_SIM_COMMON_EFFECTS ||
    (typeof require !== 'undefined' ? require('./common-effects.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !COMMON) {
    throw new Error('defense and resistance effects require data, engine and common effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__defenseResistanceEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_DEFENSE_RESISTANCE_EFFECTS;
    return;
  }
  proto.__defenseResistanceEffectsInstalled = true;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const DEFENSE_NAMES = {
    antiEnforcementDefense: '対粛正防御',
    invincible: '無敵',
    evade: '回避'
  };
  const STATUS_NAMES = {
    antiEnforcementDefense: '対粛正防御',
    critRateResist: '被クリティカル発生耐性'
  };

  function resolveOcUses(effect, oc) {
    if (!effect || !Array.isArray(effect.ocUses)) return effect && effect.uses == null ? null : Number(effect.uses);
    const index = clamp(oc || 1, 1, 5) - 1;
    return Math.max(0, Math.floor(Number(effect.ocUses[index] || 0)));
  }

  function isActiveDefense(status) {
    if (!status) return false;
    const turnsRemain = status.remaining == null || status.remaining < 0 || status.remaining > 0;
    const usesRemain = status.uses == null || status.uses > 0;
    return turnsRemain && usesRemain;
  }

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect) return originalApplyEffect.call(this, effect, source, selectedTargetId, context);

    const detail = context || {};
    const resolvedUses = resolveOcUses(effect, detail.oc);
    const resolvedEffect = Array.isArray(effect.ocUses)
      ? { ...effect, uses: resolvedUses }
      : effect;

    if (resolvedEffect.type !== 'antiEnforcementDefense') {
      return originalApplyEffect.call(this, resolvedEffect, source, selectedTargetId, context);
    }

    const targets = this._effectTargets(resolvedEffect, source, selectedTargetId);
    const results = targets.map((target) => {
      const existing = (target.statuses || []).find((status) =>
        status.type === 'antiEnforcementDefense' && isActiveDefense(status)
      );
      if (existing) {
        this._log(`${target.name}には対粛正防御が残っているため、再付与しなかった。`, 'defense');
        return { applied: false, reason: 'alreadyActive', target, status: existing };
      }

      const status = this._addStatus(
        target,
        { ...resolvedEffect, uses: resolvedUses == null ? 1 : resolvedUses },
        0,
        source && source.name
      );
      this._log(`${target.name}に対粛正防御（${status.uses}回・${status.remaining}T）を付与。`, 'defense');
      return { applied: true, target, status };
    });

    return {
      applied: results.some((result) => result.applied),
      results
    };
  };

  const originalCanAvoid = proto._canAvoid;
  proto._canAvoid = function (ally, enemy, isNp) {
    this._lastDefenseStatus = null;
    const antiEnforcement = this._selectDefenseStatus(ally, 'antiEnforcementDefense');
    if (antiEnforcement) {
      this._lastDefenseStatus = antiEnforcement;
      this._consumeDefenseStatus(ally, antiEnforcement);
      return true;
    }
    return originalCanAvoid.call(this, ally, enemy, isNp);
  };

  proto._enemyCriticalChance = function (enemy, ally, isNp) {
    if (isNp || !enemy || !ally) return 0;
    const base = Number(enemy.critRate || 0);
    const rateDown = this._statusTotal(enemy, 'critRateDown');
    const rateResist = this._statusTotal(ally, 'critRateResist');
    return clamp(base - rateDown - rateResist, 0, 100);
  };

  // 対象ごとの被クリティカル発生耐性を参照するため、共通敵ターン処理を拡張する。
  // 防御判定は攻撃アクションごとに1回だけ行われるため、多段Hitでも防御状態は1回だけ消費する。
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
            ? (DEFENSE_NAMES[this._lastDefenseStatus.type] || this._lastDefenseStatus.type)
            : '回避';
          this._log(`${ally.name}は${enemy.name}の攻撃を防いだ（${defenseName}）。`, 'evade');
          return;
        }

        const criticalChance = this._enemyCriticalChance(enemy, ally, isNp);
        const critical = !isNp && this.rng() * 100 < criticalChance;
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

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      const name = STATUS_NAMES[status.type];
      if (!name) return status;
      return {
        ...status,
        name,
        statusIcon: status.statusIcon || DATA.statusIcons[status.type]
      };
    });
  };

  DATA.statusIcons.antiEnforcementDefense = DATA.statusIcons.antiEnforcementDefense || 'Invincible.webp';
  DATA.statusIcons.critRateResist = DATA.statusIcons.critRateResist || 'Resistanceup.webp';
  COMMON.statusNames.antiEnforcementDefense = STATUS_NAMES.antiEnforcementDefense;
  COMMON.statusNames.critRateResist = STATUS_NAMES.critRateResist;
  COMMON.defensePriority = '対粛正防御 > 無敵 > 回避。同種内では残りターンが短い状態、回数無制限、残り回数が少ない状態、付与順の順に使用';

  const API = {
    statusNames: { ...STATUS_NAMES },
    defensePriority: ['antiEnforcementDefense', 'invincible', 'evade'],
    resolveOcUses
  };

  global.FGO_SIM_DEFENSE_RESISTANCE_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);