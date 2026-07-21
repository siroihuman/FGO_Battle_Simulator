(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);

  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const SCORE_SOURCE_PREFIX = 'クラススコア：';

  const CLASS_GROUPS = {
    saber: 'saber',
    archer: 'archer',
    lancer: 'lancer',
    rider: 'rider',
    caster: 'caster',
    assassin: 'assassin',
    berserker: 'berserker',
    shielder: 'extra1',
    ruler: 'extra1',
    avenger: 'extra1',
    moonCancer: 'extra1',
    alterEgo: 'extra2',
    foreigner: 'extra2',
    pretender: 'extra2',
    beast: 'extra2'
  };

  const EFFECT_DEFINITIONS = [
    {
      id: 'busterCardUp',
      name: 'Busterカード性能アップ',
      icon: 'Busterupstatus.webp',
      effect: { type: 'cardUp', card: 'buster', value: 20 }
    },
    {
      id: 'artsCardUp',
      name: 'Artsカード性能アップ',
      icon: 'Artsupstatus.webp',
      effect: { type: 'cardUp', card: 'arts', value: 20 }
    },
    {
      id: 'quickCardUp',
      name: 'Quickカード性能アップ',
      icon: 'Quickupstatus.webp',
      effect: { type: 'cardUp', card: 'quick', value: 20 }
    },
    {
      id: 'busterCriticalUp',
      name: 'Busterクリティカル威力アップ',
      icon: 'Critdmgup.webp',
      effect: { type: 'cardCritUp', card: 'buster', value: 20 }
    },
    {
      id: 'artsCriticalUp',
      name: 'Artsクリティカル威力アップ',
      icon: 'Critdmgup.webp',
      effect: { type: 'cardCritUp', card: 'arts', value: 40 }
    },
    {
      id: 'quickCriticalUp',
      name: 'Quickクリティカル威力アップ',
      icon: 'Critdmgup.webp',
      effect: { type: 'cardCritUp', card: 'quick', value: 60 }
    },
    {
      id: 'extraAttackUp',
      name: 'Extra Attackカード性能アップ',
      icon: 'Extraattackup.webp',
      effect: { type: 'cardUp', card: 'extra', value: 50 }
    },
    {
      id: 'starRateUp',
      name: 'スター発生率アップ',
      icon: 'Stargainup.webp',
      effect: { type: 'starRateUp', value: 50 }
    },
    {
      id: 'criticalUp',
      name: 'クリティカル威力アップ',
      icon: 'Critdmgup.webp',
      effect: { type: 'critUp', value: 10 }
    },
    {
      id: 'npPowerUp',
      name: '宝具威力アップ',
      icon: 'Nppowerup.webp',
      effect: { type: 'npPowerUp', value: 10 }
    }
  ];

  function classScoreGroup(classId) {
    return CLASS_GROUPS[classId] || 'unclassified';
  }

  function copyPassiveIcons(servant) {
    (servant.passives || []).forEach((passive) => {
      if (passive.category === 'classScore') return;
      (passive.effects || []).forEach((effect) => {
        if (!effect.statusIcon && passive.icon) effect.statusIcon = passive.icon;
      });
    });
  }

  function buildPassives(servant) {
    const scoreGroup = classScoreGroup(servant.classId);
    return EFFECT_DEFINITIONS.map((definition) => ({
      id: `classScore_${definition.id}`,
      name: `${SCORE_SOURCE_PREFIX}${definition.name}`,
      icon: definition.icon,
      category: 'classScore',
      scoreGroup,
      effects: [{
        ...definition.effect,
        statusIcon: definition.icon
      }]
    }));
  }

  function applyToServant(servant) {
    if (!servant) return servant;
    servant.passives = Array.isArray(servant.passives) ? servant.passives : [];
    copyPassiveIcons(servant);
    servant.passives = servant.passives.filter((passive) => passive.category !== 'classScore');
    servant.passives.push(...buildPassives(servant));
    return servant;
  }

  function applyAll() {
    Object.values(DATA.servants || {}).forEach(applyToServant);
    return DATA.servants;
  }

  const API = {
    fullyUnlocked: true,
    sourcePrefix: SCORE_SOURCE_PREFIX,
    classGroups: { ...CLASS_GROUPS },
    effects: EFFECT_DEFINITIONS.map((definition) => ({
      id: definition.id,
      name: definition.name,
      icon: definition.icon,
      effect: { ...definition.effect }
    })),
    commandSpellEffects: {
      attackUp: 50,
      defenseUp: 50,
      duration: 1,
      availableWhenCommandSpellSystemExists: true
    },
    classScoreGroup,
    applyToServant,
    applyAll
  };

  DATA.classScore = API;
  applyAll();

  global.FGO_SIM_CLASS_SCORE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);