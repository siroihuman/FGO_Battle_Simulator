'use strict';

const assert = require('assert');
require('../js/data.js');
require('../js/servants.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
const EFFECTS = require('../js/lethal-damage-evasion-effects.js');

function enemy() {
  return {
    enabled: true,
    name: '攻撃者',
    classId: 'saber',
    attribute: 'man',
    traits: ['サーヴァント'],
    hp: 100000,
    attack: 10000,
    dtdr: 1,
    deathRate: 0,
    chargeMax: 3,
    critRate: 0
  };
}

function makeEngine() {
  return new BattleEngine({
    seed: 1,
    party: [{ servantId: 'fenrir', skillLevel: 10 }],
    enemies: [enemy()],
    startingStars: 0
  });
}

{
  const engine = makeEngine();
  const unit = engine.getState().allies[0];
  const attacker = engine.getState().enemies[0];
  unit.hp = 1000;
  engine._addStatus(unit, { type: 'deathEvasion', duration: 1, uses: 1 }, 1, 'test');
  engine.__lethalDamageAttackContext = { attacker, action: { type: 'card' }, singleUse: true };
  const result = engine._takeDamage(unit, 999, attacker.name);
  assert.strictEqual(result.deathEvasion, undefined, '非致死ダメージでは発動しない');
  assert.strictEqual(unit.hp, 1);
  assert.strictEqual(EFFECTS.activeDeathEvasion(unit).uses, 1, '非致死ダメージでは回数を消費しない');
}

{
  const engine = makeEngine();
  const unit = engine.getState().allies[0];
  const attacker = engine.getState().enemies[0];
  unit.hp = 1000;
  engine._addStatus(unit, { type: 'deathEvasion', duration: 1, uses: 1 }, 1, 'test');
  engine.__lethalDamageAttackContext = { attacker, action: { type: 'card' }, singleUse: true };
  const result = engine._takeDamage(unit, 1000, attacker.name);
  assert.strictEqual(result.deathEvasion, true, '致死ダメージだけを回避する');
  assert.strictEqual(unit.hp, 1000);
  assert.strictEqual(unit.alive, true);
  assert.strictEqual(EFFECTS.activeDeathEvasion(unit), null, '発動時だけ回数を消費する');
}

['sureHit', 'invinciblePierce'].forEach((bypassType) => {
  const engine = makeEngine();
  const unit = engine.getState().allies[0];
  const attacker = engine.getState().enemies[0];
  unit.hp = 1000;
  engine._addStatus(unit, { type: 'deathEvasion', duration: 1, uses: 1 }, 1, 'test');
  engine._addStatus(attacker, { type: bypassType, duration: 1 }, 1, 'test');
  engine.__lethalDamageAttackContext = { attacker, action: { type: 'card' }, singleUse: true };
  engine._takeDamage(unit, 1000, attacker.name);
  assert.strictEqual(unit.alive, false, `${bypassType}は致死ダメージ回避を無効化する`);
  assert.ok(EFFECTS.activeDeathEvasion(unit), `${bypassType}で無効化された場合は回数を消費しない`);
});

{
  const engine = makeEngine();
  const unit = engine.getState().allies[0];
  const attacker = engine.getState().enemies[0];
  engine._addStatus(unit, { type: 'deathEvasion', duration: 1, uses: 1 }, 1, 'test');
  attacker.instantDeathRate = 100000;
  unit.data.deathRate = 100;
  engine.rng = () => 0;
  engine._applyInstantDeath(attacker, unit);
  assert.strictEqual(unit.alive, false, '即死は致死ダメージ回避の対象外');
  assert.ok(EFFECTS.activeDeathEvasion(unit), '即死では回数を消費しない');
}

assert.strictEqual(EFFECTS.type, 'deathEvasion');
console.log('Lethal damage evasion effects tests passed.');
