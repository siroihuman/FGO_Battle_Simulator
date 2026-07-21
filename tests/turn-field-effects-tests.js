'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
const TURN_FIELD = require('../js/turn-field-effects.js');

function baseEnemy(overrides = {}) {
  return {
    enabled: true,
    name: 'ターン・フィールド検証敵',
    classId: 'rider',
    attribute: 'sky',
    traits: ['サーヴァント'],
    hp: 99999999,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    instantDeathRate: 0,
    chargeMax: 9,
    critRate: 0,
    npTarget: 'single',
    ...overrides
  };
}

function makeEngine(options = {}) {
  const party = options.party || [
    { servantId: 'yaoyaOshichi', skillLevel: 10, npLevel: 1, startingNp: 100 }
  ];
  const config = {
    seed: 314058,
    startingStars: options.startingStars || 0,
    fieldTraits: options.fieldTraits || [],
    party,
    enemies: [baseEnemy(options.enemy)],
    ...(options.waves ? { waves: options.waves } : {})
  };
  return new BattleEngine(config);
}

function applyStarsPerTurn(engine, ally, level, values = [5, 6, 7, 8, 9, 10, 11, 12, 13, 15]) {
  return engine._applyEffect({
    type: 'starsPerTurn',
    target: 'self',
    values,
    duration: 3
  }, ally, ally.id, { level });
}

function chainContext() {
  return {
    firstBonuses: { buster: false, arts: false, quick: false },
    busterChain: false,
    artsChain: false,
    quickChain: false,
    mighty: false
  };
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

test('共通ランタイムとフィールド条件APIを登録する', () => {
  assert.ok(TURN_FIELD.conditionKinds.includes('fieldTrait'));
  assert.strictEqual(typeof BattleEngine.prototype.getFieldTraits, 'function');
  assert.strictEqual(typeof BattleEngine.prototype.hasFieldTrait, 'function');
  assert.strictEqual(typeof BattleEngine.prototype._conditionMet, 'function');
  assert.strictEqual(typeof BattleEngine.prototype._applyStarsPerTurn, 'function');
});

test('Lv.1の毎ターンスター5個を3ターン獲得し4回目は発動しない', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  applyStarsPerTurn(engine, ally, 1);

  const gained = [];
  for (let turn = 0; turn < 4; turn += 1) {
    engine._finishTurn();
    gained.push(engine.getState().stars);
  }
  assert.deepStrictEqual(gained, [5, 5, 5, 0]);
  assert.strictEqual(ally.statuses.some((status) => status.type === 'starsPerTurn'), false);
});

test('Lv.10の毎ターンスター15個を3ターン獲得する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  applyStarsPerTurn(engine, ally, 10);

  for (let turn = 0; turn < 3; turn += 1) {
    engine._finishTurn();
    assert.strictEqual(engine.getState().stars, 15);
  }
});

test('複数の毎ターンスター状態を加算し50個上限を適用する', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  engine._applyEffect({ type: 'starsPerTurn', target: 'self', value: 20, duration: 3 }, ally, ally.id, { level: 10 });
  engine._applyEffect({ type: 'starsPerTurn', target: 'self', value: 15, duration: 3 }, ally, ally.id, { level: 10 });
  engine.getState().nextStars = 30;
  engine._finishTurn();
  assert.strictEqual(engine.getState().stars, 50);
});

test('控えまたは戦闘不能の対象から毎ターンスターを獲得しない', () => {
  const engine = makeEngine({
    party: [
      { servantId: 'fenrir', skillLevel: 10, npLevel: 1 },
      { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 },
      { servantId: 'aliceLiddell', skillLevel: 10, npLevel: 1 },
      { servantId: 'artoriaCaster', skillLevel: 10, npLevel: 1 }
    ]
  });
  const reserve = engine.getState().allies[3];
  engine._addStatus(reserve, { type: 'starsPerTurn', duration: 3 }, 20, '検証');
  engine._finishTurn();
  assert.strictEqual(engine.getState().stars, 0);

  const frontline = engine.getState().allies[0];
  engine._addStatus(frontline, { type: 'starsPerTurn', duration: 3 }, 20, '検証');
  frontline.alive = false;
  frontline.hp = 0;
  engine._finishTurn();
  assert.strictEqual(engine.getState().stars, 0);
});

test('戦闘設定とWave設定から現在のフィールド特性を保持する', () => {
  const rootEngine = makeEngine({ fieldTraits: ['水辺', '水辺', '  森  '] });
  assert.deepStrictEqual(rootEngine.getFieldTraits(), ['水辺', '森']);
  assert.strictEqual(rootEngine.hasFieldTrait('水辺'), true);

  const waveEngine = makeEngine({
    fieldTraits: ['通常'],
    waves: [
      { fieldTraits: ['水辺'], enemies: [baseEnemy()] },
      { fieldTraits: ['森'], enemies: [baseEnemy({ name: '第2Wave敵' })] }
    ]
  });
  assert.deepStrictEqual(waveEngine.getFieldTraits(), ['水辺']);
  assert.strictEqual(waveEngine._startNextWave(), true);
  assert.deepStrictEqual(waveEngine.getFieldTraits(), ['森']);
});

test('水辺ではOC1～5の条件付き宝具威力10～30%を適用する', () => {
  const expected = [10, 15, 20, 25, 30];
  expected.forEach((value, index) => {
    const engine = makeEngine({ fieldTraits: ['水辺'] });
    const ally = engine.getState().allies[0];
    const result = engine._applyEffect({
      type: 'npPowerUp',
      target: 'self',
      ocValues: expected,
      duration: 1,
      condition: { kind: 'fieldTrait', key: '水辺' }
    }, ally, ally.id, { oc: index + 1, level: 10 });
    assert.notStrictEqual(result && result.applied, false);
    assert.strictEqual(engine._statusTotal(ally, 'npPowerUp'), value);
  });
});

test('水辺がない場合は条件付き効果を付与せず成功ログも出さない', () => {
  const engine = makeEngine({ fieldTraits: ['都市'] });
  const ally = engine.getState().allies[0];
  const result = engine._applyEffect({
    type: 'npPowerUp',
    target: 'self',
    value: 30,
    duration: 1,
    condition: { kind: 'fieldTrait', key: '水辺' }
  }, ally, ally.id, {});

  assert.strictEqual(result.applied, false);
  assert.strictEqual(engine._statusTotal(ally, 'npPowerUp'), 0);
  assert.ok(engine.getState().logs.at(-1).message.includes('発動しなかった'));
  assert.strictEqual(engine.getState().logs.some((entry) => entry.message.includes('宝具威力アップ') && entry.message.includes('付与')), false);
});

test('水辺以外の任意フィールド特性でも共通条件判定が動作する', () => {
  const engine = makeEngine({ fieldTraits: ['炎上'] });
  const ally = engine.getState().allies[0];
  engine._applyEffect({
    type: 'attackUp',
    target: 'self',
    value: 25,
    duration: 1,
    condition: { kind: 'fieldTrait', key: '炎上' }
  }, ally, ally.id, {});
  assert.strictEqual(engine._statusTotal(ally, 'attackUp'), 25);
});

test('宝具beforeのフィールド条件付き宝具威力アップが宝具自身のダメージへ反映される', () => {
  function execute(fieldTraits) {
    const engine = makeEngine({ fieldTraits });
    const actor = engine.getState().allies[0];
    const enemy = engine.getState().enemies[0];
    actor.np = 100;
    actor.data.np.before = [{
      type: 'npPowerUp',
      target: 'self',
      value: 30,
      duration: 1,
      condition: { kind: 'fieldTrait', key: '水辺' }
    }];
    const before = enemy.hp;
    engine._executeNp({ type: 'np', actorId: actor.id, card: actor.data.np.card }, chainContext(), 0);
    return { damage: before - enemy.hp, engine, actor };
  }

  const withoutField = execute([]);
  const withField = execute(['水辺']);
  assert.strictEqual(withoutField.engine._statusTotal(withoutField.actor, 'npPowerUp'), 0);
  assert.strictEqual(withField.engine._statusTotal(withField.actor, 'npPowerUp'), 30);
  assert.ok(withField.damage > withoutField.damage);
  assert.ok(withField.damage >= Math.floor(withoutField.damage * 1.25));
});

test('毎ターンスターの表示名とアイコンを取得できる', () => {
  const engine = makeEngine();
  const ally = engine.getState().allies[0];
  applyStarsPerTurn(engine, ally, 10);
  const status = engine.getStatusSummary(ally.id).find((entry) => entry.type === 'starsPerTurn');
  assert.strictEqual(status.name, '毎ターンスター獲得');
  assert.strictEqual(status.statusIcon, DATA.statusIcons.starsPerTurn);
  assert.strictEqual(DATA.statusIcons.starsPerTurn, 'Stargainup.webp');
});

console.log('\n毎ターンスター・フィールド条件テストに合格しました。');
