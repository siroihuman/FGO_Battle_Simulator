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
    require('../np-card-trigger-removal-effects.js');
    require('../defense-buff-removal-effects.js');
  }
  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !REGISTRY) {
    throw new Error('Quinqux Quinquefolia mechanics require data, engine and unique registry.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__quinquxQuinquefoliaMechanicsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_QUINQUX_QUINQUEFOLIA;
    return;
  }
  proto.__quinquxQuinquefoliaMechanicsInstalled = true;

  const SERVANT_ID = 'quinquxQuinquefolia';
  const TYPES = {
    losersCost: 'quinquxLosersCost',
    conditionalPower: 'quinquxUnbuffedOrLoserPower',
    winnerGlory: 'quinquxWinnerGlory',
    audienceApplause: 'quinquxAudienceApplause',
    transformed: 'quinquxMaskTransformation',
    skillOneSeal: 'quinquxSkillOneSeal'
  };
  const STATUS_NAMES = {
    [TYPES.losersCost]: '敗者の代償',
    [TYPES.conditionalPower]: '未強化状態または敗者の代償特攻',
    [TYPES.winnerGlory]: '勝者の栄光',
    [TYPES.audienceApplause]: '観客の喝采',
    [TYPES.transformed]: '誰のものでもない仮面',
    [TYPES.skillOneSeal]: 'スキル1使用不可'
  };

  const isActive = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);
  const isQuinqux = (unit) => Boolean(unit && unit.servantId === SERVANT_ID);
  const hasLosersCost = (unit) => Boolean(unit && (unit.statuses || []).some((status) => status.type === TYPES.losersCost && isActive(status)));
  const isRemovableBuff = (status) => Boolean(status && isActive(status) && !status.debuff && !status.passive && !status.unremovable);
  const isUnbuffed = (unit) => !((unit && unit.statuses) || []).some(isRemovableBuff);
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const levelValue = (values, level) => Number(values[Math.max(1, Math.min(10, Number(level || 10))) - 1] || 0);

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (effect && effect.unremovable != null) status.unremovable = Boolean(effect.unremovable);
    return status;
  };

  const originalStatusTotal = proto._statusTotal;
  proto._statusTotal = function (unit, type, filter) {
    const base = originalStatusTotal.call(this, unit, type, filter);
    if (type !== 'defenseUp' || !unit) return base;
    const loserDefenseDown = (unit.statuses || [])
      .filter((status) => status.type === TYPES.losersCost && isActive(status))
      .reduce((sum, status) => sum + Number(status.value || 0), 0);
    return base - loserDefenseDown;
  };

  const originalTryApplyDebuff = proto._tryApplyDebuff;
  proto._tryApplyDebuff = function (source, target, effect, sourceLabel) {
    const type = effect && (effect.debuffType || effect.type);
    if (target && type === 'skillSeal' && (target.statuses || []).some((status) => status.type === 'skillSealImmune' && isActive(status))) {
      this._log(`${target.name}はスキル封印無効によりスキル封印を無効化。`, 'resist');
      return { success: false, immune: true };
    }
    if (target && ['charm', 'fear', 'confusion', 'sleep'].includes(type) &&
      (target.statuses || []).some((status) => status.type === 'mentalDebuffImmune' && isActive(status))) {
      this._log(`${target.name}は精神異常無効により${type}を無効化。`, 'resist');
      return { success: false, immune: true };
    }
    return originalTryApplyDebuff.call(this, source, target, effect, sourceLabel);
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect) return originalApplyEffect.call(this, effect, source, selectedTargetId, context);

    if (effect.type === TYPES.conditionalPower) {
      const level = context && context.level ? context.level : 10;
      const value = Array.isArray(effect.values) ? levelValue(effect.values, level) : Number(effect.value || 0);
      const targets = this.getAliveAllies().filter((unit) => (unit.traits || []).includes('クインクス・キンケフォリア'));
      targets.forEach((target) => this._addStatus(target, {
        type: TYPES.conditionalPower,
        duration: effect.duration == null ? 3 : effect.duration,
        statusIcon: effect.statusIcon || 'Powerup.webp'
      }, value, source.name));
      return { applied: targets.length > 0, targets };
    }

    if (effect.type === 'quinquxLoserAttackDown') {
      const targets = this.getAliveEnemies().filter(hasLosersCost);
      targets.forEach((target) => this._addStatus(target, {
        type: 'attackDown',
        duration: effect.duration == null ? 3 : effect.duration,
        debuff: true,
        statusIcon: effect.statusIcon || 'Attackdown.webp'
      }, Number(effect.value || 0), source.name));
      return { applied: targets.length > 0, targets };
    }

    return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
  };

  const originalNpSpecialMultiplier = proto._npSpecialMultiplier;
  proto._npSpecialMultiplier = function (np, target) {
    if (!np || !np.special || np.special.kind !== TYPES.losersCost) {
      return originalNpSpecialMultiplier.call(this, np, target);
    }
    if (!hasLosersCost(target)) return 1;
    const oc = Math.max(1, Math.min(5, Number(this._currentNpOc || 1)));
    return Number((np.special.ocMultipliers || [])[oc - 1] || 1);
  };

  const originalCalculateAttackTotal = proto._calculateAttackTotal;
  proto._calculateAttackTotal = function (actor, target, action, chainContext) {
    const temporary = [];
    const addTemporary = (type, value, source) => {
      const status = { type, value: Number(value || 0), remaining: 1, uses: null, debuff: false, passive: false, source };
      actor.statuses.push(status);
      temporary.push(status);
    };

    if (action && action.critical && hasLosersCost(target)) {
      const glory = (actor.statuses || [])
        .filter((status) => status.type === TYPES.winnerGlory && isActive(status))
        .reduce((sum, status) => sum + Number(status.value || 0), 0);
      if (glory) addTemporary('critUp', glory, STATUS_NAMES[TYPES.winnerGlory]);
    }

    if (hasLosersCost(target)) {
      const applause = this.state.allies
        .filter((provider) => provider !== actor && provider.frontline && provider.alive && isQuinqux(provider))
        .flatMap((provider) => (provider.statuses || []).filter((status) => status.type === TYPES.audienceApplause && isActive(status)))
        .reduce((sum, status) => sum + Number(status.value || 0), 0);
      if (applause) addTemporary('attackUp', applause, STATUS_NAMES[TYPES.audienceApplause]);
    }

    const conditional = (actor.statuses || [])
      .filter((status) => status.type === TYPES.conditionalPower && isActive(status))
      .reduce((sum, status) => sum + Number(status.value || 0), 0);
    if (conditional && (hasLosersCost(target) || isUnbuffed(target))) {
      addTemporary('traitPowerUp', conditional, STATUS_NAMES[TYPES.conditionalPower]);
    }

    try {
      return originalCalculateAttackTotal.call(this, actor, target, action, chainContext);
    } finally {
      if (temporary.length) actor.statuses = actor.statuses.filter((status) => !temporary.includes(status));
    }
  };

  function firstOtherFrontline(engine, actor) {
    return engine.state.allies
      .filter((unit) => unit !== actor && unit.frontline && unit.alive && unit.hp > 0)
      .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0))[0] || null;
  }

  function transformTarget(engine, actor, target) {
    if (!target.__quinquxOriginal) {
      target.__quinquxOriginal = {
        name: target.name,
        data: target.data,
        skillLevels: target.skillLevels.slice(),
        cooldowns: target.cooldowns.slice()
      };
    }
    const copiedData = deepClone(target.data);
    copiedData.skills = deepClone(actor.data.skills);
    copiedData.np = deepClone(actor.data.np);
    target.data = copiedData;
    target.name = actor.name;
    target.skillLevels = actor.skillLevels.slice();
    target.cooldowns = actor.data.skills.map(() => 0);
    target.statuses.push({
      type: TYPES.transformed,
      value: 1,
      source: '誰のものでもない仮面 A+',
      remaining: 1,
      uses: null,
      debuff: false,
      passive: false,
      unremovable: true,
      statusIcon: 'Buffatk.webp'
    });
    target.statuses.push({
      type: TYPES.skillOneSeal,
      value: 1,
      source: '誰のものでもない仮面 A+',
      remaining: 1,
      uses: null,
      debuff: true,
      passive: false,
      unremovable: true,
      statusIcon: 'Skillseal.webp'
    });
  }

  function restoreTarget(target) {
    const original = target && target.__quinquxOriginal;
    if (!original) return false;
    target.name = original.name;
    target.data = original.data;
    target.skillLevels = original.skillLevels;
    target.cooldowns = original.cooldowns;
    delete target.__quinquxOriginal;
    target.statuses = (target.statuses || []).filter((status) => ![TYPES.transformed, TYPES.skillOneSeal].includes(status.type));
    return true;
  }

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId, selectedCardType) {
    const actor = this.getUnit(allyId);
    if (actor && skillIndex === 0 && (actor.statuses || []).some((status) => status.type === TYPES.skillOneSeal && isActive(status))) {
      return { ok: false, reason: 'スキル1は使用できません。' };
    }

    const skill = actor && actor.data && actor.data.skills && actor.data.skills[skillIndex];
    if (!isQuinqux(actor) || !skill) {
      return originalUseSkill.call(this, allyId, skillIndex, selectedTargetId, selectedCardType);
    }

    if (skill.id === 'maskBelongingToNoOne') {
      if (this.state.phase !== 'command' || this.state.winner) return { ok: false, reason: '現在はスキルを使用できません。' };
      if (actor.cooldowns[skillIndex] > 0) return { ok: false, reason: `CTが${actor.cooldowns[skillIndex]}残っています。` };
      const target = firstOtherFrontline(this, actor);
      if (!target) return { ok: false, reason: '変貌させる前衛の味方がいません。' };
      const level = Number(actor.skillLevels[skillIndex] || 10);
      actor.cooldowns[skillIndex] = ENGINE.effectiveCooldown(skill.baseCt, level);
      transformTarget(this, actor, target);
      this._addNp(actor, levelValue([30,32,34,36,38,40,42,44,46,50], level), true);
      this._log(`${actor.name}が「${skill.name}」を使用し、${target.id}を自身の姿へ変貌させた。`, 'skill');
      return { ok: true, targetId: target.id };
    }

    const result = originalUseSkill.call(this, allyId, skillIndex, selectedTargetId, selectedCardType);
    if (!result || !result.ok) return result;

    if (skill.id === 'festivalRotation') {
      this.getAliveAllies().filter((unit) => unit !== actor).forEach((target) => {
        this._applyEffect({ type: 'defenseBuffClear', target: 'selectedAlly' }, actor, target.id, { level: actor.skillLevels[skillIndex] });
      });
    }
    return result;
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    const result = originalFinishTurn.apply(this, arguments);
    this.state.allies.forEach((unit) => restoreTarget(unit));
    return result;
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (!STATUS_NAMES[status.type]) return status;
      return { ...status, name: STATUS_NAMES[status.type] };
    });
  };

  REGISTRY.register(SERVANT_ID, {
    name: 'クインクス・キンケフォリア',
    hooks: {},
    notes: '先頭味方の姿・スキル・宝具換装、敗者の代償、条件特攻、勝者の栄光・観客の喝采を管理。'
  });

  const API = {
    servantId: SERVANT_ID,
    statusTypes: { ...TYPES },
    hasLosersCost,
    isUnbuffed,
    restoreTarget
  };
  global.FGO_SIM_QUINQUX_QUINQUEFOLIA = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
