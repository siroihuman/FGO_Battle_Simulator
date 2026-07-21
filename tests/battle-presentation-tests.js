'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PRESENTATION = require('../js/battle-presentation.js');

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function ally(id, servantId, slot, overrides = {}) {
  return {
    id,
    servantId,
    name: overrides.name || servantId,
    slot,
    frontline: slot < 3,
    alive: true,
    hp: 1000,
    maxHp: 2000,
    np: 50,
    ...overrides
  };
}

function enemy(id, overrides = {}) {
  return {
    id,
    name: overrides.name || id,
    alive: true,
    hp: 5000,
    maxHp: 5000,
    ...overrides
  };
}

test('同一サーヴァントを編成順で識別する', () => {
  const first = ally('a1', 'sameServant', 0);
  const second = ally('a2', 'sameServant', 2);
  const reserve = ally('a3', 'sameServant', 4);
  const state = { allies: [second, reserve, first] };
  assert.deepStrictEqual(PRESENTATION.duplicateIdentity(state, first), {
    index: 1,
    count: 3,
    label: '同名1',
    position: '前衛1',
    className: 'duplicate-tone-1'
  });
  assert.strictEqual(PRESENTATION.duplicateIdentity(state, second).label, '同名2');
  assert.strictEqual(PRESENTATION.duplicateIdentity(state, reserve).position, '控え2');
});

test('単独編成のサーヴァントには識別バッジを付けない', () => {
  const unit = ally('a1', 'uniqueServant', 0);
  assert.strictEqual(PRESENTATION.duplicateIdentity({ allies: [unit] }, unit), null);
});

test('ターン前後のHP・NPスナップショットを保持する', () => {
  const state = {
    wave: 2,
    turn: 4,
    winner: null,
    allies: [ally('a1', 'servant', 0, { hp: 1250, np: 145.25 })],
    enemies: [enemy('e1', { hp: 3400 })]
  };
  const snapshot = PRESENTATION.snapshot(state);
  assert.strictEqual(snapshot.wave, 2);
  assert.strictEqual(snapshot.turn, 4);
  assert.strictEqual(snapshot.units.get('a1').hp, 1250);
  assert.strictEqual(snapshot.units.get('a1').np, 145.25);
  assert.strictEqual(snapshot.units.get('e1').np, null);
});

test('ゲージ値を開始値から終了値へ補間する', () => {
  const before = { id: 'a1', side: 'ally', alive: true, hp: 1000, maxHp: 2000, np: 20 };
  const after = { ...before, hp: 400, np: 80 };
  const middle = PRESENTATION.interpolateUnit(before, after, 0.5);
  assert.strictEqual(middle.hp, 700);
  assert.strictEqual(middle.np, 50);
  assert.strictEqual(PRESENTATION.gaugePercent(middle.hp, middle.maxHp), 35);
});

test('Wave移行で消えた敵はHP0へアニメーションする', () => {
  const before = PRESENTATION.snapshot({
    wave: 1,
    turn: 1,
    allies: [ally('a1', 'servant', 0)],
    enemies: [enemy('oldEnemy')]
  });
  const after = PRESENTATION.snapshot({
    wave: 2,
    turn: 2,
    allies: [ally('a1', 'servant', 0)],
    enemies: [enemy('newEnemy')]
  });
  const target = PRESENTATION.animationTarget(before.units.get('oldEnemy'), after);
  assert.strictEqual(target.hp, 0);
  assert.strictEqual(target.alive, false);
});

test('app.jsはスクロール固定・ゲージ表示・自動次ターン遷移を登録する', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  assert.ok(source.includes('function restoreViewport'));
  assert.ok(source.includes('function animateTurnResolution'));
  assert.ok(source.includes('ALLY HP / NP'));
  assert.ok(source.includes('await animateTurnResolution(before, after, viewport)'));
  assert.ok(source.includes('renderBattle({ viewport })'));
  assert.ok(source.includes('duplicate-servant-badge'));
});

console.log('\n戦闘表示・ゲージアニメーションテストに合格しました。');
