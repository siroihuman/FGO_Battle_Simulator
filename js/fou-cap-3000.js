(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine) {
    throw new Error('Fou cap runtime requires data and engine.');
  }

  const BaseBattleEngine = ENGINE.BattleEngine;
  const MAX_FOU = 3000;
  const GRAND_FOU_BONUS = 1000;
  const STORAGE_KEY = 'fgoFouCap3000V1';

  const clone = (value) => JSON.parse(JSON.stringify(value || {}));
  const clampFou = (value) => Math.max(0, Math.min(MAX_FOU, Number(value) || 0));

  function emptySettings() {
    return {
      slots: Array.from({ length: 6 }, () => ({ hp: null, atk: null })),
      activeParty: []
    };
  }

  function loadSettings() {
    if (typeof localStorage === 'undefined') return emptySettings();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const result = emptySettings();
      result.slots = Array.from({ length: 6 }, (_, index) => {
        const slot = Array.isArray(saved.slots) ? saved.slots[index] : null;
        return {
          hp: slot && slot.hp != null ? clampFou(slot.hp) : null,
          atk: slot && slot.atk != null ? clampFou(slot.atk) : null
        };
      });
      result.activeParty = Array.isArray(saved.activeParty)
        ? saved.activeParty.map((slot) => ({
            hp: clampFou(slot && slot.hp),
            atk: clampFou(slot && slot.atk)
          }))
        : [];
      return result;
    } catch {
      return emptySettings();
    }
  }

  function saveSettings(settings) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function enrichConfig(config) {
    const result = clone(config);
    const settings = loadSettings();
    result.party = (result.party || []).map((raw, index) => {
      const stored = settings.activeParty[index];
      const fouHp = clampFou(stored && stored.hp != null ? stored.hp : raw.fouHp);
      const fouAtk = clampFou(stored && stored.atk != null ? stored.atk : raw.fouAtk);
      return {
        ...raw,
        fouHp,
        fouAtk,
        _baseFouHp: fouHp,
        _baseFouAtk: fouAtk
      };
    });
    return result;
  }

  class FouCapBattleEngine extends BaseBattleEngine {
    constructor(config) {
      super(enrichConfig(config));
    }

    _createAlly(slot, index) {
      const grandSelected = Boolean(slot && (slot.grandScoreEnabled || slot.grandServant));
      const baseFouHp = clampFou(
        slot && slot._baseFouHp != null
          ? slot._baseFouHp
          : Number(slot && slot.fouHp || 0) - (grandSelected ? GRAND_FOU_BONUS : 0)
      );
      const baseFouAtk = clampFou(
        slot && slot._baseFouAtk != null
          ? slot._baseFouAtk
          : Number(slot && slot.fouAtk || 0) - (grandSelected ? GRAND_FOU_BONUS : 0)
      );
      const finalFouHp = clampFou(slot && slot.fouHp);
      const finalFouAtk = clampFou(slot && slot.fouAtk);
      const unit = super._createAlly({
        ...slot,
        fouHp: finalFouHp,
        fouAtk: finalFouAtk
      }, index);

      unit.fouHp = finalFouHp;
      unit.fouAtk = finalFouAtk;
      unit.fouEnhancementCap = MAX_FOU;
      unit.grandFouHp = unit.grandServant
        ? Math.max(0, finalFouHp - baseFouHp)
        : 0;
      unit.grandFouAtk = unit.grandServant
        ? Math.max(0, finalFouAtk - baseFouAtk)
        : 0;
      return unit;
    }
  }

  ENGINE.BattleEngine = FouCapBattleEngine;

  function captureForm(form) {
    const settings = loadSettings();
    settings.activeParty = [];
    for (let index = 0; index < 6; index += 1) {
      const servant = form.querySelector(`[name="p${index}s"]`);
      const hpInput = form.querySelector(`[name="p${index}fh"]`);
      const atkInput = form.querySelector(`[name="p${index}fa"]`);
      if (!hpInput || !atkInput) continue;
      const slot = {
        hp: clampFou(hpInput.value),
        atk: clampFou(atkInput.value)
      };
      settings.slots[index] = slot;
      hpInput.value = String(slot.hp);
      atkInput.value = String(slot.atk);
      if (servant && servant.value) settings.activeParty.push({ ...slot });
    }
    saveSettings(settings);
    return settings;
  }

  function installSetupLimits() {
    if (typeof document === 'undefined') return;
    const root = document.getElementById('app');
    const form = root && root.querySelector('#setup');
    if (!form) return;

    const settings = loadSettings();
    for (let index = 0; index < 6; index += 1) {
      const hpInput = form.querySelector(`[name="p${index}fh"]`);
      const atkInput = form.querySelector(`[name="p${index}fa"]`);
      [hpInput, atkInput].forEach((input) => {
        if (!input) return;
        input.max = String(MAX_FOU);
        input.min = '0';
      });
      const stored = settings.slots[index];
      if (hpInput && stored && stored.hp != null) hpInput.value = String(clampFou(stored.hp));
      if (atkInput && stored && stored.atk != null) atkInput.value = String(clampFou(stored.atk));
    }

    if (form.dataset.fouCap3000Installed === 'true') return;
    form.dataset.fouCap3000Installed = 'true';

    const update = (event) => {
      if (!event.target.matches('input[name$="fh"], input[name$="fa"]')) return;
      captureForm(form);
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('submit', () => captureForm(form), true);

    const reset = form.querySelector('#reset');
    if (reset) {
      reset.addEventListener('click', () => {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
      }, true);
    }
  }

  if (typeof document !== 'undefined') {
    const root = document.getElementById('app');
    if (root) {
      let scheduled = false;
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        const run = () => {
          scheduled = false;
          installSetupLimits();
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else setTimeout(run, 0);
      };
      new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
      schedule();
    }
  }

  const API = {
    maximumFouEnhancement: MAX_FOU,
    grandFouBonus: GRAND_FOU_BONUS,
    capAppliedAfterGrandBonus: true,
    storageKey: STORAGE_KEY,
    clampFou,
    enrichConfig,
    captureForm,
    installSetupLimits
  };

  DATA.fouEnhancement = {
    maximum: MAX_FOU,
    grandBonus: GRAND_FOU_BONUS,
    capAppliedAfterGrandBonus: true
  };
  global.FGO_SIM_FOU_CAP_3000 = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
