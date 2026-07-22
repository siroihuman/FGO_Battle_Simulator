(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const COMMON = global.FGO_SIM_COMMON_EFFECTS ||
    (typeof require !== 'undefined' ? require('./common-effects.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !COMMON) {
    throw new Error('card pre-damage effects require data, engine and common effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__cardPreDamageEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_CARD_PRE_DAMAGE_EFFECTS;
    return;
  }
  proto.__cardPreDamageEffectsInstalled = true;

  const META_KEYS = [
    'debuffType', 'debuffValue', 'debuffDuration', 'chance', 'normalCardsOnly'
  ];

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const status = originalAddStatus.call(this, unit, effect, value, source);
    if (status && effect && effect.type === 'beforeCardDamageApplyDebuff') {
      META_KEYS.forEach((key) => {
        if (effect[key] !== undefined) status[key] = effect[key];
      });
    }
    return status;
  };

  function isActive(status) {
    return Boolean(status) &&
      (status.remaining == null || status.remaining < 0 || status.remaining > 0) &&
      (status.uses == null || status.uses > 0);
  }

  const originalResolveAttackOnTarget = proto._resolveAttackOnTarget;
  proto._resolveAttackOnTarget = function (actor, target, action, chainContext) {
    if (actor && target && action) {
      const isNormalCard = action.type === 'card';
      (actor.statuses || []).slice().forEach((status) => {
        if (status.type !== 'beforeCardDamageApplyDebuff' || !isActive(status)) return;
        if (status.normalCardsOnly !== false && !isNormalCard) return;
        if (status.card && status.card !== action.card) return;
        this._tryApplyDebuff(actor, target, {
          type: status.debuffType || 'defenseDown',
          debuffType: status.debuffType || 'defenseDown',
          debuffValue: Number(status.debuffValue == null ? status.value : status.debuffValue),
          debuffDuration: Number(status.debuffDuration == null ? 1 : status.debuffDuration),
          chance: status.chance == null ? 100 : Number(status.chance),
          debuff: true
        }, status.source || actor.name);
        if (status.uses != null) this._consumeStatus(actor, status);
      });
    }
    return originalResolveAttackOnTarget.call(this, actor, target, action, chainContext);
  };

  const originalCardNpPerHit = proto._cardNpPerHit;
  proto._cardNpPerHit = function (actor, target, action, chainContext, overkill) {
    const base = originalCardNpPerHit.call(this, actor, target, action, chainContext, overkill);
    if (!actor || !action) return base;
    const cardSpecific = this._statusTotal(actor, 'cardNpGainUp', { card: action.card });
    if (!cardSpecific) return base;
    const general = this._statusTotal(actor, 'npGainUp');
    const denominator = Math.max(0.001, 1 + general / 100);
    return base * Math.max(0, 1 + (general + cardSpecific) / 100) / denominator;
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (status.type === 'beforeCardDamageApplyDebuff') {
        return {
          ...status,
          name: 'カード攻撃時・ダメージ前弱体付与',
          statusIcon: status.statusIcon || DATA.statusIcons.beforeCardDamageApplyDebuff
        };
      }
      if (status.type === 'cardNpGainUp') {
        return {
          ...status,
          name: 'カード限定NP獲得量アップ',
          statusIcon: status.statusIcon || DATA.statusIcons.cardNpGainUp
        };
      }
      return status;
    });
  };

  DATA.statusIcons.beforeCardDamageApplyDebuff = DATA.statusIcons.beforeCardDamageApplyDebuff || 'Buffatk.webp';
  DATA.statusIcons.cardNpGainUp = DATA.statusIcons.cardNpGainUp || 'NPGainUpDmg.webp';

  const API = {
    statusTypes: ['beforeCardDamageApplyDebuff', 'cardNpGainUp'],
    timing: '対象ごとのダメージ計算前に弱体付与'
  };

  global.FGO_SIM_CARD_PRE_DAMAGE_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
