# 魔術礼装スキルアイコン設定

魔術礼装の各スキルには、`icon`で個別の画像ファイル名を設定します。

画像は`assets/skill-icons/`へ配置してください。

```js
{
  name: 'スキル名',
  icon: 'skill-example.png',
  baseCt: 12,
  target: 'ally',
  description: '味方単体の攻撃力をアップ(1T)。',
  effects: [
    {
      type: 'attackUp',
      target: 'selectedAlly',
      values: [20, 21, 22, 23, 24, 25, 26, 27, 28, 30],
      duration: 1
    }
  ]
}
```

## 設定規則

- `icon`にはファイル名だけを記述します。
- `assets/skill-icons/`を含むパス全体は記述しません。
- 3つのスキルへ、それぞれ別のファイル名を設定できます。
- `icon`が省略または空欄の場合は、互換表示として`skill-buff-add.png`を使用します。

```js
skills: [
  { name: 'スキル1', icon: 'skill-one.png', /* 以下省略 */ },
  { name: 'スキル2', icon: 'skill-two.png', /* 以下省略 */ },
  { name: 'スキル3', icon: 'skill-three.png', /* 以下省略 */ }
]
```
