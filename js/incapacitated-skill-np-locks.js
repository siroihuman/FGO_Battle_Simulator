(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const INCAPACITATION = global.FGO_INCAPACITATED_COMMAND_SELECTION ||
    (typeof require !== 'undefined' ? require('./incapacitated-command-selection.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine || !INCAPACITATION) {
    throw new Error('incapacitated skill/NP locks require the battle engine and incapacitation runtime.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__incapacitatedSkillNpLocksInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_INCAPACITATED_SKILL_NP_LOCKS;
    }
    return;
  }
  proto.__incapacitatedSkillNpLocksInstalled = true;

  function unitFrom(engine, unitOrId) {
    if (!engine) return null;
    if (unitOrId && typeof unitOrId === 'object') return unitOrId;
    return typeof engine.getUnit === 'function' ? engine.getUnit(unitOrId) : null;
  }

  function lockFor(engine, unitOrId, commandName) {
    const unit = unitFrom(engine, unitOrId);
    const status = INCAPACITATION.incapacitatingStatus(unit);
    if (!status) return null;
    const label = status.label || INCAPACITATION.statusNames[status.type] || '行動不能';
    return {
      available: false,
      lockedByStatus: true,
      kind: 'incapacitated',
      status,
      label,
      reason: `${label}状態のため${commandName}を使用できません。`
    };
  }

  function removeSelectedNp(engine, unitId) {
    if (!engine.state || !Array.isArray(engine.state.selectedActions)) return [];
    const removed = [];
    engine.state.selectedActions = engine.state.selectedActions.filter((action) => {
      if (!action || action.type !== 'np' || action.actorId !== unitId) return true;
      removed.push(action);
      return false;
    });
    return removed;
  }

  const originalGetSkillAvailability = proto.getSkillAvailability;
  proto.getSkillAvailability = function (unitOrId, skillIndex) {
    const current = typeof originalGetSkillAvailability === 'function'
      ? originalGetSkillAvailability.call(this, unitOrId, skillIndex)
      : { available: true, reason: '', lockedByStatus: false };
    if (current && current.lockedByStatus) return current;
    return lockFor(this, unitOrId, 'スキル') || current;
  };

  const originalGetNpAvailability = proto.getNpAvailability;
  proto.getNpAvailability = function (unitOrId) {
    const current = typeof originalGetNpAvailability === 'function'
      ? originalGetNpAvailability.call(this, unitOrId)
      : { available: true, reason: '', lockedByStatus: false };
    if (current && current.lockedByStatus) return current;
    return lockFor(this, unitOrId, '宝具') || current;
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId) {
    const lock = lockFor(this, allyId, 'スキル');
    if (lock) return { ok: false, reason: lock.reason, status: lock.status };
    return originalUseSkill.apply(this, arguments);
  };

  const originalToggleNp = proto.toggleNp;
  proto.toggleNp = function (allyId) {
    const selectedIndex = this.state && Array.isArray(this.state.selectedActions)
      ? this.state.selectedActions.findIndex((action) => action && action.type === 'np' && action.actorId === allyId)
      : -1;
    if (selectedIndex >= 0) {
      this.state.selectedActions.splice(selectedIndex, 1);
      return true;
    }
    if (lockFor(this, allyId, '宝具')) return false;
    return originalToggleNp.call(this, allyId);
  };

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (unit && INCAPACITATION.incapacitatingStatus(unit)) removeSelectedNp(this, unit.id);
    return status;
  };

  const originalExecuteCommandChain = proto.executeCommandChain;
  proto.executeCommandChain = function () {
    const blocked = this.state && Array.isArray(this.state.selectedActions)
      ? this.state.selectedActions.find((action) => action && action.type === 'np' && lockFor(this, action.actorId, '宝具'))
      : null;
    if (blocked) {
      const lock = lockFor(this, blocked.actorId, '宝具');
      removeSelectedNp(this, blocked.actorId);
      return { ok: false, reason: lock.reason };
    }
    return originalExecuteCommandChain.apply(this, arguments);
  };

  const API = {
    skillsLocked: true,
    noblePhantasmsLocked: true,
    normalCommandCardsSelectable: true,
    lockFor,
    removeSelectedNp
  };

  global.FGO_INCAPACITATED_SKILL_NP_LOCKS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
