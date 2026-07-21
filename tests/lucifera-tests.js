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
require('../js/np-card-trigger-removal-effects.js');
require('../js/class-affinity-special-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'ルシフェラ検証敵',
    classId: 'caster',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 99999999,
    attack: 1,
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
    seed: 620795,
    startingStars: options.startingStars ?? 0,
    party: options.party || [
      { servantId: 'lucifera', skillLevel: 10, npLevel: options.npLevel || 1, startingNp: options.startingNp ?? 0 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: options.secondNp ?? 0 },
      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: options.thirdNp ?? 0 }
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

test('基本データ・特性・template必須項目を資料通り登録', () => {
  const servant = DATA.servants.lucifera;
  assert.ok(servant);
  assert.strictEqual(servant.id, 'lucifera');
  assert.strictEqual(servant.no, '062');
  assert.strictEqual(servant.name, 'ルシフェラ');
  assert.strictEqual(servant.classId, 'rider');
  assert.strictEqual(servant.rarity, 5);
  assert.strictEqual(servant.maxLevel, 90);
  assert.strictEqual(servant.maxHp, 13269);
  assert.strictEqual(servant.atk, 10867);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 13269, atk: 10867 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 14537, atk: 11896 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 17084, atk: 13963 });
  assert.strictEqual(servant.attribute, 'earth');
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'arts', 'buster', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 4, arts: 3, buster: 3, extra: 6, np: 5 });
  assert.strictEqual(servant.na, 0.59);
  assert.strictEqual(servant.nd, 3);
  assert.strictEqual(servant.starRate, 8.8);
  assert.strictEqual(servant.starWeight, 200);
  assert.strictEqual(servant.deathRate, 30);
  [
    'サーヴァント', '人型', '女性', '秩序', '悪', '地の力', 'ライダー',
    '騎乗', '神性', 'ヒト科', '猛獣', 'イギリスゆかりの者'
  ].forEach((trait) => assert.ok(servant.traits.includes(trait), trait));
  assert.deepStrictEqual(servant.skills.map((skill) => skill.id), [
    'familiarSixSins', 'wheelOfOriginalSin', 'queenOfVainglory'
  ]);
  assert.strictEqual(servant.source, 'https://w.atwiki.jp/siroi_human/pages/795.html');
});

test('強化後S1は全体Buster30%・攻撃20%と選択対象への宝具換装・afterNpを付与', () => {
  const engine = makeEngine({ thirdNp: 100 });
  engine.rng = () => 0.5;
  const [lucifera, koyanskaya, oshichi] = engine.getState().allies;
  oshichi.cooldowns = oshichi.cooldowns.map(() => 5);
  const before = new Map([lucifera, koyanskaya, oshichi].map((ally) => [ally.id, {
    buster: engine._statusTotal(ally, 'cardUp', { card: 'buster' }),
    attack: engine._statusTotal(ally, 'attackUp')
  }]));

  const result = engine.useSkill(lucifera.id, 0, oshichi.id);
  assert.strictEqual(result.ok, true);
  [lucifera, koyanskaya, oshichi].forEach((ally) => {
    assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'buster' }) - before.get(ally.id).buster, 30);
    assert.strictEqual(engine._statusTotal(ally, 'attackUp') - before.get(ally.id).attack, 20);
  });
  assert.strictEqual(engine.getBaseNpCard(oshichi), 'quick');
  assert.strictEqual(engine.getEffectiveNpCard(oshichi), 'buster');
  const conversion = oshichi.statuses.find((status) => status.type === 'npCardTypeChange');
  const trigger = oshichi.statuses.find((status) => status.type === 'triggerEffect' && status.event === 'afterNp');
  assert.ok(conversion);
  assert.strictEqual(conversion.remaining, 1);
  assert.ok(trigger);
  assert.strictEqual(trigger.uses, 1);
  assert.strictEqual(trigger.remaining, 1);
  assert.strictEqual(trigger.triggerLevel, 10);

  engine._executeNp({ type: 'np', actorId: oshichi.id, card: 'quick' }, chainContext(), 0);
  assert.ok(oshichi.cooldowns.every((ct) => ct === 4));
  assert.strictEqual(engine._statusTotal(oshichi, 'critUp'), 30);
  assert.strictEqual(engine.getState().stars, 15);
  assert.strictEqual(oshichi.statuses.some((status) => status === trigger), false);
});

test('S2は全体NP30%・選択対象20%・自身10%を効果順通り加算', () => {
  const engine = makeEngine();
  const [lucifera, koyanskaya, oshichi] = engine.getState().allies;
  const result = engine.useSkill(lucifera.id, 1, koyanskaya.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(lucifera.np, 40);
  assert.strictEqual(koyanskaya.np, 50);
  assert.strictEqual(oshichi.np, 30);
});

test('S3は悪の味方だけCTを1進め、選択対象の現在NPを倍化してターン終了時に強化解除', () => {
  const engine = makeEngine({ thirdNp: 50 });
  const [lucifera, koyanskaya, oshichi] = engine.getState().allies;
  lucifera.cooldowns = lucifera.cooldowns.map(() => 5);
  koyanskaya.cooldowns = koyanskaya.cooldowns.map(() => 5);
  oshichi.cooldowns = oshichi.cooldowns.map(() => 5);

  const result = engine.useSkill(lucifera.id, 2, oshichi.id);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(lucifera.cooldowns, [4, 4, 7]);
  assert.deepStrictEqual(koyanskaya.cooldowns, [4, 4, 4]);
  assert.deepStrictEqual(oshichi.cooldowns, [5, 5, 5]);
  assert.strictEqual(oshichi.np, 100);
  const endTrigger = oshichi.statuses.find((status) => status.type === 'triggerEffect' && status.event === 'turnEnd');
  assert.ok(endTrigger);
  assert.strictEqual(endTrigger.uses, 1);

  engine._applyEffect({ type: 'attackUp', target: 'self', value: 40, duration: 3 }, oshichi, oshichi.id, {});
  assert.strictEqual(engine._statusTotal(oshichi, 'attackUp'), 40);
  engine._runGenericEvent('turnEnd', { turn: engine.getState().turn });
  assert.strictEqual(engine._statusTotal(oshichi, 'attackUp'), 0);
  assert.strictEqual(oshichi.statuses.some((status) => status === endTrigger), false);
  assert.ok(oshichi.statuses.some((status) => status.passive));
});

test('クラススキル3種を資料通り登録', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(passiveValue(actor, '対魔力 B', 'debuffResist'), 17.5);
  assert.strictEqual(passiveValue(actor, '竜種騎乗 A', 'cardUp', { card: 'quick' }), 10);
  assert.strictEqual(passiveValue(actor, '竜種騎乗 A', 'critUp'), 10);
  assert.strictEqual(passiveValue(actor, '神性 B', 'damagePlus'), 175);
});

test('強化後宝具を資料通り定義', () => {
  const np = DATA.servants.lucifera.np;
  assert.strictEqual(np.id, 'septemPeccataMortalia');
  assert.strictEqual(np.name, '高き館の女皇');
  assert.strictEqual(np.reading, 'セプテム・ペッカータ・モルターリア');
  assert.strictEqual(np.card, 'buster');
  assert.strictEqual(np.target, 'allEnemies');
  assert.strictEqual(np.hits, 5);
  assert.deepStrictEqual(np.multipliers, [300, 400, 450, 475, 500]);
  assert.deepStrictEqual(np.special, {
    kind: 'trait',
    key: '悪',
    ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
  });
  assert.deepStrictEqual(np.before.map((effect) => effect.type), ['temporaryTrait']);
  assert.deepStrictEqual(np.after.map((effect) => effect.type), ['temporaryTrait', 'buffRemovalResist']);
});

test('宝具は攻撃前に敵へ悪を付与してOC特攻を成立させ、宝具後に味方へ悪と強化解除耐性を付与', () => {
  const engine = makeEngine({ startingNp: 300 });
  engine.rng = () => 0.5;
  const [actor, koyanskaya, oshichi] = engine.getState().allies;
  const target = engine.getState().enemies[0];
  let evilBeforeDamage = false;
  let specialMultiplier = 0;
  engine._resolveAttackOnTarget = (source, enemy) => {
    evilBeforeDamage = engine.hasTrait(enemy, '悪');
    specialMultiplier = engine._npSpecialMultiplier(source.data.np, enemy);
    return { damage: 0, actualHpDamage: 0, np: 0, stars: 0 };
  };

  engine._executeNp({ type: 'np', actorId: actor.id, card: 'buster' }, chainContext(), 4);
  assert.strictEqual(evilBeforeDamage, true);
  assert.strictEqual(specialMultiplier, 2);
  const enemyEvil = target.statuses.find((status) => status.type === 'temporaryTrait' && status.trait === '悪');
  assert.ok(enemyEvil);
  assert.strictEqual(enemyEvil.remaining, 3);
  assert.strictEqual(enemyEvil.debuff, true);

  [koyanskaya, oshichi].forEach((ally) => {
    const evil = ally.statuses.find((status) => status.type === 'temporaryTrait' && status.trait === '悪');
    assert.ok(evil);
    assert.strictEqual(evil.remaining, 3);
  });
  assert.strictEqual(actor.statuses.some((status) => status.type === 'temporaryTrait' && status.trait === '悪'), false);
  [actor, koyanskaya, oshichi].forEach((ally) => {
    const resist = ally.statuses.find((status) => status.type === 'buffRemovalResist');
    assert.ok(resist);
    assert.strictEqual(resist.value, 100);
    assert.strictEqual(resist.uses, 1);
    assert.strictEqual(resist.remaining, 3);
  });
});

test('宝具後の強化解除耐性はS3デメリットを1回防ぎ、成功時に消費される', () => {
  const engine = makeEngine({ startingNp: 100, thirdNp: 50 });
  engine.rng = () => 0.5;
  const [actor, , oshichi] = engine.getState().allies;
  engine._executeNp({ type: 'np', actorId: actor.id, card: 'buster' }, chainContext(), 0);
  const resist = oshichi.statuses.find((status) => status.type === 'buffRemovalResist');
  assert.ok(resist);

  engine.useSkill(actor.id, 2, oshichi.id);
  engine._applyEffect({ type: 'attackUp', target: 'self', value: 40, duration: 3 }, oshichi, oshichi.id, {});
  engine._runGenericEvent('turnEnd', { turn: engine.getState().turn });
  assert.strictEqual(engine._statusTotal(oshichi, 'attackUp'), 40);
  assert.strictEqual(oshichi.statuses.some((status) => status === resist), false);
});

console.log('\nルシフェラ専用回帰テストに合格しました。');
