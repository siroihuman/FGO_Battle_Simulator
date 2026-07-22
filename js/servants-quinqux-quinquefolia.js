(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const lv = (values) => values.map(Number);
  const oc = (values) => values.map(Number);

  DATA.servants.quinquxQuinquefolia = {
    id: 'quinquxQuinquefolia',
    no: '106',
    name: 'クインクス・キンケフォリア',
    classId: 'alterEgo',
    rarity: 5,
    maxLevel: 90,
    maxHp: 12696,
    atk: 12342,
    levelStats: {
      1: { hp: 1862, atk: 1907 },
      50: { hp: 7363, atk: 7158 },
      60: { hp: 7998, atk: 7775 },
      70: { hp: 9141, atk: 8886 },
      80: { hp: 10791, atk: 10490 },
      max: { hp: 12696, atk: 12342 },
      100: { hp: 13909, atk: 13510 },
      120: { hp: 16347, atk: 15858 }
    },
    attribute: 'earth',
    alignment: 'chaoticNeutral',
    traits: [
      'サーヴァント', '人型', '性別不明', '混沌', '中庸', '地の力',
      'アルターエゴ', '神性', 'ヒト科以外', '対人',
      '霊衣を持つ者（カルナーヴァレ・タキトゥム）', 'エヌマ特攻無効',
      'クインクス・キンケフォリア'
    ],
    cards: ['quick', 'arts', 'buster', 'buster', 'buster'],
    hits: { quick: 4, arts: 4, buster: 4, extra: 5, np: 4 },
    na: 0.58,
    nd: 4.00,
    starRate: 10.2,
    starWeight: 104,
    deathRate: 35.0,
    skillIcons: [
      'skill-general-084.png',
      'skill-np-charge.png',
      'skill-general-062.png'
    ],
    skills: [
      {
        id: 'maskBelongingToNoOne',
        name: '誰のものでもない仮面 A+',
        baseCt: 10,
        target: 'self',
        description: `自身を除く先頭の味方単体の姿を自身の姿に変貌させ、スキルと宝具を換装<クラススコア効果は元のクラスのままとなる>(1T)
＆スキル1を使用不可にする状態を付与(1T)<解除不能>
＆NPを増やす[Lv]`,
        effects: []
      },
      {
        id: 'festivalRotation',
        name: '祝祭輪転 A',
        baseCt: 10,
        target: 'self',
        description: `味方全体のNPを増やす[Lv]
＆攻撃力をアップ[Lv](3T)
＆スキルチャージを1進める
＋自身を除く味方全体の防御強化状態を解除〖デメリット〗`,
        effects: [
          { type: 'npCharge', target: 'allAllies', values: lv([10,11,12,13,14,15,16,17,18,20]) },
          { type: 'attackUp', target: 'allAllies', values: lv([10,11,12,13,14,15,16,17,18,20]), duration: 3 },
          { type: 'cooldownReduce', target: 'allAllies', value: 1 }
        ]
      },
      {
        id: 'hundredFacedJester',
        name: '百貌の道化 B',
        baseCt: 9,
        target: 'enemy',
        description: `敵単体の強化状態を解除
＆スキル封印状態を付与(1T)
＋味方全体の〔クインクス・キンケフォリア〕に〔未強化状態または敗者の代償〕特攻状態を付与[Lv](3T)
＋自身のNPを増やす[Lv]`,
        effects: [
          { type: 'buffClear', target: 'selectedEnemy' },
          { type: 'skillSeal', target: 'selectedEnemy', duration: 1, debuff: true, chance: 100 },
          { type: 'quinquxUnbuffedOrLoserPower', target: 'allAllies', values: lv([30,32,34,36,38,40,42,44,46,50]), duration: 3 },
          { type: 'npCharge', target: 'self', values: lv([30,32,34,36,38,40,42,44,46,50]) }
        ]
      }
    ],
    passives: [
      {
        name: '複合神格 EX',
        icon: 'class-divinity.png',
        effects: [
          { type: 'damagePlus', value: 300 },
          { type: 'damageCut', value: 300 },
          { type: 'npPerTurn', value: 2.5 }
        ]
      },
      {
        name: '多重人格隔離 A',
        icon: 'class-madness-enhancement.png',
        effects: [
          { type: 'cardUp', card: 'buster', value: 10 },
          { type: 'mentalDebuffImmune', value: 1 },
          { type: 'skillSealImmune', value: 1 }
        ]
      },
      {
        name: '狡知の星 A',
        icon: 'class-independent-action.png',
        effects: [
          { type: 'starsPerTurn', value: 2 },
          { type: 'debuffResist', value: 20 }
        ]
      },
      {
        name: '勝者には栄光を、敗者には代償を、観客には喝采を A',
        icon: 'skill-general-084.png',
        effects: [
          { type: 'quinquxWinnerGlory', value: 50 },
          { type: 'quinquxAudienceApplause', value: 20 }
        ]
      },
      {
        name: 'ハイ・サーヴァント A',
        icon: 'class-high-servant.png',
        effects: []
      }
    ],
    np: {
      id: 'coronaSaltans',
      name: '万色劇場・夜に踊るは道化の王冠',
      reading: 'コローナ・サルタンス',
      card: 'buster',
      target: 'allEnemies',
      hits: 4,
      multipliers: [400, 500, 550, 575, 600],
      description: `味方全体のQuickカード性能をアップ(3T)<OC:効果UP>
＆Artsカード性能をアップ(3T)<OC:効果UP>
＆Busterカード性能をアップ(3T)<OC:効果UP>
＆攻撃力をアップ(3T)
＆宝具威力をアップ(3T)
＋〔敗者の代償〕状態の敵全体の攻撃力をダウン(3T)
＋敵全体に強力な攻撃[Lv]
＆〔敗者の代償〕特攻<OC:特攻威力UP>
＆敗者の代償状態<特殊な防御力ダウン状態>を付与(5T)`,
      before: [
        { type: 'cardUp', target: 'allAllies', card: 'quick', ocValues: oc([10,15,20,25,30]), duration: 3 },
        { type: 'cardUp', target: 'allAllies', card: 'arts', ocValues: oc([10,15,20,25,30]), duration: 3 },
        { type: 'cardUp', target: 'allAllies', card: 'buster', ocValues: oc([10,15,20,25,30]), duration: 3 },
        { type: 'attackUp', target: 'allAllies', value: 10, duration: 3 },
        { type: 'npPowerUp', target: 'allAllies', value: 10, duration: 3 },
        { type: 'quinquxLoserAttackDown', target: 'allEnemies', value: 20, duration: 3 }
      ],
      special: {
        kind: 'quinquxLosersCost',
        ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
      },
      after: [
        { type: 'quinquxLosersCost', target: 'allEnemies', value: 30, duration: 5, debuff: true, chance: 500 }
      ]
    },
    source: 'https://w.atwiki.jp/siroi_human/pages/918.html'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA.servants.quinquxQuinquefolia;
})(typeof window !== 'undefined' ? window : globalThis);
