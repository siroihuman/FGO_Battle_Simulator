'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/common-effects-extra-attack.js');
require('../js/card-buff-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/hp-loss-effects.js');
require('../js/turn-field-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/trigger-lifecycle-effects.js');
require('../js/class-affinity-special-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'フアナ検証敵',
    classId: 'saber',
    attribute: 'neutral',
    traits: ['サーヴァント'],
    hp: 99999999,
    attack: 10000,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 9,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(options = {}) {
  return new BattleEngine({
    seed: 314058,
    startingStars: options.startingStars || 0,
    party: options.party || [
      {
        servantId: 'juanaMadQueen',
        skillLevel: 10,
        npLevel: options.npLevel || 1,
        startingNp: options.startingNp || 0
      },
      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1 },
      { servantId: 'inugamiGyobu', skillLevel: 10, npLevel: 1 }
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

function passiveValue(actor, source, type, filter = {}) {
  return (actor.statuses || [])
    .filter((status) => status.source === source && status.type === type)
    .filter((status) => !filter.card || status.card === filter.card)
    .filter((status) => !filter.trait || status.trait === filter.trait)
    .reduce((sum, status) => sum + Number(status.value || 0), 0);
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
  const servant = DATA.servants.juanaMadQueen;
  assert.ok(servant);
  assert.strictEqual(servant.id, 'juanaMadQueen');
  assert.strictEqual(servant.no, '050');
  assert.strictEqual(servant.classId, 'berserker');
  assert.strictEqual(servant.rarity, 5);
  assert.strictEqual(servant.maxLevel, 90);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 12472, atk: 11361 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 13664, atk: 12436 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 16058, atk: 14598 });
  assert.strictEqual(servant.attribute, 'man');
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'buster', 'buster', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 4, arts: 4, buster: 3, extra: 5, np: 6 });
  assert.strictEqual(servant.na, 0.51);
  assert.strictEqual(servant.nd, 5);
  assert.strictEqual(servant.starRate, 4.9);
  assert.strictEqual(servant.starWeight, 9);
  assert.strictEqual(servant.deathRate, 56.8);
  ['サーヴァント', '人型', '女性', '混沌', '中庸', '人の力', 'バーサーカー', '騎乗', 'ヒト科', '王']
    .forEach((trait) => assert.ok(servant.traits.includes(trait), trait));
  assert.deepStrictEqual(servant.skills.map((skill) => skill.id), [
    'doubleSummon', 'confinedMadQueen', 'onlyIAmKing'
  ]);
  assert.strictEqual(servant.source, 'https://w.atwiki.jp/siroi_human/pages/882.html');
});

test('S1はNP獲得量40%と防御相性不利打ち消しを3T付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const result = engine.useSkill(actor.id, 0, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'npGainUp'), 40);
  const nullify = actor.statuses.find((status) => status.type === 'defenseClassDisadvantageNullify');
  assert.ok(nullify);
  assert.strictEqual(nullify.remaining, 3);

  engine.rng = () => 0.5;
  const neutralized = engine._enemyAttackDamage(enemy, actor, false, false);
  actor.statuses = actor.statuses.filter((status) => status !== nullify);
  engine.rng = () => 0.5;
  const disadvantaged = engine._enemyAttackDamage(enemy, actor, false, false);
  assert.ok(disadvantaged > neutralized);
  assert.ok(Math.abs(disadvantaged - neutralized * 2) <= 1, `${disadvantaged} / ${neutralized}`);
});

test('強化後S2はNP20%・攻撃力20%・スター発生率100%・必中3Tを付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const attackBefore = engine._statusTotal(actor, 'attackUp');
  const starRateBefore = engine._statusTotal(actor, 'starRateUp');
  const result = engine.useSkill(actor.id, 1, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(actor.np, 20);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp') - attackBefore, 20);
  assert.strictEqual(engine._statusTotal(actor, 'starRateUp') - starRateBefore, 100);
  const sureHit = actor.statuses.find((status) => status.type === 'sureHit');
  assert.ok(sureHit);
  assert.strictEqual(sureHit.source, actor.name);
  assert.strictEqual(sureHit.remaining, 3);
});

test('強化後S3は王特攻50%・毎ターンスター30個・毎ターンNP20%・NP30%を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const result = engine.useSkill(actor.id, 2, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(actor.np, 30);
  assert.strictEqual(engine._statusTotal(actor, 'traitPowerUp', { trait: '王' }), 70);
  assert.strictEqual(engine._statusTotal(actor, 'starsPerTurn'), 30);
  assert.strictEqual(engine._statusTotal(actor, 'npPerTurn'), 20);
  engine._finishTurn();
  assert.strictEqual(actor.np, 50);
  assert.strictEqual(engine.getState().stars, 30);
});

test('クラススキル4種を資料通り登録', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(passiveValue(actor, '狂化 E（A相当）', 'cardUp', { card: 'buster' }), 10);
  assert.strictEqual(passiveValue(actor, '気配遮断 C-', 'starRateUp'), 5.5);
  assert.strictEqual(passiveValue(actor, '騎乗 D', 'cardUp', { card: 'quick' }), 4);
  assert.strictEqual(passiveValue(actor, '王の棺 A', 'traitPowerUp', { trait: '王' }), 20);
  const trigger = actor.statuses.find((status) => status.source === '王の棺 A' && status.type === 'triggerEffect');
  assert.ok(trigger);
  assert.strictEqual(trigger.event, 'afterAttack');
  assert.deepStrictEqual(trigger.condition, { kind: 'targetHasTrait', key: '王' });
});

test('王の棺 Aは王への攻撃後だけ毒500・蝕毒100%を5T付与', () => {
  const kingEngine = makeEngine({ enemy: { traits: ['サーヴァント', '王'] } });
  const kingActor = kingEngine.getState().allies[0];
  const kingTarget = kingEngine.getState().enemies[0];
  kingEngine.rng = () => 0.5;
  kingEngine._resolveAttackOnTarget(
    kingActor,
    kingTarget,
    { type: 'card', card: 'buster', position: 0, critical: false },
    chainContext()
  );
  const poison = kingTarget.statuses.find((status) => status.type === 'poison');
  const amplify = kingTarget.statuses.find((status) => status.type === 'dotAmplify' && status.dotType === 'poison');
  assert.ok(poison);
  assert.strictEqual(poison.value, 500);
  assert.strictEqual(poison.remaining, 5);
  assert.ok(amplify);
  assert.strictEqual(amplify.value, 100);
  assert.strictEqual(amplify.remaining, 5);

  const normalEngine = makeEngine();
  const normalActor = normalEngine.getState().allies[0];
  const normalTarget = normalEngine.getState().enemies[0];
  normalEngine.rng = () => 0.5;
  normalEngine._resolveAttackOnTarget(
    normalActor,
    normalTarget,
    { type: 'card', card: 'buster', position: 0, critical: false },
    chainContext()
  );
  assert.strictEqual(normalTarget.statuses.some((status) => status.type === 'poison'), false);
  assert.strictEqual(normalTarget.statuses.some((status) => status.type === 'dotAmplify'), false);
});

test('宝具は毒状態特攻とOC依存の毒・蝕毒を資料通り定義', () => {
  const np = DATA.servants.juanaMadQueen.np;
  assert.strictEqual(np.id, 'coffinJuana');
  assert.strictEqual(np.card, 'quick');
  assert.strictEqual(np.target, 'allEnemies');
  assert.strictEqual(np.hits, 6);
  assert.deepStrictEqual(np.multipliers, [600, 800, 900, 950, 1000]);
  assert.deepStrictEqual(np.special, {
    kind: 'status',
    key: 'poison',
    ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
  });
  assert.deepStrictEqual(np.after.map((effect) => effect.type), ['poison', 'dotAmplify']);
  assert.deepStrictEqual(np.after[0].ocValues, [1000, 1250, 1500, 1750, 2000]);
  assert.strictEqual(np.after[0].duration, 5);
  assert.strictEqual(np.after[1].dotType, 'poison');
  assert.strictEqual(np.after[1].value, 100);
  assert.strictEqual(np.after[1].duration, 5);
});

test('毒状態の対象へ宝具OC5特攻2倍を適用し、宝具後に毒2000・蝕毒100%を付与', () => {
  const baseline = makeEngine({ startingNp: 300 });
  const baseActor = baseline.getState().allies[0];
  const baseTarget = baseline.getState().enemies[0];
  baseline._currentNpOc = 5;
  baseline.rng = () => 0.5;
  const normalDamage = baseline._calculateAttackTotal(
    baseActor,
    baseTarget,
    { type: 'np', card: 'quick', position: 0, critical: false },
    chainContext()
  );

  const poisoned = makeEngine({ startingNp: 300 });
  const poisonedActor = poisoned.getState().allies[0];
  const poisonedTarget = poisoned.getState().enemies[0];
  poisoned._addStatus(poisonedTarget, { type: 'poison', duration: 5, debuff: true }, 1, '事前毒');
  poisoned._currentNpOc = 5;
  poisoned.rng = () => 0.5;
  const specialDamage = poisoned._calculateAttackTotal(
    poisonedActor,
    poisonedTarget,
    { type: 'np', card: 'quick', position: 0, critical: false },
    chainContext()
  );
  assert.ok(Math.abs(specialDamage - normalDamage * 2) <= 1, `${specialDamage} / ${normalDamage}`);

  const engine = makeEngine({ startingNp: 300 });
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  actor.np = 300;
  engine.rng = () => 0.5;
  engine._executeNp({ type: 'np', actorId: actor.id, card: 'quick' }, chainContext(), 4);
  const poison = target.statuses.find((status) => status.type === 'poison');
  const amplify = target.statuses.find((status) => status.type === 'dotAmplify' && status.dotType === 'poison');
  assert.ok(poison);
  assert.strictEqual(poison.value, 2000);
  assert.strictEqual(poison.remaining, 5);
  assert.ok(amplify);
  assert.strictEqual(amplify.value, 100);
  assert.strictEqual(amplify.remaining, 5);
});

console.log('\nフアナ狂女王の全テストに合格しました。');
