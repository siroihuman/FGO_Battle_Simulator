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
    require('../lethal-damage-evasion-effects.js');
  }
  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !REGISTRY) {
    throw new Error('Eingana mechanics require data, engine and unique registry.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__einganaMechanicsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_EINGANA;
    return;
  }
  proto.__einganaMechanicsInstalled = true;

  const SERVANT_ID = 'eingana';
  const TYPES = {
    maxHpUp: 'einganaMaxHpUp',
    highHpDefense: 'einganaHighHpDefense',
    hpTurnBranches: 'einganaHpTurnBranches',
    hpPerTurn: 'einganaHpPerTurn',
    maxHpOnAttack: 'einganaMaxHpOnAttack',
    creationThresholds: 'einganaCreationThresholds',
    afterSkillCooldown: 'einganaAfterSkillCooldown'
  };
  const STATUS_NAMES = {
    [TYPES.maxHpUp]: '最大HPアップ',
    [TYPES.highHpDefense]: 'HPが多いほど防御力アップ',
    [TYPES.hpTurnBranches]: 'HP割合に応じたターン終了時効果',
    [TYPES.hpPerTurn]: '毎ターンHP回復',
    [TYPES.maxHpOnAttack]: '攻撃時・最大HPアップ',
    [TYPES.creationThresholds]: '創造・最大HP増加量条件効果',
    [TYPES.afterSkillCooldown]: 'スキル使用後・使用スキルCT短縮'
  };
  const META_KEYS = ['highNp', 'lowHeal', 'maxHpIncrease', 'uniqueKey'];

  function isActive(status) {
    return Boolean(status) &&
      (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
      (status.uses == null || status.uses > 0);
  }

  function levelValue(effect, context, source) {
    const level = Math.max(1, Math.min(10, Number(context && context.level || 10)));
    const npLevel = Math.max(1, Math.min(5, Number(source && source.npLevel || context && context.npLevel || 1)));
    const oc = Math.max(1, Math.min(5, Number(context && context.oc || 1)));
    if (Array.isArray(effect.values)) return Number(effect.values[level - 1] || 0);
    if (Array.isArray(effect.npLevelValues)) return Number(effect.npLevelValues[npLevel - 1] || 0);
    if (Array.isArray(effect.ocValues)) return Number(effect.ocValues[oc - 1] || 0);
    return Number(effect.value || 0);
  }

  function activeStatuses(unit, type) {
    return (unit && unit.statuses || []).filter((status) => status.type === type && isActive(status));
  }

  function maxHpIncreaseTotal(unit) {
    return activeStatuses(unit, TYPES.maxHpUp)
      .reduce((sum, status) => sum + Number(status.maxHpIncrease || status.value || 0), 0);
  }

  function applyMaxHpUp(engine, unit, effect, value, sourceName) {
    const amount = Math.max(0, Math.floor(Number(value || 0)));
    if (!unit || amount <= 0) return null;
    unit.maxHp += amount;
    unit.hp += amount;
    const status = engine._addStatus(unit, {
      ...effect,
      type: TYPES.maxHpUp,
      maxHpIncrease: amount
    }, amount, sourceName);
    status.maxHpIncrease = amount;
    return status;
  }

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (status && effect) META_KEYS.forEach((key) => {
      if (effect[key] !== undefined) status[key] = effect[key];
    });
    return status;
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || !Object.values(TYPES).includes(effect.type)) {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const targets = this._effectTargets(effect, source, selectedTargetId);
    const value = levelValue(effect, context, source);

    if (effect.type === TYPES.maxHpUp) {
      const statuses = targets.map((target) => applyMaxHpUp(this, target, effect, value, source && source.name)).filter(Boolean);
      return { applied: statuses.length > 0, statuses };
    }

    const statuses = targets.map((target) => this._addStatus(target, effect, value, source && source.name));
    return { applied: statuses.length > 0, statuses };
  };

  const originalStatusTotal = proto._statusTotal;
  proto._statusTotal = function (unit, type, filter) {
    const base = originalStatusTotal.call(this, unit, type, filter);
    if (type !== 'defenseUp' || !unit || !unit.alive) return base;
    const hpRatio = unit.maxHp > 0 ? Math.max(0, Math.min(1, Number(unit.hp || 0) / Number(unit.maxHp || 1))) : 0;
    const scaling = activeStatuses(unit, TYPES.highHpDefense)
      .reduce((sum, status) => sum + Number(status.value || 0) * hpRatio, 0);
    return base + scaling;
  };

  function triggerAttackMaxHp(engine, actor) {
    if (!actor || !actor.alive) return [];
    return activeStatuses(actor, TYPES.maxHpOnAttack).map((trigger) =>
      applyMaxHpUp(engine, actor, {
        type: TYPES.maxHpUp,
        duration: 3,
        statusIcon: 'Maxhpup.webp'
      }, Number(trigger.value || 0), trigger.source || actor.name)
    ).filter(Boolean);
  }

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    const actor = action && this.getUnit(action.actorId);
    const result = originalExecuteCard.call(this, action, chainContext);
    triggerAttackMaxHp(this, actor);
    return result;
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    const actor = action && this.getUnit(action.actorId);
    const result = originalExecuteNp.call(this, action, chainContext, precedingNps);
    triggerAttackMaxHp(this, actor);
    return result;
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId, selectedCardType) {
    const actor = this.getUnit(allyId);
    const result = originalUseSkill.call(this, allyId, skillIndex, selectedTargetId, selectedCardType);
    if (!result || !result.ok || !actor) return result;
    const trigger = activeStatuses(actor, TYPES.afterSkillCooldown)[0];
    if (trigger && Number(actor.cooldowns[skillIndex] || 0) > 0) {
      actor.cooldowns[skillIndex] = Math.max(0, Number(actor.cooldowns[skillIndex] || 0) - 1);
      this._log(`${actor.name}のスキル使用後効果により、使用したスキルのチャージを1進めた。`, 'skill');
    }
    return result;
  };

  function applyTurnEndEffects(engine, unit) {
    if (!unit || !unit.alive) return;

    const regen = activeStatuses(unit, TYPES.hpPerTurn)
      .reduce((sum, status) => sum + Number(status.value || 0), 0);
    if (regen > 0) {
      const before = unit.hp;
      unit.hp = Math.min(unit.maxHp, unit.hp + regen);
      engine._log(`${unit.name}のHPが毎ターン効果で${unit.hp - before}回復。`, 'heal');
    }

    const hpRatio = unit.maxHp > 0 ? Number(unit.hp || 0) / Number(unit.maxHp || 1) : 0;
    activeStatuses(unit, TYPES.hpTurnBranches).forEach((status) => {
      if (hpRatio >= 0.75) {
        engine._addNp(unit, Number(status.highNp || 20), true);
        engine._log(`${unit.name}はHP75%以上のためNPが${Number(status.highNp || 20)}%増加。`, 'np');
      } else {
        const heal = Math.max(0, Number(status.lowHeal || 5000));
        const before = unit.hp;
        unit.hp = Math.min(unit.maxHp, unit.hp + heal);
        engine._log(`${unit.name}はHP74%以下のためHPが${unit.hp - before}回復。`, 'heal');
      }
    });

    const increase = maxHpIncreaseTotal(unit);
    activeStatuses(unit, TYPES.creationThresholds).forEach((status) => {
      if (increase >= 30000) {
        const existing = activeStatuses(unit, 'deathEvasion')[0];
        if (!existing) {
          engine._addStatus(unit, {
            type: 'deathEvasion',
            duration: 1,
            uses: 1,
            statusIcon: 'DeathEvasion.webp'
          }, 1, status.source || '創造 EX');
          engine._log(`${unit.name}は最大HP増加量30000以上により致死ダメージ回避を獲得。`, 'buff');
        }
      }
      if (increase >= 60000) {
        engine._addNp(unit, 20, true);
        engine._log(`${unit.name}は最大HP増加量60000以上によりNPが20%増加。`, 'np');
      }
      if (increase >= 90000) {
        engine._addStatus(unit, {
          type: 'npPowerUp',
          duration: 1,
          statusIcon: 'Nppowerup.webp'
        }, 100, status.source || '創造 EX');
        engine._log(`${unit.name}は最大HP増加量90000以上により宝具威力が超絶アップ。`, 'buff');
      }
    });
  }

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    this.state.allies.forEach((unit) => applyTurnEndEffects(this, unit));

    const expiring = this.state.allies.flatMap((unit) =>
      activeStatuses(unit, TYPES.maxHpUp)
        .filter((status) => Number(status.remaining) === 1)
        .map((status) => ({ unit, amount: Number(status.maxHpIncrease || status.value || 0) }))
    );

    const result = originalFinishTurn.apply(this, arguments);
    expiring.forEach(({ unit, amount }) => {
      unit.maxHp = Math.max(1, Number(unit.maxHp || 1) - Math.max(0, amount));
      unit.hp = Math.min(unit.hp, unit.maxHp);
    });
    return result;
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

  DATA.statusIcons[TYPES.maxHpUp] = 'Maxhpup.webp';
  DATA.statusIcons[TYPES.highHpDefense] = 'Defenseup.webp';
  DATA.statusIcons[TYPES.hpTurnBranches] = 'DelayedBuff.webp';
  DATA.statusIcons[TYPES.hpPerTurn] = 'Hpregen.webp';
  DATA.statusIcons[TYPES.maxHpOnAttack] = 'Buffatk.webp';
  DATA.statusIcons[TYPES.creationThresholds] = 'DelayedBuff.webp';
  DATA.statusIcons[TYPES.afterSkillCooldown] = 'Skillcooldown.webp';

  REGISTRY.register(SERVANT_ID, {
    name: 'エインガナ',
    hooks: {},
    notes: '最大HP増加、HP割合防御、攻撃時最大HP増加、最大HP増加量によるターン終了時効果を管理。致死ダメージ回避自体は共通処理を使用。'
  });

  const API = {
    servantId: SERVANT_ID,
    statusTypes: { ...TYPES },
    maxHpIncreaseTotal,
    applyMaxHpUp
  };

  global.FGO_SIM_EINGANA = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
