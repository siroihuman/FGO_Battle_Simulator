(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine) {
    throw new Error('enemy class defaults require data and engine.');
  }

  const OriginalBattleEngine = ENGINE.BattleEngine;
  const STORAGE_KEY = 'fgoEnemyClassSettingsV1';
  const SERVANT_TRAIT = 'サーヴァント';
  const CLASS_DEFAULTS = {
    saber:      { chargeMax: 4, critRate: 10, dsr: 0,   dtdr: 1.00, atdr: 1.00 },
    archer:     { chargeMax: 3, critRate: 20, dsr: 5,   dtdr: 1.00, atdr: 1.00 },
    lancer:     { chargeMax: 4, critRate: 10, dsr: -5,  dtdr: 1.00, atdr: 1.00 },
    rider:      { chargeMax: 5, critRate: 15, dsr: 10,  dtdr: 1.10, atdr: 1.10 },
    caster:     { chargeMax: 5, critRate: 10, dsr: 0,   dtdr: 1.20, atdr: 1.20 },
    assassin:   { chargeMax: 3, critRate: 30, dsr: -10, dtdr: 0.90, atdr: 0.90 },
    berserker:  { chargeMax: 5, critRate: 10, dsr: 0,   dtdr: 0.80, atdr: 0.80 },
    shielder:   { chargeMax: 4, critRate: 10, dsr: 0,   dtdr: 1.00, atdr: 1.00 },
    ruler:      { chargeMax: 4, critRate: 10, dsr: 0,   dtdr: 1.00, atdr: 1.00 },
    avenger:    { chargeMax: 5, critRate: 10, dsr: -10, dtdr: 1.00, atdr: 1.00 },
    alterEgo:   { chargeMax: 3, critRate: 10, dsr: 5,   dtdr: 1.00, atdr: 1.00 },
    moonCancer: { chargeMax: 3, critRate: 10, dsr: 0,   dtdr: 1.20, atdr: 1.20 },
    foreigner:  { chargeMax: 5, critRate: 20, dsr: 20,  dtdr: 1.00, atdr: 1.00 },
    pretender:  { chargeMax: 4, critRate: 30, dsr: -10, dtdr: 1.00, atdr: 1.00 }
  };

  const DEFAULT_DSR = Object.fromEntries(
    Object.entries(CLASS_DEFAULTS).map(([classId, values]) => [classId, Number(values.dsr || 0)])
  );

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const numeric = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  function classDefaults(classId) {
    const value = CLASS_DEFAULTS[String(classId || '')];
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

  function settingKey(waveIndex, enemyIndex) {
    return `${waveIndex}:${enemyIndex}`;
  }

  function splitTraits(value) {
    return String(value || '')
      .split(/[\/／,，\n]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function setServantTrait(traits, enabled) {
    const result = (traits || []).filter((trait) => String(trait || '').trim() !== SERVANT_TRAIT);
    if (enabled) result.unshift(SERVANT_TRAIT);
    return [...new Set(result)];
  }

  function parseSetupIndices(name) {
    const match = /^w(\d+)e(\d+)class$/.exec(String(name || ''));
    return match ? { waveIndex: Number(match[1]), enemyIndex: Number(match[2]) } : null;
  }

  function controlName(waveIndex, enemyIndex, suffix) {
    return `w${waveIndex}e${enemyIndex}${suffix}`;
  }

  function queryControl(waveIndex, enemyIndex, suffix) {
    if (typeof document === 'undefined') return null;
    return document.querySelector(`[name="${controlName(waveIndex, enemyIndex, suffix)}"]`);
  }

  function settingFromDom(waveIndex, enemyIndex, enemy, stored) {
    const state = { ...(stored || {}) };
    const classInput = queryControl(waveIndex, enemyIndex, 'class');
    const traitInput = queryControl(waveIndex, enemyIndex, 'traits');
    const servantInput = queryControl(waveIndex, enemyIndex, 'servant');
    const chargeManualInput = queryControl(waveIndex, enemyIndex, 'chargeManual');
    const statsManualInput = queryControl(waveIndex, enemyIndex, 'statsManual');
    const chargeInput = queryControl(waveIndex, enemyIndex, 'cm');
    const dtdrInput = queryControl(waveIndex, enemyIndex, 'dtdr');
    const critInput = queryControl(waveIndex, enemyIndex, 'cr');
    const dsrInput = queryControl(waveIndex, enemyIndex, 'dsr');
    const atdrInput = queryControl(waveIndex, enemyIndex, 'atdr');

    state.classId = classInput ? classInput.value : (enemy.classId || state.classId || 'archer');
    const sourceTraits = traitInput ? splitTraits(traitInput.value) : (enemy.traits || []);
    state.servant = servantInput ? servantInput.checked : Boolean(
      state.servant != null ? state.servant :
        (enemy.servantEnemy != null ? enemy.servantEnemy : sourceTraits.includes(SERVANT_TRAIT))
    );
    state.chargeManual = chargeManualInput ? chargeManualInput.checked : Boolean(
      state.chargeManual != null ? state.chargeManual : enemy.chargeManual
    );
    state.statsManual = statsManualInput ? statsManualInput.checked : Boolean(
      state.statsManual != null ? state.statsManual : enemy.classStatsManual
    );
    state.chargeMax = chargeInput ? numeric(chargeInput.value, numeric(enemy.chargeMax, 3)) : numeric(state.chargeMax, numeric(enemy.chargeMax, 3));
    state.dtdr = dtdrInput ? numeric(dtdrInput.value, numeric(enemy.dtdr, 1)) : numeric(state.dtdr, numeric(enemy.dtdr, 1));
    state.critRate = critInput ? numeric(critInput.value, numeric(enemy.critRate, 10)) : numeric(state.critRate, numeric(enemy.critRate, 10));
    state.dsr = dsrInput ? numeric(dsrInput.value, numeric(enemy.dsr, 0)) : numeric(state.dsr, numeric(enemy.dsr, 0));
    state.atdr = atdrInput ? numeric(atdrInput.value, numeric(enemy.atdr, state.dtdr)) : numeric(state.atdr, numeric(enemy.atdr, state.dtdr));
    return state;
  }

  function resolveEnemyConfig(enemy, state) {
    const resolved = { ...(enemy || {}) };
    const defaults = classDefaults(state.classId || resolved.classId);
    resolved.classId = state.classId || resolved.classId || 'archer';
    resolved.servantEnemy = Boolean(state.servant);
    resolved.chargeManual = Boolean(state.chargeManual);
    resolved.classStatsManual = Boolean(state.statsManual);
    resolved.traits = setServantTrait(
      Array.isArray(resolved.traits) ? resolved.traits : splitTraits(resolved.traitText),
      resolved.servantEnemy
    );
    resolved.traitText = resolved.traits.join(' / ');

    if (defaults && !resolved.chargeManual) resolved.chargeMax = defaults.chargeMax;
    else resolved.chargeMax = clamp(state.chargeMax, 0, 10);

    if (defaults && !resolved.classStatsManual) {
      resolved.dtdr = defaults.dtdr;
      resolved.atdr = defaults.atdr;
      resolved.dsr = defaults.dsr;
      resolved.critRate = defaults.critRate;
    } else {
      resolved.dtdr = Math.max(0, numeric(state.dtdr, 1));
      resolved.atdr = Math.max(0, numeric(state.atdr, resolved.dtdr));
      resolved.dsr = numeric(state.dsr, defaults ? defaults.dsr : 0);
      resolved.critRate = clamp(state.critRate, 0, 100);
    }
    return resolved;
  }

  function enrichBattleConfig(config) {
    const enriched = deepClone(config || {});
    const settings = loadSettings();
    const waves = Array.isArray(enriched.waves) ? enriched.waves : [];
    waves.forEach((wave, waveIndex) => {
      (wave.enemies || []).forEach((enemy, enemyIndex) => {
        const key = settingKey(waveIndex, enemyIndex);
        const state = settingFromDom(waveIndex, enemyIndex, enemy, settings[key]);
        settings[key] = state;
        wave.enemies[enemyIndex] = resolveEnemyConfig(enemy, state);
      });
    });
    saveSettings(settings);
    return enriched;
  }

  class EnemyClassDefaultBattleEngine extends OriginalBattleEngine {
    constructor(config) {
      super(enrichBattleConfig(config));
      global.FGO_ACTIVE_BATTLE_ENGINE = this;
    }

    _createEnemy(enemy, index) {
      const unit = super._createEnemy(enemy, index);
      const defaults = classDefaults(enemy && enemy.classId);
      unit.servantEnemy = Boolean(enemy && enemy.servantEnemy);
      unit.traits = setServantTrait(unit.traits, unit.servantEnemy);
      unit.chargeMax = clamp(enemy && enemy.chargeMax, 0, 10);
      unit.charge = unit.chargeMax <= 0 ? 0 : clamp(enemy && enemy.startingCharge, 0, unit.chargeMax);
      unit.dtdr = Math.max(0, numeric(enemy && enemy.dtdr, defaults ? defaults.dtdr : unit.dtdr));
      unit.atdr = Math.max(0, numeric(enemy && enemy.atdr, defaults ? defaults.atdr : unit.dtdr));
      unit.dsr = numeric(enemy && enemy.dsr, defaults ? defaults.dsr : 0);
      unit.critRate = clamp(numeric(enemy && enemy.critRate, defaults ? defaults.critRate : unit.critRate), 0, 100);
      return unit;
    }

    _starRatePerHit(actor, target, action, chainContext, overkill) {
      const base = super._starRatePerHit(actor, target, action, chainContext, overkill);
      if (!target || target.dsr == null) return base;
      const defaultDsr = numeric(DEFAULT_DSR[target.classId], 0);
      const delta = (numeric(target.dsr, defaultDsr) - defaultDsr) / 100;
      return Math.max(0, Math.min(3, ENGINE.floor3(base + delta)));
    }

    _performEnemyTurn() {
      const previousResolving = this._resolvingEnemyAttackAction;
      this._resolvingEnemyAttackAction = true;
      try {
        this.state.phase = 'enemy';
        this._log('敵フェイズ。', 'enemy');
        const enemies = this.getAliveEnemies().slice();
        for (const enemy of enemies) {
          if (!this.getAliveAllies().length) break;
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
              const receivedNp = ENGINE.floor2(ally.data.nd * receivedHits * Math.max(0, numeric(enemy.atdr, 1)));
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

  ENGINE.BattleEngine = EnemyClassDefaultBattleEngine;

  function formatNumber(value, digits) {
    const number = numeric(value, 0);
    return digits == null ? String(number) : number.toFixed(digits).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  function ensureExtraField(grid, waveIndex, enemyIndex, suffix, labelText, value, step) {
    let input = queryControl(waveIndex, enemyIndex, suffix);
    if (input) return input;
    const label = document.createElement('label');
    label.className = 'enemy-class-extra-field';
    label.append(document.createTextNode(labelText));
    input = document.createElement('input');
    input.type = 'number';
    input.name = controlName(waveIndex, enemyIndex, suffix);
    if (step != null) input.step = String(step);
    input.value = String(value);
    label.appendChild(input);
    grid.appendChild(label);
    return input;
  }

  function updateTraitInput(waveIndex, enemyIndex, servant) {
    const input = queryControl(waveIndex, enemyIndex, 'traits');
    if (!input) return;
    input.value = setServantTrait(splitTraits(input.value), servant).join(' / ');
  }

  function applySetupState(waveIndex, enemyIndex, card, settings) {
    const key = settingKey(waveIndex, enemyIndex);
    const state = settings[key] || {};
    const classInput = queryControl(waveIndex, enemyIndex, 'class');
    const defaults = classDefaults(classInput && classInput.value);
    const servantInput = queryControl(waveIndex, enemyIndex, 'servant');
    const chargeManualInput = queryControl(waveIndex, enemyIndex, 'chargeManual');
    const statsManualInput = queryControl(waveIndex, enemyIndex, 'statsManual');
    const chargeInput = queryControl(waveIndex, enemyIndex, 'cm');
    const dtdrInput = queryControl(waveIndex, enemyIndex, 'dtdr');
    const critInput = queryControl(waveIndex, enemyIndex, 'cr');
    const dsrInput = queryControl(waveIndex, enemyIndex, 'dsr');
    const atdrInput = queryControl(waveIndex, enemyIndex, 'atdr');
    const note = card.querySelector('.enemy-class-default-note');

    if (servantInput) servantInput.checked = Boolean(state.servant);
    if (chargeManualInput) chargeManualInput.checked = Boolean(state.chargeManual);
    if (statsManualInput) statsManualInput.checked = Boolean(state.statsManual);
    updateTraitInput(waveIndex, enemyIndex, Boolean(state.servant));

    const chargeAutomatic = Boolean(defaults && !state.chargeManual);
    const statsAutomatic = Boolean(defaults && !state.statsManual);
    if (chargeInput) {
      chargeInput.min = '0';
      chargeInput.max = '10';
      chargeInput.disabled = chargeAutomatic;
      chargeInput.value = formatNumber(chargeAutomatic ? defaults.chargeMax : numeric(state.chargeMax, chargeInput.value));
    }
    if (dtdrInput) {
      dtdrInput.disabled = statsAutomatic;
      dtdrInput.value = formatNumber(statsAutomatic ? defaults.dtdr : numeric(state.dtdr, dtdrInput.value), 2);
    }
    if (critInput) {
      critInput.disabled = statsAutomatic;
      critInput.value = formatNumber(statsAutomatic ? defaults.critRate : numeric(state.critRate, critInput.value));
    }
    if (dsrInput) {
      dsrInput.disabled = statsAutomatic;
      dsrInput.value = formatNumber(statsAutomatic ? defaults.dsr : numeric(state.dsr, dsrInput.value));
    }
    if (atdrInput) {
      atdrInput.disabled = statsAutomatic;
      atdrInput.value = formatNumber(statsAutomatic ? defaults.atdr : numeric(state.atdr, atdrInput.value), 2);
    }
    if (chargeManualInput) chargeManualInput.disabled = !defaults;
    if (statsManualInput) statsManualInput.disabled = !defaults;
    if (note) {
      note.textContent = defaults
        ? `自動値：チャージ${defaults.chargeMax}／DTDR${formatNumber(defaults.dtdr, 2)}／ATDR${formatNumber(defaults.atdr, 2)}／DSR${defaults.dsr >= 0 ? '+' : ''}${defaults.dsr}／クリ率${defaults.critRate}%`
        : 'このクラスには参照資料上の固定値がないため、入力値を使用します。';
    }
  }

  function installSetupCard(card, settings) {
    const classInput = card.querySelector('select[name$="class"]');
    if (!classInput || card.dataset.enemyClassDefaultsInstalled === '1') return;
    const indices = parseSetupIndices(classInput.name);
    if (!indices) return;
    const { waveIndex, enemyIndex } = indices;
    card.dataset.enemyClassDefaultsInstalled = '1';
    const key = settingKey(waveIndex, enemyIndex);
    const traitInput = queryControl(waveIndex, enemyIndex, 'traits');
    const defaults = classDefaults(classInput.value);
    const initialState = settings[key] || {};
    settings[key] = {
      servant: initialState.servant != null
        ? Boolean(initialState.servant)
        : splitTraits(traitInput && traitInput.value).includes(SERVANT_TRAIT),
      chargeManual: Boolean(initialState.chargeManual),
      statsManual: Boolean(initialState.statsManual),
      chargeMax: numeric(initialState.chargeMax, numeric(queryControl(waveIndex, enemyIndex, 'cm')?.value, defaults ? defaults.chargeMax : 3)),
      dtdr: numeric(initialState.dtdr, numeric(queryControl(waveIndex, enemyIndex, 'dtdr')?.value, defaults ? defaults.dtdr : 1)),
      atdr: numeric(initialState.atdr, defaults ? defaults.atdr : 1),
      dsr: numeric(initialState.dsr, defaults ? defaults.dsr : 0),
      critRate: numeric(initialState.critRate, numeric(queryControl(waveIndex, enemyIndex, 'cr')?.value, defaults ? defaults.critRate : 10))
    };

    const grid = card.querySelector('.setup-grid-3');
    const attrInput = queryControl(waveIndex, enemyIndex, 'attr');
    const toggleRow = document.createElement('div');
    toggleRow.className = 'enemy-class-toggle-row span-3';
    toggleRow.innerHTML = `
      <label class="toggle-label"><input name="${controlName(waveIndex, enemyIndex, 'servant')}" type="checkbox"><span>サーヴァント</span></label>
      <label class="toggle-label"><input name="${controlName(waveIndex, enemyIndex, 'chargeManual')}" type="checkbox"><span>チャージ設定</span></label>
      <label class="toggle-label"><input name="${controlName(waveIndex, enemyIndex, 'statsManual')}" type="checkbox"><span>クラス数値設定</span></label>`;
    const attrLabel = attrInput && attrInput.closest('label');
    if (attrLabel) attrLabel.insertAdjacentElement('afterend', toggleRow);
    else grid.prepend(toggleRow);

    ensureExtraField(grid, waveIndex, enemyIndex, 'dsr', 'DSR', settings[key].dsr, 1);
    ensureExtraField(grid, waveIndex, enemyIndex, 'atdr', 'ATDR', settings[key].atdr, 0.05);
    const dtdrLabel = queryControl(waveIndex, enemyIndex, 'dtdr')?.closest('label');
    if (dtdrLabel && dtdrLabel.firstChild) dtdrLabel.firstChild.textContent = 'DTDR';

    const note = document.createElement('p');
    note.className = 'enemy-class-default-note span-3';
    grid.appendChild(note);

    const persist = () => {
      const current = settings[key] || {};
      current.servant = Boolean(queryControl(waveIndex, enemyIndex, 'servant')?.checked);
      current.chargeManual = Boolean(queryControl(waveIndex, enemyIndex, 'chargeManual')?.checked);
      current.statsManual = Boolean(queryControl(waveIndex, enemyIndex, 'statsManual')?.checked);
      current.chargeMax = numeric(queryControl(waveIndex, enemyIndex, 'cm')?.value, current.chargeMax);
      current.dtdr = numeric(queryControl(waveIndex, enemyIndex, 'dtdr')?.value, current.dtdr);
      current.atdr = numeric(queryControl(waveIndex, enemyIndex, 'atdr')?.value, current.atdr);
      current.dsr = numeric(queryControl(waveIndex, enemyIndex, 'dsr')?.value, current.dsr);
      current.critRate = numeric(queryControl(waveIndex, enemyIndex, 'cr')?.value, current.critRate);
      settings[key] = current;
      saveSettings(settings);
    };

    toggleRow.addEventListener('change', () => {
      persist();
      applySetupState(waveIndex, enemyIndex, card, settings);
      persist();
    });
    classInput.addEventListener('change', () => {
      persist();
      applySetupState(waveIndex, enemyIndex, card, settings);
      persist();
    });
    [
      queryControl(waveIndex, enemyIndex, 'cm'),
      queryControl(waveIndex, enemyIndex, 'dtdr'),
      queryControl(waveIndex, enemyIndex, 'cr'),
      queryControl(waveIndex, enemyIndex, 'dsr'),
      queryControl(waveIndex, enemyIndex, 'atdr')
    ].filter(Boolean).forEach((input) => input.addEventListener('input', persist));

    applySetupState(waveIndex, enemyIndex, card, settings);
    persist();
  }

  function renderEnemyCharge() {
    const engine = global.FGO_ACTIVE_BATTLE_ENGINE;
    if (!engine || typeof document === 'undefined') return;
    document.querySelectorAll('.enemy-card[data-unit-id]').forEach((card) => {
      const unit = engine.getUnit(card.dataset.unitId);
      if (!unit) return;
      let line = card.querySelector('.enemy-charge-line');
      if (!line) {
        line = document.createElement('div');
        line.className = 'enemy-charge-line';
        const hpLine = card.querySelector('.hp-line');
        if (hpLine) hpLine.insertAdjacentElement('beforebegin', line);
        else card.appendChild(line);
      }
      if (Number(unit.chargeMax || 0) <= 0) {
        line.innerHTML = '<span>CHARGE</span><strong>OFF</strong>';
        line.classList.add('disabled');
        return;
      }
      const current = clamp(unit.charge, 0, unit.chargeMax);
      const filled = '●'.repeat(current);
      const empty = '○'.repeat(Math.max(0, unit.chargeMax - current));
      line.innerHTML = `<span>CHARGE</span><strong aria-label="${current}/${unit.chargeMax}">${filled}${empty}</strong><small>${current}/${unit.chargeMax}</small>`;
      line.classList.remove('disabled');
    });
  }

  function installUi() {
    if (typeof document === 'undefined') return;
    const settings = loadSettings();
    document.querySelectorAll('.enemy-setup-card').forEach((card) => installSetupCard(card, settings));
    renderEnemyCharge();
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
      const observer = new MutationObserver(schedule);
      observer.observe(root, { childList: true, subtree: true });
      root.addEventListener('click', (event) => {
        const reset = event.target.closest && event.target.closest('#reset');
        if (reset) saveSettings({});
        const bulk = event.target.closest && event.target.closest('[data-bulk-wave]');
        if (bulk) {
          const settings = loadSettings();
          const waveIndex = Number(bulk.dataset.bulkWave);
          const source = settings[settingKey(waveIndex, 0)] || {};
          settings[settingKey(waveIndex, 1)] = { ...source };
          settings[settingKey(waveIndex, 2)] = { ...source };
          saveSettings(settings);
        }
      }, true);
      schedule();
    }
  }

  const API = {
    storageKey: STORAGE_KEY,
    servantTrait: SERVANT_TRAIT,
    classDefaults,
    classDefaultTable: deepClone(CLASS_DEFAULTS),
    enrichBattleConfig,
    resolveEnemyConfig,
    setServantTrait,
    BattleEngine: EnemyClassDefaultBattleEngine
  };

  global.FGO_ENEMY_CLASS_DEFAULTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
