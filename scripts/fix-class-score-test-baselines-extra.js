'use strict';

const fs = require('fs');

function replaceExact(path, from, to) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`Expected extra test fragment not found: ${path}`);
  fs.writeFileSync(path, source.replace(from, to), 'utf8');
}

replaceExact(
  'tests/inugami-gyobu-tests.js',
  `  const ally = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 1, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 28);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'arts' }), 20);`,
  `  const ally = engine.getState().allies[1];
  const before = {
    actorAttack: engine._statusTotal(actor, 'attackUp'),
    allyAttack: engine._statusTotal(ally, 'attackUp'),
    actorArts: engine._statusTotal(actor, 'cardUp', { card: 'arts' }),
    allyArts: engine._statusTotal(ally, 'cardUp', { card: 'arts' })
  };
  const result = engine.useSkill(actor.id, 1, actor.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp') - before.actorAttack, 20);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp') - before.allyAttack, 20);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }) - before.actorArts, 20);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'arts' }) - before.allyArts, 20);`
);

replaceExact(
  'tests/inugami-gyobu-tests.js',
  `  const ally = engine.getState().allies[1];
  const result = engine.useSkill(actor.id, 2, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 28);`,
  `  const ally = engine.getState().allies[1];
  const artsBefore = engine._statusTotal(actor, 'cardUp', { card: 'arts' });
  const result = engine.useSkill(actor.id, 2, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }) - artsBefore, 20);`
);

replaceExact(
  'tests/inugami-gyobu-tests.js',
  `  np.before.forEach((effect) => {
    engine._applyEffect(effect, actor, actor.id, { oc: 5, level: 10 });
  });

  assert.strictEqual(engine._statusTotal(actor, 'attackUp'), 30);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp'), 30);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 18);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'arts' }), 10);`,
  `  const before = {
    actorAttack: engine._statusTotal(actor, 'attackUp'),
    allyAttack: engine._statusTotal(ally, 'attackUp'),
    actorArts: engine._statusTotal(actor, 'cardUp', { card: 'arts' }),
    allyArts: engine._statusTotal(ally, 'cardUp', { card: 'arts' })
  };
  np.before.forEach((effect) => {
    engine._applyEffect(effect, actor, actor.id, { oc: 5, level: 10 });
  });

  assert.strictEqual(engine._statusTotal(actor, 'attackUp') - before.actorAttack, 30);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp') - before.allyAttack, 30);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }) - before.actorArts, 10);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'arts' }) - before.allyArts, 10);`
);

replaceExact(
  'tests/yaoya-oshichi-tests.js',
  `  const ally = engine.getState().allies[0];
  const result = engine.useSkill(ally.id, 2, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }), 20);
  assert.strictEqual(engine._statusTotal(ally, 'starRateUp'), 56.5);`,
  `  const ally = engine.getState().allies[0];
  const quickBefore = engine._statusTotal(ally, 'cardUp', { card: 'quick' });
  const starRateBefore = engine._statusTotal(ally, 'starRateUp');
  const result = engine.useSkill(ally.id, 2, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }) - quickBefore, 20);
  assert.strictEqual(engine._statusTotal(ally, 'starRateUp') - starRateBefore, 50);`
);

console.log('Updated remaining servant regression baselines.');
