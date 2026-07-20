# サーヴァント別例外処理ガイド

## 目的

サーヴァント固有の条件分岐や特殊処理を `js/engine.js` へ直接追加せず、1騎ごとのファイルへ分離します。

```text
js/servant-mechanics/
  registry.js
  index.js
  koyanskayaLight.js
  fenrir.js
  ...
```

## 3分類

### Common Effects

付与対象・数値・継続ターンだけで共通処理できる効果です。原則として `js/servants.js` の `effects` に記述し、個別コードは書きません。

### Trigger Effects

効果自体は共通処理ですが、攻撃時・被ダメージ時・撃破時など特殊なタイミングで発動します。

状態が別サーヴァントへ付与される可能性がある場合は `registerEffectHook` を使用します。これにより、効果を作ったサーヴァントのファイルで処理を管理しつつ、実際の付与先で発動できます。

### Unique Mechanics

宝具換装、スキル換装、カード変更、クラス変更、フィールド変更、独自ゲージなど、共通効果へ変換できないものです。`registerServant` の `hooks` に処理を登録します。

## 新規ファイルの作成

`templates/SERVANT_MECHANICS_TEMPLATE.js` をコピーし、ファイル名をサーヴァントIDにします。

```text
js/servant-mechanics/yourServantId.js
```

`servantId` は `js/servants.js` の `id` と完全に一致させてください。

## 読み込み追加

ブラウザ用として `index.html` の `registry.js` より後、`engine.js` より前へ追加します。

```html
<script src="js/servant-mechanics/yourServantId.js"></script>
```

Node.jsテスト用として `js/servant-mechanics/index.js` にも追加します。

```js
require('./yourServantId.js');
```

## Effect Hook

```js
M.registerEffectHook(
  'effectOwnerServantId',
  'afterAttack',
  'statusType',
  function (engine, context) {
    const actor = context.actor;
    const target = context.target;
    const action = context.action;
  }
);
```

主なイベント名：

- `beforeAttack`
- `afterAttack`
- `afterNormalAttack`
- `afterNpAttack`
- `beforeNp`
- `afterNp`
- `turnStart`
- `turnEnd`
- `afterDamageTaken`
- `enemyDefeated`

## 現在の再分類

| サーヴァント | Common | Trigger | Unique |
|---|---|---|---|
| 光のコヤンスカヤ | NP増加、CT短縮、各種強化など | Buster通常攻撃時NP増加 | なし |
| フェンリル | 特攻、NP増加、OCアップ状態など | 宝具使用時OCアップ消費 | なし |
| アルトリア・キャスター | 攻撃力、NP、Arts、無敵など | 宝具使用時の宝具後付与 | なし |
| スカサハ＝スカディ〔ルーラー〕 | Quick/Buster強化など | 宝具使用時チャージ減少 | なし |
| スカサハ＝スカディ〔キャスター〕 | Quick強化、防御力ダウンなど | 宝具使用時の宝具後付与 | なし |
| フアナ狂女王 | NP、攻撃力、毒など | 宝具使用時毒付与 | なし |
| アリス・リデル | カード強化、特性付与、特攻など | 攻撃時〔虚構概念〕付与 | なし |

現時点では、共通処理へ乗らないUnique Mechanicsを持つ登録済みサーヴァントはいません。
