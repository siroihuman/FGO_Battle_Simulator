'use strict';

const assert = require('assert');
require('../js/data.js');
require('../js/servants.js');
const { BattleEngine } = require('../js/engine.js');
const PROMOTION = require('../js/frontline-slot-promotion.js');

function enemy(overrides = {}) {
  return {
    enabled: true,
    name: '補充確認用エネミー',
    classId: 'archer',
    attribute: 'sky',
    traits: [],
    hp: 100000,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 3,
    critRate: 0,
    ...overrides
  };
}

function makeEngine(count = 6, enemyOverrides = {}) {
  const engine = new BattleEngine({
    seed: 13,
    party: Array.from({ length: count }, () => ({ servantId: 'fenrir', skillLevel: 10 })),
    enemies: [enemy(enemyOverrides)],
    startingStars: 0
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

test('中央の前衛が死亡すると控え先頭が中央枠へ入る', () => {
  const engine = makeEngine();
  engine.state.phase = 'enemy';
  const defeated = engine.state.allies.find((unit) => unit.slot === 1);
  const reserve = engine.state.allies.find((unit) => unit.slot === 3);

  engine._takeDamage(defeated, defeated.hp + 1, 'test');

  assert.strictEqual(defeated.alive, false);
  assert.strictEqual(defeated.frontline, false);
  assert.strictEqual(defeated.slot, 3);
  assert.strictEqual(reserve.frontline, true);
  assert.strictEqual(reserve.slot, 1);
  assert.deepStrictEqual(engine.getAliveAllies().map((unit) => unit.slot).sort(), [0, 1, 2]);
  assert.ok(engine.state.logs.some((entry) => entry.message.includes('前衛2枠へ登場')));
});

test('複数の前衛が死亡した場合は控えを順番に各空き枠へ補充する', () => {
  const engine = makeEngine();
  engine.state.phase = 'enemy';
  const first = engine.state.allies.find((unit) => unit.slot === 0);
  const third = engine.state.allies.find((unit) => unit.slot === 2);
  const reserve1 = engine.state.allies.find((unit) => unit.slot === 3);
  const reserve2 = engine.state.allies.find((unit) => unit.slot === 4);

  engine._takeDamage(first, first.hp + 1, 'test');
  engine._takeDamage(third, third.hp + 1, 'test');

  assert.strictEqual(reserve1.slot, 0);
  assert.strictEqual(reserve2.slot, 2);
  assert.strictEqual(reserve1.frontline, true);
  assert.strictEqual(reserve2.frontline, true);
  assert.deepStrictEqual(engine.getAliveAllies().map((unit) => unit.slot).sort(), [0, 1, 2]);
});

test('ガッツで生存した場合は控えを補充しない', () => {
  const engine = makeEngine(4);
  engine.state.phase = 'enemy';
  const frontline = engine.state.allies.find((unit) => unit.slot === 0);
  const reserve = engine.state.allies.find((unit) => unit.slot === 3);
  frontline.statuses.push({ type: 'guts', value: 1000, remaining: 3, uses: 1 });

  engine._takeDamage(frontline, frontline.hp + 1, 'test');

  assert.strictEqual(frontline.alive, true);
  assert.strictEqual(frontline.frontline, true);
  assert.strictEqual(frontline.slot, 0);
  assert.strictEqual(reserve.frontline, false);
  assert.strictEqual(reserve.slot, 3);
});

test('即死で前衛が死亡した場合も同じ枠へ控えを補充する', () => {
  const engine = makeEngine(4, { instantDeathRate: 10000 });
  engine.state.phase = 'enemy';
  const target = engine.state.allies.find((unit) => unit.slot === 2);
  const reserve = engine.state.allies.find((unit) => unit.slot === 3);
  const source = engine.getAliveEnemies()[0];

  assert.strictEqual(engine._applyInstantDeath(source, target), true);
  assert.strictEqual(target.alive, false);
  assert.strictEqual(target.frontline, false);
  assert.strictEqual(target.slot, 3);
  assert.strictEqual(reserve.frontline, true);
  assert.strictEqual(reserve.slot, 2);
});

test('補充後の次ターン山札は新しい前衛だけで再生成する', () => {
  const engine = makeEngine(4);
  engine.state.phase = 'enemy';
  const defeated = engine.state.allies.find((unit) => unit.slot === 1);
  const reserve = engine.state.allies.find((unit) => unit.slot === 3);

  engine._takeDamage(defeated, defeated.hp + 1, 'test');
  engine._finishTurn();

  const cardActorIds = new Set(engine.state.hand.concat(engine.state.deck).map((card) => card.actorId));
  assert.strictEqual(cardActorIds.has(defeated.id), false);
  assert.strictEqual(cardActorIds.has(reserve.id), true);
});

assert.strictEqual(PROMOTION.exactSlotReplacement, true);
assert.strictEqual(PROMOTION.gutsDoesNotPromote, true);
console.log('\n前衛枠補充テストに合格しました。');
