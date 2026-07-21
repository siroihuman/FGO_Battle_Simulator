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
const TRAIT = require('../js/trait-trigger-aura-effects.js');
require('../js/trigger-lifecycle-effects.js');
const REGISTRY = require('../js/unique-mechanics/registry.js');
const ALICE_MECHANICS = require('../js/unique-mechanics/alice-liddell.js');
require('../js/unique-mechanics/runtime.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'アリス検証敵',
    classId: 'rider',
    attribute: 'earth',
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
      { servantId: 'aliceLiddell', skillLevel: 10, npLevel: options.npLevel || 1 },
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1 },
      { servantId: 'inugamiGyobu', skillLevel: 10, npLevel: 1 },
      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1 }
    ],
    enemies: options.enemies || [baseEnemy(options.enemy)]
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

function directStatusTotal(unit, type, filter = {}) {
  return (unit.statuses || [])
    .filter((status) => status.type === type)
    .filter((status) => !filter.card || status.card === filter.card)
    .filter((status) => !filter.trait || status.trait === filter.trait)
    .filter((status) => !filter.source || status.source === filter.source)
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
  const servant = DATA.servants.aliceLiddell;
  assert.ok(servant);
  assert.strictEqual(servant.id, 'aliceLiddell');
  assert.strictEqual(servant.no, "047'");
  assert.strictEqual(servant.classId, 'berserker');
  assert.strictEqual(servant.rarity, 5);
  assert.strictEqual(servant.maxLevel, 90);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 11785, atk: 12712 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 12911, atk: 13915 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 15174, atk: 16334 });
  assert.strictEqual(servant.attribute, 'beast');
  assert.deepStrictEqual(servant.cards, ['quick', 'quick', 'arts', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 6, arts: 4, buster: 5, extra: 6, np: 5 });
  assert.strictEqual(servant.na, 0.38);
  assert.strictEqual(servant.nd, 5);
  assert.strictEqual(servant.starRate, 4.9);
  assert.strictEqual(servant.starWeight, 10);
  assert.strictEqual(servant.deathRate, 39);
  [
    'サーヴァント', '人型', '女性', '混沌', '善', '獣の力', 'バーサーカー',
    '領域外の生命', 'ヒト科以外', '超巨大', '人類の脅威', '対人',
    'イギリスゆかりの者', '子供のサーヴァント'
  ].forEach((trait) => assert.ok(servant.traits.includes(trait), trait));
  assert.deepStrictEqual(servant.skills.map((skill) => skill.id), [
    'wonderland', 'lookingGlassCountry', 'storyForTheGirl'
  ]);
  assert.strictEqual(servant.source, 'https://w.atwiki.jp/siroi_human/pages/820.html');
});

test('S3で他の前衛へ不思議の国の住人を付与し、S1は該当者だけNP30%増加', () => {
  const engine = makeEngine();
  const [alice, fenrir, residentAlly, reserve] = engine.getState().allies;
  const s3 = engine.useSkill(alice.id, 2, alice.id);
  assert.strictEqual(s3.ok, true);
  assert.strictEqual(alice.np, 50);
  assert.strictEqual(engine.hasTrait(alice, '不思議の国の住人'), false);
  assert.strictEqual(engine.hasTrait(fenrir, '不思議の国の住人'), true);
  assert.strictEqual(engine.hasTrait(residentAlly, '不思議の国の住人'), true);
  assert.strictEqual(engine.hasTrait(reserve, '不思議の国の住人'), false);

  [alice, fenrir, residentAlly, reserve].forEach((unit) => { unit.np = 0; });
  const quickBefore = engine._statusTotal(alice, 'cardUp', { card: 'quick' });
  const artsBefore = engine._statusTotal(alice, 'cardUp', { card: 'arts' });
  const npGainBefore = engine._statusTotal(alice, 'npGainUp');
  const s1 = engine.useSkill(alice.id, 0, alice.id);
  assert.strictEqual(s1.ok, true);
  assert.strictEqual(alice.np, 0);
  assert.strictEqual(fenrir.np, 30);
  assert.strictEqual(residentAlly.np, 30);
  assert.strictEqual(reserve.np, 0);
  assert.strictEqual(engine._statusTotal(alice, 'cardUp', { card: 'quick' }) - quickBefore, 30);
  assert.strictEqual(engine._statusTotal(alice, 'cardUp', { card: 'arts' }) - artsBefore, 30);
  assert.strictEqual(engine._statusTotal(alice, 'npGainUp') - npGainBefore, 20);
});

test('強化後S2はチェック・特攻・攻撃後・ターン開始・遅延処理を登録', () => {
  const engine = makeEngine({
    enemies: [baseEnemy({ name: '敵A' }), baseEnemy({ name: '敵B' }), baseEnemy({ name: '敵C' })]
  });
  engine.rng = () => 0;
  const alice = engine.getState().allies[0];
  const result = engine.useSkill(alice.id, 1, alice.id);
  assert.strictEqual(result.ok, true);
  engine.getAliveEnemies().forEach((enemy) => assert.strictEqual(engine.hasTrait(enemy, 'チェック'), true));
  assert.strictEqual(engine._statusTotal(alice, 'traitPowerUp', { trait: 'チェック' }), 30);
  const afterAttack = alice.statuses.find((status) => status.type === 'triggerEffect' && status.event === 'afterAttack');
  const turnStart = alice.statuses.find((status) => status.type === 'triggerEffect' && status.event === 'turnStart');
  const delayed = alice.statuses.find((status) => status.type === 'delayedEffect');
  assert.ok(afterAttack);
  assert.ok(turnStart);
  assert.strictEqual(turnStart.uses, 2);
  assert.ok(delayed);
  assert.strictEqual(delayed.value, 20);
  assert.strictEqual(delayed.triggerEvent, 'turnEnd');
  assert.strictEqual(delayed.resolver, ALICE_MECHANICS.resolverKey);
});

test('S2は3ターンのチェック攻撃数に応じて赤のチェスピース特攻を付与', () => {
  const engine = makeEngine();
  engine.rng = () => 0;
  const alice = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine.useSkill(alice.id, 1, alice.id);

  for (let turn = 1; turn <= 3; turn += 1) {
    assert.strictEqual(engine.hasTrait(enemy, 'チェック'), true, `turn ${turn}`);
    engine._resolveAttackOnTarget(
      alice,
      enemy,
      { type: 'card', card: 'arts', position: 0, critical: false },
      chainContext()
    );
    assert.strictEqual(
      engine.countStatusStacks(alice, { type: 'temporaryTrait', trait: 'チェックメイト' }),
      turn
    );
    engine._finishTurn();
  }

  assert.strictEqual(engine._statusTotal(alice, 'traitPowerUp', { trait: '赤のチェスピース' }), 60);
  assert.strictEqual(engine.hasTrait(enemy, '赤のチェスピース'), true);
  const redPower = alice.statuses.find((status) => status.type === 'traitPowerUp' && status.trait === '赤のチェスピース');
  const redTrait = enemy.statuses.find((status) => status.type === 'temporaryTrait' && status.trait === '赤のチェスピース');
  assert.strictEqual(redPower.remaining, 3);
  assert.strictEqual(redTrait.remaining, 3);
  assert.strictEqual(alice.statuses.some((status) => status.type === 'delayedEffect'), false);
  assert.strictEqual(alice.statuses.some((status) => status.type === 'triggerEffect' && status.event === 'turnStart'), false);
});

test('S3の攻撃前虚構概念付与は同じ宝具攻撃の特攻へ反映', () => {
  const baseline = makeEngine();
  const baseAlice = baseline.getState().allies[0];
  const baseEnemyUnit = baseline.getState().enemies[0];
  baseline._addStatus(baseAlice, { type: 'npPowerUp', duration: 3 }, 30, '検証');
  baseline.rng = () => 0.5;
  const baseResult = baseline._resolveAttackOnTarget(
    baseAlice,
    baseEnemyUnit,
    { type: 'np', card: 'arts', position: 0, critical: false },
    chainContext()
  );

  const engine = makeEngine();
  const alice = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine.useSkill(alice.id, 2, alice.id);
  engine.rng = () => 0.5;
  const result = engine._resolveAttackOnTarget(
    alice,
    enemy,
    { type: 'np', card: 'arts', position: 0, critical: false },
    chainContext()
  );
  assert.strictEqual(engine.hasTrait(enemy, '虚構概念'), true);
  assert.ok(result.damage > baseResult.damage * 1.45, `${result.damage} <= ${baseResult.damage} * 1.45`);
});

test('クラススキルは毎ターンスター・NPと3種の動的オーラを登録', () => {
  const engine = makeEngine();
  const [alice, fenrir, , reserve] = engine.getState().allies;
  const enemy = engine.getState().enemies[0];

  assert.strictEqual(directStatusTotal(alice, 'starsPerTurn', { source: '領域外の生命 EX' }), 2);
  assert.strictEqual(directStatusTotal(alice, 'debuffResist', { source: '領域外の生命 EX' }), 12);
  assert.strictEqual(directStatusTotal(alice, 'npPerTurn', { source: '夢見る少女の物語 C' }), 5);

  const fenrirDirectResist = directStatusTotal(fenrir, 'debuffResist');
  const reserveDirectResist = directStatusTotal(reserve, 'debuffResist');
  assert.strictEqual(engine._statusTotal(alice, 'debuffResist'), 12);
  assert.strictEqual(engine._statusTotal(fenrir, 'debuffResist'), fenrirDirectResist - 15);
  assert.strictEqual(engine._statusTotal(reserve, 'debuffResist'), reserveDirectResist - 15);

  engine._addStatus(enemy, { type: 'temporaryTrait', trait: '虚構概念', duration: 3 }, 0, '検証');
  engine.rng = () => 0.5;
  const reducedDamage = engine._enemyAttackDamage(enemy, fenrir, false, false);
  const artsAction = { type: 'card', card: 'arts', position: 0, critical: false };
  const boostedNp = engine._cardNpPerHit(fenrir, enemy, artsAction, chainContext(), false);

  enemy.statuses = enemy.statuses.filter((status) => !(status.type === 'temporaryTrait' && status.trait === '虚構概念'));
  engine.rng = () => 0.5;
  const normalDamage = engine._enemyAttackDamage(enemy, fenrir, false, false);
  const normalNp = engine._cardNpPerHit(fenrir, enemy, artsAction, chainContext(), false);
  assert.ok(reducedDamage < normalDamage);
  assert.ok(Math.abs(reducedDamage - Math.floor(normalDamage * 0.85)) <= 2);
  assert.ok(boostedNp > normalNp);

  alice.alive = false;
  assert.strictEqual(engine._statusTotal(fenrir, 'debuffResist'), fenrirDirectResist);
});

test('領域外の生命と夢見る少女の物語はターン終了時にスター2個・NP5%を供給', () => {
  const engine = makeEngine();
  const alice = engine.getState().allies[0];
  alice.np = 0;
  engine.state.stars = 0;
  engine._finishTurn();
  assert.strictEqual(alice.np, 5);
  assert.strictEqual(engine.getState().stars, 2);
});

test('宝具は宝具威力・NP獲得量をOC依存で強化し虚構概念特攻を持つ', () => {
  const np = DATA.servants.aliceLiddell.np;
  assert.strictEqual(np.id, 'nurseryTale');
  assert.strictEqual(np.card, 'arts');
  assert.strictEqual(np.target, 'allEnemies');
  assert.strictEqual(np.hits, 5);
  assert.deepStrictEqual(np.multipliers, [450, 600, 675, 712.5, 750]);
  assert.deepStrictEqual(np.before.map((effect) => effect.type), ['npPowerUp', 'npGainUp']);
  assert.deepStrictEqual(np.before[0].ocValues, [10, 15, 20, 25, 30]);
  assert.deepStrictEqual(np.before[1].ocValues, [10, 15, 20, 25, 30]);
  assert.deepStrictEqual(np.special, { kind: 'trait', key: '虚構概念', multiplier: 1.5 });
  assert.deepStrictEqual(np.after, []);
});

test('固有ファイルは赤のチェスピースresolverだけを登録', () => {
  assert.ok(REGISTRY.get('aliceLiddell'));
  assert.strictEqual(ALICE_MECHANICS.resolverKey, 'aliceLiddellRedChessResolver');
  assert.strictEqual(typeof TRAIT.delayedResolvers[ALICE_MECHANICS.resolverKey], 'function');
  assert.deepStrictEqual(REGISTRY.get('aliceLiddell').hooks, {});
});

console.log('\nアリス・リデルの全テストに合格しました。');
