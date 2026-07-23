(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const EFFECTS = global.FGO_SIM_COMMAND_CARD_SELECTION_EFFECTS ||
    (typeof require !== 'undefined' ? require('./command-card-selection-effects.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine || !EFFECTS) {
    throw new Error('incapacitated command selection requires engine and command-card selection effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__incapacitatedCommandSelectionInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_INCAPACITATED_COMMAND_SELECTION;
    }
    return;
  }
  proto.__incapacitatedCommandSelectionInstalled = true;

  function directToggleCard(engine, cardId) {
    if (!engine.state || engine.state.phase !== 'command' || engine.state.winner) return false;
    const actions = Array.isArray(engine.state.selectedActions) ? engine.state.selectedActions : [];
    const existingIndex = actions.findIndex((action) => action.type === 'card' && action.cardId === cardId);
    if (existingIndex >= 0) {
      actions.splice(existingIndex, 1);
      if (typeof engine._allocateCriticalStars === 'function') engine._allocateCriticalStars();
      return true;
    }
    if (actions.length >= 3) return false;

    const card = (engine.state.hand || []).find((entry) => entry.id === cardId);
    if (!card) return false;
    const actor = engine.getUnit(card.actorId);
    if (!actor || !actor.alive || Number(actor.hp || 0) <= 0 || actor.frontline === false) return false;

    actions.push({
      type: 'card',
      cardId: card.id,
      actorId: card.actorId,
      card: card.card
    });
    if (typeof engine._allocateCriticalStars === 'function') engine._allocateCriticalStars();
    return true;
  }

  const originalToggleCard = proto.toggleCard;
  proto.toggleCard = function (cardId) {
    const card = this.state && Array.isArray(this.state.hand)
      ? this.state.hand.find((entry) => entry.id === cardId)
      : null;
    const actor = card && this.getUnit(card.actorId);

    // 旧固有処理が永久睡眠・スタン等を「カード選択不可」としていても、
    // Issue #53の共通仕様を優先し、選択・選択解除だけは直接処理する。
    if (actor && EFFECTS.isIncapacitated(actor)) {
      return directToggleCard(this, cardId);
    }
    return originalToggleCard.call(this, cardId);
  };

  const API = {
    selectionAllowedWhileIncapacitated: true,
    executionStillBlocked: true,
    directToggleCard
  };

  global.FGO_INCAPACITATED_COMMAND_SELECTION = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
