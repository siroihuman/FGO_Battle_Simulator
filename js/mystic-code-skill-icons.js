(function (global) {
  'use strict';

  const DEFAULT_ICON = 'skill-buff-add.png';

  function resolveSkillIcon(skill) {
    const icon = String(skill && skill.icon || '').trim();
    return icon || DEFAULT_ICON;
  }

  const API = { DEFAULT_ICON, resolveSkillIcon };
  global.FGO_MYSTIC_CODE_ICON_UI = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (typeof document === 'undefined') return;

  const ENGINE = global.FGO_SIM_ENGINE;
  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('先に js/engine.js を読み込んでください。');
  }

  const prototype = ENGINE.BattleEngine.prototype;
  const originalGetMysticCode = prototype.getMysticCode;
  let activeMysticCode = null;

  if (typeof originalGetMysticCode !== 'function') {
    throw new Error('BattleEngine#getMysticCode が見つかりません。');
  }

  if (!prototype.__mysticCodeIconHookInstalled) {
    prototype.getMysticCode = function () {
      const mysticCode = originalGetMysticCode.apply(this, arguments);
      activeMysticCode = mysticCode;
      return mysticCode;
    };
    Object.defineProperty(prototype, '__mysticCodeIconHookInstalled', {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  function applyMysticCodeIcons(root) {
    if (!activeMysticCode || !Array.isArray(activeMysticCode.skills)) return;

    root.querySelectorAll('.mystic-panel [data-master]').forEach((button) => {
      const index = Number(button.dataset.master);
      const skill = activeMysticCode.skills[index];
      const image = button.querySelector('img');
      if (!skill || !image) return;

      image.src = `assets/skill-icons/${resolveSkillIcon(skill)}`;
      image.alt = skill.name || `魔術礼装スキル${index + 1}`;
    });
  }

  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  const observer = new MutationObserver(() => applyMysticCodeIcons(appRoot));
  observer.observe(appRoot, { childList: true, subtree: true });
  applyMysticCodeIcons(appRoot);
})(typeof window !== 'undefined' ? window : globalThis);
