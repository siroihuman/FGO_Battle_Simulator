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

  const isAlive = (unit) => Boolean(unit && unit.alive && Number(unit.hp || 0) > 0);

  proto._runUniqueMechanic = function (actor, eventName, context) {
    if (!actor) return undefined;
    return REGISTRY.run(this, actor.servantId, eventName, { ...(context || {}), actor });
  };

  proto._uniqueMechanicProviders = function (eventName, options) {
    const detail = options || {};
    return this.state.allies.concat(this.state.enemies).filter((provider) => {
      if (!isAlive(provider) || !provider.servantId) return false;
      const definition = REGISTRY.get(provider.servantId);
      if (!definition || !definition.hooks || typeof definition.hooks[eventName] !== 'function') return false;
      if (detail.includeReserve === true || definition.providerScope === 'allAlive') return true;
      if (definition.providerScope === 'allUnits') return true;
      return provider.frontline !== false;
    });
  };

  proto._runUniqueMechanicProviders = function (eventName, context, options) {
    return this._uniqueMechanicProviders(eventName, options).map((provider) => ({
      provider,
      result: REGISTRY.run(this, provider.servantId, eventName, {
        ...(context || {}),
        provider,
        actor: context && context.actor ? context.actor : provider
      })
    }));
  };

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    const actor = this.getUnit(action.actorId);
    if (actor) this._runUniqueMechanic(actor, 'beforeAttack', { actor, action, chainContext });
    return originalExecuteCard.call(this, action, chainContext);
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    const actor = this.getUnit(action.actorId);
    if (actor) this._runUniqueMechanic(actor, 'beforeNp', { actor, action, chainContext, precedingNps });
    const result = originalExecuteNp.call(this, action, chainContext, precedingNps);
    if (actor) this._runUniqueMechanic(actor, 'afterNp', { actor, action, chainContext, precedingNps, result });
    return result;
  };

  const originalResolveAttackOnTarget = proto._resolveAttackOnTarget;
  proto._resolveAttackOnTarget = function (actor, target, action, chainContext) {
    const context = { actor, target, action, chainContext };
    this._runUniqueMechanicProviders('beforeAttackDamage', context);
    const result = originalResolveAttackOnTarget.call(this, actor, target, action, chainContext);
    this._runUniqueMechanicProviders('afterAttack', { ...context, result });
    return result;
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId) {
    const actor = this.getUnit(allyId);
    const skill = actor && actor.data && actor.data.skills ? actor.data.skills[skillIndex] : null;
    const result = originalUseSkill.call(this, allyId, skillIndex, selectedTargetId);
    if (result && result.ok) {
      this._runUniqueMechanicProviders('afterSkillUse', {
        actor,
        skill,
        skillIndex,
        selectedTargetId,
        result
      });
    }
    return result;
  };

  const originalFinishTurn = proto._finishTurn;
  if (typeof originalFinishTurn === 'function') {
    proto._finishTurn = function () {
      this._runUniqueMechanicProviders('turnEnd', { turn: this.state.turn });
      const result = originalFinishTurn.call(this);
      if (!this.state.winner && this.state.phase === 'command') {
        this._runUniqueMechanicProviders('turnStart', { turn: this.state.turn });
      }
      return result;
    };
  }

  REGISTRY.providerEvents = [
    'afterSkillUse',
    'beforeAttackDamage',
    'afterAttack',
    'turnStart',
    'turnEnd'
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = REGISTRY;
})(typeof window !== 'undefined' ? window : globalThis);
