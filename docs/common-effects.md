# 共通状態・トリガー効果

このファイルに記載した効果は`js/common-effects.js`、`js/common-effects-extra-attack.js`、`js/card-buff-effects.js`、`js/defense-resistance-effects.js`、`js/combat-defense-effects.js`および`js/turn-field-effects.js`で共通処理されます。サーヴァント名や内部IDによる分岐は不要です。

ダメージ計算上の効果配置は、FGO @wiki「サーヴァント/隠しステータス」のダメージ計算式を基準とします。

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

- 発動する攻撃：選択したQuick／Arts／Buster通常カード、Extra Attack
- 発動しない攻撃：宝具
- Extra AttackはHit数にかかわらず、攻撃全体の終了後に1回だけ判定されます。
- 通常カード3枚＋Extra AttackのBrave Chainでは、通常カード3回とExtra Attack1回の合計4回判定されます。
- 同じ状態を複数付与した場合、各状態が攻撃1回につき1回ずつ判定されます。

旧記述にある`normalCardsOnly`は互換性のため状態データへ保持されますが、「通常攻撃時」の判定からExtra Attackを除外する指定には使用しません。Quick／Arts／BusterとExtra Attackを含み、宝具だけを除外するのが共通仕様です。

## 弱体付与成功率

```js
{ type: 'debuffSuccess', value: 20, duration: 3 }
{ type: 'charmSuccessUp', value: 30, duration: 3 }
```

成功率は次の式で計算します。

```text
基礎成功率
+ 弱体付与成功率アップ
+ 弱体種別専用成功率アップ
- 弱体耐性
- 種別専用耐性
```

魅了には`mentalResist`も適用されます。最終成功率は0～100%に制限されます。

確率付きの弱体は、スキル・宝具効果にも使用できます。

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

対象となった敵は、通常攻撃・宝具のどちらも行えません。行動不能中はチャージを増減しません。

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

ターン終了時にダメージを与えます。複数のやけどは個別に保持され、基礎ダメージを合算します。やけどダメージで戦闘不能になります。

`ocValues`を使用する場合の例です。

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

計算式は次のとおりです。

```text
合計やけどダメージ × (1 + 合計延焼量 / 100)
```

延焼100%なら2倍、延焼100%を2つ付与した場合は3倍です。`dotType`を`poison`または`curse`にすれば、毒・呪いにも同じ基盤を利用できます。

## 回数制回避

```js
{ type: 'evade', target: 'self', uses: 1, duration: 3 }
```

回避が発動した時点で`uses`を1消費します。0回になると即座に解除されます。

回数無制限の1ターン回避は`uses`を記述しません。

```js
{ type: 'evade', target: 'self', duration: 1 }
```

同一ターン中の複数攻撃をすべて回避し、ターン終了時に解除されます。

同種の回避・無敵が複数ある場合の消費優先順位は次のとおりです。

1. 残りターンが短い状態
2. 同じ残りターンなら回数無制限状態
3. 残り回数が少ない状態
4. 先に付与された状態

必中は回避だけを無視します。無敵貫通は回避と無敵の両方を無視します。無視された防御状態は消費されません。

## 対粛正防御

```js
{
  type: 'antiEnforcementDefense',
  target: 'allAllies',
  ocUses: [1, 2, 3, 4, 5],
  duration: 3
}
```

- `ocUses`はOC1～5に対応する残り回数です。効果量の`value`ではなく、状態の`uses`へ保存されます。
- `ocUses`の解決処理は汎用処理です。対粛正防御以外の回数制状態でも同じ記述を使用できます。
- 攻撃によるダメージを0にし、必中と無敵貫通の両方を無視します。
- 防御状態の種類ごとの優先順位は`対粛正防御 > 無敵 > 回避`です。
- 対粛正防御で防いだ場合、同時に付与されている無敵・回避は消費しません。
- 1回の攻撃アクションにつき1回だけ消費します。多段HitでもHit数分は消費しません。
- 全体攻撃では、攻撃対象となった各味方が自身の対粛正防御を1回ずつ消費します。
- 同じ対象に有効な対粛正防御が残っている場合、再付与による上書き・回数加算・ターン延長は行いません。
- `uses`が0になった時点で即座に解除します。残り回数があっても`duration`が0になった場合はターン終了時に解除します。

宝具の効果配列は記述順に処理されます。次の例では、攻撃力アップ、弱体解除、対粛正防御の順序を維持します。

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

敵の通常攻撃における最終クリティカル発生率は次の順序で計算します。

```text
敵の基礎クリティカル発生率
- 敵に付与されたcritRateDown
- 攻撃対象に付与されたcritRateResist
```

- 最終確率は0～100%に制限します。
- 同じ対象に複数の`critRateResist`がある場合は加算します。
- `critRateDown`は敵側へ付与する弱体、`critRateResist`は攻撃を受ける対象側が持つ耐性として別々に管理します。
- 宝具にはクリティカル判定を行わないため、`critRateResist`も宝具ダメージには影響しません。

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

`defenseDown`は被攻撃側に付与する正式な弱体状態です。通常攻撃・宝具・敵攻撃の攻撃力／防御力枠へ、次の形で統合します。

```text
1 + attackUp - defenseUp + defenseDown
```

- 複数の`defenseDown`は加算します。
- `debuff: true`および`chance`を指定した場合、弱体付与成功率と弱体耐性の共通判定を使用します。
- `defenseUp`とは別状態・別表示です。
- 旧データの`defenseUp`負数も従来どおり計算されます。`defenseUp: -30`と`defenseDown: 30`は同じ増加方向になります。

## 回数制クリティカル威力アップ

既存の`critUp`へ`uses`を記述すると、回数制クリティカル威力アップとして扱います。

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
- 効果量は消費前のクリティカル攻撃へ適用し、カード全Hitの解決後に消費します。
- 多段Hitでもカード1枚につき1回だけ消費します。
- 非クリティカル、Extra Attack、宝具では消費しません。
- 同時に複数の回数制`critUp`が適用されている場合、各状態をそれぞれ1回消費します。
- `uses`を省略した回数無制限の`critUp`は消費しません。
- 残り回数が0になった時点で即座に解除します。

## 即死無効

```js
{
  type: 'instantDeathImmune',
  target: 'allAllies',
  uses: 1,
  duration: 3
}
```

- 即死成功率の計算より前に判定し、有効な状態があれば即死効果を必ず無効化します。
- 即死効果1回につき1回だけ消費します。攻撃Hit数では重複消費しません。
- 即死効果を持たない攻撃では消費しません。
- `uses`を省略した場合は回数無制限です。
- 残り回数0で即時解除し、残りターン0でも解除します。
- 無効化時は残り回数を戦闘ログへ記録します。
- `deathResist`は成功率を減少させる状態、`instantDeathImmune`は成功率計算そのものを行わず無効化する状態です。

## ダメージカット

```js
{
  type: 'damageCut',
  target: 'allAllies',
  ocValues: [500, 750, 1000, 1250, 1500],
  duration: 3
}
```

ダメージカットは、FGOの固定ダメージ枠に合わせて敵から味方への最終ダメージから減算します。

```text
max(0, 最終ダメージ - damageCutの合計)
```

- 通常攻撃、クリティカル攻撃、宝具へ適用します。
- 現在の敵攻撃処理では、攻撃アクション1回につき対象ごとに1回減算します。
- 複数の`damageCut`は加算します。
- 最終ダメージは0未満になりません。
- 回避、無敵、対粛正防御で攻撃を防いだ場合はダメージ計算へ進まないため、軽減ログも回数消費も発生しません。
- `uses`を省略した状態はターン制として扱い、攻撃では消費しません。
- `uses`を指定した場合は、実際にダメージを軽減した攻撃アクションで各状態を1回消費します。
- `ocValues`を使用するとOC1～5に応じた固定値を設定できます。

## 毎ターンスター獲得

```js
{
  type: 'starsPerTurn',
  target: 'self',
  values: [5, 6, 7, 8, 9, 10, 11, 12, 13, 15],
  duration: 3
}
```

- 前衛かつ生存中の付与対象が持つ`starsPerTurn`を、ターン終了時に合算します。
- 獲得分は`nextStars`へ入り、次ターン開始時のスターとして使用されます。
- 複数状態および複数の前衛からの獲得量は加算します。
- 次ターンのスターは最大50個です。
- 控え、戦闘不能、退場状態の対象からは獲得しません。
- 状態を付与したターンの終了時を1回目として数えます。`duration: 3`なら、付与ターンを含む3回のターン終了時に発動し、4回目は発動しません。

## フィールド特性

戦闘全体のフィールド特性は、戦闘設定の`fieldTraits`へ配列で記述します。

```js
{
  fieldTraits: ['水辺', '炎上']
}
```

Waveごとに変更する場合は、各Wave設定へ`fieldTraits`を記述します。Wave側に配列がある場合は、戦闘全体の設定より優先されます。

```js
{
  waves: [
    {
      fieldTraits: ['水辺'],
      enemies: [/* ... */]
    },
    {
      fieldTraits: ['森'],
      enemies: [/* ... */]
    }
  ]
}
```

現在のフィールド特性は戦闘状態の`state.fieldTraits`に保持されます。共通APIとして次を使用できます。

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

- `condition.kind`が`fieldTrait`の場合、現在の`fieldTraits`に`condition.key`が存在するときだけ効果を適用します。
- 条件不成立時は状態を付与せず、「付与成功」のログも出しません。条件不成立ログだけを記録します。
- 宝具の`before`へ置いた場合は、条件判定と状態付与を宝具ダメージ計算前に行うため、その宝具自身へ反映されます。
- `水辺`以外にも`森`、`炎上`、`都市`など任意のフィールド特性を同じ形式で使用できます。
- `_conditionMet`を共通判定関数として使用するため、スキル、宝具、クエスト効果から再利用できます。

複数条件を組み合わせる場合は、`all`、`any`、`not`も使用できます。

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

`BattleEngine`で次のフックを利用できます。

```text
afterNormalAttack
beforeEnemyAction
turnEnd
```

`afterNormalAttack`は次のタイミングで1回ずつ呼び出されます。

```text
Quick通常カード解決後
Arts通常カード解決後
Buster通常カード解決後
Extra Attack全Hit解決後
```

宝具解決後には呼び出されません。Extra AttackではHitごとではなく、Extra Attack全体につき1回だけ呼び出されます。

`starsPerTurn`は`turnEnd`で状態の残りターンを減らす前に処理されます。

弱体成功判定は`_debuffSuccessChance`と`_tryApplyDebuff`、防御状態の選択・消費は`_selectDefenseStatus`と`_consumeDefenseStatus`、フィールド条件は`_conditionMet`、敵クリティカル率は`_enemyCriticalChance`、防御力ダウン・回数制クリティカル威力・即死無効・ダメージカットは`js/combat-defense-effects.js`で共通化されています。
