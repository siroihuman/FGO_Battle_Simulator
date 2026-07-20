'use strict';

const DATA = require('../js/data.js');
const MECHANICS = require('../js/servant-mechanics/index.js');
const { BattleEngine } = require('../js/engine.js');
require('../js/servant-mechanics/runtime.js');

function assert(condition, label) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}

const ids = ['koyanskayaLight', 'fenrir', 'artoriaCaster', 'skadiRuler', 'skadiCaster', 'juanaMadQueen', 'aliceLiddell'];
ids.forEach((id) => assert(Boolean(MECHANICS.get(id)), `${id} の分類ファイルを登録`));
assert(MECHANICS.get('koyanskayaLight').triggerEffects.includes('Buster通常攻撃時NP増加'), 'コヤンスカヤのTrigger分類');
assert(MECHANICS.get('aliceLiddell').triggerEffects.includes('攻撃時〔虚構概念〕特性付与'), 'アリスのTrigger分類');

const engine = new BattleEngine({
  seed: 1,
  party: [
    { servantId: 'fenrir', startingNp: 0, npLevel: 1, skillLevel: 10, craftEssenceId: 'none' },
    { servantId: 'aliceLiddell', startingNp: 0, npLevel: 1, skillLevel: 10, craftEssenceId: 'none' }
  ],
  waves: [{ enabled: true, enemies: [{ enabled: true, name: '検証敵', classId: 'saber', attribute: 'man', traits: [], hp: 100000, attack: 1, dtdr: 1, deathRate: 0, chargeMax: 3, critRate: 0 }] }]
});

const fenrir = engine.state.allies[0];
const alice = engine.state.allies[1];
const enemy = engine.state.enemies[0];

assert(typeof engine._runEffectHooks === 'function', 'ランタイム拡張をengine.js外部から導入');

fenrir.statuses.push({ type: 'busterNormalNp', value: 10, remaining: 3 });
engine._runEffectHooks('afterNormalAttack', {
  actor: fenrir,
  target: enemy,
  action: { type: 'card', card: 'buster' }
});
assert(fenrir.np === 10, '付与先が別サーヴァントでもBuster通常攻撃時NP増加が発動');

alice.statuses.push({ type: 'onAttackAddTrait', trait: '虚構概念', chance: 100, remaining: 3 });
engine.rng = () => 0;
engine._runEffectHooks('afterAttack', {
  actor: alice,
  target: enemy,
  action: { type: 'card', card: 'arts' }
});
assert(enemy.traits.includes('虚構概念'), 'アリスの攻撃時特性付与が個別ファイルから発動');

assert(Object.keys(DATA.servants).every((id) => Boolean(MECHANICS.get(id))), '登録済み全サーヴァントに分類ファイルが存在');
console.log('All servant mechanics tests passed.');
