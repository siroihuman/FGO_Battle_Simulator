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

  const STATUS_NAMES = {
    commandCardSeal: 'コマンドカード選出不能',
    commandCardDrawSeal: 'コマンドカード選出不能',
    commandCardSelectionDisable: 'コマンドカード選出不能',
    konohanaCommandCardSeal: 'コマンドカード選出不能'
  };

  if (DATA && DATA.statusIcons) {
    COMMAND_CARD_DRAW_SEAL_TYPES.forEach((type) => {
      DATA.statusIcons[type] = DATA.statusIcons[type] || 'Commandcardsseal.webp';
    });
  }

  function isActive(status) {
    return Boolean(status) &&
      (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
      (status.uses == null || status.uses > 0);
  }

  function rawCommandCardDrawSealStatus(unit) {
    return unit && (unit.statuses || []).find((status) =>
      COMMAND_CARD_DRAW_SEAL_TYPES.has(status.type) && isActive(status)
    ) || null;
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
    statusNames: { ...STATUS_NAMES },
    targetScope: {
      defaultAllyScope: 'frontline',
      includeReserveFlags: ['includeReserve', 'includingReserve', 'targetsReserve'],
      includeReserveTargetSuffix: 'IncludingReserve'
    },
    isActive,
    isCommandCardDrawSealed,
    effectIncludesReserve,
    livingAllies
  };

  global.FGO_SIM_COMMAND_CARD_SELECTION_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
