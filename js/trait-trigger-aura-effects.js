(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const COMMON = global.FGO_SIM_COMMON_EFFECTS ||
    (typeof require !== 'undefined' ? require('./common-effects.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !COMMON) {
    throw new Error('trait, trigger and aura effects require data, engine and common effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__traitTriggerAuraEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_TRAIT_TRIGGER_AURA_EFFECTS;
    return;
  }
  proto.__traitTriggerAuraEffectsInstalled = true;

  const STATUS_NAMES = {
    temporaryTrait: '期間付き特性',
    beforeAttackApplyTemporaryTrait: '攻撃前特性付与',
    triggerEffect: '条件付きトリガー',
    delayedEffect: '遅延トリガー',
    aura: '常時オーラ'
  };
  const delayedResolvers = Object.create(null);
  const META_KEYS = [
    'event', 'effect', 'effects', 'condition', 'targetCondition', 'traitDuration',
    'sourceDuration', 'delayTurns', 'triggerTurn', 'resolver', 'removeAfterTrigger',
    'provider', 'providerFrontlineOnly', 'modifierType', 'conditionTarget',
    'temporaryTraitDebuff', 'includeReserve', 'label', 'stackQuery'
  ];

  const isAlive = (unit) => Boolean(unit && unit.alive && Number(unit.hp || 0) > 0);
  const isActiveStatus = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);
  const normalizeTrait = (trait) => String(trait == null ? '' : trait).trim();
  const valueAt = (effect, context) => {
    const detail = context || {};
    if (Array.isArray(effect.values)) {
      const level = Math.max(1, Math.min(10, Number(detail.level || 10)));
      return Number(effect.values[level - 1] || 0);
    }
    if (Array.isArray(effect.ocValues)) {
      const oc = Math.max(1, Math.min(5, Number(detail.oc || 1)));
      return Number(effect.ocValues[oc - 1] || 0);
    }
    return Number(effect.value || 0);
  };

  proto._unitHasTrait = function (unit, trait) {
    if (!unit) return false;
    const wanted = normalizeTrait(trait);
    if (!wanted) return false;
    if ((unit.traits || []).some((entry) => normalizeTrait(entry) === wanted)) return true;
    return (unit.statuses || []).some((status) =>
      status.type === 'temporaryTrait' && isActiveStatus(status) && normalizeTrait(status.trait) === wanted
    );
  };

  proto.hasTrait = function (unitOrId, trait) {
    const unit = typeof unitOrId === 'string' ? this.getUnit(unitOrId) : unitOrId;
    return this._unitHasTrait(unit, trait);
  };

  proto.countStatusStacks = function (unitOrId, query) {
    const unit = typeof unitOrId === 'string' ? this.getUnit(unitOrId) : unitOrId;
    if (!unit) return 0;
    const detail = query || {};
    return (unit.statuses || []).filter((status) => {
      if (!isActiveStatus(status)) return false;
      if (detail.type && status.type !== detail.type) return false;
      if (detail.trait && normalizeTrait(status.trait) !== normalizeTrait(detail.trait)) return false;
      if (detail.source && status.source !== detail.source) return false;
      if (detail.debuff != null && Boolean(status.debuff) !== Boolean(detail.debuff)) return false;
      return true;
    }).length;
  };

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    META_KEYS.forEach((key) => {
      if (effect[key] !== undefined) status[key] = effect[key];
    });
    if (status.type === 'delayedEffect' && status.triggerTurn == null) {
      status.triggerTurn = Number(this.state.turn || 1) + Math.max(0, Number(effect.delayTurns || 0));
    }
    return status;
  };

  const originalInitialize = proto._initialize;
  proto._initialize = function () {
    const result = originalInitialize.apply(this, arguments);
    this.state.allies.concat(this.state.enemies).forEach((unit) => {
      (unit.statuses || []).forEach((status) => {
        if (status.type === 'delayedEffect' && status.triggerTurn == null) {
          status.triggerTurn = Number(this.state.turn || 1) + Math.max(0, Number(status.delayTurns || 0));
        }
      });
    });
    return result;
  };

  const previousConditionMet = proto._conditionMet;
  proto._conditionMet = function (condition, context) {
    if (!condition) return true;
    const detail = context || {};
    switch (condition.kind) {
      case 'targetHasTrait':
        return detail.target ? this._unitHasTrait(detail.target, condition.key || condition.trait) : true;
      case 'targetHasStatus':
        return detail.target ? this._hasStatus(detail.target, condition.key || condition.statusType, condition.filter) : true;
      case 'sourceHasTrait':
        return detail.source ? this._unitHasTrait(detail.source, condition.key || condition.trait) : false;
      case 'sourceHasStatus':
        return detail.source ? this._hasStatus(detail.source, condition.key || condition.statusType, condition.filter) : false;
      case 'all':
        return (condition.conditions || []).every((entry) => this._conditionMet(entry, detail));
      case 'any':
        return (condition.conditions || []).some((entry) => this._conditionMet(entry, detail));
      case 'not':
        return !this._conditionMet(condition.condition, detail);
      default:
        return typeof previousConditionMet === 'function'
          ? previousConditionMet.call(this, condition, detail)
          : false;
    }
  };

  const originalEffectTargets = proto._effectTargets;
  proto._effectTargets = function (effect, source, selectedTargetId) {
    let targets;
    switch (effect && effect.target) {
      case 'allOtherAllies':
        targets = this.getAliveAllies().filter((unit) => unit !== source);
        break;
      case 'allAlliesIncludingReserve':
        targets = this.state.allies.filter(isAlive);
        break;
      case 'allOtherAlliesIncludingReserve':
        targets = this.state.allies.filter((unit) => isAlive(unit) && unit !== source);
        break;
      case 'attackedEnemy': {
        const current = this._currentEffectContext || {};
        targets = current.target && isAlive(current.target) ? [current.target] : [];
        break;
      }
      default:
        targets = originalEffectTargets.call(this, effect, source, selectedTargetId);
        break;
    }

    const condition = effect && (effect.targetCondition || effect.condition);
    if (!condition) return targets;
    const current = this._currentEffectContext || {};
    return targets.filter((target) => this._conditionMet(condition, {
      ...current,
      effect,
      source,
      target,
      selectedTargetId
    }));
  };

  proto._traitPower = function (actor, target) {
    let total = 0;
    (actor.statuses || []).forEach((status) => {
      if (status.type === 'traitPowerUp' && this._unitHasTrait(target, status.trait)) total += Number(status.value || 0);
      if (status.type === 'attributePowerUp' && target.attribute === status.attribute) total += Number(status.value || 0);
    });
    return total;
  };

  const originalNpSpecialMultiplier = proto._npSpecialMultiplier;
  proto._npSpecialMultiplier = function (np, target) {
    if (!np || !np.special) return 1;
    if (np.special.kind === 'trait') {
      if (!this._unitHasTrait(target, np.special.key)) return 1;
      const oc = Math.max(1, Math.min(5, Number(this._currentNpOc || 1)));
      return Number((np.special.ocMultipliers || [])[oc - 1] || np.special.multiplier || 1);
    }
    return originalNpSpecialMultiplier.call(this, np, target);
  };

  proto._auraProviders = function () {
    return this.state.allies.concat(this.state.enemies).filter(isAlive);
  };

  proto._auraTargetMatches = function (aura, provider, recipient) {
    const providerIsAlly = this.state.allies.includes(provider);
    const recipientIsAlly = this.state.allies.includes(recipient);
    switch (aura.target) {
      case 'self': return provider === recipient;
      case 'allAllies': return providerIsAlly === recipientIsAlly && recipient.frontline && isAlive(recipient);
      case 'allOtherAllies': return provider !== recipient && providerIsAlly === recipientIsAlly && recipient.frontline && isAlive(recipient);
      case 'allAlliesIncludingReserve': return providerIsAlly === recipientIsAlly && isAlive(recipient);
      case 'allOtherAlliesIncludingReserve': return provider !== recipient && providerIsAlly === recipientIsAlly && isAlive(recipient);
      case 'allEnemies': return providerIsAlly !== recipientIsAlly && isAlive(recipient);
      default: return false;
    }
  };

  proto._auraModifierTotal = function (modifierType, recipient, context) {
    if (!recipient) return 0;
    const detail = context || {};
    let total = 0;
    this._auraProviders().forEach((provider) => {
      (provider.statuses || []).forEach((aura) => {
        if (aura.type !== 'aura' || !isActiveStatus(aura) || aura.modifierType !== modifierType) return;
        if (aura.providerFrontlineOnly !== false && !provider.frontline) return;
        if (!this._auraTargetMatches(aura, provider, recipient)) return;
        const conditionTarget = aura.conditionTarget === 'attackTarget'
          ? (detail.attackTarget || detail.target || null)
          : recipient;
        if (aura.condition && !this._conditionMet(aura.condition, {
          ...detail,
          source: provider,
          target: conditionTarget,
          recipient,
          aura
        })) return;
        total += Number(aura.value || 0);
      });
    });
    return total;
  };

  const originalStatusTotal = proto._statusTotal;
  proto._statusTotal = function (unit, type, filter) {
    const base = originalStatusTotal.call(this, unit, type, filter);
    return base + this._auraModifierTotal(type, unit, this._auraContext || {});
  };

  const originalCardNpPerHit = proto._cardNpPerHit;
  proto._cardNpPerHit = function (actor, target, action, chainContext, overkill) {
    const previous = this._auraContext;
    this._auraContext = { event: 'attack', actor, target, attackTarget: target, action, chainContext };
    try {
      return originalCardNpPerHit.call(this, actor, target, action, chainContext, overkill);
    } finally {
      this._auraContext = previous;
    }
  };

  const originalEnemyAttackDamage = proto._enemyAttackDamage;
  proto._enemyAttackDamage = function (enemy, ally, isNp, critical) {
    const previous = this._auraContext;
    this._auraContext = {
      event: 'enemyAttack', actor: enemy, target: ally, attackTarget: ally,
      action: { type: isNp ? 'np' : 'card', critical: Boolean(critical) }
    };
    try {
      return originalEnemyAttackDamage.call(this, enemy, ally, isNp, critical);
    } finally {
      this._auraContext = previous;
    }
  };

  proto._applyTemporaryTraitFromTrigger = function (owner, status, context) {
    const detail = context || {};
    const target = detail.target;
    if (!target || !isAlive(target)) return { applied: false, reason: 'invalidTarget' };
    const chance = Math.max(0, Math.min(100, Number(status.chance == null ? 100 : status.chance)));
    const effect = {
      type: 'temporaryTrait',
      target: 'attackedEnemy',
      trait: status.trait,
      duration: status.traitDuration == null ? 1 : Number(status.traitDuration),
      debuff: Boolean(status.temporaryTraitDebuff),
      chance
    };
    if (!effect.debuff && this.rng() * 100 >= chance) {
      this._log(`${target.name}への〔${status.trait}〕特性付与は失敗。`, 'resist');
      return { applied: false, reason: 'chance' };
    }
    if (!effect.debuff) delete effect.chance;
    return this._applyEffect(effect, owner, target.id, detail);
  };

  proto._runTriggerEffect = function (owner, status, eventName, context) {
    if (!owner || !isActiveStatus(status)) return { triggered: false };
    const detail = { ...(context || {}), source: owner, owner, status };
    if (status.condition && !this._conditionMet(status.condition, detail)) return { triggered: false, reason: 'condition' };

    if (status.type === 'beforeAttackApplyTemporaryTrait') {
      if (eventName !== 'beforeAttackDamage') return { triggered: false };
      const actor = detail.actor;
      if (owner !== actor && status.provider !== true) return { triggered: false };
      const result = this._applyTemporaryTraitFromTrigger(owner, status, detail);
      if (status.uses != null) this._consumeStatus(owner, status);
      return { triggered: true, result };
    }

    if (status.type !== 'triggerEffect' || status.event !== eventName) return { triggered: false };
    const actor = detail.actor;
    if (owner !== actor && status.provider !== true && !['turnStart', 'turnEnd'].includes(eventName)) {
      return { triggered: false };
    }
    const effects = Array.isArray(status.effects) ? status.effects : [status.effect].filter(Boolean);
    const previous = this._currentEffectContext;
    this._currentEffectContext = detail;
    try {
      effects.forEach((effect) => this._applyEffect(effect, owner, detail.selectedTargetId || (detail.target && detail.target.id), detail));
    } finally {
      this._currentEffectContext = previous;
    }
    if (status.uses != null) this._consumeStatus(owner, status);
    if (status.removeAfterTrigger === true) owner.statuses = owner.statuses.filter((entry) => entry !== status);
    return { triggered: true, effects };
  };

  proto._runDelayedEffect = function (owner, status, context) {
    if (!owner || status.type !== 'delayedEffect' || !isActiveStatus(status)) return { triggered: false };
    if (Number(this.state.turn || 1) < Number(status.triggerTurn || 0)) return { triggered: false };
    const detail = { ...(context || {}), source: owner, owner, status };
    let effects = [];
    const resolver = status.resolver && delayedResolvers[status.resolver];
    if (typeof resolver === 'function') {
      const resolved = resolver(this, detail);
      effects = Array.isArray(resolved) ? resolved : [resolved].filter(Boolean);
    } else {
      effects = Array.isArray(status.effects) ? status.effects : [status.effect].filter(Boolean);
    }
    const previous = this._currentEffectContext;
    this._currentEffectContext = detail;
    try {
      effects.forEach((effect) => this._applyEffect(effect, owner, owner.id, detail));
    } finally {
      this._currentEffectContext = previous;
    }
    owner.statuses = owner.statuses.filter((entry) => entry !== status);
    return { triggered: true, effects };
  };

  proto._runGenericEvent = function (eventName, context) {
    const detail = context || {};
    const units = this.state.allies.concat(this.state.enemies).filter(isAlive);
    const results = [];
    units.forEach((owner) => {
      (owner.statuses || []).slice().forEach((status) => {
        if (eventName === 'turnStart' && status.type === 'delayedEffect') {
          results.push(this._runDelayedEffect(owner, status, detail));
          return;
        }
        results.push(this._runTriggerEffect(owner, status, eventName, detail));
      });
    });
    return results.filter((entry) => entry && entry.triggered);
  };

  const originalResolveAttackOnTarget = proto._resolveAttackOnTarget;
  proto._resolveAttackOnTarget = function (actor, target, action, chainContext) {
    const detail = { actor, target, action, chainContext };
    this._runGenericEvent('beforeAttackDamage', detail);
    const result = originalResolveAttackOnTarget.call(this, actor, target, action, chainContext);
    this._runGenericEvent('afterAttack', { ...detail, result });
    return result;
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId) {
    const actor = this.getUnit(allyId);
    const skill = actor && actor.data && actor.data.skills ? actor.data.skills[skillIndex] : null;
    const result = originalUseSkill.call(this, allyId, skillIndex, selectedTargetId);
    if (result && result.ok) {
      this._runGenericEvent('afterSkillUse', { actor, skill, skillIndex, selectedTargetId, result });
    }
    return result;
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    const result = originalFinishTurn.apply(this, arguments);
    if (!this.state.winner && this.state.phase === 'command') {
      this._runGenericEvent('turnStart', { turn: this.state.turn });
    }
    return result;
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect) return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    const detail = context || {};
    let resolvedEffect = effect;
    if (effect.type === 'beforeAttackApplyTemporaryTrait') {
      resolvedEffect = {
        ...effect,
        duration: effect.sourceDuration == null ? (effect.duration == null ? -1 : effect.duration) : effect.sourceDuration,
        traitDuration: effect.duration == null ? 1 : effect.duration
      };
    } else if (effect.type === 'delayedEffect') {
      resolvedEffect = { ...effect, duration: effect.duration == null ? -1 : effect.duration };
    }

    if (resolvedEffect.type === 'buffClear') {
      const targets = this._effectTargets(resolvedEffect, source, selectedTargetId);
      targets.forEach((target) => {
        target.statuses = (target.statuses || []).filter((status) => status.debuff || status.passive);
        this._log(`${target.name}の強化状態を解除。`, 'debuff');
      });
      return { applied: targets.length > 0, targets };
    }

    const previous = this._currentEffectContext;
    this._currentEffectContext = { ...detail, effect: resolvedEffect, source, selectedTargetId };
    try {
      return originalApplyEffect.call(this, resolvedEffect, source, selectedTargetId, context);
    } finally {
      this._currentEffectContext = previous;
    }
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (!STATUS_NAMES[status.type]) return status;
      const traitLabel = status.type === 'temporaryTrait' && status.trait ? `〔${status.trait}〕特性` : null;
      return {
        ...status,
        name: status.label || traitLabel || STATUS_NAMES[status.type],
        statusIcon: status.statusIcon || DATA.statusIcons[status.type]
      };
    });
  };

  DATA.statusIcons.temporaryTrait = DATA.statusIcons.temporaryTrait || 'Statusup.webp';
  DATA.statusIcons.beforeAttackApplyTemporaryTrait = DATA.statusIcons.beforeAttackApplyTemporaryTrait || 'Buffatk.webp';
  DATA.statusIcons.triggerEffect = DATA.statusIcons.triggerEffect || 'Statusup.webp';
  DATA.statusIcons.delayedEffect = DATA.statusIcons.delayedEffect || 'Statusup.webp';
  DATA.statusIcons.aura = DATA.statusIcons.aura || 'Statusup.webp';
  Object.assign(COMMON.statusNames, STATUS_NAMES);

  function registerDelayedResolver(key, resolver) {
    if (!key || typeof resolver !== 'function') throw new Error('resolver key and function are required.');
    delayedResolvers[key] = resolver;
    return resolver;
  }

  const API = {
    statusNames: { ...STATUS_NAMES },
    conditionKinds: ['targetHasTrait', 'targetHasStatus', 'sourceHasTrait', 'sourceHasStatus'],
    targetKinds: ['allOtherAllies', 'allAlliesIncludingReserve', 'allOtherAlliesIncludingReserve', 'attackedEnemy'],
    triggerEvents: ['afterSkillUse', 'beforeAttackDamage', 'afterAttack', 'turnStart', 'turnEnd'],
    auraTargets: ['self', 'allAllies', 'allOtherAllies', 'allAlliesIncludingReserve', 'allOtherAlliesIncludingReserve', 'allEnemies'],
    registerDelayedResolver,
    delayedResolvers
  };

  global.FGO_SIM_TRAIT_TRIGGER_AURA_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
