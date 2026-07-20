(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);

  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const CRAFT_ESSENCES = {
    none: {
      id: 'none',
      name: '装備なし',
      atk: 0,
      hp: 0,
      description: '概念礼装を装備しません。',
      effects: []
    },

    templateExample: {
      id: 'templateExample',
      name: 'テンプレート礼装（例）',
      atk: 500,
      hp: 500,
      description: '開始時NPを20%増やすテンプレート例。',
      effects: [
        { type: 'npCharge', value: 20 }
      ]
    },

    blackGrail: {
      id: 'blackGrail',
      name: '黒の聖杯',
      atk: 2400,
      hp: 0,
      description: `自身の宝具威力を80%アップ
＆毎ターンHPを500減らす【デメリット】`,
      effects: [
        { type: 'npPowerUp', value: 80 },
        { type: 'hpLossPerTurn', value: 500 }
      ],
      source: 'https://appmedia.jp/fategrandorder/103128'
    },

    detectiveFoumes: {
      id: 'detectiveFoumes',
      name: '名探偵フォウムズ',
      atk: 2000,
      hp: 0,
      description: '効果なし。',
      effects: [],
      source: 'https://gamewith.jp/fgo/article/show/161275'
    }
  };

  Object.assign(DATA.craftEssences, CRAFT_ESSENCES);

  if (typeof module !== 'undefined' && module.exports) module.exports = CRAFT_ESSENCES;
})(typeof window !== 'undefined' ? window : globalThis);
