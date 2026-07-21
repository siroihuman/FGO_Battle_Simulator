(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const COMMON = global.FGO_SIM_COMMON_EFFECTS ||
    (typeof require !== 'undefined' ? require('./common-effects.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine || !COMMON) {
    throw new Error('common effects extra attack runtime requires engine and common effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__commonEffectsExtraAttackInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = COMMON;
    return;
  }
  proto.__commonEffectsExtraAttackInstalled = true;

  const originalRunEffectHooks = proto._runEffectHooks;
  proto._runEffectHooks = function (eventName, context) {
    const detail = context || {};
    const action = detail.action || {};

    if (eventName === 'afterNormalAttack' && action.type === 'extra') {
      const actor = detail.actor;
      const target = detail.target;
      if (!actor || !target) return [];

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

    return originalRunEffectHooks.call(this, eventName, detail);
  };

  const originalExecuteExtra = proto._executeExtra;
  proto._executeExtra = function (actorId, chainContext, selectedActions) {
    const actor = this.getUnit(actorId);
    const target = this._currentEnemyTarget();
    const result = originalExecuteExtra.call(this, actorId, chainContext, selectedActions);

    if (actor && target) {
      this._runEffectHooks('afterNormalAttack', {
        actor,
        target,
        action: {
          type: 'extra',
          actorId,
          card: 'extra'
        },
        chainContext,
        selectedActions
      });
    }

    return result;
  };

  COMMON.normalAttackTypes = ['quick', 'arts', 'buster', 'extra'];
  COMMON.extraAttackTriggersAfterNormalAttack = true;

  if (typeof module !== 'undefined' && module.exports) module.exports = COMMON;
})(typeof window !== 'undefined' ? window : globalThis);
