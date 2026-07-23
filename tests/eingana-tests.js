'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants.js');
require('../js/servants-eingana.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/lethal-damage-evasion-effects.js');
const EINGANA = require('../js/unique-mechanics/eingana.js');

function enemy(overrides = {}) {
  return {
    enabled: true,
    name: '対象',
    classId: 'assassin',
    attribute: 'earth',
    traits: ['サーヴァント'],
    hp: 1000000,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    chargeMax: 9,
    critRate: 0,
    ...overrides
  };
}

function makeEngine(enemyOverrides = {}) {
  return new BattleEngine({
    seed: 1,
    party: [{ servantId: 'eingana', skillLevel: 10, npLevel: 5, startingNp: 100 }],
    enemies: [enemy(enemyOverrides)],
    startingStars: 0
  });
}

{
  const servant = DATA.servants.eingana;
  assert.strictEqual(servant.no, '015');
  assert.strictEqual(servant.name, 'エインガナ');
  assert.strictEqual(servant.classId, 'caster');
  assert.strictEqual(servant.maxHp, 15820);
  assert.strictEqual(servant.atk, 10215);
  assert.strictEqual(servant.attribute, 'sky');
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'arts', 'buster', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 3, arts: 3, buster: 3, extra: 6, np: 3 });
  assert.strictEqual(servant.na, 0.62);
  assert.strictEqual(servant.starRate, 11.3);
  assert.strictEqual(servant.deathRate, 30.0);
  assert.deepStrictEqual(servant.skills.map((skill) => skill.baseCt), [10, 9, 11]);
  assert.deepStrictEqual(servant.skillIcons, [
    'skill-general-070.png', 'skill-buster-up.png', 'skill-general-030.png'
  ]);
  assert.deepStrictEqual(servant.passives.map((passive) => passive.name), [
    '陣地作成 EX', '単独行動 A+', '神性 EX'
  ]);
  assert.deepStrictEqual(servant.passives.map((passive) => passive.effects[0].value), [12, 11, 250]);
  assert.strictEqual(servant.np.name, 'エインガナ');
  assert.strictEqual(servant.np.reading, '無の砂漠');
  assert.strictEqual(servant.np.instantDeathChance, 100);
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const baseMaxHp = actor.maxHp;
  const maxHpEffect = actor.data.np.after.find((effect) => effect.type === EINGANA.statusTypes.maxHpUp);
  const result = engine._applyEffect(maxHpEffect, actor, actor.id, { oc: 3, npLevel: 5 });
  assert.strictEqual(result.applied, true);
  assert.strictEqual(actor.maxHp, baseMaxHp + 7500, '宝具OC3で最大HPを7500増加');
  assert.strictEqual(actor.hp, baseMaxHp + 7500, '最大HP増加時は現在HPも同値増加');
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(engine.useSkill(actor.id, 0, actor.id).ok, true);
  assert.strictEqual(actor.maxHp, 25820, '虹蛇Lv10で最大HP10000アップ');
  const branch = actor.statuses.find((status) => status.type === EINGANA.statusTypes.hpTurnBranches);
  assert.strictEqual(branch.highNp, 20);
  assert.strictEqual(branch.lowHeal, 2000);
  assert.strictEqual(engine._statusTotal(actor, 'defenseUp'), 50, 'HP最大時は防御力50%アップ');
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(engine.useSkill(actor.id, 1, actor.id).ok, true);
  const buster = actor.statuses.find((status) => status.type === 'cardUp' && status.card === 'buster');
  assert.strictEqual(buster.value, 50);
  assert.strictEqual(buster.uses, 3);
  assert.strictEqual(actor.np, 150, '魔力放出（虹）Lv10でNP50増加');
  assert.ok(actor.statuses.some((status) => status.type === 'npPerTurn' && status.value === 10));
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(engine.useSkill(actor.id, 2, actor.id).ok, true);
  assert.strictEqual(actor.cooldowns[2], 8, '創造EXはCT11のLv10短縮後9から即時1進めて8');
  const trigger = actor.statuses.find((status) => status.type === EINGANA.statusTypes.maxHpOnAttack);
  assert.strictEqual(trigger.value, 5000);
  const threshold = actor.statuses.find((status) => status.type === EINGANA.statusTypes.creationThresholds);
  assert.strictEqual(threshold.thresholdNp, 50);
  assert.strictEqual(threshold.thresholdNpPower, 200);
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  engine.useSkill(actor.id, 2, actor.id);
  const before = actor.maxHp;
  engine.state.hand = [{ id: 'forced', actorId: actor.id, card: 'buster', cardIndex: 0, critChance: 0 }];
  engine._executeCard({ type: 'card', cardId: 'forced', actorId: actor.id, card: 'buster', position: 0 }, {
    firstBonuses: { buster: false, arts: false, quick: false },
    busterChain: false
  });
  assert.strictEqual(actor.maxHp, before + 5000, '創造Lv10中の攻撃後に最大HP5000アップ');
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  engine._addStatus(actor, {
    type: EINGANA.statusTypes.creationThresholds,
    duration: 3,
    thresholdNp: 50,
    thresholdNpPower: 200,
    statusIcon: 'DelayedBuff.webp'
  }, 1, '創造 EX');
  [30000, 30000, 30000].forEach((amount) => EINGANA.applyMaxHpUp(engine, actor, {
    type: EINGANA.statusTypes.maxHpUp,
    duration: 3,
    statusIcon: 'Maxhpup.webp'
  }, amount, 'test'));
  actor.np = 0;
  actor.hp = 100;
  engine.getAliveEnemies()[0].attack = 1000000;
  engine._performEnemyTurn();
  assert.strictEqual(actor.alive, true, '味方ターン終了時の致死ダメージ回避が敵攻撃中に有効');
  assert.ok(!actor.statuses.some((status) => status.type === 'deathEvasion'), '致死ダメージ回避は敵ターン終了時に消滅');
  assert.ok(actor.np >= 50, '60000以上でNP50増加');
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('宝具威力が200%アップ')), '90000以上で宝具威力200%アップ');
}

{
  const engine = makeEngine({ deathRate: 100 });
  const actor = engine.getState().allies[0];
  const target = engine.getAliveEnemies()[0];
  engine.rng = () => 0;
  const success = EINGANA.applyNpInstantDeath(engine, actor, target, { type: 'np' });
  assert.strictEqual(success, true, '宝具の即死効果を処理');
  assert.strictEqual(target.alive, false);
}

console.log('Eingana tests passed.');
