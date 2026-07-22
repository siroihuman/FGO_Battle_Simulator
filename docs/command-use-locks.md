# スキル・宝具使用不可状態

## 概要

サーヴァントのスキル・宝具に関する使用不可状態は、`js/command-use-locks.js`で共通管理する。

使用不可状態が有効な場合は、次の両方を行う。

- エンジン側で使用を拒否する
- 戦闘画面の対象ボタンをグレーアウトし、使用不可理由を表示する

表示だけを無効化する実装にはせず、`useSkill`、`toggleNp`、`executeCommandChain`から直接呼び出した場合も使用できない。

魔術礼装スキルはサーヴァントのスキル封印対象に含めない。

## スキル封印

全保有スキルを使用不可にする。

```js
{
  type: 'skillSeal',
  target: 'selectedEnemy',
  duration: 1,
  debuff: true,
  chance: 100
}
```

有効中はスキル1～3をすべてグレーアウトし、ボタン中央へ`スキル封印`と表示する。

## 宝具封印

宝具を使用不可にする。

```js
{
  type: 'npSeal',
  target: 'selectedEnemy',
  duration: 1,
  debuff: true,
  chance: 100
}
```

有効中はNPが100%以上でも宝具ボタンをグレーアウトする。

宝具選択後に宝具封印が付与された場合は、その宝具選択を自動解除する。攻撃開始時にも再検査し、封印中の宝具が選択状態として残っていた場合はコマンド実行を中止する。

敵側では従来どおり、宝具封印中は宝具使用とターン終了時のチャージ増加を停止する。

## 個別スキル使用不可

### 推奨形式

`skillNumber`は画面表示と同じ1始まりで指定する。

```js
{
  type: 'skillDisable',
  target: 'selectedEnemy',
  skillNumber: 1,
  duration: 3,
  debuff: true,
  chance: 100
}
```

上記はスキル1だけを使用不可にする。スキル2・3は通常どおり使用できる。

複数指定も可能。

```js
{
  type: 'skillDisable',
  target: 'selectedEnemy',
  skillNumbers: [1, 3],
  duration: 3,
  debuff: true,
  chance: 100
}
```

### 0始まり指定

内部配列番号で指定する場合は`skillIndex`または`skillIndices`を使用する。

```js
{
  type: 'skillDisable',
  skillIndex: 0,
  duration: 3,
  debuff: true
}
```

`skillIndex: 0`はスキル1を表す。

### スキルID指定

```js
{
  type: 'skillDisable',
  skillId: 'skillInternalId',
  duration: 3,
  debuff: true
}
```

対象サーヴァントの`skills[].id`と一致するスキルを使用不可にする。

### 簡略型名

以下も認識する。

```js
{ type: 'skill1Seal', duration: 3, debuff: true }
{ type: 'skill2Seal', duration: 3, debuff: true }
{ type: 'skill3Seal', duration: 3, debuff: true }
```

`skillSeal1`、`skill1Disable`、`skill1Lock`形式にも対応するが、新規データでは`skillDisable`と`skillNumber`の組み合わせを使用する。

## 使用可否の優先表示

封印状態とCTが同時に存在する場合、ボタン上では封印理由を優先表示する。

状態が解除・期限切れになった後は、次の通常条件で使用可否を再判定する。

- 前衛か
- 生存しているか
- コマンドフェイズか
- CTが0か
- 宝具の場合はNPが100%以上か

## UI

封印対象には`command-use-locked`クラスを付与する。

- グレースケール化
- 明度低下
- クリック不可
- 中央に`スキル封印`、`宝具封印`、`スキル1使用不可`などを表示
- `title`へ使用不可理由を追加

スマートフォン表示でも同じ判定と表示を使用する。
