// js/data.js の servants: { ... } 内へ追加します。
yourServant: {
  id: 'yourServant', no: '000', name: '新規サーヴァント',
  classId: 'saber', rarity: 5, maxLevel: 90,

  // 育成段階ごとの「フォウ・概念礼装を含まない」基礎HP/ATK
  maxHp: 12000, atk: 11000,
  levelStats: {
    max: { hp: 12000, atk: 11000 }, // 最終再臨・通常のレベル上限
    100: { hp: 13200, atk: 12100 },
    120: { hp: 15500, atk: 14200 }
  },

  attribute: 'earth',
  // 特性名は敵側の記述式特性と完全に同じ文字列を使います。
  traits: ['サーヴァント', '人型', '王'],
  cards: ['quick', 'arts', 'arts', 'buster', 'buster'],
  hits: { quick: 4, arts: 3, buster: 2, extra: 5, np: 5 },
  na: 0.70, nd: 3.00, starRate: 10.0, starWeight: 100, deathRate: 30.0,

  skillIcons: ['skill-attack-up.png','skill-np-charge.png','skill-buster-up.png'],
  skills: [
    { name:'スキル1', baseCt:8, target:'self', description:`1行目\n2行目`, effects:[] },
    { name:'スキル2', baseCt:8, target:'ally', description:'説明', effects:[] },
    { name:'スキル3', baseCt:8, target:'enemy', description:'説明', effects:[] }
  ],
  passives: [],
  np: { id:'yourNp', name:'宝具名', reading:'読み', card:'buster', target:'allEnemies', hits:5,
    multipliers:[300,400,450,475,500], description:'説明', before:[], after:[] },
  source: '資料URL'
},
