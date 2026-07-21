'use strict';

const fs = require('fs');
const path = 'tests/defense-resistance-effects-tests.js';
const source = fs.readFileSync(path, 'utf8');
const from = "      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1, startingNp: 100 }";
const to = "      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 100 }";
const first = source.indexOf(from);
if (first < 0) {
  throw new Error('Default Artoria test-party entry was not found.');
}
const updated = source.slice(0, first) + to + source.slice(first + from.length);
fs.writeFileSync(path, updated, 'utf8');
console.log('Isolated generic defense tests from Artoria Caster passives while preserving explicit Artoria tests.');
