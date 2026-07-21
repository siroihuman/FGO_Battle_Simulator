(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('trigger star reward effects require engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__triggerStarRewardEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_SIM_TRIGGER_STAR_REWARD_EFFECTS;
    }
    return;
  }
  proto.__triggerStarRewardEffectsInstalled = true;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  function valueAt(effect, context) {
    const detail = context || {};
    if (Array.isArray(effect.values)) {
      const level = clamp(detail.level || 10, 1, 10);
      return Number(effect.values[level - 1] || 0);
    }
    if (Array.isArray(effect.ocValues)) {
      const oc = clamp(detail.oc || 1, 1, 5);
      return Number(effect.ocValues[oc - 1] || 0);
    }
    return Number(effect.value || 0);
  }

  function isTurnEndBuffClearTrigger(effect) {
    if (!effect || effect.type !== 'triggerEffect' || effect.event !== 'turnEnd') return false;
    const effects = Array.isArray(effect.effects) ? effect.effects : [effect.effect].filter(Boolean);
    return effects.some((entry) => entry && entry.type === 'buffClear');
  }

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    let resolvedEffect = effect;
    if (isTurnEndBuffClearTrigger(effect) && !effect.statusIcon) {
      resolvedEffect = { ...effect, statusIcon: 'DelayedDebuff.webp' };
    }
    return originalAddStatus.call(this, unit, resolvedEffect, value, source);
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || effect.type !== 'stars' || !this.state || this.state.phase === 'command') {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const value = Math.max(0, valueAt(effect, context));
    this.state.nextStars = Math.max(0, Number(this.state.nextStars || 0) + value);
    this._log(`スターを${value}個獲得（次ターン）。`);
    return {
      applied: true,
      timing: 'nextTurn',
      value,
      nextStars: this.state.nextStars
    };
  };

  const API = {
    phaseRule: {
      command: 'currentTurn',
      other: 'nextTurn'
    },
    delayedBuffClearIcon: 'DelayedDebuff.webp'
  };

  global.FGO_SIM_TRIGGER_STAR_REWARD_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
