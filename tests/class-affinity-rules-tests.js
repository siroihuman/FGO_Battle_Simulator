'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DATA = require('../js/data.js');
const ENGINE = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/class-affinity-special-effects.js');

// 旧ルルイエ／バフォメット固有処理が2倍固定で外側に残っている状態を再現する。
// class-affinity-rules.jsはこれらより後に読み込まれ、最終倍率を一元管理する。
const proto = ENGINE.BattleEngine.prototype;
const legacyCalculateAttackTotal = proto._calculateAttackTotal;
proto._calculateAttackTotal = function (actor, target, action, chainContext) {
  const traits = target && target.traits || [];
  const passives = target && target.data && target.data.passives || [];
  const legacyRlyeh = actor && actor.servantId === 'rlyeh' &&
    ['ヒト科', '今を生きる人類'].some((trait) => traits.includes(trait));
  const legacyBaphomet = actor && actor.servantId === 'baphomet' && (
    traits.includes('悪魔') ||
    passives.some((passive) => ['道具作成', '陣地作成'].some((name) => String(passive.name || '').startsWith(name)))
  );
  if (!legacyRlyeh && !legacyBaphomet) {
    return legacyCalculateAttackTotal.call(this, actor, target, action, chainContext);
  }
  const actorClass = actor.classId;
  const targetClass = target.classId;
  actor.classId = 'saber';
  target.classId = 'lancer';
  try {
    return legacyCalculateAttackTotal.call(this, actor, target, action, chainContext);
  } finally {
    actor.classId = actorClass;
    target.classId = targetClass;
  }
};

const RULES = require('../js/class-affinity-rules.js');

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function unit(detail = {}) {
  return {
    id: detail.id || 'unit',
    servantId: detail.servantId || '',
    name: detail.name || 'テスト対象',
    classId: detail.classId || 'shielder',
    attribute: detail.attribute || 'neutral',
    traits: detail.traits || [],
    statuses: detail.statuses || [],
    data: detail.data || { passives: [] },
    alive: true,
    hp: 100000,
    maxHp: 100000
  };
}

function makeEngine() {
  return new ENGINE.BattleEngine({
    seed: 260722,
    party: [{ servantId: 'inugamiGyobu', craftEssenceId: 'none', startingNp: 0 }],
    waves: [{
      enabled: true,
      enemies: [{
        enabled: true,
        name: '相性確認用エネミー',
        classId: 'shielder',
        attribute: 'neutral',
        traits: [],
        hp: 100000,
        attack: 1,
        critRate: 0
      }]
    }]
  });
}

function attackUnit(detail = {}) {
  return {
    ...unit(detail),
    atk: 10000,
    cardEnhancement: { quick: 0, arts: 0, buster: 0 },
    npLevel: 1,
    data: { passives: detail.passives || [], np: { multipliers: [100, 100, 100, 100, 100] } }
  };
}

const ACTION = { type: 'card', card: 'arts', position: 0, critical: false };
const CHAIN = { firstBonuses: { buster: false }, busterChain: false };

function damage(engine, actor, target) {
  engine.rng = () => 0.5;
  return engine._calculateAttackTotal(actor, target, ACTION, CHAIN);
}

function assertDamageRatio(engine, actor, target, neutralTarget, expected) {
  const actual = damage(engine, actor, target);
  const neutral = damage(engine, actor, neutralTarget);
  assert.ok(Math.abs(actual / neutral - expected) < 0.01, `${actual}/${neutral} should be ${expected}`);
}

test('AppMedia相性表の通常クラス倍率を維持する', () => {
  assert.strictEqual(RULES.officialClassAffinity('saber', 'lancer'), 2);
  assert.strictEqual(RULES.officialClassAffinity('saber', 'archer'), 0.5);
  assert.strictEqual(RULES.officialClassAffinity('alterEgo', 'rider'), 1.5);
  assert.strictEqual(RULES.officialClassAffinity('foreigner', 'pretender'), 2);
  assert.strictEqual(RULES.officialClassAffinity('shielder', 'berserker'), 1);
});

test('ルルイエの条件付き攻撃有利を1.5倍にする', () => {
  const engine = makeEngine();
  const rlyeh = attackUnit({ servantId: 'rlyeh', name: 'ルルイエ', classId: 'beast' });
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, rlyeh, unit({ traits: ['ヒト科'] })), 1.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, rlyeh, unit({ traits: ['今を生きる人類'] })), 1.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, rlyeh, unit({ traits: ['ヒト科以外'] })), 1);
  assertDamageRatio(engine, rlyeh, unit({ classId: 'shielder', traits: ['ヒト科'] }), unit(), 1.5);
});

test('────の攻撃有利を1.5倍、不利を0.5倍にする', () => {
  const engine = makeEngine();
  const firstMurder = unit({ name: '────', classId: 'beast' });
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ attribute: 'man' })), 1.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ traits: ['ヒト科'] })), 1.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ attribute: 'sky', traits: ['ヒト科'] })), 1.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ attribute: 'sky', traits: ['ヒト科以外'] })), 0.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ attribute: 'earth', traits: ['神性'] })), 1);
});

test('バフォメットはキャスターとルーラーに2倍有利を取る', () => {
  const engine = makeEngine();
  const baphomet = attackUnit({ servantId: 'baphomet', name: 'バフォメット', classId: 'beast' });
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, unit({ classId: 'caster' })), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, unit({ classId: 'ruler' })), 2);
  assertDamageRatio(engine, baphomet, unit({ classId: 'caster' }), unit(), 2);
});

test('バフォメットの条件付き攻撃有利を1.5倍にする', () => {
  const engine = makeEngine();
  const baphomet = attackUnit({ servantId: 'baphomet', name: 'バフォメット', classId: 'beast' });
  const itemConstruction = unit({ data: { passives: [{ name: '道具作成 B' }] } });
  const territoryCreation = unit({ data: { passives: [{ name: '陣地作成 EX' }] } });
  const demon = unit({ traits: ['悪魔'] });
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, itemConstruction), 1.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, territoryCreation), 1.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, demon), 1.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, unit({ traits: ['神性'] })), 1);
  assertDamageRatio(engine, baphomet, unit({ classId: 'shielder', traits: ['悪魔'] }), unit(), 1.5);
});

test('バフォメットはアヴェンジャーと全ビーストから防御不利になる', () => {
  const engine = makeEngine();
  const baphomet = unit({ servantId: 'baphomet', name: 'バフォメット', classId: 'beast' });
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, unit({ classId: 'avenger' }), baphomet), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, unit({ classId: 'beast' }), baphomet), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, unit({ classId: 'beastDraco' }), baphomet), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, unit({ classId: 'beastSpaceEreshkigal' }), baphomet), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, unit({ classId: 'beastUOlgaMarie' }), baphomet), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, unit({ classId: 'saber' }), baphomet), 1);
});

test('計算中に旧固有2倍処理を抑止し、ユニット情報を復元する', () => {
  const engine = makeEngine();
  const rlyeh = attackUnit({ servantId: 'rlyeh', name: 'ルルイエ', classId: 'beast' });
  const target = unit({ classId: 'shielder', traits: ['ヒト科'] });
  assertDamageRatio(engine, rlyeh, target, unit(), 1.5);
  assert.strictEqual(rlyeh.servantId, 'rlyeh');
  assert.strictEqual(rlyeh.classId, 'beast');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(rlyeh, 'classAffinityProfile'), false);
  assert.strictEqual(target.classId, 'shielder');
});

test('完全版相性処理は固有処理より後に読み込む', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.indexOf('js/class-affinity-rules.js') > html.indexOf('js/unique-mechanics/baphomet.js'));
  assert.ok(html.indexOf('js/class-affinity-rules.js') > html.indexOf('js/unique-mechanics/rlyeh.js'));
  assert.ok(html.indexOf('js/class-affinity-rules.js') < html.indexOf('js/app.js'));
});

console.log('\n改訂版クラス相性テストに合格しました。');
