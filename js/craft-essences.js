(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);

  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const CRAFT_ESSENCES = {
      none: { id: 'none', name: '装備なし', atk: 0, hp: 0, effects: [], description: '概念礼装を装備しません。' },
      templateExample: { id: 'templateExample', name: 'テンプレート礼装（例）', atk: 500, hp: 500, effects: [{ type: 'npCharge', value: 20 }], description: '開始時NPを20%増やすテンプレート例。' }
    };

  Object.assign(DATA.craftEssences, CRAFT_ESSENCES);

  if (typeof module !== 'undefined' && module.exports) module.exports = CRAFT_ESSENCES;
})(typeof window !== 'undefined' ? window : globalThis);
