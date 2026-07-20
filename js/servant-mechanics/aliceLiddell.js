(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');

  M.registerServant('aliceLiddell', {
    name: 'アリス・リデル',
    commonEffects: ['Quick性能アップ', 'Arts性能アップ', 'NP獲得量アップ', '特性付与', '特性特攻', 'NP増加', '宝具威力アップ'],
    triggerEffects: ['攻撃時〔虚構概念〕特性付与'],
    uniqueMechanics: []
  });

  M.registerEffectHook('aliceLiddell', 'afterAttack', 'onAttackAddTrait', function (engine, context) {
    const actor = context.actor;
    const target = context.target;
    if (!actor || !target) return;
    actor.statuses
      .filter((status) => status.type === 'onAttackAddTrait')
      .forEach((status) => {
        const chance = Number(status.chance || 60);
        if (engine.rng() * 100 >= chance || engine._hasTrait(target, status.trait)) return;
        target.traits.push(engine._normalizeTrait(status.trait));
        engine._log(`${target.name}に〔${status.trait}〕特性を付与。`);
      });
  });
})(typeof window !== 'undefined' ? window : globalThis);
