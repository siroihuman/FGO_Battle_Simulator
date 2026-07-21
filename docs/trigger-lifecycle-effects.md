# ターン開始・ターン終了・遅延トリガー

`js/trigger-lifecycle-effects.js`は、`js/trait-trigger-aura-effects.js`の汎用トリガーへターンライフサイクルを追加します。

## ターン開始時トリガー

```js
{
  type: 'triggerEffect',
  target: 'self',
  event: 'turnStart',
  uses: 2,
  duration: 3,
  effect: {
    type: 'temporaryTrait',
    target: 'allEnemies',
    trait: 'チェック',
    duration: 1,
    debuff: true
  }
}
```

`turnStart`は、前ターンの状態残りターンを減らし、新しいターンへ更新した後に発火します。`uses`を指定した場合、発動ごとに1回消費し、0回になると即座に解除します。

## ターン終了時トリガー

```js
{
  type: 'triggerEffect',
  target: 'self',
  event: 'turnEnd',
  uses: 1,
  duration: 1,
  effect: {
    type: 'npCharge',
    target: 'self',
    value: 10
  }
}
```

`turnEnd`は状態の残りターンを減らす前に発火します。ターン終了時点のスタック数や状態を参照する処理に使用します。

## 遅延トリガー

### ターン開始時に発動

```js
{
  type: 'delayedEffect',
  target: 'self',
  delayTurns: 3,
  triggerEvent: 'turnStart',
  resolver: 'registeredResolverKey'
}
```

付与から3ターン経過し、次のターンが開始した時点で1回発動します。`triggerEvent`を省略した場合も`turnStart`です。

### ターン終了時に発動

```js
{
  type: 'delayedEffect',
  target: 'self',
  delayTurns: 3,
  triggerEvent: 'turnEnd',
  resolver: 'registeredResolverKey'
}
```

付与ターンを起点として、3ターン目の終了時に1回発動します。状態の残りターン減少前にresolverを実行するため、その時点のスタック数を参照できます。

遅延トリガーは発動後に自身を削除します。

## 対象依存条件

`targetHasTrait`と`targetHasStatus`を含む条件は、効果対象が確定する前には失敗扱いにしません。候補対象を取得した後、対象ごとに最終判定します。

```js
condition: {
  kind: 'not',
  condition: {
    kind: 'targetHasTrait',
    key: '不思議の国の住人'
  }
}
```

この形式でも、各対象が特性を持つかどうかを個別に判定できます。

## provider型トリガー

```js
{
  type: 'triggerEffect',
  target: 'self',
  event: 'afterAttack',
  provider: true,
  duration: 3,
  effect: {
    type: 'npCharge',
    target: 'self',
    value: 10
  }
}
```

`provider: true`は、状態所有者以外の味方が攻撃した場合にも評価します。既定では提供者が前衛・生存中の間だけ有効です。

控えからも提供する必要がある場合だけ、次を指定します。

```js
providerFrontlineOnly: false
```
