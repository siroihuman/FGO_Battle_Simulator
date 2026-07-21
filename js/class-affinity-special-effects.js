(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const COMMON = global.FGO_SIM_COMMON_EFFECTS ||
    (typeof require !== 'undefined' ? require('./common-effects.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !COMMON) {
    throw new Error('class affinity and status special effects require data, engine and common effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__classAffinitySpecialEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_SIM_CLASS_AFFINITY_SPECIAL_EFFECTS;
    }
    return;
  }
  proto.__classAffinitySpecialEffectsInstalled = true;

  const STATUS_NAMES = {
    defenseClassDisadvantageNullify: '防御相性不利打ち消し',
    sureHit: '必中'
  };

  function isActiveStatus(status) {
    if (!status) return false;
    const turnsRemain = status.remaining == null || status.remaining < 0 || status.remaining > 0;
    const usesRemain = status.uses == null || status.uses > 0;
    return turnsRemain && usesRemain;
  }

  function hasActiveStatus(unit, type, filter) {
    if (!unit || !type) return false;
    return (unit.statuses || []).some((status) => {
      if (status.type !== type || !isActiveStatus(status)) return false;
      if (!filter) return true;
      return Object.entries(filter).every(([key, value]) => status[key] === value);
    });
  }

  const originalEnemyAttackDamage = proto._enemyAttackDamage;
  proto._enemyAttackDamage = function (enemy, ally, isNp, critical) {
    if (!enemy || !ally || !hasActiveStatus(ally, 'defenseClassDisadvantageNullify')) {
      return originalEnemyAttackDamage.call(this, enemy, ally, isNp, critical);
    }

    const affinity = ENGINE.classAffinity(enemy.classId, ally.classId);
    if (affinity <= 1) {
      return originalEnemyAttackDamage.call(this, enemy, ally, isNp, critical);
    }

    // 防御不利だけを等倍へ置き換える。既存計算式・防御力・ダメージカットの
    // 適用順を変えないため、計算中だけ防御側クラスを等倍クラスとして扱う。
    const originalClassId = ally.classId;
    ally.classId = 'shielder';
    try {
      return originalEnemyAttackDamage.call(this, enemy, ally, isNp, critical);
    } finally {
      ally.classId = originalClassId;
    }
  };

  const originalNpSpecialMultiplier = proto._npSpecialMultiplier;
  proto._npSpecialMultiplier = function (np, target) {
    const special = np && np.special;
    if (!special || special.kind !== 'status') {
      return originalNpSpecialMultiplier.call(this, np, target);
    }

    if (!hasActiveStatus(target, special.key, special.filter)) return 1;
    const oc = Math.max(1, Math.min(5, Number(this._currentNpOc || 1)));
    return Number((special.ocMultipliers || [])[oc - 1] || special.multiplier || 1);
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      const name = STATUS_NAMES[status.type];
      if (!name) return status;
      return {
        ...status,
        name,
        statusIcon: status.statusIcon || DATA.statusIcons[status.type]
      };
    });
  };

  DATA.statusIcons.defenseClassDisadvantageNullify =
    DATA.statusIcons.defenseClassDisadvantageNullify || 'Defenseup.webp';
  COMMON.statusNames.defenseClassDisadvantageNullify = STATUS_NAMES.defenseClassDisadvantageNullify;
  COMMON.statusNames.sureHit = STATUS_NAMES.sureHit;

  const API = {
    statusNames: { ...STATUS_NAMES },
    npSpecialKinds: ['status'],
    defenseClassDisadvantageRule: '被攻撃時のクラス相性倍率が1より大きい場合だけ1倍へ置換'
  };

  global.FGO_SIM_CLASS_AFFINITY_SPECIAL_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
