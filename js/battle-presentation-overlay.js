(function (global) {
  'use strict';

  const PRESENTATION = global.FGO_BATTLE_PRESENTATION ||
    (typeof require !== 'undefined' ? require('./battle-presentation.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE || null;
  const TIMELINE = global.FGO_TURN_ACTION_TIMELINE || null;

  if (!PRESENTATION) throw new Error('battle presentation overlay requires battle-presentation.js.');

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function easeOutCubic(value) {
    const t = clamp(value, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function interpolate(from, to, progress) {
    return Number(from || 0) + (Number(to || 0) - Number(from || 0)) * clamp(progress, 0, 1);
  }

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

  function npAnimationValue(beforeNp, afterNp, progress, usedNp) {
    if (!usedNp) return interpolate(beforeNp, afterNp, easeOutCubic(progress));
    const consumeEnd = 0.34;
    if (progress <= consumeEnd) {
      return interpolate(beforeNp, 0, easeOutCubic(progress / consumeEnd));
    }
    return interpolate(0, afterNp, easeOutCubic((progress - consumeEnd) / (1 - consumeEnd)));
  }

  function phaseLabel(phase) {
    if (TIMELINE && typeof TIMELINE.phaseLabel === 'function') return TIMELINE.phaseLabel(phase);
    if (phase === 'ally') return '味方攻撃フェーズ';
    if (phase === 'enemy') return '敵攻撃フェーズ';
    return 'ターン処理';
  }

  function actionLabel(step) {
    if (step && step.actionLabel) return step.actionLabel;
    if (TIMELINE && typeof TIMELINE.actionLabel === 'function') return TIMELINE.actionLabel(step);
    return '攻撃処理';
  }

  function installBrowserOverlay() {
    if (!ENGINE || !ENGINE.BattleEngine || typeof document === 'undefined') return false;
    const proto = ENGINE.BattleEngine.prototype;
    if (proto.__battlePresentationOverlayInstalled) return true;
    proto.__battlePresentationOverlayInstalled = true;

    const originalExecuteCommandChain = proto.executeCommandChain;
    proto.executeCommandChain = function () {
      const beforeState = this.getState();
      const fallbackBefore = PRESENTATION.snapshot(beforeState);
      const selectedActions = (beforeState.selectedActions || []).map((action) => ({ ...action }));
      const result = originalExecuteCommandChain.apply(this, arguments);
      if (result && result.ok) {
        const timeline = typeof this.getLastTurnActionTimeline === 'function'
          ? this.getLastTurnActionTimeline()
          : null;
        const after = timeline && timeline.after
          ? timeline.after
          : PRESENTATION.snapshot(this.getState());
        const before = timeline && timeline.before ? timeline.before : fallbackBefore;
        global.dispatchEvent(new CustomEvent('fgo:turn-resolution', {
          detail: {
            before,
            after,
            timeline,
            meta: {
              maxWaves: Number(beforeState.maxWaves || beforeState.wave || 1),
              seed: this.seed,
              npActorIds: selectedActions
                .filter((action) => action && action.type === 'np' && action.actorId)
                .map((action) => action.actorId)
            }
          }
        }));
      }
      return result;
    };

    let activeOverlay = null;
    let restoreBodyOverflow = '';

    const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
    const gaugePercent = (value, max) => clamp((Number(value || 0) / Math.max(1, Number(max || 1))) * 100, 0, 100);

    function gaugeTransform(percent) {
      return `scaleX(${clamp(percent, 0, 100) / 100})`;
    }

    function unitHtml(unit, includeNp, usedNp) {
      return `<article class="battle-resolution-unit${unit.alive ? '' : ' defeated'}${usedNp ? ' np-used' : ''}" data-overlay-unit-id="${escapeHtml(unit.id)}">
        <div class="battle-resolution-unit-title"><strong>${escapeHtml(unit.name)}</strong><small>${unit.side === 'ally' ? (unit.frontline ? '前衛' : '控え') : '敵'}</small></div>
        <div class="hp-line"><span>HP</span><strong data-overlay-gauge-value="hp">${Math.round(unit.hp)}/${unit.maxHp}</strong></div>
        <div class="bar ${unit.side === 'enemy' ? 'hp-bar enemy-hp' : 'hp-bar'}"><div data-overlay-gauge-fill="hp" style="transform:${gaugeTransform(gaugePercent(unit.hp, unit.maxHp))}"></div></div>
        ${includeNp ? `<div class="np-line"><span>NP${usedNp ? '<em>宝具使用</em>' : ''}</span><strong data-overlay-gauge-value="np">${Number(unit.np || 0).toFixed(2)}%</strong></div><div class="bar np-bar"><div data-overlay-gauge-fill="np" style="transform:${gaugeTransform(clamp(unit.np, 0, 100))}"></div></div>` : ''}
      </article>`;
    }

    function overlayHtml(before, after, meta) {
      const npActorIds = new Set(meta.npActorIds || []);
      return `<div class="battle-resolution-overlay" id="battle-resolution-overlay" role="dialog" aria-modal="true" aria-label="ターン処理結果" tabindex="-1">
        <div class="battle-resolution-surface">
          <header class="battle-resolution-header">
            <div>
              <p>TURN RESOLUTION</p>
              <h2 data-resolution-phase>味方攻撃フェーズ</h2>
              <small>${escapeHtml(waveLabel(before, after, meta.maxWaves))}</small>
            </div>
            <div class="battle-resolution-header-status">
              <div class="battle-resolution-stars"><span>獲得スター</span><strong>★ <b data-resolution-stars>0</b><small>/99</small></strong></div>
              <span class="battle-resolution-spinner" aria-hidden="true"></span>
            </div>
          </header>
          <div class="battle-resolution-phase-tabs" aria-hidden="true">
            <span data-phase-tab="ally">1　味方攻撃フェーズ</span>
            <span data-phase-tab="enemy">2　敵攻撃フェーズ</span>
          </div>
          <div class="battle-resolution-action" aria-live="polite">
            <strong data-resolution-action>攻撃準備中</strong>
            <small data-resolution-sequence></small>
          </div>
          <div class="battle-resolution-body">
            <section class="battle-resolution-section enemy-section">
              <h3>ENEMY HP</h3>
              <div class="battle-resolution-unit-grid enemy-grid">${before.enemies.map((unit) => unitHtml(unit, false, false)).join('')}</div>
            </section>
            <section class="battle-resolution-section ally-section">
              <h3>ALLY HP / NP</h3>
              <div class="battle-resolution-unit-grid ally-grid">${before.allies.map((unit) => unitHtml(unit, true, npActorIds.has(unit.id))).join('')}</div>
            </section>
          </div>
          <footer class="battle-resolution-footer" aria-live="polite">
            <span class="battle-resolution-progress">行動処理中</span>
            <strong class="battle-resolution-dismiss-hint">画面をクリック／タップして閉じる</strong>
          </footer>
        </div>
      </div>`;
    }

    function buildUnitRenderers(detail) {
      const renderers = new Map();
      activeOverlay.querySelectorAll('[data-overlay-unit-id]').forEach((element) => {
        const startUnit = detail.before.units.get(element.dataset.overlayUnitId);
        if (!startUnit) return;
        renderers.set(startUnit.id, {
          element,
          currentUnit: { ...startUnit },
          hpText: element.querySelector('[data-overlay-gauge-value="hp"]'),
          hpFill: element.querySelector('[data-overlay-gauge-fill="hp"]'),
          npText: element.querySelector('[data-overlay-gauge-value="np"]'),
          npFill: element.querySelector('[data-overlay-gauge-fill="np"]'),
          lastHpText: '',
          lastNpText: ''
        });
      });
      return renderers;
    }

    function writeRenderer(renderer, unit) {
      const maxHp = Math.max(1, Number(unit.maxHp || 1));
      const hpText = `${Math.round(unit.hp)}/${maxHp}`;
      if (renderer.hpText && renderer.lastHpText !== hpText) {
        renderer.hpText.textContent = hpText;
        renderer.lastHpText = hpText;
      }
      if (renderer.hpFill) renderer.hpFill.style.transform = gaugeTransform(gaugePercent(unit.hp, maxHp));

      if (renderer.npText && renderer.npFill && unit.np != null) {
        const npText = `${Number(unit.np).toFixed(2)}%`;
        if (renderer.lastNpText !== npText) {
          renderer.npText.textContent = npText;
          renderer.lastNpText = npText;
        }
        renderer.npFill.style.transform = gaugeTransform(clamp(unit.np, 0, 100));
      }

      renderer.element.classList.toggle('defeated', unit.hp <= 0);
      renderer.currentUnit = { ...unit };
    }

    function unitAt(snapshot, renderer) {
      if (!snapshot || !snapshot.units) return renderer.currentUnit;
      const current = snapshot.units.get(renderer.currentUnit.id);
      if (current) return current;
      return animationTarget(renderer.currentUnit, snapshot);
    }

    function wait(milliseconds) {
      return new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));
    }

    function animateFrame(duration, callback) {
      return new Promise((resolve) => {
        const startedAt = performance.now();
        function frame(now) {
          if (!activeOverlay) {
            resolve();
            return;
          }
          const progress = Math.min(1, (now - startedAt) / Math.max(1, duration));
          callback(progress);
          if (progress < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    }

    function setPhase(phase) {
      if (!activeOverlay) return;
      activeOverlay.classList.toggle('phase-ally', phase === 'ally');
      activeOverlay.classList.toggle('phase-enemy', phase === 'enemy');
      const heading = activeOverlay.querySelector('[data-resolution-phase]');
      if (heading) heading.textContent = phaseLabel(phase);
      activeOverlay.querySelectorAll('[data-phase-tab]').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.phaseTab === phase);
      });
    }

    function flashActor(renderers, actorId, duration) {
      const renderer = renderers.get(actorId);
      if (!renderer) return Promise.resolve();
      renderer.element.classList.remove('acting');
      void renderer.element.offsetWidth;
      renderer.element.classList.add('acting');
      return wait(duration).then(() => {
        if (renderer.element) renderer.element.classList.remove('acting');
      });
    }

    async function animateStep(step, renderers, starElement, timing, totalSteps) {
      if (!activeOverlay) return;
      setPhase(step.phase);
      const actionElement = activeOverlay.querySelector('[data-resolution-action]');
      const sequenceElement = activeOverlay.querySelector('[data-resolution-sequence]');
      if (actionElement) {
        actionElement.textContent = step.prevented
          ? `${step.actorName}：行動不能`
          : `${step.actorName}　${actionLabel(step)}`;
      }
      if (sequenceElement) sequenceElement.textContent = `${step.sequenceIndex}/${totalSteps}`;

      renderers.forEach((renderer) => {
        const unit = unitAt(step.before, renderer);
        writeRenderer(renderer, unit);
      });
      if (starElement) starElement.textContent = String(Math.round(step.starBefore || 0));

      await flashActor(renderers, step.actorId, timing.flash);
      if (!activeOverlay) return;

      const starts = new Map();
      const targets = new Map();
      renderers.forEach((renderer, id) => {
        const start = unitAt(step.before, renderer);
        starts.set(id, start);
        targets.set(id, animationTarget(start, step.after));
      });

      await animateFrame(timing.action, (progress) => {
        const eased = easeOutCubic(progress);
        renderers.forEach((renderer, id) => {
          const start = starts.get(id);
          const target = targets.get(id);
          const unit = PRESENTATION.interpolateUnit(start, target, eased);
          if (step.kind === 'np' && step.actorId === id && unit.np != null) {
            unit.np = npAnimationValue(start.np, target.np, progress, true);
          }
          writeRenderer(renderer, unit);
        });
        if (starElement) {
          const stars = interpolate(step.starBefore || 0, step.starAfter || 0, eased);
          starElement.textContent = String(Math.round(stars));
        }
      });
      await wait(timing.gap);
    }

    async function animateSettlement(fromSnapshot, toSnapshot, renderers, starElement, finalStars, duration) {
      if (!fromSnapshot || !toSnapshot || duration <= 0) return;
      const starts = new Map();
      const targets = new Map();
      renderers.forEach((renderer, id) => {
        const start = unitAt(fromSnapshot, renderer);
        starts.set(id, start);
        targets.set(id, animationTarget(start, toSnapshot));
      });
      const startStars = Number(starElement && starElement.textContent || 0);
      await animateFrame(duration, (progress) => {
        const eased = easeOutCubic(progress);
        renderers.forEach((renderer, id) => {
          writeRenderer(renderer, PRESENTATION.interpolateUnit(starts.get(id), targets.get(id), eased));
        });
        if (starElement) {
          starElement.textContent = String(Math.round(interpolate(startStars, finalStars, eased)));
        }
      });
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

    function suspendLegacyPresentation() {
      const legacyPanel = document.querySelector('#app .command-panel');
      if (!legacyPanel) return;
      legacyPanel.classList.remove('command-panel');
      legacyPanel.classList.add('command-panel-overlay-suspended');
    }

    function fallbackSteps(detail) {
      return [{
        phase: 'ally',
        kind: 'result',
        actorId: null,
        actorName: '味方',
        sequenceIndex: 1,
        phaseOrder: 1,
        before: detail.before,
        after: detail.after,
        starBefore: 0,
        starAfter: clamp(detail.after.nextStars || detail.after.stars || 0, 0, 99),
        actionLabel: '攻撃結果'
      }];
    }

    async function runSequence(detail, renderers) {
      const timeline = detail.timeline;
      const steps = timeline && Array.isArray(timeline.steps) && timeline.steps.length
        ? timeline.steps
        : fallbackSteps(detail);
      const reducedMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const timing = reducedMotion
        ? { flash: 80, action: 180, gap: 30, settlement: 120, settle: 80 }
        : { flash: 220, action: 560, gap: 90, settlement: 300, settle: 180 };
      const starElement = activeOverlay.querySelector('[data-resolution-stars]');
      const progressLabel = activeOverlay.querySelector('.battle-resolution-progress');

      for (const step of steps) {
        await animateStep(step, renderers, starElement, timing, steps.length);
        if (!activeOverlay) return;
      }

      const lastSnapshot = steps[steps.length - 1].after;
      const finalStars = timeline ? Number(timeline.starGain || 0) : Number(starElement && starElement.textContent || 0);
      if (progressLabel) progressLabel.textContent = 'ターン結果を反映中';
      await animateSettlement(lastSnapshot, detail.after, renderers, starElement, finalStars, timing.settlement);
      if (!activeOverlay) return;

      const heading = activeOverlay.querySelector('[data-resolution-phase]');
      const actionElement = activeOverlay.querySelector('[data-resolution-action]');
      const sequenceElement = activeOverlay.querySelector('[data-resolution-sequence]');
      if (heading) heading.textContent = detail.after.winner ? '戦闘結果を確定' : `TURN ${detail.after.turn}へ移行`;
      if (actionElement) actionElement.textContent = detail.after.wave > detail.before.wave
        ? `WAVE ${detail.before.wave} 突破`
        : '攻撃処理完了';
      if (sequenceElement) sequenceElement.textContent = '';
      if (progressLabel) progressLabel.textContent = 'ターン処理完了';
      await wait(timing.settle);
      if (!activeOverlay) return;
      activeOverlay.classList.add('ready');
      activeOverlay.setAttribute('aria-label', 'ターン処理完了。画面をクリックまたはタップして閉じます');
    }

    function showOverlay(detail) {
      if (!detail || !detail.before || !detail.after) return;
      if (activeOverlay) activeOverlay.remove();
      suspendLegacyPresentation();
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
      activeOverlay.addEventListener('pointerdown', () => {
        pointerStarted = activeOverlay.classList.contains('ready');
      });
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

      const renderers = buildUnitRenderers(detail);
      runSequence(detail, renderers);
    }

    global.addEventListener('fgo:turn-resolution', (event) => showOverlay(event.detail));
    return true;
  }

  const API = {
    waveLabel,
    animationTarget,
    npAnimationValue,
    phaseLabel,
    actionLabel,
    installBrowserOverlay
  };

  global.FGO_BATTLE_PRESENTATION_OVERLAY = API;
  installBrowserOverlay();
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
