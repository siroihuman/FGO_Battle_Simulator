# サーヴァント別固有例外処理ガイド

## 基本方針

スキル・状態は次の3分類で管理します。

### 1. Common Effects

攻撃力アップ、カード性能アップ、NP増加、無敵、ガッツなど、付与対象と数値が分かれば共通処理できる効果です。

`js/engine.js`とサーヴァントデータの`effects`で管理します。サーヴァント別ファイルは作成しません。

### 2. Trigger Effects

攻撃時、通常攻撃時、Buster攻撃時、被ダメージ時、撃破時、ターン開始時など、発動条件だけが特殊な効果です。

効果本体はCommon Effectsと同じため、共通トリガー処理としてエンジン側で管理します。サーヴァント別ファイルは作成しません。

例：

- Buster通常攻撃時NP増加
- 攻撃時に特性付与
- 被ダメージ時NP増加
- 敵撃破時HP回復
- ターン終了時呪いダメージ

### 3. Unique Mechanics

共通処理や共通トリガーへ変換できない固有処理だけを、サーヴァント別ファイルで管理します。

例：

- 宝具換装
- スキル換装
- コマンドカード配分・属性変更
- クラス変更
- フィールドそのものの変更
- 独自ゲージ・独自カウンター
- 宝具チェインの書き換え
- 特殊勝利・敗北条件
- 特殊ターン進行
- 独自AI

## ディレクトリ構成

```text
js/unique-mechanics/
  registry.js
  runtime.js
  index.js
  <servantId>.js  # Unique Mechanicsがある場合だけ作成
```

現在は、共通処理だけでは再現できないアリス・リデルとバフォメットに個別ファイルがあります。

## 個別ファイルの作成

`templates/SERVANT_MECHANICS_TEMPLATE.js`をコピーして、次の場所へ保存します。

```text
js/unique-mechanics/<servantId>.js
```

`servantId`は`js/servants.js`のIDと一致させます。

```js
M.register('yourServantId', {
  name: 'サーヴァント名',
  description: '宝具換装などの固有処理',
  hooks: {
    beforeNp(engine, context) {},
    afterNp(engine, context) {}
  }
});
```

## 読み込み追加

ブラウザでは`registry.js`と、その固有処理が利用する共通ランタイムより後、`unique-mechanics/runtime.js`より前へ個別ファイルを追加します。

```html
<script src="js/unique-mechanics/yourServantId.js"></script>
```

Node.jsでは`js/unique-mechanics/index.js`へ追加します。

```js
require('./yourServantId.js');
```

## 現在の再分類

| サーヴァント | Common / Trigger | Unique |
|---|---|---|
| 光のコヤンスカヤ | 共通処理・Buster通常攻撃時NP増加 | なし |
| フェンリル | 共通処理・宝具使用時OC処理 | なし |
| アルトリア・キャスター | 共通処理・宝具前後処理 | なし |
| スカサハ＝スカディ〔ルーラー〕 | 共通処理・宝具時処理 | なし |
| スカサハ＝スカディ〔キャスター〕 | 共通処理・宝具前後処理 | なし |
| フアナ狂女王 | 共通処理・宝具時毒付与 | なし |
| アリス・リデル | 共通処理・攻撃時特性付与 | 赤のチェスピース遅延resolver |
| バフォメット | 共通処理・条件対象・ターン終了時NP増加 | 黒山羊の加護、強化ターン固定、強化献上、生贄、固有クラス相性 |

個別ファイルは共通処理へ変換できない処理を持つアリス・リデルとバフォメットだけに作成します。
バフォメット固有ファイルには、サーヴァントID分岐をエンジン本体へ追加せず、レジストリと既存フックを利用する処理だけを配置します。
