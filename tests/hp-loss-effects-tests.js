'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
const HP_LOSS = require('../js/hp-loss-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'HP減少検証敵',
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
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(options = {}) {
  return new BattleEngine({
    seed: 314058,
    party: options.party || [
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 100 }
    ],
    enemies: [baseEnemy(options.enemy)]
  });
}

function addStatus(engine, unit, effect, value = 0) {
  return engine._addStatus(unit, effect, value, '検証');
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

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('HP減少共通ランタイムを登録する', () => {
  assert.strictEqual(typeof BattleEngine.prototype._applyHpLoss, 'function');
  assert.strictEqual(typeof BattleEngine.prototype._synchronizeAfterFatalHpLoss, 'function');
  assert.ok(HP_LOSS.modes.nonLethal.includes('HP1'));
  assert.ok(HP_LOSS.modes.lethal.includes('戦闘不能'));
});

test('HP500へ非致死性1000減少を適用するとHP1で生存する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  ally.hp = 500;
  const result = engine._applyEffect(
    { type: 'hpLoss', target: 'self', value: 1000, nonLethal: true },
    ally,
    ally.id,
    {}
  );
  assert.strictEqual(ally.hp, 1);
  assert.strictEqual(ally.alive, true);
  assert.strictEqual(engine.getState().winner, null);
  assert.strictEqual(result.results[0].actualLoss, 499);
  assert.ok(engine.getState().logs.at(-1).message.includes('500→1'));
});

test('非致死性HP減少ではガッツを消費しない', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  ally.hp = 500;
  const guts = addStatus(engine, ally, { type: 'guts', uses: 1, duration: 3 }, 3000);
  engine._applyEffect(
    { type: 'hpLoss', target: 'self', value: 1000, nonLethal: true },
    ally,
    ally.id,
    {}
  );
  assert.strictEqual(ally.hp, 1);
  assert.strictEqual(guts.uses, 1);
  assert.ok(ally.statuses.includes(guts));
  assert.strictEqual(engine.getState().logs.some((entry) => entry.message.includes('ガッツが発動')), false);
});

test('光のコヤンスカヤの既存HP減少データは非致死指定を維持する', () => {
  const servant = DATA.servants.koyanskayaLight;
  assert.ok(servant);
  const hpLossEffects = servant.skills
    .flatMap((skill) => skill.effects || [])
    .filter((effect) => effect.type === 'hpLoss');
  assert.ok(hpLossEffects.length > 0);
  assert.ok(hpLossEffects.every((effect) => effect.nonLethal === true));
});

test('HP500へ致死性1000減少を適用すると戦闘不能・敗北になる', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  ally.hp = 500;
  const result = engine._applyEffect(
    { type: 'hpLoss', target: 'self', value: 1000 },
    ally,
    ally.id,
    {}
  );
  assert.strictEqual(ally.hp, 0);
  assert.strictEqual(ally.alive, false);
  assert.strictEqual(result.results[0].defeated, true);
  assert.strictEqual(engine.getState().winner, 'enemies');
  assert.strictEqual(engine.getState().phase, 'finished');
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('500→0')));
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('戦闘不能')));
  assert.strictEqual(engine.getState().logs.filter((entry) => entry.message === '敗北。').length, 1);
});

test('致死性HP減少でガッツが発動し指定HPで復活する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  ally.hp = 500;
  const guts = addStatus(engine, ally, { type: 'guts', uses: 1, duration: 3 }, 3000);
  const result = engine._applyEffect(
    { type: 'hpLoss', target: 'self', value: 1000 },
    ally,
    ally.id,
    {}
  );
  assert.strictEqual(ally.hp, 3000);
  assert.strictEqual(ally.alive, true);
  assert.strictEqual(result.results[0].guts, true);
  assert.strictEqual(ally.statuses.includes(guts), false);
  assert.strictEqual(engine.getState().winner, null);
  assert.strictEqual(engine.getState().logs.filter((entry) => entry.message.includes('ガッツが発動')).length, 1);
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('HP3000で復活')));
});

test('回数2のガッツは致死性HP減少で1回だけ消費する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  ally.hp = 500;
  const guts = addStatus(engine, ally, { type: 'guts', uses: 2, duration: 3 }, 1000);
  engine._applyEffect({ type: 'hpLoss', target: 'self', value: 1000 }, ally, ally.id, {});
  assert.strictEqual(ally.hp, 1000);
  assert.strictEqual(guts.uses, 1);
  assert.ok(ally.statuses.includes(guts));
});

test('防御状態とダメージカットはHP減少量へ影響せず消費もしない', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  ally.hp = 2000;
  const statuses = [
    addStatus(engine, ally, { type: 'defenseUp', duration: 3 }, 100),
    addStatus(engine, ally, { type: 'damageCut', uses: 1, duration: 3 }, 999999),
    addStatus(engine, ally, { type: 'evade', uses: 1, duration: 3 }),
    addStatus(engine, ally, { type: 'invincible', uses: 1, duration: 3 }),
    addStatus(engine, ally, { type: 'antiEnforcementDefense', uses: 1, duration: 3 })
  ];
  engine._applyEffect({ type: 'hpLoss', target: 'self', value: 1000 }, ally, ally.id, {});
  assert.strictEqual(ally.hp, 1000);
  assert.strictEqual(ally.alive, true);
  statuses.forEach((status) => {
    assert.ok(ally.statuses.includes(status));
    if (status.uses != null) assert.strictEqual(status.uses, 1);
  });
  assert.strictEqual(engine.getState().logs.some((entry) => entry.message.includes('ダメージカット：')), false);
});

test('HPが十分ある場合は致死性HP減少後も生存する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  ally.hp = 5000;
  engine._applyEffect({ type: 'hpLoss', target: 'self', value: 1000 }, ally, ally.id, {});
  assert.strictEqual(ally.hp, 4000);
  assert.strictEqual(ally.alive, true);
  assert.strictEqual(engine.getState().winner, null);
});

test('戦闘不能になった前衛を手札・デッキから除外し控えを補充する', () => {
  const engine = makeEngine({
    party: [
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 },
      { servantId: 'aliceLiddell', skillLevel: 10, npLevel: 1 },
      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1 }
    ]
  });
  const target = engine.getState().allies[1];
  target.hp = 500;
  engine._applyEffect({ type: 'hpLoss', target: 'self', value: 1000 }, target, target.id, {});
  assert.strictEqual(target.alive, false);
  assert.strictEqual(engine.getAliveAllies().length, 3);
  assert.strictEqual(engine.getState().allies[3].frontline, true);
  assert.strictEqual(engine.getState().hand.some((card) => card.actorId === target.id), false);
  assert.strictEqual(engine.getState().deck.some((card) => card.actorId === target.id), false);
  assert.strictEqual(engine.getState().winner, null);
});

test('致死性HP減少で敗北後は敵フェイズを重複実行しない', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  ally.hp = 1;
  engine._applyEffect({ type: 'hpLoss', target: 'self', value: 1 }, ally, ally.id, {});
  const logCount = engine.getState().logs.length;
  const result = engine._performEnemyTurn();
  assert.strictEqual(result.skipped, true);
  assert.strictEqual(engine.getState().logs.length, logCount);
  assert.strictEqual(engine.getState().logs.filter((entry) => entry.message === '敗北。').length, 1);
});

test('フェンリル宝具ダメージ完了後にHP1000減少で戦闘不能になる', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  actor.hp = 1000;
  actor.np = 100;
  actor.data.np.after = [{ type: 'hpLoss', target: 'self', value: 1000 }];
  const enemyHpBefore = enemy.hp;
  engine._executeNp({ type: 'np', actorId: actor.id, card: actor.data.np.card }, chainContext(), 0);
  assert.ok(enemy.hp < enemyHpBefore);
  assert.strictEqual(actor.hp, 0);
  assert.strictEqual(actor.alive, false);
  const damageLogIndex = engine.getState().logs.findIndex((entry) => entry.message.includes(`${enemy.name}に`) && entry.message.includes('ダメージ'));
  const hpLossLogIndex = engine.getState().logs.findIndex((entry) => entry.message.includes(`${actor.name}のHPが1000減少`));
  assert.ok(damageLogIndex >= 0);
  assert.ok(hpLossLogIndex > damageLogIndex);
});

test('フェンリル宝具後の致死性HP減少でもガッツが発動する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  actor.hp = 1000;
  actor.np = 100;
  actor.data.np.after = [{ type: 'hpLoss', target: 'self', value: 1000 }];
  addStatus(engine, actor, { type: 'guts', uses: 1, duration: 3 }, 2000);
  const enemyHpBefore = enemy.hp;
  engine._executeNp({ type: 'np', actorId: actor.id, card: actor.data.np.card }, chainContext(), 0);
  assert.ok(enemy.hp < enemyHpBefore);
  assert.strictEqual(actor.hp, 2000);
  assert.strictEqual(actor.alive, true);
  assert.strictEqual(engine.getState().winner, null);
});

console.log('\n致死性・非致死性HP減少テストに合格しました。');
