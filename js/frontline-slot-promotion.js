(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('frontline slot promotion requires the battle engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__frontlineSlotPromotionInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_FRONTLINE_SLOT_PROMOTION;
    }
    return;
  }
  proto.__frontlineSlotPromotionInstalled = true;

  const FRONTLINE_SLOTS = [0, 1, 2];

  function isLiving(unit) {
    return Boolean(unit && unit.alive && Number(unit.hp || 0) > 0);
  }

  function isAlly(engine, unit) {
    return Boolean(engine && engine.state && Array.isArray(engine.state.allies) && engine.state.allies.includes(unit));
  }

  function livingReserve(engine) {
    return engine.state.allies
      .filter((unit) => unit.frontline === false && isLiving(unit))
      .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0))[0] || null;
  }

  function livingFrontlineAt(engine, slot) {
    return engine.state.allies.find((unit) =>
      Number(unit.slot) === Number(slot) && unit.frontline !== false && isLiving(unit)
    ) || null;
  }

  function unitAtSlot(engine, slot, except) {
    return engine.state.allies.find((unit) =>
      unit !== except && Number(unit.slot) === Number(slot)
    ) || null;
  }

  function promoteFrontlineVacancies(engine) {
    if (!engine || !engine.state || !Array.isArray(engine.state.allies)) return [];
    const promotions = [];

    FRONTLINE_SLOTS.forEach((frontSlot) => {
      if (livingFrontlineAt(engine, frontSlot)) return;
      const reserve = livingReserve(engine);
      if (!reserve) return;

      const reserveSlot = Number(reserve.slot);
      const displaced = unitAtSlot(engine, frontSlot, reserve);
      if (displaced) {
        displaced.frontline = false;
        displaced.slot = reserveSlot;
      }

      reserve.frontline = true;
      reserve.slot = frontSlot;
      promotions.push({
        reserve,
        displaced,
        frontSlot,
        reserveSlot
      });
      engine._log(
        `${reserve.name}が控えから前衛${frontSlot + 1}枠へ登場。` +
          (displaced ? `（${displaced.name}と配置交代）` : ''),
        'turn'
      );
    });

    if (promotions.length) {
      engine.state.allies.sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
      engine.__frontlineSlotsChanged = true;
    }
    return promotions;
  }

  proto.promoteFrontlineVacancies = function () {
    return promoteFrontlineVacancies(this);
  };

  proto._promoteReserve = function () {
    const promotions = promoteFrontlineVacancies(this);
    if (promotions.length && this.state.phase === 'command') {
      this._resetDeck();
      this._drawHand();
      this.__frontlineSlotsChanged = false;
    }
    return promotions;
  };

  const originalTakeDamage = proto._takeDamage;
  proto._takeDamage = function (unit, amount, sourceLabel) {
    const wasFrontlineAlly = isAlly(this, unit) && unit.frontline !== false && isLiving(unit);
    const result = originalTakeDamage.call(this, unit, amount, sourceLabel);
    if (wasFrontlineAlly && !isLiving(unit)) this._promoteReserve();
    return result;
  };

  const originalApplyInstantDeath = proto._applyInstantDeath;
  proto._applyInstantDeath = function (enemy, ally) {
    const wasFrontlineAlly = isAlly(this, ally) && ally.frontline !== false && isLiving(ally);
    const result = originalApplyInstantDeath.call(this, enemy, ally);
    if (wasFrontlineAlly && !isLiving(ally)) this._promoteReserve();
    return result;
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    if (this.__frontlineSlotsChanged) {
      // 補充後の前衛3騎で次ターンの山札を作り直す。
      this.state.deck = [];
      this.state.hand = [];
      this.state.selectedActions = [];
      this.state.deckCycle = 3;
    }
    const result = originalFinishTurn.apply(this, arguments);
    this.__frontlineSlotsChanged = false;
    return result;
  };

  const API = {
    frontlineSlots: FRONTLINE_SLOTS.slice(),
    isLiving,
    isAlly,
    promoteFrontlineVacancies,
    exactSlotReplacement: true,
    gutsDoesNotPromote: true
  };

  global.FGO_FRONTLINE_SLOT_PROMOTION = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
