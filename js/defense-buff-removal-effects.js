(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine) {
    throw new Error('defense buff removal effects require data and engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__defenseBuffRemovalEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_SIM_DEFENSE_BUFF_REMOVAL_EFFECTS;
    }
    return;
  }
  proto.__defenseBuffRemovalEffectsInstalled = true;

  const DEFENSE_BUFF_TYPES = new Set([
    'defenseUp', 'damageCut', 'invincible', 'evade', 'antiEnforcementDefense',
    'cardResist', 'specialResist', 'critRateResist', 'instantDeathImmune',
    'deathResist', 'debuffResist', 'mentalResist'
  ]);

  function isActive(status) {
    return Boolean(status) &&
      (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
      (status.uses == null || status.uses > 0);
  }

  function isDefenseBuff(status) {
    return Boolean(
      status && isActive(status) && !status.debuff && !status.passive &&
      !status.unremovable && DEFENSE_BUFF_TYPES.has(status.type)
    );
  }

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || effect.type !== 'defenseBuffClear') {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const targets = this._effectTargets(effect, source, selectedTargetId);
    const results = targets.map((target) => {
      const resistance = typeof this._tryPreventBuffRemoval === 'function'
        ? this._tryPreventBuffRemoval(target)
        : { prevented: false };
      if (resistance.prevented) return { target, prevented: true, removed: 0 };

      const removed = (target.statuses || []).filter(isDefenseBuff);
      if (removed.length) {
        target.statuses = target.statuses.filter((status) => !removed.includes(status));
      }
      this._log(`${target.name}の防御強化状態を${removed.length}個解除。`, 'debuff');
      return { target, prevented: false, removed: removed.length };
    });

    return { applied: targets.length > 0, targets, results };
  };

  const API = {
    effectType: 'defenseBuffClear',
    defenseBuffTypes: Array.from(DEFENSE_BUFF_TYPES),
    isDefenseBuff
  };

  global.FGO_SIM_DEFENSE_BUFF_REMOVAL_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
