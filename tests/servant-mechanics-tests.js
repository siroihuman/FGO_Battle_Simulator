'use strict';

const DATA = require('../js/data.js');
const UNIQUE = require('../js/unique-mechanics/index.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/unique-mechanics/runtime.js');

function assert(condition, label) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}

assert(Array.isArray(UNIQUE.list()), 'Unique Mechanicsレジストリを取得できる');
const uniqueIds = UNIQUE.list().map((entry) => entry.servantId).sort();
assert(
  JSON.stringify(uniqueIds) === JSON.stringify(['aliceLiddell', 'baphomet', 'beast031', 'eingana', 'konohanasakuyaHime', 'quinquxQuinquefolia', 'rlyeh']),
  '固有例外処理を持つサーヴァントだけがレジストリへ登録される'
);
assert(Object.keys(DATA.servants).length > 0, 'サーヴァントデータは通常どおり登録される');

const engine = new BattleEngine({
  seed: 1,
  party: [{ servantId: 'fenrir', startingNp: 0, npLevel: 1, skillLevel: 10, craftEssenceId: 'none' }],
  waves: [{ enabled: true, enemies: [{ enabled: true, name: '検証敵', classId: 'saber', attribute: 'man', traits: [], hp: 100000, attack: 1, dtdr: 1, deathRate: 0, chargeMax: 3, critRate: 0 }] }]
});

assert(typeof engine._runUniqueMechanic === 'function', '固有例外処理ランタイムが導入される');
assert(engine._runUniqueMechanic(engine.state.allies[0], 'beforeNp', {}) === undefined, '未登録サーヴァントでは何も実行しない');

console.log('All unique mechanics tests passed.');
