(function (global) {
  'use strict';

  const RULES = global.FGO_CLASS_AFFINITY_RULES ||
    (typeof require !== 'undefined' ? require('./class-affinity-rules.js') : null);

  if (!RULES || typeof RULES.resolveAttackClassAffinity !== 'function') {
    throw new Error('command affinity labels require class affinity rules.');
  }

  function classifyAffinity(multiplier) {
    const value = Number(multiplier || 1);
    if (value > 1) return 'weak';
    if (value < 1) return 'resist';
    return '';
  }

  const API = { classifyAffinity };
  global.FGO_COMMAND_AFFINITY_LABELS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (typeof document === 'undefined') return;

  const root = document.getElementById('app');
  if (!root) return;
  let scheduled = false;

  function activeEngine() {
    return global.FGO_ACTIVE_BATTLE_ENGINE || null;
  }

  function selectedDefender(engine) {
    if (!engine || !engine.state) return null;
    return engine.getUnit(engine.state.selectedEnemyId) ||
      (typeof engine.getAliveEnemies === 'function' ? engine.getAliveEnemies()[0] : null);
  }

  function applyBadge(button, affinityKind) {
    let badge = Array.from(button.children)
      .find((element) => element.classList && element.classList.contains('command-affinity-badge'));

    if (!affinityKind) {
      if (badge) badge.remove();
      button.classList.remove('has-affinity-label');
      return;
    }

    const label = affinityKind === 'weak' ? 'WEAK' : 'RESIST';
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'command-affinity-badge';
      badge.setAttribute('aria-hidden', 'true');
      button.appendChild(badge);
    }

    badge.classList.toggle('weak', affinityKind === 'weak');
    badge.classList.toggle('resist', affinityKind === 'resist');
    if (badge.textContent !== label) badge.textContent = label;
    button.classList.add('has-affinity-label');
  }

  function updateAffinityLabels() {
    scheduled = false;
    const engine = activeEngine();
    const defender = selectedDefender(engine);
    const buttons = root.querySelectorAll('.command-card[data-actor-id], .np-command[data-np]');

    buttons.forEach((button) => {
      const actorId = button.dataset.actorId || button.dataset.np || '';
      const actor = engine && typeof engine.getUnit === 'function' ? engine.getUnit(actorId) : null;
      const multiplier = actor && defender
        ? RULES.resolveAttackClassAffinity(engine, actor, defender)
        : 1;
      applyBadge(button, classifyAffinity(multiplier));
    });
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateAffinityLabels);
  }

  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(root, { childList: true, subtree: true });
  root.addEventListener('click', scheduleUpdate, true);
  scheduleUpdate();
})(typeof window !== 'undefined' ? window : globalThis);
