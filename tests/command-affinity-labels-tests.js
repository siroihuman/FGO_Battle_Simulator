'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
require('../js/data.js');
require('../js/engine.js');
require('../js/common-effects.js');
require('../js/trait-trigger-aura-effects.js');
require('../js/class-affinity-rules.js');
const LABELS = require('../js/command-affinity-labels.js');

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('有利倍率をWEAKとして分類する', () => {
  assert.strictEqual(LABELS.classifyAffinity(2), 'weak');
  assert.strictEqual(LABELS.classifyAffinity(1.5), 'weak');
});

test('不利倍率をRESISTとして分類する', () => {
  assert.strictEqual(LABELS.classifyAffinity(0.5), 'resist');
});

test('等倍率ではラベルを表示しない', () => {
  assert.strictEqual(LABELS.classifyAffinity(1), '');
});

test('宝具とコマンドカードの両方を実ユニット相性で更新する', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/command-affinity-labels.js'), 'utf8');
  assert.ok(source.includes(".command-card[data-actor-id], .np-command[data-np]"));
  assert.ok(source.includes("global.FGO_ACTIVE_BATTLE_ENGINE"));
  assert.ok(source.includes("RULES.resolveAttackClassAffinity(engine, actor, defender)"));
  assert.ok(source.includes("engine.state.selectedEnemyId"));
  assert.ok(source.includes("label = affinityKind === 'weak' ? 'WEAK' : 'RESIST'"));
});

test('WEAKとRESISTの専用スタイルを登録する', () => {
  const css = fs.readFileSync(path.join(__dirname, '../css/command-affinity-labels.css'), 'utf8');
  assert.ok(css.includes('.command-affinity-badge.weak'));
  assert.ok(css.includes('.command-affinity-badge.resist'));
  assert.ok(css.includes('.np-command.has-affinity-label'));
});

test('index.htmlが完全版相性ルールをUIより先に読み込む', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.includes('js/class-affinity-rules.js'));
  assert.ok(html.includes('js/command-affinity-labels.js'));
  assert.ok(html.indexOf('js/class-affinity-rules.js') < html.indexOf('js/app.js'));
  assert.ok(html.indexOf('js/command-affinity-labels.js') > html.indexOf('js/app.js'));
});

console.log('\n宝具・コマンドカード相性表示テストに合格しました。');
