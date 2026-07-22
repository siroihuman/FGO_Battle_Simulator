(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const lv = (values) => values.map(Number);
  const npLv = (values) => values.map(Number);
  const oc = (values) => values.map(Number);

  DATA.servants.konohanasakuyaHime = {
    id: 'konohanasakuyaHime',
    no: '069',
    name: '木花之佐久夜毘売',
    classId: 'caster',
    rarity: 5,
    maxLevel: 90,
    maxHp: 15846,
    atk: 9585,
    levelStats: {
      1: { hp: 2324, atk: 1481 },
      50: { hp: 9666, atk: 5846 },
      60: { hp: 11250, atk: 6805 },
      70: { hp: 12676, atk: 7668 },
      80: { hp: 14261, atk: 8626 },
      max: { hp: 15846, atk: 9585 },
      100: { hp: 17360, atk: 10492 },
      120: { hp: 20402, atk: 12316 }
    },
    attribute: 'sky',
    alignment: 'lawfulGood',
    traits: [
      'サーヴァント', '人型', '女性', '秩序', '善', '天の力',
      'キャスター', '神性', 'ヒト科以外', '対人'
    ],
    cards: ['quick', 'arts', 'arts', 'arts', 'buster'],
    hits: { quick: 3, arts: 3, buster: 3, extra: 6, np: 0 },
    na: 0.54,
    nd: 3.00,
    starRate: 10.8,
    starWeight: 51,
    deathRate: 33.0,
    skillIcons: [
      'skill-np-per-turn.png',
      'skill-general-048.png',
      'skill-np-charge.png'
    ],
    skills: [
      {
        id: 'priestessOfBlossomingPrincess',
        name: '花咲耶の巫祝 A+',
        baseCt: 7,
        target: 'self',
        description: `味方全体に毎ターンNP獲得状態を付与[Lv](5T)
＆毎ターンHP回復状態を付与[Lv](5T)
＆攻撃力をアップ[Lv](1回・5T)
＆強化解除耐性をアップ[Lv](1回・5T)`,
        effects: [
          { type: 'npPerTurn', target: 'allAllies', values: lv([2.5,2.75,3,3.25,3.5,3.75,4,4.25,4.5,5]), duration: 5 },
          { type: 'konohanaHpPerTurn', target: 'allAllies', values: lv([500,550,600,650,700,750,800,850,900,1000]), duration: 5 },
          { type: 'attackUp', target: 'allAllies', values: lv([10,11,12,13,14,15,16,17,18,20]), uses: 1, duration: 5 },
          { type: 'buffRemovalResist', target: 'allAllies', values: lv([50,55,60,65,70,75,80,85,90,100]), uses: 1, duration: 5, statusIcon: 'Removalresistup.webp' }
        ]
      },
      {
        id: 'fireAvoidanceBlessing',
        name: '火避けの加護 A+',
        baseCt: 8,
        target: 'self',
        description: `味方全体に回避状態を付与(2回・3T)
＆弱体状態を解除
＆Artsカード性能をアップ[Lv](3T)
＆防御力をアップ[Lv](3T)`,
        effects: [
          { type: 'evade', target: 'allAllies', uses: 2, duration: 3 },
          { type: 'debuffClear', target: 'allAllies' },
          { type: 'cardUp', target: 'allAllies', card: 'arts', values: lv([10,11,12,13,14,15,16,17,18,20]), duration: 3 },
          { type: 'defenseUp', target: 'allAllies', values: lv([10,11,12,13,14,15,16,17,18,20]), duration: 3 }
        ]
      },
      {
        id: 'powerOfFuji',
        name: '富士の御力 A++',
        baseCt: 9,
        target: 'self',
        description: `味方全体のNPを増やす[Lv]
＋自身のNPを増やす[Lv]
＆防御力をアップ[Lv](3T)
＆ターゲット集中状態を付与(3T)`,
        effects: [
          { type: 'npCharge', target: 'allAllies', values: lv([10,11,12,13,14,15,16,17,18,20]) },
          { type: 'npCharge', target: 'self', values: lv([20,21,22,23,24,25,26,27,28,30]) },
          { type: 'defenseUp', target: 'self', values: lv([30,32,34,36,38,40,42,44,46,50]), duration: 3 },
          { type: 'targetFocus', target: 'self', value: 300, duration: 3 }
        ]
      }
    ],
    passives: [
      { name: '陣地作成 C', icon: 'class-general-012.png', effects: [{ type: 'cardUp', card: 'arts', value: 6 }] },
      { name: '道具作成 C', icon: 'class-general-011.png', effects: [{ type: 'debuffSuccess', value: 6 }] },
      {
        name: '女神の神核 EX',
        icon: 'class-general-003.png',
        effects: [
          { type: 'damagePlus', value: 300 },
          { type: 'debuffResist', value: 30 }
        ]
      }
    ],
    np: {
      id: 'konohanaIchiya',
      name: '木花一夜',
      reading: 'このはないちや',
      card: 'arts',
      target: 'support',
      hits: 0,
      multipliers: [0,0,0,0,0],
      description: `自身にフィールドを〔陽射し〕特性にする状態を付与(5T)
＆〔桜花爛漫〕状態を付与(5T)<〔陽射し〕のあるフィールドでのみ有効>
効果「自身を除く味方全体にスキル使用後に使用したスキルのチャージを1進める状態を付与
＆毎ターンNP獲得状態を付与[Lv](5T)」
＋自身に拘束状態を付与(3T)【デメリット】
＆コマンドカード選出不能状態を付与<1騎の場合は無効>(5T)【デメリット】
＆スキルチャージを進める<OC:効果UP>
＆毎ターンNP獲得状態を付与(3T)`,
      before: [
        { type: 'konohanaSunlightField', target: 'self', duration: 5, statusIcon: 'Dragontrait.webp' },
        { type: 'konohanaCherryBlossom', target: 'self', duration: 5, npLevelValues: npLv([10,12.5,15,17.5,20]), statusIcon: 'Dragontrait.webp' }
      ],
      after: [
        { type: 'konohanaBind', target: 'self', duration: 3, debuff: true, unremovable: true, statusIcon: 'Stunstatus.webp' },
        { type: 'konohanaCommandCardSeal', target: 'self', duration: 5, debuff: true, unremovable: true, statusIcon: 'Commandcardsseal.webp' },
        { type: 'cooldownReduce', target: 'self', ocValues: oc([1,2,3,4,5]) },
        { type: 'npPerTurn', target: 'self', value: 10, duration: 3 }
      ]
    },
    source: 'https://w.atwiki.jp/siroi_human/pages/831.html'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA.servants.konohanasakuyaHime;
})(typeof window !== 'undefined' ? window : globalThis);
