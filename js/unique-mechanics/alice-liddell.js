(function (global) {
  'use strict';

  const REGISTRY = global.FGO_UNIQUE_MECHANICS ||
    (typeof require !== 'undefined' ? require('./registry.js') : null);
  const TRAIT = global.FGO_SIM_TRAIT_TRIGGER_AURA_EFFECTS ||
    (typeof require !== 'undefined' ? require('../trait-trigger-aura-effects.js') : null);

  if (!REGISTRY || !TRAIT) {
    throw new Error('Alice Liddell mechanics require the unique registry and trait trigger aura runtime.');
  }

  const RESOLVER_KEY = 'aliceLiddellRedChessResolver';

  TRAIT.registerDelayedResolver(RESOLVER_KEY, (engine, context) => {
    const owner = context && context.owner;
    const status = context && context.status;
    if (!owner || !status) return [];

    const stacks = engine.countStatusStacks(owner, {
      type: 'temporaryTrait',
      trait: 'チェックメイト'
    });
    const perStack = Number(status.value || 0);

    return [
      {
        type: 'traitPowerUp',
        target: 'self',
        trait: '赤のチェスピース',
        value: perStack * stacks,
        // turnEndで付与後、同じターンの残りターン減少を受けるため4Tで登録する。
        duration: 4
      },
      {
        type: 'temporaryTrait',
        target: 'allEnemies',
        trait: '赤のチェスピース',
        duration: 4,
        debuff: true,
        chance: 100
      }
    ];
  });

  REGISTRY.register('aliceLiddell', {
    name: 'アリス・リデル',
    description: 'チェックメイト数に応じた赤のチェスピース特攻を解決する。',
    delayedResolver: RESOLVER_KEY,
    hooks: {}
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      resolverKey: RESOLVER_KEY,
      definition: REGISTRY.get('aliceLiddell')
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
