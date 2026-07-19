// js/data.js の mysticCodes: { ... } 内へ追加してください。
yourMysticCode: {
  id: 'yourMysticCode',
  name: '新規魔術礼装',
  skills: [
    {
      name: 'スキル1',
      baseCt: 12,
      target: 'ally', // self / ally / enemy / orderChange
      description: `1行目
2行目`,
      effects: [
        { type: 'attackUp', target: 'selectedAlly', values: [10,11,12,13,14,15,16,17,18,20], duration: 1 }
      ]
    },
    { name:'スキル2', baseCt:12, target:'self', description:'説明', effects:[] },
    { name:'スキル3', baseCt:15, target:'orderChange', description:'前衛と控えを入れ替える。', effects:[{type:'orderChange'}] }
  ]
},
