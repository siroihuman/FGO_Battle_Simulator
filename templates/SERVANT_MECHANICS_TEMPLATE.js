// Unique Mechanicsを持つサーヴァントだけ、このテンプレートを使用します。
// js/unique-mechanics/yourServantId.js として保存してください。
(function (global) {
  'use strict';
  const M = global.FGO_UNIQUE_MECHANICS || require('./registry.js');

  M.register('yourServantId', {
    name: 'サーヴァント名',
    description: '宝具換装、スキル換装、独自ゲージなどの固有処理。',

    hooks: {
      // beforeAttack(engine, context) {},
      // afterAttack(engine, context) {},
      // beforeNp(engine, context) {},
      // afterNp(engine, context) {},
      // turnStart(engine, context) {},
      // turnEnd(engine, context) {}
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
