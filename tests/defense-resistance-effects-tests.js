'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
const DEFENSE = require('../js/defense-resistance-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: '防御・クリティカル検証敵',
    classId: 'rider',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 99999999,
    attack: 5000,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 3,
    critRate: 20,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(options = {}) {
  return new BattleEngine({
    seed: 314058,
    party: options.party || [
      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 100 }
    ],
    enemies: [baseEnemy(options.enemy)]
  });
}

function antiEffect(overrides = {}) {
  return {
    type: 'antiEnforcementDefense',
    target: 'self',
    ocUses: [1, 2, 3, 4, 5],
    duration: 3,
    ...overrides
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

test('共通ランタイムとOC回数解決APIを登録する', () => {
  assert.deepStrictEqual(DEFENSE.defensePriority, ['antiEnforcementDefense', 'invincible', 'evade']);
  assert.strictEqual(typeof BattleEngine.prototype._enemyCriticalChance, 'function');
  assert.strictEqual(DEFENSE.resolveOcUses({ ocUses: [1, 2, 3, 4, 5] }, 4), 4);
});

test('対粛正防御をOC1～5で1～5回付与する', () => {
  [1, 2, 3, 4, 5].forEach((oc) => {
    const engine = makeEngine();
    const ally = engine.getState().allies[0];
    engine._applyEffect(antiEffect(), ally, ally.id, { oc });
    const status = ally.statuses.find((entry) => entry.type === 'antiEnforcementDefense');
    assert.ok(status);
    assert.strictEqual(status.value, 0);
    assert.strictEqual(status.uses, oc);
    assert.strictEqual(status.remaining, 3);
  });
});

test('ocUsesは他の回数制状態でもusesへ汎用解決される', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  engine._applyEffect({
    type: 'evade',
    target: 'self',
    ocUses: [1, 2, 3, 4, 5],
    duration: 3
  }, ally, ally.id, { oc: 3 });
  const status = ally.statuses.find((entry) => entry.type === 'evade');
  assert.strictEqual(status.uses, 3);
});

test('無敵貫通・必中状態の敵からの通常攻撃を対粛正防御で防ぐ', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine._applyEffect(antiEffect(), ally, ally.id, { oc: 1 });
  addStatus(engine, enemy, { type: 'invinciblePierce', duration: 3 });
  addStatus(engine, enemy, { type: 'sureHit', duration: 3 });
  const hpBefore = ally.hp;
  engine._performEnemyTurn();
  assert.strictEqual(ally.hp, hpBefore);
  assert.strictEqual(ally.statuses.some((entry) => entry.type === 'antiEnforcementDefense'), false);
});

test('無敵貫通状態の敵宝具を防ぎ、多段宝具でも1回だけ消費する', () => {
  const engine = makeEngine({
    party: [
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 },
      { servantId: 'aliceLiddell', skillLevel: 10, npLevel: 1 }
    ],
    enemy: { npTarget: 'all' }
  });
  const enemy = engine.getState().enemies[0];
  enemy.charge = enemy.chargeMax;
  addStatus(engine, enemy, { type: 'invinciblePierce', duration: 3 });
  const hpBefore = engine.getAliveAllies().map((ally) => ally.hp);
  engine.getAliveAllies().forEach((ally) => {
    engine._applyEffect(antiEffect(), ally, ally.id, { oc: 2 });
  });

  engine._performEnemyTurn();
  engine.getAliveAllies().forEach((ally, index) => {
    assert.strictEqual(ally.hp, hpBefore[index]);
    const status = ally.statuses.find((entry) => entry.type === 'antiEnforcementDefense');
    assert.ok(status);
    assert.strictEqual(status.uses, 1);
  });
});

test('対粛正防御・無敵・回避が同時にある場合は対粛正防御だけを消費する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine._applyEffect(antiEffect(), ally, ally.id, { oc: 1 });
  const invincible = addStatus(engine, ally, { type: 'invincible', uses: 1, duration: 3 });
  const evade = addStatus(engine, ally, { type: 'evade', uses: 1, duration: 3 });

  assert.strictEqual(engine._canAvoid(ally, enemy, false), true);
  assert.strictEqual(ally.statuses.some((entry) => entry.type === 'antiEnforcementDefense'), false);
  assert.strictEqual(invincible.uses, 1);
  assert.strictEqual(evade.uses, 1);
});

test('対粛正防御の残存中は再付与しても上書き・回数加算しない', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  engine._applyEffect(antiEffect(), ally, ally.id, { oc: 2 });
  const result = engine._applyEffect(antiEffect(), ally, ally.id, { oc: 5 });
  const statuses = ally.statuses.filter((entry) => entry.type === 'antiEnforcementDefense');
  assert.strictEqual(result.applied, false);
  assert.strictEqual(statuses.length, 1);
  assert.strictEqual(statuses[0].uses, 2);
  assert.strictEqual(statuses[0].remaining, 3);
});

test('対粛正防御は回数0と残りターン0で解除される', () => {
  const consumedEngine = makeEngine();
  const consumedAlly = consumedEngine.getState().allies[0];
  const consumedEnemy = consumedEngine.getState().enemies[0];
  consumedEngine._applyEffect(antiEffect(), consumedAlly, consumedAlly.id, { oc: 1 });
  consumedEngine._canAvoid(consumedAlly, consumedEnemy, false);
  assert.strictEqual(consumedAlly.statuses.some((entry) => entry.type === 'antiEnforcementDefense'), false);

  const expiredEngine = makeEngine();
  const expiredAlly = expiredEngine.getState().allies[0];
  expiredEngine._applyEffect(antiEffect({ duration: 1 }), expiredAlly, expiredAlly.id, { oc: 5 });
  expiredEngine._finishTurn();
  assert.strictEqual(expiredAlly.statuses.some((entry) => entry.type === 'antiEnforcementDefense'), false);
});

test('通常の無敵は従来どおり無敵貫通で無視され、状態を消費しない', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const invincible = addStatus(engine, ally, { type: 'invincible', uses: 1, duration: 3 });
  addStatus(engine, enemy, { type: 'invinciblePierce', duration: 3 });
  assert.strictEqual(engine._canAvoid(ally, enemy, false), false);
  assert.strictEqual(invincible.uses, 1);
});

test('敵クリティカル率20%に被クリティカル発生耐性20%で0%になる', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, ally, { type: 'critRateResist', duration: -1 }, 20);
  assert.strictEqual(engine._enemyCriticalChance(enemy, ally, false), 0);
  assert.strictEqual(engine._enemyCriticalChance(enemy, ally, true), 0);
});

test('敵50%・クリ率ダウン10%・対象耐性20%で最終20%になる', () => {
  const engine = makeEngine({ enemy: { critRate: 50 } });
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, enemy, { type: 'critRateDown', duration: 3, debuff: true }, 10);
  addStatus(engine, ally, { type: 'critRateResist', duration: -1 }, 20);
  assert.strictEqual(engine._enemyCriticalChance(enemy, ally, false), 20);
});

test('複数の被クリティカル発生耐性を加算し最終確率を0～100%へ制限する', () => {
  const engine = makeEngine({ enemy: { critRate: 70 } });
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, ally, { type: 'critRateResist', duration: -1 }, 20);
  addStatus(engine, ally, { type: 'critRateResist', duration: -1 }, 30);
  assert.strictEqual(engine._enemyCriticalChance(enemy, ally, false), 20);
  assert.strictEqual(engine._enemyCriticalChance({ ...enemy, critRate: 200 }, ally, false), 100);
  addStatus(engine, enemy, { type: 'critRateDown', duration: 3, debuff: true }, 100);
  assert.strictEqual(engine._enemyCriticalChance(enemy, ally, false), 0);
});

test('被クリティカル発生耐性0%時は実際の敵通常攻撃でクリティカルにならない', () => {
  const engine = makeEngine({ enemy: { critRate: 20 } });
  const ally = engine.getState().allies[0];
  addStatus(engine, ally, { type: 'critRateResist', duration: -1 }, 20);
  engine.rng = () => 0;
  engine._performEnemyTurn();
  assert.strictEqual(engine.getState().logs.some((entry) => entry.message.includes('CRITICAL')), false);
});

test('宝具before効果は攻撃力アップ・弱体解除・対粛正防御の配列順で処理する', () => {
  const engine = makeEngine({
    party: [
      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1, startingNp: 100 },
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 }
    ]
  });
  const actor = engine.getState().allies[0];
  engine.getAliveAllies().forEach((ally) => {
    addStatus(engine, ally, { type: 'attackDown', duration: 3, debuff: true }, 20);
  });
  actor.data.np = {
    ...actor.data.np,
    target: 'support',
    before: [
      { type: 'attackUp', target: 'allAllies', value: 30, duration: 3 },
      { type: 'debuffClear', target: 'allAllies' },
      { type: 'antiEnforcementDefense', target: 'allAllies', ocUses: [1, 2, 3, 4, 5], duration: 3 }
    ],
    after: []
  };
  engine._executeNp({ type: 'np', actorId: actor.id, card: actor.data.np.card }, {
    firstBonuses: { buster: false, arts: false, quick: false },
    busterChain: false,
    artsChain: false,
    quickChain: false,
    mighty: false
  }, 0);

  engine.getAliveAllies().forEach((ally) => {
    assert.strictEqual(ally.statuses.some((entry) => entry.type === 'attackDown'), false);
    const attackIndex = ally.statuses.findIndex((entry) => entry.type === 'attackUp');
    const defenseIndex = ally.statuses.findIndex((entry) => entry.type === 'antiEnforcementDefense');
    assert.ok(attackIndex >= 0);
    assert.ok(defenseIndex > attackIndex);
  });
});

test('状態表示名と共通アイコンを取得できる', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  engine._applyEffect(antiEffect(), ally, ally.id, { oc: 1 });
  addStatus(engine, ally, { type: 'critRateResist', duration: -1 }, 20);
  const summary = engine.getStatusSummary(ally.id);
  const anti = summary.find((entry) => entry.type === 'antiEnforcementDefense');
  const resist = summary.find((entry) => entry.type === 'critRateResist');
  assert.strictEqual(anti.name, '対粛正防御');
  assert.strictEqual(anti.statusIcon, DATA.statusIcons.antiEnforcementDefense);
  assert.strictEqual(resist.name, '被クリティカル発生耐性');
  assert.strictEqual(resist.statusIcon, DATA.statusIcons.critRateResist);
});

console.log('\n対粛正防御・被クリティカル発生耐性テストに合格しました。');