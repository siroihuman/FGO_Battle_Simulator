(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('incapacitated command selection requires the battle engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__incapacitatedCommandSelectionInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_INCAPACITATED_COMMAND_SELECTION;
    }
    return;
  }
  proto.__incapacitatedCommandSelectionInstalled = true;

  const INCAPACITATED_TYPES = new Set([
    'stun',
    'charm',
    'sleep',
    'permanentSleep',
    'petrify',
    'petrification',
    'freeze',
    'frozen',
    'actionDisable',
    'actionIncapacitated',
    'unableToAct',
    'immobilize'
  ]);

  const STATUS_NAMES = {
    stun: 'スタン',
    charm: '魅了',
    sleep: '睡眠',
    permanentSleep: '永久睡眠',
    petrify: '石化',
    petrification: '石化',
    freeze: '凍結',
    frozen: '凍結',
    actionDisable: '行動不能',
    actionIncapacitated: '行動不能',
    unableToAct: '行動不能',
    immobilize: '行動不能'
  };

  if (DATA && DATA.statusIcons) {
    INCAPACITATED_TYPES.forEach((type) => {
      DATA.statusIcons[type] = DATA.statusIcons[type] || 'Stunstatus.webp';
    });
  }

  function activeStatus(status) {
    return Boolean(status) &&
      (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
      (status.uses == null || status.uses > 0);
  }

  function unitFrom(engine, unitOrId) {
    if (!engine) return null;
    if (unitOrId && typeof unitOrId === 'object') return unitOrId;
    return typeof engine.getUnit === 'function' ? engine.getUnit(unitOrId) : null;
  }

  function incapacitatingStatus(unit) {
    return unit && (unit.statuses || []).find((status) =>
      activeStatus(status) && (
        INCAPACITATED_TYPES.has(status.type) ||
        status.incapacitated === true ||
        status.actionDisabled === true ||
        status.preventsAction === true
      )
    ) || null;
  }

  function isIncapacitated(unit) {
    return Boolean(incapacitatingStatus(unit));
  }

  function statusName(status) {
    return status && (status.label || STATUS_NAMES[status.type]) || '行動不能';
  }

  function neutralChainContext() {
    return {
      firstBonuses: { buster: false, arts: false, quick: false },
      busterChain: false,
      artsChain: false,
      quickChain: false,
      mighty: false
    };
  }

  proto.getIncapacitatingStatus = function (unitOrId) {
    return incapacitatingStatus(unitFrom(this, unitOrId));
  };

  proto.isIncapacitated = function (unitOrId) {
    return Boolean(this.getIncapacitatingStatus(unitOrId));
  };

  const originalInitialize = proto._initialize;
  proto._initialize = function () {
    global.FGO_ACTIVE_BATTLE_ENGINE = this;
    return originalInitialize.apply(this, arguments);
  };

  function directToggleCard(engine, cardId) {
    if (!engine.state || engine.state.phase !== 'command' || engine.state.winner) return false;
    const actions = Array.isArray(engine.state.selectedActions) ? engine.state.selectedActions : [];
    const existingIndex = actions.findIndex((action) => action.type === 'card' && action.cardId === cardId);
    if (existingIndex >= 0) {
      actions.splice(existingIndex, 1);
      if (typeof engine._allocateCriticalStars === 'function') engine._allocateCriticalStars();
      return true;
    }
    if (actions.length >= 3) return false;

    const card = (engine.state.hand || []).find((entry) => entry.id === cardId);
    if (!card) return false;
    const actor = engine.getUnit(card.actorId);
    if (!actor || !actor.alive || Number(actor.hp || 0) <= 0 || actor.frontline === false) return false;
    if (typeof engine.isCommandCardDrawSealed === 'function' && engine.isCommandCardDrawSealed(actor)) return false;

    actions.push({
      type: 'card',
      cardId: card.id,
      actorId: card.actorId,
      card: card.card
    });
    if (typeof engine._allocateCriticalStars === 'function') engine._allocateCriticalStars();
    return true;
  }

  function directToggleNp(engine, allyId) {
    if (!engine.state || engine.state.phase !== 'command' || engine.state.winner) return false;
    const actions = Array.isArray(engine.state.selectedActions) ? engine.state.selectedActions : [];
    const existingIndex = actions.findIndex((action) => action.type === 'np' && action.actorId === allyId);
    if (existingIndex >= 0) {
      actions.splice(existingIndex, 1);
      return true;
    }
    if (actions.length >= 3) return false;

    const ally = unitFrom(engine, allyId);
    if (!ally || !ally.alive || Number(ally.hp || 0) <= 0 || ally.frontline === false || Number(ally.np || 0) < 100) {
      return false;
    }
    if (typeof engine.getNpLockStatus === 'function' && engine.getNpLockStatus(ally)) return false;

    actions.push({ type: 'np', actorId: ally.id, card: ally.data.np.card });
    return true;
  }

  const originalToggleCard = proto.toggleCard;
  proto.toggleCard = function (cardId) {
    const card = this.state && Array.isArray(this.state.hand)
      ? this.state.hand.find((entry) => entry.id === cardId)
      : null;
    const actor = card && this.getUnit(card.actorId);

    // 固有処理や旧処理が行動不能を選択不可としていても、システム共通仕様を優先する。
    if (actor && isIncapacitated(actor)) return directToggleCard(this, cardId);
    return originalToggleCard.call(this, cardId);
  };

  const originalToggleNp = proto.toggleNp;
  proto.toggleNp = function (allyId) {
    const actor = unitFrom(this, allyId);
    if (actor && isIncapacitated(actor)) return directToggleNp(this, allyId);
    return originalToggleNp.call(this, allyId);
  };

  const originalRunEffectHooks = proto._runEffectHooks;
  proto._runEffectHooks = function (eventName, context) {
    const detail = context || {};
    if (eventName === 'beforeEnemyAction' && detail.actor) {
      const status = incapacitatingStatus(detail.actor);
      if (status) {
        this._log(`${detail.actor.name}は${statusName(status)}により行動できない。`, 'debuff');
        return { prevented: true, status };
      }
    }
    return typeof originalRunEffectHooks === 'function'
      ? originalRunEffectHooks.call(this, eventName, detail)
      : undefined;
  };

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    const actor = action && this.getUnit(action.actorId);
    const status = incapacitatingStatus(actor);
    if (actor && status) {
      this._log(`${actor.name}は${statusName(status)}のため、コマンドカードによる攻撃を行えない。`, 'chainError');
      return { skipped: true, reason: 'incapacitated', status };
    }
    const originalCard = this.__incapacitatedOriginalCards && action
      ? this.__incapacitatedOriginalCards[Number(action.position || 0)]
      : null;
    const effectiveAction = originalCard ? { ...action, card: originalCard } : action;
    const effectiveContext = this.__incapacitatedChainError ? neutralChainContext() : chainContext;
    return originalExecuteCard.call(this, effectiveAction, effectiveContext);
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    const actor = action && this.getUnit(action.actorId);
    const status = incapacitatingStatus(actor);
    if (actor && status) {
      this._log(`${actor.name}は${statusName(status)}のため、宝具を使用できない。`, 'chainError');
      return { skipped: true, reason: 'incapacitated', status };
    }
    const originalCard = this.__incapacitatedOriginalCards && action
      ? this.__incapacitatedOriginalCards[Number(action.position || 0)]
      : null;
    const effectiveAction = originalCard ? { ...action, card: originalCard } : action;
    const effectiveContext = this.__incapacitatedChainError ? neutralChainContext() : chainContext;
    return originalExecuteNp.call(this, effectiveAction, effectiveContext, precedingNps);
  };

  const originalExecuteExtra = proto._executeExtra;
  proto._executeExtra = function () {
    if (this.__incapacitatedChainError) return { skipped: true, reason: 'chainError' };
    return originalExecuteExtra.apply(this, arguments);
  };

  const originalCalculateOc = proto._calculateOc;
  proto._calculateOc = function (actor, precedingNps) {
    return originalCalculateOc.call(this, actor, this.__incapacitatedChainError ? 0 : precedingNps);
  };

  const originalExecuteCommandChain = proto.executeCommandChain;
  proto.executeCommandChain = function () {
    const actions = this.state && Array.isArray(this.state.selectedActions)
      ? this.state.selectedActions
      : [];
    const hasIncapacitatedParticipant = actions.length === 3 && actions.some((action) => {
      const actor = action && this.getUnit(action.actorId);
      return actor && isIncapacitated(actor);
    });

    if (!hasIncapacitatedParticipant) return originalExecuteCommandChain.apply(this, arguments);

    const originalCards = actions.map((action) => action.card);
    actions.forEach((action) => { action.card = 'chainError'; });
    this.__incapacitatedOriginalCards = originalCards;
    this.__incapacitatedChainError = true;
    this._log(
      '行動不能状態のサーヴァントを含むためチェインエラー。チェイン・1stボーナス・OC上昇・Extra Attackは発生しない。',
      'chainError'
    );
    try {
      return originalExecuteCommandChain.apply(this, arguments);
    } finally {
      actions.forEach((action, index) => { action.card = originalCards[index]; });
      delete this.__incapacitatedOriginalCards;
      this.__incapacitatedChainError = false;
    }
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => ({
      ...status,
      name: STATUS_NAMES[status.type] || status.name,
      statusIcon: status.statusIcon || (DATA && DATA.statusIcons && DATA.statusIcons[status.type]) || null
    }));
  };

  const API = {
    incapacitatedTypes: Array.from(INCAPACITATED_TYPES),
    statusNames: { ...STATUS_NAMES },
    activeStatus,
    incapacitatingStatus,
    isIncapacitated,
    selectionAllowedWhileIncapacitated: true,
    executionStillBlocked: true,
    visualClass: 'command-incapacitated',
    directToggleCard,
    directToggleNp
  };

  global.FGO_INCAPACITATED_COMMAND_SELECTION = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (typeof document === 'undefined') return;
  const root = document.getElementById('app');
  if (!root) return;
  let scheduled = false;

  function updateCommandVisuals() {
    scheduled = false;
    const engine = global.FGO_ACTIVE_BATTLE_ENGINE || null;
    if (!engine || !engine.state) return;

    root.querySelectorAll('.command-card[data-card]').forEach((button) => {
      const card = (engine.state.hand || []).find((entry) => entry.id === button.dataset.card);
      const actor = card && engine.getUnit(card.actorId);
      setIncapacitatedVisual(button, incapacitatingStatus(actor));
    });

    root.querySelectorAll('.np-command[data-np]').forEach((button) => {
      setIncapacitatedVisual(button, incapacitatingStatus(engine.getUnit(button.dataset.np)));
    });
  }

  function setIncapacitatedVisual(button, status) {
    const active = Boolean(status);
    button.classList.toggle('command-incapacitated', active);
    if (active) {
      button.dataset.incapacitatedLabel = statusName(status);
      button.dataset.incapacitatedReason = '行動不能中でも選択できますが、実行時に失敗します。';
    } else {
      delete button.dataset.incapacitatedLabel;
      delete button.dataset.incapacitatedReason;
    }
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(updateCommandVisuals);
    else setTimeout(updateCommandVisuals, 0);
  }

  new MutationObserver(scheduleUpdate).observe(root, { childList: true, subtree: true });
  root.addEventListener('click', scheduleUpdate, true);
  scheduleUpdate();
})(typeof window !== 'undefined' ? window : globalThis);
