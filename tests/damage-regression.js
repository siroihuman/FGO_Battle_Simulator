'use strict';
const { BattleEngine } = require('../js/engine.js');

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
  console.log(`PASS ${label}: ${actual}`);
}

const config = {
  seed: 1,
  party: [{
    servantId: 'fenrir', ascension: '120', fouHp: 2000, fouAtk: 2000,
    npLevel: 5, skillLevel: 10, startingNp: 100, craftEssenceId: 'none'
  }],
  waves: [{ enabled: true, enemies: [{
    enabled: true, name: '検証用エネミー', classId: 'saber', attribute: 'man',
    // 「人の力」を特性欄へ重複入力しなくても、attribute: man から判定されることを検証する。
    traits: ['神性'], hp: 9999999, attack: 1, dtdr: 1, deathRate: 0,
    chargeMax: 3, critRate: 0
  }] }]
};

const engine = new BattleEngine(config);
const actor = engine.state.allies[0];
const target = engine.state.enemies[0];

// 狂化A+のBuster 9%と合わせて119%。
actor.statuses.push({ type: 'cardUp', card: 'buster', value: 110, remaining: 1 });
actor.statuses.push({ type: 'traitPowerUp', trait: '神性', value: 30, remaining: 1 });
actor.statuses.push({ type: 'traitPowerUp', trait: '人の力', value: 100, remaining: 1 });

// 最低乱数0.900を固定。
engine.rng = () => 0;
const damage = engine._calculateAttackTotal(
  actor,
  target,
  { type: 'np', card: 'buster', position: 0, critical: false },
  { firstBonuses: { buster: false, arts: false, quick: false }, busterChain: false }
);

assertEqual(actor.atk, 18816, 'Lv.120＋ATKフォウ2000');
assertEqual(damage, 242876, 'フェンリル宝具Lv.5・最低乱数');

// 敵が途中Hitで倒れても、5Hit全体の総ダメージが返ることを検証。
const lowHpConfig = JSON.parse(JSON.stringify(config));
lowHpConfig.waves[0].enemies[0].hp = 100000;
const lowHpEngine = new BattleEngine(lowHpConfig);
const lowHpActor = lowHpEngine.state.allies[0];
const lowHpTarget = lowHpEngine.state.enemies[0];
lowHpActor.statuses.push({ type: 'cardUp', card: 'buster', value: 110, remaining: 1 });
lowHpActor.statuses.push({ type: 'traitPowerUp', trait: '神性', value: 30, remaining: 1 });
lowHpActor.statuses.push({ type: 'traitPowerUp', trait: '人の力', value: 100, remaining: 1 });
lowHpEngine.rng = () => 0;
const resolved = lowHpEngine._resolveAttackOnTarget(
  lowHpActor,
  lowHpTarget,
  { type: 'np', card: 'buster', position: 0, critical: false },
  { firstBonuses: { buster: false, arts: false, quick: false }, busterChain: false }
);
assertEqual(resolved.damage, 242876, '途中撃破時も5Hit総ダメージを返す');
assertEqual(resolved.actualHpDamage, 100000, '実HP減少量は敵残HPまで');
