'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine, classAffinity, attributeAffinity, effectiveCooldown } = require('../js/engine.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'テストエネミー',
    classId: 'archer',
    attribute: 'sky',
    traits: ['servant', 'divine'],
    hp: 1000000,
    attack: 1,
    dtdr: 1,
    deathRate: 20,
    instantDeathRate: 0,
    chargeMax: 9,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(party, enemy = baseEnemy(), extra = {}) {
  return new BattleEngine({ seed: 314058, startingStars: 0, party, enemies: [enemy], ...extra });
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

test('実装サーヴァントは8騎', () => {
  assert.deepStrictEqual(Object.keys(DATA.servants).sort(), ['aliceLiddell', 'artoriaCaster', 'fenrir', 'juanaMadQueen', 'koyanskayaLight', 'skadiCaster', 'skadiRuler', 'yaoyaOshichi']);
});

test('各サーヴァントの保有スキルは3つ', () => {
  Object.values(DATA.servants).forEach((servant) => {
    assert.strictEqual(servant.skills.length, 3, servant.name);
    assert.strictEqual(servant.skillIcons.length, 3, servant.name);
  });
});

test('全スキルLv配列は10段階', () => {
  Object.values(DATA.servants).forEach((servant) => {
    servant.skills.forEach((skill) => {
      skill.effects.forEach((effect) => {
        if (effect.values) assert.strictEqual(effect.values.length, 10, `${servant.name}/${skill.name}`);
        if (effect.ocValues) assert.strictEqual(effect.ocValues.length, 5, `${servant.name}/${skill.name}`);
      });
    });
  });
});

test('クラス相性と属性相性の基本値', () => {
  assert.strictEqual(classAffinity('assassin', 'rider'), 2);
  assert.strictEqual(classAffinity('berserker', 'foreigner'), 0.5);
  assert.strictEqual(attributeAffinity('beast', 'star'), 1.1);
  assert.strictEqual(attributeAffinity('sky', 'earth'), 1.1);
});

test('スキルCTはLv6とLv10で短縮', () => {
  assert.strictEqual(effectiveCooldown(8, 1), 8);
  assert.strictEqual(effectiveCooldown(8, 6), 7);
  assert.strictEqual(effectiveCooldown(8, 10), 6);
});

test('光のコヤンスカヤS1はNP50とCT2短縮', () => {
  const engine = makeEngine([
    { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 },
    { servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 0 }
  ]);
  const target = engine.getState().allies[1];
  target.cooldowns = [5, 4, 3];
  const result = engine.useSkill('ally-1', 0, 'ally-2');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(target.np, 50);
  assert.deepStrictEqual(target.cooldowns, [3, 2, 1]);
  assert.strictEqual(target.hp, target.maxHp - 1000);
});

test('光のコヤンスカヤS2はスター20と人属性特攻を付与', () => {
  const engine = makeEngine([{ servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 }]);
  const ally = engine.getState().allies[0];
  const result = engine.useSkill(ally.id, 1, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine.getState().stars, 20);
  assert.strictEqual(ally.statuses.find((s) => s.type === 'attributePowerUp').value, 50);
  assert.strictEqual(ally.statuses.find((s) => s.type === 'busterNormalNp').value, 10);
});

test('フェンリルS2はNP50とOC2段階アップ', () => {
  const engine = makeEngine([{ servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 0 }]);
  const ally = engine.getState().allies[0];
  const result = engine.useSkill(ally.id, 1, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(ally.np, 50);
  assert.strictEqual(ally.statuses.find((s) => s.type === 'ocUp').value, 2);
  assert.strictEqual(ally.statuses.find((s) => s.type === 'attackUp').value, 30);
});

test('クリティカル集中の乱数補正は+50が1枚、+20が2枚、+0が2枚', () => {
  const engine = makeEngine([
    { servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 0 },
    { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 },
    { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 }
  ]);
  const bonuses = engine.getState().hand.map((card) => card.randomWeightBonus).sort((a, b) => a - b);
  assert.deepStrictEqual(bonuses, [0, 0, 20, 20, 50]);
});

test('フェンリル宝具の天属性特攻は非対象より高い', () => {
  const party = [{ servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 100 }];
  const skyEngine = makeEngine(party, baseEnemy({ attribute: 'sky' }));
  const manEngine = makeEngine(party, baseEnemy({ attribute: 'man' }));
  const skyActor = skyEngine.getState().allies[0];
  const manActor = manEngine.getState().allies[0];
  const context = { firstBonuses: { buster: true, arts: false, quick: false }, busterChain: false, artsChain: false, quickChain: false, mighty: false };
  skyEngine._applyEffect(skyActor.data.np.before[0], skyActor, skyActor.id, { oc: 1, level: 10 });
  manEngine._applyEffect(manActor.data.np.before[0], manActor, manActor.id, { oc: 1, level: 10 });
  const skyDamage = skyEngine._calculateAttackTotal(skyActor, skyEngine.getState().enemies[0], { type: 'np', card: 'buster', position: 0 }, context);
  const manDamage = manEngine._calculateAttackTotal(manActor, manEngine.getState().enemies[0], { type: 'np', card: 'buster', position: 0 }, context);
  assert.ok(skyDamage > manDamage * 1.4, `${skyDamage} vs ${manDamage}`);
});

test('即死耐性を含む即死処理が動作', () => {
  const engine = makeEngine(
    [{ servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 }],
    baseEnemy({ instantDeathRate: 1000 })
  );
  const enemy = engine.getState().enemies[0];
  const ally = engine.getState().allies[0];
  const result = engine._applyInstantDeath(enemy, ally);
  assert.strictEqual(result, true);
  assert.strictEqual(ally.alive, false);
});

test('NPが99%以上になった場合は100%へ補正される', () => {
  const engine = makeEngine([{ servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 98.5 }]);
  const ally = engine.getState().allies[0];
  engine._addNp(ally, 0.5, true);
  assert.strictEqual(ally.np, 100);
});

test('スター集中度アップ後はカード配分が再計算される', () => {
  const engine = makeEngine([{ servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 0 }], baseEnemy(), { startingStars: 50 });
  const ally = engine.getState().allies[0];
  const busterCards = engine.getState().hand.filter((card) => card.ownerId === ally.id && card.card === 'buster');
  if (!busterCards.length) return;
  const before = busterCards.reduce((sum, card) => sum + card.stars, 0);
  const result = engine.useSkill(ally.id, 2, ally.id);
  assert.strictEqual(result.ok, true);
  const after = busterCards.reduce((sum, card) => sum + card.stars, 0);
  assert.ok(after >= before);
});

test('通常の3枚選択から1ターンを完走できる', () => {
  const engine = makeEngine([
    { servantId: 'fenrir', skillLevel: 10, npLevel: 1, startingNp: 0 },
    { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 },
    { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1, startingNp: 0 }
  ], baseEnemy({ hp: 9999999, attack: 1, chargeMax: 9 }));
  engine.getState().hand.slice(0, 3).forEach((card) => engine.toggleCard(card.id));
  const result = engine.executeCommandChain();
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine.getState().turn, 2);
  assert.strictEqual(engine.getState().phase, 'command');
  assert.strictEqual(engine.getState().hand.length, 5);
});

console.log('\n全テストに合格しました。');
