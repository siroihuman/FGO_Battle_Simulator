'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: '隠神刑部検証敵',
    classId: 'assassin',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 1000000,
    attack: 1,
    dtdr: 1,
    deathRate: 20,
    instantDeathRate: 0,
    chargeMax: 9,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(party = [
  { servantId: 'inugamiGyobu', skillLevel: 10, npLevel: 1, startingNp: 0 },
  { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 0 }
]) {
  return new BattleEngine({
    seed: 2,
    startingStars: 0,
    party,
    enemies: [baseEnemy()]
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

test('隠神刑部の基本データを登録', () => {
  const servant = DATA.servants.inugamiGyobu;
  assert.ok(servant);
  assert.strictEqual(servant.no, '002');
  assert.strictEqual(servant.classId, 'caster');
  assert.strictEqual(servant.rarity, 1);
  assert.strictEqual(servant.maxLevel, 60);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 7350, atk: 5273 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 11330, atk: 8194 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 13324, atk: 9657 });
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'arts', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 3, arts: 2, buster: 1, extra: 4, np: 3 });
  assert.strictEqual(servant.na, 0.49);
  assert.strictEqual(servant.nd, 3);
  assert.strictEqual(servant.starRate, 10.7);
  assert.strictEqual(servant.starWeight, 48);
  assert.strictEqual(servant.deathRate, 36);
});

test('クラススキルはArts8%・弱体成功率8%・与ダメージ200・スター発生率6%', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 8);
  assert.strictEqual(engine._statusTotal(actor, 'debuffSuccess'), 8);
  assert.strictEqual(engine._statusTotal(actor, 'damagePlus'), 200);
  assert.strictEqual(engine._statusTotal(actor, 'starRateUp'), 6);
});

test('S1は自身へ合計NP30・味方へNP10を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 0, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(actor.np, 30);
  assert.strictEqual(ally.np, 10);
});

test('S2は味方全体へ攻撃力20%・Arts20%を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 1, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 28);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'arts' }), 20);
});

test('強化後S3は自身Arts20%・選択した味方へNP獲得量20%とNP10を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 2, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 28);
  assert.strictEqual(engine._statusTotal(ally, 'npGainUp'), 20);
  assert.strictEqual(ally.np, 10);
  assert.strictEqual(actor.np, 0);
});

test('宝具は攻撃前に味方全体へ攻撃力OC依存・Arts10%を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const np = actor.data.np;

  assert.deepStrictEqual(np.multipliers, [450, 600, 675, 712.5, 750]);
  assert.deepStrictEqual(np.before.map((effect) => effect.type), ['attackUp', 'cardUp']);
  assert.deepStrictEqual(np.before[0].ocValues, [10, 15, 20, 25, 30]);

  np.before.forEach((effect) => {
    engine._applyEffect(effect, actor, actor.id, { oc: 5, level: 10 });
  });

  assert.strictEqual(engine._statusTotal(actor, 'attackUp'), 30);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp'), 30);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 18);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'arts' }), 10);
});

console.log('\n隠神刑部の全テストに合格しました。');
