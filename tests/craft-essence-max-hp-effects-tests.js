'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants.js');
const CRAFT_ESSENCES = require('../js/craft-essences.js');
const { BattleEngine } = require('../js/engine.js');
const CRAFT_ESSENCE_EFFECTS = require('../js/craft-essence-effects.js');

function enemy() {
  return {
    enabled: true,
    name: '最大HP礼装検証敵',
    classId: 'saber',
    attribute: 'man',
    traits: ['サーヴァント'],
    hp: 99999999,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 9,
    critRate: 0,
    npTarget: 'single'
  };
}

function makeEngine(party) {
  const engine = new BattleEngine({
    seed: 20260723,
    party,
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

test('理想の王聖と千年黄金樹を最大解放・最大レベル値で登録する', () => {
  assert.deepStrictEqual(
    {
      id: CRAFT_ESSENCES.idealHolyKing.id,
      name: CRAFT_ESSENCES.idealHolyKing.name,
      atk: CRAFT_ESSENCES.idealHolyKing.atk,
      hp: CRAFT_ESSENCES.idealHolyKing.hp,
      effect: CRAFT_ESSENCES.idealHolyKing.effects[0]
    },
    {
      id: 'idealHolyKing',
      name: '理想の王聖',
      atk: 1000,
      hp: 1600,
      effect: { type: 'partyMaxHpAtBattleStart', target: 'partyIncludingReserve', value: 1200 }
    }
  );

  assert.deepStrictEqual(
    {
      id: CRAFT_ESSENCES.millenniumGoldenTree.id,
      name: CRAFT_ESSENCES.millenniumGoldenTree.name,
      atk: CRAFT_ESSENCES.millenniumGoldenTree.atk,
      hp: CRAFT_ESSENCES.millenniumGoldenTree.hp,
      effect: CRAFT_ESSENCES.millenniumGoldenTree.effects[0]
    },
    {
      id: 'millenniumGoldenTree',
      name: '千年黄金樹',
      atk: 0,
      hp: 2250,
      effect: { type: 'maxHpGrowthPerPlayerTurn', value: 300, maxValue: 3000 }
    }
  );
});

test('理想の王聖は控え装備分を含めて味方全体の最大HPと現在HPへ加算し、複数枚は重複する', () => {
  const baseline = makeEngine([
    { servantId: 'fenrir' },
    { servantId: 'fenrir' },
    { servantId: 'fenrir' },
    { servantId: 'fenrir' }
  ]);
  const baselineHp = baseline.getState().allies.map((ally) => ally.maxHp);

  const engine = makeEngine([
    { servantId: 'fenrir', craftEssenceId: 'idealHolyKing' },
    { servantId: 'fenrir' },
    { servantId: 'fenrir' },
    { servantId: 'fenrir', craftEssenceId: 'idealHolyKing' }
  ]);
  const allies = engine.getState().allies;
  const totalPartyBonus = 2400;

  assert.strictEqual(allies[3].frontline, false, '4騎目は控えとして生成される');
  allies.forEach((ally, index) => {
    const equipmentHp = [0, 3].includes(index) ? 1600 : 0;
    assert.strictEqual(ally.maxHp, baselineHp[index] + equipmentHp + totalPartyBonus);
    assert.strictEqual(ally.hp, ally.maxHp, '現在HPも最大HPと同量増加する');
    assert.strictEqual(ally.craftEssencePartyMaxHpBonus, totalPartyBonus);
    assert.strictEqual(
      ally.statuses.some((status) => status.type === 'partyMaxHpAtBattleStart'),
      false,
      '戦闘開始時の即時効果を継続状態として残さない'
    );
  });

  const before = allies.map((ally) => ally.maxHp);
  assert.strictEqual(CRAFT_ESSENCE_EFFECTS.applyPartyMaxHpAtBattleStart(engine), 0, '戦闘開始時効果は二重適用しない');
  assert.deepStrictEqual(allies.map((ally) => ally.maxHp), before);

  allies[0].hp = 0;
  allies[0].alive = false;
  assert.strictEqual(allies[1].maxHp, baselineHp[1] + totalPartyBonus, '装備者が戦闘不能になっても適用済み効果は維持する');
});

test('千年黄金樹は味方攻撃ターン終了時、敵攻撃より先に最大HPと現在HPを300増加する', () => {
  const baseline = makeEngine([{ servantId: 'fenrir' }]);
  const baseMaxHp = baseline.getState().allies[0].maxHp;
  const engine = makeEngine([{ servantId: 'fenrir', craftEssenceId: 'millenniumGoldenTree' }]);
  const actor = engine.getState().allies[0];
  const initialMaxHp = baseMaxHp + 2250;
  const growthStatus = actor.statuses.find((status) => status.type === 'maxHpGrowthPerPlayerTurn');

  assert.strictEqual(actor.maxHp, initialMaxHp);
  assert.ok(growthStatus);
  assert.strictEqual(growthStatus.sourceType, 'craftEssence');
  assert.strictEqual(growthStatus.unremovable, true);

  let maxHpAtEnemyAttack = null;
  engine._enemyAttackDamage = (_enemy, target) => {
    maxHpAtEnemyAttack = target.maxHp;
    return 0;
  };

  engine._performEnemyTurn();

  assert.strictEqual(maxHpAtEnemyAttack, initialMaxHp + 300, '敵攻撃処理より先に最大HPを増加する');
  assert.strictEqual(actor.maxHp, initialMaxHp + 300);
  assert.strictEqual(actor.hp, initialMaxHp + 300);
  assert.strictEqual(growthStatus.accumulated, 300);
});

test('千年黄金樹は累計3000で停止し、同一ターンには二重発動しない', () => {
  const engine = makeEngine([{ servantId: 'fenrir', craftEssenceId: 'millenniumGoldenTree' }]);
  const actor = engine.getState().allies[0];
  const initialMaxHp = actor.maxHp;
  engine._enemyAttackDamage = () => 0;

  const first = CRAFT_ESSENCE_EFFECTS.applyMaxHpGrowthAtPlayerTurnEnd(engine);
  const duplicate = CRAFT_ESSENCE_EFFECTS.applyMaxHpGrowthAtPlayerTurnEnd(engine);
  assert.strictEqual(first.length, 1);
  assert.strictEqual(duplicate.length, 0);
  assert.strictEqual(actor.maxHp, initialMaxHp + 300);

  engine._finishTurn();
  for (let count = 1; count < 10; count += 1) {
    engine._performEnemyTurn();
  }
  assert.strictEqual(actor.maxHp, initialMaxHp + 3000);
  assert.strictEqual(actor.hp, initialMaxHp + 3000);

  engine._performEnemyTurn();
  assert.strictEqual(actor.maxHp, initialMaxHp + 3000, '上限到達後は増加しない');
  assert.strictEqual(
    actor.statuses.find((status) => status.type === 'maxHpGrowthPerPlayerTurn').accumulated,
    3000
  );
});

test('千年黄金樹は控え中に発動せず、前衛へ移動したターン終了時から発動する', () => {
  const engine = makeEngine([
    { servantId: 'fenrir' },
    { servantId: 'fenrir' },
    { servantId: 'fenrir' },
    { servantId: 'fenrir', craftEssenceId: 'millenniumGoldenTree' }
  ]);
  engine._enemyAttackDamage = () => 0;
  const [front, , , reserve] = engine.getState().allies;
  const initialMaxHp = reserve.maxHp;

  engine._performEnemyTurn();
  assert.strictEqual(reserve.maxHp, initialMaxHp, '控え中は最大HPが増加しない');

  const orderChange = engine.orderChange(front.id, reserve.id);
  assert.strictEqual(orderChange.ok, true);
  engine._performEnemyTurn();
  assert.strictEqual(reserve.maxHp, initialMaxHp + 300, '前衛に出た後の味方攻撃ターン終了時に増加する');
});

test('千年黄金樹の継続効果を概念礼装タブ向けの日本語名で表示する', () => {
  const engine = makeEngine([{ servantId: 'fenrir', craftEssenceId: 'millenniumGoldenTree' }]);
  const summary = engine.getStatusSummary(engine.getState().allies[0].id);
  const status = summary.find((entry) => entry.type === 'maxHpGrowthPerPlayerTurn');
  assert.ok(status);
  assert.strictEqual(status.name, '毎ターン最大HPアップ');
  assert.strictEqual(DATA.craftEssences.millenniumGoldenTree.name, '千年黄金樹');
});

console.log('\n理想の王聖・千年黄金樹の概念礼装テストに合格しました。');
