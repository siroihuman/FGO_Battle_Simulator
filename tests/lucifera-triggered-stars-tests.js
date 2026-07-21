'use strict';

const assert = require('assert');
require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/common-effects-extra-attack.js');
require('../js/card-buff-effects.js');
require('../js/defense-resistance-effects.js');
require('../js/combat-defense-effects.js');
require('../js/hp-loss-effects.js');
require('../js/turn-field-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/trigger-lifecycle-effects.js');
require('../js/np-card-trigger-removal-effects.js');
require('../js/class-affinity-special-effects.js');
const TRIGGER_REWARDS = require('../js/trigger-star-reward-effects.js');

const chainContext = {
  firstBonuses: { buster: false, arts: false, quick: false },
  busterChain: false,
  artsChain: false,
  quickChain: false,
  mighty: false
};

function makeEngine() {
  const engine = new BattleEngine({
    seed: 280315,
    party: [
      { servantId: 'lucifera', skillLevel: 10, npLevel: 1, startingNp: 0 },
      { servantId: 'lucifera', skillLevel: 10, npLevel: 1, startingNp: 0 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 100 }
    ],
    enemies: [{
      enabled: true,
      name: 'Wルシフェラ検証敵',
      classId: 'caster',
      attribute: 'earth',
      traits: ['サーヴァント'],
      hp: 99999999,
      attack: 1,
      dtdr: 1,
      deathRate: 0,
      instantDeathRate: 0,
      chargeMax: 9,
      critRate: 0,
      npTarget: 'single'
    }]
  });
  engine.rng = () => 0.5;
  return engine;
}

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('commandフェイズ中のスター獲得は現在ターンへ加算する', () => {
  const engine = makeEngine();
  const koyanskaya = engine.getState().allies[2];

  engine._applyEffect({ type: 'stars', target: 'party', value: 20 }, koyanskaya, koyanskaya.id, {});

  assert.strictEqual(engine.getState().stars, 20);
  assert.strictEqual(engine.getState().nextStars, 0);
});

test('WルシフェラS1のafterNpスター15個×2を次ターン分へ累積する', () => {
  const engine = makeEngine();
  const [lucifera1, lucifera2, koyanskaya] = engine.getState().allies;

  assert.strictEqual(engine.useSkill(koyanskaya.id, 2, koyanskaya.id).ok, true);
  assert.strictEqual(engine.useSkill(lucifera1.id, 0, koyanskaya.id).ok, true);
  assert.strictEqual(engine.useSkill(lucifera2.id, 0, koyanskaya.id).ok, true);

  const afterNpTriggers = koyanskaya.statuses.filter((status) =>
    status.type === 'triggerEffect' && status.event === 'afterNp'
  );
  assert.strictEqual(afterNpTriggers.length, 2);

  engine._resolveAttackOnTarget = () => ({
    damage: 0,
    actualHpDamage: 0,
    np: 0,
    stars: 24
  });
  engine.getState().phase = 'playerAttack';
  koyanskaya.np = 100;
  engine._executeNp({ type: 'np', actorId: koyanskaya.id, card: 'buster' }, chainContext, 0);

  assert.strictEqual(engine.getState().stars, 0);
  assert.strictEqual(engine.getState().nextStars, 54);
  assert.strictEqual(koyanskaya.statuses.some((status) => afterNpTriggers.includes(status)), false);

  const triggeredStarLogs = engine.getState().logs.filter((entry) =>
    String(entry.message || entry.text || entry).includes('スターを15個獲得（次ターン）。')
  );
  assert.strictEqual(triggeredStarLogs.length, 2);

  engine._finishTurn();
  assert.strictEqual(engine.getState().stars, 50);
  assert.strictEqual(engine.getState().nextStars, 0);
});

test('ターン終了時強化解除状態はDelayedDebuff.webpを使用する', () => {
  const engine = makeEngine();
  const lucifera = engine.getState().allies[0];
  const koyanskaya = engine.getState().allies[2];

  assert.strictEqual(engine.useSkill(lucifera.id, 2, koyanskaya.id).ok, true);
  const status = koyanskaya.statuses.find((entry) =>
    entry.type === 'triggerEffect' && entry.event === 'turnEnd'
  );

  assert.ok(status);
  assert.strictEqual(status.statusIcon, 'DelayedDebuff.webp');
  const summary = engine.getStatusSummary(koyanskaya.id).find((entry) =>
    entry.type === 'triggerEffect' && entry.source === lucifera.name && entry.remaining === 1
  );
  assert.ok(summary);
  assert.strictEqual(summary.statusIcon, 'DelayedDebuff.webp');
});

test('共通APIを公開する', () => {
  assert.strictEqual(TRIGGER_REWARDS.phaseRule.command, 'currentTurn');
  assert.strictEqual(TRIGGER_REWARDS.phaseRule.other, 'nextTurn');
  assert.strictEqual(TRIGGER_REWARDS.delayedBuffClearIcon, 'DelayedDebuff.webp');
});

console.log('\nWルシフェラのスター獲得・遅延デバフアイコン回帰テストに合格しました。');
