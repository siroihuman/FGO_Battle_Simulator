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

test('全画面表示・完了後クリック解除・旧内部枠非表示を登録する', () => {
  const js = fs.readFileSync(path.join(__dirname, '../js/battle-presentation-overlay.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../css/battle-presentation-overlay.css'), 'utf8');
  assert.ok(js.includes("global.addEventListener('fgo:turn-resolution'"));
  assert.ok(js.includes("activeOverlay.classList.add('ready')"));
  assert.ok(js.includes("activeOverlay.addEventListener('pointerup'"));
  assert.ok(js.includes('closeOverlay()'));
  assert.ok(css.includes('position: fixed'));
  assert.ok(css.includes('inset: 0'));
  assert.ok(css.includes('body.battle-resolution-overlay-active .turn-resolution-panel'));
  assert.ok(css.includes('.battle-resolution-overlay.ready'));
});

console.log('\n全画面ターン処理表示テストに合格しました。');
