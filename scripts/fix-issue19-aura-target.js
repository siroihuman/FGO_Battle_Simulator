'use strict';

const fs = require('fs');
const path = 'js/trait-trigger-aura-effects.js';
const source = fs.readFileSync(path, 'utf8');
const from = "    'provider', 'providerFrontlineOnly', 'modifierType', 'conditionTarget',\n";
const to = "    'provider', 'providerFrontlineOnly', 'modifierType', 'conditionTarget', 'target',\n";
const count = source.split(from).length - 1;
if (count !== 1) throw new Error(`Expected one META_KEYS insertion point, found ${count}.`);
fs.writeFileSync(path, source.replace(from, to), 'utf8');
console.log('Preserved aura target metadata in generic statuses.');
