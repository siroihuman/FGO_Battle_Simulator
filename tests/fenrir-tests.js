'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/hp-loss-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'フェンリル検証敵',
    classId: 'rider',
    attribute: 'earth',
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
    seed: 314058,
    startingStars: options.startingStars || 0,
    party: options.party || [
      {
        servantId: 'fenrir',
        skillLevel: 10,
        npLevel: options.npLevel || 1,
        startingNp: options.startingNp || 0
      }
    ],
    enemies: [baseEnemy(options.enemy)]
  });
}

function passiveValue(actor, source, type, filter = {}) {
  return actor.statuses
    .filter((status) => status.source === source && status.type === type)
    .filter((status) => !filter.card || status.card === filter.card)
    .filter((status) => !filter.trait || status.trait === filter.trait)
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

test('基本データ・能力値・特性・template必須項目が資料通り', () => {
  const servant = DATA.servants.fenrir;
  assert.ok(servant);
  assert.strictEqual(servant.id, 'fenrir');
  assert.strictEqual(servant.no, '058');
  assert.strictEqual(servant.classId, 'berserker');
  assert.strictEqual(servant.rarity, 5);
  assert.strictEqual(servant.maxLevel, 90);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 12514, atk: 13085 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 13710, atk: 14324 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 16112, atk: 16813 });
  assert.strictEqual(servant.attribute, 'beast');
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'buster', 'buster', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 5, arts: 2, buster: 2, extra: 5, np: 5 });
  assert.strictEqual(servant.na, 1.07);
  assert.strictEqual(servant.nd, 5);
  assert.strictEqual(servant.starRate, 5);
  assert.strictEqual(servant.starWeight, 9);
  assert.strictEqual(servant.deathRate, 39);
  [
    'サーヴァント', '性別不明', '混沌', '獣の力', 'バーサーカー', '神性',
    'ヒト科以外', 'ケモノ科', '魔獣型', '猛獣', '超巨大', '叛逆する者', '炎'
  ].forEach((trait) => assert.ok(servant.traits.includes(trait), trait));
  servant.skills.forEach((skill) => assert.ok(skill.id, skill.name));
  assert.strictEqual(servant.source, 'https://w.atwiki.jp/siroi_human/pages/329.html');
});

test('S1は神性特攻30%・クリティカル威力30%・スター発生率100%を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const traitBefore = engine._statusTotal(actor, 'traitPowerUp', { trait: '神性' });
  const critBefore = engine._statusTotal(actor, 'critUp');
  const starBefore = engine._statusTotal(actor, 'starRateUp');
  const result = engine.useSkill(actor.id, 0, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'traitPowerUp', { trait: '神性' }) - traitBefore, 30);
  assert.strictEqual(engine._statusTotal(actor, 'critUp') - critBefore, 30);
  assert.strictEqual(engine._statusTotal(actor, 'starRateUp') - starBefore, 100);
});

test('S2はNP50%・攻撃力30%・OC2段階アップ1回を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const attackBefore = engine._statusTotal(actor, 'attackUp');
  const result = engine.useSkill(actor.id, 1, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(actor.np, 50);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp') - attackBefore, 30);
  const ocUp = actor.statuses.find((status) => status.type === 'ocUp' && status.source === 'フェンリル');
  assert.ok(ocUp);
  assert.strictEqual(ocUp.value, 2);
  assert.strictEqual(ocUp.uses, 1);
  assert.strictEqual(ocUp.remaining, 3);
});

test('S3はBuster集中5000%・Busterクリティカル50%・無敵貫通3T・スター30個', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const weightBefore = engine._statusTotal(actor, 'cardStarWeightUp', { card: 'buster' });
  const critBefore = engine._statusTotal(actor, 'cardCritUp', { card: 'buster' });
  const starsBefore = engine.getState().stars;
  const result = engine.useSkill(actor.id, 2, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'cardStarWeightUp', { card: 'buster' }) - weightBefore, 5000);
  assert.strictEqual(engine._statusTotal(actor, 'cardCritUp', { card: 'buster' }) - critBefore, 50);
  const pierce = actor.statuses.find((status) => status.type === 'invinciblePierce' && status.source === 'フェンリル');
  assert.ok(pierce);
  assert.strictEqual(pierce.remaining, 3);
  assert.strictEqual(engine.getState().stars - starsBefore, 30);
});

test('クラススキル4種を資料通り登録', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(passiveValue(actor, '対魔力 B', 'debuffResist'), 17.5);
  assert.strictEqual(passiveValue(actor, '狂化 A+（B+相当）', 'cardUp', { card: 'buster' }), 9);
  assert.strictEqual(passiveValue(actor, '神性 E-', 'damagePlus'), 95);
  assert.strictEqual(passiveValue(actor, '野性 A', 'starRateUp'), 10);
  assert.strictEqual(passiveValue(actor, '野性 A', 'critUp'), 10);
});

test('宝具はOC依存Buster強化・天属性特攻・致死性HP減少を定義', () => {
  const np = DATA.servants.fenrir.np;
  assert.strictEqual(np.card, 'buster');
  assert.strictEqual(np.target, 'allEnemies');
  assert.strictEqual(np.hits, 5);
  assert.deepStrictEqual(np.multipliers, [300, 400, 450, 475, 500]);
  assert.deepStrictEqual(np.before[0].ocValues, [10, 20, 30, 40, 50]);
  assert.strictEqual(np.before[0].duration, 1);
  assert.deepStrictEqual(np.special, { kind: 'attribute', key: 'sky', multiplier: 1.5 });
  assert.strictEqual(np.after.length, 1);
  assert.deepStrictEqual(np.after[0], { type: 'hpLoss', target: 'self', value: 1000 });
  assert.strictEqual(Object.prototype.hasOwnProperty.call(np.after[0], 'nonLethal'), false);
});

test('S2のOC2段階アップによりNP100%でも宝具前Buster強化が30%になる', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  actor.hp = 5000;
  engine.useSkill(actor.id, 1, actor.id);
  actor.np = 100;
  engine._executeNp({ type: 'np', actorId: actor.id, card: 'buster' }, chainContext(), 0);
  assert.strictEqual(passiveValue(actor, 'フェンリル', 'cardUp', { card: 'buster' }), 30);
  assert.strictEqual(actor.statuses.some((status) => status.type === 'ocUp' && status.source === 'フェンリル'), false);
  assert.strictEqual(actor.hp, 4000);
});

test('天属性への宝具ダメージは非特攻対象より高い', () => {
  const skyEngine = makeEngine({ enemy: { attribute: 'sky' } });
  const earthEngine = makeEngine({ enemy: { attribute: 'earth' } });
  skyEngine.rng = () => 0.5;
  earthEngine.rng = () => 0.5;
  const skyActor = skyEngine.getState().allies[0];
  const earthActor = earthEngine.getState().allies[0];
  const skyEnemy = skyEngine.getState().enemies[0];
  const earthEnemy = earthEngine.getState().enemies[0];
  skyEngine._currentNpOc = 1;
  earthEngine._currentNpOc = 1;
  const action = { type: 'np', card: 'buster', position: 0, critical: false };
  const skyDamage = skyEngine._calculateAttackTotal(skyActor, skyEnemy, action, chainContext());
  const earthDamage = earthEngine._calculateAttackTotal(earthActor, earthEnemy, action, chainContext());
  assert.ok(skyDamage > earthDamage * 1.45, `${skyDamage} <= ${earthDamage} * 1.45`);
});

test('実際の宝具後HP減少はHP1000のフェンリルを戦闘不能にする', () => {
  const engine = makeEngine({ startingNp: 100 });
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  actor.hp = 1000;
  actor.np = 100;
  const enemyHpBefore = enemy.hp;
  engine._executeNp({ type: 'np', actorId: actor.id, card: 'buster' }, chainContext(), 0);
  assert.ok(enemy.hp < enemyHpBefore);
  assert.strictEqual(actor.hp, 0);
  assert.strictEqual(actor.alive, false);
  assert.strictEqual(engine.getState().winner, 'enemies');
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('戦闘不能')));
});

test('実際の宝具後HP減少でもガッツが発動する', () => {
  const engine = makeEngine({ startingNp: 100 });
  const actor = engine.getState().allies[0];
  actor.hp = 1000;
  actor.np = 100;
  const guts = engine._addStatus(actor, { type: 'guts', uses: 1, duration: 3 }, 2000, '検証');
  engine._executeNp({ type: 'np', actorId: actor.id, card: 'buster' }, chainContext(), 0);
  assert.strictEqual(actor.hp, 2000);
  assert.strictEqual(actor.alive, true);
  assert.strictEqual(actor.statuses.includes(guts), false);
  assert.strictEqual(engine.getState().winner, null);
  assert.strictEqual(engine.getState().logs.filter((entry) => entry.message.includes('ガッツが発動')).length, 1);
});

console.log('\nフェンリルの全テストに合格しました。');
