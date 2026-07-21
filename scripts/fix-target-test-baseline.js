'use strict';

const fs = require('fs');
const path = 'tests/juana-mad-queen-tests.js';
const source = fs.readFileSync(path, 'utf8');
const from = `test('強化後S2はNP20%・攻撃力20%・スター発生率100%・必中3Tを付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const result = engine.useSkill(actor.id, 1, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(actor.np, 20);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(actor, 'starRateUp'), 105.5);
  const sureHit = actor.statuses.find((status) => status.type === 'sureHit' && status.source === '幽閉されし狂女王 B');
  assert.ok(sureHit);
  assert.strictEqual(sureHit.remaining, 3);
});`;
const to = `test('強化後S2はNP20%・攻撃力20%・スター発生率100%・必中3Tを付与', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  const attackBefore = engine._statusTotal(actor, 'attackUp');
  const starRateBefore = engine._statusTotal(actor, 'starRateUp');
  const result = engine.useSkill(actor.id, 1, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(actor.np, 20);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp') - attackBefore, 20);
  assert.strictEqual(engine._statusTotal(actor, 'starRateUp') - starRateBefore, 100);
  const sureHit = actor.statuses.find((status) => status.type === 'sureHit');
  assert.ok(sureHit);
  assert.strictEqual(sureHit.source, actor.name);
  assert.strictEqual(sureHit.remaining, 3);
});`;
const count = source.split(from).length - 1;
if (count !== 1) throw new Error(`Expected one S2 test block, found ${count}.`);
fs.writeFileSync(path, source.replace(from, to), 'utf8');
console.log('Updated target test to compare skill deltas and common status source.');
