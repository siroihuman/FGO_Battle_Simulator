'use strict';

const fs = require('fs');

function replaceExact(path, from, to) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`Expected test fragment not found: ${path}`);
  const updated = source.replace(from, to);
  fs.writeFileSync(path, updated, 'utf8');
}

replaceExact(
  'tests/inugami-gyobu-tests.js',
  `  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 8);
  assert.strictEqual(engine._statusTotal(actor, 'debuffSuccess'), 8);
  assert.strictEqual(engine._statusTotal(actor, 'damagePlus'), 200);
  assert.strictEqual(engine._statusTotal(actor, 'starRateUp'), 6);`,
  `  const passiveValue = (source, type, card) => actor.statuses
    .filter((status) => status.source === source && status.type === type && (!card || status.card === card))
    .reduce((sum, status) => sum + Number(status.value || 0), 0);
  assert.strictEqual(passiveValue('陣地作成 B', 'cardUp', 'arts'), 8);
  assert.strictEqual(passiveValue('道具作成 B', 'debuffSuccess'), 8);
  assert.strictEqual(passiveValue('神格 C', 'damagePlus'), 200);
  assert.strictEqual(passiveValue('神格 C', 'starRateUp'), 6);`
);

replaceExact(
  'tests/koyanskaya-light-tests.js',
  `  const result = engine.useSkill(actor.id, 2, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'buster' }), 50);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }), 50);
  assert.strictEqual(engine._statusTotal(ally, 'cardStarWeightUp', { card: 'buster' }), 5000);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'arts' }), 0);`,
  `  const before = {
    buster: engine._statusTotal(ally, 'cardUp', { card: 'buster' }),
    busterCrit: engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }),
    busterWeight: engine._statusTotal(ally, 'cardStarWeightUp', { card: 'buster' }),
    arts: engine._statusTotal(ally, 'cardUp', { card: 'arts' })
  };
  const result = engine.useSkill(actor.id, 2, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'buster' }) - before.buster, 50);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }) - before.busterCrit, 50);
  assert.strictEqual(engine._statusTotal(ally, 'cardStarWeightUp', { card: 'buster' }) - before.busterWeight, 5000);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'arts' }), before.arts);`
);

replaceExact(
  'tests/koyanskaya-light-tests.js',
  `  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'quick' }), 8);
  assert.strictEqual(engine._statusTotal(actor, 'critUp'), 18);
  assert.strictEqual(engine._statusTotal(actor, 'deathResist'), 6);
  assert.strictEqual(engine._statusTotal(actor, 'mentalResist'), 6);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 10);
  assert.strictEqual(engine._statusTotal(actor, 'starRateUp'), 10);
  assert.strictEqual(engine._statusTotal(actor, 'npPowerUp'), 20);`,
  `  const passiveValue = (source, type, card) => actor.statuses
    .filter((status) => status.source === source && status.type === type && (!card || status.card === card))
    .reduce((sum, status) => sum + Number(status.value || 0), 0);
  assert.strictEqual(passiveValue('騎乗 B', 'cardUp', 'quick'), 8);
  assert.strictEqual(passiveValue('単独行動 EX', 'critUp'), 12);
  assert.strictEqual(passiveValue('単独顕現 C', 'critUp'), 6);
  assert.strictEqual(passiveValue('単独顕現 C', 'deathResist'), 6);
  assert.strictEqual(passiveValue('単独顕現 C', 'mentalResist'), 6);
  assert.strictEqual(passiveValue('変化 A', 'cardUp', 'arts'), 10);
  assert.strictEqual(passiveValue('変化 A', 'starRateUp'), 10);
  assert.strictEqual(passiveValue('女神変生（銃） B', 'npPowerUp'), 20);`
);

replaceExact(
  'tests/yaoya-oshichi-tests.js',
  `  const result = engine.useSkill(ally.id, 0, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }), 20);`,
  `  const quickBefore = engine._statusTotal(ally, 'cardUp', { card: 'quick' });
  const result = engine.useSkill(ally.id, 0, ally.id);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }) - quickBefore, 20);`
);

replaceExact(
  'tests/turn-field-effects-tests.js',
  `    const ally = engine.getState().allies[0];
    const result = engine._applyEffect({`,
  `    const ally = engine.getState().allies[0];
    const before = engine._statusTotal(ally, 'npPowerUp');
    const result = engine._applyEffect({`
);
replaceExact(
  'tests/turn-field-effects-tests.js',
  `    assert.notStrictEqual(result && result.applied, false);
    assert.strictEqual(engine._statusTotal(ally, 'npPowerUp'), value);`,
  `    assert.notStrictEqual(result && result.applied, false);
    assert.strictEqual(engine._statusTotal(ally, 'npPowerUp') - before, value);`
);
replaceExact(
  'tests/turn-field-effects-tests.js',
  `  const ally = engine.getState().allies[0];
  const result = engine._applyEffect({
    type: 'npPowerUp',`,
  `  const ally = engine.getState().allies[0];
  const before = engine._statusTotal(ally, 'npPowerUp');
  const result = engine._applyEffect({
    type: 'npPowerUp',`
);
replaceExact(
  'tests/turn-field-effects-tests.js',
  `  assert.strictEqual(result.applied, false);
  assert.strictEqual(engine._statusTotal(ally, 'npPowerUp'), 0);`,
  `  assert.strictEqual(result.applied, false);
  assert.strictEqual(engine._statusTotal(ally, 'npPowerUp'), before);`
);
replaceExact(
  'tests/turn-field-effects-tests.js',
  `  assert.strictEqual(withoutField.engine._statusTotal(withoutField.actor, 'npPowerUp'), 0);
  assert.strictEqual(withField.engine._statusTotal(withField.actor, 'npPowerUp'), 30);`,
  `  const withoutBase = withoutField.actor.statuses
    .filter((status) => status.type === 'npPowerUp' && status.source !== withoutField.actor.name)
    .reduce((sum, status) => sum + Number(status.value || 0), 0);
  const withBase = withField.actor.statuses
    .filter((status) => status.type === 'npPowerUp' && status.source !== withField.actor.name)
    .reduce((sum, status) => sum + Number(status.value || 0), 0);
  assert.strictEqual(withoutField.engine._statusTotal(withoutField.actor, 'npPowerUp'), withoutBase);
  assert.strictEqual(withField.engine._statusTotal(withField.actor, 'npPowerUp') - withBase, 30);`
);

replaceExact(
  'tests/skadi-ruler-tests.js',
  `  const result = engine.useSkill(actor.id, 0, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }), 50);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }), 100);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'quick' }), 0);`,
  `  const quickBefore = engine._statusTotal(ally, 'cardUp', { card: 'quick' });
  const busterCritBefore = engine._statusTotal(ally, 'cardCritUp', { card: 'buster' });
  const quickCritBefore = engine._statusTotal(ally, 'cardCritUp', { card: 'quick' });
  const result = engine.useSkill(actor.id, 0, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }) - quickBefore, 50);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }) - busterCritBefore, 100);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'quick' }), quickCritBefore);`
);

replaceExact(
  'tests/skadi-ruler-tests.js',
  `  const result = engine.useSkill(actor.id, 1, actor.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp'), 20);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'quick' }), 15);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }), 15);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'buster' }), 15);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'buster' }), 15);`,
  `  const before = {
    actorAttack: engine._statusTotal(actor, 'attackUp'),
    allyAttack: engine._statusTotal(ally, 'attackUp'),
    actorQuick: engine._statusTotal(actor, 'cardUp', { card: 'quick' }),
    allyQuick: engine._statusTotal(ally, 'cardUp', { card: 'quick' }),
    actorBuster: engine._statusTotal(actor, 'cardUp', { card: 'buster' }),
    allyBuster: engine._statusTotal(ally, 'cardUp', { card: 'buster' })
  };
  const result = engine.useSkill(actor.id, 1, actor.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(engine._statusTotal(actor, 'attackUp') - before.actorAttack, 20);
  assert.strictEqual(engine._statusTotal(ally, 'attackUp') - before.allyAttack, 20);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'quick' }) - before.actorQuick, 15);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'quick' }) - before.allyQuick, 15);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'buster' }) - before.actorBuster, 15);
  assert.strictEqual(engine._statusTotal(ally, 'cardUp', { card: 'buster' }) - before.allyBuster, 15);`
);

replaceExact(
  'tests/skadi-ruler-tests.js',
  `  const result = engine.useSkill(actor.id, 2, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(ally.np, 50);
  assert.strictEqual(engine.getState().stars, 15);
  assert.strictEqual(engine._statusTotal(ally, 'cardStarWeightUp', { card: 'buster' }), 5000);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }), 0);`,
  `  const starWeightBefore = engine._statusTotal(ally, 'cardStarWeightUp', { card: 'buster' });
  const busterCritBefore = engine._statusTotal(ally, 'cardCritUp', { card: 'buster' });
  const result = engine.useSkill(actor.id, 2, ally.id);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(ally.np, 50);
  assert.strictEqual(engine.getState().stars, 15);
  assert.strictEqual(engine._statusTotal(ally, 'cardStarWeightUp', { card: 'buster' }) - starWeightBefore, 5000);
  assert.strictEqual(engine._statusTotal(ally, 'cardCritUp', { card: 'buster' }), busterCritBefore);`
);

replaceExact(
  'tests/skadi-ruler-tests.js',
  `  assert.strictEqual(engine._statusTotal(actor, 'debuffResist'), 50);
  assert.strictEqual(engine._statusTotal(actor, 'cardUp', { card: 'arts' }), 10);
  assert.strictEqual(engine._statusTotal(actor, 'damagePlus'), 250);`,
  `  const passiveValue = (source, type, card) => actor.statuses
    .filter((status) => status.source === source && status.type === type && (!card || status.card === card))
    .reduce((sum, status) => sum + Number(status.value || 0), 0);

  assert.strictEqual(passiveValue('対魔力 EX', 'debuffResist'), 25);
  assert.strictEqual(passiveValue('陣地作成 A', 'cardUp', 'arts'), 10);
  assert.strictEqual(passiveValue('女神の神核 A', 'damagePlus'), 250);
  assert.strictEqual(passiveValue('女神の神核 A', 'debuffResist'), 25);`
);

replaceExact(
  'tests/skadi-ruler-tests.js',
  `  const dryActor = dryEngine.getState().allies[0];
  dryEngine._applyEffect(dryActor.data.np.before[0], dryActor, dryActor.id, { oc: 5, level: 10 });
  assert.strictEqual(dryEngine._statusTotal(dryActor, 'npPowerUp'), 0);

  const waterEngine = makeEngine({ fieldTraits: ['水辺'] });
  const waterActor = waterEngine.getState().allies[0];
  waterEngine._applyEffect(waterActor.data.np.before[0], waterActor, waterActor.id, { oc: 5, level: 10 });
  assert.strictEqual(waterEngine._statusTotal(waterActor, 'npPowerUp'), 30);`,
  `  const dryActor = dryEngine.getState().allies[0];
  const dryBefore = dryEngine._statusTotal(dryActor, 'npPowerUp');
  dryEngine._applyEffect(dryActor.data.np.before[0], dryActor, dryActor.id, { oc: 5, level: 10 });
  assert.strictEqual(dryEngine._statusTotal(dryActor, 'npPowerUp'), dryBefore);

  const waterEngine = makeEngine({ fieldTraits: ['水辺'] });
  const waterActor = waterEngine.getState().allies[0];
  const waterBefore = waterEngine._statusTotal(waterActor, 'npPowerUp');
  waterEngine._applyEffect(waterActor.data.np.before[0], waterActor, waterActor.id, { oc: 5, level: 10 });
  assert.strictEqual(waterEngine._statusTotal(waterActor, 'npPowerUp') - waterBefore, 30);`
);

console.log('Updated regression tests to account for class score baselines.');
