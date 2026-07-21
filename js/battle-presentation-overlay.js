(function (global) {
  'use strict';

  const PRESENTATION = global.FGO_BATTLE_PRESENTATION ||
    (typeof require !== 'undefined' ? require('./battle-presentation.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE || null;

  if (!PRESENTATION) throw new Error('battle presentation overlay requires battle-presentation.js.');

  function waveLabel(before, after, maxWaves) {
    const beforeWave = Number(before && before.wave || 1);
    const afterWave = Number(after && after.wave || beforeWave);
    const total = Math.max(beforeWave, afterWave, Number(maxWaves || 1));
    if (afterWave > beforeWave) return `WAVE ${beforeWave}/${total} COMPLETE → WAVE ${afterWave}/${total}`;
    return `WAVE ${beforeWave}/${total}`;
  }

  function animationTarget(beforeUnit, afterSnapshot) {
    return PRESENTATION.animationTarget(beforeUnit, afterSnapshot);
  }

  function installBrowserOverlay() {
    if (!ENGINE || !ENGINE.BattleEngine || typeof document === 'undefined') return false;
    const proto = ENGINE.BattleEngine.prototype;
    if (proto.__battlePresentationOverlayInstalled) return true;
    proto.__battlePresentationOverlayInstalled = true;

    const originalExecuteCommandChain = proto.executeCommandChain;
    proto.executeCommandChain = function () {
      const beforeState = this.getState();
      const before = PRESENTATION.snapshot(beforeState);
      const meta = {
        maxWaves: Number(beforeState.maxWaves || beforeState.wave || 1),
        seed: this.seed
      };
      const result = originalExecuteCommandChain.apply(this, arguments);
      if (result && result.ok) {
        const after = PRESENTATION.snapshot(this.getState());
        global.dispatchEvent(new CustomEvent('fgo:turn-resolution', {
          detail: { before, after, meta }
        }));
      }
      return result;
    };

    let activeOverlay = null;
    let restoreBodyOverflow = '';

    const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>\"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
    const gaugePercent = (value, max) => clamp((Number(value || 0) / Math.max(1, Number(max || 1))) * 100, 0, 100);

    function unitHtml(unit, includeNp) {
      return `<article class="battle-resolution-unit${unit.alive ? '' : ' defeated'}" data-overlay-unit-id="${escapeHtml(unit.id)}">
        <div class="battle-resolution-unit-title"><strong>${escapeHtml(unit.name)}</strong><small>${unit.side === 'ally' ? (unit.frontline ? '前衛' : '控え') : '敵'}</small></div>
        <div class="hp-line"><span>HP</span><strong data-overlay-gauge-value="hp">${Math.round(unit.hp)}/${unit.maxHp}</strong></div>
        <div class="bar ${unit.side === 'enemy' ? 'hp-bar enemy-hp' : 'hp-bar'}"><div data-overlay-gauge-fill="hp" style="width:${gaugePercent(unit.hp, unit.maxHp)}%"></div></div>
        ${includeNp ? `<div class="np-line"><span>NP</span><strong data-overlay-gauge-value="np">${Number(unit.np || 0).toFixed(2)}%</strong></div><div class="bar np-bar"><div data-overlay-gauge-fill="np" style="width:${clamp(unit.np, 0, 100)}%"></div></div>` : ''}
      </article>`;
    }

    function overlayHtml(before, after, meta) {
      return `<div class="battle-resolution-overlay" id="battle-resolution-overlay" role="dialog" aria-modal="true" aria-label="ターン処理結果" tabindex="-1">
        <div class="battle-resolution-surface">
          <header class="battle-resolution-header">
            <div><p>TURN RESOLUTION</p><h2>攻撃・ターン処理中</h2><small>${escapeHtml(waveLabel(before, after, meta.maxWaves))}</small></div>
            <span class="battle-resolution-spinner" aria-hidden="true"></span>
          </header>
          <div class="battle-resolution-body">
            <section class="battle-resolution-section enemy-section">
              <h3>ENEMY HP</h3>
              <div class="battle-resolution-unit-grid enemy-grid">${before.enemies.map((unit) => unitHtml(unit, false)).join('')}</div>
            </section>
            <section class="battle-resolution-section ally-section">
              <h3>ALLY HP / NP</h3>
              <div class="battle-resolution-unit-grid ally-grid">${before.allies.map((unit) => unitHtml(unit, true)).join('')}</div>
            </section>
          </div>
          <footer class="battle-resolution-footer" aria-live="polite">
            <span class="battle-resolution-progress">ゲージ更新中</span>
            <strong class="battle-resolution-dismiss-hint">画面をクリック／タップして閉じる</strong>
          </footer>
        </div>
      </div>`;
    }

    function updateUnit(element, unit) {
      const hpText = element.querySelector('[data-overlay-gauge-value="hp"]');
      const hpFill = element.querySelector('[data-overlay-gauge-fill="hp"]');
      if (hpText) hpText.textContent = `${Math.round(unit.hp)}/${unit.maxHp}`;
      if (hpFill) hpFill.style.width = `${gaugePercent(unit.hp, unit.maxHp)}%`;
      const npText = element.querySelector('[data-overlay-gauge-value="np"]');
      const npFill = element.querySelector('[data-overlay-gauge-fill="np"]');
      if (npText && unit.np != null) npText.textContent = `${Number(unit.np).toFixed(2)}%`;
      if (npFill && unit.np != null) npFill.style.width = `${clamp(unit.np, 0, 100)}%`;
      element.classList.toggle('defeated', unit.hp <= 0);
    }

    function closeOverlay() {
      if (!activeOverlay || !activeOverlay.classList.contains('ready')) return;
      activeOverlay.remove();
      activeOverlay = null;
      document.body.classList.remove('battle-resolution-overlay-active');
      document.body.style.overflow = restoreBodyOverflow;
      const app = document.getElementById('app');
      if (app) app.inert = false;
    }

    function showOverlay(detail) {
      if (!detail || !detail.before || !detail.after) return;
      if (activeOverlay) activeOverlay.remove();
      const app = document.getElementById('app');
      if (app) app.inert = true;
      restoreBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('battle-resolution-overlay-active');
      document.body.insertAdjacentHTML('beforeend', overlayHtml(detail.before, detail.after, detail.meta || {}));
      activeOverlay = document.getElementById('battle-resolution-overlay');
      if (!activeOverlay) return;
      activeOverlay.focus({ preventScroll: true });

      let pointerStarted = false;
      activeOverlay.addEventListener('pointerdown', () => { pointerStarted = true; });
      activeOverlay.addEventListener('pointerup', (event) => {
        if (!pointerStarted) return;
        pointerStarted = false;
        event.preventDefault();
        closeOverlay();
      });
      activeOverlay.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          closeOverlay();
        }
      });

      const reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reducedMotion ? 260 : 900;
      const settleDelay = reducedMotion ? 120 : 260;
      const startedAt = performance.now();

      function frame(now) {
        if (!activeOverlay) return;
        const raw = Math.min(1, (now - startedAt) / duration);
        const progress = 1 - Math.pow(1 - raw, 3);
        activeOverlay.querySelectorAll('[data-overlay-unit-id]').forEach((element) => {
          const startUnit = detail.before.units.get(element.dataset.overlayUnitId);
          if (!startUnit) return;
          const targetUnit = animationTarget(startUnit, detail.after);
          updateUnit(element, PRESENTATION.interpolateUnit(startUnit, targetUnit, progress));
        });
        if (raw < 1) {
          requestAnimationFrame(frame);
          return;
        }
        const heading = activeOverlay.querySelector('.battle-resolution-header h2');
        const progressLabel = activeOverlay.querySelector('.battle-resolution-progress');
        if (heading) heading.textContent = detail.after.winner ? '戦闘結果を確定' : `TURN ${detail.after.turn}へ移行`;
        if (progressLabel) progressLabel.textContent = detail.after.wave > detail.before.wave ? `WAVE ${detail.before.wave} 突破` : 'ターン処理完了';
        setTimeout(() => {
          if (!activeOverlay) return;
          activeOverlay.classList.add('ready');
          activeOverlay.setAttribute('aria-label', 'ターン処理完了。画面をクリックまたはタップして閉じます');
        }, settleDelay);
      }

      requestAnimationFrame(frame);
    }

    global.addEventListener('fgo:turn-resolution', (event) => showOverlay(event.detail));
    return true;
  }

  const API = {
    waveLabel,
    animationTarget,
    installBrowserOverlay
  };

  global.FGO_BATTLE_PRESENTATION_OVERLAY = API;
  installBrowserOverlay();
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
