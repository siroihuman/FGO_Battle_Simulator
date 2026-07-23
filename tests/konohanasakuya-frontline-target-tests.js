'use strict';

const assert = require('assert');
require('../js/data.js');
require('../js/servants.js');
require('../js/servants-konohanasakuya-hime.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/turn-field-effects.js');
require('../js/command-card-selection-effects.js');
const MECHANICS = require('../js/unique-mechanics/konohanasakuya-hime.js');

const e = new BattleEngine({
  seed: 1,
  party: [
    { servantId: 'konohanasakuyaHime', skillLevel: 10 },
    { servantId: 'fenrir', skillLevel: 10 },
    { servantId: 'koyanskayaLight', skillLevel: 10 },
    { servantId: 'fenrir', skillLevel: 10 }
  ],
  enemies: [{ enabled: true, name: '対象', classId: 'assassin', attribute: 'earth', traits: [], hp: 1000000, attack: 1, dtdr: 1, deathRate: 0, chargeMax: 9, critRate: 0 }]
});

const [actor, front2, front3, reserve] = e.getState().allies;
const effect = actor.data.np.before.find((entry) => entry.type === MECHANICS.statusTypes.cherryBlossom);
e.setFieldTraits(['陽射し'], { log: false });
e._applyEffect(effect, actor, actor.id, { npLevel: 1, oc: 1 });

assert.strictEqual(actor.statuses.some((status) => status.type === MECHANICS.statusTypes.cherryBlossom), true);
assert.strictEqual(front2.statuses.some((status) => status.type === MECHANICS.statusTypes.afterSkillCooldown), true);
assert.strictEqual(front3.statuses.some((status) => status.type === MECHANICS.statusTypes.afterSkillCooldown), true);
assert.strictEqual(reserve.frontline, false);
assert.strictEqual(reserve.statuses.some((status) => status.type === MECHANICS.statusTypes.cherryBlossom), false);
assert.strictEqual(reserve.statuses.some((status) => status.type === MECHANICS.statusTypes.afterSkillCooldown), false);
assert.strictEqual(reserve.statuses.some((status) => status.type === 'npPerTurn'), false);

console.log('Konohanasakuya frontline target tests passed.');
