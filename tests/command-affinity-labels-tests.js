'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const DATA = require('../js/data.js');
const ENGINE = require('../js/engine.js');
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

test('有利クラス相性をWEAKとして分類する', () => {
  assert.strictEqual(ENGINE.classAffinity('saber', 'lancer'), 2);
  assert.strictEqual(LABELS.classifyAffinity(2), 'weak');
  assert.strictEqual(LABELS.classifyAffinity(1.5), 'weak');
});

test('不利クラス相性をRESISTとして分類する', () => {
  assert.strictEqual(ENGINE.classAffinity('saber', 'archer'), 0.5);
  assert.strictEqual(LABELS.classifyAffinity(0.5), 'resist');
});

test('等倍クラス相性ではラベルを表示しない', () => {
  assert.strictEqual(ENGINE.classAffinity('saber', 'saber'), 1);
  assert.strictEqual(LABELS.classifyAffinity(1), '');
});

test('日本語クラス表示から内部クラスIDを解決する', () => {
  const map = LABELS.buildClassLabelMap(DATA.classNames);
  assert.strictEqual(map.get('セイバー'), 'saber');
  assert.strictEqual(map.get('フォーリナー'), 'foreigner');
});

test('宝具とコマンドカードの両方へ相性表示を登録する', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/command-affinity-labels.js'), 'utf8');
  assert.ok(source.includes(".command-card[data-actor-id], .np-command[data-np]"));
  assert.ok(source.includes("label = affinityKind === 'weak' ? 'WEAK' : 'RESIST'"));
  assert.ok(source.includes(".enemy-card.selected-target"));
  assert.ok(source.includes('ENGINE.classAffinity(actorClassId, targetClassId)'));
});

test('WEAKとRESISTの専用スタイルを登録する', () => {
  const css = fs.readFileSync(path.join(__dirname, '../css/command-affinity-labels.css'), 'utf8');
  assert.ok(css.includes('.command-affinity-badge.weak'));
  assert.ok(css.includes('.command-affinity-badge.resist'));
  assert.ok(css.includes('.np-command.has-affinity-label'));
});

test('index.htmlが相性表示CSSとJavaScriptを読み込む', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.includes('css/command-affinity-labels.css'));
  assert.ok(html.includes('js/command-affinity-labels.js'));
  assert.ok(html.indexOf('js/command-affinity-labels.js') > html.indexOf('js/app.js'));
});

console.log('\n宝具・コマンドカード相性表示テストに合格しました。');
