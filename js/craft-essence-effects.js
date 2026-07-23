(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('先に js/engine.js を読み込んでください。');
  }

  const BattleEngine = ENGINE.BattleEngine;
  const BUFF_REMOVAL_EFFECT_TYPES = new Set(['buffClear', 'defenseBuffClear']);

  function isCraftEssenceStatus(status) {
    return Boolean(status && status.sourceType === 'craftEssence');
  }

  const originalApplyEffect = BattleEngine.prototype._applyEffect;

  BattleEngine.prototype._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || !BUFF_REMOVAL_EFFECT_TYPES.has(effect.type)) {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const protectedStatuses = [];
    const targets = typeof this._effectTargets === 'function'
      ? this._effectTargets(effect, source, selectedTargetId)
      : [];

    targets.forEach((target) => {
      (target.statuses || [])
        .filter(isCraftEssenceStatus)
        .forEach((status) => {
          protectedStatuses.push({ status, passive: status.passive });
          status.passive = true;
        });
    });

    try {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    } finally {
      protectedStatuses.forEach(({ status, passive }) => {
        status.passive = passive;
      });
    }
  };

  const originalFinishTurn = BattleEngine.prototype._finishTurn;

  BattleEngine.prototype._finishTurn = function () {
    this.state.allies.forEach((ally) => {
      if (!ally.alive) return;

      const hpLossPerTurn = ally.statuses
        .filter((status) => status.type === 'hpLossPerTurn')
        .reduce((total, status) => total + Number(status.value || 0), 0);

      if (hpLossPerTurn <= 0) return;

      const actualLoss = Math.min(hpLossPerTurn, Math.max(0, ally.hp - 1));
      ally.hp = Math.max(1, ally.hp - hpLossPerTurn);

      if (typeof this._log === 'function') {
        this._log(
          `${ally.name}のHPが概念礼装のデメリットで${actualLoss.toLocaleString('ja-JP')}減少。`,
          'damage'
        );
      }
    });

    return originalFinishTurn.call(this);
  };

  const API = {
    BattleEngine,
    buffRemovalEffectTypes: Array.from(BUFF_REMOVAL_EFFECT_TYPES),
    isCraftEssenceStatus
  };

  global.FGO_SIM_CRAFT_ESSENCE_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
