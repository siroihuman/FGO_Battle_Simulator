(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('../data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('../engine.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine) {
    throw new Error('Beast No.031 NP special requires data and engine.');
  }

  const servant = DATA.servants && DATA.servants.beast031;
  if (servant && servant.np) {
    servant.np.special = {
      kind: 'beast031ServantManOrHumanoid',
      requiredTrait: 'サーヴァント',
      anyTraits: ['人の力', 'ヒト科'],
      ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
    };
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__beast031NpSpecialInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_BEAST031_NP_SPECIAL;
    return;
  }
  proto.__beast031NpSpecialInstalled = true;

  const originalNpSpecialMultiplier = proto._npSpecialMultiplier;
  proto._npSpecialMultiplier = function (np, target) {
    const special = np && np.special;
    if (!special || special.kind !== 'beast031ServantManOrHumanoid') {
      return originalNpSpecialMultiplier.call(this, np, target);
    }

    const hasTrait = (trait) => typeof this._unitHasTrait === 'function'
      ? this._unitHasTrait(target, trait)
      : (target && target.traits || []).includes(trait) ||
        ({ man: '人の力', sky: '天の力', earth: '地の力', star: '星の力', beast: '獣の力' }[target && target.attribute] === trait);

    if (!hasTrait(special.requiredTrait || 'サーヴァント')) return 1;
    if (!(special.anyTraits || []).some(hasTrait)) return 1;

    const oc = Math.max(1, Math.min(5, Number(this._currentNpOc || 1)));
    return Number((special.ocMultipliers || [])[oc - 1] || 1);
  };

  const API = {
    servantId: 'beast031',
    requiredTrait: 'サーヴァント',
    anyTraits: ['人の力', 'ヒト科']
  };

  global.FGO_SIM_BEAST031_NP_SPECIAL = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
