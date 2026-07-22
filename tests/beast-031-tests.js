'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants-beast-031.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
const MECHANICS = require('../js/unique-mechanics/beast-031.js');
const FILTER = String(process.env.BEAST_TEST_FILTER || '');

function enemy(name, overrides = {}) {
  return { enabled: true, name, classId: 'saber', attribute: 'man', traits: ['サーヴァント', 'クラス相性有利のサーヴァント'], hp: 1000000, attack: 1, dtdr: 1, deathRate: 100, chargeMax: 9, critRate: 0, ...overrides };
}
function engine(party, enemies = [enemy('対象')]) { return new BattleEngine({ seed: 1, party, enemies, startingStars: 0 }); }
function test(id, name, fn) {
  if (FILTER && FILTER !== id) return;
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('data', 'No.031\'の基本データを登録', () => {
  const servant = DATA.servants.beast031;
  assert.strictEqual(servant.no, "031'");
  assert.strictEqual(servant.classId, 'beast');
  assert.deepStrictEqual(servant.cards, ['quick', 'quick', 'arts', 'buster', 'buster']);
  assert.deepStrictEqual(servant.hits, { quick: 5, arts: 4, buster: 5, extra: 6, np: 12 });
  assert.strictEqual(servant.na, 0.54);
  assert.strictEqual(servant.nd, 3.00);
  assert.strictEqual(servant.skills.length, 3);
  assert.strictEqual(servant.passives.length, 4);
});

test('demerit', '怨讐の畔は控えを含む味方全体の弱体耐性を15低下', () => {
  const e = engine([{ servantId: 'beast031' }, { servantId: 'fenrir' }, { servantId: 'koyanskayaLight' }, { servantId: 'skadiCaster' }]);
  e.getState().allies.forEach((ally) => assert.strictEqual(e._statusTotal(ally, 'debuffResist'), -15));
});

test('skill2', '永劫の罪過は叛逆する者からNP25を吸収しターン終了時に還元', () => {
  const e = engine([{ servantId: 'beast031', skillLevel: 10, startingNp: 0 }, { servantId: 'fenrir', skillLevel: 10, startingNp: 50 }]);
  const [beast, rebel] = e.getState().allies;
  rebel.traits.push('叛逆する者');
  const result = e.useSkill(beast.id, 1, beast.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.absorbed, 1);
  assert.strictEqual(beast.np, 75);
  assert.strictEqual(rebel.np, 25);
  e._finishTurn();
  assert.strictEqual(rebel.np, 100);
  assert.strictEqual(e._statusTotal(rebel, 'attackUp'), 50);
});

test('skill3', '鏖殺の獣は敵強化解除・即死耐性低下・毎ターンNP等を付与', () => {
  const e = engine([{ servantId: 'beast031', skillLevel: 10 }]);
  const beast = e.getState().allies[0];
  const target = e.getState().enemies[0];
  target.statuses.push({ type: 'attackUp', value: 30, remaining: 3, debuff: false, passive: false });
  assert.strictEqual(e.useSkill(beast.id, 2, beast.id).ok, true);
  assert.strictEqual(target.statuses.some((s) => s.type === 'attackUp'), false);
  assert.strictEqual(e._statusTotal(target, 'deathResist'), -30);
  assert.strictEqual(e._statusTotal(beast, 'npGainUp'), 30);
  assert.strictEqual(e._statusTotal(beast, 'npPerTurn'), 20);
});

test('hatred', '宝具前効果は憎悪と憎悪特攻をダメージ前に付与', () => {
  const e = engine([{ servantId: 'beast031', startingNp: 100 }]);
  const beast = e.getState().allies[0];
  const target = e.getState().enemies[0];
  beast.data.np.before.forEach((effect) => e._applyEffect(effect, beast, beast.id, { oc: 1, level: 10 }));
  e._resolveAttackOnTarget(beast, target, { type: 'np', card: 'quick', position: 0, critical: false }, { firstBonuses: { quick: false, arts: false, buster: false }, busterChain: false });
  assert.strictEqual(target.statuses.some((s) => s.type === MECHANICS.statusTypes.hatred && s.value === 5000), true);
  assert.strictEqual(beast.statuses.some((s) => s.type === MECHANICS.statusTypes.hatredSpecial && s.value === 20), true);
});

test('death', '即死成功時にCT短縮と鏖殺の獣NP20が発動', () => {
  const e = engine([{ servantId: 'beast031', skillLevel: 10 }], [enemy('即死対象')]);
  e.rng = () => 0;
  const beast = e.getState().allies[0];
  const target = e.getState().enemies[0];
  beast.cooldowns = [5, 5, 5];
  e._addStatus(beast, { type: MECHANICS.statusTypes.slaughter, duration: 3 }, 20, 'test');
  const result = MECHANICS.resolveInstantDeath(e, beast, target, 150);
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(beast.cooldowns, [4, 4, 4]);
  assert.strictEqual(beast.np, 20);
});

console.log('\nBeast No.031回帰テストに合格しました。');
