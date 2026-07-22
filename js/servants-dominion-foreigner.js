(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  if (!DATA) throw new Error('Dominion Foreigner data requires js/data.js.');

  const levelValues = (values) => values.map(Number);

  const SERVANT = {
    id: 'dominionForeigner',
    no: "024'",
    name: '支配のフォーリナー',
    classId: 'foreigner',
    rarity: 5,
    maxLevel: 90,
    maxHp: 13095,
    atk: 12584,
    levelStats: {
      max: { hp: 13095, atk: 12584 },
      100: { hp: 14346, atk: 13775 },
      120: { hp: 16860, atk: 16169 }
    },
    attribute: 'earth',
    traits: [
      'サーヴァント', '性別不明', '混沌', '悪', '地の力', '人の力', '神性',
      '領域外の生命', '人類の脅威', 'クトゥルフ', 'エヌマ特攻無効'
    ],
    cards: ['quick', 'arts', 'arts', 'arts', 'buster'],
    hits: { quick: 5, arts: 2, buster: 4, extra: 3, np: 3 },
    na: 0.78,
    nd: 3.00,
    starRate: 14.5,
    starWeight: 145,
    deathRate: 5.0,
    skillIcons: [
      'skill-general-051.png',
      'skill-general-019.png',
      'skill-general-010.png'
    ],
    skills: [
      {
        id: 'eternalInquiry',
        name: '永劫の探求 EX',
        baseCt: 9,
        target: 'ally',
        description: `味方全体の宝具威力をアップ[Lv](3T)\n＆攻撃力をアップ[Lv](3T)\n＋味方単体のクリティカル威力をアップ[Lv](3T)\n＆スター集中度をアップ[Lv](3T)`,
        effects: [
          { type: 'npPowerUp', target: 'allAllies', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
          { type: 'attackUp', target: 'allAllies', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
          { type: 'critUp', target: 'selectedAlly', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
          { type: 'starWeightUp', target: 'selectedAlly', values: levelValues([3000, 3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600, 5000]), duration: 3 }
        ]
      },
      {
        id: 'pictureInTheHouse',
        name: '家のなかの絵 EX',
        baseCt: 9,
        target: 'ally',
        description: `味方単体のQuickカード性能をアップ[Lv](3T)\n＋自身を除く味方全体に毎ターンNP獲得状態を付与[Lv](5T)\n＆毎ターンスター獲得状態を付与[Lv](5T)`,
        effects: [
          { type: 'cardUp', target: 'selectedAlly', card: 'quick', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
          { type: 'npPerTurn', target: 'allOtherAllies', values: levelValues([2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9, 4.1, 5]), duration: 5 },
          { type: 'starsPerTurn', target: 'allOtherAllies', values: levelValues([5, 5, 6, 6, 7, 8, 8, 9, 9, 10]), duration: 5 }
        ]
      },
      {
        id: 'atTheMountainsOfMadness',
        name: '狂気の山脈にて EX',
        baseCt: 9,
        target: 'ally',
        description: `味方単体のNPを増やす[Lv]\n＆宝具使用時のチャージ段階を2段階引き上げる状態を付与(1回・3T)\n＋スターを獲得[Lv]`,
        effects: [
          { type: 'npCharge', target: 'selectedAlly', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]) },
          { type: 'ocUp', target: 'selectedAlly', value: 2, uses: 1, duration: 3 },
          { type: 'stars', target: 'party', values: levelValues([5, 6, 7, 8, 9, 10, 11, 12, 13, 15]) }
        ]
      }
    ],
    passives: [
      {
        name: '神話を現す者 EX',
        icon: 'skill-general-012.png',
        effects: [
          { type: 'aura', modifierType: 'npPerTurn', target: 'allAllies', value: 2.5, providerFrontlineOnly: true },
          {
            type: 'aura', modifierType: 'npPerTurn', target: 'allOtherAllies', value: 7.5,
            providerFrontlineOnly: true,
            condition: { kind: 'targetHasTrait', key: 'クトゥルフ' }
          },
          { type: 'aura', modifierType: 'debuffResist', target: 'allAllies', value: 25, providerFrontlineOnly: true }
        ]
      },
      {
        name: '空想の水 EX',
        icon: 'skill-general-019.png',
        effects: [
          { type: 'cardUp', card: 'quick', value: 12 },
          { type: 'damagePlus', value: 250 }
        ]
      },
      {
        name: '領域外の生命 EX',
        icon: 'class-general-013.png',
        effects: [
          { type: 'starsPerTurn', value: 2 },
          { type: 'debuffResist', value: 12 }
        ]
      },
      { name: '陣地作成 A', icon: 'class-general-012.png', effects: [{ type: 'cardUp', card: 'arts', value: 10 }] },
      { name: '道具作成 A+++', icon: 'class-general-011.png', effects: [{ type: 'debuffSuccess', value: 11.75 }] }
    ],
    np: {
      id: 'callOfCthulhu',
      name: '旧き共鳴する海底の都',
      reading: 'Call of Cthulhu',
      card: 'quick',
      target: 'allEnemies',
      hits: 3,
      multipliers: [800, 1000, 1100, 1150, 1200],
      description: `敵全体の防御強化状態を解除\n＆強力な攻撃[Lv]\n＆〔人の力を持つ敵〕特攻\n＋自身を除く味方全体の〔人の力を持つ味方〕のNPを増やす<OC:効果UP>\n＆攻撃力をアップ(3T)<OC:効果UP>\n＆宝具威力をアップ(3T)`,
      before: [
        { type: 'defenseBuffClear', target: 'allEnemies' }
      ],
      special: {
        kind: 'trait',
        key: '人の力',
        multiplier: 1.5
      },
      after: [
        {
          type: 'npCharge',
          target: 'allOtherAllies',
          ocValues: [10, 15, 20, 25, 30],
          targetCondition: { kind: 'targetHasTrait', key: '人の力' }
        },
        {
          type: 'attackUp',
          target: 'allOtherAllies',
          ocValues: [20, 25, 30, 35, 40],
          duration: 3,
          targetCondition: { kind: 'targetHasTrait', key: '人の力' }
        },
        { type: 'npPowerUp', target: 'allOtherAllies', value: 20, duration: 3, targetCondition: { kind: 'targetHasTrait', key: '人の力' } }
      ]
    },
    source: 'https://w.atwiki.jp/siroi_human/pages/766.html'
  };

  DATA.servants[SERVANT.id] = SERVANT;
  if (typeof module !== 'undefined' && module.exports) module.exports = SERVANT;
})(typeof window !== 'undefined' ? window : globalThis);
