# 共通状態・トリガー効果

このファイルに記載した効果は`js/common-effects.js`および`js/common-effects-extra-attack.js`で共通処理されます。サーヴァント名や内部IDによる分岐は不要です。

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

複数の回避・無敵がある場合の消費優先順位は次のとおりです。

1. 残りターンが短い状態
2. 同じ残りターンなら回数無制限状態
3. 残り回数が少ない状態
4. 先に付与された状態

必中は回避だけを無視します。無敵貫通は回避と無敵の両方を無視します。無視された防御状態は消費されません。

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

弱体成功判定は`_debuffSuccessChance`と`_tryApplyDebuff`、防御状態の消費は`_consumeDefenseStatus`で共通化されています。
