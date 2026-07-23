'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
require('../js/data.js');
require('../js/servants.js');
const { BattleEngine } = require('../js/engine.js');
const ORDER = require('../js/np-selection-order.js');

function enemy() {
  return {
    enabled: true,
    name: '選択順確認用エネミー',
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
  return new BattleEngine({
    seed: 15,
    party: [
      { servantId: 'fenrir', skillLevel: 10, startingNp: 100 },
      { servantId: 'koyanskayaLight', skillLevel: 10, startingNp: 100 },
      { servantId: 'skadiCaster', skillLevel: 10, startingNp: 100 }
    ],
    enemies: [enemy()],
    startingStars: 0
  });
}

{
  const engine = makeEngine();
  const [first, second] = engine.getAliveAllies();
  const card = {
    id: 'order-card-1',
    actorId: first.id,
    card: 'arts',
    cardIndex: 0,
    randomWeightBonus: 0,
    assignedStars: 0,
    critChance: 0
  };
  engine.state.hand = [card];
  engine.state.selectedActions = [];

  assert.strictEqual(engine.toggleCard(card.id), true);
  assert.strictEqual(engine.toggleNp(second.id), true);
  assert.strictEqual(ORDER.selectedNpOrder(engine, second.id), 2);
  assert.strictEqual(ORDER.selectedNpOrder(engine, first.id), null);
}

{
  const engine = makeEngine();
  const [first] = engine.getAliveAllies();
  assert.strictEqual(engine.toggleNp(first.id), true);
  assert.strictEqual(ORDER.selectedNpOrder(engine, first.id), 1);
  assert.strictEqual(engine.toggleNp(first.id), true);
  assert.strictEqual(ORDER.selectedNpOrder(engine, first.id), null);
}

{
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '../js/np-selection-order.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../css/styles.css'), 'utf8');

  assert.ok(html.includes('js/np-selection-order.js'));
  assert.ok(html.indexOf('js/np-selection-order.js') > html.indexOf('js/app.js'));
  assert.ok(source.includes(".np-command[data-np]"));
  assert.ok(source.includes("badge.className = 'order-badge'"));
  assert.ok(source.includes('button.prepend(badge)'));
  assert.ok(css.includes('.order-badge'));
}

console.log('\n宝具カード選択順表示テストに合格しました。');
