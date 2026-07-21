(function (global) {
  'use strict';

  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!ENGINE || !ENGINE.BattleEngine) {
    throw new Error('order change position runtime requires engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__orderChangePositionInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
    return;
  }
  proto.__orderChangePositionInstalled = true;

  proto.orderChange = function (frontId, reserveId) {
    const front = this.state.allies.find((unit) =>
      unit.id === frontId && unit.frontline && unit.alive && unit.hp > 0
    );
    const reserve = this.state.allies.find((unit) =>
      unit.id === reserveId && !unit.frontline && unit.alive && unit.hp > 0
    );

    if (!front || !reserve) {
      return { ok: false, reason: '入れ替え対象が不正です。' };
    }

    const frontSlot = front.slot;
    const reserveSlot = reserve.slot;

    front.slot = reserveSlot;
    reserve.slot = frontSlot;
    front.frontline = false;
    reserve.frontline = true;

    // 編成枠の順序を実際の配列順にも反映する。
    // これにより表示、NP欄、対象選択、控えの自動登場順が同じ並びになる。
    this.state.allies.sort((a, b) => a.slot - b.slot);

    this._resetDeck();
    this._drawHand();
    this._log(
      `${front.name}と${reserve.name}をオーダーチェンジ（前衛${frontSlot + 1}枠⇔控え${reserveSlot - 2}枠）。`,
      'skill'
    );

    return {
      ok: true,
      frontId: reserve.id,
      reserveId: front.id,
      frontSlot,
      reserveSlot
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
