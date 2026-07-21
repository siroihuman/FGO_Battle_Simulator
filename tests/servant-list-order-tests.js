'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const ORDER = require('../js/servant-list-order.js');

const expectedOfficialOrder = [
  'skadiCaster',
  'artoriaCaster',
  'koyanskayaLight',
  'skadiRuler'
];

assert.deepStrictEqual(
  Array.from(ORDER.OFFICIAL_SERVANT_IDS),
  expectedOfficialOrder,
  '公式枠の対象IDが指定された4騎と一致すること'
);

const orderedServants = Object.values(DATA.servants);
const officialTail = orderedServants.slice(-expectedOfficialOrder.length);
assert.deepStrictEqual(
  officialTail.map((servant) => servant.id),
  expectedOfficialOrder,
  '公式枠が一覧の最後尾でNo.215、284、314、357の順に並ぶこと'
);

const nonOfficialServants = orderedServants.slice(0, -expectedOfficialOrder.length);
assert.ok(
  nonOfficialServants.every((servant) => !expectedOfficialOrder.includes(servant.id)),
  '公式枠のサーヴァントが創作枠へ混入しないこと'
);
for (let index = 1; index < nonOfficialServants.length; index += 1) {
  assert.ok(
    ORDER.compareServantsForList(nonOfficialServants[index - 1], nonOfficialServants[index]) <= 0,
    `創作枠がNo順であること: ${nonOfficialServants[index - 1].no} -> ${nonOfficialServants[index].no}`
  );
}

const sample = {
  skadiRuler: { id: 'skadiRuler', no: '357' },
  customPrime: { id: 'customPrime', no: "002'" },
  customHigh: { id: 'customHigh', no: '999' },
  koyanskayaLight: { id: 'koyanskayaLight', no: '314' },
  customOne: { id: 'customOne', no: '001' },
  artoriaCaster: { id: 'artoriaCaster', no: '284' },
  customTwo: { id: 'customTwo', no: '002' },
  skadiCaster: { id: 'skadiCaster', no: '215' }
};

assert.deepStrictEqual(
  Object.values(ORDER.orderServantsForList(sample)).map((servant) => servant.id),
  [
    'customOne',
    'customTwo',
    'customPrime',
    'customHigh',
    'skadiCaster',
    'artoriaCaster',
    'koyanskayaLight',
    'skadiRuler'
  ],
  '創作枠はNo順、公式枠はNoの大小にかかわらず最後尾のNo順となること'
);

console.log('servant-list-order-tests: ok');
