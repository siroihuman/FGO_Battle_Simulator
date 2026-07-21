'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');

const engine = new BattleEngine({
  seed: 314058,
  party: [{ servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1 }],
  enemies: [{
    enabled: true,
    name: '防御優先順位検証敵',
    classId: 'rider',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 999999,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 3,
    critRate: 0,
    npTarget: 'single'
  }]
});

const ally = engine.getState().allies[0];
const enemy = engine.getState().enemies[0];
const invincible = engine._addStatus(ally, { type: 'invincible', uses: 1, duration: 3 }, 0, '検証');
const evade = engine._addStatus(ally, { type: 'evade', uses: 1, duration: 3 }, 0, '検証');

assert.strictEqual(engine._canAvoid(ally, enemy, false), true);
assert.strictEqual(ally.statuses.includes(invincible), false);
assert.strictEqual(evade.uses, 1);
assert.strictEqual(ally.statuses.includes(evade), true);
assert.strictEqual(engine._lastDefenseStatus.type, 'invincible');

console.log('✓ 防御優先順位は 対粛正防御 > 無敵 > 回避');