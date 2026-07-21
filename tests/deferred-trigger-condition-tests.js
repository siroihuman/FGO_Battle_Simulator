'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/common-effects-extra-attack.js');
require('../js/card-buff-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/hp-loss-effects.js');
require('../js/turn-field-effects.js');
require('../js/trait-trigger-aura-effects.js');
const LIFECYCLE = require('../js/trigger-lifecycle-effects.js');

function makeEngine(party) {
  return new BattleEngine({
    seed: 190019,
    party: party || [
      { servantId: 'inugamiGyobu', skillLevel: 10, npLevel: 1 },
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1 },
      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 }
    ],
    enemies: [{
      enabled: true,
      name: '遅延条件検証敵',
      classId: 'rider',
      attribute: 'earth',
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

function attack(engine, actor, target) {
  engine.rng = () => 0.5;
  return engine._resolveAttackOnTarget(
    actor,
    target,
    { type: 'card', card: 'arts', position: 0, critical: false },
    chainContext()
  );
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

test('遅延評価型状態とcondition/targetConditionの意味を公開する', () => {
  assert.ok(LIFECYCLE.deferredConditionTypes.includes('triggerEffect'));
  assert.ok(LIFECYCLE.deferredConditionTypes.includes('beforeAttackApplyTemporaryTrait'));
  assert.ok(LIFECYCLE.deferredConditionTypes.includes('delayedEffect'));
  assert.ok(LIFECYCLE.deferredConditionTypes.includes('aura'));
  assert.ok(LIFECYCLE.conditionSemantics.condition.includes('発動時'));
  assert.ok(LIFECYCLE.conditionSemantics.targetCondition.includes('付与する対象'));
});

test('targetHasTrait条件付きafterAttack状態は付与時に消えず攻撃時に判定する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];

  engine._applyEffect({
    type: 'triggerEffect',
    target: 'self',
    event: 'afterAttack',
    duration: 3,
    condition: { kind: 'targetHasTrait', key: 'チェック' },
    effect: {
      type: 'temporaryTrait',
      target: 'self',
      trait: 'チェックメイト',
      duration: 3
    }
  }, actor, actor.id, {});

  const trigger = actor.statuses.find((status) =>
    status.type === 'triggerEffect' && status.event === 'afterAttack'
  );
  assert.ok(trigger);
  assert.deepStrictEqual(trigger.condition, { kind: 'targetHasTrait', key: 'チェック' });

  attack(engine, actor, enemy);
  assert.strictEqual(
    engine.countStatusStacks(actor, { type: 'temporaryTrait', trait: 'チェックメイト' }),
    0
  );

  engine._applyEffect({
    type: 'temporaryTrait',
    target: 'selectedEnemy',
    trait: 'チェック',
    duration: 1,
    debuff: true,
    chance: 100
  }, actor, enemy.id, {});

  attack(engine, actor, enemy);
  assert.strictEqual(
    engine.countStatusStacks(actor, { type: 'temporaryTrait', trait: 'チェックメイト' }),
    1
  );
});

test('sourceHasTrait条件も状態付与時ではなくイベント発火時に判定する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  actor.np = 0;

  engine._applyEffect({
    type: 'triggerEffect',
    target: 'self',
    event: 'afterAttack',
    duration: 3,
    condition: { kind: 'sourceHasTrait', key: '起動' },
    effect: { type: 'npCharge', target: 'self', value: 10 }
  }, actor, actor.id, {});

  assert.ok(actor.statuses.some((status) => status.type === 'triggerEffect'));
  attack(engine, actor, enemy);
  assert.strictEqual(actor.np, 0);

  engine._applyEffect({
    type: 'temporaryTrait',
    target: 'self',
    trait: '起動',
    duration: 3
  }, actor, actor.id, {});
  attack(engine, actor, enemy);
  assert.strictEqual(actor.np, 10);
});

test('targetConditionは遅延評価型状態の初期付与対象だけを絞り込む', () => {
  const engine = makeEngine();
  const source = engine.getState().allies[0];
  const markedFront = engine.getState().allies[1];
  const unmarkedFront = engine.getState().allies[2];
  const markedReserve = engine.getState().allies[3];

  [markedFront, markedReserve].forEach((unit) => {
    engine._applyEffect({
      type: 'temporaryTrait',
      target: unit.frontline ? 'selectedAlly' : 'allAlliesIncludingReserve',
      trait: '不思議の国の住人',
      duration: 3,
      targetCondition: unit.frontline
        ? undefined
        : { kind: 'targetHasStatus', key: '__never__' }
    }, source, unit.id, {});
  });

  // 控えへの直接付与は共通対象APIを使って状態を追加する。
  if (!engine.hasTrait(markedReserve, '不思議の国の住人')) {
    engine._addStatus(markedReserve, {
      type: 'temporaryTrait', trait: '不思議の国の住人', duration: 3
    }, 0, '検証');
  }

  engine._applyEffect({
    type: 'triggerEffect',
    target: 'allAlliesIncludingReserve',
    targetCondition: { kind: 'targetHasTrait', key: '不思議の国の住人' },
    event: 'turnStart',
    duration: 3,
    condition: { kind: 'sourceHasTrait', key: '起動' },
    effect: { type: 'npCharge', target: 'self', value: 5 }
  }, source, source.id, {});

  assert.strictEqual(source.statuses.some((status) => status.type === 'triggerEffect'), false);
  assert.strictEqual(markedFront.statuses.some((status) => status.type === 'triggerEffect'), true);
  assert.strictEqual(unmarkedFront.statuses.some((status) => status.type === 'triggerEffect'), false);
  assert.strictEqual(markedReserve.statuses.some((status) => status.type === 'triggerEffect'), true);
});

console.log('\n遅延トリガー条件の回帰テストに合格しました。');