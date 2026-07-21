(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const TRAIT = global.FGO_SIM_TRAIT_TRIGGER_AURA_EFFECTS ||
    (typeof require !== 'undefined' ? require('./trait-trigger-aura-effects.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine || !TRAIT) {
    throw new Error('trigger lifecycle effects require engine and trait trigger aura effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__triggerLifecycleEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_TRIGGER_LIFECYCLE_EFFECTS;
    return;
  }
  proto.__triggerLifecycleEffectsInstalled = true;

  const isAlive = (unit) => Boolean(unit && unit.alive && Number(unit.hp || 0) > 0);
  const isActive = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (status && status.type === 'delayedEffect') {
      status.triggerEvent = effect.triggerEvent || effect.timing || status.triggerEvent || 'turnStart';
      const delay = Math.max(0, Number(effect.delayTurns || status.delayTurns || 0));
      status.triggerTurn = Number(this.state.turn || 1) +
        (status.triggerEvent === 'turnEnd' ? Math.max(0, delay - 1) : delay);
    }
    return status;
  };

  const originalRunDelayedEffect = proto._runDelayedEffect;
  proto._runDelayedEffect = function (owner, status, context) {
    const eventName = context && context.eventName ? context.eventName : 'turnStart';
    if ((status.triggerEvent || 'turnStart') !== eventName) return { triggered: false, reason: 'event' };
    return originalRunDelayedEffect.call(this, owner, status, context);
  };

  const originalRunGenericEvent = proto._runGenericEvent;
  proto._runGenericEvent = function (eventName, context) {
    const delayedResults = [];
    if (eventName === 'turnEnd') {
      this.state.allies.concat(this.state.enemies).filter(isAlive).forEach((owner) => {
        (owner.statuses || []).slice().forEach((status) => {
          if (status.type !== 'delayedEffect' || !isActive(status)) return;
          if ((status.triggerEvent || 'turnStart') !== 'turnEnd') return;
          delayedResults.push(this._runDelayedEffect(owner, status, { ...(context || {}), eventName }));
        });
      });
    }
    const result = originalRunGenericEvent.call(this, eventName, context);
    return delayedResults.concat(Array.isArray(result) ? result : []);
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    this._runGenericEvent('turnEnd', { turn: this.state.turn });
    return originalFinishTurn.apply(this, arguments);
  };

  const API = {
    delayedEvents: ['turnStart', 'turnEnd'],
    timing: {
      turnStart: '状態減少とターン更新後に発動',
      turnEnd: '状態減少前のターン終了時に発動'
    }
  };

  global.FGO_SIM_TRIGGER_LIFECYCLE_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
