'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/trigger-star-reward-effects.js');
const STAR_CAP = require('../js/star-cap-99.js');

function makeEngine(startingStars = 0) {
  const engine = new BattleEngine({
    seed: 314058,
    startingStars,
    party: [{ servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1 }],
    enemies: [{
      enabled: true,
      name: 'スター上限検証敵',
      classId: 'rider',
      attribute: 'sky',
      traits: ['サーヴァント'],
      hp: 999999,
      attack: 1,
      dtdr: 1,
      deathRate: 0,
      instantDeathRate: 0,
      chargeMax: 9,
      critRate: 0,
      npTarget: 'single'
    }]
  });
  engine.rng = () => 0;
  return engine;
}

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('開始スターを99個まで保持する', () => {
  const engine = makeEngine(150);
  assert.strictEqual(STAR_CAP.STAR_CAP, 99);
  assert.strictEqual(engine.getState().stars, 99);
});

test('コマンドフェイズのスター獲得は99個を上限とする', () => {
  const engine = makeEngine(95);
  const actor = engine.getState().allies[0];
  engine._applyEffect({ type: 'stars', target: 'party', value: 10 }, actor, actor.id, {});
  assert.strictEqual(engine.getState().stars, 99);
});

test('攻撃中に獲得した次ターンスターも99個を上限とする', () => {
  const engine = makeEngine(0);
  const actor = engine.getState().allies[0];
  engine.getState().phase = 'playerAttack';
  engine.getState().nextStars = 95;
  engine._applyEffect({ type: 'stars', target: 'party', value: 10 }, actor, actor.id, {});
  assert.strictEqual(engine.getState().nextStars, 99);
});

test('ターン更新後も99個を維持し、カード配分は最大50個に限定する', () => {
  const engine = makeEngine(0);
  engine.getState().nextStars = 99;
  engine._finishTurn();
  assert.strictEqual(engine.getState().stars, 99);
  const assigned = engine.getState().hand.reduce((sum, card) => sum + Number(card.assignedStars || 0), 0);
  assert.strictEqual(assigned, 50);
});

test('初期スター入力の上限を99へ変更するUI処理を登録する', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(__dirname, '../js/star-cap-99.js'), 'utf8');
  assert.ok(source.includes('input[name="stars"]'));
  assert.ok(source.includes('input.max = String(STAR_CAP)'));
});

console.log('\nスター99個上限テストに合格しました。');
