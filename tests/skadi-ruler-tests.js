'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/turn-field-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'スカディ〔ルーラー〕検証敵',
    classId: 'avenger',
    attribute: 'earth',
    traits: ['サーヴァント', '秩序'],
    hp: 99999999,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    startingCharge: 3,
    chargeMax: 9,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(options = {}) {
  return new BattleEngine({
    seed: 357,
    startingStars: options.startingStars || 0,
    fieldTraits: options.fieldTraits || [],
    party: options.party || [
      { servantId: 'skadiRuler', skillLevel: 10, npLevel: 1, startingNp: 0 },
      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 0 }
    ],
    enemies: [baseEnemy(options.enemy)]
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

test('基本データ・特性・テンプレート項目が資料通り', () => {
  const servant = DATA.servants.skadiRuler;
  assert.ok(servant);
  assert.strictEqual(servant.id, 'skadiRuler');
  assert.strictEqual(servant.no, '357');
  assert.strictEqual(servant.classId, 'ruler');
  assert.strictEqual(servant.rarity, 5);
  assert.strictEqual(servant.maxLevel, 90);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 14850, atk: 10868 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 16261, atk: 11898 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 19101, atk: 13976 });
  assert.deepStrictEqual(servant.cards, ['quick', 'quick', 'arts', 'buster', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 4, arts: 3, buster: 4, extra: 5, np: 6 });
  assert.strictEqual(servant.np.hits, servant.hits.np);
  assert.strictEqual(servant.na, 0.78);
  assert.strictEqual(servant.nd, 3);
  assert.strictEqual(servant.starRate, 9.8);
  assert.strictEqual(servant.starWeight, 102);
  assert.strictEqual(servant.deathRate, 17.5);

  ['女性', '混沌', '夏', '天の力', 'ルーラー', '神性', '王', '霊衣を持つ者', '神霊', '豚化無効', '夏モード']
    .forEach((trait) => assert.ok(servant.traits.includes(trait), trait));
  servant.skills.forEach((skill) => assert.ok(skill.id, skill.name));
});

test('S1はQuick性能とBusterクリティカル威力を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 0, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }), 50);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }), 100);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'quick' }), 0);
});

test('S2は味方全体3種バフと自身の毎ターンスター15個を3T付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 1, actor.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'quick' }), 15);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }), 15);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'buster' }), 15);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'buster' }), 15);
  assert.strictEqual(engine._statusTotal(actor, 'starsPerTurn'), 15);

  const gained = [];
  for (let turn = 0; turn < 4; turn += 1) {
    engine._finishTurn();
    gained.push(engine.getState().stars);
  }
  assert.deepStrictEqual(gained, [15, 15, 15, 0]);
});

test('S3はNP50・Buster集中5000%を1T・スター15個で、クリ威力は付与しない', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 2, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(ally.np, 50);
  assert.strictEqual(engine.getState().stars, 15);
  assert.strictEqual(engine._statusTotal(ally, 'cardStarWeightUp', { card: 'buster' }), 5000);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }), 0);
  const concentration = ally.statuses.find((status) => status.type === 'cardStarWeightUp');
  assert.strictEqual(concentration.remaining, 1);
});

test('クラススキルは弱体耐性50%・Arts10%・与ダメージ250', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];

  assert.strictEqual(engine._statusTotal(actor, 'debuffResist'), 50);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 10);
  assert.strictEqual(engine._statusTotal(actor, 'damagePlus'), 250);
});

test('宝具は水辺でのみOC依存宝具威力アップを攻撃前に付与', () => {
  const np = DATA.servants.skadiRuler.np;
  assert.deepStrictEqual(np.multipliers, [600, 800, 900, 950, 1000]);
  assert.deepStrictEqual(np.before[0].ocValues, [10, 15, 20, 25, 30]);
  assert.deepStrictEqual(np.before[0].condition, { kind: 'fieldTrait', key: '水辺' });
  assert.deepStrictEqual(np.special, {
    kind: 'trait',
    key: '秩序',
    ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
  });

  const dryEngine = makeEngine({ fieldTraits: ['都市'] });
  const dryActor = dryEngine.getState().allies[0];
  dryEngine._applyEffect(dryActor.data.np.before[0], dryActor, dryActor.id, { oc: 5, level: 10 });
  assert.strictEqual(dryEngine._statusTotal(dryActor, 'npPowerUp'), 0);

  const waterEngine = makeEngine({ fieldTraits: ['水辺'] });
  const waterActor = waterEngine.getState().allies[0];
  waterEngine._applyEffect(waterActor.data.np.before[0], waterActor, waterActor.id, { oc: 5, level: 10 });
  assert.strictEqual(waterEngine._statusTotal(waterActor, 'npPowerUp'), 30);
});

test('水辺の宝具威力アップが宝具自身へ反映され、チャージを1減らす', () => {
  function execute(fieldTraits) {
    const engine = makeEngine({ fieldTraits });
    const actor = engine.getState().allies[0];
    const enemy = engine.getState().enemies[0];
    actor.np = 100;
    const beforeHp = enemy.hp;
    engine._executeNp({ type: 'np', actorId: actor.id, card: 'quick' }, chainContext(), 0);
    return { damage: beforeHp - enemy.hp, enemy };
  }

  const dry = execute([]);
  const water = execute(['水辺']);
  assert.ok(water.damage > dry.damage);
  assert.strictEqual(dry.enemy.charge, 2);
  assert.strictEqual(water.enemy.charge, 2);
});

console.log('\nスカサハ＝スカディ〔ルーラー〕の全テストに合格しました。');
