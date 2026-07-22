(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('../data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('../engine.js') : null);
  const REGISTRY = global.FGO_UNIQUE_MECHANICS ||
    (typeof require !== 'undefined' ? require('./registry.js') : null);

  if (typeof require !== 'undefined') {
    require('../common-effects.js');
    require('../card-buff-effects.js');
    require('../trait-trigger-aura-effects.js');
    require('../np-card-trigger-removal-effects.js');
    require('../order-change-position.js');
  }

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !REGISTRY) {
    throw new Error('Rlyeh mechanics require data, engine and unique registry.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__rlyehMechanicsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_RLYEH_MECHANICS;
    return;
  }
  proto.__rlyehMechanicsInstalled = true;

  const SERVANT_ID = 'rlyeh';
  const TYPES = {
    cardBoost: 'rlyehCardPerformanceBoost',
    sleepContract: 'rlyehPermanentSleepContract',
    permanentSleep: 'rlyehPermanentSleep',
    deathRelay: 'rlyehInstantDeathNpRelay'
  };
  const STATUS_NAMES = {
    [TYPES.cardBoost]: 'カード性能アップブースト',
    [TYPES.sleepContract]: 'ターン終了時・強化解除／永久睡眠',
    [TYPES.permanentSleep]: '永久睡眠',
    [TYPES.deathRelay]: '即死時・味方全体NP増加'
  };
  const BOOST_ICONS = {
    quick: 'Quickupboost.webp',
    arts: 'Artsupboost.webp',
    buster: 'Busterupboost.webp'
  };
  const BOOST_VALUES = [50,55,60,65,70,75,80,85,90,100];
  const CARD_VALUES = [30,32,34,36,38,40,42,44,46,50];
  const VALID_CARDS = new Set(['quick', 'arts', 'buster']);

  const isAlive = (unit) => Boolean(unit && unit.alive && Number(unit.hp || 0) > 0);
  const isActive = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);
  const isRlyeh = (unit) => Boolean(unit && unit.servantId === SERVANT_ID);
  const deepClone = (value) => JSON.parse(JSON.stringify(value));

  function hasTrait(engine, unit, trait) {
    return typeof engine._unitHasTrait === 'function'
      ? engine._unitHasTrait(unit, trait)
      : (unit.traits || []).includes(trait);
  }

  function isRemovableBuff(status) {
    return Boolean(status && isActive(status) && !status.debuff && !status.passive && !status.unremovable);
  }

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    if (effect && effect.uniqueKey) {
      const existing = (unit.statuses || []).find((status) => status.uniqueKey === effect.uniqueKey && isActive(status));
      if (existing) return existing;
    }
    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (status && effect) {
      ['unremovable', 'uniqueKey', 'label', 'providerUnitId'].forEach((key) => {
        if (effect[key] !== undefined) status[key] = effect[key];
      });
    }
    return status;
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || effect.type !== 'rlyehInstantDeath') {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }
    const targets = this._effectTargets(effect, source, selectedTargetId).slice();
    const results = targets.map((target) => this._resolveRlyehInstantDeath(source, target, Number(effect.value || 0)));
    return { applied: results.some((result) => result.success), targets, results };
  };

  proto._resolveRlyehInstantDeath = function (source, target, baseChance) {
    if (!isAlive(target)) return { success: false, reason: 'invalidTarget', target };
    if ((target.statuses || []).some((status) => status.type === 'instantDeathImmune' && isActive(status))) {
      this._log(`${target.name}は即死無効により即死を防いだ。`, 'resist');
      return { success: false, reason: 'immune', target };
    }
    const resistance = Math.max(0, this._statusTotal(target, 'deathResist'));
    const chance = Math.max(0, Math.min(100, Number(baseChance || 0) * Number(target.deathRate || 0) / 100 - resistance));
    if (this.rng() * 100 >= chance) {
      this._log(`${target.name}への即死は失敗。`, 'resist');
      return { success: false, reason: 'chance', chance, target };
    }

    const buffs = isRlyeh(source) ? (target.statuses || []).filter(isRemovableBuff) : [];
    if (buffs.length) {
      target.statuses = target.statuses.filter((status) => !buffs.includes(status));
      buffs.forEach((status) => {
        const clone = deepClone(status);
        clone.source = `${source.name}：即死成功時吸収`;
        source.statuses.push(clone);
      });
      this._log(`${source.name}は${target.name}の強化状態を${buffs.length}個吸収。`, 'skill');
    }

    target.hp = 0;
    target.alive = false;
    this._log(`${target.name}に即死効果が成功。`, 'death');
    this._triggerRlyehDeathRelays(target);
    return { success: true, chance, target, absorbed: buffs.length };
  };

  proto._triggerRlyehDeathRelays = function (deadUnit) {
    if (!deadUnit || !this.state.allies.includes(deadUnit)) return [];
    const relays = (deadUnit.statuses || []).filter((status) => status.type === TYPES.deathRelay && isActive(status));
    const results = [];
    relays.forEach((relay) => {
      this.state.allies.filter((unit) => unit !== deadUnit && isAlive(unit)).forEach((unit) => {
        this._addNp(unit, Number(relay.value || 50), true);
        results.push(unit);
      });
      this._log(`${deadUnit.name}の即死に呼応し、自身を除く味方全体のNPが${Number(relay.value || 50)}%増加。`, 'np');
    });
    return results;
  };

  const originalApplyInstantDeath = proto._applyInstantDeath;
  proto._applyInstantDeath = function (enemy, ally) {
    const wasAlive = isAlive(ally);
    const result = originalApplyInstantDeath.call(this, enemy, ally);
    if (wasAlive && !isAlive(ally)) this._triggerRlyehDeathRelays(ally);
    return result;
  };

  function installDeathRelays(engine) {
    const providers = engine.state.allies.filter(isRlyeh);
    providers.forEach((provider) => {
      engine.state.allies.filter((unit) => unit !== provider).forEach((unit) => {
        engine._addStatus(unit, {
          type: TYPES.deathRelay,
          value: 50,
          duration: -1,
          passive: true,
          unremovable: true,
          uniqueKey: `${TYPES.deathRelay}:${provider.id}`,
          providerUnitId: provider.id,
          label: STATUS_NAMES[TYPES.deathRelay],
          statusIcon: 'Npchargeup.webp'
        }, 50, '絶海にて微睡む太古の支配者');
      });
    });
  }

  const originalInitialize = proto._initialize;
  proto._initialize = function () {
    const result = originalInitialize.apply(this, arguments);
    installDeathRelays(this);
    return result;
  };

  const originalStatusTotal = proto._statusTotal;
  proto._statusTotal = function (unit, type, filter) {
    const base = originalStatusTotal.call(this, unit, type, filter);
    if (type !== 'cardUp' || !filter || !VALID_CARDS.has(filter.card) || !unit) return base;
    const boosts = (unit.statuses || [])
      .filter((status) => status.type === TYPES.cardBoost && status.card === filter.card && isActive(status))
      .map((status) => Number(status.value || 0));
    return boosts.length ? base * (1 + Math.max(...boosts) / 100) : base;
  };

  const originalNpSpecialMultiplier = proto._npSpecialMultiplier;
  proto._npSpecialMultiplier = function (np, target) {
    if (np && np.special && np.special.kind === 'anyTraitNpLevel') {
      const matched = (np.special.keys || []).some((trait) => hasTrait(this, target, trait));
      if (!matched) return 1;
      const level = Math.max(1, Math.min(5, Number(this._rlyehCurrentNpLevel || 1)));
      return Number((np.special.npLevelMultipliers || [])[level - 1] || 1);
    }
    return originalNpSpecialMultiplier.call(this, np, target);
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    const actor = this.getUnit(action && action.actorId);
    const previous = this._rlyehCurrentNpLevel;
    if (isRlyeh(actor)) this._rlyehCurrentNpLevel = actor.npLevel;
    try {
      return originalExecuteNp.call(this, action, chainContext, precedingNps);
    } finally {
      this._rlyehCurrentNpLevel = previous;
    }
  };

  const originalCalculateAttackTotal = proto._calculateAttackTotal;
  proto._calculateAttackTotal = function (actor, target, action, chainContext) {
    if (!isRlyeh(actor) || !['ヒト科', '今を生きる人類'].some((trait) => hasTrait(this, target, trait))) {
      return originalCalculateAttackTotal.call(this, actor, target, action, chainContext);
    }
    const actorClass = actor.classId;
    const targetClass = target.classId;
    actor.classId = 'saber';
    target.classId = 'lancer';
    try {
      return originalCalculateAttackTotal.call(this, actor, target, action, chainContext);
    } finally {
      actor.classId = actorClass;
      target.classId = targetClass;
    }
  };

  function applyGreatOldOne(engine, actor, target, level, card) {
    const index = Math.max(1, Math.min(10, Number(level || 10))) - 1;
    engine._addStatus(target, {
      type: TYPES.cardBoost,
      card,
      duration: 1,
      uniqueKey: TYPES.cardBoost,
      label: `${card.toUpperCase()}カード性能アップブースト`,
      statusIcon: BOOST_ICONS[card]
    }, BOOST_VALUES[index], actor.name);
    engine._addStatus(target, {
      type: 'cardUp',
      card,
      duration: 1,
      statusIcon: card === 'quick' ? 'Quickupstatus.webp' : card === 'arts' ? 'Artsupstatus.webp' : 'Busterupstatus.webp'
    }, CARD_VALUES[index], actor.name);
    engine._addStatus(target, {
      type: TYPES.sleepContract,
      duration: 1,
      uses: 1,
      unremovable: true,
      uniqueKey: TYPES.sleepContract,
      label: STATUS_NAMES[TYPES.sleepContract],
      statusIcon: 'DelayedDebuff.webp'
    }, 0, actor.name);
  }

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId, selectedCardType) {
    const actor = this.getUnit(allyId);
    const skill = actor && actor.data && actor.data.skills[skillIndex];
    if (!isRlyeh(actor) || !skill || skill.id !== 'greatOldOne') {
      if (actor && (actor.statuses || []).some((status) => status.type === TYPES.permanentSleep && isActive(status))) {
        return { ok: false, reason: '永久睡眠状態のためスキルを使用できません。' };
      }
      return originalUseSkill.call(this, allyId, skillIndex, selectedTargetId);
    }
    if (this.state.phase !== 'command' || this.state.winner) return { ok: false, reason: '現在はスキルを使用できません。' };
    if (actor.cooldowns[skillIndex] > 0) return { ok: false, reason: `CTが${actor.cooldowns[skillIndex]}残っています。` };
    const target = this.state.allies.find((unit) => unit.id === selectedTargetId && isAlive(unit) && unit.frontline);
    const card = String(selectedCardType || '').toLowerCase();
    if (!target) return { ok: false, reason: '味方の対象を選択してください。' };
    if (!VALID_CARDS.has(card)) return { ok: false, reason: 'Quick・Arts・Busterからカードタイプを選択してください。' };
    const level = actor.skillLevels[skillIndex];
    actor.cooldowns[skillIndex] = ENGINE.effectiveCooldown(skill.baseCt, level);
    this._log(`${actor.name}が「${skill.name}」を使用（${card.toUpperCase()}）。`, 'skill');
    applyGreatOldOne(this, actor, target, level, card);
    return { ok: true, card, target };
  };

  function isSleeping(unit) {
    return Boolean(unit && (unit.statuses || []).some((status) => status.type === TYPES.permanentSleep && isActive(status)));
  }

  const originalToggleCard = proto.toggleCard;
  proto.toggleCard = function (cardId) {
    const card = this.state.hand.find((entry) => entry.id === cardId);
    if (card && isSleeping(this.getUnit(card.actorId))) return false;
    return originalToggleCard.call(this, cardId);
  };

  const originalToggleNp = proto.toggleNp;
  proto.toggleNp = function (allyId) {
    if (isSleeping(this.getUnit(allyId))) return false;
    return originalToggleNp.call(this, allyId);
  };

  const originalOrderChange = proto.orderChange;
  proto.orderChange = function (frontId, reserveId) {
    if (isSleeping(this.getUnit(frontId)) || isSleeping(this.getUnit(reserveId))) {
      return { ok: false, reason: '永久睡眠状態の対象はオーダーチェンジできません。' };
    }
    return originalOrderChange.call(this, frontId, reserveId);
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    this.state.allies.forEach((unit) => {
      const contract = (unit.statuses || []).find((status) => status.type === TYPES.sleepContract && isActive(status));
      if (!contract) return;
      unit.statuses = (unit.statuses || []).filter((status) => status === contract || status.debuff || status.passive || status.unremovable);
      unit.statuses = unit.statuses.filter((status) => status !== contract);
      this._addStatus(unit, {
        type: TYPES.permanentSleep,
        duration: -1,
        unremovable: true,
        uniqueKey: TYPES.permanentSleep,
        label: STATUS_NAMES[TYPES.permanentSleep],
        statusIcon: 'Stunstatus.webp'
      }, 0, '古の支配者 A++');
      this._addStatus(unit, {
        type: 'baphometSacrificeImmune',
        duration: -1,
        unremovable: true,
        uniqueKey: `${TYPES.permanentSleep}:sacrifice`,
        label: '生贄選択不能',
        statusIcon: 'Stunstatus.webp'
      }, 1, '永久睡眠');
      this._log(`${unit.name}の強化状態を解除し、永久睡眠状態を付与。`, 'debuff');
    });
    return originalFinishTurn.apply(this, arguments);
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (!STATUS_NAMES[status.type]) return status;
      return { ...status, name: status.label || STATUS_NAMES[status.type], statusIcon: status.statusIcon || DATA.statusIcons[status.type] };
    });
  };

  Object.entries(STATUS_NAMES).forEach(([type, name]) => {
    DATA.statusIcons[type] = DATA.statusIcons[type] || (type === TYPES.permanentSleep ? 'Stunstatus.webp' : 'Statusup.webp');
  });

  REGISTRY.register(SERVANT_ID, {
    name: 'ルルイエ',
    hooks: {},
    notes: 'カード色選択、永久睡眠、即死時NP配布、即死成功時強化吸収、固有クラス相性を管理。'
  });

  const API = { servantId: SERVANT_ID, statusTypes: { ...TYPES }, boostValues: BOOST_VALUES.slice(), cardValues: CARD_VALUES.slice() };
  global.FGO_SIM_RLYEH_MECHANICS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
