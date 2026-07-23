(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const COMMON = global.FGO_SIM_COMMON_EFFECTS ||
    (typeof require !== 'undefined' ? require('./common-effects.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !COMMON) {
    throw new Error('lethal damage evasion effects require data, engine and common effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__lethalDamageEvasionEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_LETHAL_DAMAGE_EVASION_EFFECTS;
    return;
  }
  proto.__lethalDamageEvasionEffectsInstalled = true;

  const TYPE = 'deathEvasion';
  const STATUS_NAME = '致死ダメージ回避';

  function isActive(status) {
    return Boolean(status) &&
      (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
      (status.uses == null || status.uses > 0);
  }

  function activeDeathEvasion(unit) {
    return unit && (unit.statuses || []).find((status) => status.type === TYPE && isActive(status)) || null;
  }

  function attackerBypassesEvasion(engine, attacker) {
    if (!engine || !attacker) return false;
    return engine._hasStatus(attacker, 'sureHit') || engine._hasStatus(attacker, 'invinciblePierce');
  }

  const originalResolveAttackOnTarget = proto._resolveAttackOnTarget;
  proto._resolveAttackOnTarget = function (actor, target, action, chainContext) {
    const previous = this.__lethalDamageAttackContext;
    this.__lethalDamageAttackContext = { attacker: actor, action, singleUse: false };
    try {
      return originalResolveAttackOnTarget.call(this, actor, target, action, chainContext);
    } finally {
      this.__lethalDamageAttackContext = previous;
    }
  };

  const originalEnemyAttackDamage = proto._enemyAttackDamage;
  proto._enemyAttackDamage = function (enemy, ally, isNp, critical) {
    const damage = originalEnemyAttackDamage.call(this, enemy, ally, isNp, critical);
    this.__lethalDamageAttackContext = {
      attacker: enemy,
      action: { type: isNp ? 'np' : 'card', critical: Boolean(critical) },
      singleUse: true
    };
    return damage;
  };

  const originalTakeDamage = proto._takeDamage;
  proto._takeDamage = function (unit, amount, sourceLabel) {
    const context = this.__lethalDamageAttackContext;
    try {
      const damage = Math.max(0, Math.floor(Number(amount || 0)));
      const status = activeDeathEvasion(unit);
      const lethal = Boolean(unit && unit.alive && damage >= Number(unit.hp || 0));
      const bypassed = context && attackerBypassesEvasion(this, context.attacker);

      if (context && status && lethal && !bypassed) {
        this._consumeStatus(unit, status);
        this._log(`${unit.name}は致死ダメージ回避で${sourceLabel || '攻撃'}を回避。`, 'evade');
        return { damage: 0, guts: false, avoided: true, deathEvasion: true };
      }

      return originalTakeDamage.call(this, unit, amount, sourceLabel);
    } finally {
      if (context && context.singleUse) this.__lethalDamageAttackContext = null;
    }
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (status.type !== TYPE) return status;
      return {
        ...status,
        name: STATUS_NAME,
        statusIcon: status.statusIcon || DATA.statusIcons[TYPE]
      };
    });
  };

  DATA.statusIcons[TYPE] = DATA.statusIcons[TYPE] || 'DeathEvasion.webp';
  COMMON.statusNames[TYPE] = STATUS_NAME;

  const API = {
    type: TYPE,
    statusName: STATUS_NAME,
    isActive,
    activeDeathEvasion,
    attackerBypassesEvasion
  };

  global.FGO_SIM_LETHAL_DAMAGE_EVASION_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
