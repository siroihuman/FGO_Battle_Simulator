'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/turn-field-effects.js');
const TRAIT = require('../js/trait-trigger-aura-effects.js');
const LIFECYCLE = require('../js/trigger-lifecycle-effects.js');

function makeEngine() {
  return new BattleEngine({
    seed: 314058,
    party: [{ servantId: 'aliceLiddell', skillLevel: 10, npLevel: 1 }],
    enemies: [{
      enabled: true,
      name: 'ライフサイクル検証敵',
      classId: 'rider',
      attribute: 'sky',
      traits: ['サーヴァント'],
      hp: 99999999,
      attack: 1,
      dtdr: 1,
      deathRate: 0,
      instantDeathRate: 0,
      chargeMax: 9,
      critRate: 0,
      npTarget: 'single'
    }]
  });
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

test('ライフサイクルAPIを登録する', () => {
  assert.deepStrictEqual(LIFECYCLE.delayedEvents, ['turnStart', 'turnEnd']);
  assert.ok(LIFECYCLE.timing.turnStart.includes('ターン更新後'));
  assert.ok(LIFECYCLE.timing.turnEnd.includes('状態減少前'));
});

test('turnEndトリガーは状態の残りターン減少前に発動する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  engine._applyEffect({
    type: 'triggerEffect',
    target: 'self',
    event: 'turnEnd',
    uses: 1,
    duration: 1,
    effect: { type: 'npCharge', target: 'self', value: 10 }
  }, actor, actor.id, {});

  engine._finishTurn();
  assert.strictEqual(actor.np, 10);
  assert.strictEqual(actor.statuses.some((status) => status.type === 'triggerEffect'), false);
});

test('turnEnd型遅延は指定ターン終了時に1回だけ発動する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  let calls = 0;
  TRAIT.registerDelayedResolver('turnEndLifecycleTest', () => {
    calls += 1;
    return { type: 'npCharge', target: 'self', value: 20 };
  });
  engine._applyEffect({
    type: 'delayedEffect',
    target: 'self',
    delayTurns: 3,
    triggerEvent: 'turnEnd',
    resolver: 'turnEndLifecycleTest'
  }, actor, actor.id, {});

  engine._finishTurn();
  assert.strictEqual(calls, 0);
  engine._finishTurn();
  assert.strictEqual(calls, 0);
  engine._finishTurn();
  assert.strictEqual(calls, 1);
  assert.strictEqual(actor.np, 20);
  assert.strictEqual(actor.statuses.some((status) => status.type === 'delayedEffect'), false);
  engine._finishTurn();
  assert.strictEqual(calls, 1);
});

console.log('\nターンライフサイクルテストに合格しました。');
