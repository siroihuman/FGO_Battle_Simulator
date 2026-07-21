'use strict';

const fs = require('fs');
const path = 'tests/defense-resistance-effects-tests.js';
const source = fs.readFileSync(path, 'utf8');
const from = "      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1, startingNp: 100 }";
const to = "      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 100 }";
const occurrences = source.split(from).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected one default Artoria test-party entry, found ${occurrences}.`);
}
fs.writeFileSync(path, source.replace(from, to), 'utf8');
console.log('Isolated generic defense tests from Artoria Caster passives.');
