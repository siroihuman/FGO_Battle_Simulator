'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ENGINE = require('../js/engine.js');
require('../js/common-effects.js');
const LOCKS = require('../js/command-use-locks.js');
const BattleEngine = ENGINE.BattleEngine;

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function makeEngine() {
  const engine = new BattleEngine({
    seed: 12,
    party: [{ servantId: 'inugamiGyobu', startingNp: 100, skillLevel: 10 }],
    waves: [{
      enabled: true,
      enemies: [{
        enabled: true,
        name: '封印確認用エネミー',
        classId: 'archer',
        attribute: 'neutral',
        traits: [],
        hp: 100000,
        attack: 1,
        chargeMax: 3,
        critRate: 0
      }]
    }]
  });
  engine.rng = () => 0.5;
  return engine;
}

function addStatus(engine, unit, effect, source = '封印テスト') {
  return engine._addStatus(unit, { duration: 2, debuff: true, ...effect }, effect.value || 0, source);
}

test('スキル封印は保有スキルをすべて使用不可にする', () => {
  const engine = makeEngine();
  const ally = engine.getAliveAllies()[0];
  addStatus(engine, ally, { type: 'skillSeal' });

  ally.data.skills.forEach((_, index) => {
    const availability = engine.getSkillAvailability(ally.id, index);
    assert.strictEqual(availability.available, false);
    assert.strictEqual(availability.lockedByStatus, true);
    assert.strictEqual(availability.label, 'スキル封印');
  });

  const before = ally.cooldowns[0];
  const result = engine.useSkill(ally.id, 0, ally.id);
  assert.strictEqual(result.ok, false);
  assert.ok(result.reason.includes('スキル封印'));
  assert.strictEqual(ally.cooldowns[0], before);
});

test('スキル番号指定では対象スキルだけを使用不可にする', () => {
  const engine = makeEngine();
  const ally = engine.getAliveAllies()[0];
  addStatus(engine, ally, { type: 'skillDisable', skillNumber: 1 });

  assert.strictEqual(engine.getSkillAvailability(ally.id, 0).available, false);
  assert.strictEqual(engine.getSkillAvailability(ally.id, 0).label, 'スキル1使用不可');
  assert.strictEqual(engine.getSkillAvailability(ally.id, 1).available, true);
  assert.strictEqual(engine.getSkillAvailability(ally.id, 2).available, true);
});

test('0始まりskillIndexと型名エイリアスを認識する', () => {
  const engine = makeEngine();
  const ally = engine.getAliveAllies()[0];
  addStatus(engine, ally, { type: 'skillDisable', skillIndex: 1 });
  addStatus(engine, ally, { type: 'skill3Seal' });

  assert.strictEqual(engine.getSkillAvailability(ally.id, 0).available, true);
  assert.strictEqual(engine.getSkillAvailability(ally.id, 1).label, 'スキル2使用不可');
  assert.strictEqual(engine.getSkillAvailability(ally.id, 2).label, 'スキル3使用不可');
});

test('個別スキル指定用メタデータを状態へ保持する', () => {
  const engine = makeEngine();
  const ally = engine.getAliveAllies()[0];
  const status = addStatus(engine, ally, {
    type: 'skillDisable',
    skillNumber: 1,
    skillNumbers: [1, 3],
    skillId: ally.data.skills[0].id
  }, 'メタデータ確認');

  assert.strictEqual(status.skillNumber, 1);
  assert.deepStrictEqual(status.skillNumbers, [1, 3]);
  assert.strictEqual(status.skillId, ally.data.skills[0].id);

  const summary = engine.getStatusSummary(ally.id).find((entry) => entry.source === 'メタデータ確認');
  assert.ok(summary);
  assert.strictEqual(summary.name, 'スキル1・3使用不可');
});

test('宝具封印はNP量に関係なく宝具を使用不可にする', () => {
  const engine = makeEngine();
  const ally = engine.getAliveAllies()[0];
  ally.np = 300;
  addStatus(engine, ally, { type: 'npSeal' });

  const availability = engine.getNpAvailability(ally.id);
  assert.strictEqual(availability.available, false);
  assert.strictEqual(availability.lockedByStatus, true);
  assert.strictEqual(availability.label, '宝具封印');
  assert.strictEqual(engine.toggleNp(ally.id), false);
});

test('宝具選択後に宝具封印が付与された場合は選択を解除する', () => {
  const engine = makeEngine();
  const ally = engine.getAliveAllies()[0];
  ally.np = 100;
  assert.strictEqual(engine.toggleNp(ally.id), true);
  assert.ok(engine.getState().selectedActions.some((action) => action.type === 'np'));

  addStatus(engine, ally, { type: 'npSeal' });
  assert.ok(!engine.getState().selectedActions.some((action) => action.type === 'np'));
});

test('実行直前にも宝具封印を再検査する', () => {
  const engine = makeEngine();
  const ally = engine.getAliveAllies()[0];
  ally.np = 100;
  assert.strictEqual(engine.toggleNp(ally.id), true);
  ally.statuses.push({ type: 'npSeal', remaining: 1, uses: null, debuff: true });

  const result = engine.executeCommandChain();
  assert.strictEqual(result.ok, false);
  assert.ok(result.reason.includes('宝具封印'));
  assert.ok(!engine.getState().selectedActions.some((action) => action.type === 'np'));
});

test('状態表示名を日本語へ正規化する', () => {
  const engine = makeEngine();
  const ally = engine.getAliveAllies()[0];
  addStatus(engine, ally, { type: 'skill1Seal' }, '個別封印');
  addStatus(engine, ally, { type: 'npSeal' }, '宝具封印');

  const summaries = engine.getStatusSummary(ally.id);
  assert.strictEqual(summaries.find((entry) => entry.source === '個別封印').name, 'スキル1使用不可');
  assert.strictEqual(summaries.find((entry) => entry.source === '宝具封印').name, '宝具封印');
});

test('UIが封印対象のスキル・宝具をグレーアウトする', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/command-use-locks.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../css/command-use-locks.css'), 'utf8');

  assert.ok(source.includes(".skill-button[data-skill]"));
  assert.ok(source.includes(".np-command[data-np]"));
  assert.ok(source.includes("command-use-locked"));
  assert.ok(source.includes("button.disabled = Boolean(resolving || !availability || !availability.available)"));
  assert.ok(css.includes('.skill-button.command-use-locked'));
  assert.ok(css.includes('.np-command.command-use-locked'));
  assert.ok(css.includes('filter: grayscale(1)'));
  assert.ok(css.includes('content: attr(data-command-lock-label)'));
});

test('index.htmlがアプリより先に封印判定を読み込む', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.includes('css/command-use-locks.css'));
  assert.ok(html.includes('js/command-use-locks.js'));
  assert.ok(html.indexOf('js/command-use-locks.js') > html.indexOf('js/enemy-turn-charge-reserve-status.js'));
  assert.ok(html.indexOf('js/command-use-locks.js') < html.indexOf('js/app.js'));
});

test('個別封印の推奨記述形式を公開する', () => {
  assert.deepStrictEqual(LOCKS.metadata.recommendedTargetedEffect, {
    type: 'skillDisable',
    skillNumber: 1
  });
  assert.strictEqual(LOCKS.metadata.skillIndex, '0-based');
  assert.strictEqual(LOCKS.metadata.skillNumber, '1-based');
});

console.log('\nスキル・宝具封印グレーアウトテストに合格しました。');
