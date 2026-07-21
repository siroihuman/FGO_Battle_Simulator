'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/turn-field-effects.js');
const TRAIT = require('../js/trait-trigger-aura-effects.js');
require('../js/trigger-lifecycle-effects.js');
const SHARED = require('../js/np-card-trigger-removal-effects.js');

const chainContext = {
  firstBonuses: { buster: false, arts: false, quick: false },
  busterChain: false,
  artsChain: false,
  quickChain: false,
  mighty: false
};

function makeEngine() {
  const engine = new BattleEngine({
    seed: 314058,
    party: [{ servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 100 }],
    enemies: [{
      enabled: true,
      name: '共通処理検証敵',
      classId: 'rider',
      attribute: 'sky',
      traits: ['サーヴァント'],
      hp: 99999999,
      attack: 1,
      dtdr: 1,
      deathRate: 0,
      instantDeathRate: 0,
      chargeMax: 9,
      critRate: 0,
      npTarget: 'single'
    }]
  });
  engine.rng = () => 0;
  return engine;
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

test('共通APIとafterNpイベントを登録する', () => {
  assert.ok(SHARED.validCards.includes('buster'));
  assert.strictEqual(SHARED.npCardPriority, 'lastAppliedActiveStatusWins');
  assert.ok(TRAIT.triggerEvents.includes('afterNp'));
});

test('宝具カード変更は表示参照と選択アクションへ反映し、最後の付与を優先する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const baseCard = engine.getBaseNpCard(actor);

  engine._applyEffect({
    type: 'npCardTypeChange', target: 'self', card: 'buster', duration: 1
  }, actor, actor.id, {});
  assert.strictEqual(actor.data.np.card, 'buster');
  assert.strictEqual(engine.toggleNp(actor.id), true);
  assert.strictEqual(engine.getState().selectedActions[0].card, 'buster');

  engine._applyEffect({
    type: 'npCardTypeChange', target: 'self', card: 'quick', duration: 1
  }, actor, actor.id, {});
  assert.strictEqual(actor.data.np.card, 'quick');
  engine.refreshSelectedNpCards();
  assert.strictEqual(engine.getState().selectedActions[0].card, 'quick');

  engine._removeExpiredStatuses(actor);
  assert.strictEqual(actor.data.np.card, baseCard);
  assert.strictEqual(actor.data.np.__baseNpCard, baseCard);
});

test('変更後の宝具カードが宝具ダメージ・NP・スター計算へ渡される', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  engine._applyEffect({
    type: 'npCardTypeChange', target: 'self', card: 'buster', duration: 1
  }, actor, actor.id, {});
  actor.np = 100;
  actor.data.np.before = [];
  actor.data.np.after = [];

  let capturedCard = null;
  engine._resolveAttackOnTarget = (source, target, action) => {
    capturedCard = action.card;
    return { damage: 0, actualHpDamage: 0, np: 0, stars: 0 };
  };
  engine._executeNp({ type: 'np', actorId: actor.id, card: engine.getBaseNpCard(actor) }, chainContext, 0);
  assert.strictEqual(capturedCard, 'buster');
});

test('afterNpは宝具固有後効果の後に発火し、付与時スキルLvを引き継ぐ', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  actor.data.np.target = 'support';
  actor.data.np.before = [];
  actor.data.np.after = [{ type: 'npCharge', target: 'self', value: 10 }];
  actor.np = 100;

  engine._applyEffect({
    type: 'triggerEffect',
    target: 'self',
    event: 'afterNp',
    uses: 1,
    duration: 1,
    effects: [
      { type: 'npScaleUp', target: 'self', value: 100 },
      { type: 'critUp', target: 'self', values: [1,2,3,4,5,6,7,8,9,10], duration: 3 },
      { type: 'stars', target: 'party', values: [1,2,3,4,5,6,7,8,9,10] }
    ]
  }, actor, actor.id, { level: 4 });

  engine._executeNp({ type: 'np', actorId: actor.id, card: actor.data.np.card }, chainContext, 0);
  assert.strictEqual(actor.np, 20);
  assert.strictEqual(engine.getState().stars, 4);
  assert.strictEqual(actor.statuses.find((status) => status.type === 'critUp').value, 4);
  assert.strictEqual(actor.statuses.some((status) => status.type === 'triggerEffect'), false);
});

test('afterNpは攻撃宝具でも発火する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  actor.data.np.target = 'singleEnemy';
  actor.data.np.before = [];
  actor.data.np.after = [];
  actor.cooldowns = actor.cooldowns.map(() => 5);
  actor.np = 100;

  engine._applyEffect({
    type: 'triggerEffect', target: 'self', event: 'afterNp', uses: 1, duration: 1,
    effect: { type: 'cooldownReduce', target: 'self', value: 1 }
  }, actor, actor.id, { level: 10 });
  engine._executeNp({ type: 'np', actorId: actor.id, card: actor.data.np.card }, chainContext, 0);
  assert.ok(actor.cooldowns.every((ct) => ct === 4));
});

test('NP不足で宝具が未発動の場合はafterNpの回数を消費しない', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  actor.np = 99;
  engine._applyEffect({
    type: 'triggerEffect', target: 'self', event: 'afterNp', uses: 1, duration: 1,
    effect: { type: 'stars', target: 'party', value: 10 }
  }, actor, actor.id, {});
  engine._executeNp({ type: 'np', actorId: actor.id, card: actor.data.np.card }, chainContext, 0);
  const trigger = actor.statuses.find((status) => status.type === 'triggerEffect');
  assert.ok(trigger);
  assert.strictEqual(trigger.uses, 1);
  assert.strictEqual(engine.getState().stars, 0);
});

test('npScaleUpは現在NPを割合増加し、300%を上限とする', () => {
  const cases = [
    [0, 100, 0],
    [50, 50, 75],
    [100, 100, 200],
    [200, 100, 300],
    [300, 100, 300]
  ];
  for (const [before, value, expected] of cases) {
    const engine = makeEngine();
    const actor = engine.getState().allies[0];
    actor.np = before;
    engine._applyEffect({ type: 'npScaleUp', target: 'self', value }, actor, actor.id, {});
    assert.strictEqual(actor.np, expected, `NP ${before}% / value ${value}%`);
  }
});

test('npScaleUpはLv別値と既存の小数処理を使用する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  actor.np = 33.33;
  engine._applyEffect({
    type: 'npScaleUp', target: 'self', values: [50,55,60,65,70,75,80,85,90,100]
  }, actor, actor.id, { level: 1 });
  assert.strictEqual(actor.np, 49.99);
});

test('強化解除耐性100%は強化解除を1回阻止し、成功時だけ消費する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  engine._applyEffect({ type: 'attackUp', target: 'self', value: 30, duration: 3 }, actor, actor.id, {});
  engine._applyEffect({
    type: 'buffRemovalResist', target: 'self', value: 100, uses: 1, duration: 3
  }, actor, actor.id, {});

  engine._applyEffect({ type: 'buffClear', target: 'self' }, actor, actor.id, {});
  assert.ok(actor.statuses.some((status) => status.type === 'attackUp'));
  assert.strictEqual(actor.statuses.some((status) => status.type === 'buffRemovalResist'), false);

  engine._applyEffect({ type: 'buffClear', target: 'self' }, actor, actor.id, {});
  assert.strictEqual(actor.statuses.some((status) => status.type === 'attackUp'), false);
});

test('複数の強化解除耐性は残りターンが短いものから判定する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  engine._applyEffect({ type: 'attackUp', target: 'self', value: 30, duration: 3 }, actor, actor.id, {});
  engine._applyEffect({
    type: 'buffRemovalResist', target: 'self', value: 0, uses: 1, duration: 3
  }, actor, actor.id, {});
  engine._applyEffect({
    type: 'buffRemovalResist', target: 'self', value: 100, uses: 1, duration: 1
  }, actor, actor.id, {});

  const order = engine._buffRemovalResistStatuses(actor);
  assert.strictEqual(order[0].remaining, 1);
  engine._applyEffect({ type: 'buffClear', target: 'self' }, actor, actor.id, {});
  assert.ok(actor.statuses.some((status) => status.type === 'attackUp'));
  assert.ok(actor.statuses.some((status) => status.type === 'buffRemovalResist' && status.remaining === 3));
});

test('強化解除耐性は弱体解除へ影響しない', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  engine._addStatus(actor, { type: 'poison', duration: 3, debuff: true }, 500, '検証');
  engine._applyEffect({
    type: 'buffRemovalResist', target: 'self', value: 100, uses: 1, duration: 3
  }, actor, actor.id, {});

  engine._applyEffect({ type: 'debuffClear', target: 'self' }, actor, actor.id, {});
  assert.strictEqual(actor.statuses.some((status) => status.type === 'poison'), false);
  const resistance = actor.statuses.find((status) => status.type === 'buffRemovalResist');
  assert.ok(resistance);
  assert.strictEqual(resistance.uses, 1);
});

console.log('\nIssue #26 共通宝具・強化解除処理テストに合格しました。');