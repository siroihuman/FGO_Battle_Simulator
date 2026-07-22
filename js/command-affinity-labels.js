(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!DATA || !ENGINE || typeof ENGINE.classAffinity !== 'function') {
    throw new Error('command affinity labels require data and engine.');
  }

  function classifyAffinity(multiplier) {
    const value = Number(multiplier || 1);
    if (value > 1) return 'weak';
    if (value < 1) return 'resist';
    return '';
  }

  function buildClassLabelMap(classNames) {
    return new Map(
      Object.entries(classNames || {}).map(([classId, label]) => [String(label), classId])
    );
  }

  const API = {
    classifyAffinity,
    buildClassLabelMap
  };

  global.FGO_COMMAND_AFFINITY_LABELS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (typeof document === 'undefined') return;

  const root = document.getElementById('app');
  if (!root) return;

  const classLabelMap = buildClassLabelMap(DATA.classNames);
  let scheduled = false;

  function classIdFromCard(card) {
    if (!card) return '';
    const label = Array.from(card.children || [])
      .map((element) => String(element.textContent || '').trim())
      .find((text) => classLabelMap.has(text));
    return label ? classLabelMap.get(label) : '';
  }

  function selectedEnemyClassId() {
    return classIdFromCard(root.querySelector('.enemy-card.selected-target'));
  }

  function allyClassId(unitId) {
    const card = Array.from(root.querySelectorAll('.ally-card[data-unit-id]'))
      .find((element) => element.dataset.unitId === unitId);
    if (!card) return '';
    const badge = card.querySelector('.class-badge');
    const label = String(badge && badge.textContent || '').trim();
    return classLabelMap.get(label) || '';
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
    const targetClassId = selectedEnemyClassId();
    const buttons = root.querySelectorAll('.command-card[data-actor-id], .np-command[data-np]');

    buttons.forEach((button) => {
      const actorId = button.dataset.actorId || button.dataset.np || '';
      const actorClassId = allyClassId(actorId);
      const kind = actorClassId && targetClassId
        ? classifyAffinity(ENGINE.classAffinity(actorClassId, targetClassId))
        : '';
      applyBadge(button, kind);
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
