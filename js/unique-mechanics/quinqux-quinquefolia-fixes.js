(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('../data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('../engine.js') : null);

  if (typeof require !== 'undefined') require('./quinqux-quinquefolia.js');
  if (!DATA || !ENGINE || !ENGINE.BattleEngine) {
    throw new Error('Quinqux transformation fixes require data and engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__quinquxTransformationFixesInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_QUINQUX_FIXES;
    return;
  }
  proto.__quinquxTransformationFixesInstalled = true;

  const SERVANT_ID = 'quinquxQuinquefolia';
  const TRANSFORMED = 'quinquxMaskTransformation';
  const LEGACY_SKILL_ONE_SEAL = 'quinquxSkillOneSeal';
  const CONDITIONAL_POWER = 'quinquxUnbuffedOrLoserPower';
  const MASK_NP_VALUES = [30,32,34,36,38,40,42,44,46,50];

  const isActive = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);
  const isTransformed = (unit) => Boolean(unit && (unit.statuses || []).some(
    (status) => status.type === TRANSFORMED && isActive(status)
  ));
  const levelValue = (effect, level) => Array.isArray(effect.values)
    ? Number(effect.values[Math.max(1, Math.min(10, Number(level || 10))) - 1] || 0)
    : Number(effect.value || 0);

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || effect.type !== CONDITIONAL_POWER) {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const value = levelValue(effect, context && context.level);
    const targets = this.getAliveAllies().filter((unit) =>
      (unit.traits || []).includes('クインクス・キンケフォリア') || isTransformed(unit)
    );
    targets.forEach((target) => this._addStatus(target, {
      type: CONDITIONAL_POWER,
      duration: effect.duration == null ? 3 : effect.duration,
      statusIcon: effect.statusIcon || 'Powerup.webp'
    }, value, source && source.name));
    return { applied: targets.length > 0, targets };
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId, selectedCardType) {
    const actor = this.getUnit(allyId);
    const skill = actor && actor.data && actor.data.skills && actor.data.skills[skillIndex];
    const isMask = Boolean(actor && actor.servantId === SERVANT_ID && skill && skill.id === 'maskBelongingToNoOne');
    const target = isMask
      ? this.state.allies
        .filter((unit) => unit !== actor && unit.frontline && unit.alive && unit.hp > 0)
        .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0))[0] || null
      : null;
    const cooldownsBefore = target ? target.cooldowns.slice() : null;
    const actorNpBefore = actor ? Number(actor.np || 0) : 0;
    const targetClassBefore = target ? target.classId : null;
    const level = actor ? Math.max(1, Math.min(10, Number(actor.skillLevels[skillIndex] || 10))) : 10;

    const result = originalUseSkill.call(this, allyId, skillIndex, selectedTargetId, selectedCardType);
    if (!isMask || !result || !result.ok || !target) return result;

    // 基礎実装が使用者へ加算したNPを戻し、変貌対象へ付与する。
    actor.np = actorNpBefore;
    this._addNp(target, MASK_NP_VALUES[level - 1], true);

    // 換装後も使用済みスキルのCTをそのまま保持する。
    target.cooldowns = cooldownsBefore.slice();

    // スキル本体だけでなく表示用アイコンもクインクス側へ同期する。
    target.data.skillIcons = Array.isArray(actor.data.skillIcons)
      ? actor.data.skillIcons.slice()
      : [];

    // 変貌中はクラスもクインクスと同じアルターエゴへ変更する。
    target.__quinquxOriginalClassId = targetClassBefore;
    target.classId = actor.classId;
    target.data.classId = actor.classId;

    // 旧固有状態を廃止し、システム共通の個別スキル使用不可へ移行する。
    target.statuses = (target.statuses || []).filter((status) => status.type !== LEGACY_SKILL_ONE_SEAL);
    const beforeCount = target.statuses.length;
    this._applyEffect({
      type: 'skillDisable',
      target: 'selectedAlly',
      skillNumber: 1,
      duration: 1,
      debuff: true,
      chance: 100,
      unremovable: true,
      statusIcon: 'Skillseal.webp'
    }, actor, target.id, { level: actor.skillLevels[skillIndex] });

    const applied = (target.statuses || []).slice(beforeCount).find((status) => status.type === 'skillDisable') ||
      (target.statuses || []).slice().reverse().find((status) => status.type === 'skillDisable' && Number(status.skillNumber) === 1);
    if (applied) {
      applied.skillNumber = 1;
      applied.statusIcon = 'Skillseal.webp';
      applied.unremovable = true;
    }
    return result;
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    const result = originalFinishTurn.apply(this, arguments);
    this.state.allies.forEach((unit) => {
      if (unit.__quinquxOriginalClassId == null) return;
      unit.classId = unit.__quinquxOriginalClassId;
      if (unit.data) unit.data.classId = unit.__quinquxOriginalClassId;
      delete unit.__quinquxOriginalClassId;
    });
    return result;
  };

  const API = {
    servantId: SERVANT_ID,
    transformedType: TRANSFORMED,
    skillDisableType: 'skillDisable',
    maskNpValues: MASK_NP_VALUES.slice()
  };
  global.FGO_SIM_QUINQUX_FIXES = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);