'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/common-effects-extra-attack.js');
require('../js/card-buff-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/hp-loss-effects.js');
require('../js/turn-field-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/trigger-lifecycle-effects.js');
require('../js/np-card-trigger-removal-effects.js');
const DEFENSE_REMOVAL = require('../js/defense-buff-removal-effects.js');
require('../js/class-affinity-special-effects.js');
require('../js/trigger-star-reward-effects.js');

function enemy(overrides = {}) {
  return {
    enabled: true,
    name: '検証敵',
    classId: 'saber',
    attribute: 'earth',
    traits: ['サーヴァント', '人の力'],
    hp: 9999999,
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

function makeEngine() {
  const engine = new BattleEngine({
    seed: 766024,
    party: [
      { servantId: 'dominionForeigner', skillLevel: 10, npLevel: 1, startingNp: 100 },
      { servantId: 'lucifera', skillLevel: 10, npLevel: 1, startingNp: 0 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 }
    ],
    enemies: [enemy()]
  });
  engine.rng = () => 0.5;
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

test("No.024' 支配のフォーリナーの基本データを登録する", () => {
  const servant = DATA.servants.dominionForeigner;
  assert.ok(servant);
  assert.strictEqual(servant.no, "024'");
  assert.strictEqual(servant.classId, 'foreigner');
  assert.strictEqual(servant.maxHp, 13095);
  assert.strictEqual(servant.atk, 12584);
  assert.deepStrictEqual(servant.cards, ['quick', 'arts', 'arts', 'arts', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 5, arts: 2, buster: 4, extra: 3, np: 3 });
  assert.strictEqual(servant.na, 0.78);
  assert.strictEqual(servant.np.multipliers[0], 800);
});

test('スキル1は全体火力強化と単体クリティカル強化を付与する', () => {
  const engine = makeEngine();
  const [actor, target, other] = engine.getState().allies;
  assert.strictEqual(engine.useSkill(actor.id, 0, target.id).ok, true);
  [actor, target, other].forEach((unit) => {
    assert.strictEqual(engine._statusTotal(unit, 'npPowerUp') >= 20, true);
    assert.strictEqual(engine._statusTotal(unit, 'attackUp') >= 20, true);
  });
  assert.strictEqual(engine._statusTotal(target, 'critUp') >= 50, true);
  assert.strictEqual(engine._statusTotal(target, 'starWeightUp') >= 5000, true);
});

test('スキル2・3はQuick強化、毎ターンNP・スター、NP50、OC2段階、スター15を処理する', () => {
  const engine = makeEngine();
  const [actor, target, other] = engine.getState().allies;
  actor.np = 0;
  assert.strictEqual(engine.useSkill(actor.id, 1, target.id).ok, true);
  assert.strictEqual(engine._statusTotal(target, 'cardUp', { card: 'quick' }) >= 50, true);
  assert.strictEqual(engine._statusTotal(target, 'npPerTurn') >= 5, true);
  assert.strictEqual(engine._statusTotal(other, 'starsPerTurn') >= 10, true);
  assert.strictEqual(engine._statusTotal(actor, 'npPerTurn'), 2.5);

  assert.strictEqual(engine.useSkill(actor.id, 2, target.id).ok, true);
  assert.strictEqual(target.np, 50);
  const oc = target.statuses.find((status) => status.type === 'ocUp');
  assert.ok(oc);
  assert.strictEqual(oc.value, 2);
  assert.strictEqual(engine.getState().stars, 15);
});

test('神話を現す者EXは前衛中のみ全体NP2.5・クトゥルフ追加7.5・弱体耐性25を供給する', () => {
  const engine = makeEngine();
  const [actor, cthulhuAlly, normalAlly] = engine.getState().allies;
  cthulhuAlly.traits.push('クトゥルフ');
  assert.strictEqual(engine._statusTotal(actor, 'npPerTurn'), 2.5);
  assert.strictEqual(engine._statusTotal(cthulhuAlly, 'npPerTurn'), 10);
  assert.strictEqual(engine._statusTotal(normalAlly, 'npPerTurn'), 2.5);
  assert.strictEqual(engine._statusTotal(normalAlly, 'debuffResist') >= 25, true);
  actor.frontline = false;
  assert.strictEqual(engine._statusTotal(cthulhuAlly, 'npPerTurn'), 0);
});

test('防御強化解除は攻撃強化を残し、防御系状態だけを解除する', () => {
  const engine = makeEngine();
  const [actor] = engine.getState().allies;
  const target = engine.getState().enemies[0];
  engine._addStatus(target, { type: 'defenseUp', duration: 3 }, 30, '防御強化');
  engine._addStatus(target, { type: 'invincible', duration: 3, uses: 1 }, 0, '無敵');
  engine._addStatus(target, { type: 'attackUp', duration: 3 }, 30, '攻撃強化');
  const result = engine._applyEffect({ type: 'defenseBuffClear', target: 'allEnemies' }, actor, null, {});
  assert.strictEqual(result.results[0].removed, 2);
  assert.strictEqual(target.statuses.some((status) => status.type === 'defenseUp'), false);
  assert.strictEqual(target.statuses.some((status) => status.type === 'invincible'), false);
  assert.strictEqual(target.statuses.some((status) => status.type === 'attackUp'), true);
  assert.strictEqual(DEFENSE_REMOVAL.effectType, 'defenseBuffClear');
});

test('強化後宝具は人の力特攻と人の力の味方へのOC依存支援を登録する', () => {
  const servant = DATA.servants.dominionForeigner;
  assert.strictEqual(servant.np.special.key, '人の力');
  assert.strictEqual(servant.np.special.multiplier, 1.5);
  assert.deepStrictEqual(servant.np.after[0].ocValues, [10, 15, 20, 25, 30]);
  assert.deepStrictEqual(servant.np.after[1].ocValues, [20, 25, 30, 35, 40]);
  assert.strictEqual(servant.np.after[2].value, 20);
});

console.log('\n支配のフォーリナー実装回帰テストに合格しました。');
