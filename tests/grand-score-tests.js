'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DATA = require('../js/data.js');
require('../js/servants.js');
require('../js/servants-dominion-foreigner.js');
require('../js/servants-rlyeh.js');
require('../js/servants-sen-no-rikyu.js');
require('../js/servants-beast-031.js');
const ENGINE = require('../js/engine.js');
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
require('../js/defense-buff-removal-effects.js');
require('../js/order-change-position.js');
require('../js/enemy-class-defaults.js');
require('../js/enemy-action-defaults.js');
require('../js/enemy-turn-charge-reserve-status.js');
require('../js/frontline-slot-promotion.js');
const GRAND = require('../js/grand-score-core.js');
const CHAIN = require('../js/grand-score-chain.js');
const COMBAT = require('../js/grand-score-combat.js');
const BattleEngine = ENGINE.BattleEngine;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function enemy() {
  return {
    enabled: true,
    name: 'グランドスコア確認用エネミー',
    classId: 'archer',
    attribute: 'sky',
    traits: [],
    hp: 1000000,
    attack: 1,
    dtdr: 1,
    deathRate: 0,
    chargeMax: 9,
    critRate: 0,
    actionCount: 0
  };
}

function installTestServant(id, classId) {
  if (DATA.servants[id]) return id;
  const source = clone(DATA.servants.fenrir);
  source.id = id;
  source.no = `test-${classId}`;
  source.name = `グランドテスト${classId}`;
  source.classId = classId;
  source.traits = (source.traits || []).filter((trait) => !Object.values(DATA.classNames).includes(trait));
  source.traits.push(DATA.classNames[classId] || classId);
  DATA.servants[id] = source;
  return id;
}

function engine(party, overrides = {}) {
  return new BattleEngine({
    seed: 1,
    party,
    enemies: [enemy()],
    mysticCodeId: overrides.mysticCodeId || 'chaldea',
    mysticCodeLevel: 10,
    startingStars: 0,
    grandScoreEnabled: overrides.grandScoreEnabled !== false,
    grandServantFlags: overrides.grandServantFlags || party.map((entry) => Boolean(entry.grandServant))
  });
}

function grandStatuses(unit, type, card) {
  return (unit.statuses || []).filter((status) =>
    status.sourceType === 'grandScore' && status.type === type && (!card || status.card === card)
  );
}

function setActions(e, entries) {
  e.state.selectedActions = entries.map((entry, index) => ({
    type: entry.type || 'card',
    actorId: entry.actorId,
    card: entry.card,
    cardId: `grand-card-${index}`
  }));
}

test('システムOFFではグランド指定を無視する', () => {
  const base = DATA.servants.fenrir.levelStats.max;
  const e = engine([{ servantId: 'fenrir', grandServant: true, fouHp: 0, fouAtk: 0 }], {
    grandScoreEnabled: false,
    grandServantFlags: [true]
  });
  const unit = e.state.allies[0];
  assert.strictEqual(unit.grandServant, false);
  assert.strictEqual(unit.maxHp, base.hp);
  assert.strictEqual(unit.atk, base.atk);
  assert.strictEqual(grandStatuses(unit, 'cardUp').length, 0);
});

test('グランドHP・ATK+1000をフォウ強化値として加算する', () => {
  const base = DATA.servants.fenrir.levelStats.max;
  const e = engine([{ servantId: 'fenrir', grandServant: true, fouHp: 250, fouAtk: 500 }]);
  const unit = e.state.allies[0];
  assert.strictEqual(unit.grandServant, true);
  assert.strictEqual(unit.fouHp, 1250);
  assert.strictEqual(unit.fouAtk, 1500);
  assert.strictEqual(unit.grandFouHp, 1000);
  assert.strictEqual(unit.grandFouAtk, 1000);
  assert.strictEqual(unit.maxHp, base.hp + 1250);
  assert.strictEqual(unit.hp, unit.maxHp);
  assert.strictEqual(unit.atk, base.atk + 1500);
  assert.strictEqual(unit.statuses.some((status) => status.type === 'maxHpUp' && status.sourceType === 'grandScore'), false);
  assert.strictEqual(unit.statuses.some((status) => status.type === 'attackUp' && status.sourceType === 'grandScore'), false);
});

test('同一クラスを含む複数騎を同時にグランド指定できる', () => {
  const e = engine([
    { servantId: 'koyanskayaLight', grandServant: true },
    { servantId: 'yaoyaOshichi', grandServant: true },
    { servantId: 'fenrir', grandServant: true }
  ]);
  assert.strictEqual(e.getGrandServants().length, 3);
  assert.strictEqual(e.state.allies[0].grandScoreGroup, 'assassin');
  assert.strictEqual(e.state.allies[1].grandScoreGroup, 'assassin');
  assert.ok(e.state.allies.every((unit) => unit.grandServant));
});

test('共通効果を最大値で適用する', () => {
  const e = engine([{ servantId: 'fenrir', grandServant: true, startingNp: 0 }]);
  const unit = e.state.allies[0];
  assert.strictEqual(grandStatuses(unit, 'cardUp', 'quick')[0].value, 50);
  assert.strictEqual(grandStatuses(unit, 'cardUp', 'arts')[0].value, 50);
  assert.strictEqual(grandStatuses(unit, 'cardUp', 'buster')[0].value, 50);
  assert.strictEqual(grandStatuses(unit, 'cardUp', 'extra')[0].value, 200);
  assert.strictEqual(grandStatuses(unit, 'healReceivedUp')[0].value, 50);
  assert.strictEqual(grandStatuses(unit, 'buffRemovalResist')[0].value, 80);
  assert.strictEqual(unit.np, 10);
  e._finishTurn();
  assert.strictEqual(unit.np, 20);
});

test('キャスターは共通NP10%とクラス固有30%で開始NP40%', () => {
  const e = engine([{ servantId: 'inugamiGyobu', grandServant: true, startingNp: 0 }]);
  assert.strictEqual(e.state.allies[0].grandScoreGroup, 'caster');
  assert.strictEqual(e.state.allies[0].np, 40);
});

test('マスタースキルは数値効果のみ1.5倍にする', () => {
  const healEngine = engine([
    { servantId: 'fenrir', grandServant: true },
    { servantId: 'koyanskayaLight', grandServant: false }
  ]);
  const nonGrand = healEngine.state.allies[1];
  nonGrand.hp = Math.max(1, nonGrand.maxHp - 10000);
  const beforeHeal = nonGrand.hp;
  assert.strictEqual(healEngine.useMysticSkill(0, nonGrand.id).ok, true);
  assert.strictEqual(nonGrand.hp - beforeHeal, 4500);

  const attackEngine = engine([
    { servantId: 'fenrir', grandServant: true },
    { servantId: 'koyanskayaLight', grandServant: false }
  ]);
  const attackTarget = attackEngine.state.allies[1];
  assert.strictEqual(attackEngine.useMysticSkill(1, attackTarget.id).ok, true);
  const attackStatus = attackTarget.statuses.find((status) => status.type === 'attackUp' && status.source === '瞬間強化');
  assert.strictEqual(attackStatus.value, 75);
  assert.strictEqual(attackStatus.remaining, 1);

  const atlasCooldown = engine([{ servantId: 'fenrir', grandServant: true }], { mysticCodeId: 'atlas' });
  const cooldownTarget = atlasCooldown.state.allies[0];
  cooldownTarget.cooldowns = [5, 5, 5];
  assert.strictEqual(atlasCooldown.useMysticSkill(2, cooldownTarget.id).ok, true);
  assert.deepStrictEqual(cooldownTarget.cooldowns, [3, 3, 3]);

  const atlasInvincible = engine([{ servantId: 'fenrir', grandServant: true }], { mysticCodeId: 'atlas' });
  const invincibleTarget = atlasInvincible.state.allies[0];
  assert.strictEqual(atlasInvincible.useMysticSkill(0, invincibleTarget.id).ok, true);
  const invincible = invincibleTarget.statuses.find((status) => status.type === 'invincible');
  assert.strictEqual(invincible.remaining, 1);
});

test('グランドが前衛にいる間はマスタースキルCTが毎ターン2進む', () => {
  const e = engine([{ servantId: 'fenrir', grandServant: true }]);
  assert.strictEqual(e.useMysticSkill(1, e.state.allies[0].id).ok, true);
  const before = e.state.mysticCodeCooldowns[1];
  e._finishTurn();
  assert.strictEqual(e.state.mysticCodeCooldowns[1], Math.max(0, before - 2));
});

test('アーチャーは登場時4発・ターン終了時1発の鈍の矢弾を得る', () => {
  const archerId = installTestServant('grandTestArcher', 'archer');
  const e = engine([{ servantId: archerId, grandServant: true }]);
  const unit = e.state.allies[0];
  assert.strictEqual(unit.grandArrowBullets, 4);
  e._finishTurn();
  assert.strictEqual(unit.grandArrowBullets, 5);
});

test('クラス別チェイン効果を最大値で適用する', () => {
  const saberId = installTestServant('grandTestSaber', 'saber');
  const lancerId = installTestServant('grandTestLancer', 'lancer');
  const rulerId = installTestServant('grandTestRuler', 'ruler');

  const saber = engine([{ servantId: saberId, grandServant: true }]);
  const saberUnit = saber.state.allies[0];
  setActions(saber, [
    { actorId: saberUnit.id, card: 'quick' },
    { actorId: saberUnit.id, card: 'quick' },
    { actorId: saberUnit.id, card: 'quick' }
  ]);
  saber._grandApplyChainEffects(saber.state.selectedActions);
  assert.strictEqual(saber._statusTotal(saberUnit, 'starRateUp') >= 100, true);
  assert.ok(saberUnit.statuses.some((status) => status.type === 'cardStarWeightUp' && status.value === 500));

  const lancer = engine([{ servantId: lancerId, grandServant: true }]);
  const lancerUnit = lancer.state.allies[0];
  setActions(lancer, [
    { actorId: lancerUnit.id, card: 'quick' },
    { actorId: lancerUnit.id, card: 'arts' },
    { actorId: lancerUnit.id, card: 'buster' }
  ]);
  lancer._grandApplyChainEffects(lancer.state.selectedActions);
  assert.ok(lancerUnit.statuses.some((status) => status.type === 'attackUp' && status.value === 50));

  const failure = engine([
    { servantId: 'fenrir', grandServant: true },
    { servantId: 'koyanskayaLight' },
    { servantId: 'inugamiGyobu' }
  ]);
  const [berserker, ally2, ally3] = failure.state.allies;
  setActions(failure, [
    { actorId: berserker.id, card: 'quick' },
    { actorId: ally2.id, card: 'arts' },
    { actorId: ally3.id, card: 'arts' }
  ]);
  failure._grandApplyChainEffects(failure.state.selectedActions);
  const guts = berserker.statuses.find((status) => status.type === 'guts' && status.sourceType === 'grandScore');
  assert.strictEqual(guts.value, Math.floor(berserker.maxHp * 0.5));

  const extra1 = engine([
    { servantId: rulerId, grandServant: true },
    { servantId: 'koyanskayaLight' },
    { servantId: 'inugamiGyobu' }
  ]);
  const [ruler, extraAlly2, extraAlly3] = extra1.state.allies;
  setActions(extra1, [
    { actorId: ruler.id, card: 'buster' },
    { actorId: extraAlly2.id, card: 'buster' },
    { actorId: extraAlly3.id, card: 'buster' }
  ]);
  extra1._grandApplyChainEffects(extra1.state.selectedActions);
  extra1.getAliveAllies().forEach((unit) => {
    assert.ok(unit.statuses.some((status) => status.type === 'cardUp' && status.card === 'buster' && status.value === 20));
  });
});

test('API・編成UI・読込順を固定する', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../js/grand-score-ui.js'), 'utf8');
  const core = fs.readFileSync(path.join(__dirname, '../js/grand-score-core.js'), 'utf8');
  assert.strictEqual(GRAND.fullyUnlocked, true);
  assert.strictEqual(GRAND.maximumValues, true);
  assert.strictEqual(GRAND.noPerClassServantLimit, true);
  assert.deepStrictEqual(GRAND.grandFouBonus, { hp: 1000, atk: 1000, treatedAsFouEnhancement: true });
  assert.strictEqual(GRAND.masterSkill.numericEffectMultiplier, 1.5);
  assert.strictEqual(GRAND.masterSkill.durationAndCountUnaffected, true);
  assert.strictEqual(GRAND.masterSkill.scalableTypes.includes('cooldownReduce'), false);
  assert.strictEqual(CHAIN.maximumValues, true);
  assert.strictEqual(COMBAT.maximumValues, true);
  assert.ok(ui.includes('クラス・騎数制限はありません'));
  assert.ok(ui.includes('HP／ATK+1,000をフォウ強化値として加算'));
  assert.ok(core.includes('slot.fouHp=Number(slot.fouHp||0)+1000'));
  assert.ok(html.includes('FGO バトルシミュレーター v1.14.0'));
  assert.ok(html.indexOf('js/grand-score-core.js') > html.indexOf('js/frontline-slot-promotion.js'));
  assert.ok(html.indexOf('js/grand-score-combat.js') < html.indexOf('js/app.js'));
  assert.ok(html.indexOf('js/grand-score-ui.js') > html.indexOf('js/app.js'));
  assert.strictEqual(DATA.version, '1.14.0');
});

console.log('\nグランドスコア回帰テストに合格しました。');
