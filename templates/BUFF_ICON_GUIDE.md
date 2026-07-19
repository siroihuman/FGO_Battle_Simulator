# バフ・デバフアイコンの指定方法

アイコンの対応表は `js/data.js` の `statusIcons` にあります。

```js
statusIcons: {
  attackUp: 'Attackup.webp',
  cardUp: 'Statusup.webp',
  traitPowerUp: 'Powerup.webp'
}
```

左側は効果の `type`、右側は `assets/status-icons` フォルダー内の画像ファイル名です。

例として、特攻状態を別の画像へ変更する場合は次のようにします。

```js
traitPowerUp: 'Dragontrait.webp'
```

個別効果だけ別アイコンにしたい場合は、効果へ `statusIcon` を追加してください。

```js
{
  type: 'traitPowerUp',
  target: 'self',
  trait: '神性',
  value: 30,
  duration: 3,
  statusIcon: 'Dragontrait.webp'
}
```

`statusIcon` がある場合は個別指定を優先し、ない場合は `statusIcons` の共通設定を使用します。
