'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function makeEngine(craftEssenceId) {
  return new BattleEngine({
    seed: 260722,
    startingStars: 0,
    party: [{
      servantId: 'inugamiGyobu',
      ascension: 'max',
      fouHp: 0,
      fouAtk: 0,
      npLevel: 1,
      skillLevel: 10,
      startingNp: 0,
      craftEssenceId
    }],
    waves: [{
      enabled: true,
      enemies: [{
        enabled: true,
        name: '表示確認用エネミー',
        classId: 'archer',
        attribute: 'sky',
        hp: 100000,
        attack: 1,
        dtdr: 1,
        deathRate: 0,
        chargeMax: 3,
        critRate: 0
      }]
    }]
  });
}

test('概念礼装由来状態は礼装名をsourceとして保持する', () => {
  assert.ok(DATA.craftEssences.blackGrail);
  const engine = makeEngine('blackGrail');
  const statuses = engine.getStatusSummary('ally-1')
    .filter((status) => status.source === '黒の聖杯');

  assert.deepStrictEqual(
    statuses.map((status) => status.type).sort(),
    ['hpLossPerTurn', 'npPowerUp']
  );
  statuses.forEach((status) => {
    assert.strictEqual(status.passive, false);
    assert.strictEqual(status.remaining, -1);
  });
});

test('概念礼装状態を通常バフ欄から専用タブへ移動するUIを登録する', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/class-score-ui.js'), 'utf8');
  assert.ok(source.includes("const DATA = window.FGO_SIM_DATA"));
  assert.ok(source.includes("title.lastIndexOf('｜')"));
  assert.ok(source.includes('craftEssenceNames'));
  assert.ok(source.includes('craftEssenceIcons'));
  assert.ok(source.includes("'概念礼装'"));
  assert.ok(source.includes("'craft-essence-fold'"));
  assert.ok(source.includes('passiveIcons.concat(craftEssenceIcons)'));
});

test('概念礼装タブに専用の表示スタイルを設定する', () => {
  const css = fs.readFileSync(path.join(__dirname, '../css/class-score.css'), 'utf8');
  assert.ok(css.includes('.craft-essence-fold > summary'));
  assert.ok(css.includes('.craft-essence-fold .buff-icon img'));
});

console.log('\n概念礼装状態タブテストに合格しました。');