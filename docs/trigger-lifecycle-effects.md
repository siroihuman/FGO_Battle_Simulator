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

`targetHasTrait`と`targetHasStatus`を含む通常効果の条件は、効果対象が確定する前には失敗扱いにしません。候補対象を取得した後、対象ごとに最終判定します。

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

## 遅延評価型状態のcondition

次の状態では、`condition`を状態付与時ではなく発動時・能力値参照時に評価します。

```text
triggerEffect
beforeAttackApplyTemporaryTrait
delayedEffect
aura
```

例えば次の`triggerEffect`は、付与対象である使用者自身が〔チェック〕を持っていなくても正常に付与されます。`targetHasTrait`は`afterAttack`発火時の攻撃対象へ評価されます。

```js
{
  type: 'triggerEffect',
  target: 'self',
  event: 'afterAttack',
  duration: 3,
  condition: {
    kind: 'targetHasTrait',
    key: 'チェック'
  },
  effect: {
    type: 'temporaryTrait',
    target: 'self',
    trait: 'チェックメイト',
    duration: 3
  }
}
```

`sourceHasTrait`と`sourceHasStatus`も同様に、状態を付与する時点ではなくイベント発火時の状態所有者へ評価します。

### 状態の初期付与対象を絞る場合

遅延評価型状態を付与する対象自体を条件で絞る場合は、`condition`ではなく`targetCondition`を使用します。

```js
{
  type: 'triggerEffect',
  target: 'allAlliesIncludingReserve',
  targetCondition: {
    kind: 'targetHasTrait',
    key: '不思議の国の住人'
  },
  event: 'turnStart',
  duration: 3,
  condition: {
    kind: 'sourceHasTrait',
    key: '起動'
  },
  effect: {
    type: 'npCharge',
    target: 'self',
    value: 5
  }
}
```

この例では、`targetCondition`が状態の初期付与対象を絞り、`condition`は付与後の各ターン開始時に評価されます。

通常の`npCharge`、`attackUp`、`temporaryTrait`などでは、従来どおり`condition`を対象ごとの効果適用条件として使用します。

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
