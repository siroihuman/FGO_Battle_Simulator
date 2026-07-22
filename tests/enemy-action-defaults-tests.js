'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ENGINE = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/enemy-class-defaults.js');
const ACTIONS = require('../js/enemy-action-defaults.js');

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function enemy(classId, overrides = {}) {
  return {
    enabled: true,
    name: classId,
    classId,
    attribute: 'neutral',
    traits: [],
    hp: 100000,
    attack: 1,
    deathRate: 0,
    chargeMax: 5,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(enemies) {
  return new ENGINE.BattleEngine({
    seed: 1,
    party: [{ servantId: 'inugamiGyobu', startingNp: 0 }],
    waves: [{ enabled: true, enemies }]
  });
}

test('クラスごとの行動回数と行動優先度を登録する', () => {
  assert.deepStrictEqual(ACTIONS.actionDefaults('saber'), { actionCount: 3, actionPriority: 50 });
  assert.deepStrictEqual(ACTIONS.actionDefaults('caster'), { actionCount: 2, actionPriority: 25 });
  assert.deepStrictEqual(ACTIONS.actionDefaults('berserker'), { actionCount: 2, actionPriority: 50 });
  assert.deepStrictEqual(ACTIONS.actionDefaults('avenger'), { actionCount: 3, actionPriority: 200 });
  assert.deepStrictEqual(ACTIONS.actionDefaults('moonCancer'), { actionCount: 3, actionPriority: 20 });
  assert.strictEqual(ACTIONS.actionDefaults('beast'), null);
  assert.strictEqual(ACTIONS.partyActionLimit, 3);
});

test('各敵が1回行動した後は優先度の高い敵へ残り枠を割り当てる', () => {
  const engine = makeEngine([
    enemy('caster', { name: 'キャスター' }),
    enemy('avenger', { name: 'アヴェンジャー' })
  ]);
  assert.deepStrictEqual(
    engine._enemyActionOrder().map((unit) => unit.name),
    ['キャスター', 'アヴェンジャー', 'アヴェンジャー']
  );
});

test('単体キャスターはクラス上限により2回まで行動する', () => {
  const engine = makeEngine([enemy('caster', { name: 'キャスター' })]);
  assert.deepStrictEqual(
    engine._enemyActionOrder().map((unit) => unit.name),
    ['キャスター', 'キャスター']
  );
});

test('同じ優先度では左側の敵を優先する', () => {
  const engine = makeEngine([
    enemy('saber', { name: '左セイバー' }),
    enemy('archer', { name: '右アーチャー' })
  ]);
  assert.deepStrictEqual(
    engine._enemyActionOrder().map((unit) => unit.name),
    ['左セイバー', '右アーチャー', '左セイバー']
  );
});

test('クラス数値設定ONでは行動回数と優先度を手動設定できる', () => {
  const engine = makeEngine([
    enemy('saber', {
      name: '手動セイバー',
      classStatsManual: true,
      actionCount: 1,
      actionPriority: 999
    }),
    enemy('caster', {
      name: '手動キャスター',
      classStatsManual: true,
      actionCount: 3,
      actionPriority: 1
    })
  ]);
  const [saber, caster] = engine.getState().enemies;
  assert.strictEqual(saber.actionCount, 1);
  assert.strictEqual(saber.actionPriority, 999);
  assert.strictEqual(caster.actionCount, 3);
  assert.deepStrictEqual(
    engine._enemyActionOrder().map((unit) => unit.name),
    ['手動セイバー', '手動キャスター', '手動キャスター']
  );
});

test('行動回数0の敵は行動しない', () => {
  const engine = makeEngine([
    enemy('beast', {
      name: '行動停止ビースト',
      classStatsManual: true,
      actionCount: 0,
      actionPriority: 999
    })
  ]);
  assert.deepStrictEqual(engine._enemyActionOrder(), []);
});

test('ウェーブ設定UIへ行動回数と行動優先度を追加する', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/enemy-action-defaults.js'), 'utf8');
  assert.ok(source.includes("'ac', '行動回数'"));
  assert.ok(source.includes("'ap', '行動優先度'"));
  assert.ok(source.includes("control(waveIndex, enemyIndex, 'statsManual')"));
  assert.ok(source.includes('敵全体では1ターン最大3回'));
});

test('行動相性モジュールを他の敵設定より後、タイムラインより前に読み込む', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.includes('js/enemy-action-defaults.js'));
  assert.ok(html.indexOf('js/enemy-action-defaults.js') > html.indexOf('js/enemy-class-defaults.js'));
  assert.ok(html.indexOf('js/enemy-action-defaults.js') < html.indexOf('js/turn-action-timeline.js'));
});

console.log('\nエネミーのクラス別行動回数・優先度テストに合格しました。');
