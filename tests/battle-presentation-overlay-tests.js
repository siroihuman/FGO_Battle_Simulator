'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PRESENTATION = require('../js/battle-presentation.js');
const OVERLAY = require('../js/battle-presentation-overlay.js');

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function unit(id, side, hp = 1000) {
  return {
    id,
    side,
    name: id,
    alive: hp > 0,
    hp,
    maxHp: 1000,
    np: side === 'ally' ? 50 : null,
    frontline: true,
    slot: 0
  };
}

test('Wave移行時の見出しに旧Waveと新Waveを表示する', () => {
  assert.strictEqual(
    OVERLAY.waveLabel({ wave: 1 }, { wave: 2 }, 3),
    'WAVE 1/3 COMPLETE → WAVE 2/3'
  );
  assert.strictEqual(
    OVERLAY.waveLabel({ wave: 2 }, { wave: 3 }, 3),
    'WAVE 2/3 COMPLETE → WAVE 3/3'
  );
});

test('同一Wave継続時は現在Waveだけを表示する', () => {
  assert.strictEqual(OVERLAY.waveLabel({ wave: 2 }, { wave: 2 }, 3), 'WAVE 2/3');
});

test('敵IDが次Waveで再利用されても旧敵はHP0をアニメーション目標にする', () => {
  const before = PRESENTATION.snapshot({
    wave: 1,
    allies: [unit('ally', 'ally')],
    enemies: [unit('enemy-1', 'enemy')]
  });
  const after = PRESENTATION.snapshot({
    wave: 2,
    allies: [unit('ally', 'ally')],
    enemies: [unit('enemy-1', 'enemy')]
  });
  const target = OVERLAY.animationTarget(before.units.get('enemy-1'), after);
  assert.strictEqual(target.hp, 0);
  assert.strictEqual(target.alive, false);
});

test('宝具使用者のNPは開始値から0を経由してリチャージ値へ増加する', () => {
  assert.strictEqual(OVERLAY.npAnimationValue(125, 42.5, 0, true), 125);
  assert.ok(OVERLAY.npAnimationValue(125, 42.5, 0.2, true) < 125);
  assert.ok(Math.abs(OVERLAY.npAnimationValue(125, 42.5, 0.34, true)) < 1e-9);
  assert.ok(OVERLAY.npAnimationValue(125, 42.5, 0.6, true) > 0);
  assert.ok(Math.abs(OVERLAY.npAnimationValue(125, 42.5, 1, true) - 42.5) < 1e-9);
});

test('宝具未使用者のNPは通常の開始値から終了値へ補間する', () => {
  assert.strictEqual(OVERLAY.npAnimationValue(20, 80, 0, false), 20);
  const middle = OVERLAY.npAnimationValue(20, 80, 0.5, false);
  assert.ok(middle > 20 && middle < 80);
  assert.strictEqual(OVERLAY.npAnimationValue(20, 80, 1, false), 80);
});

test('全画面表示・宝具使用者記録・旧アニメーション停止・滑らかな描画を登録する', () => {
  const js = fs.readFileSync(path.join(__dirname, '../js/battle-presentation-overlay.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../css/battle-presentation-overlay.css'), 'utf8');
  const smoothCss = fs.readFileSync(path.join(__dirname, '../css/battle-presentation-smooth.css'), 'utf8');
  assert.ok(js.includes("global.addEventListener('fgo:turn-resolution'"));
  assert.ok(js.includes('npActorIds'));
  assert.ok(js.includes('npAnimationValue'));
  assert.ok(js.includes('buildUnitRenderers'));
  assert.ok(js.includes('suspendLegacyPresentation'));
  assert.ok(js.includes("legacyPanel.classList.remove('command-panel')"));
  assert.ok(js.includes('renderer.npFill.style.transform'));
  assert.ok(js.includes("activeOverlay.classList.add('ready')"));
  assert.ok(js.includes("activeOverlay.addEventListener('pointerup'"));
  assert.ok(css.includes('position: fixed'));
  assert.ok(css.includes('inset: 0'));
  assert.ok(smoothCss.includes('will-change: transform'));
  assert.ok(smoothCss.includes('transform-origin: left center'));
});

console.log('\n全画面ターン処理表示テストに合格しました。');
