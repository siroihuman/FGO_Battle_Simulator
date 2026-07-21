(function (global) {
  'use strict';

  const DATA = {
    version: '1.6.1',
    title: 'FGO バトルシミュレーター',
    classNames: {
      saber: 'セイバー', archer: 'アーチャー', lancer: 'ランサー',
      rider: 'ライダー', caster: 'キャスター', assassin: 'アサシン',
      berserker: 'バーサーカー', shielder: 'シールダー', ruler: 'ルーラー',
      avenger: 'アヴェンジャー', moonCancer: 'ムーンキャンサー',
      alterEgo: 'アルターエゴ', foreigner: 'フォーリナー', pretender: 'プリテンダー',
      beast: 'ビースト'
    },
    attributeNames: {
      sky: '天', earth: '地', man: '人', star: '星', beast: '獣', neutral: 'なし'
    },
    traitNames: {
      servant: 'サーヴァント', human: '人間', humanoid: '人型', divine: '神性',
      beastForm: '魔獣型', wildBeast: '猛獣', giant: '超巨大', demonic: '魔性', king:'王', order:'秩序', threatHumanity:'人類の脅威', fictionalConcept:'虚構概念', check:'チェック', poison:'毒'
    },
    statusIcons: {
      attackUp: 'Attackup.webp',
      defenseUp: 'Defenseup.webp',
      cardUp: 'Statusup.webp',
      cardDown: 'Statusup.webp',
      cardPowerUp: 'Statusup.webp',
      cardPowerDown: 'Statusup.webp',
      critUp: 'Critdmgup.webp',
      cardCritUp: 'Critdmgup.webp',
      starRateUp: 'Stargainup.webp',
      starsPerTurn: 'Stargainup.webp',
      cardStarWeightUp: 'Critabsup.webp',
      traitPowerUp: 'Powerup.webp',
      attributePowerUp: 'Powerup.webp',
      busterNormalNp: 'Npchargeup.webp',
      npGainUp: 'NPGainUpDmg.webp',
      npPerTurn: 'Npgainturn.webp',
      npPowerUp: 'Nppowerup.webp',
      damagePlus: 'Powerup.webp',
      ocUp: 'NPOvercharge.webp',
      invinciblePierce: 'Invinciblepierce.webp',
      sureHit: 'Invinciblepierce.webp',
      invincible: 'Invincible.webp',
      evade: 'Avoid.webp',
      guts: 'Gutsstatus.webp',
      deathResist: 'Instaresistup.webp',
      debuffResist: 'Resistanceup.webp',
      mentalResist: 'Resistanceup.webp',
      debuffSuccess: 'Statusup.webp',
      charmSuccessUp: 'Statusup.webp',
      charm: 'Stunstatus.webp',
      stun: 'Stunstatus.webp',
      poison: 'Poison.webp',
      burn: 'Poison.webp',
      curse: 'Poison.webp',
      dotAmplify: 'Statusup.webp',
      onNormalAttackApplyDebuff: 'Buffatk.webp',
      addTrait: 'Statusup.webp',
      onAttackAddTrait: 'Buffatk.webp'
    },
    servants: {},
    craftEssences: {},
    mysticCodes: {},
    classScore: null
  };

  global.FGO_SIM_DATA = DATA;

  // Node.jsではdata.jsをrequireするだけで、分割データと常時適用システムも自動登録します。
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA;
    require('./servants.js');
    require('./craft-essences.js');
    require('./mystic-codes.js');
    require('./class-score.js');
  }
})(typeof window !== 'undefined' ? window : globalThis);
