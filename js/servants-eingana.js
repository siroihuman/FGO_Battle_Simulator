(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const lv = (values) => values.map(Number);
  const npLv = (values) => values.map(Number);
  const oc = (values) => values.map(Number);

  DATA.servants.eingana = {
    id: 'eingana',
    no: '015',
    name: 'エインガナ',
    classId: 'caster',
    rarity: 5,
    maxLevel: 90,
    maxHp: 16454,
    atk: 10214,
    levelStats: {
      1: { hp: 2414, atk: 1578 },
      50: { hp: 10036, atk: 6230 },
      60: { hp: 11682, atk: 7252 },
      70: { hp: 13163, atk: 8172 },
      80: { hp: 14809, atk: 9193 },
      max: { hp: 16454, atk: 10214 },
      100: { hp: 18026, atk: 11183 },
      120: { hp: 21183, atk: 13129 }
    },
    attribute: 'earth',
    alignment: 'neutralGood',
    traits: [
      'サーヴァント', '人型', '性別不明', '中立', '善', '地の力',
      'キャスター', '神性', '人類の脅威', 'ヒト科以外', '超巨大', '竜', '蛇'
    ],
    cards: ['quick', 'arts', 'arts', 'buster', 'buster'],
    hits: { quick: 3, arts: 3, buster: 3, extra: 4, np: 3 },
    na: 0.62,
    nd: 3.00,
    starRate: 10.8,
    starWeight: 51,
    deathRate: 20.0,
    skillIcons: [
      'skill-general-070.png',
      'skill-buster-up.png',
      'skill-general-030.png'
    ],
    skills: [
      {
        id: 'rainbowSerpent',
        name: '虹蛇 B',
        baseCt: 8,
        target: 'self',
        description: `自身の攻撃力をアップ[Lv](3T)
＆毎ターンNP獲得状態を付与(3T)
＆毎ターンHP回復状態を付与[Lv](3T)
＆「攻撃時に自身に最大HPがアップする状態(3T)を付与する状態」を付与[Lv](3T)`,
        effects: [
          { type: 'attackUp', target: 'self', values: lv([20,22,24,26,28,30,32,34,36,40]), duration: 3 },
          { type: 'npPerTurn', target: 'self', value: 10, duration: 3, statusIcon: 'Npgainturn.webp' },
          { type: 'einganaHpPerTurn', target: 'self', values: lv([500,550,600,650,700,750,800,850,900,1000]), duration: 3, statusIcon: 'Hpregen.webp' },
          { type: 'einganaMaxHpOnAttack', target: 'self', values: lv([5000,5500,6000,6500,7000,7500,8000,8500,9000,10000]), duration: 3, statusIcon: 'Buffatk.webp' }
        ]
      },
      {
        id: 'manaBurstRainbow',
        name: '魔力放出（虹） A++',
        baseCt: 8,
        target: 'self',
        description: `自身のBusterカード性能をアップ[Lv](3T)
＆宝具威力をアップ(3T)
＆NPを増やす`,
        effects: [
          { type: 'cardUp', target: 'self', card: 'buster', values: lv([30,32,34,36,38,40,42,44,46,50]), duration: 3 },
          { type: 'npPowerUp', target: 'self', value: 20, duration: 3 },
          { type: 'npCharge', target: 'self', value: 10 }
        ]
      },
      {
        id: 'creation',
        name: '創造 EX',
        baseCt: 9,
        target: 'self',
        description: `自身に「ターン終了時に自身の最大HPの増加量が30000以上の時、致死ダメージ回避状態を付与(1回・1T)する状態」を付与(3T)
＆「ターン終了時に自身の最大HPの増加量が60000以上の時、NPを増やす状態」を付与(3T)
＆「ターン終了時に自身の最大HPの増加量が90000以上の時、宝具威力を超絶アップ(1T)する状態」を付与(3T)
＆スキル使用後に使用したスキルのチャージを1進める状態を付与(3T)`,
        effects: [
          { type: 'einganaCreationThresholds', target: 'self', duration: 3, statusIcon: 'DelayedBuff.webp' },
          { type: 'einganaAfterSkillCooldown', target: 'self', duration: 3, statusIcon: 'Skillcooldown.webp' }
        ]
      }
    ],
    passives: [
      { name: '陣地作成 EX', icon: 'class-general-012.png', effects: [{ type: 'cardUp', card: 'arts', value: 12 }] },
      { name: '単独行動 A', icon: 'class-general-002.png', effects: [{ type: 'critUp', value: 10 }] },
      { name: '神性 EX', icon: 'class-divinity.png', effects: [{ type: 'damagePlus', value: 250 }] }
    ],
    np: {
      id: 'toonMarikungor',
      name: '旅立ちへの讃頌',
      reading: 'トゥーン・マリクンゴル',
      card: 'buster',
      target: 'allEnemies',
      hits: 3,
      multipliers: [300,400,450,475,500],
      description: `自身に最大HPがアップする状態を付与(5T)<OC:効果UP>
＆HPが多いほど防御力がアップする状態を付与[Lv](5T)
＆「ターン終了時に自身のHPが75％以上の時、NPを増やす状態」を付与(5T)
＆「ターン終了時に自身のHPが74％以下の時、HPを回復する状態」を付与(5T)
＋敵全体に強力な攻撃[Lv]`,
      before: [
        { type: 'einganaMaxHpUp', target: 'self', ocValues: oc([10000,20000,30000,40000,50000]), duration: 5, statusIcon: 'Maxhpup.webp' },
        { type: 'einganaHighHpDefense', target: 'self', npLevelValues: npLv([30,35,40,45,50]), duration: 5, statusIcon: 'Defenseup.webp' },
        { type: 'einganaHpTurnBranches', target: 'self', duration: 5, highNp: 20, lowHeal: 5000, statusIcon: 'DelayedBuff.webp' }
      ],
      after: []
    },
    source: 'https://w.atwiki.jp/siroi_human/pages/875.html'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA.servants.eingana;
})(typeof window !== 'undefined' ? window : globalThis);
