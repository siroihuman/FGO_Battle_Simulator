(function (global) {
  'use strict';

  const M = global.FGO_SERVANT_MECHANICS || (typeof require !== 'undefined' ? require('./index.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE || (typeof require !== 'undefined' ? require('../engine.js') : null);
  if (!M || !ENGINE || !ENGINE.BattleEngine) throw new Error('servant mechanics runtime requires registry and engine.');

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__servantMechanicsRuntimeInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = M;
    return;
  }

  // engine.js側に正式なフック実装がある場合は、二重実行を避けるためラップしない。
  if (typeof proto._runEffectHooks === 'function' && typeof proto._runServantHook === 'function') {
    proto.__servantMechanicsRuntimeInstalled = true;
    if (typeof module !== 'undefined' && module.exports) module.exports = M;
    return;
  }

  proto.__servantMechanicsRuntimeInstalled = true;

  proto._runServantHook = function (actor, eventName, context) {
    if (!actor) return undefined;
    return M.runServantHook(this, actor.servantId, eventName, context || {});
  };

  proto._runEffectHooks = function (eventName, context) {
    return M.runEffectHooks(this, eventName, context || {});
  };

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    const actor = this.getUnit(action.actorId);
    const card = this.state.hand.find((entry) => entry.id === action.cardId);
    const target = this._currentEnemyTarget();
    if (!actor || !card || !target) return originalExecuteCard.call(this, action, chainContext);

    // 旧engine.js内の直書き処理だけを一時的に無効化し、個別モジュール側で1回だけ発動する。
    const isolatedTypes = new Set(['busterNormalNp', 'onAttackAddTrait']);
    const isolatedStatuses = actor.statuses.filter((status) => isolatedTypes.has(status.type));
    if (isolatedStatuses.length) actor.statuses = actor.statuses.filter((status) => !isolatedTypes.has(status.type));

    this._runServantHook(actor, 'beforeAttack', { actor, target, action, card, chainContext });
    this._runEffectHooks('beforeAttack', { actor, target, action, card, chainContext });

    try {
      originalExecuteCard.call(this, action, chainContext);
    } finally {
      if (isolatedStatuses.length) actor.statuses.push(...isolatedStatuses);
    }

    const context = { actor, target, action: { ...action, type: 'card', card: card.card }, card, chainContext };
    this._runEffectHooks('afterAttack', context);
    this._runEffectHooks('afterNormalAttack', context);
    this._runServantHook(actor, 'afterAttack', context);
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    const actor = this.getUnit(action.actorId);
    const targets = actor && actor.data.np.target !== 'support'
      ? (actor.data.np.target === 'allEnemies' ? this.getAliveEnemies().slice() : [this._currentEnemyTarget()].filter(Boolean))
      : [];
    const context = actor ? { actor, action, np: actor.data.np, chainContext, precedingNps } : { action };

    if (actor) {
      this._runServantHook(actor, 'beforeNp', context);
      this._runEffectHooks('beforeNp', context);
    }

    const result = originalExecuteNp.call(this, action, chainContext, precedingNps);

    if (actor) {
      targets.forEach((target) => {
        const attackContext = { actor, target, action: { ...action, type: 'np', card: actor.data.np.card }, np: actor.data.np, chainContext };
        this._runEffectHooks('afterAttack', attackContext);
        this._runEffectHooks('afterNpAttack', attackContext);
      });
      this._runServantHook(actor, 'afterNp', context);
      this._runEffectHooks('afterNp', context);
    }
    return result;
  };

  const originalTakeDamage = proto._takeDamage;
  proto._takeDamage = function (unit, amount, sourceLabel) {
    const result = originalTakeDamage.call(this, unit, amount, sourceLabel);
    this._runEffectHooks('afterDamageTaken', { unit, amount, sourceLabel, result });
    if (!unit.alive) this._runEffectHooks('unitDefeated', { unit, sourceLabel, result });
    return result;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
