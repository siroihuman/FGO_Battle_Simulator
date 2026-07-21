(function (global) {
  'use strict';

  const REGISTRY = global.FGO_UNIQUE_MECHANICS || (typeof require !== 'undefined' ? require('./registry.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE || (typeof require !== 'undefined' ? require('../engine.js') : null);
  if (!REGISTRY || !ENGINE || !ENGINE.BattleEngine) throw new Error('unique mechanics runtime requires registry and engine.');

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__uniqueMechanicsRuntimeInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = REGISTRY;
    return;
  }
  proto.__uniqueMechanicsRuntimeInstalled = true;

  proto._runUniqueMechanic = function (actor, eventName, context) {
    if (!actor) return undefined;
    return REGISTRY.run(this, actor.servantId, eventName, context || {});
  };

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    const actor = this.getUnit(action.actorId);
    if (actor) this._runUniqueMechanic(actor, 'beforeAttack', { actor, action, chainContext });
    const result = originalExecuteCard.call(this, action, chainContext);
    if (actor) this._runUniqueMechanic(actor, 'afterAttack', { actor, action, chainContext });
    return result;
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    const actor = this.getUnit(action.actorId);
    if (actor) this._runUniqueMechanic(actor, 'beforeNp', { actor, action, chainContext, precedingNps });
    const result = originalExecuteNp.call(this, action, chainContext, precedingNps);
    if (actor) this._runUniqueMechanic(actor, 'afterNp', { actor, action, chainContext, precedingNps });
    return result;
  };

  const originalFinishTurn = proto._finishTurn;
  if (typeof originalFinishTurn === 'function') {
    proto._finishTurn = function () {
      this.state.allies.forEach((actor) => {
        if (actor && actor.alive) this._runUniqueMechanic(actor, 'turnEnd', { actor });
      });
      const result = originalFinishTurn.call(this);
      this.state.allies.forEach((actor) => {
        if (actor && actor.alive) this._runUniqueMechanic(actor, 'turnStart', { actor });
      });
      return result;
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = REGISTRY;
})(typeof window !== 'undefined' ? window : globalThis);
