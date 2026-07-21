'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: '光のコヤンスカヤ検証敵',
    classId: 'rider',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 1000000,
    attack: 1,
    dtdr: 1,
    deathRate: 20,
    instantDeathRate: 0,
    chargeMax: 9,
    charge: 3,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(enemy = baseEnemy()) {
  return new BattleEngine({
    seed: 314,
    startingStars: 0,
    party: [
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 },
      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 0 }
    ],
    enemies: [enemy]
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

test('光のコヤンスカヤの基本データはテンプレート項目を満たす', () => {
  const servant = DATA.servants.koyanskayaLight;
  assert.ok(servant);
  assert.strictEqual(servant.id, 'koyanskayaLight');
  assert.strictEqual(servant.no, '314');
  assert.strictEqual(servant.classId, 'assassin');
  assert.strictEqual(servant.rarity, 5);
  assert.strictEqual(servant.maxLevel, 90);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 13081, atk: 11616 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 14333, atk: 12728 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 16851, atk: 14964 });
  assert.deepStrictEqual(servant.cards, ['quick', 'quick', 'arts', 'buster', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 4, arts: 4, buster: 3, extra: 5, np: 8 });
  assert.strictEqual(servant.np.hits, servant.hits.np);
});

test('特性は資料表記の日本語で登録される', () => {
  const traits = DATA.servants.koyanskayaLight.traits;
  [
    'サーヴァント', '人型', '女性', '秩序', '悪', '獣の力', 'アサシン',
    '神性', '騎乗', '魔性', '魔獣型', '霊衣を持つ者', 'バニー系', 'ケモノ科'
  ].forEach((trait) => assert.ok(traits.includes(trait), trait));
  assert.ok(!traits.includes('human'));
  assert.ok(!traits.includes('demonic'));
});

test('S1のスキルHP減少は味方を戦闘不能にしない', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  actor.hp = 500;
  ally.hp = 500;

  const result = engine.useSkill(actor.id, 0, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(ally.np, 50);
  assert.strictEqual(actor.hp, 1);
  assert.strictEqual(ally.hp, 1);
  assert.strictEqual(actor.alive, true);
  assert.strictEqual(ally.alive, true);
});

test('S2の人間特攻と人属性特攻を個別に判定できる', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const result = engine.useSkill(actor.id, 1, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine.getState().stars, 20);

  const humanOnly = { traits: ['人間'], attribute: 'sky' };
  const manOnly = { traits: [], attribute: 'man' };
  const both = { traits: ['人間'], attribute: 'man' };
  const neither = { traits: [], attribute: 'sky' };

  assert.strictEqual(engine._traitPower(actor, humanOnly), 50);
  assert.strictEqual(engine._traitPower(actor, manOnly), 50);
  assert.strictEqual(engine._traitPower(actor, both), 100);
  assert.strictEqual(engine._traitPower(actor, neither), 0);
  assert.strictEqual(actor.statuses.find((status) => status.type === 'busterNormalNp').value, 10);
});

test('S3はBuster限定の性能・クリ威力・スター集中度を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 2, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'buster' }), 50);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }), 50);
  assert.strictEqual(engine._statusTotal(ally, 'cardStarWeightUp', { card: 'buster' }), 5000);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'arts' }), 0);
});

test('クラススキル5種の効果量が正しい', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];

  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'quick' }), 8);
  assert.strictEqual(engine._statusTotal(actor, 'critUp'), 18);
  assert.strictEqual(engine._statusTotal(actor, 'deathResist'), 6);
  assert.strictEqual(engine._statusTotal(actor, 'mentalResist'), 6);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 10);
  assert.strictEqual(engine._statusTotal(actor, 'starRateUp'), 10);
  assert.strictEqual(engine._statusTotal(actor, 'npPowerUp'), 20);
});

test('宝具の攻撃前・攻撃後効果が資料通り', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const enemy = engine.getState().enemies[0];
  const np = actor.data.np;

  assert.deepStrictEqual(np.multipliers, [300, 400, 450, 475, 500]);
  assert.deepStrictEqual(np.before.map((effect) => effect.type), ['attackUp']);
  assert.deepStrictEqual(np.after.map((effect) => effect.type), ['enemyChargeDown', 'npCharge']);

  np.before.forEach((effect) => engine._applyEffect(effect, actor, enemy.id, { oc: 5, level: 10 }));
  np.after.forEach((effect) => engine._applyEffect(effect, actor, enemy.id, { oc: 5, level: 10 }));

  assert.strictEqual(engine._statusTotal(actor, 'attackUp'), 20);
  assert.strictEqual(enemy.charge, 2);
  assert.strictEqual(actor.np, 30);
  assert.strictEqual(ally.np, 30);
});

console.log('\n光のコヤンスカヤの全テストに合格しました。');
