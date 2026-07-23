'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DATA = require('../js/data.js');
require('../js/servants.js');
require('../js/servants-konohanasakuya-hime.js');
const ENGINE = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/common-effects-extra-attack.js');
require('../js/command-use-locks.js');
require('../js/unique-mechanics/registry.js');
const KONOHANA = require('../js/unique-mechanics/konohanasakuya-hime.js');
const EFFECTS = require('../js/command-card-selection-effects.js');
const BattleEngine = ENGINE.BattleEngine;

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

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

function makeEngine(partyCount = 3) {
  const ids = ['konohanasakuyaHime', 'fenrir', 'koyanskayaLight', 'skadiCaster'];
  const engine = new BattleEngine({
    seed: 1,
    party: ids.slice(0, partyCount).map((servantId) => ({ servantId, skillLevel: 10, startingNp: 100 })),
    enemies: [enemy()],
    startingStars: 0
  });
  engine.rng = () => 0.5;
  return engine;
}

test('コマンドカード選出不能中は山札と手札の配布候補から除外する', () => {
  const engine = makeEngine(3);
  const sealed = engine.getState().allies[0];
  engine._addStatus(sealed, { type: 'commandCardDrawSeal', duration: 5, debuff: true }, 1, 'test');
  engine._resetDeck();
  engine._drawHand();
  assert.strictEqual(engine.getState().hand.some((card) => card.actorId === sealed.id), false);
  assert.strictEqual(engine.getState().deck.some((card) => card.actorId === sealed.id), false);
});

test('前衛1騎のみではコマンドカード選出不能を付与せず5枚配布する', () => {
  const engine = makeEngine(1);
  const actor = engine.getAliveAllies()[0];
  const result = engine._applyEffect({
    type: 'commandCardDrawSeal',
    target: 'self',
    duration: 5,
    debuff: true
  }, actor, actor.id, {});

  assert.strictEqual(result.applied, false);
  assert.strictEqual(result.reason, 'singleFrontline');
  assert.strictEqual(actor.statuses.some((status) => status.type === 'commandCardDrawSeal'), false);
  engine._resetDeck();
  engine._drawHand();
  assert.strictEqual(engine.getState().hand.length, 5);
  assert.ok(engine.getState().hand.every((card) => card.actorId === actor.id));
});

test('味方対象は既定で前衛のみ、明示時だけ控えを含む', () => {
  const engine = makeEngine(4);
  const source = engine.getState().allies[0];
  const reserve = engine.getState().allies[3];
  assert.strictEqual(reserve.frontline, false);

  assert.strictEqual(engine._effectTargets({ target: 'allAllies' }, source, null).length, 3);
  assert.strictEqual(engine._effectTargets({ target: 'allAllies', includeReserve: true }, source, null).length, 4);
  assert.strictEqual(engine._effectTargets({ target: 'allAlliesIncludingReserve' }, source, null).length, 4);
  assert.strictEqual(engine._effectTargets({ target: 'selectedAlly' }, source, reserve.id).length, 0);
  assert.strictEqual(engine._effectTargets({ target: 'selectedAlly', includeReserve: true }, source, reserve.id)[0], reserve);
  assert.strictEqual(engine._effectTargets({ target: 'allOtherAllies' }, source, null).length, 2);
  assert.strictEqual(engine._effectTargets({ target: 'allOtherAllies', includeReserve: true }, source, null).length, 3);
});

test('木花之佐久夜毘売の選出不能と桜花爛漫は共通処理を使用する', () => {
  const single = makeEngine(1);
  const actor = single.getAliveAllies()[0];
  const seal = actor.data.np.after.find((effect) => effect.type === KONOHANA.statusTypes.commandCardSeal);
  const sealResult = single._applyEffect(seal, actor, actor.id, {});
  assert.strictEqual(sealResult.reason, 'singleFrontline');

  const party = makeEngine(4);
  const provider = party.getState().allies[0];
  const reserve = party.getState().allies[3];
  party.state.fieldTraits = ['陽射し'];
  party._applyEffect({
    type: KONOHANA.statusTypes.cherryBlossom,
    target: 'self',
    duration: 5,
    value: 10
  }, provider, provider.id, {});
  assert.ok(!reserve.statuses.some((status) => status.type === KONOHANA.statusTypes.afterSkillCooldown));
});

test('最終読込順で固有メカニクスより後に共通処理を登録する', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.indexOf('js/command-card-selection-effects.js') > html.indexOf('js/unique-mechanics/runtime.js'));
  assert.ok(html.indexOf('js/command-card-selection-effects.js') > html.indexOf('js/command-use-locks.js'));
  assert.ok(html.indexOf('js/command-card-selection-effects.js') < html.indexOf('js/battle-presentation.js'));
});

test('コマンドカード選出不能と前衛対象APIを公開する', () => {
  assert.strictEqual(EFFECTS.targetScope.defaultAllyScope, 'frontline');
  assert.ok(EFFECTS.commandCardDrawSealTypes.includes('commandCardDrawSeal'));
  assert.strictEqual(EFFECTS.effectIncludesReserve({ target: 'allAlliesIncludingReserve' }), true);
  assert.strictEqual(typeof EFFECTS.isIncapacitated, 'undefined');
  assert.strictEqual(typeof EFFECTS.incapacitatingStatus, 'undefined');
  assert.strictEqual(DATA.version, '1.13.3');
});

console.log('\nコマンドカード選出不能・前衛対象処理テストに合格しました。');
