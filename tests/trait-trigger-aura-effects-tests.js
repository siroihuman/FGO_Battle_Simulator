'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/card-buff-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/hp-loss-effects.js');
require('../js/turn-field-effects.js');
const TRAIT = require('../js/trait-trigger-aura-effects.js');
require('../js/trigger-lifecycle-effects.js');

function enemyConfig(overrides = {}) {
  return {
    enabled: true,
    name: '共通基盤検証敵',
    classId: 'rider',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 99999999,
    attack: 10000,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 9,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(options = {}) {
  return new BattleEngine({
    seed: 314058,
    party: options.party || [
      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1 },
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 },
      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1 }
    ],
    enemies: [enemyConfig(options.enemy)]
  });
}

function chainContext() {
  return {
    firstBonuses: { buster: false, arts: false, quick: false },
    busterChain: false,
    artsChain: false,
    quickChain: false,
    mighty: false
  };
}

function addStatus(engine, unit, effect, value = 0) {
  return engine._addStatus(unit, effect, value, '検証');
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

test('一時特性はhasTraitへ反映され恒久traitsへ残らない', () => {
  const engine = makeEngine();
  const source = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine._applyEffect({
    type: 'temporaryTrait', target: 'selectedEnemy', trait: 'チェック', duration: 1, debuff: true
  }, source, enemy.id, {});
  assert.strictEqual(engine.hasTrait(enemy, 'チェック'), true);
  assert.strictEqual(enemy.traits.includes('チェック'), false);
  assert.strictEqual(engine.countStatusStacks(enemy, { type: 'temporaryTrait', trait: 'チェック' }), 1);
  const summary = engine.getStatusSummary(enemy.id).find((status) => status.type === 'temporaryTrait');
  assert.strictEqual(summary.name, '〔チェック〕特性');
  assert.strictEqual(summary.statusIcon, 'Dragontrait.webp');
  assert.strictEqual(summary.remaining, 1);
});

test('特性付与系状態はすべてDragontrait.webpを使用する', () => {
  ['temporaryTrait', 'beforeAttackApplyTemporaryTrait', 'addTrait', 'onAttackAddTrait']
    .forEach((type) => assert.strictEqual(DATA.statusIcons[type], 'Dragontrait.webp'));
});

test('一時特性は弱体解除とターン経過で消える', () => {
  const engine = makeEngine();
  const source = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const effect = { type: 'temporaryTrait', target: 'selectedEnemy', trait: 'チェック', duration: 1, debuff: true };
  engine._applyEffect(effect, source, enemy.id, {});
  engine._applyEffect({ type: 'debuffClear', target: 'selectedEnemy' }, source, enemy.id, {});
  assert.strictEqual(engine.hasTrait(enemy, 'チェック'), false);
  engine._applyEffect(effect, source, enemy.id, {});
  engine._finishTurn();
  assert.strictEqual(engine.hasTrait(enemy, 'チェック'), false);
});

test('強化扱いの一時特性は強化解除で消える', () => {
  const engine = makeEngine();
  const source = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  engine._applyEffect({ type: 'temporaryTrait', target: 'selectedAlly', trait: '不思議の国の住人', duration: 3 }, source, ally.id, {});
  assert.strictEqual(engine.hasTrait(ally, '不思議の国の住人'), true);
  engine._applyEffect({ type: 'buffClear', target: 'selectedAlly' }, source, ally.id, {});
  assert.strictEqual(engine.hasTrait(ally, '不思議の国の住人'), false);
});

test('特性条件を満たす味方だけNPが増加する', () => {
  const engine = makeEngine();
  const source = engine.getState().allies[0];
  const front = engine.getState().allies[1];
  const reserve = engine.getState().allies[3];
  addStatus(engine, front, { type: 'temporaryTrait', trait: '不思議の国の住人', duration: 3 });
  addStatus(engine, reserve, { type: 'temporaryTrait', trait: '不思議の国の住人', duration: 3 });
  engine._applyEffect({
    type: 'npCharge',
    target: 'allAlliesIncludingReserve',
    value: 30,
    condition: { kind: 'targetHasTrait', key: '不思議の国の住人' }
  }, source, source.id, {});
  assert.strictEqual(source.np, 0);
  assert.strictEqual(front.np, 30);
  assert.strictEqual(engine.getState().allies[2].np, 0);
  assert.strictEqual(reserve.np, 30);
});

test('allOtherAlliesは使用者を除外し控えを含まない', () => {
  const engine = makeEngine();
  const source = engine.getState().allies[0];
  engine._applyEffect({
    type: 'temporaryTrait', target: 'allOtherAllies', trait: '不思議の国の住人', duration: 1
  }, source, source.id, {});
  assert.strictEqual(engine.hasTrait(source, '不思議の国の住人'), false);
  assert.strictEqual(engine.hasTrait(engine.getState().allies[1], '不思議の国の住人'), true);
  assert.strictEqual(engine.hasTrait(engine.getState().allies[2], '不思議の国の住人'), true);
  assert.strictEqual(engine.hasTrait(engine.getState().allies[3], '不思議の国の住人'), false);
});

test('攻撃前特性付与が同じ攻撃の特攻へ反映される', () => {
  const baseline = makeEngine();
  const baseActor = baseline.getState().allies[1];
  const baseEnemy = baseline.getState().enemies[0];
  addStatus(baseline, baseActor, { type: 'traitPowerUp', trait: '虚構概念', duration: 3 }, 100);
  baseline.rng = () => 0.5;
  const baseResult = baseline._resolveAttackOnTarget(
    baseActor, baseEnemy,
    { type: 'card', card: 'buster', position: 0, critical: false },
    chainContext()
  );

  const engine = makeEngine();
  const actor = engine.getState().allies[1];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, actor, { type: 'traitPowerUp', trait: '虚構概念', duration: 3 }, 100);
  engine._applyEffect({
    type: 'beforeAttackApplyTemporaryTrait', target: 'self', trait: '虚構概念',
    chance: 100, duration: 1, sourceDuration: 3
  }, actor, actor.id, {});
  engine.rng = () => 0.5;
  const result = engine._resolveAttackOnTarget(
    actor, enemy,
    { type: 'card', card: 'buster', position: 0, critical: false },
    chainContext()
  );
  assert.strictEqual(engine.hasTrait(enemy, '虚構概念'), true);
  assert.ok(result.damage > baseResult.damage * 1.9);
});

test('攻撃前特性付与は通常攻撃・宝具・Extra Attackで発動する', () => {
  ['card', 'np', 'extra'].forEach((type) => {
    const engine = makeEngine();
    const actor = engine.getState().allies[1];
    const enemy = engine.getState().enemies[0];
    engine._applyEffect({
      type: 'beforeAttackApplyTemporaryTrait', target: 'self', trait: '虚構概念',
      chance: 100, duration: 1, sourceDuration: 3
    }, actor, actor.id, {});
    const action = type === 'card'
      ? { type, card: 'quick', position: 0, critical: false }
      : type === 'np'
        ? { type, card: actor.data.np.card, position: 0, critical: false }
        : { type, card: 'extra', position: 0, critical: false, extraBonus: 2 };
    engine.rng = () => 0.5;
    engine._resolveAttackOnTarget(actor, enemy, action, chainContext());
    assert.strictEqual(engine.hasTrait(enemy, '虚構概念'), true, type);
  });
});

test('攻撃後条件トリガーが対象特性を参照して状態を付与する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, enemy, { type: 'temporaryTrait', trait: 'チェック', duration: 3, debuff: true });
  engine._applyEffect({
    type: 'triggerEffect', target: 'self', event: 'afterAttack', duration: 3,
    condition: { kind: 'targetHasTrait', key: 'チェック' },
    effect: { type: 'temporaryTrait', target: 'self', trait: 'チェックメイト', duration: 3 }
  }, actor, actor.id, {});
  engine.rng = () => 0.5;
  engine._resolveAttackOnTarget(actor, enemy, { type: 'card', card: 'arts', position: 0, critical: false }, chainContext());
  assert.strictEqual(engine.countStatusStacks(actor, { type: 'temporaryTrait', trait: 'チェックメイト' }), 1);
});

test('ターン開始トリガーはuses回だけ発動する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine._applyEffect({
    type: 'triggerEffect', target: 'self', event: 'turnStart', uses: 2, duration: 3,
    effect: { type: 'temporaryTrait', target: 'allEnemies', trait: 'チェック', duration: 1, debuff: true }
  }, actor, actor.id, {});
  const trigger = actor.statuses.find((status) => status.type === 'triggerEffect');
  engine._finishTurn();
  assert.strictEqual(engine.hasTrait(enemy, 'チェック'), true);
  assert.strictEqual(trigger.uses, 1);
  engine._finishTurn();
  assert.strictEqual(engine.hasTrait(enemy, 'チェック'), true);
  assert.strictEqual(actor.statuses.includes(trigger), false);
  engine._finishTurn();
  assert.strictEqual(engine.hasTrait(enemy, 'チェック'), false);
});

test('遅延resolverは指定ターンにスタック数を参照して1回だけ発動する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  for (let index = 0; index < 3; index += 1) {
    addStatus(engine, actor, { type: 'temporaryTrait', trait: 'チェックメイト', duration: 5 });
  }
  let calls = 0;
  TRAIT.registerDelayedResolver('testChessResolver', (battle, context) => {
    calls += 1;
    const stacks = battle.countStatusStacks(context.owner, { type: 'temporaryTrait', trait: 'チェックメイト' });
    return [
      { type: 'traitPowerUp', target: 'self', trait: '赤のチェスピース', value: stacks * 10, duration: 3 },
      { type: 'temporaryTrait', target: 'allEnemies', trait: '赤のチェスピース', duration: 3, debuff: true }
    ];
  });
  engine._applyEffect({
    type: 'delayedEffect', target: 'self', delayTurns: 2, resolver: 'testChessResolver'
  }, actor, actor.id, {});
  engine._finishTurn();
  assert.strictEqual(calls, 0);
  engine._finishTurn();
  assert.strictEqual(calls, 1);
  assert.strictEqual(engine._statusTotal(actor, 'traitPowerUp', { trait: '赤のチェスピース' }), 30);
  assert.strictEqual(engine.hasTrait(enemy, '赤のチェスピース'), true);
  assert.strictEqual(actor.statuses.some((status) => status.type === 'delayedEffect'), false);
  engine._finishTurn();
  assert.strictEqual(calls, 1);
});

test('虚構概念対象へのNP獲得オーラは他の味方にも働き非対象では働かない', () => {
  const engine = makeEngine();
  const provider = engine.getState().allies[0];
  const actor = engine.getState().allies[1];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, provider, {
    type: 'aura', modifierType: 'npGainUp', target: 'allAllies', value: 15,
    condition: { kind: 'targetHasTrait', key: '虚構概念' }, conditionTarget: 'attackTarget'
  }, 15);
  addStatus(engine, enemy, { type: 'temporaryTrait', trait: '虚構概念', duration: 3 });
  const action = { type: 'card', card: 'arts', position: 0, critical: false };
  const withAura = engine._cardNpPerHit(actor, enemy, action, chainContext(), false);
  provider.alive = false;
  const withoutProvider = engine._cardNpPerHit(actor, enemy, action, chainContext(), false);
  provider.alive = true;
  enemy.statuses = enemy.statuses.filter((status) => status.type !== 'temporaryTrait');
  const withoutTrait = engine._cardNpPerHit(actor, enemy, action, chainContext(), false);
  assert.ok(withAura > withoutProvider);
  assert.strictEqual(withoutTrait, withoutProvider);
});

test('虚構概念の敵だけ攻撃力ダウンオーラを受け提供者戦闘不能後は停止する', () => {
  const engine = makeEngine();
  const provider = engine.getState().allies[0];
  const ally = engine.getState().allies[1];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, provider, {
    type: 'aura', modifierType: 'attackUp', target: 'allEnemies', value: -15,
    condition: { kind: 'targetHasTrait', key: '虚構概念' }
  }, -15);
  addStatus(engine, enemy, { type: 'temporaryTrait', trait: '虚構概念', duration: 3 });
  engine.rng = () => 0.5;
  const reduced = engine._enemyAttackDamage(enemy, ally, false, false);
  provider.alive = false;
  engine.rng = () => 0.5;
  const normal = engine._enemyAttackDamage(enemy, ally, false, false);
  assert.ok(reduced < normal);
  assert.ok(Math.abs(reduced - Math.floor(normal * 0.85)) <= 2);
});

test('控えを含む他の味方への弱体耐性ダウンオーラは動的に加算される', () => {
  const engine = makeEngine();
  const provider = engine.getState().allies[0];
  const reserve = engine.getState().allies[3];
  const providerBase = engine._statusTotal(provider, 'debuffResist');
  const reserveBase = engine._statusTotal(reserve, 'debuffResist');
  addStatus(engine, provider, {
    type: 'aura', modifierType: 'debuffResist', target: 'allOtherAlliesIncludingReserve', value: -15
  }, -15);
  addStatus(engine, provider, {
    type: 'aura', modifierType: 'debuffResist', target: 'allOtherAlliesIncludingReserve', value: -15
  }, -15);
  assert.strictEqual(engine._statusTotal(provider, 'debuffResist'), providerBase);
  assert.strictEqual(engine._statusTotal(reserve, 'debuffResist'), reserveBase - 30);
  provider.frontline = false;
  assert.strictEqual(engine._statusTotal(reserve, 'debuffResist'), reserveBase);
});

console.log('\n一時特性・条件対象・トリガー・常時オーラテストに合格しました。');
