'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('全画面表示を味方・敵の順次行動へ接続する', () => {
  const js = fs.readFileSync(path.join(__dirname, '../js/battle-presentation-overlay.js'), 'utf8');
  assert.ok(js.includes('runSequence(detail, renderers)'));
  assert.ok(js.includes('for (const step of steps)'));
  assert.ok(js.includes('await animateStep(step'));
  assert.ok(js.includes('setPhase(step.phase)'));
  assert.ok(js.includes("step.kind === 'np'"));
});

test('行動開始時に行動者枠を発光させる', () => {
  const js = fs.readFileSync(path.join(__dirname, '../js/battle-presentation-overlay.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../css/battle-action-sequence.css'), 'utf8');
  assert.ok(js.includes("renderer.element.classList.add('acting')"));
  assert.ok(css.includes('.battle-resolution-unit.acting'));
  assert.ok(css.includes('@keyframes battle-resolution-actor-flash'));
  assert.ok(css.includes('@keyframes battle-resolution-enemy-flash'));
});

test('スター獲得数と99個上限を全画面表示へ追加する', () => {
  const js = fs.readFileSync(path.join(__dirname, '../js/battle-presentation-overlay.js'), 'utf8');
  assert.ok(js.includes('獲得スター'));
  assert.ok(js.includes('data-resolution-stars'));
  assert.ok(js.includes('<small>/99</small>'));
  assert.ok(js.includes('step.starAfter'));
});

test('フェーズ表示を味方1・敵2の順序で表示する', () => {
  const js = fs.readFileSync(path.join(__dirname, '../js/battle-presentation-overlay.js'), 'utf8');
  assert.ok(js.includes('1　味方攻撃フェーズ'));
  assert.ok(js.includes('2　敵攻撃フェーズ'));
  assert.ok(js.includes('data-phase-tab="ally"'));
  assert.ok(js.includes('data-phase-tab="enemy"'));
});

console.log('\n順次攻撃アニメーション表示テストに合格しました。');
