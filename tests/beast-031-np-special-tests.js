'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants-beast-031.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/unique-mechanics/beast-031.js');
require('../js/unique-mechanics/beast-031-np-special.js');

function target(overrides = {}) {
  return {
    enabled: true,
    name: '対象',
    classId: 'saber',
    attribute: 'sky',
    traits: [],
    hp: 100000,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    chargeMax: 3,
    critRate: 0,
    ...overrides
  };
}

function multiplier(enemy, oc = 1) {
  const engine = new BattleEngine({
    seed: 1,
    party: [{ servantId: 'beast031' }],
    enemies: [enemy]
  });
  engine._currentNpOc = oc;
  return engine._npSpecialMultiplier(DATA.servants.beast031.np, engine.getState().enemies[0]);
}

assert.strictEqual(
  DATA.servants.beast031.np.special.kind,
  'beast031ServantManOrHumanoid'
);

assert.strictEqual(
  multiplier(target({ attribute: 'man', traits: ['サーヴァント'] })),
  1.5,
  '〔サーヴァント〕かつ〔人の力〕には特攻が入る'
);

assert.strictEqual(
  multiplier(target({ attribute: 'sky', traits: ['サーヴァント', 'ヒト科'] }), 5),
  2,
  '〔サーヴァント〕かつ〔ヒト科〕にはOC特攻が入る'
);

assert.strictEqual(
  multiplier(target({ attribute: 'man', traits: ['人型'] })),
  1,
  '〔人の力〕でもサーヴァントでなければ特攻は入らない'
);

assert.strictEqual(
  multiplier(target({ attribute: 'sky', traits: ['ヒト科'] })),
  1,
  '〔ヒト科〕でもサーヴァントでなければ特攻は入らない'
);

assert.strictEqual(
  multiplier(target({ attribute: 'sky', traits: ['サーヴァント'] })),
  1,
  'サーヴァントでも〔人の力〕・〔ヒト科〕のどちらもなければ特攻は入らない'
);

console.log('beast-031-np-special-tests: OK');
