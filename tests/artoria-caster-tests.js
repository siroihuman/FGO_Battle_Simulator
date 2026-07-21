'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'アルトリア・キャスター検証敵',
    classId: 'rider',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 99999999,
    attack: 5000,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 3,
    critRate: 20,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(options = {}) {
  return new BattleEngine({
    seed: 314058,
    party: options.party || [
      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: options.npLevel || 1, startingNp: options.startingNp || 0 },
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
  const servant = DATA.servants.artoriaCaster;
  assert.ok(servant);
  assert.strictEqual(servant.id, 'artoriaCaster');
  assert.strictEqual(servant.no, '284');
  assert.strictEqual(servant.classId, 'caster');
  assert.strictEqual(servant.rarity, 5);
  assert.strictEqual(servant.maxLevel, 90);
  assert.deepStrictEqual(servant.levelStats.max, { hp: 14406, atk: 10546 });
  assert.deepStrictEqual(servant.levelStats[100], { hp: 15775, atk: 11548 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 18529, atk: 13564 });
  assert.strictEqual(servant.attribute, 'star');
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'arts', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 3, arts: 3, buster: 3, extra: 5, np: 0 });
  assert.strictEqual(servant.na, 0.54);
  assert.strictEqual(servant.nd, 3);
  assert.strictEqual(servant.starRate, 11);
  assert.strictEqual(servant.starWeight, 50);
  assert.strictEqual(servant.deathRate, 36);
  ['女性', '中立', '善', '星の力', 'キャスター', 'アルトリア顔', 'アーサー', 'エヌマ特攻無効', '円卓の騎士', '妖精']
    .forEach((trait) => assert.ok(servant.traits.includes(trait), trait));
  servant.skills.forEach((skill) => assert.ok(skill.id, skill.name));
});

test('S1は味方全体へ攻撃力20%とNP30%を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const allies = engine.getAliveAllies();
  const attackBefore = allies.map((ally) => engine._statusTotal(ally, 'attackUp'));
  const result = engine.useSkill(actor.id, 0, actor.id);
  assert.strictEqual(result.ok, true);
  allies.forEach((ally, index) => {
    assert.strictEqual(engine._statusTotal(ally, 'attackUp') - attackBefore[index], 20);
    assert.strictEqual(ally.np, 30);
  });
});

test('S2は選択した味方へNP20%、味方全体へNP獲得量30%を付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().allies[1];
  const allies = engine.getAliveAllies();
  const gainBefore = allies.map((ally) => engine._statusTotal(ally, 'npGainUp'));
  const result = engine.useSkill(actor.id, 1, target.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(target.np, 20);
  assert.strictEqual(actor.np, 0);
  allies.forEach((ally, index) => {
    assert.strictEqual(engine._statusTotal(ally, 'npGainUp') - gainBefore[index], 30);
  });
});

test('S3はArts50%・人類の脅威特攻50%・無敵1Tを付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().allies[1];
  const artsBefore = engine._statusTotal(target, 'cardUp', { card: 'arts' });
  const threatBefore = engine._statusTotal(target, 'traitPowerUp', { trait: '人類の脅威' });
  const result = engine.useSkill(actor.id, 2, target.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(target, 'cardUp', { card: 'arts' }) - artsBefore, 50);
  assert.strictEqual(engine._statusTotal(target, 'traitPowerUp', { trait: '人類の脅威' }) - threatBefore, 50);
  const invincible = target.statuses.find((status) => status.type === 'invincible');
  assert.ok(invincible);
  assert.strictEqual(invincible.remaining, 1);
});

test('クラススキル4種を資料通り登録', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(passiveValue(actor, '対魔力 A', 'debuffResist'), 20);
  assert.strictEqual(passiveValue(actor, '陣地作成 EX', 'cardUp', 'arts'), 12);
  assert.strictEqual(passiveValue(actor, '独自魔術 B', 'cardCritUp', 'arts'), 10);
  assert.strictEqual(passiveValue(actor, '妖精眼 A', 'critRateResist'), 20);
  const enemy = engine.getState().enemies[0];
  assert.strictEqual(engine._enemyCriticalChance(enemy, actor, false), 0);
});

test('宝具は攻撃力アップ・弱体解除・対粛正防御の順で定義', () => {
  const np = DATA.servants.artoriaCaster.np;
  assert.strictEqual(np.target, 'support');
  assert.strictEqual(np.hits, 0);
  assert.deepStrictEqual(np.multipliers, [0, 0, 0, 0, 0]);
  assert.deepStrictEqual(np.before.map((effect) => effect.type), [
    'attackUp',
    'debuffClear',
    'antiEnforcementDefense'
  ]);
  assert.deepStrictEqual(np.before[0].npLevelValues, [30, 40, 45, 47.5, 50]);
  assert.deepStrictEqual(np.before[2].ocUses, [1, 2, 3, 4, 5]);
  assert.strictEqual(np.before[2].duration, 3);
  assert.deepStrictEqual(np.after, []);
});

test('宝具Lv5・OC3で全員へ攻撃力50%と対粛正防御3回を付与し弱体解除', () => {
  const engine = makeEngine({ npLevel: 5, startingNp: 300 });
  const actor = engine.getState().allies[0];
  engine.getAliveAllies().forEach((ally) => {
    engine._addStatus(ally, { type: 'attackDown', duration: 3, debuff: true }, 20, '検証');
  });
  actor.np = 300;
  engine._executeNp({ type: 'np', actorId: actor.id, card: 'arts' }, chainContext(), 0);
  engine.getAliveAllies().forEach((ally) => {
    assert.strictEqual(ally.statuses.some((status) => status.type === 'attackDown'), false);
    assert.strictEqual(passiveValue(ally, 'アルトリア・キャスター', 'attackUp'), 50);
    const defense = ally.statuses.find((status) => status.type === 'antiEnforcementDefense');
    assert.ok(defense);
    assert.strictEqual(defense.uses, 3);
    assert.strictEqual(defense.remaining, 3);
  });
});

test('実際の宝具で付与した対粛正防御は必中・無敵貫通を無視する', () => {
  const engine = makeEngine({ startingNp: 100 });
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  actor.np = 100;
  engine._executeNp({ type: 'np', actorId: actor.id, card: 'arts' }, chainContext(), 0);
  engine._addStatus(enemy, { type: 'sureHit', duration: 3 }, 1, '検証');
  engine._addStatus(enemy, { type: 'invinciblePierce', duration: 3 }, 1, '検証');
  engine.getAliveAllies().forEach((ally) => {
    assert.strictEqual(engine._canAvoid(ally, enemy, false), true);
    assert.strictEqual(ally.statuses.some((status) => status.type === 'antiEnforcementDefense'), false);
  });
});

console.log('\nアルトリア・キャスターの全テストに合格しました。');
