(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');
  M.registerServant('skadiCaster', {
    name: 'スカサハ＝スカディ〔キャスター〕',
    commonEffects: ['Quick性能アップ', 'クリティカル威力アップ', '防御力ダウン', 'NP増加', '攻撃力アップ', '回避'],
    triggerEffects: ['宝具使用時の宝具後強化付与'],
    uniqueMechanics: []
  });
})(typeof window !== 'undefined' ? window : globalThis);
