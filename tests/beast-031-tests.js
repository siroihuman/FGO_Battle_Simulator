'use strict';

const assert = require('assert');
const DATA = require('../js/data.js');
require('../js/servants-beast-031.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/common-effects.js');
const MECHANICS = require('../js/unique-mechanics/beast-031.js');
const DISPLAY = require('../js/unique-mechanics/beast-031-status-icons.js');
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
  e.getState().allies.forEach((ally) => {
    const demerit = ally.statuses.find((status) => status.type === 'debuffResist' && status.source === '怨讐の畔 EX');
    assert.ok(demerit);
    assert.strictEqual(demerit.value, -15);
    assert.strictEqual(demerit.statusIcon, 'Resistancedown.webp');
  });
});

test('skill2', '永劫の罪過は前衛の叛逆する者だけからNP25を吸収する', () => {
  const e = engine([
    { servantId: 'beast031', skillLevel: 10, startingNp: 0 },
    { servantId: 'fenrir', skillLevel: 10, startingNp: 50 },
    { servantId: 'koyanskayaLight', skillLevel: 10, startingNp: 50 },
    { servantId: 'skadiCaster', skillLevel: 10, startingNp: 50 }
  ]);
  const [beast, rebel, otherFront, reserve] = e.getState().allies;
  rebel.traits.push('叛逆する者');
  otherFront.traits.push('叛逆する者');
  reserve.traits.push('叛逆する者');
  const result = e.useSkill(beast.id, 1, beast.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.absorbed, 2);
  assert.strictEqual(beast.np, 100);
  assert.strictEqual(rebel.np, 25);
  assert.strictEqual(otherFront.np, 25);
  assert.strictEqual(reserve.np, 50);
  e._finishTurn();
  assert.strictEqual(rebel.np, 100);
  assert.strictEqual(otherFront.np, 100);
  assert.strictEqual(reserve.np, 50);
  assert.strictEqual(e._statusTotal(rebel, 'attackUp'), 50);
  assert.strictEqual(e._statusTotal(otherFront, 'attackUp'), 50);
  assert.strictEqual(e._statusTotal(reserve, 'attackUp'), 0);
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
  assert.strictEqual(target.statuses.find((s) => s.type === 'deathResist').statusIcon, 'Instaresistdown.webp');
  assert.strictEqual(beast.statuses.find((s) => s.type === 'npGainUp').statusIcon, 'Npchargeup.webp');
  assert.strictEqual(beast.statuses.find((s) => s.type === MECHANICS.statusTypes.slaughter).statusIcon, 'Buffatk.webp');
});

test('hatred', '宝具前効果は憎悪と憎悪特攻をダメージ前に付与', () => {
  const e = engine([{ servantId: 'beast031', startingNp: 100 }]);
  const beast = e.getState().allies[0];
  const target = e.getState().enemies[0];
  beast.data.np.before.forEach((effect) => e._applyEffect(effect, beast, beast.id, { oc: 1, level: 10 }));
  e._resolveAttackOnTarget(beast, target, { type: 'np', card: 'quick', position: 0, critical: false }, { firstBonuses: { quick: false, arts: false, buster: false }, busterChain: false });
  const hatred = target.statuses.find((s) => s.type === MECHANICS.statusTypes.hatred && s.value === 5000);
  const power = beast.statuses.find((s) => s.type === MECHANICS.statusTypes.hatredSpecial && s.value === 20);
  assert.ok(hatred);
  assert.ok(power);
  assert.strictEqual(hatred.statusIcon, 'Burn.webp');
  assert.strictEqual(power.statusIcon, 'Powerup.webp');
});

test('mass-icons', '各色通常攻撃全体化はカード色別アイコンを使用', () => {
  const e = engine([{ servantId: 'beast031', skillLevel: 10 }]);
  const beast = e.getState().allies[0];
  assert.strictEqual(e.useSkill(beast.id, 0, beast.id).ok, true);
  const massStatuses = beast.statuses.filter((s) => s.type === MECHANICS.statusTypes.massAttack);
  assert.strictEqual(massStatuses.find((s) => s.card === 'quick').statusIcon, 'Quickall.webp');
  assert.strictEqual(massStatuses.find((s) => s.card === 'buster').statusIcon, 'Busterall.webp');
  assert.strictEqual(DISPLAY.massAttackIcons.arts, 'Artsall.webp');
  assert.strictEqual(DISPLAY.massAttackIcons.extra, 'Extraattackall.webp');
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