'use strict';

const assert = require('assert');
require('../js/data.js');
require('../js/servants.js');
const ENGINE = require('../js/engine.js');
const proto = ENGINE.BattleEngine.prototype;

// 過去の固有処理と同様、永久睡眠中のカード選択を拒否する旧ラッパーを再現する。
const legacyToggleCard = proto.toggleCard;
proto.toggleCard = function (cardId) {
  const card = this.state.hand.find((entry) => entry.id === cardId);
  const actor = card && this.getUnit(card.actorId);
  if (actor && (actor.statuses || []).some((status) => status.type === 'permanentSleep')) return false;
  return legacyToggleCard.call(this, cardId);
};

require('../js/command-card-selection-effects.js');
const SELECTION = require('../js/incapacitated-command-selection.js');

function enemy() {
  return {
    enabled: true,
    name: '永久睡眠確認用エネミー',
    classId: 'archer',
    attribute: 'sky',
    traits: [],
    hp: 100000,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    chargeMax: 3,
    critRate: 0
  };
}

function makeEngine() {
  const engine = new ENGINE.BattleEngine({
    seed: 14,
    party: [
      { servantId: 'fenrir', skillLevel: 10, startingNp: 100 },
      { servantId: 'koyanskayaLight', skillLevel: 10, startingNp: 100 },
      { servantId: 'skadiCaster', skillLevel: 10, startingNp: 100 }
    ],
    enemies: [enemy()],
    startingStars: 0
  });
  engine.rng = () => 0.5;
  return engine;
}

function forcedCard(actor, index, card = 'arts') {
  return {
    id: `sleep-card-${index}`,
    actorId: actor.id,
    card,
    cardIndex: index,
    randomWeightBonus: 0,
    assignedStars: 0,
    critChance: 0
  };
}

{
  const engine = makeEngine();
  const actor = engine.getAliveAllies()[0];
  actor.statuses.push({ type: 'permanentSleep', remaining: 3, uses: null, debuff: true });
  const card = forcedCard(actor, 0);
  engine.state.hand = [card];
  engine.state.selectedActions = [];

  assert.strictEqual(engine.toggleCard(card.id), true, '永久睡眠中でもカードを選択できる');
  assert.strictEqual(engine.state.selectedActions.length, 1);
  assert.strictEqual(engine.state.selectedActions[0].cardId, card.id);
  assert.strictEqual(engine.toggleCard(card.id), true, '永久睡眠中でも選択解除できる');
  assert.strictEqual(engine.state.selectedActions.length, 0);
}

{
  const engine = makeEngine();
  const actor = engine.getAliveAllies()[0];
  actor.statuses.push({ type: 'permanentSleep', remaining: 3, uses: null, debuff: true });
  engine.state.hand = [0, 1, 2].map((index) => forcedCard(actor, index, 'buster'));
  engine.state.selectedActions = [];
  engine.state.hand.forEach((card) => assert.strictEqual(engine.toggleCard(card.id), true));

  const result = engine.executeCommandChain();
  assert.strictEqual(result.ok, true);
  assert.ok(engine.state.logs.some((entry) => entry.message.includes('永久睡眠')));
  assert.ok(engine.state.logs.some((entry) => entry.message.includes('攻撃を行えない')));
}

{
  const engine = makeEngine();
  const actor = engine.getAliveAllies()[0];
  actor.statuses.push({ type: 'permanentSleep', remaining: 3, uses: null, debuff: true });
  actor.np = 100;
  assert.strictEqual(engine.toggleNp(actor.id), true, '永久睡眠中でも宝具カードを選択できる');
  assert.strictEqual(engine.state.selectedActions[0].type, 'np');
}

{
  const engine = makeEngine();
  const actor = engine.getAliveAllies()[0];
  actor.statuses.push({ type: 'customSelectionBlock', remaining: 3 });
  const card = forcedCard(actor, 0);
  engine.state.hand = [card];
  engine.state.selectedActions = [];
  assert.strictEqual(engine.toggleCard(card.id), true, '行動不能ではない状態には通常処理を使用する');
}

assert.strictEqual(SELECTION.selectionAllowedWhileIncapacitated, true);
assert.strictEqual(SELECTION.executionStillBlocked, true);
console.log('\n永久睡眠中のコマンド選択テストに合格しました。');
