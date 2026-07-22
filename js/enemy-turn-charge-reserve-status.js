(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('enemy turn charge and reserve status runtime requires engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__enemyTurnChargeReserveStatusInstalled) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_ENEMY_TURN_CHARGE_RESERVE_STATUS;
    }
    return;
  }
  proto.__enemyTurnChargeReserveStatusInstalled = true;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  function isActiveStatus(status) {
    if (!status) return false;
    const turnsRemain = status.remaining == null || status.remaining < 0 || status.remaining > 0;
    const usesRemain = status.uses == null || status.uses > 0;
    return turnsRemain && usesRemain;
  }

  function hasActiveStatus(unit, type) {
    return Boolean(unit && (unit.statuses || []).some((status) =>
      status.type === type && isActiveStatus(status)
    ));
  }

  function isReserveAlly(engine, unit) {
    return Boolean(
      engine && engine.state && Array.isArray(engine.state.allies) &&
      engine.state.allies.includes(unit) && unit && unit.frontline === false
    );
  }

  proto._isEnemyNpSealed = function (enemy) {
    return hasActiveStatus(enemy, 'npSeal');
  };

  proto._advanceEnemyChargeOncePerTurn = function (enemies, usedNpEnemies) {
    const usedNp = usedNpEnemies || new Set();
    (enemies || []).forEach((enemy) => {
      if (!enemy || !enemy.alive || Number(enemy.hp || 0) <= 0) return;
      const chargeMax = Math.max(0, Number(enemy.chargeMax || 0));
      if (chargeMax <= 0 || usedNp.has(enemy) || this._isEnemyNpSealed(enemy)) return;
      enemy.charge = Math.min(chargeMax, Math.max(0, Number(enemy.charge || 0)) + 1);
    });
  };

  // 敵のチャージは行動回数ではなくターン単位で進行する。
  // 宝具使用ターンは0へ戻したままとし、宝具封印中は宝具使用とチャージ増加を両方停止する。
  proto._performEnemyTurn = function () {
    const previousResolving = this._resolvingEnemyAttackAction;
    this._resolvingEnemyAttackAction = true;
    try {
      this.state.phase = 'enemy';
      this._log('敵フェイズ。', 'enemy');

      const livingAtTurnStart = this.getAliveEnemies().slice();
      const actions = typeof this._enemyActionOrder === 'function'
        ? this._enemyActionOrder()
        : livingAtTurnStart;
      const usedNpEnemies = new Set();

      for (const enemy of actions) {
        if (!this.getAliveAllies().length) break;
        if (!enemy || !enemy.alive || Number(enemy.hp || 0) <= 0) continue;

        const isNp = Number(enemy.chargeMax || 0) > 0 &&
          Number(enemy.charge || 0) >= Number(enemy.chargeMax || 0) &&
          !this._isEnemyNpSealed(enemy);
        const prevention = typeof this._runEffectHooks === 'function'
          ? this._runEffectHooks('beforeEnemyAction', { actor: enemy, isNp })
          : null;
        if (prevention && prevention.prevented) continue;

        const allies = this.getAliveAllies();
        if (!allies.length) break;
        const targets = isNp && enemy.npTarget === 'all'
          ? allies.slice()
          : [allies[Math.floor(this.rng() * allies.length)]];

        if (isNp) {
          enemy.charge = 0;
          usedNpEnemies.add(enemy);
          this._log(`${enemy.name}が宝具を使用。`, 'enemyNp');
        }

        targets.forEach((ally) => {
          if (!ally || !ally.alive) return;
          if (this._canAvoid(ally, enemy, isNp)) {
            const defenseName = this._lastDefenseStatus && this._lastDefenseStatus.type
              ? this._lastDefenseStatus.type
              : '回避';
            this._log(`${ally.name}は${enemy.name}の攻撃を防いだ（${defenseName}）。`, 'evade');
            return;
          }

          const criticalChance = typeof this._enemyCriticalChance === 'function'
            ? this._enemyCriticalChance(enemy, ally, isNp)
            : Math.max(0, Number(enemy.critRate || 0) - this._statusTotal(enemy, 'critRateDown'));
          const critical = !isNp && this.rng() * 100 < criticalChance;
          const damage = this._enemyAttackDamage(enemy, ally, isNp, critical);
          this._takeDamage(ally, damage, enemy.name);

          if (ally.alive) {
            const receivedHits = isNp ? 3 : 1;
            const atdr = Math.max(0, Number(enemy.atdr == null ? 1 : enemy.atdr));
            const receivedNp = ENGINE.floor2(ally.data.nd * receivedHits * atdr);
            ally.np = clamp(Number(ally.np || 0) + receivedNp, 0, 300);
            this._log(
              `${ally.name}は${damage.toLocaleString('ja-JP')}ダメージ${critical ? '（CRITICAL）' : ''}、被ダメージNP+${receivedNp.toFixed(2)}。`,
              critical ? 'critical' : 'damage'
            );
            if (isNp) this._applyInstantDeath(enemy, ally);
          }
        });
      }

      this._advanceEnemyChargeOncePerTurn(livingAtTurnStart, usedNpEnemies);

      if (!this.getAliveAllies().length) this._promoteReserve();
      if (!this.getAliveAllies().length) {
        this.state.winner = 'enemies';
        this.state.phase = 'finished';
        this._log('敗北。', 'defeat');
        return;
      }
      this._finishTurn();
    } finally {
      this._resolvingEnemyAttackAction = previousResolving;
    }
  };

  // 控えにいる間は強化・弱体状態の残りターンを進めない。
  // 前衛へ出た後は従来どおりターン終了時に減少する。
  const originalRemoveExpiredStatuses = proto._removeExpiredStatuses;
  proto._removeExpiredStatuses = function (unit) {
    if (isReserveAlly(this, unit)) return unit.statuses || [];
    return originalRemoveExpiredStatuses.call(this, unit);
  };

  const API = {
    npSealStatusType: 'npSeal',
    chargeTiming: 'oncePerEnemyPerTurnAfterActions',
    chargeBlockedByNpSeal: true,
    chargeIndependentOfActionCount: true,
    reserveStatusDurationFrozen: true,
    isActiveStatus,
    hasActiveStatus,
    isReserveAlly
  };

  global.FGO_ENEMY_TURN_CHARGE_RESERVE_STATUS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
