(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');

  M.registerServant('koyanskayaLight', {
    name: '光のコヤンスカヤ',
    commonEffects: ['NP増加', 'CT短縮', 'HP減少', '特性特攻', '属性特攻', 'スター獲得', 'Buster性能アップ', 'クリティカル威力アップ', 'スター集中'],
    triggerEffects: ['Buster通常攻撃時NP増加'],
    uniqueMechanics: []
  });

  M.registerEffectHook('koyanskayaLight', 'afterNormalAttack', 'busterNormalNp', function (engine, context) {
    const actor = context.actor;
    const action = context.action;
    if (!actor || !action || action.card !== 'buster') return;
    const value = engine._statusTotal(actor, 'busterNormalNp');
    if (value <= 0) return;
    engine._addNp(actor, value, true);
    engine._log(`${actor.name}はBuster通常攻撃時効果でNP+${value}%。`);
  });
})(typeof window !== 'undefined' ? window : globalThis);
