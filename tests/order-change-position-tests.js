'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/order-change-position.js');

function makeEngine() {
  return new BattleEngine({
    seed: 314058,
    startingStars: 0,
    mysticCodeId: 'chaldeaCombatUniform',
    party: [
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 10 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 20 },
      { servantId: 'aliceLiddell', skillLevel: 10, npLevel: 1, startingNp: 30 },
      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1, startingNp: 40 },
      { servantId: 'skadiCaster', skillLevel: 10, npLevel: 1, startingNp: 50 },
      { servantId: 'skadiRuler', skillLevel: 10, npLevel: 1, startingNp: 60 }
    ],
    enemies: [{
      enabled: true,
      name: 'オーダーチェンジ検証敵',
      classId: 'archer',
      attribute: 'sky',
      traits: ['servant'],
      hp: 9999999,
      attack: 1,
      dtdr: 1,
      deathRate: 0,
      chargeMax: 9,
      critRate: 0,
      npTarget: 'single'
    }]
  });
}

function ids(units) {
  return units.map((unit) => unit.id);
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

test('前衛2枠と控え2枠を交換すると双方が元の相手枠へ移動する', () => {
  const engine = makeEngine();
  const before = engine.getState().allies;
  const frontB = before.find((unit) => unit.id === 'ally-2');
  const reserveE = before.find((unit) => unit.id === 'ally-5');

  assert.strictEqual(frontB.slot, 1);
  assert.strictEqual(reserveE.slot, 4);

  const result = engine.orderChange(frontB.id, reserveE.id);
  assert.strictEqual(result.ok, true);

  const allies = engine.getState().allies;
  assert.deepStrictEqual(ids(allies), [
    'ally-1', 'ally-5', 'ally-3', 'ally-4', 'ally-2', 'ally-6'
  ]);
  assert.deepStrictEqual(ids(engine.getAliveAllies()), ['ally-1', 'ally-5', 'ally-3']);
  assert.deepStrictEqual(ids(engine.getReserveAllies()), ['ally-4', 'ally-2', 'ally-6']);

  assert.strictEqual(engine.getUnit('ally-5').slot, 1);
  assert.strictEqual(engine.getUnit('ally-5').frontline, true);
  assert.strictEqual(engine.getUnit('ally-2').slot, 4);
  assert.strictEqual(engine.getUnit('ally-2').frontline, false);
});

test('オーダーチェンジ後も各サーヴァントのHP・NP・状態を保持する', () => {
  const engine = makeEngine();
  const front = engine.getUnit('ally-2');
  const reserve = engine.getUnit('ally-5');

  front.hp -= 1234;
  front.np = 87.65;
  front.statuses.push({ type: 'attackUp', value: 30, remaining: 2, source: '検証' });
  reserve.hp -= 567;
  reserve.np = 142.5;
  reserve.statuses.push({ type: 'defenseUp', value: 20, remaining: 3, source: '検証' });

  engine.orderChange(front.id, reserve.id);

  assert.strictEqual(engine.getUnit('ally-2').hp, front.hp);
  assert.strictEqual(engine.getUnit('ally-2').np, 87.65);
  assert.ok(engine.getUnit('ally-2').statuses.some((status) => status.type === 'attackUp'));
  assert.strictEqual(engine.getUnit('ally-5').hp, reserve.hp);
  assert.strictEqual(engine.getUnit('ally-5').np, 142.5);
  assert.ok(engine.getUnit('ally-5').statuses.some((status) => status.type === 'defenseUp'));
});

test('別の枠同士でも交換先の枠位置を維持する', () => {
  const engine = makeEngine();
  const result = engine.orderChange('ally-1', 'ally-6');
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(ids(engine.getAliveAllies()), ['ally-6', 'ally-2', 'ally-3']);
  assert.deepStrictEqual(ids(engine.getReserveAllies()), ['ally-4', 'ally-5', 'ally-1']);
  assert.strictEqual(engine.getUnit('ally-6').slot, 0);
  assert.strictEqual(engine.getUnit('ally-1').slot, 5);
});

test('前衛同士または控え同士の指定は拒否する', () => {
  const engine = makeEngine();
  assert.strictEqual(engine.orderChange('ally-1', 'ally-2').ok, false);
  assert.strictEqual(engine.orderChange('ally-4', 'ally-5').ok, false);
});

console.log('\nオーダーチェンジ位置交換テストに合格しました。');
