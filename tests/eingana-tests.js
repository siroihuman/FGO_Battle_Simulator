'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants.js');
require('../js/servants-eingana.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/lethal-damage-evasion-effects.js');
const EINGANA = require('../js/unique-mechanics/eingana.js');

function enemy() {
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
    critRate: 0
  };
}

function makeEngine() {
  return new BattleEngine({
    seed: 1,
    party: [{ servantId: 'eingana', skillLevel: 10, npLevel: 5, startingNp: 100 }],
    enemies: [enemy()],
    startingStars: 0
  });
}

{
  const servant = DATA.servants.eingana;
  assert.strictEqual(servant.no, '015');
  assert.strictEqual(servant.name, 'エインガナ');
  assert.strictEqual(servant.classId, 'caster');
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'arts', 'buster', 'buster']);
  assert.strictEqual(servant.na, 0.62);
  assert.deepStrictEqual(servant.skillIcons, [
    'skill-general-070.png', 'skill-buster-up.png', 'skill-general-030.png'
  ]);
  assert.deepStrictEqual(servant.passives.map((passive) => passive.icon), [
    'class-general-012.png', 'class-general-002.png', 'class-divinity.png'
  ]);
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const baseMaxHp = actor.maxHp;
  const maxHpEffect = actor.data.np.before.find((effect) => effect.type === EINGANA.statusTypes.maxHpUp);
  const result = engine._applyEffect(maxHpEffect, actor, actor.id, { oc: 3, npLevel: 5 });
  assert.strictEqual(result.applied, true);
  assert.strictEqual(actor.maxHp, baseMaxHp + 30000, 'OC3で最大HPを30000増加');
  assert.strictEqual(actor.hp, baseMaxHp + 30000, '最大HP増加時は現在HPも同値増加');
  assert.strictEqual(EINGANA.maxHpIncreaseTotal(actor), 30000);
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const baseMaxHp = actor.maxHp;
  engine._applyEffect({
    type: EINGANA.statusTypes.maxHpUp,
    target: 'self',
    value: 10000,
    duration: 1
  }, actor, actor.id, {});
  actor.hp = actor.maxHp;
  engine._finishTurn();
  assert.strictEqual(actor.maxHp, baseMaxHp, '効果終了時に最大HPを元へ戻す');
  assert.ok(actor.hp <= actor.maxHp, '現在HPは復元後の最大HPを超えない');
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  engine._applyEffect({
    type: EINGANA.statusTypes.highHpDefense,
    target: 'self',
    value: 50,
    duration: 5
  }, actor, actor.id, {});
  actor.hp = actor.maxHp;
  assert.strictEqual(engine._statusTotal(actor, 'defenseUp'), 50);
  actor.hp = Math.floor(actor.maxHp / 2);
  assert.ok(engine._statusTotal(actor, 'defenseUp') >= 24 && engine._statusTotal(actor, 'defenseUp') <= 25);
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(engine.useSkill(actor.id, 0, actor.id).ok, true);
  const trigger = actor.statuses.find((status) => status.type === EINGANA.statusTypes.maxHpOnAttack);
  assert.strictEqual(trigger.value, 10000);
  const before = actor.maxHp;
  engine.state.hand = [{ id: 'forced', actorId: actor.id, card: 'buster', cardIndex: 0, critChance: 0 }];
  engine._executeCard({ type: 'card', cardId: 'forced', actorId: actor.id, card: 'buster', position: 0 }, {
    firstBonuses: { buster: false, arts: false, quick: false },
    busterChain: false
  });
  assert.strictEqual(actor.maxHp, before + 10000, '攻撃後に最大HPアップを1回付与');
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  engine._addStatus(actor, {
    type: EINGANA.statusTypes.creationThresholds,
    duration: 3,
    statusIcon: 'DelayedBuff.webp'
  }, 1, '創造 EX');
  [30000, 30000, 30000].forEach((amount) => EINGANA.applyMaxHpUp(engine, actor, {
    type: EINGANA.statusTypes.maxHpUp,
    duration: 3,
    statusIcon: 'Maxhpup.webp'
  }, amount, 'test'));
  actor.np = 0;
  engine._finishTurn();
  assert.ok(actor.statuses.some((status) => status.type === 'deathEvasion'), '30000以上で致死ダメージ回避を付与');
  assert.strictEqual(actor.np, 20, '60000以上でNP20増加');
  assert.ok(actor.statuses.some((status) => status.type === 'npPowerUp' && status.value === 100), '90000以上で宝具威力100%アップ');
}

{
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  assert.strictEqual(engine.useSkill(actor.id, 2, actor.id).ok, true);
  assert.strictEqual(actor.cooldowns[2], 6, '創造EXの使用後に自身の使用スキルCTを1進める');
}

console.log('Eingana tests passed.');
