'use strict';

const DATA = require('../js/data.js');
const CLASS_SCORE = require('../js/class-score.js');
const { BattleEngine } = require('../js/engine.js');

function assert(condition, label) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}

function scoreStatuses(ally) {
  return ally.statuses.filter((status) =>
    status.passive && String(status.source || '').startsWith(CLASS_SCORE.sourcePrefix)
  );
}

function total(statuses, type, card) {
  return statuses
    .filter((status) => status.type === type && (!card || status.card === card))
    .reduce((sum, status) => sum + Number(status.value || 0), 0);
}

assert(CLASS_SCORE.fullyUnlocked === true, 'クラススコアは常時全開放として登録');
assert(CLASS_SCORE.effects.length === 10, '戦闘へ適用するクラススコア効果は10種類');
assert(CLASS_SCORE.classScoreGroup('ruler') === 'extra1', 'ルーラーはEXTRA Iへ分類');
assert(CLASS_SCORE.classScoreGroup('foreigner') === 'extra2', 'フォーリナーはEXTRA IIへ分類');

CLASS_SCORE.applyAll();
CLASS_SCORE.applyAll();
Object.values(DATA.servants).forEach((servant) => {
  const entries = servant.passives.filter((passive) => passive.category === 'classScore');
  assert(entries.length === 10, `${servant.name}へ重複なしでクラススコアを適用`);
  servant.passives
    .filter((passive) => passive.category !== 'classScore' && passive.icon)
    .forEach((passive) => {
      passive.effects.forEach((effect) => {
        assert(Boolean(effect.statusIcon), `${servant.name}「${passive.name}」の表示アイコンを反映`);
      });
    });
});

const engine = new BattleEngine({
  seed: 1,
  party: [{
    servantId: 'koyanskayaLight',
    startingNp: 0,
    npLevel: 1,
    skillLevel: 10,
    craftEssenceId: 'none'
  }],
  waves: [{
    enabled: true,
    enemies: [{
      enabled: true,
      name: '検証敵',
      classId: 'saber',
      attribute: 'man',
      traits: [],
      hp: 1000000,
      attack: 1,
      dtdr: 1,
      deathRate: 0,
      chargeMax: 3,
      critRate: 0
    }]
  }]
});

const ally = engine.state.allies[0];
const statuses = scoreStatuses(ally);
assert(statuses.length === 10, '戦闘開始時にクラススコア効果を10件生成');
assert(total(statuses, 'cardUp', 'buster') === 20, 'Buster性能20%');
assert(total(statuses, 'cardUp', 'arts') === 20, 'Arts性能20%');
assert(total(statuses, 'cardUp', 'quick') === 20, 'Quick性能20%');
assert(total(statuses, 'cardUp', 'extra') === 50, 'Extra Attack性能50%');
assert(total(statuses, 'cardCritUp', 'buster') === 20, 'Busterクリティカル20%');
assert(total(statuses, 'cardCritUp', 'arts') === 40, 'Artsクリティカル40%');
assert(total(statuses, 'cardCritUp', 'quick') === 60, 'Quickクリティカル60%');
assert(total(statuses, 'starRateUp') === 50, 'スター発生率50%');
assert(total(statuses, 'critUp') === 10, 'クリティカル威力10%');
assert(total(statuses, 'npPowerUp') === 10, '宝具威力10%');
assert(statuses.every((status) => Boolean(status.statusIcon)), '全クラススコア効果に表示アイコンを設定');

console.log('All class score tests passed.');
