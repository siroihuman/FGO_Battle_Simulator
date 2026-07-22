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
    require('../turn-field-effects.js');
    require('../trait-trigger-aura-effects.js');
    require('../trigger-lifecycle-effects.js');
    require('../np-card-trigger-removal-effects.js');
    require('../class-affinity-special-effects.js');
    require('../order-change-position.js');
  }

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !REGISTRY) {
    throw new Error('Baphomet mechanics require data, engine and the unique registry.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__baphometMechanicsInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_SIM_BAPHOMET_MECHANICS;
    }
    return;
  }
  proto.__baphometMechanicsInstalled = true;

  const SERVANT_ID = 'baphomet';
  const WORSHIPPER_TRAIT = '怨嗟の崇拝者';
  const AFFINITY_TRAITS = ['道具作成', '陣地作成', '悪魔'];
  const CARD_BOOST_VALUES = [30, 32, 34, 36, 38, 40, 42, 44, 46, 50];
  const TYPES = {
    blessing: 'baphometBlackGoatBlessing',
    durationLock: 'baphometBuffDurationLock',
    cardBoost: 'baphometArtsCardUpBoost',
    contract: 'baphometSacrificeContract',
    extension: 'baphometSacrificeExtension',
    offeringImmune: 'baphometOfferingImmune',
    sacrificeImmune: 'baphometSacrificeImmune',
    traitNullify: 'baphometWorshipperTraitNullify'
  };
  const UNIQUE_TYPES = new Set(Object.values(TYPES));
  const STATUS_NAMES = {
    [TYPES.blessing]: '黒山羊の加護',
    [TYPES.durationLock]: '強化状態の残りターン固定',
    [TYPES.cardBoost]: 'Artsカード性能アップブースト',
    [TYPES.contract]: '加護解除時・強化献上／生贄',
    [TYPES.extension]: '生贄時・バフォメット強化延長',
    [TYPES.offeringImmune]: 'バフォメットへの献上無効',
    [TYPES.sacrificeImmune]: 'バフォメットの生贄無効',
    [TYPES.traitNullify]: '〔怨嗟の崇拝者〕特性無効'
  };

  const isAlive = (unit) => Boolean(unit && unit.alive && Number(unit.hp || 0) > 0);
  const isActive = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);
  const isBaphomet = (unit) => Boolean(unit && unit.servantId === SERVANT_ID);
  const hasActiveType = (unit, type) => Boolean(unit && (unit.statuses || []).some(
    (status) => status.type === type && isActive(status)
  ));
  const deepClone = (value) => JSON.parse(JSON.stringify(value));

  function mechanicData(statusOrEffect) {
    return statusOrEffect && statusOrEffect.uniqueMechanicData
      ? statusOrEffect.uniqueMechanicData
      : {};
  }

  function isRemovableBuff(status) {
    return Boolean(
      status && isActive(status) && !status.debuff && !status.passive &&
      !status.unremovable && !UNIQUE_TYPES.has(status.type)
    );
  }

  function isFrontlineProvider(unit) {
    return isBaphomet(unit) && isAlive(unit) && unit.frontline !== false;
  }

  function targetHasAffinityTrait(engine, target) {
    if (!target) return false;
    return AFFINITY_TRAITS.some((trait) => {
      if (typeof engine._unitHasTrait === 'function' && engine._unitHasTrait(target, trait)) return true;
      if ((target.traits || []).includes(trait)) return true;
      if ((target.statuses || []).some((status) => isActive(status) && String(status.source || '').startsWith(trait))) return true;
      return Boolean(target.data && (target.data.passives || []).some((passive) =>
        String(passive.name || '').startsWith(trait)
      ));
    });
  }

  function firstSacrificeTarget(engine, provider) {
    return engine.state.allies
      .filter((unit) => unit !== provider && isAlive(unit) && unit.frontline !== false)
      .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0))
      .find((unit) =>
        !hasActiveType(unit, TYPES.sacrificeImmune) &&
        !hasActiveType(unit, TYPES.blessing)
      ) || null;
  }

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    if (effect && effect.uniqueKey) {
      const existing = (unit.statuses || []).find((status) =>
        status.uniqueKey === effect.uniqueKey && isActive(status)
      );
      if (existing) return existing;
    }

    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (!status || !effect) return status;
    ['unremovable', 'uniqueKey', 'label', 'passive'].forEach((key) => {
      if (effect[key] !== undefined) status[key] = effect[key];
    });
    if (effect.uniqueMechanicData !== undefined) {
      status.uniqueMechanicData = deepClone(effect.uniqueMechanicData);
    }
    return status;
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || !['buffClear', 'debuffClear'].includes(effect.type)) {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const targets = this._effectTargets(effect, source, selectedTargetId);
    const protectedStatuses = new Map(targets.map((target) => [
      target,
      (target.statuses || []).filter((status) =>
        status.unremovable && (effect.type === 'buffClear' ? !status.debuff : status.debuff)
      )
    ]));
    const result = originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    protectedStatuses.forEach((statuses, target) => {
      statuses.forEach((status) => {
        if (!(target.statuses || []).includes(status)) target.statuses.push(status);
      });
    });
    return result;
  };

  const originalUnitHasTrait = proto._unitHasTrait;
  proto._unitHasTrait = function (unit, trait) {
    if (isBaphomet(unit) && String(trait || '').trim() === WORSHIPPER_TRAIT) return false;
    return originalUnitHasTrait.call(this, unit, trait);
  };

  const originalStatusTotal = proto._statusTotal;
  proto._statusTotal = function (unit, type, filter) {
    const base = originalStatusTotal.call(this, unit, type, filter);
    if (type !== 'cardUp' || !filter || filter.card !== 'arts' || !unit) return base;
    const boosts = (unit.statuses || [])
      .filter((status) => status.type === TYPES.cardBoost && isActive(status))
      .map((status) => Number(status.value || 0));
    if (!boosts.length) return base;
    return base * (1 + Math.max(...boosts) / 100);
  };

  const originalCalculateAttackTotal = proto._calculateAttackTotal;
  proto._calculateAttackTotal = function (actor, target, action, chainContext) {
    if (!isBaphomet(actor) || !targetHasAffinityTrait(this, target)) {
      return originalCalculateAttackTotal.call(this, actor, target, action, chainContext);
    }

    // ビースト固有の攻撃有利をA枠のクラス相性2倍として適用する。
    // セイバー対ランサーへ一時置換することで固定与ダメージ等を倍化せず、
    // 既存のクラス相性計算順をそのまま利用する。
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

  function installPassiveExtensions(engine) {
    const providers = engine.state.allies.filter(isBaphomet);
    providers.forEach((provider) => {
      engine.state.allies.filter((unit) => unit !== provider).forEach((unit) => {
        engine._addStatus(unit, {
          type: TYPES.extension,
          value: 3,
          duration: -1,
          passive: true,
          unremovable: true,
          uniqueKey: `${TYPES.extension}:${provider.id}`,
          label: STATUS_NAMES[TYPES.extension],
          statusIcon: 'class-unique-008.png',
          uniqueMechanicData: { providerUnitId: provider.id }
        }, 3, '異端審問（贄） EX');
      });
    });
  }

  const originalInitialize = proto._initialize;
  proto._initialize = function () {
    const result = originalInitialize.apply(this, arguments);
    installPassiveExtensions(this);
    return result;
  };

  function applyBlackGoatBlessing(engine, provider, target, level) {
    const duration = 3;
    const providerData = { providerUnitId: provider.id };
    engine._addStatus(target, {
      type: 'temporaryTrait',
      trait: WORSHIPPER_TRAIT,
      duration,
      unremovable: true,
      uniqueKey: `${TYPES.blessing}:trait`,
      statusIcon: 'Statusup.webp',
      uniqueMechanicData: providerData
    }, 0, provider.name);
    engine._addStatus(target, {
      type: TYPES.blessing,
      duration,
      unremovable: true,
      uniqueKey: TYPES.blessing,
      label: STATUS_NAMES[TYPES.blessing],
      statusIcon: 'Statusup.webp',
      uniqueMechanicData: providerData
    }, 0, provider.name);
    engine._addStatus(target, {
      type: TYPES.durationLock,
      duration,
      unremovable: true,
      uniqueKey: TYPES.durationLock,
      label: STATUS_NAMES[TYPES.durationLock],
      statusIcon: 'Statusup.webp',
      uniqueMechanicData: providerData
    }, 0, provider.name);
    engine._addStatus(target, {
      type: TYPES.cardBoost,
      card: 'arts',
      duration,
      unremovable: true,
      uniqueKey: TYPES.cardBoost,
      label: STATUS_NAMES[TYPES.cardBoost],
      statusIcon: 'Artsup.webp',
      uniqueMechanicData: providerData
    }, CARD_BOOST_VALUES[Math.max(1, Math.min(10, Number(level || 10))) - 1], provider.name);
    engine._addStatus(target, {
      type: TYPES.contract,
      duration,
      uses: 1,
      unremovable: true,
      uniqueKey: TYPES.contract,
      label: STATUS_NAMES[TYPES.contract],
      statusIcon: 'DelayedDebuff.webp',
      uniqueMechanicData: providerData
    }, 0, provider.name);
    engine._log(`${target.name}は${provider.name}の〔黒山羊の加護〕を受け、3ターン後の生贄に指定された。`, 'skill');
  }

  function prepareBaphometExtensions(engine, count) {
    if (count <= 0) return;
    if (!engine._baphometPendingExtensions) engine._baphometPendingExtensions = new Map();
    engine.state.allies.filter((unit) => isBaphomet(unit) && isAlive(unit)).forEach((unit) => {
      (unit.statuses || []).forEach((status) => {
        if (!isActive(status) || status.debuff || status.passive || status.remaining == null || status.remaining < 0) return;
        const existing = engine._baphometPendingExtensions.get(status);
        if (existing) {
          existing.desired += 3 * count;
          return;
        }
        engine._baphometPendingExtensions.set(status, {
          unit,
          status,
          desired: Number(status.remaining || 0) + 3 * count
        });
        // この後の通常ターン減少で消失しないよう、一時的に1T加算する。
        status.remaining += 1;
      });
    });
  }

  function transferBuffs(engine, target, provider) {
    const transferable = (target.statuses || []).filter(isRemovableBuff);
    if (!transferable.length) return [];
    target.statuses = target.statuses.filter((status) => !transferable.includes(status));

    if (!isFrontlineProvider(provider)) {
      engine._log(`フィールド上に対象のバフォメットがいないため、${target.name}の強化献上は無効。`, 'condition');
      return [];
    }

    const transferred = transferable.map((status) => {
      const cloned = deepClone(status);
      cloned.source = `${status.source || target.name}（${target.name}から献上）`;
      provider.statuses.push(cloned);
      return cloned;
    });
    engine._log(`${target.name}の解除可能な強化状態${transferred.length}個を${provider.name}へ献上。`, 'skill');
    return transferred;
  }

  function sacrificeTarget(engine, target, contract) {
    if (!target || !isAlive(target) || !contract) return;
    const providerId = mechanicData(contract).providerUnitId;
    const provider = engine.getUnit(providerId);

    transferBuffs(engine, target, provider);

    const extensionCount = (target.statuses || []).filter((status) =>
      status.type === TYPES.extension && isActive(status)
    ).length;
    prepareBaphometExtensions(engine, extensionCount);

    target.statuses = (target.statuses || []).filter((status) => {
      if (status.type === 'temporaryTrait' && status.trait === WORSHIPPER_TRAIT &&
          mechanicData(status).providerUnitId === providerId) return false;
      return ![TYPES.blessing, TYPES.durationLock, TYPES.cardBoost, TYPES.contract].includes(status.type) ||
        mechanicData(status).providerUnitId !== providerId;
    });

    if (hasActiveType(target, TYPES.sacrificeImmune)) {
      engine._log(`${target.name}は〔バフォメットの生贄に捧げる〕を無効化した。`, 'resist');
      return;
    }

    target.hp = 0;
    const guts = (target.statuses || []).find((status) =>
      status.type === 'guts' && isActive(status)
    );
    if (guts) {
      target.hp = Math.max(1, Number(guts.value || 1));
      engine._consumeStatus(target, guts);
      engine._log(`${target.name}は生贄となったが、ガッツでHP${target.hp}に復帰。`, 'heal');
      return;
    }

    target.alive = false;
    engine._log(`${target.name}は${provider ? provider.name : 'バフォメット'}の生贄となり戦闘不能。`, 'death');
  }

  function processTurnEnd(engine) {
    const expiring = [];
    engine.state.allies.forEach((unit) => {
      if (!isAlive(unit)) return;
      (unit.statuses || []).forEach((status) => {
        if (status.type !== TYPES.contract || !isActive(status) || Number(status.remaining || 0) > 1) return;
        expiring.push({ unit, status });
      });
    });
    expiring.forEach(({ unit, status }) => sacrificeTarget(engine, unit, status));

    // 加護が継続する対象は、解除可能な強化だけ1T加算して通常のターン減少を相殺する。
    engine.state.allies.forEach((unit) => {
      if (!isAlive(unit) || !hasActiveType(unit, TYPES.durationLock)) return;
      const blessing = (unit.statuses || []).find((status) => status.type === TYPES.blessing && isActive(status));
      if (!blessing || Number(blessing.remaining || 0) <= 1) return;
      (unit.statuses || []).filter(isRemovableBuff).forEach((status) => {
        if (status.remaining != null && status.remaining > 0) status.remaining += 1;
      });
    });
  }

  const originalRunEffectHooks = proto._runEffectHooks;
  proto._runEffectHooks = function (eventName, context) {
    const result = originalRunEffectHooks.call(this, eventName, context);
    if (eventName === 'turnEnd') processTurnEnd(this);
    return result;
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    const result = originalFinishTurn.apply(this, arguments);
    if (this._baphometPendingExtensions) {
      this._baphometPendingExtensions.forEach(({ unit, status, desired }) => {
        if ((unit.statuses || []).includes(status)) status.remaining = desired;
      });
      this._baphometPendingExtensions = null;
    }
    return result;
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId) {
    const actor = this.getUnit(allyId);
    if (isBaphomet(actor) && Number(skillIndex) === 2 && !firstSacrificeTarget(this, actor)) {
      return { ok: false, reason: '生贄に選択できる先頭の味方がいません。' };
    }
    return originalUseSkill.call(this, allyId, skillIndex, selectedTargetId);
  };

  const originalOrderChange = proto.orderChange;
  proto.orderChange = function (frontId, reserveId) {
    const front = this.getUnit(frontId);
    const reserve = this.getUnit(reserveId);
    const locked = [front, reserve].find((unit) => hasActiveType(unit, TYPES.blessing));
    if (locked) {
      return { ok: false, reason: `${locked.name}は〔黒山羊の加護〕によりオーダーチェンジできません。` };
    }
    return originalOrderChange.call(this, frontId, reserveId);
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (!STATUS_NAMES[status.type]) return status;
      return {
        ...status,
        name: STATUS_NAMES[status.type],
        statusIcon: status.statusIcon || DATA.statusIcons[status.type] || 'Statusup.webp'
      };
    });
  };

  Object.entries(STATUS_NAMES).forEach(([type]) => {
    DATA.statusIcons[type] = DATA.statusIcons[type] || 'Statusup.webp';
  });
  DATA.statusIcons[TYPES.contract] = 'DelayedDebuff.webp';
  DATA.statusIcons[TYPES.cardBoost] = 'Artsup.webp';

  REGISTRY.register(SERVANT_ID, {
    name: 'バフォメット',
    description: '黒山羊の加護、強化ターン固定、強化献上、生贄、異端審問を処理する。',
    providerScope: 'allAlive',
    hooks: {
      afterSkillUse(engine, context) {
        const provider = context && context.provider;
        const actor = context && context.actor;
        if (!provider || provider !== actor || !isBaphomet(provider) || Number(context.skillIndex) !== 2) return;
        const target = firstSacrificeTarget(engine, provider);
        if (!target) return;
        applyBlackGoatBlessing(engine, provider, target, provider.skillLevels[2]);
      }
    }
  });

  const API = {
    servantId: SERVANT_ID,
    worshipperTrait: WORSHIPPER_TRAIT,
    affinityTraits: AFFINITY_TRAITS.slice(),
    statusTypes: { ...TYPES },
    cardBoostValues: CARD_BOOST_VALUES.slice(),
    definition: REGISTRY.get(SERVANT_ID)
  };

  global.FGO_SIM_BAPHOMET_MECHANICS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
