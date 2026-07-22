(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  if (!DATA) throw new Error('Rlyeh data requires js/data.js.');

  const lv = (values) => values.map(Number);

  DATA.servants.rlyeh = {
    id: 'rlyeh',
    no: "024'",
    name: 'ルルイエ',
    classId: 'beast',
    rarity: 5,
    maxLevel: 90,
    maxHp: 15600,
    atk: 11440,
    levelStats: {
      max: { hp: 15600, atk: 11440 },
      100: { hp: 17090, atk: 12523 },
      120: { hp: 20086, atk: 14699 }
    },
    attribute: 'beast',
    traits: [
      'サーヴァント', '性別不明', '混沌', '悪', '獣の力', 'ビースト', '神性',
      '領域外の生命', 'ヒト科以外', '超巨大', '人類の脅威', 'クトゥルフ', 'エヌマ特攻無効'
    ],
    cards: ['quick', 'arts', 'arts', 'arts', 'buster'],
    hits: { quick: 3, arts: 4, buster: 4, extra: 6, np: 4 },
    na: 0.39,
    nd: 3.00,
    starRate: 14.4,
    starWeight: 144,
    deathRate: 5.0,
    skillIcons: ['skill-buff-add.png', 'skill-buff-add.png', 'skill-buff-add.png'],
    skills: [
      {
        id: 'answeringNightmare',
        name: '呼応する悪夢 A++',
        baseCt: 10,
        target: 'ally',
        description: `味方単体のスキルチャージを2進める\n＆強化解除耐性をアップ[Lv](3T)\n＋選択した味方単体を除く味方全体のスキルチャージを1進める\n＆HPを2000減らす【デメリット】`,
        effects: [
          { type: 'cooldownReduce', target: 'selectedAlly', value: 2 },
          { type: 'buffRemovalResist', target: 'selectedAlly', values: lv([50,55,60,65,70,75,80,85,90,100]), duration: 3 },
          { type: 'cooldownReduce', target: 'allOtherAllies', value: 1 },
          { type: 'hpLoss', target: 'allOtherAllies', value: 2000 }
        ]
      },
      {
        id: 'cityOfTheOpenSea',
        name: '絶海の都市 A++',
        baseCt: 9,
        target: 'ally',
        description: `味方単体のNPを増やす[Lv]\n＋自身を除く味方全体に毎ターンスター獲得状態を付与[Lv](3T)\n＆クリティカル威力をアップ[Lv](3T)`,
        effects: [
          { type: 'npCharge', target: 'selectedAlly', values: lv([30,32,34,36,38,40,42,44,46,50]) },
          { type: 'starsPerTurn', target: 'allOtherAllies', values: lv([5,5,6,6,7,8,8,9,9,10]), duration: 3 },
          { type: 'critUp', target: 'allOtherAllies', values: lv([20,21,22,23,24,25,26,27,28,30]), duration: 3 }
        ]
      },
      {
        id: 'greatOldOne',
        name: '古の支配者 A++',
        baseCt: 11,
        target: 'allyCardType',
        description: `カードタイプを選択し、味方単体に選択したタイプのカード性能アップブースト状態を付与[Lv](1T)<重複不可>\n＆選択したタイプのカード性能をアップ[Lv](1T)\n＆「ターン終了時に強化状態を解除し、永久睡眠状態を付与する状態(1回)」<耐性無効・解除不能>を付与【デメリット】`,
        effects: []
      }
    ],
    passives: [
      { name: '獣の権能 C', icon: 'skill-general-024.png', effects: [{ type: 'critUp', value: 10 }] },
      { name: '単独顕現 EX', icon: 'class-independent-action.png', effects: [{ type: 'critUp', value: 12 }, { type: 'deathResist', value: 12 }, { type: 'mentalResist', value: 12 }] },
      { name: '領域外の生命 EX', icon: 'class-foreigner.png', effects: [{ type: 'starsPerTurn', value: 2 }, { type: 'debuffResist', value: 12 }] },
      { name: '絶海にて微睡む太古の支配者', icon: 'skill-buff-add.png', effects: [] }
    ],
    np: {
      id: 'pointNemo',
      name: '旧き絶海にて待ちし夢',
      reading: 'ポイント・ネモ',
      card: 'arts',
      target: 'allEnemies',
      hits: 4,
      multipliers: [450, 600, 675, 712.5, 750],
      description: `自身の宝具威力をアップ(3T)<OC:効果UP>\n＋敵全体に強力な攻撃[Lv]\n＆〔ヒト科・今を生きる人類〕特攻[Lv]\n＆高確率で即死効果`,
      before: [
        { type: 'npPowerUp', target: 'self', ocValues: [10,15,20,25,30], duration: 3 }
      ],
      special: {
        kind: 'anyTraitNpLevel',
        keys: ['ヒト科', '今を生きる人類'],
        npLevelMultipliers: [1.5, 1.75, 1.875, 1.937, 2]
      },
      after: [
        { type: 'rlyehInstantDeath', target: 'allEnemies', value: 150 }
      ]
    },
    source: 'https://w.atwiki.jp/siroi_human/pages/815.html'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA.servants.rlyeh;
})(typeof window !== 'undefined' ? window : globalThis);
