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
    require('../turn-field-effects.js');
    require('../command-use-locks.js');
  }
  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !REGISTRY) {
    throw new Error('Konohanasakuya-hime mechanics require data, engine and unique registry.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__konohanasakuyaHimeMechanicsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_KONOHANASAKUYA_HIME;
    return;
  }
  proto.__konohanasakuyaHimeMechanicsInstalled = true;

  const SERVANT_ID = 'konohanasakuyaHime';
  const TYPES = {
    sunlightField: 'konohanaSunlightField',
    cherryBlossom: 'konohanaCherryBlossom',
    afterSkillCooldown: 'konohanaAfterSkillCooldown',
    hpPerTurn: 'konohanaHpPerTurn',
    bind: 'konohanaBind',
    commandCardSeal: 'konohanaCommandCardSeal'
  };
  const STATUS_NAMES = {
    [TYPES.sunlightField]: 'フィールド〔陽射し〕化',
    [TYPES.cherryBlossom]: '桜花爛漫',
    [TYPES.afterSkillCooldown]: 'スキル使用後・使用スキルCT短縮',
    [TYPES.hpPerTurn]: '毎ターンHP回復',
    [TYPES.bind]: '拘束',
    [TYPES.commandCardSeal]: 'コマンドカード選出不能'
  };

  const isActive = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);
  const valueAt = (effect, source, context) => {
    const level = Math.max(1, Math.min(10, Number(context && context.level || 10)));
    const npLevel = Math.max(1, Math.min(5, Number(source && source.npLevel || context && context.npLevel || 1)));
    if (Array.isArray(effect.values)) return Number(effect.values[level - 1] || 0);
    if (Array.isArray(effect.npLevelValues)) return Number(effect.npLevelValues[npLevel - 1] || 0);
    return Number(effect.value || 0);
  };

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (status && effect) {
      ['unremovable', 'uniqueKey', 'fieldTraitsBefore'].forEach((key) => {
        if (effect[key] !== undefined) status[key] = effect[key];
      });
    }
    return status;
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || !Object.values(TYPES).includes(effect.type)) {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const targets = this._effectTargets(effect, source, selectedTargetId);
    const value = valueAt(effect, source, context);

    if (effect.type === TYPES.sunlightField) {
      const previous = typeof this.getFieldTraits === 'function' ? this.getFieldTraits() : (this.state.fieldTraits || []).slice();
      const next = Array.from(new Set(previous.concat('陽射し')));
      if (typeof this.setFieldTraits === 'function') this.setFieldTraits(next);
      else this.state.fieldTraits = next;
      const statuses = targets.map((target) => this._addStatus(target, {
        ...effect,
        fieldTraitsBefore: previous,
        uniqueKey: `${TYPES.sunlightField}:${target.id}`
      }, 1, source && source.name));
      return { applied: statuses.length > 0, statuses };
    }

    if (effect.type === TYPES.cherryBlossom) {
      const sunlight = typeof this.hasFieldTrait === 'function'
        ? this.hasFieldTrait('陽射し')
        : (this.state.fieldTraits || []).includes('陽射し');
      const selfStatuses = targets.map((target) => this._addStatus(target, effect, 1, source && source.name));
      if (!sunlight) return { applied: selfStatuses.length > 0, statuses: selfStatuses, conditional: false };

      const allies = this.state.allies.filter((unit) => unit !== source && unit.alive && Number(unit.hp || 0) > 0);
      allies.forEach((ally) => {
        this._addStatus(ally, {
          type: TYPES.afterSkillCooldown,
          duration: effect.duration == null ? 5 : effect.duration,
          statusIcon: 'Dragontrait.webp'
        }, 1, source && source.name);
        this._addStatus(ally, {
          type: 'npPerTurn',
          duration: effect.duration == null ? 5 : effect.duration
        }, value, source && source.name);
      });
      return { applied: true, statuses: selfStatuses, allies };
    }

    if (effect.type === TYPES.bind) {
      const statuses = targets.map((target) => this._addStatus(target, {
        type: 'stun',
        duration: effect.duration == null ? 3 : effect.duration,
        debuff: true,
        unremovable: true,
        statusIcon: 'Stunstatus.webp',
        label: STATUS_NAMES[TYPES.bind]
      }, 1, source && source.name));
      return { applied: statuses.length > 0, statuses };
    }

    if (effect.type === TYPES.commandCardSeal) {
      const frontline = this.getAliveAllies().filter((unit) => unit.frontline !== false);
      if (frontline.length <= 1) return { applied: false, reason: 'singleFrontline' };
      const statuses = targets.map((target) => this._addStatus(target, effect, 1, source && source.name));
      return { applied: statuses.length > 0, statuses };
    }

    const statuses = targets.map((target) => this._addStatus(target, effect, value, source && source.name));
    return { applied: statuses.length > 0, statuses };
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId, selectedCardType) {
    const actor = this.getUnit(allyId);
    const result = originalUseSkill.call(this, allyId, skillIndex, selectedTargetId, selectedCardType);
    if (!result || !result.ok || !actor) return result;
    const trigger = (actor.statuses || []).find((status) => status.type === TYPES.afterSkillCooldown && isActive(status));
    if (trigger && actor.cooldowns[skillIndex] > 0) {
      actor.cooldowns[skillIndex] = Math.max(0, actor.cooldowns[skillIndex] - 1);
      this._log(`${actor.name}の〔桜花爛漫〕効果により、使用したスキルのチャージを1進めた。`, 'skill');
    }
    return result;
  };

  const originalToggleCard = proto.toggleCard;
  proto.toggleCard = function (cardId) {
    const card = this.state.hand.find((entry) => entry.id === cardId);
    const actor = card && this.getUnit(card.actorId);
    if (actor && (actor.statuses || []).some((status) => status.type === TYPES.commandCardSeal && isActive(status))) {
      return false;
    }
    return originalToggleCard.call(this, cardId);
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    this.state.allies.forEach((unit) => {
      const heal = (unit.statuses || [])
        .filter((status) => status.type === TYPES.hpPerTurn && isActive(status))
        .reduce((sum, status) => sum + Number(status.value || 0), 0);
      if (heal > 0 && unit.alive) {
        const before = unit.hp;
        unit.hp = Math.min(unit.maxHp, unit.hp + heal);
        this._log(`${unit.name}のHPが毎ターン効果で${unit.hp - before}回復。`, 'heal');
      }
    });

    const expiringFields = this.state.allies.flatMap((unit) =>
      (unit.statuses || []).filter((status) => status.type === TYPES.sunlightField && isActive(status) && Number(status.remaining) === 1)
    );
    const result = originalFinishTurn.apply(this, arguments);
    if (expiringFields.length) {
      const previous = expiringFields[expiringFields.length - 1].fieldTraitsBefore || [];
      if (typeof this.setFieldTraits === 'function') this.setFieldTraits(previous);
      else this.state.fieldTraits = previous.slice();
    }
    return result;
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      const type = status.type === 'stun' && status.label === STATUS_NAMES[TYPES.bind] ? TYPES.bind : status.type;
      if (!STATUS_NAMES[type]) return status;
      return { ...status, name: STATUS_NAMES[type], statusIcon: status.statusIcon || DATA.statusIcons[type] };
    });
  };

  DATA.statusIcons[TYPES.sunlightField] = 'Dragontrait.webp';
  DATA.statusIcons[TYPES.cherryBlossom] = 'Dragontrait.webp';
  DATA.statusIcons[TYPES.afterSkillCooldown] = 'Dragontrait.webp';
  DATA.statusIcons[TYPES.hpPerTurn] = 'Hpregen.webp';
  DATA.statusIcons[TYPES.bind] = 'Stunstatus.webp';
  DATA.statusIcons[TYPES.commandCardSeal] = 'Commandcardsseal.webp';
  DATA.statusIcons.buffRemovalResist = 'Removalresistup.webp';

  REGISTRY.register(SERVANT_ID, {
    name: '木花之佐久夜毘売',
    hooks: {},
    notes: '陽射しフィールド、桜花爛漫、使用スキルCT短縮、拘束、コマンドカード選出不能を管理。'
  });

  const API = { servantId: SERVANT_ID, statusTypes: { ...TYPES } };
  global.FGO_SIM_KONOHANASAKUYA_HIME = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
