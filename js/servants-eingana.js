(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const lv = (values) => values.map(Number);
  const oc = (values) => values.map(Number);

  DATA.servants.eingana = {
    id: 'eingana',
    no: '015',
    name: 'エインガナ',
    classId: 'caster',
    rarity: 5,
    maxLevel: 90,
    maxHp: 15820,
    atk: 10215,
    levelStats: {
      1: { hp: 2320, atk: 1578 },
      50: { hp: 9650, atk: 6231 },
      60: { hp: 11232, atk: 7252 },
      70: { hp: 12656, atk: 8172 },
      80: { hp: 14238, atk: 9193 },
      max: { hp: 15820, atk: 10215 },
      100: { hp: 17332, atk: 11182 },
      120: { hp: 20369, atk: 13125 }
    },
    attribute: 'sky',
    alignment: 'neutralBalanced',
    traits: [
      'サーヴァント', '性別不明', '中立', '中庸', '天の力', 'キャスター',
      '神性', 'ヒト科以外', 'ケモノ科', '魔獣型', '超巨大', '人類の脅威', 'エヌマ特攻無効'
    ],
    cards: ['quick', 'arts', 'arts', 'buster', 'buster'],
    hits: { quick: 3, arts: 3, buster: 3, extra: 6, np: 3 },
    na: 0.62,
    nd: 3.00,
    starRate: 11.3,
    starWeight: 51,
    deathRate: 30.0,
    skillIcons: [
      'skill-general-070.png',
      'skill-buster-up.png',
      'skill-general-030.png'
    ],
    skills: [
      {
        id: 'rainbowSerpent',
        name: '虹蛇 B',
        baseCt: 10,
        target: 'self',
        description: `自身に最大HPがアップする状態を付与[Lv](5T)
＆HPが多いほど防御力がアップする状態を付与[Lv](5T)
＆「ターン終了時に自身のHPが75％以上の時、NPを増やす状態」を付与(5T)
＆「ターン終了時に自身のHPが74％以下の時、HPを回復する状態」を付与(5T)`,
        effects: [
          { type: 'einganaMaxHpUp', target: 'self', values: lv([5000,5500,6000,6500,7000,7500,8000,8500,9000,10000]), duration: 5, statusIcon: 'Maxhpup.webp' },
          { type: 'einganaHighHpDefense', target: 'self', value: 50, duration: 5, statusIcon: 'Defenseup.webp' },
          { type: 'einganaHpTurnBranches', target: 'self', duration: 5, highNp: 20, lowHeal: 2000, statusIcon: 'DelayedBuff.webp' }
        ]
      },
      {
        id: 'manaBurstRainbow',
        name: '魔力放出（虹） A++',
        baseCt: 9,
        target: 'self',
        description: `自身のBusterカード性能をアップ[Lv](3回・3T)
＆NPを増やす[Lv]
＆毎ターンNP獲得状態を付与(3T)`,
        effects: [
          { type: 'cardUp', target: 'self', card: 'buster', values: lv([30,32,34,36,38,40,42,44,46,50]), uses: 3, duration: 3 },
          { type: 'npCharge', target: 'self', values: lv([30,32,34,36,38,40,42,44,46,50]) },
          { type: 'npPerTurn', target: 'self', value: 10, duration: 3, statusIcon: 'Npgainturn.webp' }
        ]
      },
      {
        id: 'creation',
        name: '創造 EX',
        baseCt: 11,
        target: 'self',
        description: `自身のスキルチャージを1進める
＆毎ターンHP回復状態を付与[Lv](3T)
＆「攻撃時に自身に最大HPがアップする状態(3T)を付与する状態」を付与[Lv](3T)
＆「ターン終了時に自身の最大HPの増加量が30000以上の時、致死ダメージ回避状態を付与(1回・1T)する状態」を付与(3T)
＆「ターン終了時に自身の最大HPの増加量が60000以上の時、NPを増やす状態」を付与(3T)
＆「ターン終了時に自身の最大HPの増加量が90000以上の時、宝具威力を超絶アップ(1T)する状態」を付与(3T)`,
        effects: [
          { type: 'cooldownReduce', target: 'self', value: 1 },
          { type: 'einganaHpPerTurn', target: 'self', values: lv([1000,1100,1200,1300,1400,1500,1600,1700,1800,2000]), duration: 3, statusIcon: 'Hpregen.webp' },
          { type: 'einganaMaxHpOnAttack', target: 'self', values: lv([3000,3200,3400,3600,3800,4000,4200,4400,4600,5000]), duration: 3, statusIcon: 'Buffatk.webp' },
          { type: 'einganaCreationThresholds', target: 'self', duration: 3, thresholdNp: 50, thresholdNpPower: 200, statusIcon: 'DelayedBuff.webp' }
        ]
      }
    ],
    passives: [
      { name: '陣地作成 EX', icon: 'class-general-012.png', effects: [{ type: 'cardUp', card: 'arts', value: 12 }] },
      { name: '単独行動 A+', icon: 'class-general-002.png', effects: [{ type: 'critUp', value: 11 }] },
      { name: '神性 EX', icon: 'class-divinity.png', effects: [{ type: 'damagePlus', value: 250 }] }
    ],
    np: {
      id: 'einganaVoidDesert',
      name: '無の砂漠',
      reading: 'エインガナ',
      card: 'buster',
      rank: 'EX',
      category: '結界宝具',
      target: 'allEnemies',
      hits: 3,
      multipliers: [300,400,450,475,500],
      description: `敵全体に強力な攻撃[Lv]
＆高確率で即死効果
＋自身のNPをリチャージ
＆最大HPがアップする状態を付与(5T)<OC:効果UP>`,
      instantDeathChance: 100,
      before: [],
      after: [
        { type: 'npCharge', target: 'self', value: 20 },
        { type: 'einganaMaxHpUp', target: 'self', ocValues: oc([5000,6250,7500,8750,10000]), duration: 5, statusIcon: 'Maxhpup.webp' }
      ]
    },
    source: 'https://w.atwiki.jp/siroi_human/pages/875.html'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA.servants.eingana;
})(typeof window !== 'undefined' ? window : globalThis);
