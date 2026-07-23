# Issue #53 共通行動処理

## 概要

以下の処理を`js/command-card-selection-effects.js`へ共通化する。

- コマンドカード選出不能
- 行動不能
- 行動不能参加時のチェインエラー
- 味方対象の前衛限定

サーヴァント固有ファイルでは、効果の固有発動条件だけを管理し、カード配布・行動可否・チェイン・対象範囲の基本判定は行わない。

## コマンドカード選出不能

推奨効果タイプ：

```js
{
  type: 'commandCardDrawSeal',
  target: 'self',
  duration: 5,
  debuff: true
}
```

互換タイプ：

- `commandCardSeal`
- `commandCardDrawSeal`
- `commandCardSelectionDisable`
- `konohanaCommandCardSeal`

状態中のサーヴァントは、山札生成時と手札生成時の両方で配布候補から除外する。

前衛が1騎のみの場合は付与を抑止し、既に状態が存在する場合も配布時には無効として扱う。

## 行動不能

共通認識タイプ：

- `stun`
- `charm`
- `sleep`
- `permanentSleep`
- `petrify`
- `petrification`
- `freeze`
- `frozen`
- `actionDisable`
- `actionIncapacitated`
- `unableToAct`
- `immobilize`

独自状態を行動不能として扱う場合は、状態へ次のいずれかを指定できる。

```js
{
  type: 'customStatus',
  preventsAction: true
}
```

対応フラグ：

- `preventsAction: true`
- `actionDisabled: true`
- `incapacitated: true`

行動不能中でもコマンドカードは通常どおり配布・選択できる。通常攻撃または宝具を実行する段階で、そのサーヴァントの行動だけを失敗させる。

敵側も同じ判定を使用し、敵行動開始前に行動を停止する。

## チェインエラー

選択した3行動の参加者に行動不能サーヴァントが含まれる場合、次をすべて無効化する。

- Buster Chain
- Arts Chain
- Quick Chain
- Mighty Chain
- Brave Chain
- 宝具ChainによるOC上昇
- Extra Attack
- 1stカードボーナス

行動可能なサーヴァントの通常攻撃・宝具は実行するが、チェイン関連効果は発生しない。

## 味方対象範囲

`_effectTargets`で味方を対象にする場合、既定では前衛だけを返す。

対象例：

- `selectedAlly`
- `allAllies`
- `party`
- `allOtherAllies`
- `otherAllies`
- `allAlliesExceptSelf`

控えを含める場合は、効果へ明示指定する。

```js
{
  type: 'attackUp',
  target: 'allAllies',
  includeReserve: true,
  value: 20,
  duration: 3
}
```

対応指定：

- `includeReserve: true`
- `includingReserve: true`
- `targetsReserve: true`
- `targetScope: 'includingReserve'`
- 対象名末尾に`IncludingReserve`

例：

```js
{ type: 'npCharge', target: 'allAlliesIncludingReserve', value: 20 }
```

`self`は自身を直接対象にするため、前衛・控えのフィルターを適用しない。

## 木花之佐久夜毘売

木花之佐久夜毘売の次の処理は共通基盤へ移行した。

- コマンドカード選出不能
- 前衛1騎時の付与抑止
- 〔桜花爛漫〕の味方対象を前衛に限定

固有ファイルでは、陽射しフィールド、桜花爛漫の発動条件、拘束、スキル使用後CT短縮だけを管理する。
