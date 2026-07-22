(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);

  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const MYSTIC_CODES = {
      chaldea: { id:'chaldea', name:'魔術礼装・カルデア', skills:[
        {name:'応急手当',icon:'skill-general-006.png',baseCt:9,target:'ally',description:'味方単体のHPを大回復',effects:[{type:'heal',target:'selectedAlly',values:[1000,1200,1400,1600,1800,2000,2200,2400,2600,3000]}]},
        {name:'瞬間強化',icon:'skill-attack-up.png',baseCt:15,target:'ally',description:'味方単体の攻撃力を超アップ(1T)',effects:[{type:'attackUp',target:'selectedAlly',values:[30,32,34,36,38,40,42,44,46,50],duration:1}]},
        {name:'緊急回避',icon:'skill-evade.png',baseCt:15,target:'ally',description:'味方単体に回避状態を付与(1T)',effects:[{type:'evade',target:'selectedAlly',value:1,duration:1}]}
      ]},
      combatUniform: { id:'combatUniform', name:'カルデア戦闘服', skills:[
        {name:'全体強化',icon:'skill-attack-up.png',baseCt:12,target:'self',description:'味方全体の攻撃力をアップ(1T)',effects:[{type:'attackUp',target:'allAllies',values:[20,21,22,23,24,25,26,27,28,30],duration:1}]},
        {name:'ガンド',icon:'skill-stun.png',baseCt:15,target:'enemy',description:'敵単体にスタン状態を付与(1T)',effects:[{type:'stun',target:'selectedEnemy',value:1,duration:1,debuff:true}]},
        {name:'オーダーチェンジ',icon:'skill-unique-004.png',baseCt:15,target:'orderChange',description:'バトル中のメンバーをサブメンバーと入れ替える',effects:[{type:'orderChange'}]}
      ]},
      atlas: { id:'atlas', name:'アトラス院制服', skills:[
        {name:'オシリスの塵',icon:'skill-invincible.png',baseCt:15,target:'ally',description:'味方単体に無敵状態を付与(1T)',effects:[{type:'invincible',target:'selectedAlly',value:1,duration:1}]},
        {name:'イシスの雨',icon:'skill-general-058.png',baseCt:15,target:'ally',description:'味方単体の弱体状態を解除',effects:[{type:'debuffClear',target:'selectedAlly'}]},
        {name:'メジェドの眼',icon:'skill-general-030.png',baseCt:15,target:'ally',description:'味方単体のスキルチャージを2進める',effects:[{type:'cooldownReduce',target:'selectedAlly',value:2}]}
      ]},
      decisive: { id:'decisive', name:'決戦用カルデア制服', skills:[
        {name:'決戦強化',icon:'skill-attack-up.png',baseCt:15,target:'self',description:'味方全体の攻撃力をアップ(1T)\n＆宝具威力をアップ(1T)',effects:[{type:'attackUp',target:'allAllies',values:[10,11,12,13,14,15,16,17,18,20],duration:1},{type:'npPowerUp',target:'allAllies',values:[10,11,12,13,14,15,16,17,18,20],duration:1}]},
        {name:'前線回復',icon:'skill-general-006.png',baseCt:12,target:'ally',description:'味方単体のHPを回復\n＆攻撃弱体状態を解除',effects:[{type:'heal',target:'selectedAlly',values:[1000,1200,1400,1600,1800,2000,2200,2400,2600,3000]},{type:'attackDebuffClear',target:'selectedAlly'}]},
        {name:'オーダーチェンジ',icon:'skill-unique-004.png',baseCt:15,target:'orderChange',description:'バトル中のメンバーをサブメンバーと入れ替える',effects:[{type:'orderChange'}]}
      ]},
      normalChaldea: { id:'normalChaldea', name:'ノーマル・カルデア制服', skills:[
        {name:'応急支援',icon:'skill-general-006.png',baseCt:9,target:'ally',description:'味方単体のHPを回復\n＋スターを獲得',effects:[{type:'heal',target:'selectedAlly',values:[1000,1100,1200,1300,1400,1500,1600,1700,1800,2000]},{type:'stars',target:'party',values:[5,6,7,8,9,10,11,12,13,15]}]},
        {name:'魔力強化',icon:'skill-attack-up.png',baseCt:15,target:'ally',description:'味方単体の攻撃力をアップ(1T)\n＆NPを増やす',effects:[{type:'attackUp',target:'selectedAlly',values:[20,22,24,26,28,30,32,34,36,40],duration:1},{type:'npCharge',target:'selectedAlly',value:10}]},
        {name:'オーダーチェンジ',icon:'skill-unique-004.png',baseCt:15,target:'orderChange',description:'バトル中のメンバーをサブメンバーと入れ替える',effects:[{type:'orderChange'}]}
      ]}
    };

  Object.assign(DATA.mysticCodes, MYSTIC_CODES);

  if (typeof module !== 'undefined' && module.exports) module.exports = MYSTIC_CODES;
})(typeof window !== 'undefined' ? window : globalThis);
