// js/servant-mechanics/yourServantId.js として保存します。
(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');

  M.registerServant('yourServantId', {
    name: 'サーヴァント名',

    // 共通関数だけで処理できる効果。
    commonEffects: [
      '攻撃力アップ',
      'NP増加'
    ],

    // 効果自体は共通だが、発動条件が特殊な効果。
    triggerEffects: [
      '攻撃時NP増加'
    ],

    // 宝具換装、スキル換装、独自ゲージなど。
    uniqueMechanics: [],

    // サーヴァント本体に紐づく固有フック。
    hooks: {
      // beforeNp(engine, context) {},
      // afterNp(engine, context) {},
      // turnStart(engine, context) {},
      // turnEnd(engine, context) {}
    }
  });

  // 付与先が別サーヴァントでも発動する状態はEffect Hookへ登録します。
  // M.registerEffectHook('yourServantId', 'afterAttack', 'yourStatusType', function (engine, context) {
  //   const actor = context.actor;
  //   const target = context.target;
  // });
})(typeof window !== 'undefined' ? window : globalThis);
