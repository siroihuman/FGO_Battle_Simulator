'use strict';

const fs = require('fs');

function replaceExactlyOnce(path, from, to, label) {
  const source = fs.readFileSync(path, 'utf8');
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}.`);
  fs.writeFileSync(path, source.replace(from, to), 'utf8');
}

replaceExactlyOnce(
  'tests/trait-trigger-aura-effects-tests.js',
  "const TRAIT = require('../js/trait-trigger-aura-effects.js');\n",
  "const TRAIT = require('../js/trait-trigger-aura-effects.js');\nrequire('../js/trigger-lifecycle-effects.js');\n",
  'trait trigger lifecycle import'
);

replaceExactlyOnce(
  'tests/trigger-lifecycle-effects-tests.js',
  "    party: [{ servantId: 'aliceLiddell', skillLevel: 10, npLevel: 1 }],",
  "    party: [{ servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1 }],",
  'lifecycle neutral servant'
);

replaceExactlyOnce(
  'tests/turn-field-effects-tests.js',
  "      { servantId: 'aliceLiddell', skillLevel: 10, npLevel: 1 },",
  "      { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1 },",
  'turn field neutral frontline servant'
);

console.log('Updated Issue #19 regression test integration.');
