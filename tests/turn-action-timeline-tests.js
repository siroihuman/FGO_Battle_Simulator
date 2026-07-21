'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/trigger-star-reward-effects.js');
require('../js/star-cap-99.js');
require('../js/battle-presentation.js');
const TIMELINE = require('../js/turn-action-timeline.js');

function makeEngine() {
  const enemies = Array.from({ length: 3 }, (_, index) => ({
    enabled: true,
    name: `タイムライン検証敵${index + 1}`,
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
  }));
  const engine = new BattleEngine({
    seed: 314058,
    startingStars: 0,
    party: Array.from({ length: 3 }, () => ({
      servantId: 'yaoyaOshichi',
      skillLevel: 10,
      npLevel: 1,
      startingNp: 0
    })),
    enemies
  });
  engine.rng = () => 0;
  const allies = engine.getState().allies;
  engine.getState().hand = allies.map((ally, index) => ({
    id: `timeline-card-${index + 1}`,
    actorId: ally.id,
    card: 'buster',
    cardIndex: 0,
    randomWeightBonus: 0,
    assignedStars: 0,
    critChance: 0
  })).concat([
    { id: 'filler-1', actorId: allies[0].id, card: 'arts', cardIndex: 1, randomWeightBonus: 0, assignedStars: 0, critChance: 0 },
    { id: 'filler-2', actorId: allies[1].id, card: 'quick', cardIndex: 2, randomWeightBonus: 0, assignedStars: 0, critChance: 0 }
  ]);
  engine.getState().selectedActions = allies.map((ally, index) => ({
    type: 'card',
    cardId: `timeline-card-${index + 1}`,
    actorId: ally.id,
    card: 'buster'
  }));
  engine._resolveAttackOnTarget = (actor, target, action) => {
    target.hp = Math.max(1, target.hp - 100);
    return {
      damage: 100,
      actualHpDamage: 100,
      np: 0,
      stars: Number(action.position || 0) + 1
    };
  };
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

test('味方3行動の後に敵3行動を編成順で記録する', () => {
  const engine = makeEngine();
  const response = engine.executeCommandChain();
  assert.strictEqual(response.ok, true);
  const timeline = engine.getLastTurnActionTimeline();
  assert.ok(timeline);
  assert.deepStrictEqual(
    timeline.steps.map((step) => step.phase),
    ['ally', 'ally', 'ally', 'enemy', 'enemy', 'enemy']
  );
  assert.deepStrictEqual(
    timeline.steps.slice(0, 3).map((step) => step.phaseOrder),
    [1, 2, 3]
  );
  assert.deepStrictEqual(
    timeline.steps.slice(3).map((step) => step.phaseOrder),
    [1, 2, 3]
  );
  assert.deepStrictEqual(
    timeline.steps.slice(0, 3).map((step) => step.actorId),
    ['ally-1', 'ally-2', 'ally-3']
  );
  assert.deepStrictEqual(
    timeline.steps.slice(3).map((step) => step.actorId),
    ['enemy-1', 'enemy-2', 'enemy-3']
  );
});

test('各行動は個別の前後スナップショットを保持する', () => {
  const engine = makeEngine();
  engine.executeCommandChain();
  const timeline = engine.getLastTurnActionTimeline();
  const allySteps = timeline.steps.filter((step) => step.phase === 'ally');
  assert.strictEqual(allySteps[0].before.units.get('enemy-1').hp, 999999);
  assert.strictEqual(allySteps[0].after.units.get('enemy-1').hp, 999899);
  assert.strictEqual(allySteps[1].before.units.get('enemy-1').hp, 999899);
  assert.strictEqual(allySteps[1].after.units.get('enemy-1').hp, 999799);
});

test('スター獲得数を行動ごとの累積値として記録する', () => {
  const engine = makeEngine();
  engine.executeCommandChain();
  const timeline = engine.getLastTurnActionTimeline();
  const allySteps = timeline.steps.filter((step) => step.phase === 'ally');
  assert.deepStrictEqual(allySteps.map((step) => step.starAfter), [1, 3, 6]);
  assert.strictEqual(timeline.starGain, 6);
});

test('表示用ラベルを味方・敵フェーズ別に生成する', () => {
  assert.strictEqual(TIMELINE.phaseLabel('ally'), '味方攻撃フェーズ');
  assert.strictEqual(TIMELINE.phaseLabel('enemy'), '敵攻撃フェーズ');
  assert.strictEqual(
    TIMELINE.actionLabel({ phase: 'ally', kind: 'card', phaseOrder: 2, card: 'arts' }),
    'コマンドカード 2：ARTS'
  );
  assert.strictEqual(
    TIMELINE.actionLabel({ phase: 'enemy', phaseOrder: 3, isNp: false }),
    'エネミー 3：攻撃'
  );
});

console.log('\nターン行動タイムラインテストに合格しました。');
