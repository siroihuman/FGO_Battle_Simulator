(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');
  const ALIASES = { man: '人の力', sky: '天の力', earth: '地の力', star: '星の力', beast: '獣の力' };
  const normalize = (value) => ALIASES[String(value == null ? '' : value).trim()] || String(value == null ? '' : value).trim();
  const hasTrait = (unit, trait) => {
    const wanted = normalize(trait);
    return (unit.traits || []).map(normalize).includes(wanted) || normalize(unit.attribute) === wanted;
  };

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
        const chance = Number(status.chance == null ? 60 : status.chance);
        if (engine.rng() * 100 >= chance || hasTrait(target, status.trait)) return;
        target.traits.push(normalize(status.trait));
        engine._log(`${target.name}に〔${status.trait}〕特性を付与。`);
      });
  });
})(typeof window !== 'undefined' ? window : globalThis);
