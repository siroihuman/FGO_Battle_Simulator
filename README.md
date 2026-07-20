# FGO バトルシミュレーター v1.3.0

ブラウザ上で動作するFGO形式のバトルシミュレーターです。

## 起動方法

GitHub Pagesの公開URLをEdge、Chrome、Safariなどで開いてください。

PC上で使用する場合は、リポジトリをZIPでダウンロードして展開し、`index.html`を開くこともできます。スマートフォンではローカルの`index.html`を直接開く方法が不安定なため、GitHub Pagesからの利用を推奨します。

---

## データファイルの構成

v1.3.0から、データを次の4ファイルへ分割しています。

| ファイル | 内容 |
|---|---|
| `js/data.js` | クラス名、属性名、特性名、バフアイコンなどの共通設定 |
| `js/servants.js` | 味方サーヴァントのデータ |
| `js/craft-essences.js` | 概念礼装のデータ |
| `js/mystic-codes.js` | 魔術礼装のデータ |

通常、新規サーヴァント・概念礼装・魔術礼装を追加するときは、`js/data.js`を編集する必要はありません。

`index.html`では必ず次の順番で読み込みます。

```html
<script src="js/data.js"></script>
<script src="js/servants.js"></script>
<script src="js/craft-essences.js"></script>
<script src="js/mystic-codes.js"></script>
<script src="js/engine.js"></script>
<script src="js/app.js"></script>
```

`engine.js`より後にデータファイルを置くと、選択欄へデータが表示されません。

---

# サーヴァントの追加方法

編集するファイルは`js/servants.js`です。

## 追加位置

```js
const SERVANTS = {
  koyanskayaLight: {
    // 既存データ
  },

  fenrir: {
    // 既存データ
  },

  newServant: {
    // 新規データ
  }
};
```

新しいサーヴァントは、最後のサーヴァントの後ろ、`};`より前へ追加します。

前のデータの閉じ括弧には区切りのカンマが必要です。

```js
  },
```

## 基本テンプレート

```js
newServant: {
  id: 'newServant',
  no: '001',
  name: '新規サーヴァント',
  classId: 'saber',
  rarity: 5,

  maxLevel: 90,
  maxHp: 14000,
  atk: 11000,
  levelStats: {
    max: { hp: 14000, atk: 11000 },
    100: { hp: 15300, atk: 12000 },
    120: { hp: 18000, atk: 14100 }
  },

  attribute: 'man',
  traits: ['サーヴァント', '人型', '人の力'],

  cards: ['quick', 'arts', 'arts', 'buster', 'buster'],
  hits: {
    quick: 4,
    arts: 3,
    buster: 2,
    extra: 5,
    np: 5
  },

  na: 0.70,
  nd: 3.00,
  starRate: 10.0,
  starWeight: 100,
  deathRate: 30.0,

  skillIcons: [
    'skill-attack-up.png',
    'skill-np-charge.png',
    'skill-buster-star-weight.png'
  ],

  skills: [],
  passives: [],

  np: {
    id: 'newNoblePhantasm',
    name: '新規宝具',
    reading: 'しんきほうぐ',
    card: 'buster',
    target: 'allEnemies',
    hits: 5,
    multipliers: [300, 400, 450, 475, 500],
    description: '敵全体に強力な攻撃。',
    before: [],
    after: []
  },

  source: '資料ページのURL'
},
```

## ID

オブジェクト名と`id`は同じ文字列にしてください。

```js
newServant: {
  id: 'newServant',
```

半角英数字とアンダースコアを推奨します。同じIDを複数登録すると、後から登録されたデータで上書きされます。

## クラス

`classId`には次のいずれかを指定します。

```text
saber / archer / lancer / rider / caster / assassin / berserker
shielder / ruler / avenger / moonCancer / alterEgo / foreigner
pretender / beast
```

## レベル別ステータス

```js
levelStats: {
  max: { hp: 14000, atk: 11000 },
  100: { hp: 15300, atk: 12000 },
  120: { hp: 18000, atk: 14100 }
},
```

- `max`：最終再臨時の通常最大レベル
- `100`：聖杯転臨1
- `120`：聖杯転臨2

ここにはフォウ強化、概念礼装、コマンドカード強化を含めません。

`maxHp`と`atk`には`levelStats.max`と同じ値を設定します。

## カードとHit数

```js
cards: ['quick', 'arts', 'arts', 'buster', 'buster'],
```

5枚すべてを記述します。

```js
hits: { quick: 4, arts: 3, buster: 2, extra: 5, np: 5 },
```

宝具のHit数は`hits.np`と`np.hits`を同じ値にしてください。

## 保有スキル

クラススキルを除き、資料の上から3つまでを`skills`へ登録します。

```js
skills: [
  {
    id: 'newSkill1',
    name: '新規スキル A',
    baseCt: 8,
    target: 'ally',
    description: `味方単体の攻撃力をアップ(3T)
＆NPを増やす`,
    effects: [
      {
        type: 'attackUp',
        target: 'selectedAlly',
        values: [10, 11, 12, 13, 14, 15, 16, 17, 18, 20],
        duration: 3
      },
      {
        type: 'npCharge',
        target: 'selectedAlly',
        values: [10, 11, 12, 13, 14, 15, 16, 17, 18, 20]
      }
    ]
  }
],
```

### スキル対象

| 値 | 対象 |
|---|---|
| `self` | 自身 |
| `ally` | 選択した味方単体 |
| `enemy` | 選択した敵単体 |

効果側では`self`、`selectedAlly`、`selectedEnemy`、`allAllies`、`allEnemies`、`party`などを使用します。

### レベル別数値

スキルLv.1～10の10個を順番に記述します。

```js
values: [10, 11, 12, 13, 14, 15, 16, 17, 18, 20],
```

固定値は`value`を使用します。

```js
value: 50,
```

### 説明文の改行

バッククォートで囲むと直接改行できます。

```js
description: `1行目
2行目
3行目`,
```

通常の引用符では`\n`を使用します。

```js
description: '1行目\n2行目\n3行目',
```

## クラススキル

クラススキルは`passives`へ登録します。

```js
passives: [
  {
    name: '対魔力 A',
    icon: 'class-magic-resistance.png',
    effects: [
      { type: 'debuffResist', value: 20 }
    ]
  },
  {
    name: '騎乗 B',
    icon: 'class-riding.png',
    effects: [
      { type: 'cardUp', card: 'quick', value: 8 }
    ]
  }
],
```

クラススキル由来のバフは通常バフと合算されず、個別表示されます。

## 宝具

```js
np: {
  id: 'newNoblePhantasm',
  name: '新規宝具',
  reading: 'しんきほうぐ',
  card: 'arts',
  target: 'allEnemies',
  hits: 5,
  multipliers: [450, 600, 675, 712.5, 750],
  description: '敵全体に強力な攻撃。',
  before: [],
  after: []
},
```

`multipliers`は宝具Lv.1～5の順です。

宝具前効果は`before`、攻撃後効果は`after`へ記述します。

宝具固有特攻の例です。

```js
special: {
  kind: 'trait',
  key: '神性',
  multiplier: 1.5
},
```

属性特攻の場合です。

```js
special: {
  kind: 'attribute',
  key: 'sky',
  multiplier: 1.5
},
```

## 追加後の確認

1. `js/servants.js`を保存します。
2. GitHub Pagesを再読み込みします。
3. 編成画面の選択欄に名前が表示されるか確認します。
4. 表示されない場合は、直前のデータ末尾のカンマ、括弧、ID重複を確認します。

---

# 概念礼装の追加方法

編集するファイルは`js/craft-essences.js`です。

## 追加位置

```js
const CRAFT_ESSENCES = {
  none: {
    // 装備なし
  },

  newCraftEssence: {
    // 新規概念礼装
  }
};
```

`none`は「装備なし」に使用するため、削除しないでください。

## 基本テンプレート

```js
newCraftEssence: {
  id: 'newCraftEssence',
  name: '新規概念礼装',
  atk: 500,
  hp: 0,
  description: `自身のBusterカード性能を10%アップ
＆NPを50%チャージした状態でバトルを開始する`,
  effects: [
    {
      type: 'cardUp',
      card: 'buster',
      value: 10
    },
    {
      type: 'npCharge',
      value: 50
    }
  ]
},
```

## ステータス補正

```js
atk: 500,
hp: 0,
```

- ATK型：`atk`のみ設定
- HP型：`hp`のみ設定
- バランス型：両方設定

## 主な効果

開始時NP：

```js
{ type: 'npCharge', value: 50 }
```

カード性能：

```js
{ type: 'cardUp', card: 'arts', value: 10 }
```

宝具威力：

```js
{ type: 'npPowerUp', value: 15 }
```

攻撃力：

```js
{ type: 'attackUp', value: 10 }
```

毎ターンNP：

```js
{ type: 'npPerTurn', value: 10 }
```

未対応の特殊効果は、データだけでは動作しません。その場合は`js/engine.js`への処理追加が必要です。

追加後は、編成画面の折りたたみ式概念礼装欄に表示されるか確認してください。

---

# 魔術礼装の追加方法

編集するファイルは`js/mystic-codes.js`です。

## 追加位置

```js
const MYSTIC_CODES = {
  chaldea: {
    // 既存魔術礼装
  },

  newMysticCode: {
    // 新規魔術礼装
  }
};
```

## 基本テンプレート

```js
newMysticCode: {
  id: 'newMysticCode',
  name: '新規魔術礼装',
  skills: [
    {
      id: 'newMysticCodeSkill1',
      name: 'スキル1',
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
    },
    {
      id: 'newMysticCodeSkill2',
      name: 'スキル2',
      baseCt: 12,
      target: 'enemy',
      description: '敵単体にスタン状態を付与(1T)。',
      effects: [
        {
          type: 'stun',
          target: 'selectedEnemy',
          value: 1,
          duration: 1,
          debuff: true
        }
      ]
    },
    {
      id: 'newMysticCodeSkill3',
      name: 'スキル3',
      baseCt: 15,
      target: 'orderChange',
      description: '前衛1騎と控え1騎を入れ替える。',
      effects: [
        { type: 'orderChange' }
      ]
    }
  ]
},
```

魔術礼装スキルは3つ登録します。

## 魔術礼装レベル

Lv.1～10で変化する数値は`values`へ10個記述します。

```js
values: [20, 21, 22, 23, 24, 25, 26, 27, 28, 30],
```

固定値は`value`を使用します。

## CT

```js
baseCt: 12,
```

`baseCt`にはスキルLv.1時のチャージタイムを設定します。

## 対象

| 値 | 挙動 |
|---|---|
| `self` | 対象選択なし |
| `ally` | 味方単体を選択 |
| `enemy` | 敵単体を選択 |
| `orderChange` | 前衛と控えを選択 |

## オーダーチェンジ

```js
{
  name: 'オーダーチェンジ',
  baseCt: 15,
  target: 'orderChange',
  description: '前衛1騎と控え1騎を入れ替える。',
  effects: [
    { type: 'orderChange' }
  ]
}
```

追加後は、編成画面上部の魔術礼装選択欄に表示されるか確認してください。

---

# バフアイコン

共通設定は`js/data.js`の`statusIcons`です。

```js
statusIcons: {
  attackUp: 'Attackup.webp',
  cardUp: 'Statusup.webp',
  traitPowerUp: 'Powerup.webp'
},
```

画像は`assets/status-icons`へ置きます。

特定の効果だけ別アイコンにする場合は、その効果へ`statusIcon`を追加します。

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

個別指定が共通設定より優先されます。

---

# 敵特性

敵設定の「特性（記述式）」へ次のように入力します。

```text
神性 / 王 / 人型
```

区切りには`/`、`／`、カンマ、改行を使用できます。

```js
{
  type: 'traitPowerUp',
  target: 'self',
  trait: '王',
  value: 50,
  duration: 3
}
```

敵属性を「人」に設定した場合は、自動的に〔人の力〕としても判定します。天・地・星・獣も同様です。

---

# テスト

Node.jsを使用できるPCでは次を実行します。

```text
node tests/engine-tests.js
node tests/damage-regression.js
```

Node.jsでは`js/data.js`を読み込むだけで、分割した3つのデータファイルも自動登録されます。既存テストの実行方法は変わりません。

---

# 主なファイル

| ファイル | 用途 |
|---|---|
| `index.html` | 起動ファイルとJavaScript読込順 |
| `js/data.js` | 共通設定 |
| `js/servants.js` | サーヴァントデータ |
| `js/craft-essences.js` | 概念礼装データ |
| `js/mystic-codes.js` | 魔術礼装データ |
| `js/engine.js` | 戦闘計算 |
| `js/app.js` | 画面表示と入力処理 |
| `assets/` | 画像素材 |
| `templates/` | 追加用テンプレートと補足資料 |
| `tests/` | 自動テスト |

---

# よくあるエラー

## 追加したデータが表示されない

- 追加先ファイルを間違えていないか確認します。
- 一つ前のデータ末尾にカンマがあるか確認します。
- `{`と`}`、`[`と`]`の数が合っているか確認します。
- `id`が重複していないか確認します。
- GitHub Pagesの反映前でないか確認します。
- ブラウザを強制再読み込みします。

## 画面全体が表示されない

`index.html`の読み込み順を確認してください。`data.js`と3種類のデータファイルは、必ず`engine.js`より前に読み込みます。

## 説明文で改行するとエラーになる

複数行の説明文はバッククォートで囲んでください。

```js
description: `1行目
2行目`,
```
