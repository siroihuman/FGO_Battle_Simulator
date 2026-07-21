'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
const COMBAT = require('../js/combat-defense-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: '戦闘状態検証敵',
    classId: 'rider',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 99999999,
    attack: 10000,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 3,
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

function fixedDamage(engine, actor, target, action) {
  engine.rng = () => 0.5;
  return engine._calculateAttackTotal(actor, target, action, chainContext());
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

test('共通ランタイムと計算式メタデータを登録する', () => {
  assert.strictEqual(COMBAT.damageFormula.attackDefense, '1 + attackUp - defenseUp + defenseDown');
  assert.strictEqual(COMBAT.damageFormula.fixedDefense, 'max(0, finalDamage - sum(damageCut))');
  assert.strictEqual(typeof BattleEngine.prototype._consumeCriticalPowerUses, 'function');
  assert.strictEqual(typeof BattleEngine.prototype._damageCutTotal, 'function');
});

test('防御力ダウン30%で通常攻撃と宝具ダメージが増える', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const normal = { type: 'card', card: 'buster', position: 0, critical: false };
  const np = { type: 'np', card: actor.data.np.card, position: 0, critical: false };
  const baseNormal = fixedDamage(engine, actor, enemy, normal);
  const baseNp = fixedDamage(engine, actor, enemy, np);

  addStatus(engine, enemy, { type: 'defenseDown', duration: 3, debuff: true }, 30);
  const downNormal = fixedDamage(engine, actor, enemy, normal);
  const downNp = fixedDamage(engine, actor, enemy, np);
  assert.ok(downNormal > baseNormal);
  assert.ok(downNp > baseNp);
  assert.ok(Math.abs(downNormal - Math.floor(baseNormal * 1.3)) <= 2);
  assert.ok(Math.abs(downNp - Math.floor(baseNp * 1.3)) <= 2);
});

test('防御力アップ20%と防御力ダウン30%を差引10%として処理する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const action = { type: 'card', card: 'arts', position: 0, critical: false };
  const base = fixedDamage(engine, actor, enemy, action);
  addStatus(engine, enemy, { type: 'defenseUp', duration: 3 }, 20);
  addStatus(engine, enemy, { type: 'defenseDown', duration: 3, debuff: true }, 30);
  const result = fixedDamage(engine, actor, enemy, action);
  assert.ok(Math.abs(result - Math.floor(base * 1.1)) <= 2);
});

test('複数の防御力ダウンを加算する', () => {
  const splitEngine = makeEngine();
  const splitActor = splitEngine.getState().allies[0];
  const splitEnemy = splitEngine.getState().enemies[0];
  addStatus(splitEngine, splitEnemy, { type: 'defenseDown', duration: 3, debuff: true }, 10);
  addStatus(splitEngine, splitEnemy, { type: 'defenseDown', duration: 3, debuff: true }, 20);

  const singleEngine = makeEngine();
  const singleActor = singleEngine.getState().allies[0];
  const singleEnemy = singleEngine.getState().enemies[0];
  addStatus(singleEngine, singleEnemy, { type: 'defenseDown', duration: 3, debuff: true }, 30);
  const action = { type: 'card', card: 'quick', position: 1, critical: false };
  assert.strictEqual(
    fixedDamage(splitEngine, splitActor, splitEnemy, action),
    fixedDamage(singleEngine, singleActor, singleEnemy, action)
  );
});

test('防御力ダウンへ弱体成功率と弱体耐性を適用する', () => {
  const engine = makeEngine();
  const source = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, source, { type: 'debuffSuccess', duration: 3 }, 20);
  addStatus(engine, enemy, { type: 'debuffResist', duration: 3 }, 50);
  const effect = {
    type: 'defenseDown', target: 'selectedEnemy', value: 30,
    chance: 40, duration: 3, debuff: true
  };
  const calc = engine._debuffSuccessChance(source, enemy, effect);
  assert.strictEqual(calc.finalChance, 10);
  engine.rng = () => 0.05;
  engine._applyEffect(effect, source, enemy.id, { level: 10 });
  assert.strictEqual(engine._statusTotal(enemy, 'defenseDown'), 30);
});

test('既存のdefenseUp負数データとdefenseDownが同じ結果になる', () => {
  const legacy = makeEngine();
  const modern = makeEngine();
  addStatus(legacy, legacy.getState().enemies[0], { type: 'defenseUp', duration: 3 }, -30);
  addStatus(modern, modern.getState().enemies[0], { type: 'defenseDown', duration: 3, debuff: true }, 30);
  const action = { type: 'card', card: 'buster', position: 2, critical: false };
  assert.strictEqual(
    fixedDamage(legacy, legacy.getState().allies[0], legacy.getState().enemies[0], action),
    fixedDamage(modern, modern.getState().allies[0], modern.getState().enemies[0], action)
  );
});

test('3回制critUpはクリティカル3回で消滅する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, actor, { type: 'critUp', uses: 3, duration: 5 }, 50);
  const action = { type: 'card', card: 'buster', position: 0, critical: true };
  for (let count = 2; count >= 0; count -= 1) {
    engine.rng = () => 0.5;
    engine._resolveAttackOnTarget(actor, enemy, action, chainContext());
    const status = actor.statuses.find((entry) => entry.type === 'critUp' && entry.uses != null);
    if (count > 0) assert.strictEqual(status.uses, count);
    else assert.strictEqual(status, undefined);
  }
});

test('非クリティカルでは回数制critUpを消費しない', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const status = addStatus(engine, actor, { type: 'critUp', uses: 3, duration: 5 }, 50);
  engine._resolveAttackOnTarget(actor, enemy, { type: 'card', card: 'arts', position: 0, critical: false }, chainContext());
  assert.strictEqual(status.uses, 3);
});

test('多段クリティカルカードでもcritUpは1回だけ消費する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  actor.data.hits.quick = 10;
  const status = addStatus(engine, actor, { type: 'critUp', uses: 3, duration: 5 }, 50);
  engine._resolveAttackOnTarget(actor, enemy, { type: 'card', card: 'quick', position: 0, critical: true }, chainContext());
  assert.strictEqual(status.uses, 2);
});

test('Extra Attackと宝具では回数制critUpを消費しない', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const status = addStatus(engine, actor, { type: 'critUp', uses: 3, duration: 5 }, 50);
  engine._resolveAttackOnTarget(actor, enemy, { type: 'extra', card: 'extra', critical: true, extraBonus: 2 }, chainContext());
  engine._resolveAttackOnTarget(actor, enemy, { type: 'np', card: actor.data.np.card, critical: true }, chainContext());
  assert.strictEqual(status.uses, 3);
});

test('複数の回数制critUpを同時に消費し回数無制限は維持する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const first = addStatus(engine, actor, { type: 'critUp', uses: 3, duration: 5 }, 30);
  const second = addStatus(engine, actor, { type: 'critUp', uses: 2, duration: 5 }, 20);
  const unlimited = addStatus(engine, actor, { type: 'critUp', duration: 5 }, 10);
  engine._resolveAttackOnTarget(actor, enemy, { type: 'card', card: 'buster', position: 0, critical: true }, chainContext());
  assert.strictEqual(first.uses, 2);
  assert.strictEqual(second.uses, 1);
  assert.strictEqual(unlimited.uses, null);
  assert.ok(actor.statuses.includes(unlimited));
});

test('即死無効1回は100%即死を無効化して消費し、2回目は通常判定へ戻る', () => {
  const engine = makeEngine({ enemy: { instantDeathRate: 100 } });
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  ally.data.deathRate = 100;
  addStatus(engine, ally, { type: 'instantDeathImmune', uses: 1, duration: 3 });
  engine.rng = () => 0;
  assert.strictEqual(engine._applyInstantDeath(enemy, ally), false);
  assert.strictEqual(ally.alive, true);
  assert.strictEqual(ally.statuses.some((entry) => entry.type === 'instantDeathImmune'), false);
  engine.rng = () => 0;
  assert.strictEqual(engine._applyInstantDeath(enemy, ally), true);
  assert.strictEqual(ally.alive, false);
});

test('即死効果のない攻撃では即死無効を消費しない', () => {
  const engine = makeEngine({ enemy: { instantDeathRate: 0 } });
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  const status = addStatus(engine, ally, { type: 'instantDeathImmune', uses: 1, duration: 3 });
  engine._applyInstantDeath(enemy, ally);
  assert.strictEqual(status.uses, 1);
});

test('回数無制限の即死無効は複数回無効化する', () => {
  const engine = makeEngine({ enemy: { instantDeathRate: 100 } });
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  ally.data.deathRate = 100;
  const status = addStatus(engine, ally, { type: 'instantDeathImmune', duration: 3 });
  engine.rng = () => 0;
  assert.strictEqual(engine._applyInstantDeath(enemy, ally), false);
  assert.strictEqual(engine._applyInstantDeath(enemy, ally), false);
  assert.strictEqual(status.uses, null);
  assert.ok(ally.statuses.includes(status));
});

test('既存の即死耐性は従来どおり成功率を減算する', () => {
  const engine = makeEngine({ enemy: { instantDeathRate: 100 } });
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  ally.data.deathRate = 100;
  addStatus(engine, ally, { type: 'deathResist', duration: 3 }, 100);
  engine.rng = () => 0;
  assert.strictEqual(engine._applyInstantDeath(enemy, ally), false);
  assert.strictEqual(ally.alive, true);
});

test('ダメージカットを通常・クリティカル・宝具の最終値から減算する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine.rng = () => 0.5;
  const normalBase = engine._enemyAttackDamage(enemy, ally, false, false);
  engine.rng = () => 0.5;
  const criticalBase = engine._enemyAttackDamage(enemy, ally, false, true);
  engine.rng = () => 0.5;
  const npBase = engine._enemyAttackDamage(enemy, ally, true, false);
  addStatus(engine, ally, { type: 'damageCut', duration: 3 }, 500);
  engine.rng = () => 0.5;
  assert.strictEqual(engine._enemyAttackDamage(enemy, ally, false, false), Math.max(0, normalBase - 500));
  engine.rng = () => 0.5;
  assert.strictEqual(engine._enemyAttackDamage(enemy, ally, false, true), Math.max(0, criticalBase - 500));
  engine.rng = () => 0.5;
  assert.strictEqual(engine._enemyAttackDamage(enemy, ally, true, false), Math.max(0, npBase - 500));
});

test('複数のダメージカットを加算し最終ダメージを0未満にしない', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine.rng = () => 0.5;
  const base = engine._enemyAttackDamage(enemy, ally, false, false);
  addStatus(engine, ally, { type: 'damageCut', duration: 3 }, 500);
  addStatus(engine, ally, { type: 'damageCut', duration: 3 }, 750);
  engine.rng = () => 0.5;
  assert.strictEqual(engine._enemyAttackDamage(enemy, ally, false, false), Math.max(0, base - 1250));
  addStatus(engine, ally, { type: 'damageCut', duration: 3 }, 999999);
  engine.rng = () => 0.5;
  assert.strictEqual(engine._enemyAttackDamage(enemy, ally, false, false), 0);
});

test('回避・無敵・対粛正防御で防いだ攻撃ではダメージカットを消費しない', () => {
  ['evade', 'invincible', 'antiEnforcementDefense'].forEach((type) => {
    const engine = makeEngine();
    const ally = engine.getState().allies[0];
    const cut = addStatus(engine, ally, { type: 'damageCut', uses: 1, duration: 3 }, 500);
    if (type === 'antiEnforcementDefense') {
      engine._applyEffect({ type, target: 'self', uses: 1, duration: 3 }, ally, ally.id, {});
    } else {
      addStatus(engine, ally, { type, uses: 1, duration: 3 });
    }
    const hpBefore = ally.hp;
    engine._performEnemyTurn();
    assert.strictEqual(ally.hp, hpBefore, type);
    assert.strictEqual(cut.uses, 1, type);
    assert.ok(!engine.getState().logs.some((entry) => entry.message.includes('ダメージカット：')), type);
  });
});

test('回数制ダメージカットは実際に軽減した攻撃で1回消費する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const cut = addStatus(engine, ally, { type: 'damageCut', uses: 1, duration: 3 }, 500);
  engine._performEnemyTurn();
  assert.strictEqual(ally.statuses.includes(cut), false);
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('ダメージカット：')));
});

test('OC1～5でダメージカット500～1500を解決する', () => {
  const values = [500, 750, 1000, 1250, 1500];
  values.forEach((expected, index) => {
    const engine = makeEngine();
    const ally = engine.getState().allies[0];
    engine._applyEffect({
      type: 'damageCut', target: 'self', ocValues: values, duration: 3
    }, ally, ally.id, { oc: index + 1 });
    assert.strictEqual(engine._statusTotal(ally, 'damageCut'), expected);
  });
});

test('敵攻撃でも防御力ダウンは防御力枠へ加算される', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  engine.rng = () => 0.5;
  const base = engine._enemyAttackDamage(enemy, ally, false, false);
  addStatus(engine, ally, { type: 'defenseDown', duration: 3, debuff: true }, 30);
  engine.rng = () => 0.5;
  const result = engine._enemyAttackDamage(enemy, ally, false, false);
  assert.ok(Math.abs(result - Math.floor(base * 1.3)) <= 2);
});

test('状態表示名・アイコン・残り回数を取得できる', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  const enemy = engine.getState().enemies[0];
  addStatus(engine, enemy, { type: 'defenseDown', duration: 3, debuff: true }, 30);
  addStatus(engine, ally, { type: 'instantDeathImmune', uses: 1, duration: 3 });
  addStatus(engine, ally, { type: 'damageCut', duration: 3 }, 500);
  addStatus(engine, ally, { type: 'critUp', uses: 3, duration: 5 }, 50);

  const enemySummary = engine.getStatusSummary(enemy.id);
  const allySummary = engine.getStatusSummary(ally.id);
  assert.strictEqual(enemySummary.find((entry) => entry.type === 'defenseDown').name, '防御力ダウン');
  assert.strictEqual(allySummary.find((entry) => entry.type === 'instantDeathImmune').name, '即死無効');
  assert.strictEqual(allySummary.find((entry) => entry.type === 'damageCut').name, 'ダメージカット');
  assert.strictEqual(allySummary.find((entry) => entry.type === 'critUp').uses, 3);
  assert.strictEqual(DATA.statusIcons.defenseDown, 'Defensedown.webp');
});

console.log('\n防御力ダウン・回数制クリティカル威力・即死無効・ダメージカットテストに合格しました。');
