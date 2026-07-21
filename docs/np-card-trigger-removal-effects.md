# 宝具カード変更・宝具使用後トリガー・NP割合増加・強化解除耐性

Issue #26で追加した共通処理は`js/np-card-trigger-removal-effects.js`で管理します。

サーヴァントID・名称による分岐は使用しません。サーヴァントデータから以下の効果を宣言的に利用できます。

## 1. `npCardTypeChange`

```js
{
  type: 'npCardTypeChange',
  target: 'selectedAlly',
  card: 'buster',
  duration: 1
}
```

対象個体の宝具カードタイプを一時的に変更します。

変更後カードは次の全処理で共通して参照されます。

- 宝具選択ボタンの色とカード種別
- 選択済み宝具アクション
- 先頭カードボーナス
- Buster／Arts／Quickチェイン判定
- Mighty Chain判定
- 宝具ダメージ計算
- 宝具NPリチャージ計算
- 宝具スター発生計算

元の`actor.data.np.card`値は`__baseNpCard`として保持されます。`card`参照は有効な状態から動的に解決されるため、永続的なカード書き換えは行いません。

### 重複優先順位

同一対象へ複数の`npCardTypeChange`が有効な場合、最後に付与された有効状態を優先します。

状態が期限切れ・回数切れになった場合は、その直前に有効だった変更へ戻ります。すべて終了した場合は元の宝具カードタイプへ戻ります。

## 2. `afterNp`

```js
{
  type: 'triggerEffect',
  target: 'selectedAlly',
  event: 'afterNp',
  uses: 1,
  duration: 1,
  effects: [
    { type: 'cooldownReduce', target: 'self', value: 1 },
    { type: 'critUp', target: 'self', values: [10, 11, 12, 13, 14, 15, 16, 17, 18, 20], duration: 3 },
    { type: 'stars', target: 'party', values: [5, 6, 7, 8, 9, 10, 11, 12, 13, 15] }
  ]
}
```

宝具が実際に発動した本人について、本人に付与された`triggerEffect`だけが発火します。

攻撃宝具・補助宝具の双方に対応します。

### 発動順

1. 宝具使用時にNPを0%へリセット
2. 宝具前効果
3. 宝具攻撃または補助宝具本体
4. 宝具攻撃によるNPリチャージ
5. 宝具固有の後効果
6. `afterNp`トリガー
7. 次の選択アクション

宝具を選択しただけでは発火しません。使用者が戦闘不能、または実行時NPが100%未満で宝具が実行されなかった場合、トリガー回数を消費しません。

`triggerEffect`付与時のスキルレベルは状態へ保存されます。後から発火する`effects`内の`values`も、付与元スキルのレベルを使用します。

## 3. `npScaleUp`

```js
{
  type: 'npScaleUp',
  target: 'selectedAlly',
  values: [50, 55, 60, 65, 70, 75, 80, 85, 90, 100]
}
```

使用直前の現在NPに対して指定割合分を加算します。

```text
加算量 = 使用直前NP × value / 100
使用後NP = 使用直前NP + 加算量
```

- NP 0%では増加量0%
- NP 50%・value 50では75%
- NP 100%・value 100では200%
- NP 200%・value 100では上限300%
- NP 300%ではそれ以上増加しない

上限は既存仕様と同じ300%です。小数は既存の`_addNp`処理に従い、小数第2位まで切り捨てます。

## 4. `buffRemovalResist`

```js
{
  type: 'buffRemovalResist',
  target: 'allAllies',
  value: 100,
  uses: 1,
  duration: 3
}
```

`buffClear`実行前に対象の有効な強化解除耐性を判定します。

- 阻止成功時は対象の強化状態をすべて維持
- 阻止成功時だけ、使用した耐性の回数を1消費
- 阻止失敗時は通常どおり`buffClear`を実行
- 耐性状態を先に削除せず、判定後に処理
- 判定にはバトルエンジンの既存乱数を使用
- `debuffClear`などの弱体解除には影響しない

### 複数耐性の判定順

複数の強化解除耐性がある場合は、次の順で個別判定します。

1. 残りターンが短い状態
2. 残りターンが同じ場合、残り回数が少ない状態
3. さらに同じ場合、先に付与された状態

先に判定した耐性が失敗した場合は次の耐性を判定します。いずれかが成功した時点で強化解除を阻止し、成功した状態だけを消費します。

## 読込順

ブラウザでは次の順に読み込みます。

```html
<script src="js/trait-trigger-aura-effects.js"></script>
<script src="js/trigger-lifecycle-effects.js"></script>
<script src="js/np-card-trigger-removal-effects.js"></script>
```

## 回帰テスト

`tests/np-card-trigger-removal-effects-tests.js`で次を検証します。

- 宝具カード変更の表示参照・選択アクション反映
- 最後に付与された変更の優先
- 状態終了後の元カード復帰
- 宝具計算へ変更後カードが渡ること
- 攻撃宝具と補助宝具の`afterNp`
- 宝具固有後効果より後に`afterNp`が発火すること
- 宝具未発動時に回数を消費しないこと
- NP 0／50／100／200／300%での割合増加
- NP上限と小数処理
- 強化解除耐性100%による阻止と1回消費
- 耐性消費後の次回`buffClear`
- 複数耐性の判定順
- 弱体解除へ影響しないこと
