'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ENGINE = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/trigger-lifecycle-effects.js');
require('../js/enemy-class-defaults.js');
require('../js/enemy-action-defaults.js');
const RUNTIME = require('../js/enemy-turn-charge-reserve-status.js');
const BattleEngine = ENGINE.BattleEngine;

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
    name: 'チャージ確認用エネミー',
    classId: 'archer',
    attribute: 'neutral',
    traits: [],
    hp: 999999,
    attack: 1,
    dtdr: 1,
    atdr: 1,
    dsr: 0,
    deathRate: 0,
    instantDeathRate: 0,
    chargeManual: true,
    classStatsManual: true,
    chargeMax: 5,
    startingCharge: 0,
    critRate: 0,
    actionCount: 3,
    actionPriority: 50,
    npTarget: 'single',
    ...overrides
  };
}

function party(count = 3) {
  return Array.from({ length: count }, () => ({
    servantId: 'inugamiGyobu',
    startingNp: 0,
    skillLevel: 10,
    npLevel: 1
  }));
}

function makeEngine(enemies, partyCount = 3) {
  const engine = new BattleEngine({
    seed: 1,
    party: party(partyCount),
    waves: [{ enabled: true, enemies }]
  });
  engine.rng = () => 0.5;
  return engine;
}

test('敵が3回行動してもチャージは1ターンに1だけ増加する', () => {
  const engine = makeEngine([enemy({ actionCount: 3 })]);
  const target = engine.getState().enemies[0];
  engine._performEnemyTurn();
  assert.strictEqual(target.charge, 1);
});

test('行動回数0でもチャージはターン単位で1増加する', () => {
  const engine = makeEngine([enemy({ actionCount: 0, startingCharge: 1 })]);
  const target = engine.getState().enemies[0];
  engine._performEnemyTurn();
  assert.strictEqual(target.charge, 2);
});

test('各エネミーのチャージは行動回数に関係なく個別に1増加する', () => {
  const engine = makeEngine([
    enemy({ name: '敵A', actionCount: 2, startingCharge: 0 }),
    enemy({ name: '敵B', actionCount: 1, startingCharge: 2 })
  ]);
  const [enemyA, enemyB] = engine.getState().enemies;
  engine._performEnemyTurn();
  assert.strictEqual(enemyA.charge, 1);
  assert.strictEqual(enemyB.charge, 3);
});

test('宝具封印中は満タンでも宝具を使わずチャージも増加しない', () => {
  const engine = makeEngine([enemy({ chargeMax: 3, startingCharge: 3, actionCount: 3 })]);
  const target = engine.getState().enemies[0];
  target.statuses.push({
    type: 'npSeal',
    remaining: 1,
    uses: null,
    debuff: true,
    source: 'テスト宝具封印'
  });

  engine._performEnemyTurn();
  assert.strictEqual(target.charge, 3);
  assert.ok(!engine.getState().logs.some((entry) => entry.kind === 'enemyNp'));
  assert.ok(!target.statuses.some((status) => status.type === 'npSeal'));
});

test('宝具封印解除後は満タンの敵が次ターンに宝具を使用する', () => {
  const engine = makeEngine([enemy({ chargeMax: 3, startingCharge: 3, actionCount: 2 })]);
  const target = engine.getState().enemies[0];
  target.statuses.push({ type: 'npSeal', remaining: 1, uses: null, debuff: true });

  engine._performEnemyTurn();
  const logCountBefore = engine.getState().logs.filter((entry) => entry.kind === 'enemyNp').length;
  engine._performEnemyTurn();
  const logCountAfter = engine.getState().logs.filter((entry) => entry.kind === 'enemyNp').length;

  assert.strictEqual(logCountBefore, 0);
  assert.strictEqual(logCountAfter, 1);
  assert.strictEqual(target.charge, 0);
});

test('チャージ0の敵は増加せず宝具も使用しない', () => {
  const engine = makeEngine([enemy({ chargeMax: 0, startingCharge: 0, actionCount: 3 })]);
  const target = engine.getState().enemies[0];
  engine._performEnemyTurn();
  assert.strictEqual(target.charge, 0);
  assert.ok(!engine.getState().logs.some((entry) => entry.kind === 'enemyNp'));
});

test('控えサーヴァントの強化・弱体の残りターンは減少しない', () => {
  const engine = makeEngine([enemy({ actionCount: 0 })], 4);
  const frontline = engine.getState().allies[0];
  const reserve = engine.getState().allies[3];
  assert.strictEqual(frontline.frontline, true);
  assert.strictEqual(reserve.frontline, false);

  frontline.statuses.push(
    { type: 'attackUp', value: 10, remaining: 3, uses: null, debuff: false },
    { type: 'defenseDown', value: 10, remaining: 3, uses: null, debuff: true }
  );
  reserve.statuses.push(
    { type: 'attackUp', value: 10, remaining: 3, uses: null, debuff: false },
    { type: 'defenseDown', value: 10, remaining: 3, uses: null, debuff: true }
  );

  engine._finishTurn();

  assert.deepStrictEqual(frontline.statuses.map((status) => status.remaining), [2, 2]);
  assert.deepStrictEqual(reserve.statuses.map((status) => status.remaining), [3, 3]);
});

test('控えから前衛へ出た後は状態の残りターンが減少する', () => {
  const engine = makeEngine([enemy({ actionCount: 0 })], 4);
  const reserve = engine.getState().allies[3];
  reserve.statuses.push({ type: 'attackUp', value: 10, remaining: 3, uses: null, debuff: false });

  engine._removeExpiredStatuses(reserve);
  assert.strictEqual(reserve.statuses[0].remaining, 3);

  reserve.frontline = true;
  engine._removeExpiredStatuses(reserve);
  assert.strictEqual(reserve.statuses[0].remaining, 2);
});

test('ランタイムが宝具封印と控え状態を明示的に判定する', () => {
  assert.strictEqual(RUNTIME.npSealStatusType, 'npSeal');
  assert.strictEqual(RUNTIME.chargeIndependentOfActionCount, true);
  assert.strictEqual(RUNTIME.chargeBlockedByNpSeal, true);
  assert.strictEqual(RUNTIME.reserveStatusDurationFrozen, true);

  const source = fs.readFileSync(path.join(__dirname, '../js/enemy-turn-charge-reserve-status.js'), 'utf8');
  assert.ok(source.includes("status.type === type"));
  assert.ok(source.includes("unit.frontline === false"));
  assert.ok(source.includes('_advanceEnemyChargeOncePerTurn'));
  assert.ok(source.includes("!this._isEnemyNpSealed(enemy)"));
});

console.log('\n敵チャージ・控え状態ターン停止テストに合格しました。');
