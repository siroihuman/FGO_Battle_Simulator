'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants-sen-no-rikyu.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/combat-defense-effects.js');
require('../js/card-pre-damage-effects.js');

function enemy(overrides = {}) {
  return {
    enabled: true,
    name: '対象',
    classId: 'archer',
    attribute: 'man',
    traits: ['人の力'],
    hp: 1000000,
    attack: 1,
    dtdr: 1,
    deathRate: 100,
    chargeMax: 9,
    critRate: 0,
    ...overrides
  };
}

function engine() {
  return new BattleEngine({
    seed: 1,
    party: [{ servantId: 'senNoRikyu', skillLevel: 10, startingNp: 100 }],
    enemies: [enemy()],
    startingStars: 0
  });
}

function test(name, callback) {
  try { callback(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('千利休の基本データを登録', () => {
  const servant = DATA.servants.senNoRikyu;
  assert.strictEqual(servant.no, '362');
  assert.strictEqual(servant.classId, 'berserker');
  assert.deepStrictEqual(servant.cards, ['quick', 'quick', 'quick', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 5, arts: 3, buster: 3, extra: 5, np: 6 });
  assert.strictEqual(servant.na, 0.70);
  assert.strictEqual(servant.nd, 5.00);
  assert.strictEqual(servant.skills.length, 3);
  assert.strictEqual(servant.passives.length, 4);
});

test('侘びの極みは全体Quick・NP獲得量とスター15を付与', () => {
  const e = engine();
  const rikyu = e.getState().allies[0];
  assert.strictEqual(e.useSkill(rikyu.id, 0, rikyu.id).ok, true);
  assert.strictEqual(e._statusTotal(rikyu, 'cardUp', { card: 'quick' }), 20);
  assert.strictEqual(e._statusTotal(rikyu, 'npGainUp'), 20);
  assert.strictEqual(e.getState().stars, 15);
});

test('一輪の花はNP30・OC2・無敵1回を付与', () => {
  const e = engine();
  const rikyu = e.getState().allies[0];
  rikyu.np = 0;
  assert.strictEqual(e.useSkill(rikyu.id, 1, rikyu.id).ok, true);
  assert.strictEqual(rikyu.np, 30);
  assert.strictEqual(rikyu.statuses.find((status) => status.type === 'ocUp').value, 2);
  assert.strictEqual(rikyu.statuses.find((status) => status.type === 'invincible').uses, 1);
});

test('幽玄たる黒はQuickダメージ前に防御力10ダウンを付与', () => {
  const e = engine();
  const rikyu = e.getState().allies[0];
  const target = e.getState().enemies[0];
  assert.strictEqual(e.useSkill(rikyu.id, 2, rikyu.id).ok, true);
  e._resolveAttackOnTarget(rikyu, target, {
    type: 'card', card: 'quick', position: 0, critical: false
  }, { firstBonuses: { quick: false, arts: false, buster: false }, busterChain: false });
  const defenseDown = target.statuses.find((status) => status.type === 'defenseDown');
  assert.ok(defenseDown);
  assert.strictEqual(defenseDown.value, 10);
  assert.strictEqual(defenseDown.remaining, 3);
});

test('融通無碍はQuickカードのみNP獲得量を10%上げる', () => {
  const e = engine();
  const rikyu = e.getState().allies[0];
  const target = e.getState().enemies[0];
  const chain = { firstBonuses: { quick: false, arts: false, buster: false } };
  const quick = e._cardNpPerHit(rikyu, target, { type: 'card', card: 'quick', position: 0, critical: false }, chain, false);
  const arts = e._cardNpPerHit(rikyu, target, { type: 'card', card: 'arts', position: 0, critical: false }, chain, false);
  const quickWithoutPassive = (() => {
    const saved = rikyu.statuses;
    rikyu.statuses = saved.filter((status) => status.type !== 'cardNpGainUp');
    const value = e._cardNpPerHit(rikyu, target, { type: 'card', card: 'quick', position: 0, critical: false }, chain, false);
    rikyu.statuses = saved;
    return value;
  })();
  assert.ok(quick > quickWithoutPassive);
  assert.ok(arts > 0);
});

console.log('\n千利休回帰テストに合格しました。');
