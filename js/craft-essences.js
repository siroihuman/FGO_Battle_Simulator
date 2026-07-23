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

    idealHolyKing: {
      id: 'idealHolyKing',
      name: '理想の王聖',
      atk: 1000,
      hp: 1600,
      description: '味方全体＜控え含む＞の最大HPを1200アップ',
      effects: [
        { type: 'partyMaxHpAtBattleStart', target: 'partyIncludingReserve', value: 1200 }
      ],
      source: 'https://w.atwiki.jp/f_go/pages/809.html'
    },

    millenniumGoldenTree: {
      id: 'millenniumGoldenTree',
      name: '千年黄金樹',
      atk: 0,
      hp: 2250,
      description: '自身に最大HP上昇効果を毎ターン付与（毎ターン+300・最大+3000）',
      effects: [
        { type: 'maxHpGrowthPerPlayerTurn', value: 300, maxValue: 3000 }
      ],
      source: 'https://w.atwiki.jp/f_go/pages/685.html'
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
