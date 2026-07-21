(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine) {
    throw new Error('card buff effects requires data and engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__cardBuffEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_CARD_BUFF_EFFECTS;
    return;
  }
  proto.__cardBuffEffectsInstalled = true;

  const CARD_NAMES = {
    quick: 'Quick',
    arts: 'Arts',
    buster: 'Buster',
    extra: 'Extra Attack'
  };

  const CARD_ICONS = {
    quick: { up: 'Quickupstatus.webp', down: 'Quickdown.webp' },
    arts: { up: 'Artsupstatus.webp', down: 'Artsdown.webp' },
    buster: { up: 'Busterupstatus.webp', down: 'Busterdown.webp' },
    extra: { up: 'Extraattackup.webp', down: 'Extraattackup.webp' }
  };

  const PERFORMANCE_TYPES = new Set(['cardUp', 'cardDown']);
  const POWER_TYPES = new Set(['cardPowerUp', 'cardPowerDown']);
  const CARD_TYPES = new Set([...PERFORMANCE_TYPES, ...POWER_TYPES]);

  function matchesCard(status, card) {
    return !status.card || status.card === card;
  }

  function isDownStatus(status) {
    return status.type === 'cardDown' || status.type === 'cardPowerDown' || Number(status.value || 0) < 0;
  }

  function displayForStatus(status) {
    if (!status || !CARD_TYPES.has(status.type) || !CARD_NAMES[status.card]) return null;
    const direction = isDownStatus(status) ? 'down' : 'up';
    const kind = POWER_TYPES.has(status.type) ? '威力' : '性能';
    return {
      name: `${CARD_NAMES[status.card]}カード${kind}${direction === 'down' ? 'ダウン' : 'アップ'}`,
      icon: CARD_ICONS[status.card][direction]
    };
  }

  function syntheticStatus(source, value) {
    return {
      type: 'cardUp',
      value,
      card: source.card,
      source: source.source || '',
      remaining: source.remaining == null ? -1 : source.remaining,
      uses: source.uses == null ? null : source.uses,
      debuff: value < 0
    };
  }

  function withStatuses(unit, statuses, callback) {
    if (!unit || !statuses.length) return callback();
    const original = unit.statuses;
    unit.statuses = original.concat(statuses);
    try {
      return callback();
    } finally {
      unit.statuses = original;
    }
  }

  function withFilteredStatuses(unit, predicate, callback) {
    if (!unit) return callback();
    const original = unit.statuses;
    unit.statuses = original.filter(predicate);
    try {
      return callback();
    } finally {
      unit.statuses = original;
    }
  }

  function convertedStatuses(unit, types, card) {
    return (unit.statuses || [])
      .filter((status) => types.has(status.type) && matchesCard(status, card))
      .map((status) => {
        const down = status.type.endsWith('Down') || Number(status.value || 0) < 0;
        const amount = Math.abs(Number(status.value || 0));
        return syntheticStatus(status, down ? -amount : amount);
      });
  }

  const originalCalculateAttackTotal = proto._calculateAttackTotal;
  proto._calculateAttackTotal = function (actor, target, action, chainContext) {
    const card = action && action.card;
    const converted = convertedStatuses(actor, new Set(['cardDown', 'cardPowerUp', 'cardPowerDown']), card);
    return withStatuses(actor, converted, () => originalCalculateAttackTotal.call(this, actor, target, action, chainContext));
  };

  const originalCardNpPerHit = proto._cardNpPerHit;
  proto._cardNpPerHit = function (actor, target, action, chainContext, overkill) {
    const card = action && action.card;
    const converted = convertedStatuses(actor, new Set(['cardDown']), card);
    return withStatuses(actor, converted, () => originalCardNpPerHit.call(this, actor, target, action, chainContext, overkill));
  };

  const originalStarRatePerHit = proto._starRatePerHit;
  proto._starRatePerHit = function (actor, target, action, chainContext, overkill) {
    const card = action && action.card;
    if (card === 'buster') {
      return withFilteredStatuses(
        actor,
        (status) => !(status.type === 'cardUp' && matchesCard(status, 'buster')),
        () => originalStarRatePerHit.call(this, actor, target, action, chainContext, overkill)
      );
    }
    const converted = ['quick', 'extra'].includes(card)
      ? convertedStatuses(actor, new Set(['cardDown']), card)
      : [];
    return withStatuses(actor, converted, () => originalStarRatePerHit.call(this, actor, target, action, chainContext, overkill));
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      const display = displayForStatus(status);
      if (!display) return status;
      const isClassScore = String(status.source || '').startsWith('クラススコア：');
      const preserveClassSkillIcon = status.passive && !isClassScore && status.statusIcon;
      return {
        ...status,
        name: display.name,
        statusIcon: preserveClassSkillIcon ? status.statusIcon : display.icon
      };
    });
  };

  DATA.statusIcons.cardDown = DATA.statusIcons.cardDown || 'Statusup.webp';
  DATA.statusIcons.cardPowerUp = DATA.statusIcons.cardPowerUp || 'Statusup.webp';
  DATA.statusIcons.cardPowerDown = DATA.statusIcons.cardPowerDown || 'Statusup.webp';
  DATA.cardStatusIcons = {
    performance: JSON.parse(JSON.stringify(CARD_ICONS)),
    power: JSON.parse(JSON.stringify(CARD_ICONS))
  };

  const API = {
    cardNames: { ...CARD_NAMES },
    icons: JSON.parse(JSON.stringify(CARD_ICONS)),
    performanceTypes: Array.from(PERFORMANCE_TYPES),
    powerTypes: Array.from(POWER_TYPES),
    displayForStatus
  };

  global.FGO_SIM_CARD_BUFF_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);