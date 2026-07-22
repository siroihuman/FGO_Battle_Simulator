(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const ENEMY_DEFAULTS = global.FGO_ENEMY_CLASS_DEFAULTS ||
    (typeof require !== 'undefined' ? require('./enemy-class-defaults.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine || !ENEMY_DEFAULTS) {
    throw new Error('enemy action defaults require engine and enemy class defaults.');
  }

  const OriginalBattleEngine = ENGINE.BattleEngine;
  const STORAGE_KEY = ENEMY_DEFAULTS.storageKey || 'fgoEnemyClassSettingsV1';
  const ACTION_DEFAULTS = {
    saber: { actionCount: 3, actionPriority: 50 },
    archer: { actionCount: 3, actionPriority: 50 },
    lancer: { actionCount: 3, actionPriority: 150 },
    rider: { actionCount: 3, actionPriority: 50 },
    caster: { actionCount: 2, actionPriority: 25 },
    assassin: { actionCount: 3, actionPriority: 100 },
    berserker: { actionCount: 2, actionPriority: 50 },
    shielder: { actionCount: 3, actionPriority: 50 },
    ruler: { actionCount: 3, actionPriority: 50 },
    avenger: { actionCount: 3, actionPriority: 200 },
    alterEgo: { actionCount: 3, actionPriority: 100 },
    moonCancer: { actionCount: 3, actionPriority: 20 },
    foreigner: { actionCount: 3, actionPriority: 25 },
    pretender: { actionCount: 3, actionPriority: 50 }
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const numeric = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function actionDefaults(classId) {
    const value = ACTION_DEFAULTS[String(classId || '')];
    return value ? { ...value } : null;
  }

  function loadSettings() {
    if (typeof localStorage === 'undefined') return {};
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  }

  function saveSettings(settings) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings || {}));
  }

  function key(waveIndex, enemyIndex) {
    return `${waveIndex}:${enemyIndex}`;
  }

  function controlName(waveIndex, enemyIndex, suffix) {
    return `w${waveIndex}e${enemyIndex}${suffix}`;
  }

  function control(waveIndex, enemyIndex, suffix) {
    if (typeof document === 'undefined') return null;
    return document.querySelector(`[name="${controlName(waveIndex, enemyIndex, suffix)}"]`);
  }

  function setupWaveIndices() {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('input[name^="w"][name$="enabled"]'))
      .filter((input) => input.checked)
      .map((input) => {
        const match = /^w(\d+)enabled$/.exec(input.name);
        return match ? Number(match[1]) : null;
      })
      .filter((value) => value != null);
  }

  function enrichActionConfig(config) {
    const result = clone(config || {});
    const settings = loadSettings();
    const setupIndices = setupWaveIndices();
    (result.waves || []).forEach((wave, waveIndex) => {
      const setupWaveIndex = setupIndices[waveIndex] == null ? waveIndex : setupIndices[waveIndex];
      (wave.enemies || []).forEach((enemy, enemyIndex) => {
        const stateKey = key(setupWaveIndex, enemyIndex);
        const state = { ...(settings[stateKey] || {}) };
        const classInput = control(setupWaveIndex, enemyIndex, 'class');
        const manualInput = control(setupWaveIndex, enemyIndex, 'statsManual');
        const countInput = control(setupWaveIndex, enemyIndex, 'ac');
        const priorityInput = control(setupWaveIndex, enemyIndex, 'ap');
        const classId = classInput ? classInput.value : (enemy.classId || state.classId || 'archer');
        const defaults = actionDefaults(classId);
        const manual = manualInput ? manualInput.checked : Boolean(
          state.statsManual != null ? state.statsManual : enemy.classStatsManual
        );

        state.classId = classId;
        state.statsManual = manual;
        state.actionCount = countInput
          ? numeric(countInput.value, numeric(enemy.actionCount, defaults ? defaults.actionCount : 1))
          : numeric(state.actionCount, numeric(enemy.actionCount, defaults ? defaults.actionCount : 1));
        state.actionPriority = priorityInput
          ? numeric(priorityInput.value, numeric(enemy.actionPriority, defaults ? defaults.actionPriority : 0))
          : numeric(state.actionPriority, numeric(enemy.actionPriority, defaults ? defaults.actionPriority : 0));
        settings[stateKey] = state;

        if (defaults && !manual) {
          enemy.actionCount = defaults.actionCount;
          enemy.actionPriority = defaults.actionPriority;
        } else {
          enemy.actionCount = clamp(state.actionCount, 0, 3);
          enemy.actionPriority = Math.max(0, Math.floor(numeric(state.actionPriority, 0)));
        }
      });
    });
    saveSettings(settings);
    return result;
  }

  class EnemyActionDefaultBattleEngine extends OriginalBattleEngine {
    constructor(config) {
      super(enrichActionConfig(config));
      global.FGO_ACTIVE_BATTLE_ENGINE = this;
    }

    _createEnemy(enemy, index) {
      const unit = super._createEnemy(enemy, index);
      const defaults = actionDefaults(enemy && enemy.classId);
      unit.actionCount = clamp(numeric(enemy && enemy.actionCount, defaults ? defaults.actionCount : 1), 0, 3);
      unit.actionPriority = Math.max(0, Math.floor(numeric(
        enemy && enemy.actionPriority,
        defaults ? defaults.actionPriority : 0
      )));
      return unit;
    }

    _enemyActionOrder() {
      const enemies = this.getAliveEnemies()
        .slice()
        .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
      const order = [];
      const used = new Map(enemies.map((enemy) => [enemy, 0]));
      const partyActionLimit = 3;

      enemies.forEach((enemy) => {
        if (order.length >= partyActionLimit || Number(enemy.actionCount || 0) <= 0) return;
        order.push(enemy);
        used.set(enemy, 1);
      });

      while (order.length < partyActionLimit) {
        const candidates = enemies
          .filter((enemy) => enemy.alive && Number(used.get(enemy) || 0) < Number(enemy.actionCount || 0))
          .sort((a, b) =>
            Number(b.actionPriority || 0) - Number(a.actionPriority || 0) ||
            Number(a.slot || 0) - Number(b.slot || 0)
          );
        if (!candidates.length) break;
        const enemy = candidates[0];
        order.push(enemy);
        used.set(enemy, Number(used.get(enemy) || 0) + 1);
      }
      return order;
    }

    _performEnemyTurn() {
      const previousResolving = this._resolvingEnemyAttackAction;
      this._resolvingEnemyAttackAction = true;
      try {
        this.state.phase = 'enemy';
        this._log('敵フェイズ。', 'enemy');
        const actions = this._enemyActionOrder();
        for (const enemy of actions) {
          if (!this.getAliveAllies().length) break;
          if (!enemy.alive || enemy.hp <= 0) continue;
          const isNp = enemy.chargeMax > 0 && enemy.charge >= enemy.chargeMax;
          const prevention = typeof this._runEffectHooks === 'function'
            ? this._runEffectHooks('beforeEnemyAction', { actor: enemy, isNp })
            : null;
          if (prevention && prevention.prevented) continue;
          const targets = isNp && enemy.npTarget === 'all'
            ? this.getAliveAllies().slice()
            : [this.getAliveAllies()[Math.floor(this.rng() * this.getAliveAllies().length)]];
          if (isNp) {
            enemy.charge = 0;
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
              const receivedNp = ENGINE.floor2(
                ally.data.nd * receivedHits * Math.max(0, numeric(enemy.atdr, 1))
              );
              ally.np = Math.max(0, Math.min(300, ally.np + receivedNp));
              this._log(`${ally.name}は${damage.toLocaleString('ja-JP')}ダメージ${critical ? '（CRITICAL）' : ''}、被ダメージNP+${receivedNp.toFixed(2)}。`, critical ? 'critical' : 'damage');
              if (isNp) this._applyInstantDeath(enemy, ally);
            }
          });
          if (!isNp && enemy.alive && enemy.chargeMax > 0) {
            enemy.charge = Math.min(enemy.chargeMax, enemy.charge + 1);
          }
        }

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
    }
  }

  ENGINE.BattleEngine = EnemyActionDefaultBattleEngine;

  function parseIndices(name) {
    const match = /^w(\d+)e(\d+)class$/.exec(String(name || ''));
    return match ? { waveIndex: Number(match[1]), enemyIndex: Number(match[2]) } : null;
  }

  function ensureField(grid, waveIndex, enemyIndex, suffix, labelText, value) {
    let input = control(waveIndex, enemyIndex, suffix);
    if (input) return input;
    const label = document.createElement('label');
    label.className = 'enemy-class-extra-field';
    label.append(document.createTextNode(labelText));
    input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    input.name = controlName(waveIndex, enemyIndex, suffix);
    input.value = String(value);
    label.appendChild(input);
    grid.appendChild(label);
    return input;
  }

  function applyCardState(card, settings) {
    const classInput = card.querySelector('select[name$="class"]');
    if (!classInput) return;
    const indices = parseIndices(classInput.name);
    if (!indices) return;
    const { waveIndex, enemyIndex } = indices;
    const stateKey = key(waveIndex, enemyIndex);
    const state = settings[stateKey] || {};
    const defaults = actionDefaults(classInput.value);
    const manualInput = control(waveIndex, enemyIndex, 'statsManual');
    const countInput = control(waveIndex, enemyIndex, 'ac');
    const priorityInput = control(waveIndex, enemyIndex, 'ap');
    const manual = Boolean(manualInput && manualInput.checked);
    const automatic = Boolean(defaults && !manual);

    if (countInput) {
      countInput.min = '0';
      countInput.max = '3';
      countInput.disabled = automatic;
      countInput.value = String(automatic ? defaults.actionCount : numeric(state.actionCount, countInput.value));
    }
    if (priorityInput) {
      priorityInput.min = '0';
      priorityInput.disabled = automatic;
      priorityInput.value = String(automatic ? defaults.actionPriority : numeric(state.actionPriority, priorityInput.value));
    }

    let note = card.querySelector('.enemy-action-default-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'enemy-action-default-note span-3 enemy-class-default-note';
      card.querySelector('.setup-grid-3')?.appendChild(note);
    }
    if (note) {
      note.textContent = defaults
        ? `行動自動値：最大${defaults.actionCount}回／優先度${defaults.actionPriority}（敵全体では1ターン最大3回）`
        : '行動回数・優先度のクラス固定値がないため、入力値を使用します。';
    }
  }

  function installCard(card, settings) {
    const classInput = card.querySelector('select[name$="class"]');
    if (!classInput || card.dataset.enemyActionDefaultsInstalled === '1') return;
    const indices = parseIndices(classInput.name);
    if (!indices) return;
    const { waveIndex, enemyIndex } = indices;
    const manualInput = control(waveIndex, enemyIndex, 'statsManual');
    if (!manualInput) return;

    card.dataset.enemyActionDefaultsInstalled = '1';
    const stateKey = key(waveIndex, enemyIndex);
    const defaults = actionDefaults(classInput.value);
    const initial = settings[stateKey] || {};
    const grid = card.querySelector('.setup-grid-3');
    const countInput = ensureField(
      grid, waveIndex, enemyIndex, 'ac', '行動回数',
      numeric(initial.actionCount, defaults ? defaults.actionCount : 1)
    );
    const priorityInput = ensureField(
      grid, waveIndex, enemyIndex, 'ap', '行動優先度',
      numeric(initial.actionPriority, defaults ? defaults.actionPriority : 0)
    );

    const persist = () => {
      const state = settings[stateKey] || {};
      state.statsManual = Boolean(manualInput.checked);
      state.actionCount = numeric(countInput.value, state.actionCount == null ? 1 : state.actionCount);
      state.actionPriority = numeric(priorityInput.value, state.actionPriority == null ? 0 : state.actionPriority);
      settings[stateKey] = state;
      saveSettings(settings);
    };

    [countInput, priorityInput].forEach((input) => input.addEventListener('input', persist));
    manualInput.addEventListener('change', () => {
      persist();
      applyCardState(card, settings);
      persist();
    });
    classInput.addEventListener('change', () => {
      persist();
      applyCardState(card, settings);
      persist();
    });
    applyCardState(card, settings);
    persist();
  }

  function installUi() {
    if (typeof document === 'undefined') return;
    const settings = loadSettings();
    document.querySelectorAll('.enemy-setup-card').forEach((card) => installCard(card, settings));
  }

  if (typeof document !== 'undefined') {
    const root = document.getElementById('app');
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      const run = () => {
        scheduled = false;
        installUi();
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
      else setTimeout(run, 0);
    };
    if (root) {
      new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
      schedule();
    }
  }

  const API = {
    storageKey: STORAGE_KEY,
    actionDefaults,
    actionDefaultTable: clone(ACTION_DEFAULTS),
    enrichActionConfig,
    BattleEngine: EnemyActionDefaultBattleEngine,
    partyActionLimit: 3
  };

  global.FGO_ENEMY_ACTION_DEFAULTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
