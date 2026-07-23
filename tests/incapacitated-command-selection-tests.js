'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DATA = require('../js/data.js');
require('../js/servants.js');
const ENGINE = require('../js/engine.js');
require('../js/command-use-locks.js');
const proto = ENGINE.BattleEngine.prototype;

// 過去の固有処理と同様、永久睡眠中のカード・宝具選択を拒否する旧ラッパーを再現する。
const legacyToggleCard = proto.toggleCard;
proto.toggleCard = function (cardId) {
  const card = this.state.hand.find((entry) => entry.id === cardId);
  const actor = card && this.getUnit(card.actorId);
  if (actor && (actor.statuses || []).some((status) => status.type === 'permanentSleep')) return false;
  return legacyToggleCard.call(this, cardId);
};

const legacyToggleNp = proto.toggleNp;
proto.toggleNp = function (allyId) {
  const actor = this.getUnit(allyId);
  if (actor && (actor.statuses || []).some((status) => status.type === 'permanentSleep')) return false;
  return legacyToggleNp.call(this, allyId);
};

const DRAW_EFFECTS = require('../js/command-card-selection-effects.js');
const INCAPACITATION = require('../js/incapacitated-command-selection.js');

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

  assert.strictEqual(engine.toggleCard(card.id), true, '固有側API削除後も永久睡眠中のカードを選択できる');
  assert.strictEqual(engine.state.selectedActions.length, 1);
  assert.strictEqual(engine.state.selectedActions[0].cardId, card.id);
  assert.strictEqual(engine.toggleCard(card.id), true, '永久睡眠中でも選択解除できる');
  assert.strictEqual(engine.state.selectedActions.length, 0);
  assert.strictEqual(global.FGO_ACTIVE_BATTLE_ENGINE, engine, '画面補助処理が参照する戦闘エンジンを公開する');
}

{
  const engine = makeEngine();
  const [sleeping, ally2, ally3] = engine.getAliveAllies();
  sleeping.statuses.push({ type: 'permanentSleep', remaining: 3, uses: null, debuff: true });
  engine.state.hand = [
    forcedCard(sleeping, 0, 'arts'),
    forcedCard(ally2, 1, 'arts'),
    forcedCard(ally3, 2, 'arts')
  ];
  engine.state.selectedActions = [];
  engine.state.hand.forEach((card) => assert.strictEqual(engine.toggleCard(card.id), true));

  const hpBefore = engine.getAliveEnemies()[0].hp;
  const result = engine.executeCommandChain();
  assert.strictEqual(result.ok, true, '行動不能参加時もターン処理自体は完了する');
  assert.ok(engine.state.logs.some((entry) => entry.message.includes('永久睡眠')));
  assert.ok(engine.state.logs.some((entry) => entry.message.includes('攻撃を行えない')));
  assert.ok(engine.state.logs.some((entry) => entry.message.includes('チェインエラー')));
  assert.ok(!engine.state.logs.some((entry) => entry.message.includes('Arts CHAIN成立')));
  assert.ok(engine.getAliveEnemies()[0].hp < hpBefore, '行動可能な残り2騎のカードは正常に実行する');
}

{
  const engine = makeEngine();
  const actor = engine.getAliveAllies()[0];
  actor.statuses.push({ type: 'permanentSleep', remaining: 3, uses: null, debuff: true });
  actor.np = 100;
  assert.strictEqual(engine.toggleNp(actor.id), true, '旧宝具選択拒否ラッパーがあっても永久睡眠中に選択できる');
  assert.strictEqual(engine.state.selectedActions[0].type, 'np');
  assert.strictEqual(engine.toggleNp(actor.id), true, '永久睡眠中の宝具も選択解除できる');
}

{
  const engine = makeEngine();
  const actor = engine.getAliveAllies()[0];
  actor.statuses.push({ type: 'permanentSleep', remaining: 3, uses: null, debuff: true });
  actor.statuses.push({ type: 'npSeal', remaining: 3, uses: null, debuff: true });
  actor.np = 100;
  assert.strictEqual(engine.toggleNp(actor.id), false, '行動不能中でも宝具封印は優先する');
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

{
  const source = fs.readFileSync(path.join(__dirname, '../js/incapacitated-command-selection.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../css/command-use-locks.css'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  assert.ok(!source.includes('FGO_SIM_COMMAND_CARD_SELECTION_EFFECTS'), '固有側のカード選出処理へ依存しない');
  assert.ok(source.includes(".command-card[data-card]"));
  assert.ok(source.includes(".np-command[data-np]"));
  assert.ok(source.includes("button.classList.toggle('command-incapacitated'"));
  assert.ok(!source.includes('button.disabled ='), 'グレー表示のために選択自体を無効化しない');
  assert.ok(css.includes('.command-card.command-incapacitated'));
  assert.ok(css.includes('.np-command.command-incapacitated'));
  assert.ok(css.includes('backdrop-filter: grayscale(1) brightness(.58)'));
  assert.ok(css.includes('pointer-events: none'));
  assert.ok(html.indexOf('js/incapacitated-command-selection.js') > html.indexOf('js/command-card-selection-effects.js'));
  assert.ok(html.indexOf('js/incapacitated-command-selection.js') < html.indexOf('js/battle-presentation.js'));
}

assert.strictEqual(typeof DRAW_EFFECTS.isIncapacitated, 'undefined', '固有側から行動不能APIを削除済み');
assert.strictEqual(INCAPACITATION.isIncapacitated({ statuses: [{ type: 'permanentSleep', remaining: 5 }] }), true);
assert.strictEqual(INCAPACITATION.isIncapacitated({ statuses: [{ type: 'stun', remaining: 5 }] }), true);
assert.strictEqual(INCAPACITATION.isIncapacitated({ statuses: [{ type: 'custom', remaining: 5, preventsAction: true }] }), true);
assert.strictEqual(INCAPACITATION.isIncapacitated({ statuses: [{ type: 'stun', remaining: 0 }] }), false);
assert.strictEqual(INCAPACITATION.selectionAllowedWhileIncapacitated, true);
assert.strictEqual(INCAPACITATION.executionStillBlocked, true);
assert.strictEqual(INCAPACITATION.visualClass, 'command-incapacitated');
assert.strictEqual(DATA.version, '1.13.2');
console.log('\n永久睡眠・行動不能コマンド処理テストに合格しました。');
