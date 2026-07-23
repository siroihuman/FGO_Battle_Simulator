(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('command card selection effects require the battle engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__commandCardSelectionEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_COMMAND_CARD_SELECTION_EFFECTS;
    return;
  }
  proto.__commandCardSelectionEffectsInstalled = true;

  const COMMAND_CARD_DRAW_SEAL_TYPES = new Set([
    'commandCardSeal',
    'commandCardDrawSeal',
    'commandCardSelectionDisable',
    'konohanaCommandCardSeal'
  ]);

  const INCAPACITATED_TYPES = new Set([
    'stun',
    'charm',
    'sleep',
    'permanentSleep',
    'actionDisable',
    'immobilize',
    'petrify'
  ]);

  function isActive(status) {
    return Boolean(status) &&
      (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
      (status.uses == null || status.uses > 0);
  }

  function hasStatusType(unit, types) {
    return Boolean(unit) && (unit.statuses || []).some((status) => types.has(status.type) && isActive(status));
  }

  function isCommandCardDrawSealed(unit) {
    return hasStatusType(unit, COMMAND_CARD_DRAW_SEAL_TYPES);
  }

  function isIncapacitated(unit) {
    return hasStatusType(unit, INCAPACITATED_TYPES);
  }

  proto.isCommandCardDrawSealed = function (unitOrId) {
    const unit = unitOrId && typeof unitOrId === 'object' ? unitOrId : this.getUnit(unitOrId);
    return isCommandCardDrawSealed(unit);
  };

  proto.isIncapacitated = function (unitOrId) {
    const unit = unitOrId && typeof unitOrId === 'object' ? unitOrId : this.getUnit(unitOrId);
    return isIncapacitated(unit);
  };

  const originalResetDeck = proto._resetDeck;
  proto._resetDeck = function () {
    const result = originalResetDeck.apply(this, arguments);
    this.state.deck = (this.state.deck || []).filter((card) => {
      const actor = this.getUnit(card.actorId);
      return actor && !isCommandCardDrawSealed(actor);
    });
    return result;
  };

  const originalDrawHand = proto._drawHand;
  proto._drawHand = function () {
    this.state.deck = (this.state.deck || []).filter((card) => {
      const actor = this.getUnit(card.actorId);
      return actor && !isCommandCardDrawSealed(actor);
    });
    const result = originalDrawHand.apply(this, arguments);
    this.state.hand = (this.state.hand || []).filter((card) => {
      const actor = this.getUnit(card.actorId);
      return actor && !isCommandCardDrawSealed(actor);
    });
    return result;
  };

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    const actor = action && this.getUnit(action.actorId);
    if (actor && isIncapacitated(actor)) {
      this._log(`${actor.name}は行動不能のため、コマンドカードによる攻撃を行えない。`, 'chainError');
      return { skipped: true, reason: 'incapacitated' };
    }
    return originalExecuteCard.call(this, action, chainContext);
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    const actor = action && this.getUnit(action.actorId);
    if (actor && isIncapacitated(actor)) {
      this._log(`${actor.name}は行動不能のため、宝具を使用できない。`, 'chainError');
      return { skipped: true, reason: 'incapacitated' };
    }
    return originalExecuteNp.call(this, action, chainContext, precedingNps);
  };

  const originalExecuteExtra = proto._executeExtra;
  proto._executeExtra = function () {
    if (this.__incapacitatedChainError) return { skipped: true, reason: 'chainError' };
    return originalExecuteExtra.apply(this, arguments);
  };

  const originalCalculateOc = proto._calculateOc;
  proto._calculateOc = function (actor, precedingNps) {
    return originalCalculateOc.call(this, actor, this.__incapacitatedChainError ? 0 : precedingNps);
  };

  const originalExecuteCommandChain = proto.executeCommandChain;
  proto.executeCommandChain = function () {
    const actions = this.state && Array.isArray(this.state.selectedActions)
      ? this.state.selectedActions
      : [];
    const hasIncapacitatedParticipant = actions.some((action) => {
      const actor = action && this.getUnit(action.actorId);
      return actor && isIncapacitated(actor);
    });

    if (!hasIncapacitatedParticipant) return originalExecuteCommandChain.apply(this, arguments);

    const originalActions = actions;
    const neutralizedActions = actions.map((action, index) => ({
      ...action,
      card: `chainError${index}`
    }));
    this.state.selectedActions = neutralizedActions;
    this.__incapacitatedChainError = true;
    this._log('行動不能状態のサーヴァントを含むためチェインエラー。チェイン効果は発生しない。', 'chainError');
    try {
      return originalExecuteCommandChain.apply(this, arguments);
    } finally {
      this.state.selectedActions = originalActions;
      this.__incapacitatedChainError = false;
    }
  };

  const API = {
    commandCardDrawSealTypes: Array.from(COMMAND_CARD_DRAW_SEAL_TYPES),
    incapacitatedTypes: Array.from(INCAPACITATED_TYPES),
    isActive,
    isCommandCardDrawSealed,
    isIncapacitated
  };

  global.FGO_SIM_COMMAND_CARD_SELECTION_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
