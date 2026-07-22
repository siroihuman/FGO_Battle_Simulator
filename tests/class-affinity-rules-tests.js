'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const ENGINE = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/class-affinity-special-effects.js');
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

test('AppMedia相性表の通常クラス倍率を再現する', () => {
  assert.strictEqual(RULES.officialClassAffinity('saber', 'lancer'), 2);
  assert.strictEqual(RULES.officialClassAffinity('saber', 'archer'), 0.5);
  assert.strictEqual(RULES.officialClassAffinity('alterEgo', 'rider'), 1.5);
  assert.strictEqual(RULES.officialClassAffinity('alterEgo', 'foreigner'), 2);
  assert.strictEqual(RULES.officialClassAffinity('foreigner', 'pretender'), 2);
  assert.strictEqual(RULES.officialClassAffinity('pretender', 'alterEgo'), 2);
  assert.strictEqual(RULES.officialClassAffinity('berserker', 'foreigner'), 0.5);
  assert.strictEqual(RULES.officialClassAffinity('shielder', 'berserker'), 1);
  assert.strictEqual(RULES.officialClassAffinity('berserker', 'shielder'), 1);
});

test('3種類の公式ビースト相性を個別に再現する', () => {
  assert.strictEqual(DATA.classNames.beastDraco, 'ビースト（ドラコー）');
  assert.strictEqual(DATA.classNames.beastSpaceEreshkigal, 'ビースト（スペース・エレシュキガル）');
  assert.strictEqual(DATA.classNames.beastUOlgaMarie, 'ビースト（U-オルガマリー）');
  assert.strictEqual(RULES.officialClassAffinity('beastDraco', 'saber'), 1.5);
  assert.strictEqual(RULES.officialClassAffinity('saber', 'beastDraco'), 0.5);
  assert.strictEqual(RULES.officialClassAffinity('beastSpaceEreshkigal', 'ruler'), 1.5);
  assert.strictEqual(RULES.officialClassAffinity('avenger', 'beastSpaceEreshkigal'), 2);
  assert.strictEqual(RULES.officialClassAffinity('beastUOlgaMarie', 'moonCancer'), 2);
  assert.strictEqual(RULES.officialClassAffinity('moonCancer', 'beastUOlgaMarie'), 0.5);
});

test('ルルイエはヒト科または今を生きる人類に2倍有利を取る', () => {
  const engine = makeEngine();
  const rlyeh = unit({ servantId: 'rlyeh', name: 'ルルイエ', classId: 'beast' });
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, rlyeh, unit({ traits: ['ヒト科'] })), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, rlyeh, unit({ traits: ['今を生きる人類'] })), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, rlyeh, unit({ traits: ['ヒト科以外'] })), 1);
});

test('────は有利条件を不利条件より先に判定する', () => {
  const engine = makeEngine();
  const firstMurder = unit({ name: '────', classId: 'beast' });
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ attribute: 'man' })), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ traits: ['ヒト科'] })), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ attribute: 'sky', traits: ['ヒト科'] })), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ attribute: 'sky', traits: ['ヒト科以外'] })), 0.5);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, firstMurder, unit({ attribute: 'earth', traits: ['ヒト科以外'] })), 0.5);
});

test('バフォメットは道具作成・陣地作成・悪魔に2倍有利を取る', () => {
  const engine = makeEngine();
  const baphomet = unit({ servantId: 'baphomet', name: 'バフォメット', classId: 'beast' });
  const itemConstruction = unit({ data: { passives: [{ name: '道具作成 B' }] } });
  const territoryCreation = unit({ data: { passives: [{ name: '陣地作成 EX' }] } });
  const demon = unit({ traits: ['悪魔'] });
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, itemConstruction), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, territoryCreation), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, demon), 2);
  assert.strictEqual(RULES.resolveAttackClassAffinity(engine, baphomet, unit({ traits: ['神性'] })), 1);
});

test('実ダメージ計算でも追加された公式相性倍率をA枠へ適用する', () => {
  const engine = makeEngine();
  engine.rng = () => 0.5;
  const actor = {
    ...unit({ classId: 'foreigner' }),
    atk: 10000,
    cardEnhancement: { quick: 0, arts: 0, buster: 0 },
    npLevel: 1,
    data: { np: { multipliers: [100, 100, 100, 100, 100] } }
  };
  const target = unit({ classId: 'pretender' });
  const neutralTarget = unit({ classId: 'shielder' });
  const action = { type: 'card', card: 'arts', position: 0, critical: false };
  const chain = { firstBonuses: { buster: false }, busterChain: false };
  const weakDamage = engine._calculateAttackTotal(actor, target, action, chain);
  const neutralDamage = engine._calculateAttackTotal(actor, neutralTarget, action, chain);
  assert.strictEqual(weakDamage, neutralDamage * 2);
  assert.strictEqual(actor.classId, 'foreigner');
  assert.strictEqual(target.classId, 'pretender');
});

test('外部公開classAffinityも完全版相性表を返す', () => {
  assert.strictEqual(ENGINE.classAffinity('foreigner', 'pretender'), 2);
  assert.strictEqual(ENGINE.classAffinity('pretender', 'alterEgo'), 2);
  assert.strictEqual(ENGINE.classAffinity('beast', 'saber'), 1);
});

console.log('\n完全版クラス相性テストに合格しました。');
