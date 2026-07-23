(function (global) {
  'use strict';

  function selectedNpOrder(engine, allyId) {
    if (!engine || typeof engine.getState !== 'function') return null;
    const actions = engine.getState().selectedActions || [];
    const index = actions.findIndex((action) => action && action.type === 'np' && action.actorId === allyId);
    return index >= 0 ? index + 1 : null;
  }

  const API = {
    selectedNpOrder,
    badgeClass: 'order-badge'
  };

  global.FGO_NP_SELECTION_ORDER = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;

  const root = document.getElementById('app');
  if (!root) return;
  let scheduled = false;

  function activeEngine() {
    return global.FGO_ACTIVE_BATTLE_ENGINE || null;
  }

  function update() {
    scheduled = false;
    const engine = activeEngine();
    if (!engine) return;

    root.querySelectorAll('.np-command[data-np]').forEach((button) => {
      const order = selectedNpOrder(engine, button.dataset.np);
      let badge = button.querySelector('[data-np-order-badge]');
      if (order == null) {
        if (badge) badge.remove();
        button.setAttribute('aria-pressed', 'false');
        return;
      }
      if (!badge) {
        badge = document.createElement('b');
        badge.className = 'order-badge';
        badge.dataset.npOrderBadge = 'true';
        button.prepend(badge);
      }
      if (badge.textContent !== String(order)) badge.textContent = String(order);
      button.setAttribute('aria-pressed', 'true');
    });
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(update);
    else setTimeout(update, 0);
  }

  new MutationObserver(scheduleUpdate).observe(root, { childList: true, subtree: true });
  root.addEventListener('click', scheduleUpdate, true);
  scheduleUpdate();
})(typeof window !== 'undefined' ? window : globalThis);
