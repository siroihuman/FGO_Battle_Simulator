'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants.js');
require('../js/servants-quinqux-quinquefolia.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/np-card-trigger-removal-effects.js');
require('../js/defense-buff-removal-effects.js');
require('../js/unique-mechanics/quinqux-quinquefolia.js');
require('../js/command-use-locks.js');
const FIXES = require('../js/unique-mechanics/quinqux-quinquefolia-fixes.js');

function enemy() {
  return {
    enabled: true,
    name: '対象',
    classId: 'saber',
    attribute: 'man',
    traits: ['サーヴァント'],
    hp: 1000000,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    chargeMax: 3,
    critRate: 0
  };
}

function engine() {
  return new BattleEngine({
    seed: 1,
    party: [
      { servantId: 'quinquxQuinquefolia', skillLevel: 10, startingNp: 0 },
      { servantId: 'fenrir', skillLevel: 10, startingNp: 0 }
    ],
    enemies: [enemy()],
    startingStars: 0
  });
}

const e = engine();
const [quinqux, target] = e.getState().allies;
const originalIcons = target.data.skillIcons.slice();
target.cooldowns = [4, 2, 0];

const transformed = e.useSkill(quinqux.id, 0, quinqux.id);
assert.strictEqual(transformed.ok, true);
assert.deepStrictEqual(target.cooldowns, [4, 2, 0], '変貌前のCTを維持する');
assert.deepStrictEqual(target.data.skillIcons, quinqux.data.skillIcons, '変貌後はスキルアイコンも同期する');
assert.notDeepStrictEqual(target.data.skillIcons, originalIcons, '元のスキルアイコンのままにしない');

const disable = target.statuses.find((status) =>
  status.type === FIXES.skillDisableType && Number(status.skillNumber) === 1
);
assert.ok(disable, 'skillDisable / skillNumber: 1 を付与する');
assert.strictEqual(disable.statusIcon, 'Skillseal.webp');
assert.strictEqual(e.getSkillAvailability(target.id, 0).available, false, 'スキル1だけ使用不可');
assert.strictEqual(e.getSkillAvailability(target.id, 1).available, false, 'スキル2は元のCTが残るため使用不可');
assert.strictEqual(e.getSkillAvailability(target.id, 2).available, true, 'スキル3は使用可能');

// 変貌中の対象が百貌の道化を使った場合、自身もクインクス扱いで条件特攻を受ける。
target.cooldowns[2] = 0;
const result = e.useSkill(target.id, 2, e.getState().enemies[0].id);
assert.strictEqual(result.ok, true);
assert.ok(target.statuses.some((status) =>
  status.type === 'quinquxUnbuffedOrLoserPower' && status.value === 50
), '変貌中のサーヴァントにも条件特攻を付与する');
assert.ok(quinqux.statuses.some((status) =>
  status.type === 'quinquxUnbuffedOrLoserPower' && status.value === 50
), '元のクインクスにも条件特攻を付与する');

console.log('quinqux-transformation-fixes-tests: OK');
