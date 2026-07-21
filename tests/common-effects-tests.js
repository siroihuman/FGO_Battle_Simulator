'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
const COMMON = require('../js/common-effects.js');
require('../js/common-effects-extra-attack.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: '共通処理検証敵',
    classId: 'archer',
    attribute: 'sky',
    traits: ['servant'],
    hp: 1000000,
    attack: 1000,
    dtdr: 1,
    deathRate: 20,
    instantDeathRate: 0,
    chargeMax: 3,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(enemy = baseEnemy()) {
  return new BattleEngine({
    seed: 1,
    startingStars: 0,
    party: [{ servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 0 }],
    enemies: [enemy]
  });
}

function addStatus(engine, unit, effect, source = '共通処理テスト') {
  return engine._addStatus(unit, effect, effect.value || 0, source);
}

function chainContext() {
  return {
    firstBonuses: { quick: false, arts: false, buster: false },
    busterChain: false,
    artsChain: false,
    quickChain: false,
    mighty: false
  };
}

function addNormalAttackCharm(engine, actor, overrides = {}) {
  return addStatus(engine, actor, {
    type: 'onNormalAttackApplyDebuff',
    debuffType: 'charm',
    chance: 100,
    debuffDuration: 2,
    duration: 3,
    ...overrides
  });
}

function charmCount(target) {
  return target.statuses.filter((status) => status.type === 'charm').length;
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

test('共通効果ランタイムが登録される', () => {
  assert.ok(COMMON.debuffTypes.includes('charm'));
  assert.ok(COMMON.dotTypes.includes('burn'));
  assert.deepStrictEqual(COMMON.normalAttackTypes, ['quick', 'arts', 'buster', 'extra']);
  assert.strictEqual(COMMON.extraAttackTriggersAfterNormalAttack, true);
  assert.strictEqual(typeof BattleEngine.prototype._runEffectHooks, 'function');
  assert.strictEqual(typeof BattleEngine.prototype._debuffSuccessChance, 'function');
  assert.strictEqual(typeof BattleEngine.prototype._consumeDefenseStatus, 'function');
});

test('Q/A/BとExtra Attackは各1回発動し、宝具では発動しない', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  addNormalAttackCharm(engine, actor);
  engine.rng = () => 0;

  ['quick', 'arts', 'buster'].forEach((card) => {
    engine._runEffectHooks('afterNormalAttack', {
      actor,
      target,
      action: { type: 'card', card }
    });
  });
  engine._runEffectHooks('afterNormalAttack', {
    actor,
    target,
    action: { type: 'extra', card: 'extra' }
  });
  assert.strictEqual(charmCount(target), 4);

  engine._runEffectHooks('afterNormalAttack', {
    actor,
    target,
    action: { type: 'np', card: 'buster' }
  });
  assert.strictEqual(charmCount(target), 4);
});

test('Extra AttackはHit数に関係なく攻撃1回につき1回だけ判定する', () => {
  const engine = makeEngine(baseEnemy({ hp: 99999999 }));
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  actor.data.hits.extra = 10;
  addNormalAttackCharm(engine, actor);
  engine.rng = () => 0;

  engine._executeExtra(actor.id, chainContext(), [
    { actorId: actor.id, card: 'quick' },
    { actorId: actor.id, card: 'arts' },
    { actorId: actor.id, card: 'buster' }
  ]);

  assert.strictEqual(charmCount(target), 1);
  const judgments = engine.getState().logs.filter((entry) => entry.message.includes('魅了付与判定'));
  assert.strictEqual(judgments.length, 1);
});

test('通常カード3枚のBrave ChainではExtra Attackを含め合計4回判定する', () => {
  const engine = makeEngine(baseEnemy({ hp: 99999999, attack: 1, chargeMax: 9 }));
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  addNormalAttackCharm(engine, actor);
  engine.rng = () => 0;

  const quick = engine.getState().hand.find((card) => card.card === 'quick');
  const arts = engine.getState().hand.find((card) => card.card === 'arts');
  const buster = engine.getState().hand.find((card) => card.card === 'buster');
  assert.ok(quick && arts && buster);
  [quick, arts, buster].forEach((card) => engine.toggleCard(card.id));

  const result = engine.executeCommandChain();
  assert.strictEqual(result.ok, true);
  assert.strictEqual(charmCount(target), 4);
  const judgments = engine.getState().logs.filter((entry) => entry.message.includes('魅了付与判定'));
  assert.strictEqual(judgments.length, 4);
});

test('実際の宝具実行では通常攻撃時効果を発動しない', () => {
  const engine = makeEngine(baseEnemy({ hp: 99999999 }));
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  actor.np = 100;
  addNormalAttackCharm(engine, actor);
  engine.rng = () => 0;

  engine._executeNp({ type: 'np', actorId: actor.id, card: actor.data.np.card }, chainContext(), 0);
  assert.strictEqual(charmCount(target), 0);
});

test('弱体成功率へ汎用成功率・魅了成功率・弱体耐性・精神異常耐性を反映する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  addStatus(engine, actor, { type: 'debuffSuccess', value: 20, duration: 3 });
  addStatus(engine, actor, { type: 'charmSuccessUp', value: 30, duration: 3 });
  addStatus(engine, target, { type: 'debuffResist', value: 10, duration: 3 });
  addStatus(engine, target, { type: 'mentalResist', value: 20, duration: 3 });

  const result = engine._debuffSuccessChance(actor, target, { type: 'charm', chance: 50 });
  assert.deepStrictEqual(result, {
    debuffType: 'charm',
    base: 50,
    generalBonus: 20,
    typeBonus: 30,
    generalResist: 10,
    mentalResist: 20,
    finalChance: 70
  });
});

test('確率弱体の成功・失敗と補正後成功率をログへ記録する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  engine.rng = () => 0.49;
  const success = engine._tryApplyDebuff(actor, target, {
    type: 'charm',
    chance: 50,
    duration: 1,
    debuff: true
  }, '検証効果');
  assert.strictEqual(success.success, true);
  assert.ok(engine.getState().logs.at(-1).message.includes('基礎50%'));
  assert.ok(engine.getState().logs.at(-1).message.includes('補正後50%'));
  assert.ok(engine.getState().logs.at(-1).message.includes('成功'));

  target.statuses = target.statuses.filter((status) => status.type !== 'charm');
  engine.rng = () => 0.51;
  const failure = engine._tryApplyDebuff(actor, target, {
    type: 'charm',
    chance: 50,
    duration: 1,
    debuff: true
  }, '検証効果');
  assert.strictEqual(failure.success, false);
  assert.ok(engine.getState().logs.at(-1).message.includes('失敗'));
});

test('魅了中の敵は通常攻撃と宝具を行わずチャージも変化しない', () => {
  [0, 3].forEach((charge) => {
    const engine = makeEngine(baseEnemy({ charge, startingCharge: charge, chargeMax: 3 }));
    const ally = engine.getState().allies[0];
    const enemy = engine.getState().enemies[0];
    enemy.charge = charge;
    addStatus(engine, enemy, { type: 'charm', duration: 1, debuff: true });
    const hpBefore = ally.hp;
    engine._performEnemyTurn();
    assert.strictEqual(ally.hp, hpBefore);
    assert.strictEqual(enemy.charge, charge);
    assert.ok(engine.getState().logs.some((entry) => entry.message === `${enemy.name}は魅了により行動できない。`));
  });
});

test('やけどは5ターンにわたり毎ターン個別ダメージを与える', () => {
  const engine = makeEngine();
  const enemy = engine.getState().enemies[0];
  const initialHp = enemy.hp;
  addStatus(engine, enemy, { type: 'burn', value: 1000, duration: 5, debuff: true });
  for (let index = 0; index < 5; index += 1) engine._finishTurn();
  assert.strictEqual(enemy.hp, initialHp - 5000);
  assert.strictEqual(enemy.statuses.some((status) => status.type === 'burn'), false);
});

test('延焼100%でやけどダメージが2倍になる', () => {
  const engine = makeEngine();
  const enemy = engine.getState().enemies[0];
  addStatus(engine, enemy, { type: 'burn', value: 1000, duration: 5, debuff: true });
  addStatus(engine, enemy, { type: 'dotAmplify', dotType: 'burn', value: 100, duration: 5, debuff: true });
  assert.deepStrictEqual(engine._dotDamage(enemy, 'burn'), { base: 1000, amplify: 100, total: 2000 });
});

test('複数やけどと複数延焼はそれぞれ加算してから乗算する', () => {
  const engine = makeEngine();
  const enemy = engine.getState().enemies[0];
  addStatus(engine, enemy, { type: 'burn', value: 1000, duration: 5, debuff: true });
  addStatus(engine, enemy, { type: 'burn', value: 500, duration: 5, debuff: true });
  addStatus(engine, enemy, { type: 'dotAmplify', dotType: 'burn', value: 100, duration: 5, debuff: true });
  addStatus(engine, enemy, { type: 'dotAmplify', dotType: 'burn', value: 50, duration: 5, debuff: true });
  assert.deepStrictEqual(engine._dotDamage(enemy, 'burn'), { base: 1500, amplify: 150, total: 3750 });
});

test('1回・3T回避は最初の攻撃だけ回避して消費される', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, ally, { type: 'evade', uses: 1, duration: 3 });
  assert.strictEqual(engine._canAvoid(ally, enemy, false), true);
  assert.strictEqual(ally.statuses.some((status) => status.type === 'evade'), false);
  assert.strictEqual(engine._canAvoid(ally, enemy, false), false);
});

test('1T回避は同一ターンの複数攻撃を回避しターン終了で消滅する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, ally, { type: 'evade', duration: 1 });
  assert.strictEqual(engine._canAvoid(ally, enemy, false), true);
  assert.strictEqual(engine._canAvoid(ally, enemy, false), true);
  engine._removeExpiredStatuses(ally);
  assert.strictEqual(engine._canAvoid(ally, enemy, false), false);
});

test('必中は回避だけを無視し無敵貫通は回避と無敵を無視する', () => {
  const sureHitEngine = makeEngine();
  const sureHitAlly = sureHitEngine.getState().allies[0];
  const sureHitEnemy = sureHitEngine.getState().enemies[0];
  addStatus(sureHitEngine, sureHitAlly, { type: 'evade', uses: 1, duration: 3 });
  addStatus(sureHitEngine, sureHitAlly, { type: 'invincible', uses: 1, duration: 3 });
  addStatus(sureHitEngine, sureHitEnemy, { type: 'sureHit', duration: 3 });
  assert.strictEqual(sureHitEngine._canAvoid(sureHitAlly, sureHitEnemy, false), true);
  assert.strictEqual(sureHitAlly.statuses.some((status) => status.type === 'evade'), true);
  assert.strictEqual(sureHitAlly.statuses.some((status) => status.type === 'invincible'), false);

  const pierceEngine = makeEngine();
  const pierceAlly = pierceEngine.getState().allies[0];
  const pierceEnemy = pierceEngine.getState().enemies[0];
  addStatus(pierceEngine, pierceAlly, { type: 'evade', uses: 1, duration: 3 });
  addStatus(pierceEngine, pierceAlly, { type: 'invincible', uses: 1, duration: 3 });
  addStatus(pierceEngine, pierceEnemy, { type: 'invinciblePierce', duration: 3 });
  assert.strictEqual(pierceEngine._canAvoid(pierceAlly, pierceEnemy, false), false);
  assert.strictEqual(pierceAlly.statuses.filter((status) => ['evade', 'invincible'].includes(status.type)).length, 2);
});

test('既存の毒とガッツは共通処理導入後も動作する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const enemyHp = enemy.hp;
  addStatus(engine, enemy, { type: 'poison', value: 500, duration: 1, debuff: true });
  engine._finishTurn();
  assert.strictEqual(enemy.hp, enemyHp - 500);

  addStatus(engine, ally, { type: 'guts', value: 1000, uses: 1, duration: 3 });
  engine._takeDamage(ally, ally.hp + 10000, '検証');
  assert.strictEqual(ally.alive, true);
  assert.strictEqual(ally.hp, 1000);
  assert.strictEqual(ally.statuses.some((status) => status.type === 'guts'), false);
});

test('共通処理導入後も通常の3枚選択からターンを完走できる', () => {
  const engine = makeEngine(baseEnemy({ hp: 9999999, attack: 1, chargeMax: 9 }));
  engine.getState().hand.slice(0, 3).forEach((card) => engine.toggleCard(card.id));
  const result = engine.executeCommandChain();
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine.getState().turn, 2);
  assert.strictEqual(engine.getState().phase, 'command');
  assert.strictEqual(engine.getState().hand.length, 5);
});

test('新しい状態表示名とアイコンが取得できる', () => {
  const engine = makeEngine();
  const enemy = engine.getState().enemies[0];
  addStatus(engine, enemy, { type: 'burn', value: 1000, duration: 5, debuff: true });
  const summary = engine.getStatusSummary(enemy.id).find((status) => status.type === 'burn');
  assert.strictEqual(summary.name, 'やけど');
  assert.strictEqual(DATA.statusIcons.burn, 'Poison.webp');
  assert.strictEqual(DATA.statusIcons.charm, 'Stunstatus.webp');
});

console.log('\n共通状態処理テストに合格しました。');
