(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || typeof ENGINE.classAffinity !== 'function') {
    throw new Error('class affinity rules require data and engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__completeClassAffinityRulesInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_CLASS_AFFINITY_RULES;
    }
    return;
  }
  proto.__completeClassAffinityRulesInstalled = true;

  Object.assign(DATA.classNames, {
    beastDraco: 'ビースト（ドラコー）',
    beastSpaceEreshkigal: 'ビースト（スペース・エレシュキガル）',
    beastUOlgaMarie: 'ビースト（U-オルガマリー）'
  });

  const OFFICIAL_CLASS_ORDER = [
    'saber', 'archer', 'lancer', 'rider', 'caster', 'assassin', 'berserker',
    'ruler', 'avenger', 'moonCancer', 'alterEgo', 'foreigner', 'pretender',
    'beastDraco', 'beastSpaceEreshkigal', 'beastUOlgaMarie'
  ];

  function affinityRow(values) {
    return Object.fromEntries(OFFICIAL_CLASS_ORDER.map((classId, index) => [classId, Number(values[index] || 1)]));
  }

  const OFFICIAL_AFFINITY = {
    saber: affinityRow([1, 0.5, 2, 1, 1, 1, 2, 0.5, 1, 1, 1, 1, 1, 0.5, 1, 0.5]),
    archer: affinityRow([2, 1, 0.5, 1, 1, 1, 2, 0.5, 1, 1, 1, 1, 1, 0.5, 1, 0.5]),
    lancer: affinityRow([0.5, 2, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 1, 1, 0.5, 1, 0.5]),
    rider: affinityRow([1, 1, 1, 1, 2, 0.5, 2, 0.5, 1, 1, 1, 1, 1, 0.5, 1, 0.5]),
    caster: affinityRow([1, 1, 1, 0.5, 1, 2, 2, 0.5, 1, 1, 1, 1, 1, 0.5, 1, 0.5]),
    assassin: affinityRow([1, 1, 1, 2, 0.5, 1, 2, 0.5, 1, 1, 1, 1, 1, 0.5, 1, 0.5]),
    berserker: affinityRow([1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 0.5, 1.5, 0.5, 1, 1.5]),
    ruler: affinityRow([1, 1, 1, 1, 1, 1, 2, 1, 0.5, 2, 1, 1, 1, 2, 0.5, 1]),
    avenger: affinityRow([1, 1, 1, 1, 1, 1, 2, 2, 1, 0.5, 1, 1, 1, 2, 2, 2]),
    moonCancer: affinityRow([1, 1, 1, 1, 1, 1, 2, 0.5, 2, 1, 1, 1, 1, 2, 0.5, 0.5]),
    alterEgo: affinityRow([0.5, 0.5, 0.5, 1.5, 1.5, 1.5, 2, 1, 1, 1, 1, 2, 0.5, 2, 0.5, 1]),
    foreigner: affinityRow([1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0.5, 2, 2, 2, 0.5, 2]),
    pretender: affinityRow([1.5, 1.5, 1.5, 0.5, 0.5, 0.5, 2, 1, 1, 1, 2, 0.5, 1, 2, 0.5, 1]),
    beastDraco: affinityRow([1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 2, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1]),
    beastSpaceEreshkigal: affinityRow([1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 1.5, 1.5, 1.5, 1.5, 1, 1, 1]),
    beastUOlgaMarie: affinityRow([1, 1, 1, 1, 1, 1, 2, 1, 0.5, 2, 1, 2, 1, 1, 1, 1])
  };

  const legacyClassAffinity = ENGINE.classAffinity;
  const ATTRIBUTE_TRAITS = {
    sky: '天の力',
    earth: '地の力',
    man: '人の力',
    star: '星の力',
    beast: '獣の力'
  };
  const ACTIVE = (status) => Boolean(status) &&
    (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
    (status.uses == null || status.uses > 0);

  function officialClassAffinity(attackerClass, defenderClass) {
    const attacker = String(attackerClass || '');
    const defender = String(defenderClass || '');
    if (!attacker || !defender) return 1;
    if (attacker === 'shielder' || defender === 'shielder') return 1;
    if (attacker === 'beast' || defender === 'beast') return 1;
    return Number((OFFICIAL_AFFINITY[attacker] || {})[defender] || 1);
  }

  function unitHasTrait(engine, unit, trait) {
    if (!unit) return false;
    const wanted = String(trait || '').trim();
    if (!wanted) return false;
    if (engine && typeof engine._unitHasTrait === 'function' && engine._unitHasTrait(unit, wanted)) return true;
    if ((unit.traits || []).some((entry) => String(entry || '').trim() === wanted)) return true;
    if (ATTRIBUTE_TRAITS[unit.attribute] === wanted) return true;
    return (unit.statuses || []).some((status) =>
      status.type === 'temporaryTrait' && ACTIVE(status) && String(status.trait || '').trim() === wanted
    );
  }

  function hasClassSkill(engine, unit, skillName) {
    const prefix = String(skillName || '').trim();
    if (!unit || !prefix) return false;
    if (unitHasTrait(engine, unit, prefix)) return true;
    if (unit.data && (unit.data.passives || []).some((passive) => String(passive.name || '').startsWith(prefix))) return true;
    return (unit.statuses || []).some((status) =>
      ACTIVE(status) && status.passive && String(status.source || status.name || '').startsWith(prefix)
    );
  }

  function affinityProfile(unit) {
    if (!unit) return '';
    const explicit = unit.classAffinityProfile || (unit.data && unit.data.classAffinityProfile);
    if (explicit) return String(explicit);
    if (unit.servantId === 'rlyeh' || (unit.data && unit.data.id === 'rlyeh') || unit.name === 'ルルイエ') return 'rlyeh';
    if (unit.servantId === 'baphomet' || (unit.data && unit.data.id === 'baphomet') || unit.name === 'バフォメット') return 'baphomet';
    if (unit.name === '────' || (unit.data && unit.data.name === '────')) return 'firstMurder';
    return '';
  }

  function customClassAffinity(engine, attacker, defender) {
    switch (affinityProfile(attacker)) {
      case 'rlyeh':
        return unitHasTrait(engine, defender, 'ヒト科') || unitHasTrait(engine, defender, '今を生きる人類') ? 2 : 1;
      case 'firstMurder': {
        const favorable = unitHasTrait(engine, defender, '人の力') || unitHasTrait(engine, defender, 'ヒト科');
        if (favorable) return 2;
        const unfavorable = unitHasTrait(engine, defender, '天の力') || unitHasTrait(engine, defender, 'ヒト科以外');
        return unfavorable ? 0.5 : 1;
      }
      case 'baphomet':
        return hasClassSkill(engine, defender, '道具作成') ||
          hasClassSkill(engine, defender, '陣地作成') ||
          unitHasTrait(engine, defender, '悪魔') ? 2 : 1;
      default:
        return null;
    }
  }

  function resolveAttackClassAffinity(engine, attacker, defender) {
    if (!attacker || !defender) return 1;
    const custom = customClassAffinity(engine, attacker, defender);
    return custom == null ? officialClassAffinity(attacker.classId, defender.classId) : custom;
  }

  const HALF_TARGETS = {
    saber: 'archer', archer: 'lancer', lancer: 'saber', rider: 'assassin',
    caster: 'rider', assassin: 'caster', berserker: 'foreigner', ruler: 'avenger',
    avenger: 'moonCancer', moonCancer: 'ruler', alterEgo: 'saber',
    foreigner: 'alterEgo', pretender: 'rider'
  };
  const ONE_AND_HALF_TARGETS = {
    berserker: 'saber', alterEgo: 'rider', pretender: 'saber'
  };

  function representedClasses(actorClass, multiplier) {
    const sourceClass = String(actorClass || 'shielder');
    const value = Number(multiplier || 1);
    if (Math.abs(value - 1) < 1e-9) return { actorClass: sourceClass, targetClass: 'shielder' };
    if (Math.abs(value - 2) < 1e-9) {
      if (sourceClass === 'berserker' || sourceClass === 'shielder' || sourceClass.startsWith('beast')) {
        return { actorClass: 'saber', targetClass: 'lancer' };
      }
      return { actorClass: sourceClass, targetClass: 'berserker' };
    }
    if (Math.abs(value - 1.5) < 1e-9) {
      if (ONE_AND_HALF_TARGETS[sourceClass]) {
        return { actorClass: sourceClass, targetClass: ONE_AND_HALF_TARGETS[sourceClass] };
      }
      return { actorClass: 'alterEgo', targetClass: 'rider' };
    }
    if (Math.abs(value - 0.5) < 1e-9) {
      if (HALF_TARGETS[sourceClass]) {
        return { actorClass: sourceClass, targetClass: HALF_TARGETS[sourceClass] };
      }
      return { actorClass: 'saber', targetClass: 'archer' };
    }
    return { actorClass: sourceClass, targetClass: 'shielder' };
  }

  function withRepresentedAffinity(actor, defender, multiplier, callback) {
    if (!actor || !defender) return callback();
    const current = Number(legacyClassAffinity(actor.classId, defender.classId) || 1);
    if (Math.abs(current - Number(multiplier || 1)) < 1e-9) return callback();

    const represented = representedClasses(actor.classId, multiplier);
    const actorClass = actor.classId;
    const defenderClass = defender.classId;
    actor.classId = represented.actorClass;
    defender.classId = represented.targetClass;
    try {
      return callback();
    } finally {
      actor.classId = actorClass;
      defender.classId = defenderClass;
    }
  }

  const originalCalculateAttackTotal = proto._calculateAttackTotal;
  proto._calculateAttackTotal = function (actor, defender, action, chainContext) {
    const multiplier = resolveAttackClassAffinity(this, actor, defender);
    return withRepresentedAffinity(actor, defender, multiplier, () =>
      originalCalculateAttackTotal.call(this, actor, defender, action, chainContext)
    );
  };

  const originalEnemyAttackDamage = proto._enemyAttackDamage;
  proto._enemyAttackDamage = function (enemy, defender, isNp, critical) {
    const multiplier = resolveAttackClassAffinity(this, enemy, defender);
    return withRepresentedAffinity(enemy, defender, multiplier, () =>
      originalEnemyAttackDamage.call(this, enemy, defender, isNp, critical)
    );
  };

  const originalInitialize = proto._initialize;
  proto._initialize = function () {
    const result = originalInitialize.apply(this, arguments);
    global.FGO_ACTIVE_BATTLE_ENGINE = this;
    return result;
  };

  proto.getAttackClassAffinity = function (attackerOrId, defenderOrId) {
    const attacker = typeof attackerOrId === 'string' ? this.getUnit(attackerOrId) : attackerOrId;
    const defender = typeof defenderOrId === 'string' ? this.getUnit(defenderOrId) : defenderOrId;
    return resolveAttackClassAffinity(this, attacker, defender);
  };

  ENGINE.classAffinity = officialClassAffinity;

  const API = {
    officialClassOrder: OFFICIAL_CLASS_ORDER.slice(),
    officialAffinity: OFFICIAL_AFFINITY,
    officialClassAffinity,
    resolveAttackClassAffinity,
    affinityProfile,
    unitHasTrait,
    hasClassSkill,
    favorableMultiplier: 2,
    unfavorableMultiplier: 0.5,
    neutralMultiplier: 1,
    overlapPriority: 'favorable-first'
  };

  global.FGO_CLASS_AFFINITY_RULES = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
