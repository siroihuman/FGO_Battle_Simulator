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

test('実装サーヴァントは10騎', () => {
  assert.deepStrictEqual(Object.keys(DATA.servants).sort(), ['aliceLiddell', 'artoriaCaster', 'fenrir', 'inugamiGyobu', 'juanaMadQueen', 'koyanskayaLight', 'lucifera', 'skadiCaster', 'skadiRuler', 'yaoyaOshichi']);
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
});

test('スキルCTはLv6とLv10で短縮される', () => {
  assert.strictEqual(effectiveCooldown(8, 1), 8);
  assert.strictEqual(effectiveCooldown(8, 6), 7);
  assert.strictEqual(effectiveCooldown(8, 10), 6);
});

test('通常のスキル使用とNPチャージ', () => {
  const engine = makeEngine([{ servantId: 'inugamiGyobu', skillLevel: 10, npLevel: 1 }]);
  const ally = engine.getState().allies[0];
  const result = engine.useSkill(ally.id, 0, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(ally.np, 30);
  assert.strictEqual(ally.cooldowns[0], 5);
});
