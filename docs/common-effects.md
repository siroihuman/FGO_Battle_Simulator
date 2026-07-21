# 共通状態・トリガー効果

このファイルに記載した効果は、次の共通ランタイムで処理されます。

```text
js/common-effects.js
js/common-effects-extra-attack.js
js/card-buff-effects.js
js/defense-resistance-effects.js
js/combat-defense-effects.js
js/hp-loss-effects.js
js/turn-field-effects.js
```

サーヴァント名・内部IDによる分岐は不要です。ダメージ計算上の効果配置は、FGO @wiki「サーヴァント/隠しステータス」のダメージ計算式を基準とします。

## 通常攻撃時に確率で弱体付与

```js
{
  type: 'onNormalAttackApplyDebuff',
  target: 'self',
  debuffType: 'charm',
  chance: 50,
  debuffDuration: 1,
  duration: 3
}
```

- 発動する攻撃：Quick／Arts／Buster通常カード、Extra Attack
- 発動しない攻撃：宝具
- Extra AttackはHit数にかかわらず攻撃全体の終了後に1回だけ判定します。
- 通常カード3枚＋Extra AttackのBrave Chainでは合計4回判定します。
- 同じ状態を複数付与した場合、各状態が攻撃1回につき1回ずつ判定されます。
- 旧記述の`normalCardsOnly`は互換性のため保持しますが、Extra Attack除外には使用しません。

## 弱体付与成功率

```js
{ type: 'debuffSuccess', value: 20, duration: 3 }
{ type: 'charmSuccessUp', value: 30, duration: 3 }
```

```text
基礎成功率
+ 弱体付与成功率アップ
+ 弱体種別専用成功率アップ
- 弱体耐性
- 種別専用耐性
```

魅了には`mentalResist`も適用します。最終成功率は0～100%に制限します。

```js
{
  type: 'charm',
  target: 'allEnemies',
  chance: 60,
  duration: 1,
  debuff: true
}
```

## 魅了・スタン

```js
{ type: 'charm', target: 'selectedEnemy', duration: 1, debuff: true }
{ type: 'stun', target: 'selectedEnemy', duration: 1, debuff: true }
```

対象となった敵は通常攻撃・宝具のどちらも行えません。行動不能中はチャージを増減しません。

## やけど

```js
{
  type: 'burn',
  target: 'allEnemies',
  value: 1000,
  duration: 5,
  debuff: true
}
```

ターン終了時にダメージを与えます。複数のやけどは個別に保持し、基礎ダメージを合算します。やけどダメージで戦闘不能になります。

```js
{
  type: 'burn',
  target: 'allEnemies',
  ocValues: [1000, 1250, 1500, 1750, 2000],
  duration: 5,
  debuff: true
}
```

## 延焼などの継続ダメージ増幅

```js
{
  type: 'dotAmplify',
  target: 'allEnemies',
  dotType: 'burn',
  value: 100,
  duration: 5,
  debuff: true
}
```

```text
合計やけどダメージ × (1 + 合計延焼量 / 100)
```

延焼100%なら2倍、延焼100%を2つ付与した場合は3倍です。`dotType`を`poison`または`curse`にすれば毒・呪いにも利用できます。

## 回数制回避

```js
{ type: 'evade', target: 'self', uses: 1, duration: 3 }
```

回避が発動した時点で`uses`を1消費し、0回になると即座に解除します。

```js
{ type: 'evade', target: 'self', duration: 1 }
```

`uses`を省略した場合、同一ターン中の複数攻撃をすべて回避し、ターン終了時に解除します。

同種の回避・無敵が複数ある場合の消費優先順位は次のとおりです。

1. 残りターンが短い状態
2. 同じ残りターンなら回数無制限状態
3. 残り回数が少ない状態
4. 先に付与された状態

必中は回避だけを無視します。無敵貫通は回避と無敵の両方を無視します。無視された防御状態は消費しません。

## 対粛正防御

```js
{
  type: 'antiEnforcementDefense',
  target: 'allAllies',
  ocUses: [1, 2, 3, 4, 5],
  duration: 3
}
```

- `ocUses`はOC1～5に対応する残り回数で、状態の`uses`へ保存します。
- `ocUses`は他の回数制状態でも利用できる汎用記法です。
- 必中と無敵貫通の両方を無視して攻撃ダメージを0にします。
- 防御状態の優先順位は`対粛正防御 > 無敵 > 回避`です。
- 対粛正防御で防いだ場合、無敵・回避は消費しません。
- 多段Hitでも攻撃アクション1回につき1回だけ消費します。
- 全体攻撃では各味方が自身の状態を1回ずつ消費します。
- 有効な対粛正防御が残っている場合、再付与による上書き・加算・延長は行いません。
- `uses`が0になった時点、または`duration`が0になったターン終了時に解除します。

宝具の効果配列は記述順に処理されます。

```js
before: [
  { type: 'attackUp', target: 'allAllies', npLevelValues: [30, 40, 45, 47.5, 50], duration: 3 },
  { type: 'debuffClear', target: 'allAllies' },
  { type: 'antiEnforcementDefense', target: 'allAllies', ocUses: [1, 2, 3, 4, 5], duration: 3 }
]
```

## 被クリティカル発生耐性

```js
{
  type: 'critRateResist',
  target: 'self',
  value: 20
}
```

```text
敵の基礎クリティカル発生率
- 敵に付与されたcritRateDown
- 攻撃対象に付与されたcritRateResist
```

- 最終確率は0～100%に制限します。
- 複数の`critRateResist`は加算します。
- `critRateDown`は敵側の弱体、`critRateResist`は攻撃対象側の耐性として別管理します。
- 宝具にはクリティカル判定を行わないため影響しません。

## 防御力ダウン

```js
{
  type: 'defenseDown',
  target: 'allEnemies',
  values: [20, 21, 22, 23, 24, 25, 26, 27, 28, 30],
  duration: 3,
  debuff: true
}
```

`defenseDown`は被攻撃側に付与する正式な弱体状態です。通常攻撃・宝具・敵攻撃の攻撃力／防御力枠へ統合します。

```text
1 + attackUp - defenseUp + defenseDown
```

- 複数の`defenseDown`は加算します。
- `debuff: true`と`chance`を指定した場合、共通の弱体成功判定を使用します。
- `defenseUp`とは別状態・別表示です。
- 旧データの`defenseUp`負数も従来どおり計算します。

## 回数制クリティカル威力アップ

```js
{
  type: 'critUp',
  target: 'allAllies',
  npLevelValues: [50, 75, 87.5, 93.8, 100],
  uses: 3,
  duration: 5
}
```

- 実際にクリティカルになったQuick／Arts／Buster通常カード1枚につき1回消費します。
- 効果量は消費前の攻撃へ適用し、カード全Hit解決後に消費します。
- 多段Hitでもカード1枚につき1回だけ消費します。
- 非クリティカル、Extra Attack、宝具では消費しません。
- 複数の回数制`critUp`が適用されている場合は各状態を1回ずつ消費します。
- `uses`を省略した回数無制限状態は消費しません。
- 残り回数0で即座に解除します。

## 即死無効

```js
{
  type: 'instantDeathImmune',
  target: 'allAllies',
  uses: 1,
  duration: 3
}
```

- 即死成功率の計算より前に判定し、有効な状態があれば必ず無効化します。
- 即死効果1回につき1回だけ消費し、Hit数では重複消費しません。
- 即死効果を持たない攻撃では消費しません。
- `uses`を省略した場合は回数無制限です。
- 残り回数0で即時解除し、残りターン0でも解除します。
- 無効化時は残り回数を戦闘ログへ記録します。
- `deathResist`は成功率を下げ、`instantDeathImmune`は成功率計算前に効果を無効化します。

## ダメージカット

```js
{
  type: 'damageCut',
  target: 'allAllies',
  ocValues: [500, 750, 1000, 1250, 1500],
  duration: 3
}
```

ダメージカットは敵から味方への最終ダメージから減算します。

```text
max(0, 最終ダメージ - damageCutの合計)
```

- 通常攻撃、クリティカル攻撃、宝具へ適用します。
- 攻撃アクション1回につき対象ごとに1回減算します。
- 複数の`damageCut`は加算します。
- 最終ダメージは0未満になりません。
- 回避、無敵、対粛正防御で防いだ場合は軽減ログも回数消費も発生しません。
- `uses`を省略した状態は攻撃では消費しません。
- `uses`を指定した場合、実際に軽減した攻撃で1回消費します。
- `ocValues`でOC1～5に応じた固定値を設定できます。

## HP減少

HP減少は攻撃ダメージではありません。防御力アップ、ダメージカット、回避、無敵、対粛正防御では軽減・無効化しません。

### 非致死性HP減少

```js
{
  type: 'hpLoss',
  target: 'self',
  value: 1000,
  nonLethal: true
}
```

- HPは最低1で停止します。
- ガッツ判定と戦闘不能処理を行いません。
- ガッツの残り回数を消費しません。
- スキル由来HP減少の標準記法として使用します。
- 既存の`nonLethal: true`データと互換性があります。

### 致死性HP減少

```js
{
  type: 'hpLoss',
  target: 'self',
  value: 1000
}
```

- `nonLethal`を省略するとHP0まで減少できます。
- HP0到達時は既存のガッツ・戦闘不能処理へ接続します。
- 有効なガッツがある場合は回数を1消費し、指定HPで復活します。
- ガッツがない場合は`alive=false`となり、戦闘不能ログを記録します。
- 生存中の味方がいない場合は敗北状態へ移行します。
- 戦闘不能者のカードは手札・デッキ・選択中カードから除外します。
- 控えがいる場合は既存の前衛補充処理を実行します。
- HP減少量、減少前HP、減少後HPを戦闘ログへ記録します。
- ガッツ発動時はHP減少ログの後に既存ガッツログを1回だけ出します。

宝具の`before`と`after`はそれぞれ配列順に処理します。HP減少を`after`の末尾へ置いた場合、宝具攻撃・特攻・それ以前の宝具後効果が完了してからHP減少を適用します。

```js
after: [
  { type: 'hpLoss', target: 'self', value: 1000 }
]
```

## 毎ターンスター獲得

```js
{
  type: 'starsPerTurn',
  target: 'self',
  values: [5, 6, 7, 8, 9, 10, 11, 12, 13, 15],
  duration: 3
}
```

- 前衛かつ生存中の付与対象が持つ`starsPerTurn`をターン終了時に合算します。
- 獲得分は`nextStars`へ入り、次ターン開始時のスターになります。
- 複数状態・複数前衛の獲得量は加算します。
- 次ターンのスターは最大50個です。
- 控え、戦闘不能、退場状態の対象からは獲得しません。
- 付与ターンの終了時を1回目とし、`duration: 3`なら3回発動して4回目は発動しません。

## フィールド特性

戦闘全体のフィールド特性は`fieldTraits`へ配列で記述します。

```js
{
  fieldTraits: ['水辺', '炎上']
}
```

Waveごとに変更する場合は各Wave設定へ記述します。Wave側の配列を戦闘全体設定より優先します。

```js
{
  waves: [
    { fieldTraits: ['水辺'], enemies: [/* ... */] },
    { fieldTraits: ['森'], enemies: [/* ... */] }
  ]
}
```

現在のフィールド特性は`state.fieldTraits`へ保持します。

```text
getFieldTraits()
hasFieldTrait(key)
setFieldTraits(traits)
```

## フィールド条件付き効果

```js
{
  type: 'npPowerUp',
  target: 'self',
  ocValues: [10, 15, 20, 25, 30],
  duration: 1,
  condition: {
    kind: 'fieldTrait',
    key: '水辺'
  }
}
```

- 現在の`fieldTraits`に`condition.key`が存在するときだけ適用します。
- 条件不成立時は状態を付与せず、条件不成立ログだけを記録します。
- 宝具`before`へ置いた場合は、その宝具自身のダメージへ反映します。
- 水辺以外の任意特性にも同じ形式を使用できます。
- スキル、宝具、クエスト効果から共通利用できます。

複数条件には`all`、`any`、`not`を使用できます。

```js
condition: {
  kind: 'all',
  conditions: [
    { kind: 'fieldTrait', key: '水辺' },
    { kind: 'not', condition: { kind: 'fieldTrait', key: '炎上' } }
  ]
}
```

## 共通イベントフック

```text
afterNormalAttack
beforeEnemyAction
turnEnd
```

`afterNormalAttack`はQuick／Arts／Buster通常カード解決後とExtra Attack全Hit解決後に1回ずつ呼び出します。宝具解決後には呼び出しません。

`starsPerTurn`は`turnEnd`で状態の残りターンを減らす前に処理します。

主な共通処理は次のとおりです。

```text
弱体成功判定：_debuffSuccessChance / _tryApplyDebuff
防御状態選択・消費：_selectDefenseStatus / _consumeDefenseStatus
フィールド条件：_conditionMet
敵クリティカル率：_enemyCriticalChance
防御力ダウン・回数制クリティカル威力・即死無効・ダメージカット：js/combat-defense-effects.js
致死性・非致死性HP減少：js/hp-loss-effects.js
```
