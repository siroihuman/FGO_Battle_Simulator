(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('先に js/engine.js を読み込んでください。');
  }

  const BattleEngine = ENGINE.BattleEngine;
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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BattleEngine };
  }
})(typeof window !== 'undefined' ? window : globalThis);
