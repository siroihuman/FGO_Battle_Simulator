(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const PRESENTATION = global.FGO_BATTLE_PRESENTATION ||
    (typeof require !== 'undefined' ? require('./battle-presentation.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine || !PRESENTATION) {
    throw new Error('turn action timeline requires engine and battle presentation.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__turnActionTimelineInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_TURN_ACTION_TIMELINE;
    }
    return;
  }
  proto.__turnActionTimelineInstalled = true;

  const STAR_CAP = 99;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  function starPool(snapshot, initial) {
    if (!snapshot) return 0;
    if (
      initial &&
      Number(snapshot.turn || 1) > Number(initial.turn || 1) &&
      snapshot.phase === 'command'
    ) {
      return clamp(snapshot.stars, 0, STAR_CAP);
    }
    return clamp(Number(snapshot.nextStars || 0) - Number(initial && initial.nextStars || 0), 0, STAR_CAP);
  }

  function phaseLabel(phase) {
    if (phase === 'ally') return '味方攻撃フェーズ';
    if (phase === 'enemy') return '敵攻撃フェーズ';
    return 'ターン処理';
  }

  function actionLabel(step) {
    if (!step) return '';
    if (step.phase === 'ally') {
      if (step.kind === 'extra') return 'Extra Attack';
      const card = step.kind === 'np' ? '宝具' : String(step.card || '').toUpperCase();
      return `コマンドカード ${step.phaseOrder}${card ? `：${card}` : ''}`;
    }
    if (step.phase === 'enemy') {
      return `エネミー ${step.phaseOrder}${step.isNp ? '：宝具' : '：攻撃'}`;
    }
    return 'ターン処理';
  }

  function snapshot(engine) {
    return PRESENTATION.snapshot(engine.getState());
  }

  function actorInfo(engine, actorId) {
    const actor = engine.getUnit(actorId);
    return actor ? {
      actorId: actor.id,
      actorName: actor.name,
      actorSide: engine.getState().allies.includes(actor) ? 'ally' : 'enemy',
      actorSlot: Number(actor.slot || 0)
    } : {
      actorId: actorId || null,
      actorName: '',
      actorSide: null,
      actorSlot: 0
    };
  }

  function activeRecorder(engine) {
    return engine.__turnActionRecorder || null;
  }

  function appendAllyStep(engine, action, kind, invoke) {
    const recorder = activeRecorder(engine);
    if (!recorder) return invoke();
    const before = snapshot(engine);
    const actor = actorInfo(engine, action && action.actorId);
    const result = invoke();
    const after = snapshot(engine);
    recorder.steps.push({
      phase: 'ally',
      kind,
      card: action && action.card || null,
      position: Number(action && action.position || 0),
      ...actor,
      before,
      after,
      result
    });
    return result;
  }

  function finalizeEnemyStep(engine) {
    const recorder = activeRecorder(engine);
    if (!recorder || !recorder.currentEnemy) return;
    const current = recorder.currentEnemy;
    recorder.steps.push({
      ...current,
      after: snapshot(engine)
    });
    recorder.currentEnemy = null;
  }

  function normalizeTimeline(timeline) {
    let allyOrder = 0;
    let enemyOrder = 0;
    let displayedStars = 0;
    timeline.steps.forEach((step, index) => {
      if (step.phase === 'ally') {
        if (step.kind !== 'extra') allyOrder += 1;
        step.phaseOrder = step.kind === 'extra' ? allyOrder + 1 : allyOrder;
      } else if (step.phase === 'enemy') {
        enemyOrder += 1;
        step.phaseOrder = enemyOrder;
      }
      step.sequenceIndex = index + 1;
      step.phaseLabel = phaseLabel(step.phase);
      step.actionLabel = actionLabel(step);
      const actualAfter = starPool(step.after, timeline.before);
      step.starBefore = displayedStars;
      step.starAfter = Math.max(displayedStars, actualAfter);
      step.starGain = Math.max(0, step.starAfter - step.starBefore);
      displayedStars = step.starAfter;
    });
    timeline.allyActionCount = timeline.steps.filter((step) => step.phase === 'ally' && step.kind !== 'extra').length;
    timeline.enemyActionCount = timeline.steps.filter((step) => step.phase === 'enemy').length;
    timeline.starGain = displayedStars;
    return timeline;
  }

  const originalExecuteCard = proto._executeCard;
  proto._executeCard = function (action, chainContext) {
    return appendAllyStep(this, action, 'card', () =>
      originalExecuteCard.call(this, action, chainContext)
    );
  };

  const originalExecuteNp = proto._executeNp;
  proto._executeNp = function (action, chainContext, precedingNps) {
    return appendAllyStep(this, action, 'np', () =>
      originalExecuteNp.call(this, action, chainContext, precedingNps)
    );
  };

  const originalExecuteExtra = proto._executeExtra;
  proto._executeExtra = function (actorId, chainContext, selectedActions) {
    const action = { type: 'extra', actorId, card: 'extra', position: 3 };
    return appendAllyStep(this, action, 'extra', () =>
      originalExecuteExtra.call(this, actorId, chainContext, selectedActions)
    );
  };

  const originalRunEffectHooks = proto._runEffectHooks;
  if (typeof originalRunEffectHooks === 'function') {
    proto._runEffectHooks = function (eventName, context) {
      if (eventName === 'beforeEnemyAction' && activeRecorder(this)) {
        finalizeEnemyStep(this);
        const actor = context && context.actor;
        const contextNp = context && typeof context.isNp === 'boolean' ? context.isNp : null;
        this.__turnActionRecorder.currentEnemy = {
          phase: 'enemy',
          kind: 'enemyAttack',
          isNp: contextNp == null
            ? Boolean(actor && actor.chargeMax > 0 && actor.charge >= actor.chargeMax)
            : contextNp,
          ...actorInfo(this, actor && actor.id),
          before: snapshot(this),
          prevented: false
        };
      }
      const result = originalRunEffectHooks.call(this, eventName, context);
      if (
        eventName === 'beforeEnemyAction' &&
        activeRecorder(this) &&
        this.__turnActionRecorder.currentEnemy &&
        result && result.prevented
      ) {
        this.__turnActionRecorder.currentEnemy.prevented = true;
      }
      return result;
    };
  }

  const originalExecuteCommandChain = proto.executeCommandChain;
  proto.executeCommandChain = function () {
    const before = snapshot(this);
    const selectedActions = (this.getState().selectedActions || []).map((action) => ({ ...action }));
    const recorder = {
      before,
      after: null,
      selectedActions,
      steps: [],
      currentEnemy: null
    };
    this.__turnActionRecorder = recorder;
    let result;
    try {
      result = originalExecuteCommandChain.apply(this, arguments);
      return result;
    } finally {
      finalizeEnemyStep(this);
      recorder.after = snapshot(this);
      recorder.result = result;
      this.__lastTurnActionTimeline = normalizeTimeline(recorder);
      this.__turnActionRecorder = null;
    }
  };

  proto.getLastTurnActionTimeline = function () {
    return this.__lastTurnActionTimeline || null;
  };

  const API = {
    STAR_CAP,
    starPool,
    phaseLabel,
    actionLabel,
    normalizeTimeline
  };

  global.FGO_TURN_ACTION_TIMELINE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
