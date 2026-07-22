(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const levelValues = (values) => values;

  DATA.servants.senNoRikyu = {
    id: 'senNoRikyu',
    no: '362',
    name: '千利休',
    classId: 'berserker',
    rarity: 5,
    maxLevel: 90,
    maxHp: 12028,
    atk: 12463,
    levelStats: {
      max: { hp: 12028, atk: 12463 }
    },
    attribute: 'man',
    traits: [
      'サーヴァント', '人型', '女性', '混沌', '悪', '人の力',
      'ヒト科', '浮遊している', 'バーサーカー'
    ],
    cards: ['quick', 'quick', 'quick', 'arts', 'buster'],
    hits: { quick: 5, arts: 3, buster: 3, extra: 5, np: 6 },
    na: 0.70,
    nd: 5.00,
    starRate: 4.9,
    starWeight: 9,
    deathRate: 45.5,
    skillIcons: [
      'skill-quick-up.png',
      'skill-np-charge.png',
      'skill-crit-up.png'
    ],
    skills: [
      {
        id: 'wabiNoKiwami',
        name: '侘びの極み A-',
        baseCt: 8,
        target: 'self',
        description: `味方全体のQuickカード性能をアップ[Lv](3T)
＆NP獲得量をアップ[Lv](3T)
＋スターを獲得[Lv]`,
        effects: [
          { type: 'cardUp', target: 'allAllies', card: 'quick', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
          { type: 'npGainUp', target: 'allAllies', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
          { type: 'stars', target: 'party', values: levelValues([5, 6, 7, 8, 9, 10, 11, 12, 13, 15]) }
        ]
      },
      {
        id: 'ichirinNoHana',
        name: '一輪の花 B',
        baseCt: 8,
        target: 'ally',
        description: `味方単体のNPを増やす[Lv]
＆宝具使用時のチャージ段階を2段階引き上げる状態を付与(1回・3T)
＆無敵状態を付与(1回・3T)`,
        effects: [
          { type: 'npCharge', target: 'selectedAlly', values: levelValues([20, 21, 22, 23, 24, 25, 26, 27, 28, 30]) },
          { type: 'ocUp', target: 'selectedAlly', value: 2, uses: 1, duration: 3 },
          { type: 'invincible', target: 'selectedAlly', uses: 1, duration: 3 }
        ]
      },
      {
        id: 'yugenTaruKuro',
        name: '幽玄たる黒 A',
        baseCt: 8,
        target: 'self',
        description: `自身のクリティカル威力をアップ[Lv](3T)
＆Quickカードのクリティカル威力をアップ[Lv](3T)
＆「Quick攻撃時のダメージ前に対象の防御力をダウン(3T)する状態」を付与(3T)`,
        effects: [
          { type: 'critUp', target: 'self', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
          { type: 'cardCritUp', target: 'self', card: 'quick', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
          {
            type: 'beforeCardDamageApplyDebuff',
            target: 'self',
            card: 'quick',
            debuffType: 'defenseDown',
            debuffValue: 10,
            debuffDuration: 3,
            chance: 100,
            normalCardsOnly: true,
            duration: 3
          }
        ]
      }
    ],
    passives: [
      {
        name: '狂化（寂） EX',
        icon: 'class-madness-enhancement.png',
        effects: [
          { type: 'cardUp', card: 'buster', value: 10 },
          { type: 'critUp', value: 5 }
        ]
      },
      {
        name: '陣地作成（侘） A',
        icon: 'class-territory-creation.png',
        effects: [
          { type: 'cardUp', card: 'arts', value: 8 },
          { type: 'mentalResist', value: 20 }
        ]
      },
      {
        name: '芸術審美（茶） A',
        icon: 'class-item-construction.png',
        effects: [{ type: 'debuffSuccess', value: 10 }]
      },
      {
        name: '融通無碍 B',
        icon: 'skill-np-gain-up.png',
        effects: [{ type: 'cardNpGainUp', card: 'quick', value: 10 }]
      }
    ],
    np: {
      id: 'ichigoIchie',
      name: '一期一会',
      reading: 'いちごいちえ',
      card: 'quick',
      target: 'allEnemies',
      hits: 6,
      multipliers: [600, 800, 900, 950, 1000],
      description: `敵全体に強力な攻撃[Lv]
＆〔人の力を持つ敵〕特攻<OC:特攻威力UP>
＆宝具封印状態を付与(1T)
＆呪い状態を付与(5T)`,
      before: [],
      special: {
        kind: 'trait',
        key: '人の力',
        ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
      },
      after: [
        { type: 'npSeal', target: 'allEnemies', duration: 1, debuff: true, chance: 100 },
        { type: 'curse', target: 'allEnemies', value: 1000, duration: 5, debuff: true, chance: 100 }
      ]
    },
    source: 'https://w.atwiki.jp/f_go/pages/5723.html'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA.servants.senNoRikyu;
})(typeof window !== 'undefined' ? window : globalThis);
