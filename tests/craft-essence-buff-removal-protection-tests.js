'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants.js');
require('../js/craft-essences.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
require('../js/np-card-trigger-removal-effects.js');
require('../js/defense-buff-removal-effects.js');
const CRAFT_ESSENCE_EFFECTS = require('../js/craft-essence-effects.js');

function enemy() {
  return {
    enabled: true,
    name: '強化解除検証敵',
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

function makeEngine() {
  const engine = new BattleEngine({
    seed: 20260723,
    party: [{
      servantId: 'fenrir',
      skillLevel: 10,
      craftEssenceId: 'blackGrail'
    }],
    enemies: [enemy()],
    startingStars: 0
  });
  engine.rng = () => 0;
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

test('概念礼装の常時効果とデメリットは強化解除で消えない', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const craftEssenceStatuses = actor.statuses.filter(
    (status) => status.sourceType === 'craftEssence'
  );

  assert.deepStrictEqual(
    craftEssenceStatuses.map((status) => status.type).sort(),
    ['hpLossPerTurn', 'npPowerUp']
  );

  const normalBuff = engine._addStatus(
    actor,
    { type: 'attackUp', duration: 3 },
    30,
    '通常の攻撃力アップ'
  );

  engine._applyEffect({ type: 'buffClear', target: 'self' }, actor, actor.id, {});

  assert.strictEqual(actor.statuses.includes(normalBuff), false, '通常の強化は解除される');
  assert.strictEqual(
    actor.statuses.some((status) => status.type === 'npPowerUp' && status.sourceType === 'craftEssence'),
    true,
    '概念礼装の宝具威力アップは残る'
  );
  assert.strictEqual(
    actor.statuses.some((status) => status.type === 'hpLossPerTurn' && status.sourceType === 'craftEssence'),
    true,
    '概念礼装のデメリットも残る'
  );
  assert.strictEqual(
    actor.statuses.filter((status) => status.sourceType === 'craftEssence').every((status) => status.passive === false),
    true,
    '強化解除処理後に一時保護用フラグを残さない'
  );
});

test('概念礼装由来の防御強化は防御強化解除で消えない', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const craftEssenceDefense = {
    type: 'defenseUp',
    value: 25,
    source: '検証用概念礼装',
    sourceType: 'craftEssence',
    craftEssenceId: 'testDefenseCraftEssence',
    remaining: -1,
    uses: null,
    debuff: false,
    passive: false
  };
  actor.statuses.push(craftEssenceDefense);

  const normalDefense = engine._addStatus(
    actor,
    { type: 'defenseUp', duration: 3 },
    30,
    '通常の防御力アップ'
  );

  const result = engine._applyEffect(
    { type: 'defenseBuffClear', target: 'self' },
    actor,
    actor.id,
    {}
  );

  assert.strictEqual(actor.statuses.includes(normalDefense), false, '通常の防御強化は解除される');
  assert.strictEqual(actor.statuses.includes(craftEssenceDefense), true, '概念礼装の防御強化は残る');
  assert.strictEqual(craftEssenceDefense.passive, false, '一時保護用フラグを元へ戻す');
  assert.strictEqual(result.results[0].removed, 1, '解除数へ概念礼装効果を含めない');
});

test('概念礼装効果の識別APIを公開する', () => {
  assert.ok(CRAFT_ESSENCE_EFFECTS.buffRemovalEffectTypes.includes('buffClear'));
  assert.ok(CRAFT_ESSENCE_EFFECTS.buffRemovalEffectTypes.includes('defenseBuffClear'));
  assert.strictEqual(
    CRAFT_ESSENCE_EFFECTS.isCraftEssenceStatus({ sourceType: 'craftEssence' }),
    true
  );
  assert.strictEqual(
    CRAFT_ESSENCE_EFFECTS.isCraftEssenceStatus({ sourceType: 'servantSkill' }),
    false
  );
  assert.strictEqual(DATA.craftEssences.blackGrail.id, 'blackGrail');
});

console.log('\n概念礼装の強化解除保護テストに合格しました。');
