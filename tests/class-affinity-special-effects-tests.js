'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
const SPECIAL = require('../js/class-affinity-special-effects.js');

function makeEngine(options = {}) {
  return new BattleEngine({
    seed: 314058,
    party: [{ servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1 }],
    enemies: [{
      enabled: true,
      name: '共通相性検証敵',
      classId: options.enemyClassId || 'saber',
      attribute: 'neutral',
      traits: ['サーヴァント'],
      hp: 99999999,
      attack: 10000,
      dtdr: 1,
      deathRate: 0,
      instantDeathRate: 0,
      chargeMax: 9,
      critRate: 0,
      npTarget: 'single'
    }]
  });
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

test('共通APIと状態表示を登録する', () => {
  assert.ok(SPECIAL.npSpecialKinds.includes('status'));
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  engine._addStatus(ally, { type: 'defenseClassDisadvantageNullify', duration: 3 }, 0, '検証');
  engine._addStatus(ally, { type: 'sureHit', duration: 3 }, 0, '検証');
  const summary = engine.getStatusSummary(ally.id);
  assert.strictEqual(summary.find((status) => status.type === 'defenseClassDisadvantageNullify').name, '防御相性不利打ち消し');
  assert.strictEqual(summary.find((status) => status.type === 'sureHit').name, '必中');
});

test('防御相性不利打ち消しは被ダメージの不利倍率だけを1倍へ変更する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  ally.classId = 'lancer';
  engine.rng = () => 0.5;
  const disadvantaged = engine._enemyAttackDamage(enemy, ally, false, false);
  engine._addStatus(ally, { type: 'defenseClassDisadvantageNullify', duration: 3 }, 0, '検証');
  engine.rng = () => 0.5;
  const neutralized = engine._enemyAttackDamage(enemy, ally, false, false);
  assert.ok(disadvantaged > neutralized);
  assert.ok(Math.abs(disadvantaged - neutralized * 2) <= 1, `${disadvantaged} / ${neutralized}`);
});

test('防御相性不利打ち消しは元から防御有利な相性を変更しない', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  ally.classId = 'archer';
  engine.rng = () => 0.5;
  const before = engine._enemyAttackDamage(enemy, ally, false, false);
  engine._addStatus(ally, { type: 'defenseClassDisadvantageNullify', duration: 3 }, 0, '検証');
  engine.rng = () => 0.5;
  const after = engine._enemyAttackDamage(enemy, ally, false, false);
  assert.strictEqual(after, before);
});

test('期限切れの防御相性不利打ち消しは作用しない', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  ally.classId = 'lancer';
  const status = engine._addStatus(ally, { type: 'defenseClassDisadvantageNullify', duration: 3 }, 0, '検証');
  status.remaining = 0;
  engine.rng = () => 0.5;
  const expired = engine._enemyAttackDamage(enemy, ally, false, false);
  ally.statuses = ally.statuses.filter((entry) => entry !== status);
  engine.rng = () => 0.5;
  const normal = engine._enemyAttackDamage(enemy, ally, false, false);
  assert.strictEqual(expired, normal);
});

test('状態条件宝具特攻は指定した有効状態とOC倍率を参照する', () => {
  const engine = makeEngine();
  const target = engine.getState().enemies[0];
  const np = {
    special: {
      kind: 'status',
      key: 'poison',
      ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
    }
  };
  engine._currentNpOc = 3;
  assert.strictEqual(engine._npSpecialMultiplier(np, target), 1);
  engine._addStatus(target, { type: 'burn', duration: 5, debuff: true }, 1000, '検証');
  assert.strictEqual(engine._npSpecialMultiplier(np, target), 1);
  const poison = engine._addStatus(target, { type: 'poison', duration: 5, debuff: true }, 1000, '検証');
  assert.strictEqual(engine._npSpecialMultiplier(np, target), 1.75);
  poison.remaining = 0;
  assert.strictEqual(engine._npSpecialMultiplier(np, target), 1);
});

console.log('\n防御相性不利打ち消し・状態条件宝具特攻テストに合格しました。');
