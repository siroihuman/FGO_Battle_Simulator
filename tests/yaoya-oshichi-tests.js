'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: '八百屋お七検証敵',
    classId: 'rider',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 1000000,
    attack: 1000,
    dtdr: 1,
    deathRate: 20,
    instantDeathRate: 0,
    chargeMax: 9,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(extra = {}) {
  return new BattleEngine({
    seed: 1,
    startingStars: 0,
    party: [{ servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 100 }],
    enemies: [baseEnemy()],
    ...extra
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

test('八百屋お七の基本データを登録', () => {
  const servant = DATA.servants.yaoyaOshichi;
  assert.ok(servant);
  assert.strictEqual(servant.no, '001');
  assert.strictEqual(servant.classId, 'assassin');
  assert.strictEqual(servant.rarity, 3);
  assert.strictEqual(servant.maxLevel, 70);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 8464, atk: 7161 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 11476, atk: 9692 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 13489, atk: 11383 });
  assert.deepStrictEqual(servant.cards, ['quick', 'quick', 'quick', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 4, arts: 3, buster: 3, extra: 6, np: 7 });
  assert.strictEqual(servant.na, 0.71);
  assert.strictEqual(servant.nd, 4);
  assert.strictEqual(servant.starRate, 25.1);
  assert.strictEqual(servant.starWeight, 97);
  assert.strictEqual(servant.deathRate, 42.6);
});

test('S1は自身Quick20%・味方全体攻防20%・回避1回3Tを付与', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const result = engine.useSkill(ally.id, 0, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }), 20);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(ally, 'defenseUp'), 20);
  const evade = ally.statuses.find((status) => status.type === 'evade');
  assert.ok(evade);
  assert.strictEqual(evade.uses, 1);
  assert.strictEqual(evade.remaining, 3);
});

test('S2は攻撃力20%・通常攻撃時魅了50%・魅了成功率50%を付与', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const result = engine.useSkill(ally.id, 1, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(ally, 'charmSuccessUp'), 50);
  const trigger = ally.statuses.find((status) => status.type === 'onNormalAttackApplyDebuff');
  assert.ok(trigger);
  assert.strictEqual(trigger.debuffType, 'charm');
  assert.strictEqual(trigger.chance, 50);
  assert.strictEqual(trigger.debuffDuration, 1);
  assert.strictEqual(trigger.remaining, 3);
});

test('S2の通常攻撃時魅了は成功率補正を含めて発動', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine.useSkill(ally.id, 1, ally.id);
  engine.rng = () => 0.99;
  engine._runEffectHooks('afterNormalAttack', {
    actor: ally,
    target: enemy,
    action: { type: 'card', card: 'quick' }
  });
  assert.ok(enemy.statuses.some((status) => status.type === 'charm'));
  assert.ok(engine.getState().logs.at(-1).message.includes('補正後100%'));
});

test('S3は1T回避・Quick20%・スター発生率50%を付与', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const result = engine.useSkill(ally.id, 2, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }), 20);
  assert.strictEqual(engine._statusTotal(ally, 'starRateUp'), 56.5);
  const evade = ally.statuses.find((status) => status.type === 'evade');
  assert.ok(evade);
  assert.strictEqual(evade.uses, null);
  assert.strictEqual(evade.remaining, 1);
});

test('強化後宝具は愛する者特攻とやけど・延焼・クリ発生率ダウンを持つ', () => {
  const np = DATA.servants.yaoyaOshichi.np;
  assert.deepStrictEqual(np.multipliers, [800, 1000, 1100, 1150, 1200]);
  assert.deepStrictEqual(np.special, {
    kind: 'trait',
    key: '愛する者',
    ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
  });
  assert.deepStrictEqual(np.after.map((effect) => effect.type), ['burn', 'dotAmplify', 'critRateDown']);
  assert.deepStrictEqual(np.after[0].ocValues, [1000, 1250, 1500, 1750, 2000]);
  assert.strictEqual(np.after[1].dotType, 'burn');
  assert.strictEqual(np.after[1].value, 100);
  assert.strictEqual(np.after[2].value, 20);
});

test('宝具後効果はOC1でやけど1000・延焼100%・クリ発生率20%ダウンを付与', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  ally.data.np.after.forEach((effect) => engine._applyEffect(effect, ally, enemy.id, { oc: 1, level: 10 }));
  assert.strictEqual(engine._statusTotal(enemy, 'burn'), 1000);
  assert.strictEqual(engine._statusTotal(enemy, 'dotAmplify'), 100);
  assert.strictEqual(engine._statusTotal(enemy, 'critRateDown'), 20);
  assert.deepStrictEqual(engine._dotDamage(enemy, 'burn'), { base: 1000, amplify: 100, total: 2000 });
});

console.log('\n八百屋お七の全テストに合格しました。');
