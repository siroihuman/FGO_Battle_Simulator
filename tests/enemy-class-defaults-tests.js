'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DATA = require('../js/data.js');
const ENGINE = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/trait-trigger-aura-effects.js');
const DEFAULTS = require('../js/enemy-class-defaults.js');

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function enemy(overrides = {}) {
  return {
    enabled: true,
    name: '設定確認用エネミー',
    classId: 'archer',
    attribute: 'sky',
    traits: [],
    hp: 100000,
    attack: 1,
    dtdr: 1,
    atdr: 1,
    dsr: 0,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 3,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(enemyConfig) {
  return new ENGINE.BattleEngine({
    seed: 1,
    startingStars: 0,
    mysticCodeId: 'chaldea',
    mysticCodeLevel: 10,
    party: [{ servantId: 'inugamiGyobu', startingNp: 0 }],
    waves: [{ enabled: true, enemies: [enemyConfig] }]
  });
}

test('クラスごとの固定値表を登録する', () => {
  assert.deepStrictEqual(DEFAULTS.classDefaults('saber'), {
    chargeMax: 4, critRate: 10, dsr: 0, dtdr: 1, atdr: 1
  });
  assert.deepStrictEqual(DEFAULTS.classDefaults('archer'), {
    chargeMax: 3, critRate: 20, dsr: 5, dtdr: 1, atdr: 1
  });
  assert.deepStrictEqual(DEFAULTS.classDefaults('caster'), {
    chargeMax: 5, critRate: 10, dsr: 0, dtdr: 1.2, atdr: 1.2
  });
  assert.deepStrictEqual(DEFAULTS.classDefaults('assassin'), {
    chargeMax: 3, critRate: 30, dsr: -10, dtdr: 0.9, atdr: 0.9
  });
  assert.deepStrictEqual(DEFAULTS.classDefaults('foreigner'), {
    chargeMax: 5, critRate: 20, dsr: 20, dtdr: 1, atdr: 1
  });
  assert.strictEqual(DEFAULTS.classDefaults('beast'), null);
});

test('サーヴァント設定でサーヴァント特性を付与する', () => {
  const engine = makeEngine(enemy({ servantEnemy: true }));
  const target = engine.getState().enemies[0];
  assert.strictEqual(target.servantEnemy, true);
  assert.ok(target.traits.includes('サーヴァント'));
});

test('サーヴァント設定OFFではサーヴァント特性を除去する', () => {
  const engine = makeEngine(enemy({ servantEnemy: false, traits: ['サーヴァント', '神性'] }));
  const target = engine.getState().enemies[0];
  assert.strictEqual(target.servantEnemy, false);
  assert.ok(!target.traits.includes('サーヴァント'));
  assert.ok(target.traits.includes('神性'));
});

test('自動設定時はクラス固定値を使用する', () => {
  const engine = makeEngine(enemy({
    classId: 'caster',
    chargeManual: false,
    classStatsManual: false,
    chargeMax: 1,
    dtdr: 0.1,
    atdr: 0.1,
    dsr: 99,
    critRate: 99
  }));
  const target = engine.getState().enemies[0];
  assert.strictEqual(target.chargeMax, 5);
  assert.strictEqual(target.dtdr, 1.2);
  assert.strictEqual(target.atdr, 1.2);
  assert.strictEqual(target.dsr, 0);
  assert.strictEqual(target.critRate, 10);
});

test('手動設定時はチャージ0とクラス数値を保持する', () => {
  const engine = makeEngine(enemy({
    classId: 'archer',
    chargeManual: true,
    classStatsManual: true,
    chargeMax: 0,
    dtdr: 0.75,
    atdr: 1.25,
    dsr: 17,
    critRate: 7
  }));
  const target = engine.getState().enemies[0];
  assert.strictEqual(target.chargeMax, 0);
  assert.strictEqual(target.charge, 0);
  assert.strictEqual(target.dtdr, 0.75);
  assert.strictEqual(target.atdr, 1.25);
  assert.strictEqual(target.dsr, 17);
  assert.strictEqual(target.critRate, 7);
});

test('チャージ0の敵は宝具を使用せずチャージも増加しない', () => {
  const engine = makeEngine(enemy({
    chargeManual: true,
    classStatsManual: true,
    chargeMax: 0,
    critRate: 0,
    atdr: 1
  }));
  engine.rng = () => 0.5;
  engine._performEnemyTurn();
  const target = engine.getState().enemies[0];
  assert.strictEqual(target.charge, 0);
  assert.ok(!engine.getState().logs.some((entry) => entry.kind === 'enemyNp'));
});

test('ATDRを被ダメージ時NP獲得量へ反映する', () => {
  const engine = makeEngine(enemy({
    classId: 'caster',
    chargeManual: true,
    classStatsManual: true,
    chargeMax: 5,
    critRate: 0,
    atdr: 1.2
  }));
  engine.rng = () => 0.5;
  const ally = engine.getAliveAllies()[0];
  ally.np = 0;
  engine._performEnemyTurn();
  assert.strictEqual(ally.np, 3.6);
});

test('ウェーブ設定UIと戦闘画面チャージ表示を登録する', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/enemy-class-defaults.js'), 'utf8');
  assert.ok(source.includes("'servant'"));
  assert.ok(source.includes("'chargeManual'"));
  assert.ok(source.includes("'statsManual'"));
  assert.ok(source.includes("'dsr'"));
  assert.ok(source.includes("'atdr'"));
  assert.ok(source.includes("className = 'enemy-charge-line'"));
  assert.ok(source.includes("<strong>OFF</strong>"));
  assert.ok(source.includes("enemy.chargeMax > 0 && enemy.charge >= enemy.chargeMax"));
});

test('相性タイムラインはチャージ0を宝具扱いしない', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/turn-action-timeline.js'), 'utf8');
  assert.ok(source.includes("actor.chargeMax > 0 && actor.charge >= actor.chargeMax"));
  assert.ok(source.includes("context.isNp"));
});

console.log('\nエネミーのサーヴァント・クラス固定値テストに合格しました。');
