'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
const HP_LOSS = require('../js/hp-loss-effects.js');

const engine = new BattleEngine({
  seed: 314058,
  party: [
    { servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 100 }
  ],
  enemies: [{
    enabled: true,
    name: '同時戦闘不能検証敵',
    classId: 'rider',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 1,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 9,
    critRate: 0,
    npTarget: 'single'
  }]
});

const actor = engine.getState().allies[0];
actor.hp = 1000;
actor.np = 100;
actor.data.np.after = [
  { type: 'hpLoss', target: 'self', value: 1000 }
];

engine.getState().selectedActions = [0, 1, 2].map(() => ({
  type: 'np',
  actorId: actor.id,
  card: actor.data.np.card
}));

const result = engine.executeCommandChain();

assert.ok(HP_LOSS.defeatPriority.includes('敗北'));
assert.strictEqual(actor.alive, false);
assert.strictEqual(engine.getAliveEnemies().length, 0);
assert.strictEqual(engine.getState().winner, 'enemies');
assert.strictEqual(engine.getState().phase, 'finished');
assert.strictEqual(result.finished, true);
assert.strictEqual(result.winner, 'enemies');
assert.strictEqual(engine.getState().logs.filter((entry) => entry.message === '敗北。').length, 1);
assert.strictEqual(engine.getState().logs.some((entry) => entry.kind === 'victory'), false);

console.log('✓ 最終敵撃破と最後の味方の致死性HP減少が同時に起きても敗北を維持');
