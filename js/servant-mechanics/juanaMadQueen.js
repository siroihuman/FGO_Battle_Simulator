(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');
  M.registerServant('juanaMadQueen', {
    name: 'フアナ狂女王',
    commonEffects: ['NP獲得量アップ', 'NP増加', '攻撃力アップ', 'スター発生率アップ', '特性特攻', '毒付与'],
    triggerEffects: ['宝具使用時の毒付与'],
    uniqueMechanics: []
  });
})(typeof window !== 'undefined' ? window : globalThis);
