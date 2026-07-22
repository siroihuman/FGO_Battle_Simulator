'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants.js');
require('../js/servants-konohanasakuya-hime.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/turn-field-effects.js');
require('../js/command-use-locks.js');
const MECHANICS = require('../js/unique-mechanics/konohanasakuya-hime.js');

function enemy() {
  return {
    enabled: true,
    name: '対象',
    classId: 'assassin',
    attribute: 'earth',
    traits: ['サーヴァント'],
    hp: 1000000,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    chargeMax: 9,
    critRate: 0
  };
}

function engine(party) {
  return new BattleEngine({ seed: 1, party, enemies: [enemy()], startingStars: 0 });
}

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('No.069の基本データと指定アイコンを登録', () => {
  const servant = DATA.servants.konohanasakuyaHime;
  assert.strictEqual(servant.no, '069');
  assert.strictEqual(servant.name, '木花之佐久夜毘売');
  assert.strictEqual(servant.classId, 'caster');
  assert.strictEqual(servant.maxHp, 15846);
  assert.strictEqual(servant.atk, 9585);
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'arts', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 3, arts: 3, buster: 3, extra: 6, np: 0 });
  assert.strictEqual(servant.na, 0.54);
  assert.strictEqual(servant.nd, 3.00);
  assert.deepStrictEqual(servant.skillIcons, [
    'skill-np-per-turn.png', 'skill-general-048.png', 'skill-np-charge.png'
  ]);
  assert.deepStrictEqual(servant.passives.map((passive) => passive.icon), [
    'class-general-012.png', 'class-general-011.png', 'class-general-003.png'
  ]);
  assert.strictEqual(servant.passives[2].name, '女神の神核 EX');
});

test('花咲耶の巫祝は全体へ5ターン継続効果と指定アイコンを付与', () => {
  const e = engine([
    { servantId: 'konohanasakuyaHime', skillLevel: 10 },
    { servantId: 'fenrir', skillLevel: 10 }
  ]);
  const [actor, ally] = e.getState().allies;
  ally.hp -= 3000;
  assert.strictEqual(e.useSkill(actor.id, 0, actor.id).ok, true);
  assert.strictEqual(e._statusTotal(ally, 'npPerTurn'), 5);
  assert.strictEqual(ally.statuses.find((s) => s.type === MECHANICS.statusTypes.hpPerTurn).value, 1000);
  assert.strictEqual(ally.statuses.find((s) => s.type === 'attackUp').uses, 1);
  assert.strictEqual(ally.statuses.find((s) => s.type === 'buffRemovalResist').statusIcon, 'Removalresistup.webp');
  const hp = ally.hp;
  e._finishTurn();
  assert.strictEqual(ally.hp, hp + 1000);
});

test('火避けの加護と富士の御力は掲載効果を処理', () => {
  const e = engine([
    { servantId: 'konohanasakuyaHime', skillLevel: 10 },
    { servantId: 'fenrir', skillLevel: 10 }
  ]);
  const [actor, ally] = e.getState().allies;
  e._addStatus(ally, { type: 'attackDown', duration: 3, debuff: true }, 20, 'test');
  assert.strictEqual(e.useSkill(actor.id, 1, actor.id).ok, true);
  assert.strictEqual(ally.statuses.some((s) => s.type === 'attackDown'), false);
  assert.strictEqual(ally.statuses.find((s) => s.type === 'evade').uses, 2);
  assert.strictEqual(e._statusTotal(ally, 'cardUp', { card: 'arts' }), 20);
  assert.strictEqual(e._statusTotal(ally, 'defenseUp'), 20);

  assert.strictEqual(e.useSkill(actor.id, 2, actor.id).ok, true);
  assert.strictEqual(actor.np, 50);
  assert.strictEqual(ally.np, 20);
  assert.strictEqual(e._statusTotal(actor, 'defenseUp'), 70);
  assert.strictEqual(e._statusTotal(actor, 'targetFocus'), 300);
});

test('木花一夜は陽射し・桜花爛漫・拘束・カード選出不能を付与', () => {
  const e = engine([
    { servantId: 'konohanasakuyaHime', skillLevel: 10, npLevel: 5 },
    { servantId: 'fenrir', skillLevel: 10 },
    { servantId: 'koyanskayaLight', skillLevel: 10 }
  ]);
  const [actor, ally] = e.getState().allies;
  const np = actor.data.np;
  np.before.forEach((effect) => e._applyEffect(effect, actor, actor.id, { level: 10, npLevel: 5, oc: 1 }));
  np.after.forEach((effect) => e._applyEffect(effect, actor, actor.id, { level: 10, npLevel: 5, oc: 1 }));

  assert.strictEqual(e.hasFieldTrait('陽射し'), true);
  assert.strictEqual(actor.statuses.find((s) => s.type === MECHANICS.statusTypes.cherryBlossom).statusIcon, 'Dragontrait.webp');
  assert.strictEqual(ally.statuses.find((s) => s.type === MECHANICS.statusTypes.afterSkillCooldown).statusIcon, 'Dragontrait.webp');
  assert.strictEqual(e._statusTotal(ally, 'npPerTurn'), 20);
  assert.strictEqual(actor.statuses.find((s) => s.type === 'stun').statusIcon, 'Stunstatus.webp');
  assert.strictEqual(actor.statuses.find((s) => s.type === MECHANICS.statusTypes.commandCardSeal).statusIcon, 'Commandcardsseal.webp');
  assert.strictEqual(actor.statuses.find((s) => s.type === 'npPerTurn').value, 10);
});

test('桜花爛漫は使用したスキルだけCTを1進める', () => {
  const e = engine([
    { servantId: 'konohanasakuyaHime', skillLevel: 10, npLevel: 1 },
    { servantId: 'fenrir', skillLevel: 10 }
  ]);
  const [actor, ally] = e.getState().allies;
  actor.data.np.before.forEach((effect) => e._applyEffect(effect, actor, actor.id, { npLevel: 1 }));
  const result = e.useSkill(ally.id, 0, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(ally.cooldowns[0], 5, 'フェンリルのLv10スキル1は通常CT6から1短縮されCT5');
  assert.strictEqual(ally.cooldowns[1], 0);
  assert.strictEqual(ally.cooldowns[2], 0);
});

test('前衛1騎だけの場合はコマンドカード選出不能を付与しない', () => {
  const e = engine([{ servantId: 'konohanasakuyaHime', skillLevel: 10 }]);
  const actor = e.getState().allies[0];
  const effect = actor.data.np.after.find((entry) => entry.type === MECHANICS.statusTypes.commandCardSeal);
  const result = e._applyEffect(effect, actor, actor.id, {});
  assert.strictEqual(result.applied, false);
  assert.strictEqual(result.reason, 'singleFrontline');
});

console.log('\n木花之佐久夜毘売回帰テストに合格しました。');
