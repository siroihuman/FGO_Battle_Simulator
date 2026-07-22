(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const lv = (values) => values.map(Number);

  DATA.servants.beast031 = {
    id: 'beast031',
    no: "031'",
    name: '────',
    classId: 'beast',
    rarity: 5,
    maxLevel: 90,
    maxHp: 12964,
    atk: 12603,
    levelStats: {
      1: { hp: 1901, atk: 1947 },
      50: { hp: 7778, atk: 7561 },
      60: { hp: 8685, atk: 8444 },
      70: { hp: 9852, atk: 9578 },
      80: { hp: 11278, atk: 10964 },
      max: { hp: 12964, atk: 12603 },
      100: { hp: 14203, atk: 13796 },
      120: { hp: 16692, atk: 16194 }
    },
    attribute: 'beast',
    alignment: 'neutralEvil',
    traits: [
      'サーヴァント', '性別不明', '人型', '中立', '悪', '獣', '獣の力',
      'ビースト', '叛逆する者', '人類の脅威', '炎(第三段階)', 'エヌマ特攻無効'
    ],
    cards: ['quick', 'quick', 'arts', 'buster', 'buster'],
    hits: { quick: 5, arts: 4, buster: 5, extra: 6, np: 12 },
    na: 0.54,
    nd: 3.00,
    starRate: 9.9,
    starWeight: 145,
    deathRate: 1.0,
    skillIcons: ['skill-quick-up.png', 'skill-np-charge.png', 'skill-buff-remove.png'],
    skills: [
      {
        id: 'primordialSin',
        name: '原初の罪業 EX',
        baseCt: 10,
        target: 'self',
        description: `自身のQuickカード性能をアップ[Lv](3T)
＆Busterカード性能をアップ[Lv](3T)
＆「Quick攻撃・Buster攻撃を全体攻撃化(1体あたりのダメージは単体攻撃時から半減)する状態」を付与(3T)`,
        effects: [
          { type: 'cardUp', target: 'self', card: 'quick', values: lv([30,32,34,36,38,40,42,44,46,50]), duration: 3 },
          { type: 'cardUp', target: 'self', card: 'buster', values: lv([30,32,34,36,38,40,42,44,46,50]), duration: 3 },
          { type: 'beast031MassNormalAttack', target: 'self', cards: ['quick', 'buster'], value: 50, duration: 3 }
        ]
      },
      {
        id: 'eternalSin',
        name: '永劫の罪過 EX',
        baseCt: 11,
        target: 'self',
        description: `自身のNPを増やす[Lv]
＋自身を除く味方全体の〔叛逆する者〕からNPを吸収する
＆吸収に成功した場合、対象に「ターン終了時自身のNPを増やす[Lv]＆攻撃力をアップ(3T)する状態」を付与[Lv](1回・1T)`,
        effects: []
      },
      {
        id: 'beastOfSlaughter',
        name: '鏖殺の獣 EX',
        baseCt: 9,
        target: 'self',
        description: `敵全体の強化状態を解除
＆即死耐性をダウン[Lv](3T)
＋自身に〔鏖殺の獣〕状態を付与(3T)
効果「毎ターンNP獲得状態を付与[Lv]＆NP獲得量をアップ＆即死成功時、自身のNPを増やす状態を付与」`,
        effects: []
      }
    ],
    passives: [
      {
        name: '怨讐の畔 EX',
        icon: 'skill-general-084.png',
        effects: [
          { type: 'beast031CooldownOnInstantDeath', value: 1 },
          { type: 'beast031SealMentalImmune', value: 1 }
        ]
      },
      { name: '獣の権能 C', icon: 'skill-general-024.png', effects: [{ type: 'critUp', value: 10 }] },
      {
        name: '単独顕現 A',
        icon: 'class-independent-action.png',
        effects: [
          { type: 'critUp', value: 10 },
          { type: 'deathResist', value: 10 },
          { type: 'mentalResist', value: 10 }
        ]
      },
      {
        name: 'ネガ・ランド',
        icon: 'skill-buff-add.png',
        effects: [
          { type: 'buffRemovalResist', value: 20 },
          { type: 'instantDeathImmune', value: 1 }
        ]
      }
    ],
    np: {
      id: 'originalSinHumanity',
      name: '原罪　人類■',
      reading: 'ノド',
      card: 'quick',
      target: 'singleEnemy',
      hits: 12,
      multipliers: [1200, 1600, 1800, 1900, 2000],
      description: `自身に「攻撃時のダメージ前に対象に〔憎悪〕状態<特殊なやけど状態>(5T)を付与する状態」を付与(3回・3T)
＆「攻撃時のダメージ前に自身に〔憎悪〕特攻状態(5T)を付与する状態」を付与(3回・3T)
＋敵単体に超強力な攻撃[Lv]
＆〔クラス相性有利のサーヴァント〕特攻<OC:特攻威力UP>
＆高確率で即死効果`,
      before: [
        { type: 'beast031HatredOnAttack', target: 'self', value: 5000, uses: 3, duration: 3 },
        { type: 'beast031HatredSpecialOnAttack', target: 'self', value: 20, uses: 3, duration: 3 }
      ],
      special: {
        kind: 'trait',
        key: 'クラス相性有利のサーヴァント',
        ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
      },
      after: [
        { type: 'beast031InstantDeath', target: 'selectedEnemy', value: 150 }
      ]
    },
    source: 'https://w.atwiki.jp/siroi_human/pages/797.html'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA.servants.beast031;
})(typeof window !== 'undefined' ? window : globalThis);
