'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DATA = require('../js/data.js');
require('../js/servants.js');
const ENGINE = require('../js/engine.js');
const GRAND = require('../js/grand-score-core.js');
const FOU = require('../js/fou-cap-3000.js');
const BattleEngine = ENGINE.BattleEngine;

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function createEngine(slot, grandScoreEnabled = true) {
  return new BattleEngine({
    seed: 1,
    grandScoreEnabled,
    grandServantFlags: [Boolean(slot.grandServant)],
    party: [slot],
    enemies: [{
      enabled: true,
      name: 'フォウ上限確認用エネミー',
      classId: 'archer',
      hp: 100000,
      attack: 1,
      actionCount: 0
    }]
  });
}

test('通常フォウ強化を3000まで反映する', () => {
  const base = DATA.servants.fenrir.levelStats.max;
  const engine = createEngine({
    servantId: 'fenrir',
    fouHp: 3000,
    fouAtk: 3000
  }, false);
  const unit = engine.state.allies[0];
  assert.strictEqual(unit.fouHp, 3000);
  assert.strictEqual(unit.fouAtk, 3000);
  assert.strictEqual(unit.maxHp, base.hp + 3000);
  assert.strictEqual(unit.hp, unit.maxHp);
  assert.strictEqual(unit.atk, base.atk + 3000);
});

test('通常フォウ強化が3000を超えた場合は3000へ丸める', () => {
  const engine = createEngine({
    servantId: 'fenrir',
    fouHp: 4500,
    fouAtk: 9999
  }, false);
  const unit = engine.state.allies[0];
  assert.strictEqual(unit.fouHp, 3000);
  assert.strictEqual(unit.fouAtk, 3000);
});

test('グランド+1000適用後も最終フォウ値を3000に抑える', () => {
  const base = DATA.servants.fenrir.levelStats.max;
  const engine = createEngine({
    servantId: 'fenrir',
    grandServant: true,
    fouHp: 2500,
    fouAtk: 2750
  });
  const unit = engine.state.allies[0];
  assert.strictEqual(unit.grandServant, true);
  assert.strictEqual(unit.fouHp, 3000);
  assert.strictEqual(unit.fouAtk, 3000);
  assert.strictEqual(unit.grandFouHp, 500);
  assert.strictEqual(unit.grandFouAtk, 250);
  assert.strictEqual(unit.maxHp, base.hp + 3000);
  assert.strictEqual(unit.atk, base.atk + 3000);
});

test('通常フォウ3000ではグランド補正による超過を発生させない', () => {
  const engine = createEngine({
    servantId: 'fenrir',
    grandServant: true,
    fouHp: 3000,
    fouAtk: 3000
  });
  const unit = engine.state.allies[0];
  assert.strictEqual(unit.fouHp, 3000);
  assert.strictEqual(unit.fouAtk, 3000);
  assert.strictEqual(unit.grandFouHp, 0);
  assert.strictEqual(unit.grandFouAtk, 0);
});

test('上限API・編成UI補助・読込順を公開する', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '../js/fou-cap-3000.js'), 'utf8');
  assert.strictEqual(FOU.maximumFouEnhancement, 3000);
  assert.strictEqual(FOU.grandFouBonus, 1000);
  assert.strictEqual(FOU.capAppliedAfterGrandBonus, true);
  assert.deepStrictEqual(DATA.fouEnhancement, {
    maximum: 3000,
    grandBonus: 1000,
    capAppliedAfterGrandBonus: true
  });
  assert.strictEqual(FOU.clampFou(3500), 3000);
  assert.strictEqual(FOU.clampFou(-10), 0);
  assert.strictEqual(GRAND.grandFouBonus.treatedAsFouEnhancement, true);
  assert.ok(source.includes("input.max = String(MAX_FOU)"));
  assert.ok(html.includes('js/fou-cap-3000.js'));
  assert.ok(html.indexOf('js/fou-cap-3000.js') > html.indexOf('js/grand-score-core.js'));
  assert.ok(html.indexOf('js/fou-cap-3000.js') < html.indexOf('js/grand-score-chain.js'));
  assert.ok(html.indexOf('js/fou-cap-3000.js') < html.indexOf('js/app.js'));
});

console.log('\nフォウ強化上限3000回帰テストに合格しました。');
