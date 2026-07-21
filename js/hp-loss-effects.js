(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('hp loss effects require engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__hpLossEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_HP_LOSS_EFFECTS;
    return;
  }
  proto.__hpLossEffectsInstalled = true;

  const clampIndex = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));

  function resolveValue(effect, context) {
    const detail = context || {};
    if (Array.isArray(effect.values)) {
      return Number(effect.values[clampIndex(detail.level || 10, 1, 10) - 1] || 0);
    }
    if (Array.isArray(effect.ocValues)) {
      return Number(effect.ocValues[clampIndex(detail.oc || 1, 1, 5) - 1] || 0);
    }
    return Number(effect.value || 0);
  }

  function isAlive(unit) {
    return Boolean(unit && unit.alive && Number(unit.hp || 0) > 0);
  }

  proto._synchronizeAfterFatalHpLoss = function (target) {
    if (!target || target.alive || !this.state.allies.includes(target)) {
      return { promoted: false, defeated: false };
    }

    const deadId = target.id;
    this.state.hand = (this.state.hand || []).filter((card) => card.actorId !== deadId);
    this.state.deck = (this.state.deck || []).filter((card) => card.actorId !== deadId);
    this.state.selectedActions = (this.state.selectedActions || []).filter((action) => action.actorId !== deadId);

    const frontlineBefore = this.getAliveAllies().length;
    const hasReserve = this.state.allies.some((unit) => isAlive(unit) && !unit.frontline);
    if (frontlineBefore < 3 && hasReserve && typeof this._promoteReserve === 'function') {
      this._promoteReserve();
    }

    const anyAllyAlive = this.state.allies.some(isAlive);
    if (!anyAllyAlive) {
      // 最終Waveの敵撃破と同時に自滅した場合も、後続の勝利処理で上書きされないよう記録する。
      this.state._fatalHpLossDefeat = true;
      if (this.state.winner !== 'enemies') {
        this.state.winner = 'enemies';
        this.state.phase = 'finished';
        this._log('敗北。', 'defeat');
      }
    }

    return {
      promoted: this.getAliveAllies().length > frontlineBefore,
      defeated: !anyAllyAlive
    };
  };

  proto._applyHpLoss = function (target, effect, value, source) {
    if (!target || !target.alive) {
      return { applied: false, reason: 'invalidTarget', target };
    }

    const amount = Math.max(0, Math.floor(Number(value || 0)));
    const before = Math.max(0, Math.floor(Number(target.hp || 0)));

    if (effect.nonLethal === true) {
      const after = Math.max(1, before - amount);
      const actualLoss = Math.max(0, before - after);
      target.hp = after;
      this._log(`${target.name}のHPが${actualLoss}減少（${before}→${after}／非致死）。`, 'damage');
      return {
        applied: true,
        nonLethal: true,
        target,
        requestedLoss: amount,
        actualLoss,
        hpBefore: before,
        hpAfter: after,
        guts: false,
        defeated: false
      };
    }

    const hpAtZero = Math.max(0, before - amount);
    const actualLoss = Math.min(before, amount);
    this._log(`${target.name}のHPが${actualLoss}減少（${before}→${hpAtZero}）。`, 'damage');

    // HP減少は攻撃ダメージではないため、防御力・ダメージカット・回避・無敵・
    // 対粛正防御を参照せず、既存のガッツ・戦闘不能処理へ直接接続する。
    const result = this._takeDamage(target, amount, effect.sourceLabel || 'HP減少');
    const synchronization = target.alive
      ? { promoted: false, defeated: false }
      : this._synchronizeAfterFatalHpLoss(target);

    return {
      applied: true,
      nonLethal: false,
      target,
      source,
      requestedLoss: amount,
      actualLoss,
      hpBefore: before,
      hpAfter: target.hp,
      guts: Boolean(result && result.guts),
      defeated: !target.alive,
      synchronization
    };
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || effect.type !== 'hpLoss') {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    // フィールド条件ランタイムより後に読み込まれた場合も、条件不成立時は
    // 既存の共通条件処理へ委譲して成功扱いにしない。
    if (effect.condition && typeof this._conditionMet === 'function' &&
        !this._conditionMet(effect.condition, { effect, source, selectedTargetId, context: context || {} })) {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const value = resolveValue(effect, context);
    const targets = this._effectTargets(effect, source, selectedTargetId);
    const results = targets.map((target) => this._applyHpLoss(target, effect, value, source));
    return {
      applied: results.some((result) => result.applied),
      results
    };
  };

  // 致死性HP減少で既に敗北が確定した場合、敵フェイズを重複実行しない。
  const originalPerformEnemyTurn = proto._performEnemyTurn;
  proto._performEnemyTurn = function () {
    if (this.state.winner) return { skipped: true, winner: this.state.winner };
    return originalPerformEnemyTurn.apply(this, arguments);
  };

  // 最終敵を倒した宝具のデメリットで最後の味方も倒れた場合は、敗北を優先する。
  const originalExecuteCommandChain = proto.executeCommandChain;
  proto.executeCommandChain = function () {
    const result = originalExecuteCommandChain.apply(this, arguments);
    if (!this.state._fatalHpLossDefeat) return result;

    this.state.winner = 'enemies';
    this.state.phase = 'finished';
    this.state.logs = (this.state.logs || []).filter((entry) => entry.kind !== 'victory');
    if (!this.state.logs.some((entry) => entry.message === '敗北。')) {
      this._log('敗北。', 'defeat');
    }
    return {
      ...(result && typeof result === 'object' ? result : {}),
      ok: result && result.ok === false ? false : true,
      finished: true,
      winner: 'enemies'
    };
  };

  const API = {
    modes: {
      nonLethal: 'HP1で停止し、ガッツ・戦闘不能判定を行わない',
      lethal: 'HP0到達時に既存のガッツ・戦闘不能・敗北処理へ接続する'
    },
    defeatPriority: '最後の味方が致死性HP減少で倒れた場合は、同時に最終敵を倒していても敗北を維持する',
    resolveValue
  };

  global.FGO_SIM_HP_LOSS_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
