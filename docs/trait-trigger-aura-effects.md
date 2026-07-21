# 一時特性・条件対象・トリガー・常時オーラ

この共通基盤は`js/trait-trigger-aura-effects.js`と`js/unique-mechanics/runtime.js`で処理します。
サーヴァント名、内部ID、宝具名によるエンジン分岐は不要です。

## 期間付き特性

```js
{
  type: 'temporaryTrait',
  target: 'allEnemies',
  trait: 'チェック',
  duration: 1,
  debuff: true,
  chance: 100
}
```

- `hasTrait(unit, trait)`は固定`unit.traits`と有効な`temporaryTrait`の両方を参照します。
- 同じ特性を複数回付与した場合も、個別の状態として保持します。
- `debuff: true`と`chance`を指定した場合、弱体付与成功率と弱体耐性の共通判定を使用します。
- 弱体扱いの一時特性は`debuffClear`、強化扱いの一時特性は`buffClear`で解除されます。
- 残りターンが0になると固定`unit.traits`へ残さず解除します。
- 恒久特性を追加する既存の`addTrait`とは別の効果です。

共通APIは次のとおりです。

```js
engine.hasTrait(unit, '虚構概念');
engine.countStatusStacks(unit, {
  type: 'temporaryTrait',
  trait: 'チェックメイト'
});
```

## 対象選択

### 使用者以外の前衛

```js
{
  type: 'temporaryTrait',
  target: 'allOtherAllies',
  trait: '不思議の国の住人',
  duration: 1
}
```

### 控えを含む味方全体

```js
{ target: 'allAlliesIncludingReserve' }
```

### 使用者以外・控えを含む味方全体

```js
{ target: 'allOtherAlliesIncludingReserve' }
```

### 現在攻撃している敵

攻撃前後トリガー内では次を使用できます。

```js
{ target: 'attackedEnemy' }
```

## 状態・特性条件

```js
condition: {
  kind: 'targetHasTrait',
  key: '不思議の国の住人'
}
```

使用可能な条件です。

```text
targetHasTrait
targetHasStatus
sourceHasTrait
sourceHasStatus
fieldTrait
all
any
not
```

対象条件は候補ごとに判定します。例えば次の効果は、前衛・控えを含む味方のうち〔不思議の国の住人〕を持つ対象だけへNPを付与します。

```js
{
  type: 'npCharge',
  target: 'allAlliesIncludingReserve',
  values: [10, 12, 14, 16, 18, 20, 22, 24, 26, 30],
  condition: {
    kind: 'targetHasTrait',
    key: '不思議の国の住人'
  }
}
```

## 攻撃ダメージ前の一時特性付与

```js
{
  type: 'beforeAttackApplyTemporaryTrait',
  target: 'self',
  trait: '虚構概念',
  chance: 60,
  duration: 1,
  sourceDuration: 3
}
```

- `sourceDuration`は攻撃時効果自体の残りターンです。
- `duration`は攻撃対象へ付与する一時特性の残りターンです。
- Quick／Arts／Buster、宝具、Extra Attackのダメージ計算前に1回判定します。
- 付与に成功した一時特性は、その攻撃自身の特性特攻と宝具固有特攻へ反映されます。
- 全体攻撃では攻撃対象ごとに判定します。
- 弱体耐性を適用する場合は`temporaryTraitDebuff: true`を指定します。

## 汎用トリガー

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

使用可能なイベントです。

```text
afterSkillUse
beforeAttackDamage
afterAttack
turnStart
```

`afterAttack`では次の値を参照できます。

```text
actor
対象 target
攻撃 action
チェイン情報 chainContext
攻撃結果 result
```

`uses`を指定したトリガーは発動ごとに1回消費し、0回になると即座に解除します。
`removeAfterTrigger: true`を指定した場合は、発動後に残り回数にかかわらず自身を削除します。

### ターン開始時に2回発動

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

状態の残りターンを減らし、次のターンへ更新した後に`turnStart`を発火します。

## 遅延トリガー

```js
{
  type: 'delayedEffect',
  target: 'self',
  delayTurns: 3,
  resolver: 'aliceChessResolution'
}
```

`delayTurns: 3`は、付与したターンから3ターン後のターン開始時に1回発動します。発動後は自身を削除します。

固有ファイル側でresolverを登録できます。

```js
const COMMON = FGO_SIM_TRAIT_TRIGGER_AURA_EFFECTS;

COMMON.registerDelayedResolver('aliceChessResolution', (engine, context) => {
  const owner = context.owner;
  const stacks = engine.countStatusStacks(owner, {
    type: 'temporaryTrait',
    trait: 'チェックメイト'
  });

  return [
    {
      type: 'traitPowerUp',
      target: 'self',
      trait: '赤のチェスピース',
      value: stacks * 10,
      duration: 3
    },
    {
      type: 'temporaryTrait',
      target: 'allEnemies',
      trait: '赤のチェスピース',
      duration: 3,
      debuff: true
    }
  ];
});
```

スタック数から倍率を求める固有計算だけをresolverへ置き、ターン管理、対象選択、状態付与は共通処理を使用します。

## 条件付き常時オーラ

オーラは提供者から受領者へ状態を複製せず、能力値を参照する時点で動的に集計します。そのため、初期編成、オーダーチェンジ、控え補充のいずれでも同じ規則が適用されます。

### 特定特性への攻撃時NP獲得量アップ

```js
{
  type: 'aura',
  modifierType: 'npGainUp',
  target: 'allAllies',
  value: 15,
  condition: {
    kind: 'targetHasTrait',
    key: '虚構概念'
  },
  conditionTarget: 'attackTarget'
}
```

### 特定特性の敵の攻撃力ダウン

```js
{
  type: 'aura',
  modifierType: 'attackUp',
  target: 'allEnemies',
  value: -15,
  condition: {
    kind: 'targetHasTrait',
    key: '虚構概念'
  }
}
```

### 控えを含む他の味方の弱体耐性ダウン

```js
{
  type: 'aura',
  modifierType: 'debuffResist',
  target: 'allOtherAlliesIncludingReserve',
  value: -15
}
```

- オーラ提供者は原則として前衛・生存中である必要があります。
- `providerFrontlineOnly: false`を指定すると、控えからも提供できます。
- 提供者が戦闘不能・退場・控えへ移動した時点で、通常のオーラは停止します。
- 条件対象の一時特性が解除された時点で、条件付き補正も停止します。
- 同じ`modifierType`のオーラが複数ある場合は加算します。
- 受領者へ複製状態を作成しないため、交代時の再付与処理は不要です。

## 固有例外providerイベント

`js/unique-mechanics/runtime.js`は次のproviderイベントを全有効な登録サーヴァントへ配信します。

```text
afterSkillUse
beforeAttackDamage
afterAttack
turnStart
turnEnd
```

登録例です。

```js
FGO_UNIQUE_MECHANICS.register('aliceLiddell', {
  providerScope: 'frontline',
  hooks: {
    beforeAttackDamage(engine, context) {
      const provider = context.provider;
      const attacker = context.actor;
      const target = context.target;
    },
    afterAttack(engine, context) {
      const result = context.result;
    }
  }
});
```

`providerScope`は次を使用できます。

```text
frontline 既定。前衛・生存中だけ配信
allAlive 控えを含む生存中ユニットへ配信
allUnits 登録された有効ユニットへ配信
```

アリス固有のチェス進行は、共通トリガーとresolver APIを使用して`js/unique-mechanics/alice-liddell.js`へ登録します。共通ランタイムへアリス固有名の分岐は追加しません。
