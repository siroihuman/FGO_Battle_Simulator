(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const COMMON = global.FGO_SIM_COMMON_EFFECTS ||
    (typeof require !== 'undefined' ? require('./common-effects.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !COMMON) {
    throw new Error('combat defense effects require data, engine and common effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__combatDefenseEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_COMBAT_DEFENSE_EFFECTS;
    return;
  }
  proto.__combatDefenseEffectsInstalled = true;

  const STATUS_NAMES = {
    defenseDown: '防御力ダウン',
    instantDeathImmune: '即死無効',
    damageCut: 'ダメージカット'
  };

  function isActiveStatus(status) {
    if (!status) return false;
    const turnsRemain = status.remaining == null || status.remaining < 0 || status.remaining > 0;
    const usesRemain = status.uses == null || status.uses > 0;
    return turnsRemain && usesRemain;
  }

  function activeStatuses(unit, type) {
    return (unit && unit.statuses ? unit.statuses : [])
      .filter((status) => status.type === type && isActiveStatus(status));
  }

  function withDefenseDown(engine, target, callback) {
    if (!target) return callback();
    const defenseDown = engine._statusTotal(target, 'defenseDown');
    if (!defenseDown) return callback();

    // 既存式 1 + attackUp - defenseUp に対し、負数の防御力アップを一時合成することで
    // 1 + attackUp - defenseUp + defenseDown を再現する。
    // 既存の defenseUp 負数データもそのまま加算され、互換性を維持する。
    const originalStatuses = target.statuses;
    target.statuses = originalStatuses.concat([{
      type: 'defenseUp',
      value: -Number(defenseDown || 0),
      source: '共通処理：防御力ダウン',
      remaining: -1,
      uses: null,
      debuff: true,
      synthetic: true
    }]);
    try {
      return callback();
    } finally {
      target.statuses = originalStatuses;
    }
  }

  const originalCalculateAttackTotal = proto._calculateAttackTotal;
  proto._calculateAttackTotal = function (actor, target, action, chainContext) {
    return withDefenseDown(this, target, () =>
      originalCalculateAttackTotal.call(this, actor, target, action, chainContext)
    );
  };

  proto._consumeCriticalPowerUses = function (actor, action) {
    if (!actor || !action || action.type !== 'card' || !action.critical ||
        !['quick', 'arts', 'buster'].includes(action.card)) return [];

    const consumed = activeStatuses(actor, 'critUp')
      .filter((status) => status.uses != null)
      .slice();

    consumed.forEach((status) => {
      const source = status.source || 'クリティカル威力アップ';
      this._consumeStatus(actor, status);
      const remaining = status.uses > 0 ? status.uses : 0;
      this._log(`${actor.name}の回数制クリティカル威力アップを1回消費（${source}／残り${remaining}回）。`, 'critical');
    });
    return consumed;
  };

  const originalResolveAttackOnTarget = proto._resolveAttackOnTarget;
  proto._resolveAttackOnTarget = function (actor, target, action, chainContext) {
    const shouldConsume = Boolean(
      actor && target && actor.alive && target.alive && action &&
      action.type === 'card' && action.critical && ['quick', 'arts', 'buster'].includes(action.card)
    );
    const result = originalResolveAttackOnTarget.call(this, actor, target, action, chainContext);
    if (shouldConsume) this._consumeCriticalPowerUses(actor, action);
    return result;
  };

  const originalApplyInstantDeath = proto._applyInstantDeath;
  proto._applyInstantDeath = function (enemy, ally) {
    // 即死効果が存在しない攻撃や、既に戦闘不能の対象では状態を消費しない。
    if (!enemy || !enemy.instantDeathRate || !ally || !ally.alive) {
      return originalApplyInstantDeath.call(this, enemy, ally);
    }

    const immune = activeStatuses(ally, 'instantDeathImmune')[0] || null;
    if (!immune) return originalApplyInstantDeath.call(this, enemy, ally);

    if (immune.uses != null) this._consumeStatus(ally, immune);
    const remaining = immune.uses == null ? '∞' : Math.max(0, Number(immune.uses || 0));
    this._log(`${ally.name}の即死無効が${enemy.name}の即死効果を無効化（残り${remaining}回）。`, 'resist');
    return false;
  };

  proto._damageCutStatuses = function (unit) {
    return activeStatuses(unit, 'damageCut');
  };

  proto._damageCutTotal = function (unit) {
    return this._damageCutStatuses(unit)
      .reduce((sum, status) => sum + Math.max(0, Number(status.value || 0)), 0);
  };

  // 実際の敵行動中だけ、回数制ダメージカットの消費と軽減ログを有効にする。
  const originalPerformEnemyTurn = proto._performEnemyTurn;
  proto._performEnemyTurn = function () {
    const previous = this._resolvingEnemyAttackAction;
    this._resolvingEnemyAttackAction = true;
    try {
      return originalPerformEnemyTurn.apply(this, arguments);
    } finally {
      this._resolvingEnemyAttackAction = previous;
    }
  };

  const originalEnemyAttackDamage = proto._enemyAttackDamage;
  proto._enemyAttackDamage = function (enemy, ally, isNp, critical) {
    const beforeCut = withDefenseDown(this, ally, () =>
      originalEnemyAttackDamage.call(this, enemy, ally, isNp, critical)
    );
    const statuses = this._damageCutStatuses(ally);
    const totalCut = statuses.reduce((sum, status) => sum + Math.max(0, Number(status.value || 0)), 0);
    const finalDamage = Math.max(0, Math.floor(Number(beforeCut || 0) - totalCut));
    const reduced = Math.max(0, Number(beforeCut || 0) - finalDamage);

    if (this._resolvingEnemyAttackAction && reduced > 0) {
      this._log(`${ally.name}のダメージカット：${reduced.toLocaleString('ja-JP')}軽減（${Number(beforeCut || 0).toLocaleString('ja-JP')}→${finalDamage.toLocaleString('ja-JP')}）。`, 'defense');
      statuses.filter((status) => status.uses != null).forEach((status) => this._consumeStatus(ally, status));
    }
    return finalDamage;
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

  DATA.statusIcons.defenseDown = DATA.statusIcons.defenseDown || 'Defensedown.webp';
  DATA.statusIcons.instantDeathImmune = DATA.statusIcons.instantDeathImmune || 'Instaresistup.webp';
  DATA.statusIcons.damageCut = DATA.statusIcons.damageCut || 'Defenseup.webp';
  COMMON.statusNames.defenseDown = STATUS_NAMES.defenseDown;
  COMMON.statusNames.instantDeathImmune = STATUS_NAMES.instantDeathImmune;
  COMMON.statusNames.damageCut = STATUS_NAMES.damageCut;

  const API = {
    statusNames: { ...STATUS_NAMES },
    damageFormula: {
      attackDefense: '1 + attackUp - defenseUp + defenseDown',
      fixedDefense: 'max(0, finalDamage - sum(damageCut))'
    }
  };

  global.FGO_SIM_COMBAT_DEFENSE_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
