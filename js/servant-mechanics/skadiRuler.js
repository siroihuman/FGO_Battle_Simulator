(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');
  M.registerServant('skadiRuler', {
    name: 'スカサハ＝スカディ〔ルーラー〕',
    commonEffects: ['Quick性能アップ', 'Buster性能アップ', '攻撃力アップ', 'クリティカル威力アップ', 'スター集中', 'NP増加', 'チャージ減少'],
    triggerEffects: ['宝具使用時のチャージ減少'],
    uniqueMechanics: []
  });
})(typeof window !== 'undefined' ? window : globalThis);
