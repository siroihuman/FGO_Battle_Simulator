'use strict';

const assert = require('assert');
require('../js/data.js');
require('../js/servants.js');
require('../js/servants-konohanasakuya-hime.js');
const { BattleEngine } = require('../js/engine.js');
const EFFECTS = require('../js/command-card-selection-effects.js');

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

function engine() {
  return new BattleEngine({
    seed: 1,
    party: [
      { servantId: 'konohanasakuyaHime', skillLevel: 10 },
      { servantId: 'fenrir', skillLevel: 10 },
      { servantId: 'koyanskayaLight', skillLevel: 10 }
    ],
    enemies: [enemy()],
    startingStars: 0
  });
}

{
  const e = engine();
  const [sealed] = e.getState().allies;
  e._addStatus(sealed, { type: 'konohanaCommandCardSeal', duration: 5 }, 1, 'test');
  e._resetDeck();
  e._drawHand();
  assert.strictEqual(e.getState().hand.some((card) => card.actorId === sealed.id), false);
  assert.strictEqual(e.getState().deck.some((card) => card.actorId === sealed.id), false);
}

{
  const e = engine();
  const [stunned, ally2, ally3] = e.getState().allies;
  e._addStatus(stunned, { type: 'stun', duration: 1, debuff: true }, 1, 'test');

  const cards = [stunned, ally2, ally3].map((ally, index) => ({
    id: `forced-${index}`,
    actorId: ally.id,
    card: 'arts',
    cardIndex: 0,
    randomWeightBonus: 0,
    critChance: 0
  }));
  e.getState().hand = cards;
  e.getState().selectedActions = [];

  assert.strictEqual(e.toggleCard(cards[0].id), true, 'スタン中でもカード自体は選択できる');
  assert.strictEqual(e.toggleCard(cards[1].id), true);
  assert.strictEqual(e.toggleCard(cards[2].id), true);

  const result = e.executeCommandChain();
  assert.strictEqual(result.ok, true);
  assert.strictEqual(e.getState().logs.some((entry) => entry.message.includes('チェインエラー')), true);
  assert.strictEqual(e.getState().logs.some((entry) => entry.message.includes('Arts CHAIN成立')), false);
  assert.strictEqual(e.getState().logs.some((entry) => entry.message.includes('行動不能のため、コマンドカードによる攻撃を行えない')), true);
}

assert.strictEqual(EFFECTS.isIncapacitated({ statuses: [{ type: 'permanentSleep', remaining: 5 }] }), true);
assert.strictEqual(EFFECTS.isCommandCardDrawSealed({ statuses: [{ type: 'commandCardSeal', remaining: 5 }] }), true);

console.log('Command card selection effects tests passed.');
