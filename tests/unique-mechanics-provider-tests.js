'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/card-buff-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/hp-loss-effects.js');
require('../js/turn-field-effects.js');
require('../js/trait-trigger-aura-effects.js');
const REGISTRY = require('../js/unique-mechanics/registry.js');
require('../js/unique-mechanics/runtime.js');

function makeEngine() {
  return new BattleEngine({
    seed: 314058,
    party: [
      { servantId: 'aliceLiddell', skillLevel: 10, npLevel: 1 },
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 },
      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1 }
    ],
    enemies: [{
      enabled: true,
      name: '固有フック検証敵',
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

test('providerイベント一覧を登録する', () => {
  assert.deepStrictEqual(REGISTRY.providerEvents, [
    'afterSkillUse', 'beforeAttackDamage', 'afterAttack', 'turnStart', 'turnEnd'
  ]);
});

test('他の味方の通常攻撃・宝具・Extra Attackへbefore/afterフックを配信する', () => {
  const calls = [];
  REGISTRY.register('aliceLiddell', {
    hooks: {
      beforeAttackDamage(engine, context) {
        calls.push({ event: 'before', provider: context.provider, actor: context.actor, target: context.target, action: context.action });
      },
      afterAttack(engine, context) {
        calls.push({ event: 'after', provider: context.provider, actor: context.actor, target: context.target, action: context.action, result: context.result });
      }
    }
  });

  const engine = makeEngine();
  const provider = engine.getState().allies[0];
  const actor = engine.getState().allies[1];
  const target = engine.getState().enemies[0];
  const actions = [
    { type: 'card', card: 'buster', position: 0, critical: false },
    { type: 'np', card: actor.data.np.card, position: 0, critical: false },
    { type: 'extra', card: 'extra', position: 0, critical: false, extraBonus: 2 }
  ];
  actions.forEach((action) => {
    engine.rng = () => 0.5;
    engine._resolveAttackOnTarget(actor, target, action, chainContext());
  });

  assert.strictEqual(calls.filter((entry) => entry.event === 'before').length, 3);
  assert.strictEqual(calls.filter((entry) => entry.event === 'after').length, 3);
  calls.forEach((entry) => {
    assert.strictEqual(entry.provider, provider);
    assert.strictEqual(entry.actor, actor);
    assert.strictEqual(entry.target, target);
    if (entry.event === 'after') assert.ok(entry.result && Number.isFinite(entry.result.damage));
  });
});

test('afterSkillUseへ使用者・スキル・対象・結果を渡す', () => {
  let received = null;
  REGISTRY.register('aliceLiddell', {
    hooks: {
      afterSkillUse(engine, context) {
        received = context;
      }
    }
  });
  const engine = makeEngine();
  const provider = engine.getState().allies[0];
  const actor = engine.getState().allies[1];
  actor.data.skills[0] = {
    id: 'providerHookTestSkill',
    name: 'フック検証スキル',
    baseCt: 1,
    target: 'self',
    effects: [{ type: 'npCharge', target: 'self', value: 10 }]
  };
  actor.cooldowns[0] = 0;
  const result = engine.useSkill(actor.id, 0, actor.id);
  assert.strictEqual(result.ok, true);
  assert.ok(received);
  assert.strictEqual(received.provider, provider);
  assert.strictEqual(received.actor, actor);
  assert.strictEqual(received.skill.id, 'providerHookTestSkill');
  assert.strictEqual(received.skillIndex, 0);
  assert.strictEqual(received.selectedTargetId, actor.id);
  assert.strictEqual(received.result, result);
});

test('turnStartとturnEndを生存providerへ配信する', () => {
  const events = [];
  REGISTRY.register('aliceLiddell', {
    hooks: {
      turnEnd(engine, context) { events.push(`end-${context.turn}`); },
      turnStart(engine, context) { events.push(`start-${context.turn}`); }
    }
  });
  const engine = makeEngine();
  engine._finishTurn();
  assert.deepStrictEqual(events, ['end-1', 'start-2']);
});

test('通常providerは控え・戦闘不能時に停止する', () => {
  let calls = 0;
  REGISTRY.register('aliceLiddell', {
    hooks: {
      beforeAttackDamage() { calls += 1; }
    }
  });
  const engine = makeEngine();
  const provider = engine.getState().allies[0];
  const actor = engine.getState().allies[1];
  const target = engine.getState().enemies[0];
  provider.frontline = false;
  engine._resolveAttackOnTarget(actor, target, { type: 'card', card: 'buster', position: 0, critical: false }, chainContext());
  assert.strictEqual(calls, 0);
  provider.frontline = true;
  provider.alive = false;
  engine._resolveAttackOnTarget(actor, target, { type: 'card', card: 'buster', position: 0, critical: false }, chainContext());
  assert.strictEqual(calls, 0);
});

test('providerScope allAliveは控えからもイベントを提供する', () => {
  let calls = 0;
  REGISTRY.register('aliceLiddell', {
    providerScope: 'allAlive',
    hooks: {
      beforeAttackDamage() { calls += 1; }
    }
  });
  const engine = makeEngine();
  const provider = engine.getState().allies[0];
  const actor = engine.getState().allies[1];
  const target = engine.getState().enemies[0];
  provider.frontline = false;
  engine._resolveAttackOnTarget(actor, target, { type: 'card', card: 'buster', position: 0, critical: false }, chainContext());
  assert.strictEqual(calls, 1);
});

console.log('\n固有例外providerイベントテストに合格しました。');
