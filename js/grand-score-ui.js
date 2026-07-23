(function (global) {
  'use strict';

  const GRAND = global.FGO_SIM_GRAND_SCORE;
  if (!GRAND || typeof document === 'undefined') return;

  const STORAGE_KEY = GRAND.storageKey || 'fgoGrandScoreSettingsV1';
  const root = document.getElementById('app');
  if (!root) return;

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        enabled: Boolean(parsed.enabled),
        slots: Array.from({ length: 6 }, (_, index) => Boolean((parsed.slots || [])[index])),
        activeSlots: Array.isArray(parsed.activeSlots) ? parsed.activeSlots.map(Boolean) : []
      };
    } catch {
      return { enabled: false, slots: Array(6).fill(false), activeSlots: [] };
    }
  }

  let settings = load();
  let scheduled = false;

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function activeFlags(form) {
    const flags = [];
    for (let index = 0; index < 6; index += 1) {
      const select = form.querySelector(`[name="p${index}s"]`);
      if (select && select.value) flags.push(Boolean(settings.slots[index]));
    }
    return flags;
  }

  function capture(form) {
    settings.enabled = Boolean(form.querySelector('[name="grandScoreEnabled"]')?.checked);
    for (let index = 0; index < 6; index += 1) {
      settings.slots[index] = Boolean(form.querySelector(`[name="p${index}grand"]`)?.checked);
    }
    settings.activeSlots = activeFlags(form);
    save();
  }

  function systemSection(form) {
    let section = form.querySelector('[data-grand-score-section]');
    if (section) return section;
    section = document.createElement('section');
    section.className = 'setup-section grand-score-setup-section';
    section.dataset.grandScoreSection = 'true';
    section.innerHTML = `
      <div class="section-heading">
        <h2>グランドスコア</h2>
        <p>全効果を最大倍率で適用します。グランドサーヴァントのクラス・騎数制限はありません。</p>
      </div>
      <div class="grand-score-system-card">
        <label class="toggle-label grand-score-main-toggle">
          <input name="grandScoreEnabled" type="checkbox"${settings.enabled ? ' checked' : ''}>
          <span>グランドスコアシステムを使用</span>
        </label>
        <p>指定サーヴァントごとにHP／ATK+1,000をフォウ強化値として加算し、該当クラスのグランドスコアを適用します。</p>
      </div>`;
    const partySection = form.querySelector('.party-list')?.closest('.setup-section');
    if (partySection) partySection.insertAdjacentElement('afterend', section);
    else form.prepend(section);
    return section;
  }

  function slotToggle(card, index) {
    let wrapper = card.querySelector('[data-grand-servant-toggle]');
    if (!wrapper) {
      wrapper = document.createElement('label');
      wrapper.className = 'toggle-label grand-servant-toggle';
      wrapper.dataset.grandServantToggle = String(index);
      wrapper.innerHTML = `<input name="p${index}grand" type="checkbox"><span>グランドサーヴァント</span>`;
      const title = card.querySelector('.setup-card-title');
      if (title) title.insertAdjacentElement('afterend', wrapper);
      else card.prepend(wrapper);
    }
    const input = wrapper.querySelector('input');
    input.checked = Boolean(settings.slots[index]);
    input.disabled = !settings.enabled;
    card.classList.toggle('grand-servant-selected', settings.enabled && input.checked);
  }

  function updateDisabled(form) {
    const enabled = Boolean(form.querySelector('[name="grandScoreEnabled"]')?.checked);
    form.querySelectorAll('[data-grand-servant-toggle] input').forEach((input) => {
      input.disabled = !enabled;
      input.closest('.party-setup-card')?.classList.toggle('grand-servant-selected', enabled && input.checked);
    });
  }

  function install() {
    scheduled = false;
    const form = root.querySelector('#setup');
    if (!form) return;
    systemSection(form);
    form.querySelectorAll('.party-setup-card').forEach((card, index) => slotToggle(card, index));
    updateDisabled(form);
    if (form.dataset.grandScoreInstalled === 'true') return;
    form.dataset.grandScoreInstalled = 'true';
    form.addEventListener('change', (event) => {
      if (!event.target.matches('[name="grandScoreEnabled"], [name$="grand"]')) return;
      capture(form);
      updateDisabled(form);
    });
    form.addEventListener('submit', () => capture(form), true);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(install);
    else setTimeout(install, 0);
  }

  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  schedule();

  global.FGO_SIM_GRAND_SCORE_UI = {
    storageKey: STORAGE_KEY,
    noPerClassLimit: true,
    grandFouBonus: 1000,
    load,
    capture,
    install
  };
})(typeof window !== 'undefined' ? window : globalThis);
