(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('../data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('../engine.js') : null);
  const REGISTRY = global.FGO_UNIQUE_MECHANICS ||
    (typeof require !== 'undefined' ? require('./registry.js') : null);

  if (typeof require !== 'undefined') require('../common-effects.js');
  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !REGISTRY) {
    throw new Error('Beast No.031 mechanics require data, engine and unique registry.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__beast031MechanicsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_BEAST031_MECHANICS;
    return;
  }
  proto.__beast031MechanicsInstalled = true;

  const SERVANT_ID = 'beast031';
  const TYPES = {
    massAttack: 'beast031MassNormalAttack',
    hatredTrigger: 'beast031HatredOnAttack',
    hatredSpecialTrigger: 'beast031HatredSpecialOnAttack',
    hatred: 'beast031Hatred',
    hatredSpecial: 'beast031HatredSpecial',
    delayedRebellion: 'beast031DelayedRebellionReward',
    slaughter: 'beast031Slaughter',
    deathCooldown: 'beast031CooldownOnInstantDeath',
    sealImmune: 'beast031SealMentalImmune'
  };
  const STATUS_NAMES = {
    [TYPES.massAttack]: 'Quick・Buster通常攻撃全体化',
    [TYPES.hatredTrigger]: '攻撃時・ダメージ前〔憎悪〕付与',
    [TYPES.hatredSpecialTrigger]: '攻撃時・ダメージ前〔憎悪〕特攻付与',
    [TYPES.hatred]: '憎悪',
    [TYPES.hatredSpecial]: '憎悪特攻',
    [TYPES.delayedRebellion]: 'ターン終了時NP増加・攻撃力アップ',
    [TYPES.slaughter]: '鏖殺の獣',
    [TYPES.deathCooldown]: '即死成功時スキルチャージ短縮',
    [TYPES.sealImmune]: '精神異常・宝具封印・スキル封印無効'
  };
  const META_KEYS = ['cards', 'rewardNp', 'rewardAttack', 'hatredValue'];
  const isAlive = (unit) => Boolean(unit && unit.alive && Number(unit.hp || 0) > 0);
  const isActive = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);
  const isBeast = (unit) => Boolean(unit && unit.servantId === SERVANT_ID);
  const levelIndex = (unit) => Math.max(0, Math.min(9, Number((unit.skillLevels || [10])[1] || 10) - 1));

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (status && effect) META_KEYS.forEach((key) => {
      if (effect[key] !== undefined) status[key] = effect[key];
    });
    return status;
  };

  function installPartyDemerit(engine) {
    const providers = engine.state.allies.filter(isBeast);
    if (!providers.length) return;
    engine.state.allies.forEach((unit) => {
      providers.forEach((provider) => {
        if ((unit.statuses || []).some((s) => s.type === 'debuffResist' && s.uniqueKey === `beast031-party-demerit:${provider.id}`)) return;
        const status = engine._addStatus(unit, {
          type: 'debuffResist', value: -15, duration: -1, passive: true, unremovable: true
        }, -15, '怨讐の畔 EX');
        status.uniqueKey = `beast031-party-demerit:${provider.id}`;
      });
    });
  }

  const originalInitialize = proto._initialize;
  proto._initialize = function () {
    const result = originalInitialize.apply(this, arguments);
    installPartyDemerit(this);
    return result;
  };

  const originalTryApplyDebuff = proto._tryApplyDebuff;
  proto._tryApplyDebuff = function (source, target, effect, sourceLabel) {
    const type = effect && (effect.debuffType || effect.type);
    if (isBeast(target) && ['charm', 'fear', 'confusion', 'sleep', 'npSeal', 'skillSeal'].includes(type)) {
      this._log(`${target.name}は${STATUS_NAMES[TYPES.sealImmune]}により${type}を無効化。`, 'resist');
      return { success: false, immune: true };
    }
    return originalTryApplyDebuff.call(this, source, target, effect, sourceLabel);
  };

  const originalCalculateAttackTotal = proto._calculateAttackTotal;
  proto._calculateAttackTotal = function (actor, target, action, chainContext) {
    const base = originalCalculateAttackTotal.call(this, actor, target, action, chainContext);
    return action && action.beast031MassHalf ? Math.floor(base * 0.5) : base;
  };

  const originalCardNpPerHit = proto._cardNpPerHit;
  proto._cardNpPerHit = function (actor, target, action, chainContext, overkill) {
    const base = originalCardNpPerHit.call(this, actor, target, action, chainContext, overkill);
    return action && action.beast031MassHalf ? base * 0.5 : base;
  };

  const originalStarRatePerHit = proto._starRatePerHit;
  proto._starRatePerHit = function (actor, target, action, chainContext, overkill) {
    const base = originalStarRatePerHit.call(this, actor, target, action, chainContext, overkill);
    return action && action.beast031MassHalf ? base * 0.5 : base;
  };

  const originalTraitPower = proto._traitPower;
  proto._traitPower = function (actor, target) {
    const base = originalTraitPower.call(this, actor, target);
    const hasHatred = (target.statuses || []).some((status) => status.type === TYPES.hatred && isActive(status));
    if (!hasHatred) return base;
    return base + (actor.statuses || [])
      .filter((status) => status.type === TYPES.hatredSpecial && isActive(status))
      .reduce((sum, status) => sum + Number(status.value || 0), 0);
  };

  function applyPreDamageHatred(engine, actor, target) {
    const hatred = (actor.statuses || []).find((status) => status.type === TYPES.hatredTrigger && isActive(status));
    if (hatred) {
      engine._addStatus(target, {
        type: TYPES.hatred, duration: 5, debuff: true, statusIcon: 'Burnstatus.webp'
      }, Number(hatred.value || 5000), actor.name);
      engine._consumeStatus(actor, hatred);
    }
    const special = (actor.statuses || []).find((status) => status.type === TYPES.hatredSpecialTrigger && isActive(status));
    if (special) {
      engine._addStatus(actor, {
        type: TYPES.hatredSpecial, duration: 5, statusIcon: 'Specialattackup.webp'
      }, Number(special.value || 20), actor.name);
      engine._consumeStatus(actor, special);
    }
  }

  const originalResolveAttackOnTarget = proto._resolveAttackOnTarget;
  proto._resolveAttackOnTarget = function (actor, target, action, chainContext) {
    if (isBeast(actor) && target && action) applyPreDamageHatred(this, actor, target);
    return originalResolveAttackOnTarget.call(this, actor, target, action, chainContext);
  };

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    const actor = this.getUnit(action.actorId);
    const card = this.state.hand.find((entry) => entry.id === action.cardId);
    const mass = actor && card && (actor.statuses || []).find((status) =>
      status.type === TYPES.massAttack && isActive(status) && (status.cards || ['quick', 'buster']).includes(card.card)
    );
    if (!mass) return originalExecuteCard.call(this, action, chainContext);

    const targets = this.getAliveEnemies().slice();
    if (!actor.alive || !targets.length) return;
    const quickFirstCritBonus = chainContext.firstBonuses.quick ? 20 : 0;
    const effectiveCritChance = Math.max(0, Math.min(100, Number(card.critChance || 0) + quickFirstCritBonus));
    const critical = this.rng() * 100 < effectiveCritChance;
    const resolvedAction = { ...action, type: 'card', card: card.card, critical, beast031MassHalf: true };
    let totalDamage = 0;
    let totalNp = 0;
    let totalStars = 0;
    targets.forEach((target) => {
      const result = this._resolveAttackOnTarget(actor, target, resolvedAction, chainContext);
      totalDamage += result.damage;
      totalNp += result.np;
      totalStars += result.stars;
      if (typeof this._runEffectHooks === 'function') this._runEffectHooks('afterNormalAttack', { actor, target, action: resolvedAction, chainContext });
    });
    this._addNp(actor, totalNp, false);
    this.state.nextStars += totalStars;
    this._log(`${actor.name}の${card.card.toUpperCase()}全体攻撃${critical ? ' CRITICAL' : ''}：合計${totalDamage.toLocaleString('ja-JP')}ダメージ／NP+${totalNp.toFixed(2)}／スター${totalStars}。`, critical ? 'critical' : 'damage');
    if (card.card === 'buster') {
      const extraNp = this._statusTotal(actor, 'busterNormalNp');
      if (extraNp > 0) this._addNp(actor, extraNp, true);
    }
  };

  function resolveInstantDeath(engine, source, target, baseChance) {
    if (!isAlive(target)) return { success: false, reason: 'invalidTarget' };
    if ((target.statuses || []).some((status) => status.type === 'instantDeathImmune' && isActive(status))) {
      return { success: false, reason: 'immune' };
    }
    const resistance = engine._statusTotal(target, 'deathResist');
    const chance = Math.max(0, Math.min(100, Number(baseChance || 0) * Number(target.deathRate || 0) / 100 - resistance));
    if (engine.rng() * 100 >= chance) return { success: false, reason: 'chance', chance };
    target.hp = 0;
    target.alive = false;
    engine._log(`${target.name}に即死効果が成功。`, 'death');
    if ((source.statuses || []).some((status) => status.type === TYPES.deathCooldown && isActive(status))) {
      source.cooldowns = source.cooldowns.map((ct) => Math.max(0, ct - 1));
    }
    const slaughter = (source.statuses || []).find((status) => status.type === TYPES.slaughter && isActive(status));
    if (slaughter) engine._addNp(source, 20, true);
    return { success: true, chance };
  }

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || effect.type !== 'beast031InstantDeath') {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }
    const targets = this._effectTargets(effect, source, selectedTargetId);
    return targets.map((target) => resolveInstantDeath(this, source, target, Number(effect.value || 0)));
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId, selectedCardType) {
    const actor = this.getUnit(allyId);
    const skill = actor && actor.data && actor.data.skills && actor.data.skills[skillIndex];
    if (!isBeast(actor) || !skill || !['eternalSin', 'beastOfSlaughter'].includes(skill.id)) {
      return originalUseSkill.call(this, allyId, skillIndex, selectedTargetId, selectedCardType);
    }
    if (this.state.phase !== 'command' || this.state.winner) return { ok: false, reason: '現在はスキルを使用できません。' };
    if (actor.cooldowns[skillIndex] > 0) return { ok: false, reason: `CTが${actor.cooldowns[skillIndex]}残っています。` };
    const level = Math.max(1, Math.min(10, Number(actor.skillLevels[skillIndex] || 10)));
    actor.cooldowns[skillIndex] = ENGINE.effectiveCooldown(skill.baseCt, level);

    if (skill.id === 'eternalSin') {
      const selfCharge = [30,32,34,36,38,40,42,44,46,50][level - 1];
      const rewardNp = [25,30,35,40,45,50,55,60,65,75][level - 1];
      const rewardAttack = [30,32,34,36,38,40,42,44,46,50][level - 1];
      this._addNp(actor, selfCharge, true);
      const donors = this.state.allies.filter((unit) => unit !== actor && unit.alive && (unit.traits || []).includes('叛逆する者') && unit.np >= 25);
      donors.forEach((unit) => {
        unit.np = Math.max(0, unit.np - 25);
        this._addNp(actor, 25, true);
        this._addStatus(unit, {
          type: TYPES.delayedRebellion, duration: 1, uses: 1, rewardNp, rewardAttack,
          statusIcon: 'DelayedBuff.webp'
        }, rewardNp, skill.name);
      });
      this._log(`${actor.name}が「${skill.name}」を使用。`, 'skill');
      return { ok: true, absorbed: donors.length };
    }

    const deathDown = [10,12,14,16,18,20,22,24,26,30][level - 1];
    const npPerTurn = [10,11,12,13,14,15,16,17,18,20][level - 1];
    this.getAliveEnemies().forEach((enemy) => {
      enemy.statuses = (enemy.statuses || []).filter((status) => status.debuff || status.passive || status.unremovable);
      this._addStatus(enemy, { type: 'deathResist', duration: 3, debuff: true }, -deathDown, skill.name);
    });
    this._addStatus(actor, { type: 'npPerTurn', duration: 3 }, npPerTurn, skill.name);
    this._addStatus(actor, { type: 'npGainUp', duration: 3 }, 30, skill.name);
    this._addStatus(actor, { type: TYPES.slaughter, duration: 3, statusIcon: 'Npchargeup.webp' }, 20, skill.name);
    this._log(`${actor.name}が「${skill.name}」を使用。`, 'skill');
    return { ok: true };
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    this.state.allies.forEach((unit) => {
      const rewards = (unit.statuses || []).filter((status) => status.type === TYPES.delayedRebellion && isActive(status));
      rewards.forEach((status) => {
        this._addNp(unit, Number(status.rewardNp || status.value || 0), true);
        this._addStatus(unit, { type: 'attackUp', duration: 4 }, Number(status.rewardAttack || 0), status.source);
        this._consumeStatus(unit, status);
      });
    });
    this.state.enemies.forEach((enemy) => {
      const hatredDamage = (enemy.statuses || []).filter((status) => status.type === TYPES.hatred && isActive(status))
        .reduce((sum, status) => sum + Number(status.value || 0), 0);
      if (hatredDamage > 0 && enemy.alive) {
        this._takeDamage(enemy, hatredDamage, '憎悪');
        this._log(`${enemy.name}に憎悪ダメージ${hatredDamage.toLocaleString('ja-JP')}。`, 'damage');
      }
    });
    return originalFinishTurn.apply(this, arguments);
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (!STATUS_NAMES[status.type]) return status;
      return { ...status, name: STATUS_NAMES[status.type], statusIcon: status.statusIcon || DATA.statusIcons[status.type] };
    });
  };

  Object.keys(STATUS_NAMES).forEach((type) => {
    DATA.statusIcons[type] = DATA.statusIcons[type] || 'Statusup.webp';
  });

  REGISTRY.register(SERVANT_ID, {
    name: '────',
    hooks: {},
    notes: 'Quick・Buster通常攻撃全体化、NP吸収後の遅延強化、憎悪、即死成功時効果、封印系無効を管理。'
  });

  const API = { servantId: SERVANT_ID, statusTypes: { ...TYPES }, resolveInstantDeath };
  global.FGO_SIM_BEAST031_MECHANICS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
