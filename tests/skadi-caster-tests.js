'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'スカディ検証敵',
    classId: 'rider',
    attribute: 'earth',
    traits: ['サーヴァント'],
    hp: 99999999,
    attack: 10000,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 100,
    chargeMax: 3,
    critRate: 40,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(options = {}) {
  return new BattleEngine({
    seed: 314058,
    party: options.party || [
      { servantId: 'skadiCaster', skillLevel: 10, npLevel: options.npLevel || 1, startingNp: options.startingNp || 0 },
      { servantId: 'inugamiGyobu', skillLevel: 10, npLevel: 1 },
      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1 }
    ],
    enemies: [baseEnemy(options.enemy)]
  });
}

function passiveValue(actor, source, type, card) {
  return actor.statuses
    .filter((status) => status.source === source && status.type === type && (!card || status.card === card))
    .reduce((sum, status) => sum + Number(status.value || 0), 0);
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

test('基本データ・特性・template必須項目が資料通り', () => {
  const servant = DATA.servants.skadiCaster;
  assert.ok(servant);
  assert.strictEqual(servant.id, 'skadiCaster');
  assert.strictEqual(servant.no, '215');
  assert.strictEqual(servant.classId, 'caster');
  assert.strictEqual(servant.rarity, 5);
  assert.strictEqual(servant.maxLevel, 90);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 14406, atk: 10753 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 15775, atk: 11774 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 18529, atk: 13829 });
  assert.strictEqual(servant.attribute, 'sky');
  assert.deepStrictEqual(servant.cards, ['quick', 'quick', 'arts', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 4, arts: 3, buster: 4, extra: 5, np: 0 });
  assert.strictEqual(servant.na, 0.67);
  assert.strictEqual(servant.nd, 3);
  assert.strictEqual(servant.starRate, 10.8);
  assert.strictEqual(servant.starWeight, 49);
  assert.strictEqual(servant.deathRate, 30);
  ['女性', '混沌', '善', '天の力', 'キャスター', '神性', '王', '神霊', '豚化無効']
    .forEach((trait) => assert.ok(servant.traits.includes(trait), trait));
  servant.skills.forEach((skill) => assert.ok(skill.id, skill.name));
});

test('S1は選択した味方へQuick50%とQuickクリティカル100%を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().allies[1];
  const quickBefore = engine._statusTotal(target, 'cardUp', { card: 'quick' });
  const critBefore = engine._statusTotal(target, 'cardCritUp', { card: 'quick' });
  const result = engine.useSkill(actor.id, 0, target.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(target, 'cardUp', { card: 'quick' }) - quickBefore, 50);
  assert.strictEqual(engine._statusTotal(target, 'cardCritUp', { card: 'quick' }) - critBefore, 100);
});

test('S2は敵全体へ防御力30%とクリティカル発生率30%ダウンを付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const result = engine.useSkill(actor.id, 1, enemy.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(enemy, 'defenseDown'), 30);
  assert.strictEqual(engine._statusTotal(enemy, 'critRateDown'), 30);
  assert.strictEqual(engine._enemyCriticalChance(enemy, actor, false), 10);
  const defenseDown = enemy.statuses.find((status) => status.type === 'defenseDown');
  const critRateDown = enemy.statuses.find((status) => status.type === 'critRateDown');
  assert.strictEqual(defenseDown.debuff, true);
  assert.strictEqual(critRateDown.debuff, true);
});

test('S2の弱体は基礎成功率100%として弱体耐性判定を受ける', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine._addStatus(enemy, { type: 'debuffResist', duration: 3 }, 100, '検証');
  engine.rng = () => 0.5;
  const result = engine.useSkill(actor.id, 1, enemy.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(enemy, 'defenseDown'), 0);
  assert.strictEqual(engine._statusTotal(enemy, 'critRateDown'), 0);
});

test('S3は選択した味方のNPを50%増加', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 2, target.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(target.np, 50);
  assert.strictEqual(actor.np, 0);
});

test('クラススキル3種を資料通り登録', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(passiveValue(actor, '陣地作成 EX', 'cardUp', 'arts'), 12);
  assert.strictEqual(passiveValue(actor, '道具作成 A', 'debuffSuccess'), 10);
  assert.strictEqual(passiveValue(actor, '女神の神核 A', 'damagePlus'), 250);
  assert.strictEqual(passiveValue(actor, '女神の神核 A', 'debuffResist'), 25);
});

test('強化後宝具は5効果を資料の順番で定義', () => {
  const np = DATA.servants.skadiCaster.np;
  assert.strictEqual(np.target, 'support');
  assert.strictEqual(np.hits, 0);
  assert.deepStrictEqual(np.multipliers, [0, 0, 0, 0, 0]);
  assert.deepStrictEqual(np.before.map((effect) => effect.type), [
    'attackUp',
    'critUp',
    'evade',
    'instantDeathImmune',
    'damageCut'
  ]);
  assert.deepStrictEqual(np.before[0].npLevelValues, [20, 25, 27.5, 28.8, 30]);
  assert.deepStrictEqual(np.before[1].npLevelValues, [50, 75, 87.5, 93.8, 100]);
  assert.strictEqual(np.before[1].uses, 3);
  assert.strictEqual(np.before[1].duration, 5);
  assert.strictEqual(np.before[2].uses, 1);
  assert.strictEqual(np.before[2].duration, 3);
  assert.strictEqual(np.before[3].uses, 1);
  assert.strictEqual(np.before[3].duration, 3);
  assert.deepStrictEqual(np.before[4].ocValues, [500, 750, 1000, 1250, 1500]);
  assert.strictEqual(np.before[4].duration, 3);
  assert.deepStrictEqual(np.after, []);
});

test('宝具Lv5・OC5で全員へ完全な強化後宝具効果を付与', () => {
  const engine = makeEngine({ npLevel: 5, startingNp: 300 });
  const actor = engine.getState().allies[0];
  actor.np = 300;
  engine._executeNp({ type: 'np', actorId: actor.id, card: 'arts' }, chainContext(), 2);
  engine.getAliveAllies().forEach((ally) => {
    assert.strictEqual(passiveValue(ally, 'スカサハ＝スカディ', 'attackUp'), 30);
    const crit = ally.statuses.find((status) => status.type === 'critUp' && status.source === 'スカサハ＝スカディ');
    const evade = ally.statuses.find((status) => status.type === 'evade' && status.source === 'スカサハ＝スカディ');
    const immune = ally.statuses.find((status) => status.type === 'instantDeathImmune' && status.source === 'スカサハ＝スカディ');
    const cut = ally.statuses.find((status) => status.type === 'damageCut' && status.source === 'スカサハ＝スカディ');
    assert.ok(crit);
    assert.strictEqual(crit.value, 100);
    assert.strictEqual(crit.uses, 3);
    assert.strictEqual(crit.remaining, 5);
    assert.ok(evade);
    assert.strictEqual(evade.uses, 1);
    assert.strictEqual(evade.remaining, 3);
    assert.ok(immune);
    assert.strictEqual(immune.uses, 1);
    assert.strictEqual(immune.remaining, 3);
    assert.ok(cut);
    assert.strictEqual(cut.value, 1500);
    assert.strictEqual(cut.remaining, 3);
  });
});

test('実際の宝具で付与した回数制クリティカル威力はクリティカル1回で1消費', () => {
  const engine = makeEngine({ npLevel: 1, startingNp: 100 });
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  actor.np = 100;
  engine._executeNp({ type: 'np', actorId: actor.id, card: 'arts' }, chainContext(), 0);
  const status = actor.statuses.find((entry) => entry.type === 'critUp' && entry.source === 'スカサハ＝スカディ');
  assert.strictEqual(status.uses, 3);
  engine.rng = () => 0.5;
  engine._resolveAttackOnTarget(actor, enemy, {
    type: 'card', card: 'quick', position: 0, critical: true
  }, chainContext());
  assert.strictEqual(status.uses, 2);
});

console.log('\nスカサハ＝スカディ〔キャスター〕の全テストに合格しました。');
