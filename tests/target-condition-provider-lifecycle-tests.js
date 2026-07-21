'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/turn-field-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/trigger-lifecycle-effects.js');

function makeEngine() {
  return new BattleEngine({
    seed: 314058,
    party: [
      { servantId: 'aliceLiddell', skillLevel: 10, npLevel: 1 },
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 }
    ],
    enemies: [{
      enabled: true,
      name: '対象条件検証敵',
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

function chainContext() {
  return {
    firstBonuses: { buster: false, arts: false, quick: false },
    busterChain: false,
    artsChain: false,
    quickChain: false,
    mighty: false
  };
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

test('not(targetHasTrait)は候補対象ごとに判定する', () => {
  const engine = makeEngine();
  const source = engine.getState().allies[0];
  const excluded = engine.getState().allies[1];
  const included = engine.getState().allies[2];
  engine._addStatus(excluded, {
    type: 'temporaryTrait',
    trait: '不思議の国の住人',
    duration: 3
  }, 0, '検証');

  engine._applyEffect({
    type: 'npCharge',
    target: 'allOtherAllies',
    value: 20,
    condition: {
      kind: 'not',
      condition: { kind: 'targetHasTrait', key: '不思議の国の住人' }
    }
  }, source, source.id, {});

  assert.strictEqual(source.np, 0);
  assert.strictEqual(excluded.np, 0);
  assert.strictEqual(included.np, 20);
});

test('provider型トリガーは控えへ移動すると停止する', () => {
  const engine = makeEngine();
  const provider = engine.getState().allies[0];
  const actor = engine.getState().allies[1];
  const enemy = engine.getState().enemies[0];
  engine._applyEffect({
    type: 'triggerEffect',
    target: 'self',
    event: 'afterAttack',
    provider: true,
    duration: 3,
    effect: { type: 'npCharge', target: 'self', value: 10 }
  }, provider, provider.id, {});

  provider.frontline = false;
  engine.rng = () => 0.5;
  engine._resolveAttackOnTarget(
    actor,
    enemy,
    { type: 'card', card: 'buster', position: 0, critical: false },
    chainContext()
  );
  assert.strictEqual(provider.np, 0);

  provider.frontline = true;
  engine.rng = () => 0.5;
  engine._resolveAttackOnTarget(
    actor,
    enemy,
    { type: 'card', card: 'buster', position: 0, critical: false },
    chainContext()
  );
  assert.strictEqual(provider.np, 10);
});

console.log('\n対象依存条件・provider停止テストに合格しました。');
