(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');
  M.registerServant('artoriaCaster', {
    name: 'アルトリア・キャスター',
    commonEffects: ['攻撃力アップ', 'NP増加', 'NP獲得量アップ', 'Arts性能アップ', '特性特攻', '無敵', '弱体解除'],
    triggerEffects: ['宝具使用時の宝具後強化付与'],
    uniqueMechanics: []
  });
})(typeof window !== 'undefined' ? window : globalThis);
