'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants.js');
require('../js/servants-quinqux-quinquefolia.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/np-card-trigger-removal-effects.js');
require('../js/defense-buff-removal-effects.js');
const MECHANICS = require('../js/unique-mechanics/quinqux-quinquefolia.js');

function enemy(overrides = {}) {
  return {
    enabled: true,
    name: '対象',
    classId: 'saber',
    attribute: 'man',
    traits: ['サーヴァント'],
    hp: 1000000,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    chargeMax: 3,
    critRate: 0,
    ...overrides
  };
}

function engine(party, enemies = [enemy()]) {
  return new BattleEngine({ seed: 1, party, enemies, startingStars: 0 });
}

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('No.106の基本データを登録', () => {
  const servant = DATA.servants.quinquxQuinquefolia;
  assert.strictEqual(servant.no, '106');
  assert.strictEqual(servant.classId, 'alterEgo');
  assert.strictEqual(servant.maxHp, 12696);
  assert.strictEqual(servant.atk, 12342);
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'buster', 'buster', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 4, arts: 4, buster: 4, extra: 5, np: 4 });
  assert.strictEqual(servant.na, 0.58);
  assert.strictEqual(servant.nd, 4.00);
  assert.strictEqual(servant.skills.length, 3);
  assert.strictEqual(servant.passives.length, 5);
  assert.deepStrictEqual(servant.np.multipliers, [400, 500, 550, 575, 600]);
});

test('誰のものでもない仮面は先頭の他味方へスキルと宝具を換装し1T後に戻す', () => {
  const e = engine([
    { servantId: 'quinquxQuinquefolia', skillLevel: 10, startingNp: 0 },
    { servantId: 'fenrir', skillLevel: 10, startingNp: 100 },
    { servantId: 'koyanskayaLight', skillLevel: 10, startingNp: 0 }
  ]);
  const [quinqux, firstOther, third] = e.getState().allies;
  const originalName = firstOther.name;
  const originalNpId = firstOther.data.np.id;
  const result = e.useSkill(quinqux.id, 0, quinqux.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.targetId, firstOther.id);
  assert.strictEqual(quinqux.np, 50);
  assert.strictEqual(firstOther.name, quinqux.name);
  assert.strictEqual(firstOther.data.np.id, quinqux.data.np.id);
  assert.strictEqual(firstOther.data.skills[0].id, 'maskBelongingToNoOne');
  assert.strictEqual(third.data.np.id !== quinqux.data.np.id, true);
  assert.strictEqual(e.useSkill(firstOther.id, 0, firstOther.id).ok, false);
  e._finishTurn();
  assert.strictEqual(firstOther.name, originalName);
  assert.strictEqual(firstOther.data.np.id, originalNpId);
});

test('祝祭輪転は全体NP・攻撃力・CT短縮と自身以外の防御強化解除', () => {
  const e = engine([
    { servantId: 'quinquxQuinquefolia', skillLevel: 10, startingNp: 0 },
    { servantId: 'fenrir', skillLevel: 10, startingNp: 0 }
  ]);
  const [quinqux, ally] = e.getState().allies;
  quinqux.cooldowns = [5, 0, 5];
  ally.cooldowns = [5, 5, 5];
  e._addStatus(quinqux, { type: 'defenseUp', duration: 3 }, 30, 'test');
  e._addStatus(ally, { type: 'defenseUp', duration: 3 }, 30, 'test');
  const result = e.useSkill(quinqux.id, 1, quinqux.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(quinqux.np, 20);
  assert.strictEqual(ally.np, 20);
  assert.strictEqual(e._statusTotal(quinqux, 'attackUp'), 20);
  assert.strictEqual(e._statusTotal(ally, 'attackUp'), 20);
  assert.strictEqual(quinqux.statuses.some((s) => s.type === 'defenseUp'), true);
  assert.strictEqual(ally.statuses.some((s) => s.type === 'defenseUp'), false);
  assert.deepStrictEqual(ally.cooldowns, [4, 4, 4]);
});

test('百貌の道化は強化解除・スキル封印・条件特攻・NP50を付与', () => {
  const e = engine([{ servantId: 'quinquxQuinquefolia', skillLevel: 10, startingNp: 0 }]);
  const quinqux = e.getState().allies[0];
  const target = e.getState().enemies[0];
  e._addStatus(target, { type: 'attackUp', duration: 3 }, 30, 'test');
  const result = e.useSkill(quinqux.id, 2, target.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(target.statuses.some((s) => s.type === 'attackUp'), false);
  assert.strictEqual(target.statuses.some((s) => s.type === 'skillSeal'), true);
  assert.strictEqual(quinqux.statuses.some((s) => s.type === MECHANICS.statusTypes.conditionalPower && s.value === 50), true);
  assert.strictEqual(quinqux.np, 50);
});

test('敗者の代償は防御力30ダウンとして扱われ宝具特攻対象になる', () => {
  const e = engine([{ servantId: 'quinquxQuinquefolia', startingNp: 100 }]);
  const quinqux = e.getState().allies[0];
  const target = e.getState().enemies[0];
  e.rng = () => 0;
  e._applyEffect(quinqux.data.np.after[0], quinqux, target.id, { oc: 1, level: 10 });
  assert.strictEqual(MECHANICS.hasLosersCost(target), true);
  assert.strictEqual(e._statusTotal(target, 'defenseUp'), -30);
  e._currentNpOc = 5;
  assert.strictEqual(e._npSpecialMultiplier(quinqux.data.np, target), 2);
});

console.log('\nクインクス・キンケフォリア回帰テストに合格しました。');
