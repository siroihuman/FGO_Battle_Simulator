'use strict';

const assert = require('assert');
require('../js/data.js');
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
require('../js/trigger-star-reward-effects.js');
require('../js/order-change-position.js');
require('../js/craft-essence-effects.js');
const BAPHOMET = require('../js/unique-mechanics/baphomet.js');
require('../js/unique-mechanics/runtime.js');

const DATA = global.FGO_SIM_DATA;
const TYPES = BAPHOMET.statusTypes;
const WORSHIPPER = BAPHOMET.worshipperTrait;
const chainContext = {
  firstBonuses: { buster: false, arts: false, quick: false },
  busterChain: false,
  artsChain: false,
  quickChain: false,
  mighty: false
};

function enemy(overrides = {}) {
  return {
    enabled: true,
    name: 'バフォメット検証敵',
    classId: 'saber',
    attribute: 'earth',
    traits: ['サーヴァント', '人型'],
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

function makeEngine(party, enemyOverrides = {}) {
  const engine = new BattleEngine({
    seed: 840084,
    party: party || [
      { servantId: 'baphomet', skillLevel: 10, npLevel: 1, startingNp: 0 },
      { servantId: 'lucifera', skillLevel: 10, npLevel: 1, startingNp: 0 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 }
    ],
    enemies: [enemy(enemyOverrides)]
  });
  engine.rng = () => 0.5;
  return engine;
}

function addWorshipper(engine, unit, source = '検証') {
  return engine._addStatus(unit, {
    type: 'temporaryTrait',
    trait: WORSHIPPER,
    duration: 3
  }, 0, source);
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

test('No.084の基本データ・指定アイコン・宝具を登録する', () => {
  const servant = DATA.servants.baphomet;
  assert.ok(servant);
  assert.strictEqual(servant.no, '084');
  assert.strictEqual(servant.name, 'バフォメット');
  assert.strictEqual(servant.classId, 'beast');
  assert.strictEqual(servant.maxHp, 12964);
  assert.strictEqual(servant.atk, 12774);
  assert.deepStrictEqual(servant.levelStats[100], { hp: 14203, atk: 13983 });
  assert.deepStrictEqual(servant.levelStats[120], { hp: 16692, atk: 16413 });
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'arts', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 5, arts: 6, buster: 5, extra: 7, np: 7 });
  assert.strictEqual(servant.na, 0.25);
  assert.strictEqual(servant.nd, 3);
  assert.strictEqual(servant.starRate, 10);
  assert.strictEqual(servant.starWeight, 145);
  assert.strictEqual(servant.deathRate, 0.5);
  assert.deepStrictEqual(servant.skillIcons, [
    'skill-general-003.png',
    'skill-general-010.png',
    'skill-unique-022.png'
  ]);
  assert.deepStrictEqual(servant.passives.slice(0, 3).map((passive) => passive.icon), [
    'skill-general-024.png',
    'class-independent-action.png',
    'class-unique-008.png'
  ]);
  assert.strictEqual(servant.np.name, '黒山羊と魔女達の夜');
  assert.strictEqual(servant.np.reading, 'アクエラーレ');
  assert.deepStrictEqual(servant.np.multipliers, [450, 600, 675, 712.5, 750]);
  assert.deepStrictEqual(servant.np.special.ocMultipliers, [1.5, 1.625, 1.75, 1.875, 2]);
});

test('獣の権能・単独顕現と異端審問の常時効果を初期化する', () => {
  const engine = makeEngine();
  const [baphomet, lucifera, koyanskaya] = engine.getState().allies;
  assert.strictEqual(engine._statusTotal(baphomet, 'critUp') >= 17.5, true);
  assert.strictEqual(engine._statusTotal(baphomet, 'deathResist') >= 11.5, true);
  assert.strictEqual(engine._statusTotal(baphomet, 'mentalResist') >= 11.5, true);
  assert.strictEqual(engine.hasTrait(baphomet, WORSHIPPER), false);

  addWorshipper(engine, baphomet);
  assert.strictEqual(engine.hasTrait(baphomet, WORSHIPPER), false);
  assert.strictEqual(lucifera.statuses.filter((status) => status.type === TYPES.extension).length, 1);
  assert.strictEqual(koyanskaya.statuses.filter((status) => status.type === TYPES.extension).length, 1);
});

test('ビースト固有相性は〔道具作成〕〔陣地作成〕〔悪魔〕へ攻撃有利2倍になる', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  const action = { type: 'card', card: 'buster', position: 0, critical: false };

  target.traits = ['サーヴァント'];
  const neutral = engine._calculateAttackTotal(actor, target, action, chainContext);
  target.traits.push('悪魔');
  const advantage = engine._calculateAttackTotal(actor, target, action, chainContext);
  assert.strictEqual(advantage, neutral * 2);
});

test('スキル1は選択対象と〔怨嗟の崇拝者〕だけへ各効果を適用する', () => {
  const engine = makeEngine();
  const [baphomet, lucifera, koyanskaya] = engine.getState().allies;
  addWorshipper(engine, lucifera);
  addWorshipper(engine, baphomet);

  const before = {
    koyanArts: engine._statusTotal(koyanskaya, 'cardUp', { card: 'arts' }),
    koyanCrit: engine._statusTotal(koyanskaya, 'cardCritUp', { card: 'arts' }),
    koyanWeight: engine._statusTotal(koyanskaya, 'cardStarWeightUp', { card: 'arts' }),
    luciferaArts: engine._statusTotal(lucifera, 'cardUp', { card: 'arts' }),
    baphometArts: engine._statusTotal(baphomet, 'cardUp', { card: 'arts' })
  };

  assert.strictEqual(engine.useSkill(baphomet.id, 0, koyanskaya.id).ok, true);
  assert.strictEqual(engine._statusTotal(koyanskaya, 'cardUp', { card: 'arts' }) - before.koyanArts, 50);
  assert.strictEqual(engine._statusTotal(koyanskaya, 'cardCritUp', { card: 'arts' }) - before.koyanCrit, 50);
  assert.strictEqual(engine._statusTotal(koyanskaya, 'cardStarWeightUp', { card: 'arts' }) - before.koyanWeight, 5000);
  assert.strictEqual(engine._statusTotal(lucifera, 'cardUp', { card: 'arts' }) - before.luciferaArts, 30);
  assert.strictEqual(engine._statusTotal(lucifera, 'starsPerTurn'), 15);
  assert.strictEqual(engine._statusTotal(baphomet, 'cardUp', { card: 'arts' }) - before.baphometArts, 0);
  assert.strictEqual(engine._statusTotal(baphomet, 'starsPerTurn'), 0);
});

test('スキル2は即時NPとフィールド滞在中の崇拝者NP増加を処理する', () => {
  const engine = makeEngine();
  const [baphomet, lucifera, koyanskaya] = engine.getState().allies;
  addWorshipper(engine, lucifera);

  assert.strictEqual(engine.useSkill(baphomet.id, 1, baphomet.id).ok, true);
  assert.strictEqual(baphomet.np, 80);
  assert.strictEqual(lucifera.np, 30);
  assert.strictEqual(koyanskaya.np, 30);

  engine._runGenericEvent('turnEnd', { turn: engine.getState().turn });
  assert.strictEqual(lucifera.np, 35);
  assert.strictEqual(koyanskaya.np, 30);

  baphomet.frontline = false;
  engine._runGenericEvent('turnEnd', { turn: engine.getState().turn });
  assert.strictEqual(lucifera.np, 35);
});

test('スキル3は先頭の有効対象を自動選択し、加護・固定・ブースト・交換禁止を付与する', () => {
  const engine = makeEngine([
    { servantId: 'baphomet', skillLevel: 10, npLevel: 1 },
    { servantId: 'baphomet', skillLevel: 10, npLevel: 1 },
    { servantId: 'lucifera', skillLevel: 10, npLevel: 1 },
    { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 }
  ]);
  const [provider, immuneBaphomet, lucifera, reserve] = engine.getState().allies;
  engine._addStatus(lucifera, { type: 'cardUp', card: 'arts', value: 40, duration: 2 }, 40, '検証Arts');
  engine._addStatus(lucifera, { type: 'attackUp', value: 20, duration: 2 }, 20, '検証攻撃');
  const artsBeforeBoost = engine._statusTotal(lucifera, 'cardUp', { card: 'arts' });

  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  assert.strictEqual(hasType(immuneBaphomet, TYPES.blessing), false);
  assert.strictEqual(hasType(lucifera, TYPES.blessing), true);
  assert.strictEqual(engine.hasTrait(lucifera, WORSHIPPER), true);
  assert.strictEqual(engine._statusTotal(lucifera, 'cardUp', { card: 'arts' }), artsBeforeBoost * 1.5);
  const summary = engine.getStatusSummary(lucifera.id);
  assert.strictEqual(summary.find((status) => status.type === 'temporaryTrait' && status.trait === WORSHIPPER).statusIcon, 'Dragontrait.webp');
  assert.strictEqual(summary.find((status) => status.type === TYPES.blessing).statusIcon, 'Dragontrait.webp');
  assert.strictEqual(summary.find((status) => status.type === TYPES.durationLock).statusIcon, 'Dragontrait.webp');
  assert.strictEqual(summary.find((status) => status.type === TYPES.cardBoost).statusIcon, 'Artsupboost.webp');
  assert.strictEqual(engine.orderChange(lucifera.id, reserve.id).ok, false);

  engine._applyEffect({ type: 'buffClear', target: 'selectedAlly' }, provider, lucifera.id, {});
  assert.strictEqual(hasType(lucifera, TYPES.blessing), true);
  assert.strictEqual(hasType(lucifera, TYPES.contract), true);
  assert.strictEqual(lucifera.statuses.some((status) => status.source === '検証攻撃'), false);
});

test('重複不可状態を持つ対象にもスキル3を再使用でき、固有状態は重複しない', () => {
  const engine = makeEngine();
  const [provider, target] = engine.getState().allies;
  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  provider.cooldowns[2] = 0;
  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  [TYPES.blessing, TYPES.durationLock, TYPES.cardBoost, TYPES.contract]
    .forEach((type) => assert.strictEqual(target.statuses.filter((status) => status.type === type).length, 1));
});

test('重複不可と重複可能が混在する場合は重複可能効果だけ再付与する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  actor.data.skills.push({ id: 'stackTest', name: '重複検証', baseCt: 3, target: 'self', effects: [
    { type: 'attackUp', target: 'self', value: 10, duration: 3, uniqueKey: 'stackTest:unique' },
    { type: 'critUp', target: 'self', value: 5, duration: 3 }
  ] });
  actor.skillLevels.push(10); actor.cooldowns.push(0);
  const index = actor.data.skills.length - 1;
  assert.strictEqual(engine.useSkill(actor.id, index, actor.id).ok, true);
  actor.cooldowns[index] = 0;
  assert.strictEqual(engine.useSkill(actor.id, index, actor.id).ok, true);
  assert.strictEqual(actor.statuses.filter((status) => status.uniqueKey === 'stackTest:unique').length, 1);
  assert.strictEqual(actor.statuses.filter((status) => status.type === 'critUp' && status.value === 5 && !status.passive).length, 2);
});

function hasType(unit, type) {
  return unit.statuses.some((status) => status.type === type && status.remaining !== 0);
}

test('黒山羊の加護中は解除可能な強化の残りターンを固定する', () => {
  const engine = makeEngine();
  const [provider, target] = engine.getState().allies;
  const buff = engine._addStatus(target, { type: 'attackUp', duration: 2 }, 30, '固定検証');
  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);

  engine._runEffectHooks('turnEnd', { turn: engine.getState().turn });
  engine._removeExpiredStatuses(target);
  assert.strictEqual(buff.remaining, 2);
  assert.strictEqual(target.statuses.find((status) => status.type === TYPES.blessing).remaining, 2);
});

test('ターン終了時に双方が生存していれば通常強化だけを献上し、概念礼装バフは除外する', () => {
  const engine = makeEngine([
    { servantId: 'baphomet', skillLevel: 10, npLevel: 1 },
    { servantId: 'lucifera', skillLevel: 10, npLevel: 1, craftEssenceId: 'blackGrail' },
    { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 }
  ]);
  const [provider, target] = engine.getState().allies;
  const providerBuff = engine._addStatus(provider, { type: 'attackUp', duration: 1 }, 20, '延長対象');
  const offeredBuff = engine._addStatus(target, { type: 'cardUp', card: 'arts', duration: 2 }, 40, '献上対象');
  const ceBuff = target.statuses.find((status) => status.type === 'npPowerUp' && status.source === '黒の聖杯');
  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  provider.frontline = false;
  target.statuses.forEach((status) => {
    if ([TYPES.blessing, TYPES.durationLock, TYPES.cardBoost, TYPES.contract].includes(status.type) ||
        (status.type === 'temporaryTrait' && status.trait === WORSHIPPER)) status.remaining = 1;
  });
  engine._finishTurn();
  assert.strictEqual(target.alive, false);
  assert.strictEqual(target.statuses.includes(offeredBuff), false);
  assert.strictEqual(target.statuses.includes(ceBuff), true);
  const transferred = provider.statuses.find((status) => String(status.source || '').includes('献上対象'));
  assert.ok(transferred);
  assert.strictEqual(providerBuff.remaining, 4);
  assert.strictEqual(transferred.remaining, 5);
  assert.strictEqual(provider.statuses.some((status) => String(status.source || '').includes('黒の聖杯') && String(status.source || '').includes('献上')), false);
});

test('ターン終了時にバフォメットが戦闘不能なら献上せず対象の通常強化を残す', () => {
  const engine = makeEngine();
  const [provider, target] = engine.getState().allies;
  const buff = engine._addStatus(target, { type: 'attackUp', duration: 2 }, 30, '生存条件検証');
  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  target.statuses.forEach((status) => {
    if ([TYPES.blessing, TYPES.durationLock, TYPES.cardBoost, TYPES.contract].includes(status.type) ||
        (status.type === 'temporaryTrait' && status.trait === WORSHIPPER)) status.remaining = 1;
  });
  provider.hp = 0; provider.alive = false;
  engine._finishTurn();
  assert.strictEqual(target.alive, false);
  assert.strictEqual(target.statuses.includes(buff), true);
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('両方生存していないため、強化献上は発動しない')));
});

test('宝具は攻撃前Arts耐性ダウン・人型特攻・崇拝者NP30を処理する', () => {
  const engine = makeEngine([
    { servantId: 'baphomet', skillLevel: 10, npLevel: 1, startingNp: 100 },
    { servantId: 'lucifera', skillLevel: 10, npLevel: 1, startingNp: 0 },
    { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 }
  ]);
  const [baphomet, lucifera, koyanskaya] = engine.getState().allies;
  const target = engine.getState().enemies[0];
  addWorshipper(engine, lucifera);
  addWorshipper(engine, baphomet);

  engine._currentNpOc = 5;
  assert.strictEqual(engine._npSpecialMultiplier(DATA.servants.baphomet.np, target), 2);
  engine._currentNpOc = 1;
  engine._executeNp({ type: 'np', actorId: baphomet.id, card: 'arts' }, chainContext, 0);

  const resist = target.statuses.find((status) => status.type === 'cardResist' && status.card === 'arts');
  assert.ok(resist);
  assert.strictEqual(resist.value, 20);
  assert.strictEqual(lucifera.np, 30);
  assert.ok(baphomet.np > 0 && baphomet.np < 30, `宝具リチャージのみを想定: ${baphomet.np}`);
  assert.strictEqual(koyanskaya.np, 0);
});

test('固有APIを公開する', () => {
  assert.strictEqual(BAPHOMET.servantId, 'baphomet');
  assert.deepStrictEqual(BAPHOMET.affinityTraits, ['道具作成', '陣地作成', '悪魔']);
  assert.strictEqual(BAPHOMET.cardBoostValues[9], 50);
  assert.deepStrictEqual(BAPHOMET.cardBoostIcons, {
    quick: 'Quickupboost.webp', arts: 'Artsupboost.webp', buster: 'Busterupboost.webp'
  });
});

console.log('\nバフォメット実装回帰テストに合格しました。');
