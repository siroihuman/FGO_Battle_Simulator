# カード性能・威力効果

カード種別は`quick`、`arts`、`buster`、`extra`を使用します。

## 状態type

| type | 表示 | 計算内容 |
|---|---|---|
| `cardUp` | カード性能アップ | カードごとの性能を上昇 |
| `cardDown` | カード性能ダウン | カードごとの性能を低下 |
| `cardPowerUp` | カード威力アップ | ダメージだけを上昇 |
| `cardPowerDown` | カード威力ダウン | ダメージだけを低下 |

`cardUp`と`cardPowerUp`、`cardDown`と`cardPowerDown`は同じアイコンを使用しますが、typeが異なるためバフ・デバフ一覧では必ず別枠で表示されます。

## 性能アップ・ダウンの計算範囲

| カード | ダメージ | NP獲得量 | スター発生率 |
|---|---:|---:|---:|
| Buster | 対象 | 対象外 | 対象外 |
| Arts | 対象 | 対象 | 対象外 |
| Quick | 対象 | 対象 | 対象 |
| Extra Attack | 対象 | 対象 | 対象 |

威力アップ・ダウンはQuick、Arts、Buster、Extra Attackのいずれもダメージだけへ反映します。宝具も宝具カード色に対応する威力アップ・ダウンの対象です。

## 記述例

### Quick性能アップ

```js
{ type: 'cardUp', target: 'self', card: 'quick', value: 30, duration: 3 }
```

### Arts性能ダウン

```js
{ type: 'cardDown', target: 'selectedEnemy', card: 'arts', value: 20, duration: 3, debuff: true }
```

### Buster威力アップ

```js
{ type: 'cardPowerUp', target: 'self', card: 'buster', value: 50, duration: 1 }
```

### Extra Attack威力ダウン

```js
{ type: 'cardPowerDown', target: 'selectedEnemy', card: 'extra', value: 30, duration: 3, debuff: true }
```

## アイコン

| 状態 | ファイル |
|---|---|
| Quickアップ | `Quickupstatus.webp` |
| Quickダウン | `Quickdown.webp` |
| Artsアップ | `Artsupstatus.webp` |
| Artsダウン | `Artsdown.webp` |
| Busterアップ | `Busterupstatus.webp` |
| Busterダウン | `Busterdown.webp` |
| Extra Attackアップ | `Extraattackup.webp` |

Extra Attackダウン専用素材は現時点で指定されていないため、表示上は`Extraattackup.webp`を共用します。専用素材が追加された場合は`js/card-buff-effects.js`の`CARD_ICONS.extra.down`を変更してください。

## クラススキルとクラススコア

通常のクラススキルは、従来どおりクラススキル固有アイコンを維持します。

クラススコアのQuick・Arts・Buster・Extra Attack性能アップは、各カード専用の状態アイコンを表示します。