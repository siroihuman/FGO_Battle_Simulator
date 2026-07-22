'use strict';
const assert = require('assert');
require('../js/data.js');
require('../js/servants.js');
require('../js/servants-konohanasakuya-hime.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/turn-field-effects.js');
require('../js/command-use-locks.js');
require('../js/unique-mechanics/konohanasakuya-hime.js');
const enemy={enabled:true,name:'対象',classId:'assassin',attribute:'earth',traits:[],hp:100000,attack:1,dtdr:1,deathRate:0,chargeMax:9,critRate:0};
const e=new BattleEngine({seed:1,party:[{servantId:'konohanasakuyaHime',skillLevel:10},{servantId:'fenrir',skillLevel:10}],enemies:[enemy]});
const [actor,ally]=e.getState().allies;
e._addStatus(ally,{type:'attackDown',duration:3,debuff:true},20,'test');
assert.strictEqual(e.useSkill(actor.id,1,actor.id).ok,true);
assert.strictEqual(e.useSkill(actor.id,2,actor.id).ok,true);
switch(process.env.CHECK){
case 'debuff': assert.strictEqual(ally.statuses.some(s=>s.type==='attackDown'),false); break;
case 'evade': assert.strictEqual(ally.statuses.find(s=>s.type==='evade').uses,2); break;
case 'arts': assert.strictEqual(e._statusTotal(ally,'cardUp',{card:'arts'}),20); break;
case 'allynp': assert.strictEqual(ally.np,20); break;
case 'actornp': assert.strictEqual(actor.np,50); break;
case 'defense': assert.strictEqual(e._statusTotal(actor,'defenseUp'),70); break;
case 'focus': assert.strictEqual(e._statusTotal(actor,'targetFocus'),300); break;
default: throw new Error('unknown CHECK');
}
