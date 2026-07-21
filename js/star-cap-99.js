(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine || !DATA) {
    throw new Error('star cap 99 requires data and engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__starCap99Installed) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = global.FGO_STAR_CAP_99;
    }
    return;
  }
  proto.__starCap99Installed = true;

  const STAR_CAP = 99;
  const clamp = (value) => Math.max(0, Math.min(STAR_CAP, Number(value) || 0));

  function valueAt(effect, context) {
    const detail = context || {};
    if (Array.isArray(effect.values)) {
      const level = Math.max(1, Math.min(10, Number(detail.level || 10)));
      return Number(effect.values[level - 1] || 0);
    }
    if (Array.isArray(effect.ocValues)) {
      const oc = Math.max(1, Math.min(5, Number(detail.oc || 1)));
      return Number(effect.ocValues[oc - 1] || 0);
    }
    return Number(effect.value || 0);
  }

  const originalInitialize = proto._initialize;
  proto._initialize = function () {
    const result = originalInitialize.apply(this, arguments);
    this.state.stars = clamp(this.config.startingStars || 0);
    if (typeof this._allocateCriticalStars === 'function') this._allocateCriticalStars();
    return result;
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (!effect || effect.type !== 'stars') {
      return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
    }

    const value = Math.max(0, valueAt(effect, context));
    if (this.state.phase === 'command') {
      this.state.stars = clamp(this.state.stars + value);
      if (typeof this._allocateCriticalStars === 'function') this._allocateCriticalStars();
      this._log(`スターを${value}個獲得。`);
      return { applied: true, timing: 'currentTurn', value, stars: this.state.stars };
    }

    this.state.nextStars = clamp(this.state.nextStars + value);
    this._log(`スターを${value}個獲得（次ターン）。`);
    return { applied: true, timing: 'nextTurn', value, nextStars: this.state.nextStars };
  };

  const originalUseMysticSkill = proto.useMysticSkill;
  proto.useMysticSkill = function (index, selectedTargetId) {
    const skill = this.getMysticCode && this.getMysticCode().skills[index];
    const level = Math.max(1, Math.min(10, Number(this.config.mysticCodeLevel || 10)));
    const starEffects = skill && Array.isArray(skill.effects)
      ? skill.effects.filter((effect) => effect && effect.type === 'stars')
      : [];
    const beforeStars = Number(this.state.stars || 0);
    const result = originalUseMysticSkill.call(this, index, selectedTargetId);
    if (result && result.ok && starEffects.length) {
      const gain = starEffects.reduce((sum, effect) => sum + Math.max(0, valueAt(effect, { level })), 0);
      this.state.stars = clamp(beforeStars + gain);
      if (typeof this._allocateCriticalStars === 'function') this._allocateCriticalStars();
    }
    return result;
  };

  const originalFinishTurn = proto._finishTurn;
  proto._finishTurn = function () {
    const beforeTurn = Number(this.state.turn || 1);
    const earnedStars = clamp(this.state.nextStars);
    const result = originalFinishTurn.apply(this, arguments);
    if (
      Number(this.state.turn || 1) > beforeTurn &&
      this.state.phase === 'command' &&
      !this.state.winner
    ) {
      this.state.stars = earnedStars;
      if (typeof this._allocateCriticalStars === 'function') this._allocateCriticalStars();
    }
    return result;
  };

  function normalizeStarInput(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input[name="stars"]').forEach((input) => {
      input.max = String(STAR_CAP);
      if (input.dataset.starCap99Installed === 'true') return;
      input.dataset.starCap99Installed = 'true';
      input.addEventListener('change', () => {
        if (input.value === '') return;
        input.value = String(clamp(input.value));
      });
    });
  }

  if (typeof document !== 'undefined') {
    const install = () => {
      normalizeStarInput(document);
      const observer = new MutationObserver((records) => {
        records.forEach((record) => record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('input[name="stars"]')) normalizeStarInput(node.parentNode || node);
          else normalizeStarInput(node);
        }));
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
  }

  const API = { STAR_CAP, clamp };
  global.FGO_STAR_CAP_99 = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
