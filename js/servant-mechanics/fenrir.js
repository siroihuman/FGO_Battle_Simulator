(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');
  M.registerServant('fenrir', {
    name: 'フェンリル',
    commonEffects: ['特性特攻', 'クリティカル威力アップ', 'スター発生率アップ', 'NP増加', '攻撃力アップ', 'OCアップ状態', 'スター集中', '無敵貫通', 'スター獲得', 'HP減少'],
    triggerEffects: ['宝具使用時OCアップ消費'],
    uniqueMechanics: []
  });
})(typeof window !== 'undefined' ? window : globalThis);
