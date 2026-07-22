'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
const CARD_BUFFS = require('../js/card-buff-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'カード効果検証敵',
    classId: 'archer',
    attribute: 'sky',
    traits: ['servant'],
    hp: 99999999,
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

function makeEngine(servantId = 'fenrir') {
  return new BattleEngine({
    seed: 314058,
    startingStars: 0,
    party: [{ servantId, skillLevel: 10, npLevel: 1, startingNp: 0 }],
    enemies: [baseEnemy()]
  });
}

function chainContext() {
  return {
    firstBonuses: { quick: false, arts: false, buster: false },
    busterChain: false,
    artsChain: false,
    quickChain: false,
    mighty: false
  };
}

function addStatus(engine, unit, effect, source = 'カード効果テスト') {
  return engine._addStatus(unit, effect, effect.value || 0, source);
}

function removeStatus(unit, status) {
  unit.statuses = unit.statuses.filter((entry) => entry !== status);
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

test('カード別アイコン定義を登録', () => {
  assert.deepStrictEqual(CARD_BUFFS.icons, {
    quick: { up: 'Quickupstatus.webp', down: 'Quickdown.webp' },
    arts: { up: 'Artsupstatus.webp', down: 'Artsdown.webp' },
    buster: { up: 'Busterupstatus.webp', down: 'Busterdown.webp' },
    extra: { up: 'Extraattackup.webp', down: 'Extraattackup.webp' }
  });
});

test('Q/A/Bカード性能アップブースト用アイコンを登録', () => {
  assert.deepStrictEqual(CARD_BUFFS.boostIcons, {
    quick: 'Quickupboost.webp', arts: 'Artsupboost.webp', buster: 'Busterupboost.webp'
  });
  assert.deepStrictEqual(DATA.cardStatusIcons.boost, CARD_BUFFS.boostIcons);
});

test('Q/A/B/Ex性能アップとQ/A/B性能ダウンに個別アイコンを表示', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const definitions = [
    ['cardUp', 'quick', 'Quickupstatus.webp'],
    ['cardUp', 'arts', 'Artsupstatus.webp'],
    ['cardUp', 'buster', 'Busterupstatus.webp'],
    ['cardUp', 'extra', 'Extraattackup.webp'],
    ['cardDown', 'quick', 'Quickdown.webp'],
    ['cardDown', 'arts', 'Artsdown.webp'],
    ['cardDown', 'buster', 'Busterdown.webp']
  ];
  definitions.forEach(([type, card]) => addStatus(engine, actor, { type, card, value: 20, duration: 3, debuff: type === 'cardDown' }, '表示テスト'));
  const summary = engine.getStatusSummary(actor.id).filter((status) => status.source === '表示テスト');
  definitions.forEach(([type, card, icon]) => {
    const status = summary.find((entry) => entry.type === type && entry.card === card);
    assert.ok(status, `${type}/${card}`);
    assert.strictEqual(status.statusIcon, icon);
  });
});

test('性能アップと威力アップは同じアイコンでも別状態として表示', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  addStatus(engine, actor, { type: 'cardUp', card: 'quick', value: 20, duration: 3 }, '別枠テスト');
  addStatus(engine, actor, { type: 'cardPowerUp', card: 'quick', value: 30, duration: 3 }, '別枠テスト');
  const summary = engine.getStatusSummary(actor.id).filter((status) => status.source === '別枠テスト');
  const performance = summary.find((status) => status.type === 'cardUp');
  const power = summary.find((status) => status.type === 'cardPowerUp');
  assert.ok(performance && power);
  assert.strictEqual(performance.name, 'Quickカード性能アップ');
  assert.strictEqual(power.name, 'Quickカード威力アップ');
  assert.strictEqual(performance.statusIcon, 'Quickupstatus.webp');
  assert.strictEqual(power.statusIcon, 'Quickupstatus.webp');
});

test('クラススキルの固有アイコンは維持しクラススコアはカード別アイコンを使う', () => {
  const engine = makeEngine('koyanskayaLight');
  const actor = engine.getState().allies[0];
  const summary = engine.getStatusSummary(actor.id);
  const riding = summary.find((status) => status.source === '騎乗 B' && status.type === 'cardUp');
  const scoreQuick = summary.find((status) => status.source === 'クラススコア：Quickカード性能アップ');
  assert.ok(riding && scoreQuick);
  assert.strictEqual(riding.statusIcon, 'class-riding.png');
  assert.strictEqual(scoreQuick.statusIcon, 'Quickupstatus.webp');
});

test('性能アップはカードごとの副次効果を持ち、威力アップはダメージだけを上げる', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  const context = chainContext();
  engine.rng = () => 0.5;

  ['quick', 'arts', 'extra'].forEach((card) => {
    const action = { type: card === 'extra' ? 'extra' : 'card', card, position: 0, critical: false };
    const baseNp = engine._cardNpPerHit(actor, target, action, context, false);
    const power = addStatus(engine, actor, { type: 'cardPowerUp', card, value: 50, duration: 3 });
    assert.strictEqual(engine._cardNpPerHit(actor, target, action, context, false), baseNp, `${card}威力アップはNPへ影響しない`);
    removeStatus(actor, power);
    const performance = addStatus(engine, actor, { type: 'cardUp', card, value: 50, duration: 3 });
    assert.ok(engine._cardNpPerHit(actor, target, action, context, false) > baseNp, `${card}性能アップはNPを増加`);
    removeStatus(actor, performance);
  });

  ['quick', 'extra'].forEach((card) => {
    const action = { type: card === 'extra' ? 'extra' : 'card', card, position: 0, critical: false };
    const baseStars = engine._starRatePerHit(actor, target, action, context, false);
    const power = addStatus(engine, actor, { type: 'cardPowerUp', card, value: 50, duration: 3 });
    assert.strictEqual(engine._starRatePerHit(actor, target, action, context, false), baseStars, `${card}威力アップはスターへ影響しない`);
    removeStatus(actor, power);
    const performance = addStatus(engine, actor, { type: 'cardUp', card, value: 50, duration: 3 });
    assert.ok(engine._starRatePerHit(actor, target, action, context, false) > baseStars, `${card}性能アップはスター発生率を増加`);
    removeStatus(actor, performance);
  });

  const busterAction = { type: 'card', card: 'buster', position: 0, critical: false };
  const baseBusterStars = engine._starRatePerHit(actor, target, busterAction, context, false);
  const busterPerformance = addStatus(engine, actor, { type: 'cardUp', card: 'buster', value: 100, duration: 3 });
  assert.strictEqual(engine._starRatePerHit(actor, target, busterAction, context, false), baseBusterStars);
  removeStatus(actor, busterPerformance);

  const quickAction = { type: 'card', card: 'quick', position: 0, critical: false };
  const baseDamage = engine._calculateAttackTotal(actor, target, quickAction, context);
  const power = addStatus(engine, actor, { type: 'cardPowerUp', card: 'quick', value: 50, duration: 3 });
  assert.ok(engine._calculateAttackTotal(actor, target, quickAction, context) > baseDamage);
  removeStatus(actor, power);
});

test('性能ダウンはNP・スターを含めて低下し、威力ダウンはダメージだけを下げる', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const target = engine.getState().enemies[0];
  const context = chainContext();
  engine.rng = () => 0.5;
  const action = { type: 'card', card: 'quick', position: 0, critical: false };
  const baseNp = engine._cardNpPerHit(actor, target, action, context, false);
  const baseStars = engine._starRatePerHit(actor, target, action, context, false);
  const baseDamage = engine._calculateAttackTotal(actor, target, action, context);

  const performanceDown = addStatus(engine, actor, { type: 'cardDown', card: 'quick', value: 10, duration: 3, debuff: true });
  assert.ok(engine._cardNpPerHit(actor, target, action, context, false) < baseNp);
  assert.ok(engine._starRatePerHit(actor, target, action, context, false) < baseStars);
  assert.ok(engine._calculateAttackTotal(actor, target, action, context) < baseDamage);
  removeStatus(actor, performanceDown);

  const powerDown = addStatus(engine, actor, { type: 'cardPowerDown', card: 'quick', value: 10, duration: 3, debuff: true });
  assert.strictEqual(engine._cardNpPerHit(actor, target, action, context, false), baseNp);
  assert.strictEqual(engine._starRatePerHit(actor, target, action, context, false), baseStars);
  assert.ok(engine._calculateAttackTotal(actor, target, action, context) < baseDamage);
});

test('クラススコア定義もカード別アイコンを持つ', () => {
  const icons = Object.fromEntries(DATA.classScore.effects.map((entry) => [entry.id, entry.icon]));
  assert.strictEqual(icons.quickCardUp, 'Quickupstatus.webp');
  assert.strictEqual(icons.artsCardUp, 'Artsupstatus.webp');
  assert.strictEqual(icons.busterCardUp, 'Busterupstatus.webp');
  assert.strictEqual(icons.extraAttackUp, 'Extraattackup.webp');
});

console.log('\nカード性能・威力効果テストに合格しました。');