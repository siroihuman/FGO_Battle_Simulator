'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/card-buff-effects.js');
require('../js/turn-field-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/trigger-lifecycle-effects.js');
require('../js/np-card-trigger-removal-effects.js');
require('../js/order-change-position.js');
const RLYEH = require('../js/unique-mechanics/rlyeh.js');

function enemy(overrides = {}) {
  return { enabled: true, name: '対象', classId: 'archer', attribute: 'sky', traits: ['ヒト科'], hp: 1000000, attack: 1, dtdr: 1, deathRate: 100, chargeMax: 9, critRate: 0, ...overrides };
}

function engine(party, target = enemy()) {
  return new BattleEngine({ seed: 1, party, enemies: [target], startingStars: 0 });
}

function test(name, callback) {
  try { callback(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('ルルイエの基本データを登録', () => {
  const servant = DATA.servants.rlyeh;
  assert.strictEqual(servant.no, "024'");
  assert.strictEqual(servant.classId, 'beast');
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'arts', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 3, arts: 4, buster: 4, extra: 6, np: 4 });
  assert.strictEqual(servant.na, 0.39);
  assert.strictEqual(servant.skills.length, 3);
});

test('呼応する悪夢は選択対象CT2・他味方CT1とHP2000減少', () => {
  const e = engine([
    { servantId: 'rlyeh', skillLevel: 10 },
    { servantId: 'fenrir', skillLevel: 10 },
    { servantId: 'koyanskayaLight', skillLevel: 10 }
  ]);
  const [rlyeh, selected, other] = e.getState().allies;
  selected.cooldowns = [5,5,5];
  other.cooldowns = [5,5,5];
  const hp = other.hp;
  assert.strictEqual(e.useSkill(rlyeh.id, 0, selected.id).ok, true);
  assert.deepStrictEqual(selected.cooldowns, [3,3,3]);
  assert.deepStrictEqual(other.cooldowns, [4,4,4]);
  assert.strictEqual(other.hp, hp - 2000);
  assert.strictEqual(selected.statuses.find((s) => s.type === 'buffRemovalResist').value, 100);
});

test('古の支配者は選択色ブーストを付与しターン終了時に永久睡眠へ移行', () => {
  const e = engine([{ servantId: 'rlyeh', skillLevel: 10 }, { servantId: 'fenrir', skillLevel: 10 }]);
  const [rlyeh, target] = e.getState().allies;
  const before = e._statusTotal(target, 'cardUp', { card: 'quick' });
  assert.strictEqual(e.useSkill(rlyeh.id, 2, target.id, 'quick').ok, true);
  assert.strictEqual(target.statuses.find((s) => s.type === RLYEH.statusTypes.cardBoost).statusIcon, 'Quickupboost.webp');
  const rawAfter = before + 50;
  assert.strictEqual(e._statusTotal(target, 'cardUp', { card: 'quick' }), rawAfter * 2);
  e._finishTurn();
  assert.strictEqual(target.statuses.some((s) => s.type === RLYEH.statusTypes.permanentSleep), true);
  assert.strictEqual(target.statuses.some((s) => s.type === 'cardUp' && !s.passive), false);
  assert.strictEqual(e.orderChange(target.id, 'ally-3').ok, false);
});

test('永久睡眠中はスキル・宝具・カードを選択できない', () => {
  const e = engine([{ servantId: 'rlyeh', skillLevel: 10 }, { servantId: 'fenrir', skillLevel: 10, startingNp: 100 }]);
  const [rlyeh, target] = e.getState().allies;
  e.useSkill(rlyeh.id, 2, target.id, 'arts');
  e._finishTurn();
  target.cooldowns = [0,0,0];
  assert.strictEqual(e.useSkill(target.id, 0, target.id).ok, false);
  assert.strictEqual(e.toggleNp(target.id), false);
  const card = e.getState().hand.find((entry) => entry.actorId === target.id);
  if (card) assert.strictEqual(e.toggleCard(card.id), false);
});

test('味方が即死した際に自身以外の味方へNP50を配布', () => {
  const e = engine([{ servantId: 'rlyeh' }, { servantId: 'fenrir' }, { servantId: 'koyanskayaLight' }]);
  const [rlyeh, dead, other] = e.getState().allies;
  dead.hp = 0;
  dead.alive = false;
  e._triggerRlyehDeathRelays(dead);
  assert.strictEqual(rlyeh.np, 50);
  assert.strictEqual(other.np, 50);
});

test('ルルイエの即死成功時に対象の解除可能な強化を吸収', () => {
  const e = engine([{ servantId: 'rlyeh' }], enemy({ deathRate: 100 }));
  e.rng = () => 0;
  const rlyeh = e.getState().allies[0];
  const target = e.getState().enemies[0];
  target.statuses.push({ type: 'attackUp', value: 30, remaining: 3, uses: null, debuff: false, passive: false });
  const result = e._resolveRlyehInstantDeath(rlyeh, target, 150);
  assert.strictEqual(result.success, true);
  assert.strictEqual(target.alive, false);
  assert.strictEqual(rlyeh.statuses.some((s) => s.type === 'attackUp' && s.value === 30), true);
});

console.log('\nルルイエ回帰テストに合格しました。');
