(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('command use locks require the battle engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__commandUseLocksInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_COMMAND_USE_LOCKS;
    }
    return;
  }
  proto.__commandUseLocksInstalled = true;

  if (DATA && DATA.statusIcons) {
    Object.assign(DATA.statusIcons, {
      npSeal: DATA.statusIcons.npSeal || 'Statusup.webp',
      skillSeal: DATA.statusIcons.skillSeal || 'Statusup.webp',
      skillDisable: DATA.statusIcons.skillDisable || 'Statusup.webp',
      skill1Seal: DATA.statusIcons.skill1Seal || 'Statusup.webp',
      skill2Seal: DATA.statusIcons.skill2Seal || 'Statusup.webp',
      skill3Seal: DATA.statusIcons.skill3Seal || 'Statusup.webp'
    });
  }

  const ALL_SKILL_LOCK_TYPES = new Set([
    'skillSeal',
    'skillsSeal',
    'allSkillSeal',
    'skillUseSeal'
  ]);
  const NP_LOCK_TYPES = new Set([
    'npSeal',
    'noblePhantasmSeal'
  ]);
  const TARGETED_SKILL_LOCK_TYPES = new Set([
    'skillDisable',
    'skillLock',
    'individualSkillSeal'
  ]);
  const STATUS_METADATA_KEYS = [
    'skillIndex', 'targetSkillIndex', 'skillIndices',
    'skillNumber', 'targetSkillNumber', 'skillNumbers',
    'skillId', 'targetSkillId', 'skillIds', 'skills'
  ];

  function activeStatus(status) {
    if (!status) return false;
    const turnsRemain = status.remaining == null || status.remaining < 0 || status.remaining > 0;
    const usesRemain = status.uses == null || status.uses > 0;
    return turnsRemain && usesRemain;
  }

  function unitFrom(engine, unitOrId) {
    if (!engine) return null;
    if (unitOrId && typeof unitOrId === 'object') return unitOrId;
    return typeof engine.getUnit === 'function' ? engine.getUnit(unitOrId) : null;
  }

  function normalizedInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) ? number : null;
  }

  function addZeroBasedIndex(indices, value) {
    const index = normalizedInteger(value);
    if (index != null && index >= 0) indices.add(index);
  }

  function addOneBasedNumber(indices, value) {
    const number = normalizedInteger(value);
    if (number != null && number >= 1) indices.add(number - 1);
  }

  function typeSkillNumber(type) {
    const text = String(type || '');
    const match = /^(?:skill([1-9])(?:Seal|Disable|Lock)|skill(?:Seal|Disable|Lock)([1-9]))$/.exec(text);
    if (!match) return null;
    return Number(match[1] || match[2]);
  }

  function targetedSkillIndices(status, unit) {
    const indices = new Set();
    if (!status) return indices;

    addZeroBasedIndex(indices, status.skillIndex);
    addZeroBasedIndex(indices, status.targetSkillIndex);
    (Array.isArray(status.skillIndices) ? status.skillIndices : []).forEach((value) => addZeroBasedIndex(indices, value));

    addOneBasedNumber(indices, status.skillNumber);
    addOneBasedNumber(indices, status.targetSkillNumber);
    (Array.isArray(status.skillNumbers) ? status.skillNumbers : []).forEach((value) => addOneBasedNumber(indices, value));
    (Array.isArray(status.skills) ? status.skills : []).forEach((value) => addOneBasedNumber(indices, value));

    const numberFromType = typeSkillNumber(status.type);
    if (numberFromType != null) addOneBasedNumber(indices, numberFromType);

    if (TARGETED_SKILL_LOCK_TYPES.has(status.type) && indices.size === 0) {
      addOneBasedNumber(indices, status.value);
    }

    const skillIds = [];
    if (status.skillId != null) skillIds.push(status.skillId);
    if (status.targetSkillId != null) skillIds.push(status.targetSkillId);
    if (Array.isArray(status.skillIds)) skillIds.push(...status.skillIds);
    if (unit && unit.data && Array.isArray(unit.data.skills)) {
      skillIds.forEach((skillId) => {
        const index = unit.data.skills.findIndex((skill) => String(skill && skill.id) === String(skillId));
        if (index >= 0) indices.add(index);
      });
    }

    return indices;
  }

  function skillLockStatus(unit, skillIndex) {
    if (!unit) return null;
    const index = Number(skillIndex);
    for (const status of unit.statuses || []) {
      if (!activeStatus(status)) continue;
      if (ALL_SKILL_LOCK_TYPES.has(status.type)) {
        return {
          status,
          kind: 'allSkills',
          label: 'スキル封印',
          reason: 'スキル封印状態のため使用できません。'
        };
      }
      if (targetedSkillIndices(status, unit).has(index)) {
        return {
          status,
          kind: 'individualSkill',
          label: `スキル${index + 1}使用不可`,
          reason: `スキル${index + 1}使用不可状態のため使用できません。`
        };
      }
    }
    return null;
  }

  function npLockStatus(unit) {
    if (!unit) return null;
    const status = (unit.statuses || []).find((entry) =>
      activeStatus(entry) && NP_LOCK_TYPES.has(entry.type)
    );
    return status ? {
      status,
      kind: 'npSeal',
      label: '宝具封印',
      reason: '宝具封印状態のため使用できません。'
    } : null;
  }

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    STATUS_METADATA_KEYS.forEach((key) => {
      if (effect && effect[key] !== undefined) {
        status[key] = Array.isArray(effect[key]) ? effect[key].slice() : effect[key];
      }
    });
    if (this.state && Array.isArray(this.state.selectedActions)) {
      this._removeSealedNpSelections();
    }
    return status;
  };

  proto.getSkillLockStatus = function (unitOrId, skillIndex) {
    return skillLockStatus(unitFrom(this, unitOrId), skillIndex);
  };

  proto.getNpLockStatus = function (unitOrId) {
    return npLockStatus(unitFrom(this, unitOrId));
  };

  proto.getSkillAvailability = function (unitOrId, skillIndex) {
    const unit = unitFrom(this, unitOrId);
    const index = Number(skillIndex);
    if (!unit) return { available: false, reason: '使用者が存在しません。', lockedByStatus: false };
    const skill = unit.data && Array.isArray(unit.data.skills) ? unit.data.skills[index] : null;
    if (!skill) return { available: false, reason: 'スキルがありません。', lockedByStatus: false };

    const lock = skillLockStatus(unit, index);
    if (lock) return { available: false, lockedByStatus: true, ...lock };
    if (!unit.alive || Number(unit.hp || 0) <= 0) {
      return { available: false, reason: '使用者が戦闘不能です。', lockedByStatus: false };
    }
    if (!unit.frontline) {
      return { available: false, reason: '控えではスキルを使用できません。', lockedByStatus: false };
    }
    if (!this.state || this.state.phase !== 'command' || this.state.winner) {
      return { available: false, reason: '現在はスキルを使用できません。', lockedByStatus: false };
    }
    const cooldown = Number((unit.cooldowns || [])[index] || 0);
    if (cooldown > 0) {
      return { available: false, reason: `CTが${cooldown}残っています。`, lockedByStatus: false };
    }
    return { available: true, reason: '', lockedByStatus: false };
  };

  proto.getNpAvailability = function (unitOrId) {
    const unit = unitFrom(this, unitOrId);
    if (!unit) return { available: false, reason: '使用者が存在しません。', lockedByStatus: false };

    const lock = npLockStatus(unit);
    if (lock) return { available: false, lockedByStatus: true, ...lock };
    if (!unit.alive || Number(unit.hp || 0) <= 0) {
      return { available: false, reason: '使用者が戦闘不能です。', lockedByStatus: false };
    }
    if (!unit.frontline) {
      return { available: false, reason: '控えでは宝具を使用できません。', lockedByStatus: false };
    }
    if (!this.state || this.state.phase !== 'command' || this.state.winner) {
      return { available: false, reason: '現在は宝具を使用できません。', lockedByStatus: false };
    }
    if (Number(unit.np || 0) < 100) {
      return { available: false, reason: 'NPが不足しています。', lockedByStatus: false };
    }
    return { available: true, reason: '', lockedByStatus: false };
  };

  proto._removeSealedNpSelections = function () {
    if (!this.state || !Array.isArray(this.state.selectedActions)) return [];
    const removed = [];
    this.state.selectedActions = this.state.selectedActions.filter((action) => {
      if (!action || action.type !== 'np') return true;
      const lock = npLockStatus(unitFrom(this, action.actorId));
      if (!lock) return true;
      removed.push({ action, lock });
      return false;
    });
    return removed;
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId) {
    const availability = this.getSkillAvailability(allyId, skillIndex);
    if (!availability.available) return { ok: false, reason: availability.reason };
    return originalUseSkill.apply(this, arguments);
  };

  const originalToggleNp = proto.toggleNp;
  proto.toggleNp = function (allyId) {
    const selectedIndex = this.state && Array.isArray(this.state.selectedActions)
      ? this.state.selectedActions.findIndex((action) => action.type === 'np' && action.actorId === allyId)
      : -1;
    if (selectedIndex >= 0) return originalToggleNp.call(this, allyId);
    const availability = this.getNpAvailability(allyId);
    if (!availability.available) return false;
    return originalToggleNp.call(this, allyId);
  };

  const originalExecuteCommandChain = proto.executeCommandChain;
  proto.executeCommandChain = function () {
    const removed = this._removeSealedNpSelections();
    if (removed.length) {
      return { ok: false, reason: '宝具封印により、選択中の宝具を使用できません。' };
    }
    return originalExecuteCommandChain.apply(this, arguments);
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    const unit = this.getUnit(unitId);
    const summaries = originalGetStatusSummary.call(this, unitId);
    const rawStatuses = unit ? unit.statuses || [] : [];
    return summaries.map((summary, index) => {
      const raw = rawStatuses[index] || summary;
      if (NP_LOCK_TYPES.has(raw.type)) {
        return { ...summary, type: 'npSeal', name: '宝具封印' };
      }
      if (ALL_SKILL_LOCK_TYPES.has(raw.type)) {
        return { ...summary, type: 'skillSeal', name: 'スキル封印' };
      }
      const indices = Array.from(targetedSkillIndices(raw, unit)).sort((a, b) => a - b);
      if (indices.length === 1) {
        const number = indices[0] + 1;
        return { ...summary, type: `skill${number}Seal`, name: `スキル${number}使用不可` };
      }
      if (indices.length > 1) {
        return {
          ...summary,
          type: 'skillDisable',
          name: `スキル${indices.map((entry) => entry + 1).join('・')}使用不可`
        };
      }
      return summary;
    });
  };

  const API = {
    allSkillLockTypes: Array.from(ALL_SKILL_LOCK_TYPES),
    npLockTypes: Array.from(NP_LOCK_TYPES),
    targetedSkillLockTypes: Array.from(TARGETED_SKILL_LOCK_TYPES),
    activeStatus,
    targetedSkillIndices,
    skillLockStatus,
    npLockStatus,
    metadata: {
      skillIndex: '0-based',
      skillNumber: '1-based',
      recommendedTargetedEffect: { type: 'skillDisable', skillNumber: 1 }
    }
  };

  global.FGO_COMMAND_USE_LOCKS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (typeof document === 'undefined') return;

  const root = document.getElementById('app');
  if (!root) return;
  let scheduled = false;

  function currentEngine() {
    return global.FGO_ACTIVE_BATTLE_ENGINE || null;
  }

  function setButtonState(button, availability, resolving) {
    const locked = Boolean(availability && availability.lockedByStatus);
    button.classList.toggle('command-use-locked', locked);
    if (locked) {
      button.dataset.commandLockLabel = availability.label || '使用不可';
      button.dataset.commandLockReason = availability.reason || '使用できません。';
      if (!button.dataset.commandLockOriginalTitle) {
        button.dataset.commandLockOriginalTitle = button.getAttribute('title') || '';
      }
      const originalTitle = button.dataset.commandLockOriginalTitle;
      button.title = originalTitle ? `${originalTitle}\n${availability.reason}` : availability.reason;
    } else {
      delete button.dataset.commandLockLabel;
      delete button.dataset.commandLockReason;
      if (button.dataset.commandLockOriginalTitle !== undefined) {
        button.title = button.dataset.commandLockOriginalTitle;
        delete button.dataset.commandLockOriginalTitle;
      }
    }
    button.disabled = Boolean(resolving || !availability || !availability.available);
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
  }

  function updateButtons() {
    scheduled = false;
    const engine = currentEngine();
    if (!engine) return;
    const resolving = Boolean(root.querySelector('.battle-screen.battle-resolving, .command-panel.resolving'));

    root.querySelectorAll('.skill-button[data-skill]').forEach((button) => {
      const separator = button.dataset.skill.lastIndexOf(':');
      if (separator < 0) return;
      const unitId = button.dataset.skill.slice(0, separator);
      const skillIndex = Number(button.dataset.skill.slice(separator + 1));
      setButtonState(button, engine.getSkillAvailability(unitId, skillIndex), resolving);
    });

    root.querySelectorAll('.np-command[data-np]').forEach((button) => {
      setButtonState(button, engine.getNpAvailability(button.dataset.np), resolving);
    });
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(updateButtons);
    else setTimeout(updateButtons, 0);
  }

  new MutationObserver(scheduleUpdate).observe(root, { childList: true, subtree: true });
  root.addEventListener('click', scheduleUpdate, true);
  scheduleUpdate();
})(typeof window !== 'undefined' ? window : globalThis);
