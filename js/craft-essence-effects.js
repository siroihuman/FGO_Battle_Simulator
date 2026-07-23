(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine) {
    throw new Error('先に js/data.js と js/engine.js を読み込んでください。');
  }

  const BattleEngine = ENGINE.BattleEngine;
  const BUFF_REMOVAL_EFFECT_TYPES = new Set(['buffClear', 'defenseBuffClear']);
  const PARTY_MAX_HP_AT_BATTLE_START = 'partyMaxHpAtBattleStart';
  const MAX_HP_GROWTH_PER_PLAYER_TURN = 'maxHpGrowthPerPlayerTurn';

  function isCraftEssenceStatus(status) {
    return Boolean(status && status.sourceType === 'craftEssence');
  }

  function isBattleStartOnlyCraftEssenceStatus(status) {
    return isCraftEssenceStatus(status) && status.type === PARTY_MAX_HP_AT_BATTLE_START;
  }

  function protectCraftEssenceStatuses(unit) {
    if (!unit) return unit;
    (unit.statuses || [])
      .filter(isCraftEssenceStatus)
      .forEach((status) => {
        status.unremovable = true;
      });
    return unit;
  }

  function craftEssenceEffectsFor(unit, effectType) {
    if (!unit) return [];
    const craftEssence = DATA.craftEssences[unit.craftEssenceId] || DATA.craftEssences.none;
    return (craftEssence.effects || []).filter((effect) => effect.type === effectType);
  }

  function applyPartyMaxHpAtBattleStart(engine) {
    if (!engine || !engine.state || engine.__craftEssencePartyMaxHpApplied) return 0;
    engine.__craftEssencePartyMaxHpApplied = true;

    const totalBonus = engine.state.allies.reduce((total, ally) => {
      return total + craftEssenceEffectsFor(ally, PARTY_MAX_HP_AT_BATTLE_START)
        .reduce((sum, effect) => sum + Number(effect.value || 0), 0);
    }, 0);

    if (totalBonus <= 0) return 0;

    engine.state.allies.forEach((ally) => {
      ally.maxHp += totalBonus;
      ally.hp += totalBonus;
      ally.craftEssencePartyMaxHpBonus = Number(ally.craftEssencePartyMaxHpBonus || 0) + totalBonus;
    });

    if (typeof engine._log === 'function') {
      engine._log(`概念礼装の効果により味方全体＜控え含む＞の最大HPが${totalBonus.toLocaleString('ja-JP')}増加。`, 'skill');
    }
    return totalBonus;
  }

  function maxHpGrowthStatus(unit) {
    return (unit && unit.statuses || []).find((status) =>
      isCraftEssenceStatus(status) && status.type === MAX_HP_GROWTH_PER_PLAYER_TURN
    ) || null;
  }

  function applyMaxHpGrowthAtPlayerTurnEnd(engine) {
    if (!engine || !engine.state) return [];
    const turn = Number(engine.state.turn || 0);
    if (engine.__craftEssencePlayerTurnEndAppliedTurn === turn) return [];
    engine.__craftEssencePlayerTurnEndAppliedTurn = turn;

    const results = [];
    engine.state.allies.forEach((ally) => {
      if (!ally.alive || !ally.frontline || Number(ally.hp || 0) <= 0) return;
      const status = maxHpGrowthStatus(ally);
      if (!status) return;

      const perTurn = Math.max(0, Number(status.value || 0));
      const maxValue = Math.max(0, Number(status.maxValue || 0));
      const accumulated = Math.max(0, Number(status.accumulated || 0));
      const gain = Math.min(perTurn, Math.max(0, maxValue - accumulated));
      if (gain <= 0) return;

      ally.maxHp += gain;
      ally.hp += gain;
      status.accumulated = accumulated + gain;
      results.push({ unit: ally, gain, accumulated: status.accumulated });

      if (typeof engine._log === 'function') {
        engine._log(
          `${ally.name}の最大HPと現在HPが千年黄金樹の効果で${gain.toLocaleString('ja-JP')}増加（累計${status.accumulated.toLocaleString('ja-JP')}）。`,
          'heal'
        );
      }
    });
    return results;
  }

  const originalCreateAlly = BattleEngine.prototype._createAlly;

  BattleEngine.prototype._createAlly = function (slot, index) {
    const ally = originalCreateAlly.call(this, slot, index);
    ally.statuses = (ally.statuses || []).filter((status) => !isBattleStartOnlyCraftEssenceStatus(status));
    return protectCraftEssenceStatuses(ally);
  };

  const originalInitialize = BattleEngine.prototype._initialize;

  BattleEngine.prototype._initialize = function () {
    const result = originalInitialize.apply(this, arguments);
    applyPartyMaxHpAtBattleStart(this);
    return result;
  };

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
          status.unremovable = true;
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

  const originalPerformEnemyTurn = BattleEngine.prototype._performEnemyTurn;

  BattleEngine.prototype._performEnemyTurn = function () {
    applyMaxHpGrowthAtPlayerTurnEnd(this);
    return originalPerformEnemyTurn.apply(this, arguments);
  };

  const originalFinishTurn = BattleEngine.prototype._finishTurn;

  BattleEngine.prototype._finishTurn = function () {
    // 敵フェイズが発生しないWave移行時にも、味方攻撃ターン終了時効果を1回だけ処理する。
    applyMaxHpGrowthAtPlayerTurnEnd(this);

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

  const originalGetStatusSummary = BattleEngine.prototype.getStatusSummary;

  BattleEngine.prototype.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (status.type !== MAX_HP_GROWTH_PER_PLAYER_TURN) return status;
      return { ...status, name: '毎ターン最大HPアップ' };
    });
  };

  const API = {
    BattleEngine,
    effectTypes: {
      partyMaxHpAtBattleStart: PARTY_MAX_HP_AT_BATTLE_START,
      maxHpGrowthPerPlayerTurn: MAX_HP_GROWTH_PER_PLAYER_TURN
    },
    buffRemovalEffectTypes: Array.from(BUFF_REMOVAL_EFFECT_TYPES),
    isCraftEssenceStatus,
    protectCraftEssenceStatuses,
    applyPartyMaxHpAtBattleStart,
    applyMaxHpGrowthAtPlayerTurnEnd
  };

  global.FGO_SIM_CRAFT_ESSENCE_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
