(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
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
    'petrify',
    'petrification',
    'freeze',
    'frozen',
    'actionDisable',
    'actionIncapacitated',
    'unableToAct',
    'immobilize'
  ]);

  const STATUS_NAMES = {
    stun: 'スタン',
    charm: '魅了',
    sleep: '睡眠',
    permanentSleep: '永久睡眠',
    petrify: '石化',
    petrification: '石化',
    freeze: '凍結',
    frozen: '凍結',
    actionDisable: '行動不能',
    actionIncapacitated: '行動不能',
    unableToAct: '行動不能',
    immobilize: '行動不能',
    commandCardSeal: 'コマンドカード選出不能',
    commandCardDrawSeal: 'コマンドカード選出不能',
    commandCardSelectionDisable: 'コマンドカード選出不能',
    konohanaCommandCardSeal: 'コマンドカード選出不能'
  };

  if (DATA && DATA.statusIcons) {
    COMMAND_CARD_DRAW_SEAL_TYPES.forEach((type) => {
      DATA.statusIcons[type] = DATA.statusIcons[type] || 'Commandcardsseal.webp';
    });
    INCAPACITATED_TYPES.forEach((type) => {
      DATA.statusIcons[type] = DATA.statusIcons[type] || 'Stunstatus.webp';
    });
  }

  function isActive(status) {
    return Boolean(status) &&
      (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
      (status.uses == null || status.uses > 0);
  }

  function hasStatusType(unit, types) {
    return Boolean(unit) && (unit.statuses || []).some((status) => types.has(status.type) && isActive(status));
  }

  function rawCommandCardDrawSealStatus(unit) {
    return unit && (unit.statuses || []).find((status) =>
      COMMAND_CARD_DRAW_SEAL_TYPES.has(status.type) && isActive(status)
    ) || null;
  }

  function incapacitatingStatus(unit) {
    return unit && (unit.statuses || []).find((status) =>
      isActive(status) && (
        INCAPACITATED_TYPES.has(status.type) ||
        status.incapacitated === true ||
        status.actionDisabled === true ||
        status.preventsAction === true
      )
    ) || null;
  }

  function isIncapacitated(unit) {
    return Boolean(incapacitatingStatus(unit));
  }

  function livingFrontline(engine) {
    if (!engine || !engine.state || !Array.isArray(engine.state.allies)) return [];
    return engine.state.allies.filter((unit) =>
      unit && unit.frontline !== false && unit.alive && Number(unit.hp || 0) > 0
    );
  }

  function livingAllies(engine, includeReserve) {
    if (!engine || !engine.state || !Array.isArray(engine.state.allies)) return [];
    return engine.state.allies.filter((unit) =>
      unit && unit.alive && Number(unit.hp || 0) > 0 && (includeReserve || unit.frontline !== false)
    );
  }

  function isAllyUnit(engine, unit) {
    return Boolean(engine && engine.state && Array.isArray(engine.state.allies) && engine.state.allies.includes(unit));
  }

  function ignoresDrawSealBecauseSingleFrontline(engine, unit) {
    return Boolean(
      isAllyUnit(engine, unit) &&
      unit && unit.frontline !== false && unit.alive && Number(unit.hp || 0) > 0 &&
      livingFrontline(engine).length <= 1
    );
  }

  function isCommandCardDrawSealed(unit, engine) {
    if (!rawCommandCardDrawSealStatus(unit)) return false;
    return !ignoresDrawSealBecauseSingleFrontline(engine, unit);
  }

  function effectIncludesReserve(effect) {
    if (!effect) return false;
    if (effect.includeReserve === true || effect.includingReserve === true || effect.targetsReserve === true) return true;
    if (['includingReserve', 'allIncludingReserve', 'partyIncludingReserve'].includes(effect.targetScope)) return true;
    return /IncludingReserve$/.test(String(effect.target || ''));
  }

  function normalizedTargetName(target) {
    return String(target || '').replace(/IncludingReserve$/, '');
  }

  function effectValue(effect, context) {
    const level = Math.max(1, Math.min(10, Number(context && context.level || 10)));
    const oc = Math.max(1, Math.min(5, Number(context && context.oc || 1)));
    if (Array.isArray(effect && effect.values)) return Number(effect.values[level - 1] || 0);
    if (Array.isArray(effect && effect.ocValues)) return Number(effect.ocValues[oc - 1] || 0);
    return Number(effect && effect.value || 0);
  }

  proto.isCommandCardDrawSealed = function (unitOrId) {
    const unit = unitOrId && typeof unitOrId === 'object' ? unitOrId : this.getUnit(unitOrId);
    return isCommandCardDrawSealed(unit, this);
  };

  proto.getIncapacitatingStatus = function (unitOrId) {
    const unit = unitOrId && typeof unitOrId === 'object' ? unitOrId : this.getUnit(unitOrId);
    return incapacitatingStatus(unit);
  };

  proto.isIncapacitated = function (unitOrId) {
    return Boolean(this.getIncapacitatingStatus(unitOrId));
  };

  proto.effectIncludesReserve = function (effect) {
    return effectIncludesReserve(effect);
  };

  proto.getLivingAlliesForEffect = function (effect) {
    return livingAllies(this, effectIncludesReserve(effect));
  };

  const originalEffectTargets = proto._effectTargets;
  proto._effectTargets = function (effect, source, selectedTargetId) {
    const detail = effect || {};
    const includeReserve = effectIncludesReserve(detail);
    const targetName = normalizedTargetName(detail.target);
    const allies = livingAllies(this, includeReserve);

    switch (targetName) {
      case 'self':
        return source ? [source] : [];
      case 'selectedAlly': {
        const target = allies.find((unit) => unit.id === selectedTargetId);
        return target ? [target] : [];
      }
      case 'allAllies':
      case 'party':
      case 'frontlineAllies':
        return allies;
      case 'allOtherAllies':
      case 'otherAllies':
      case 'allAlliesExceptSelf':
        return allies.filter((unit) => unit !== source);
      case 'reserveAllies':
        return livingAllies(this, true).filter((unit) => unit.frontline === false);
      case 'selectedEnemy': {
        const target = this.state.enemies.find((unit) =>
          unit.id === selectedTargetId && unit.alive && Number(unit.hp || 0) > 0
        );
        return target ? [target] : [];
      }
      case 'allEnemies':
        return this.getAliveEnemies();
      default: {
        const normalizedEffect = targetName === detail.target ? detail : { ...detail, target: targetName };
        const targets = originalEffectTargets.call(this, normalizedEffect, source, selectedTargetId) || [];
        if (includeReserve) return targets;
        return targets.filter((unit) => !isAllyUnit(this, unit) || unit.frontline !== false);
      }
    }
  };

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    if (effect && COMMAND_CARD_DRAW_SEAL_TYPES.has(effect.type) && ignoresDrawSealBecauseSingleFrontline(this, unit)) {
      return {
        type: effect.type,
        value: Number(value || 0),
        source: source || '',
        remaining: effect.duration == null ? -1 : Number(effect.duration),
        uses: effect.uses == null ? null : Number(effect.uses),
        debuff: Boolean(effect.debuff),
        statusIcon: effect.statusIcon || null,
        suppressed: true,
        suppressionReason: 'singleFrontline'
      };
    }
    return originalAddStatus.call(this, unit, effect, value, source);
  };

  proto._applyCommandCardDrawSealEffect = function (effect, source, selectedTargetId, context) {
    const targets = this._effectTargets(effect, source, selectedTargetId);
    const value = effectValue(effect, context);
    const statuses = targets
      .map((target) => this._addStatus(target, effect, value, source && source.name))
      .filter((status) => status && !status.suppressed);
    const suppressed = targets.length - statuses.length;
    if (suppressed > 0) {
      this._log('前衛が1騎のみのため、コマンドカード選出不能は付与されない。', 'resist');
    }
    return {
      applied: statuses.length > 0,
      statuses,
      suppressed,
      reason: statuses.length ? null : (suppressed ? 'singleFrontline' : 'noTarget')
    };
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (effect && COMMAND_CARD_DRAW_SEAL_TYPES.has(effect.type)) {
      return this._applyCommandCardDrawSealEffect(effect, source, selectedTargetId, context);
    }
    return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
  };

  function filterCommandDeck(engine, cards) {
    return (cards || []).filter((card) => {
      const actor = engine.getUnit(card.actorId);
      return actor && !isCommandCardDrawSealed(actor, engine);
    });
  }

  const originalResetDeck = proto._resetDeck;
  proto._resetDeck = function () {
    const result = originalResetDeck.apply(this, arguments);
    this.state.deck = filterCommandDeck(this, this.state.deck);
    return result;
  };

  const originalDrawHand = proto._drawHand;
  proto._drawHand = function () {
    this.state.deck = filterCommandDeck(this, this.state.deck);
    const result = originalDrawHand.apply(this, arguments);
    this.state.hand = filterCommandDeck(this, this.state.hand);
    this.state.deck = filterCommandDeck(this, this.state.deck);
    if (this.state.hand.length < 5 && this.state.deck.length) {
      this.state.hand.push(...this.state.deck.splice(0, 5 - this.state.hand.length));
      if (typeof this._allocateCriticalStars === 'function') this._allocateCriticalStars();
    }
    return result;
  };

  const originalRunEffectHooks = proto._runEffectHooks;
  proto._runEffectHooks = function (eventName, context) {
    const detail = context || {};
    if (eventName === 'beforeEnemyAction' && detail.actor) {
      const status = incapacitatingStatus(detail.actor);
      if (status) {
        const label = status.label || STATUS_NAMES[status.type] || '行動不能';
        this._log(`${detail.actor.name}は${label}により行動できない。`, 'debuff');
        return { prevented: true, status };
      }
    }
    return originalRunEffectHooks.call(this, eventName, detail);
  };

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    const actor = action && this.getUnit(action.actorId);
    const status = incapacitatingStatus(actor);
    if (actor && status) {
      const label = status.label || STATUS_NAMES[status.type] || '行動不能';
      this._log(`${actor.name}は${label}のため、コマンドカードによる攻撃を行えない。`, 'chainError');
      return { skipped: true, reason: 'incapacitated', status };
    }
    return originalExecuteCard.call(this, action, chainContext);
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    const actor = action && this.getUnit(action.actorId);
    const status = incapacitatingStatus(actor);
    if (actor && status) {
      const label = status.label || STATUS_NAMES[status.type] || '行動不能';
      this._log(`${actor.name}は${label}のため、宝具を使用できない。`, 'chainError');
      return { skipped: true, reason: 'incapacitated', status };
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
    const hasIncapacitatedParticipant = actions.length === 3 && actions.some((action) => {
      const actor = action && this.getUnit(action.actorId);
      return actor && isIncapacitated(actor);
    });

    if (!hasIncapacitatedParticipant) return originalExecuteCommandChain.apply(this, arguments);

    const originalCards = actions.map((action) => action.card);
    actions.forEach((action) => { action.card = 'chainError'; });
    this.__incapacitatedChainError = true;
    this._log(
      '行動不能状態のサーヴァントを含むためチェインエラー。チェイン・1stボーナス・OC上昇・Extra Attackは発生しない。',
      'chainError'
    );
    try {
      return originalExecuteCommandChain.apply(this, arguments);
    } finally {
      actions.forEach((action, index) => { action.card = originalCards[index]; });
      this.__incapacitatedChainError = false;
    }
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => ({
      ...status,
      name: STATUS_NAMES[status.type] || status.name,
      statusIcon: status.statusIcon || (DATA && DATA.statusIcons && DATA.statusIcons[status.type]) || null
    }));
  };

  const API = {
    commandCardDrawSealTypes: Array.from(COMMAND_CARD_DRAW_SEAL_TYPES),
    incapacitatedTypes: Array.from(INCAPACITATED_TYPES),
    statusNames: { ...STATUS_NAMES },
    targetScope: {
      defaultAllyScope: 'frontline',
      includeReserveFlags: ['includeReserve', 'includingReserve', 'targetsReserve'],
      includeReserveTargetSuffix: 'IncludingReserve'
    },
    isActive,
    isCommandCardDrawSealed,
    isIncapacitated,
    incapacitatingStatus,
    effectIncludesReserve,
    livingAllies
  };

  global.FGO_SIM_COMMAND_CARD_SELECTION_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
