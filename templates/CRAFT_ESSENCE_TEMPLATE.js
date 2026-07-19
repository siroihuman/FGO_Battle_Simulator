// js/data.js の craftEssences: { ... } 内へ追加してください。
yourCraftEssence: {
  id: 'yourCraftEssence',          // 他と重複しない半角英数字ID
  name: '新規概念礼装',
  atk: 0,                          // 装備時に加算するATK
  hp: 0,                           // 装備時に加算する最大HP
  description: '礼装の説明。\nこのように\\nではなく、実際の改行にはバッククォートも利用できます。',
  effects: [
    { type: 'npCharge', value: 50 },
    // 永続バフ例
    // { type: 'cardUp', card: 'buster', value: 10 }
  ]
},
