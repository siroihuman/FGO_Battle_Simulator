# 新規サーヴァントの追加手順

## 1. 編集するファイル

編集するのは原則として `js/data.js` です。
戦闘計算そのものを変更しない限り、`js/engine.js` と `js/app.js` は触りません。

## 2. テンプレートをコピーする

`templates/SERVANT_TEMPLATE.js` を開き、`yourServant: {` から最後の `},` までをコピーします。

## 3. 貼り付ける場所

`js/data.js` 内で、次の部分を探します。

```js
servants: {
  koyanskayaLight: {
```

新しいデータは `servants: {` と、その閉じ括弧の間へ貼り付けます。
最も分かりやすい場所は、既存の最後のサーヴァントである `fenrir` の閉じ括弧の後です。

変更前：

```js
      fenrir: {
        // フェンリルのデータ
      }
    }
  };
```

変更後：

```js
      fenrir: {
        // フェンリルのデータ
      },

      yourServant: {
        // 新しいサーヴァントのデータ
      }
    }
  };
```

重要なのは、前のサーヴァントの閉じ括弧を `},` にすることです。カンマがないと起動時に構文エラーになります。

## 4. 必ず変更するID

以下は他のサーヴァントと重複しない半角英数字にします。

- オブジェクト名：`yourServant:`
- `id: 'yourServant'`
- 各スキルの `id`
- 宝具の `id`

オブジェクト名とサーヴァントの `id` は同じ文字列にしてください。

## 5. 保有スキル数

`skills` と `skillIcons` は、クラススキルを除く掲載順の上位3つまで登録します。
両方の個数と並び順を必ず一致させてください。

## 6. 新しい特性を追加する場合

`js/data.js` 冒頭の `traitNames` に表示名を追加します。

```js
traitNames: {
  servant: 'サーヴァント',
  humanoid: '人型',
  dragon: '竜'
},
```

その後、サーヴァント側で次のように指定できます。

```js
traits: ['servant', 'humanoid', 'dragon'],
```

## 7. アイコン

- 保有スキル：`assets/skill-icons/`
- 状態変化：`assets/status-icons/`

保有スキルのアイコンは、画像ファイルを所定フォルダーへ入れ、`skillIcons` にファイル名を記述します。

## 8. 現在使用できる主な効果type

- `attackUp`：攻撃力アップ
- `defenseUp`：防御力アップ。負数を指定すれば防御力ダウン
- `cardUp`：カード性能アップ
- `critUp`：クリティカル威力アップ
- `cardCritUp`：特定カードのクリティカル威力アップ
- `starRateUp`：スター発生率アップ
- `cardStarWeightUp`：特定カードのスター集中度アップ
- `traitPowerUp`：特性特攻状態
- `attributePowerUp`：属性特攻状態
- `npPowerUp`：宝具威力アップ
- `npGainUp`：NP獲得量アップ
- `npCharge`：NP増加
- `stars`：スター獲得
- `cooldownReduce`：スキルチャージ短縮
- `hpLoss`：HP減少
- `guts`：ガッツ
- `evade`：回避
- `invincible`：無敵
- `invinciblePierce`：無敵貫通
- `ocUp`：OC段階アップ
- `damagePlus`：与ダメージプラス
- `debuffResist`：弱体耐性アップ
- `deathResist`：即死耐性アップ
- `enemyChargeDown`：敵チャージ減少

未対応の効果を `type` に書いても、期待どおりの計算にならない場合があります。その場合は `js/engine.js` 側への機能追加が必要です。

## 9. 動作確認

保存後、`index.html` を開き直します。
編成欄に新しいサーヴァント名が表示されれば、データ登録自体は成功しています。

Node.jsが使える場合は、フォルダー内で次も実行します。

```text
node tests/engine-tests.js
```
