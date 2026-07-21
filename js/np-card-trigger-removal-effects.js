(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const TRAIT = global.FGO_SIM_TRAIT_TRIGGER_AURA_EFFECTS ||
    (typeof require !== 'undefined' ? require('./trait-trigger-aura-effects.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !TRAIT) {
    throw new Error('NP card, after-NP and buff removal effects require data, engine and trigger runtime.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__npCardTriggerRemovalEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_SIM_NP_CARD_TRIGGER_REMOVAL_EFFECTS;
    }
    return;
  }
  proto.__npCardTriggerRemovalEffectsInstalled = true;

  const VALID_CARDS = new Set(['quick', 'arts', 'buster']);
  const STATUS_NAMES = {
    npCardTypeChange: '宝具カードタイプ変更',
    buffRemovalResist: '強化解除耐性'
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const isActiveStatus = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);
  const valueAt = (effect, context) => {
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
  };

  function installNpCardResolver(engine, unit) {
    const np = unit && unit.data && unit.data.np;
    if (!np || np.__npCardResolverInstalled) return unit;
    const baseCard = VALID_CARDS.has(String(np.card)) ? String(np.card) : 'arts';
    Object.defineProperty(np, '__npCardResolverInstalled', {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
    Object.defineProperty(np, '__baseNpCard', {
      value: baseCard,
      configurable: false,
      enumerable: false,
      writable: true
    });
    Object.defineProperty(np, 'card', {
      configurable: true,
      enumerable: true,
      get() {
        return engine.getEffectiveNpCard(unit);
      },
      set(value) {
        if (VALID_CARDS.has(String(value))) np.__baseNpCard = String(value);
      }
    });
    return unit;
  }

  proto.getBaseNpCard = function (unitOrId) {
    const unit = typeof unitOrId === 'string' ? this.getUnit(unitOrId) : unitOrId;
    const np = unit && unit.data && unit.data.np;
    if (!np) return null;
    return VALID_CARDS.has(String(np.__baseNpCard)) ? String(np.__baseNpCard) : String(np.card || 'arts');
  };

  proto.getEffectiveNpCard = function (unitOrId) {
    const unit = typeof unitOrId === 'string' ? this.getUnit(unitOrId) : unitOrId;
    if (!unit) return null;
    const statuses = (unit.statuses || []).slice().reverse();
    const conversion = statuses.find((status) =>
      status.type === 'npCardTypeChange' && isActiveStatus(status) && VALID_CARDS.has(String(status.card))
    );
    return conversion ? String(conversion.card) : this.getBaseNpCard(unit);
  };

  proto._resolveEffectiveNpAction = function (actor, action) {
    if (!actor || !action || action.type !== 'np') return action;
    const card = this.getEffectiveNpCard(actor);
    return action.card === card ? action : { ...action, card };
  };

  proto.refreshSelectedNpCards = function () {
    (this.state.selectedActions || []).forEach((action) => {
      if (action && action.type === 'np') action.card = this.getEffectiveNpCard(action.actorId);
    });
    return this.state.selectedActions;
  };

  const originalCreateAlly = proto._createAlly;
  proto._createAlly = function (slot, index) {
    return installNpCardResolver(this, originalCreateAlly.call(this, slot, index));
  };

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (effect && effect.triggerLevel != null) status.triggerLevel = Number(effect.triggerLevel);
    return status;
  };

  proto._buffRemovalResistStatuses = function (unit) {
    return (unit && unit.statuses ? unit.statuses : [])
      .map((status, index) => ({ status, index }))
      .filter((entry) => entry.status.type === 'buffRemovalResist' && isActiveStatus(entry.status))
      .sort((a, b) => {
        const aTurns = a.status.remaining == null || a.status.remaining < 0
          ? Number.MAX_SAFE_INTEGER : Number(a.status.remaining);
        const bTurns = b.status.remaining == null || b.status.remaining < 0
          ? Number.MAX_SAFE_INTEGER : Number(b.status.remaining);
        if (aTurns !== bTurns) return aTurns - bTurns;
        const aUses = a.status.uses == null ? Number.MAX_SAFE_INTEGER : Number(a.status.uses);
        const bUses = b.status.uses == null ? Number.MAX_SAFE_INTEGER : Number(b.status.uses);
        if (aUses !== bUses) return aUses - bUses;
        return a.index - b.index;
      })
      .map((entry) => entry.status);
  };

  proto._tryPreventBuffRemoval = function (unit) {
    const candidates = this._buffRemovalResistStatuses(unit);
    for (const status of candidates) {
      const chance = clamp(status.value, 0, 100);
      if (this.rng() * 100 >= chance) continue;
      if (status.uses != null) this._consumeStatus(unit, status);
      this._log(`${unit.name}は強化解除耐性により強化解除を防いだ。`, 'resist');
      return { prevented: true, status, chance };
    }
    return { prevented: false, candidates };
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect) return originalApplyEffect.call(this, effect, source, selectedTargetId, context);

    let resolvedContext = context || {};
    if (resolvedContext.status && resolvedContext.level == null && resolvedContext.status.triggerLevel != null) {
      resolvedContext = { ...resolvedContext, level: Number(resolvedContext.status.triggerLevel) };
    }

    let resolvedEffect = effect;
    if (effect.type === 'triggerEffect' && resolvedContext.level != null && effect.triggerLevel == null) {
      resolvedEffect = { ...effect, triggerLevel: Number(resolvedContext.level) };
    }

    if (resolvedEffect.type === 'npScaleUp') {
      const value = valueAt(resolvedEffect, resolvedContext);
      const targets = this._effectTargets(resolvedEffect, source, selectedTargetId);
      const results = targets.map((target) => {
        const before = Number(target.np || 0);
        const amount = before * value / 100;
        this._addNp(target, amount, false);
        const added = Number(target.np || 0) - before;
        this._log(`${target.name}の現在NPを${value}%増幅し、NPが${added.toFixed(2)}%増加。`, 'np');
        return { target, before, after: target.np, value, added };
      });
      return { applied: results.length > 0, targets, results };
    }

    if (resolvedEffect.type === 'buffClear') {
      const targets = this._effectTargets(resolvedEffect, source, selectedTargetId);
      const results = targets.map((target) => {
        const resistance = this._tryPreventBuffRemoval(target);
        if (resistance.prevented) return { target, prevented: true, resistance };
        target.statuses = (target.statuses || []).filter((status) => status.debuff || status.passive);
        this._log(`${target.name}の強化状態を解除。`, 'debuff');
        return { target, prevented: false };
      });
      return { applied: targets.length > 0, targets, results };
    }

    return originalApplyEffect.call(this, resolvedEffect, source, selectedTargetId, resolvedContext);
  };

  const originalCalculateAttackTotal = proto._calculateAttackTotal;
  proto._calculateAttackTotal = function (actor, target, action, chainContext) {
    return originalCalculateAttackTotal.call(
      this,
      actor,
      target,
      this._resolveEffectiveNpAction(actor, action),
      chainContext
    );
  };

  const originalCardNpPerHit = proto._cardNpPerHit;
  proto._cardNpPerHit = function (actor, target, action, chainContext, overkill) {
    return originalCardNpPerHit.call(
      this,
      actor,
      target,
      this._resolveEffectiveNpAction(actor, action),
      chainContext,
      overkill
    );
  };

  const originalStarRatePerHit = proto._starRatePerHit;
  proto._starRatePerHit = function (actor, target, action, chainContext, overkill) {
    return originalStarRatePerHit.call(
      this,
      actor,
      target,
      this._resolveEffectiveNpAction(actor, action),
      chainContext,
      overkill
    );
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    const actor = this.getUnit(action && action.actorId);
    const executable = Boolean(actor && actor.alive && Number(actor.np || 0) >= 100);
    const effectiveAction = executable ? this._resolveEffectiveNpAction(actor, action) : action;
    const result = originalExecuteNp.call(this, effectiveAction, chainContext, precedingNps);
    if (executable) {
      this._runGenericEvent('afterNp', {
        actor,
        action: effectiveAction,
        np: actor.data.np,
        chainContext,
        precedingNps,
        result
      });
    }
    return result;
  };

  const originalExecuteCommandChain = proto.executeCommandChain;
  proto.executeCommandChain = function () {
    this.refreshSelectedNpCards();
    return originalExecuteCommandChain.apply(this, arguments);
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (!STATUS_NAMES[status.type]) return status;
      return {
        ...status,
        name: STATUS_NAMES[status.type],
        statusIcon: status.statusIcon || DATA.statusIcons[status.type]
      };
    });
  };

  DATA.statusIcons.npCardTypeChange = DATA.statusIcons.npCardTypeChange || 'Statusup.webp';
  DATA.statusIcons.buffRemovalResist = DATA.statusIcons.buffRemovalResist || 'Resistanceup.webp';
  if (Array.isArray(TRAIT.triggerEvents) && !TRAIT.triggerEvents.includes('afterNp')) {
    TRAIT.triggerEvents.push('afterNp');
  }

  const API = {
    validCards: [...VALID_CARDS],
    statusNames: { ...STATUS_NAMES },
    triggerEvent: 'afterNp',
    npCardPriority: 'lastAppliedActiveStatusWins',
    buffRemovalResistPriority: 'shortestDurationThenFewestUsesThenOldest',
    installNpCardResolver
  };

  global.FGO_SIM_NP_CARD_TRIGGER_REMOVAL_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);