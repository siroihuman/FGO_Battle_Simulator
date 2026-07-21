'use strict';

const fs = require('fs');
const path = 'tests/combat-defense-effects-tests.js';
const source = fs.readFileSync(path, 'utf8');
const from = "      { servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 100 }";
const to = "      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 100 }";
const occurrences = source.split(from).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected one default Fenrir test-party entry, found ${occurrences}.`);
}
fs.writeFileSync(path, source.replace(from, to), 'utf8');
console.log('Isolated combat defense ratio tests from Fenrir fixed damage passive.');
