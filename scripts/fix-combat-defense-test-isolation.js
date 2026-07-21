'use strict';

const fs = require('fs');
const path = 'tests/combat-defense-effects-tests.js';
const source = fs.readFileSync(path, 'utf8');

const partyFrom = "      { servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 100 }";
const partyTo = "      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 100 }";
const assertionFrom = "  assert.strictEqual(allySummary.find((entry) => entry.type === 'critUp').uses, 3);";
const assertionTo = "  assert.strictEqual(allySummary.find((entry) => entry.type === 'critUp' && entry.uses != null).uses, 3);";

if (source.split(partyFrom).length - 1 !== 1) {
  throw new Error('Expected one default Fenrir test-party entry.');
}
if (source.split(assertionFrom).length - 1 !== 1) {
  throw new Error('Expected one unrestricted critUp summary assertion.');
}

const updated = source
  .replace(partyFrom, partyTo)
  .replace(assertionFrom, assertionTo);
fs.writeFileSync(path, updated, 'utf8');
console.log('Isolated combat defense tests from fixed damage and unlimited class-score critUp.');
