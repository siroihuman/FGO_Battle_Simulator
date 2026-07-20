(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);

  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const levelValues = (values) => values;

  const SERVANTS = {
      koyanskayaLight: {
        id: 'koyanskayaLight',
        no: '314',
        name: '光のコヤンスカヤ',
        classId: 'assassin',
        rarity: 5,
        maxHp: 13081,
        atk: 11616,
        attribute: 'beast',
        traits: ['servant', 'humanoid', 'divine', 'demonic', 'beastForm'],
        cards: ['quick', 'quick', 'arts', 'buster', 'buster'],
        hits: { quick: 4, arts: 4, buster: 3, extra: 5, np: 8 },
        na: 0.76,
        nd: 4.00,
        starRate: 25.5,
        starWeight: 102,
        deathRate: 33.0,
        skillIcons: [
          'skill-np-charge.png',
          'skill-special-attack.png',
          'skill-buster-star-weight.png'
        ],
        skills: [
          {
            id: 'innovatorBunny',
            name: 'イノベイター・バニー A',
            baseCt: 10,
            target: 'ally',
            description: '味方単体のNPを増やし、スキルチャージを2進める。味方全体のHPを1000減らす。',
            effects: [
              { type: 'npCharge', target: 'selectedAlly', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]) },
              { type: 'cooldownReduce', target: 'selectedAlly', value: 2 },
              { type: 'hpLoss', target: 'allAllies', value: 1000, nonLethal: true }
            ]
          },
          {
            id: 'humanSlaughterTechnique',
            name: '殺戮技巧（人） A',
            baseCt: 8,
            target: 'ally',
            description: '味方単体に〔人間〕特攻、〔人の力を持つ敵〕特攻、Buster通常攻撃時NP増加を付与し、スターを獲得する。',
            effects: [
              { type: 'traitPowerUp', target: 'selectedAlly', trait: 'human', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'attributePowerUp', target: 'selectedAlly', attribute: 'man', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'busterNormalNp', target: 'selectedAlly', values: levelValues([5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10]), duration: 3 },
              { type: 'stars', target: 'party', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]) }
            ]
          },
          {
            id: 'nffSpecial',
            name: 'ＮＦＦスペシャル A',
            baseCt: 8,
            target: 'ally',
            description: '味方単体のBuster性能、Busterクリティカル威力、Busterスター集中度をアップする。',
            effects: [
              { type: 'cardUp', target: 'selectedAlly', card: 'buster', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'cardCritUp', target: 'selectedAlly', card: 'buster', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'cardStarWeightUp', target: 'selectedAlly', card: 'buster', values: levelValues([3000, 3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600, 5000]), duration: 3 }
            ]
          }
        ],
        passives: [
          { name: '騎乗 B', icon: 'class-riding.png', effects: [{ type: 'cardUp', card: 'quick', value: 8 }] },
          { name: '単独行動 EX', icon: 'class-independent-action.png', effects: [{ type: 'critUp', value: 12 }] },
          { name: '単独顕現 C', icon: 'class-independent-action.png', effects: [{ type: 'critUp', value: 6 }, { type: 'deathResist', value: 6 }, { type: 'mentalResist', value: 6 }] },
          { name: '変化 A', icon: 'skill-arts-up.png', effects: [{ type: 'cardUp', card: 'arts', value: 10 }, { type: 'starRateUp', value: 10 }] },
          { name: '女神変生（銃） B', icon: 'class-divinity.png', effects: [{ type: 'npPowerUp', value: 20 }] }
        ],
        np: {
          id: 'izTulaSevenDrive',
          name: '霊裳重光・79式擲禍大社',
          reading: 'イズトゥーラ・セブンドライブ',
          card: 'buster',
          target: 'allEnemies',
          hits: 8,
          multipliers: [300, 400, 450, 475, 500],
          description: '自身の攻撃力をアップ(1T)し、敵全体に攻撃。チャージを1減らし、味方全体のNPを増やす。',
          before: [{ type: 'attackUp', target: 'self', value: 20, duration: 1 }],
          after: [
            { type: 'enemyChargeDown', target: 'allEnemies', value: 1 },
            { type: 'npCharge', target: 'allAllies', ocValues: [10, 15, 20, 25, 30] }
          ]
        },
        source: 'https://w.atwiki.jp/f_go/pages/5141.html',
        maxLevel:90, levelStats:{max:{hp:13081,atk:11616},100:{hp:14333,atk:12728},120:{hp:16851,atk:14964}}
      },

      fenrir: {
        id: 'fenrir',
        no: '058',
        name: 'フェンリル',
        classId: 'berserker',
        rarity: 5,
        maxHp: 12514,
        atk: 13085,
        attribute: 'beast',
        traits: ['サーヴァント', '神性', '魔獣型', '猛獣', '超巨大'],
        cards: ['quick', 'arts', 'buster', 'buster', 'buster'],
        hits: { quick: 5, arts: 2, buster: 2, extra: 5, np: 5 },
        na: 1.07,
        nd: 5.00,
        starRate: 5.0,
        starWeight: 9,
        deathRate: 39.0,
        skillIcons: [
          'skill-special-attack.png',
          'skill-np-charge.png',
          'skill-buster-star-weight.png'
        ],
        skills: [
          {
            id: 'godSlayingWolf',
            name: '神殺しの魔狼 B～EX',
            baseCt: 8,
            target: 'self',
            description: '自身に〔神性〕特攻状態を付与し、クリティカル威力とスター発生率をアップする。',
            effects: [
              { type: 'traitPowerUp', target: 'self', trait: '神性', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]), duration: 3 },
              { type: 'critUp', target: 'self', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]), duration: 3 },
              { type: 'starRateUp', target: 'self', values: levelValues([50, 55, 60, 65, 70, 75, 80, 85, 90, 100]), duration: 3 }
            ]
          },
          {
            id: 'threeRestraints',
            name: '魔狼阻む三本の拘束 A++',
            baseCt: 9,
            target: 'self',
            description: '自身のNPと攻撃力を増加し、宝具使用時のOCを2段階引き上げる状態を付与する。',
            effects: [
              { type: 'npCharge', target: 'self', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]) },
              { type: 'attackUp', target: 'self', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]), duration: 3 },
              { type: 'ocUp', target: 'self', value: 2, duration: 3, uses: 1 }
            ]
          },
          {
            id: 'frozenFourLegs',
            name: '凍気迸る獣の四脚 A',
            baseCt: 9,
            target: 'self',
            description: '自身のBusterスター集中度とBusterクリティカル威力をアップし、無敵貫通を付与。スターを獲得する。',
            effects: [
              { type: 'cardStarWeightUp', target: 'self', card: 'buster', values: levelValues([3000, 3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600, 5000]), duration: 3 },
              { type: 'cardCritUp', target: 'self', card: 'buster', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'invinciblePierce', target: 'self', value: 1, duration: 3 },
              { type: 'stars', target: 'party', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]) }
            ]
          }

        ],
        passives: [
          { name: '対魔力 B', icon: 'class-magic-resistance.png', effects: [{ type: 'debuffResist', value: 17.5 }] },
          { name: '狂化 A+（B+相当）', icon: 'class-madness-enhancement.png', effects: [{ type: 'cardUp', card: 'buster', value: 9 }] },
          { name: '神性 E-', icon: 'class-divinity.png', effects: [{ type: 'damagePlus', value: 95 }] },
          { name: '野性 A', icon: 'skill-crit-up.png', effects: [{ type: 'starRateUp', value: 10 }, { type: 'critUp', value: 10 }] }
        ],
        np: {
          id: 'ragnarokHrodvitnir',
          name: '咆哮轟く終焉の黄昏',
          reading: 'ラグナロク・フローズヴィトニル',
          card: 'buster',
          target: 'allEnemies',
          hits: 5,
          multipliers: [300, 400, 450, 475, 500],
          description: '自身のBuster性能をアップ(1T)し、敵全体に攻撃。〔天の力を持つ敵〕には150%特攻。自身のHPを1000減らす。',
          before: [{ type: 'cardUp', target: 'self', card: 'buster', ocValues: [10, 20, 30, 40, 50], duration: 1 }],
          special: { kind: 'attribute', key: 'sky', multiplier: 1.5 },
          after: [{ type: 'hpLoss', target: 'self', value: 1000, nonLethal: true }]
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/329.html',
        maxLevel:90, levelStats:{max:{hp:12514,atk:13085},100:{hp:13690,atk:14315},120:{hp:16082,atk:16816}}
      },
      artoriaCaster: {
        id:'artoriaCaster',no:'284',name:'アルトリア・キャスター',classId:'caster',rarity:5,maxLevel:90,maxHp:14406,atk:10546,
        levelStats:{max:{hp:14406,atk:10546},100:{hp:15775,atk:11548},120:{hp:18529,atk:13564}},attribute:'star',
        traits:['サーヴァント','人型','アルトリア顔','アーサー','円卓の騎士','妖精'],cards:['quick','arts','arts','arts','buster'],hits:{quick:3,arts:3,buster:3,extra:5,np:0},na:.54,nd:3,starRate:11,starWeight:50,deathRate:36,
        skillIcons:['skill-attack-up.png','skill-np-charge.png','skill-arts-up.png'],skills:[
          {id:'charismaHope',name:'希望のカリスマ B',baseCt:8,target:'self',description:`味方全体の攻撃力をアップ(3T)
＆NPを増やす`,effects:[{type:'attackUp',target:'allAllies',values:[10,11,12,13,14,15,16,17,18,20],duration:3},{type:'npCharge',target:'allAllies',values:[20,21,22,23,24,25,26,27,28,30]}]},
          {id:'avalonFairy',name:'アヴァロンの妖精 A',baseCt:7,target:'ally',description:`味方単体のNPを増やす
＋味方全体のNP獲得量をアップ(3T)`,effects:[{type:'npCharge',target:'selectedAlly',values:[10,11,12,13,14,15,16,17,18,20]},{type:'npGainUp',target:'allAllies',values:[20,21,22,23,24,25,26,27,28,30],duration:3}]},
          {id:'holySwordCreation',name:'聖剣作成 EX',baseCt:8,target:'ally',description:`味方単体のArts性能をアップ(3T)
〔人類の脅威〕特攻を付与(3T)
無敵状態を付与(1T)`,effects:[{type:'cardUp',target:'selectedAlly',card:'arts',values:[30,32,34,36,38,40,42,44,46,50],duration:3},{type:'traitPowerUp',target:'selectedAlly',trait:'人類の脅威',values:[30,32,34,36,38,40,42,44,46,50],duration:3},{type:'invincible',target:'selectedAlly',value:1,duration:1}]}
        ],passives:[{name:'対魔力 A',icon:'class-magic-resistance.png',effects:[{type:'debuffResist',value:20}]},{name:'陣地作成 EX',icon:'class-territory-creation.png',effects:[{type:'cardUp',card:'arts',value:12}]}],
        np:{id:'aroundCaliburn',name:'きみをいだく希望の星',reading:'アラウンド・カリバーン',card:'arts',target:'support',hits:0,multipliers:[0,0,0,0,0],description:'味方全体の攻撃力をアップし、弱体解除、対粛正防御を付与。',before:[],after:[{type:'attackUp',target:'allAllies',npLevelValues:[30,40,45,47.5,50],duration:3},{type:'debuffClear',target:'allAllies'},{type:'invincible',target:'allAllies',ocValues:[1,2,3,4,5],duration:3}]},source:'https://w.atwiki.jp/f_go/pages/4719.html'
      },
      skadiRuler:{id:'skadiRuler',no:'357',name:'スカサハ＝スカディ〔ルーラー〕',classId:'ruler',rarity:5,maxLevel:90,maxHp:14850,atk:10868,levelStats:{max:{hp:14850,atk:10868},100:{hp:16261,atk:11898},120:{hp:19101,atk:13976}},attribute:'sky',traits:['サーヴァント','人型','神性','王','神霊','夏モード','混沌'],cards:['quick','quick','arts','buster','buster'],hits:{quick:4,arts:3,buster:4,extra:5,np:6},na:.78,nd:3,starRate:9.8,starWeight:102,deathRate:17.5,skillIcons:['skill-quick-up.png','skill-attack-up.png','skill-np-charge.png'],skills:[{name:'原初のルーン（盛夏） A',baseCt:8,target:'ally',description:'味方単体のQuick性能とQuickクリティカル威力をアップ(3T)。',effects:[{type:'cardUp',target:'selectedAlly',card:'quick',values:[30,32,34,36,38,40,42,44,46,50],duration:3},{type:'cardCritUp',target:'selectedAlly',card:'quick',values:[50,55,60,65,70,75,80,85,90,100],duration:3}]},{name:'真夏のアイス C',baseCt:9,target:'self',description:'味方全体の攻撃力、Quick、Buster性能をアップ(3T)。',effects:[{type:'attackUp',target:'allAllies',values:[10,11,12,13,14,15,16,17,18,20],duration:3},{type:'cardUp',target:'allAllies',card:'quick',values:[10,10.5,11,11.5,12,12.5,13,13.5,14,15],duration:3},{type:'cardUp',target:'allAllies',card:'buster',values:[10,10.5,11,11.5,12,12.5,13,13.5,14,15],duration:3}]},{name:'夏の夜更けに我想う A+',baseCt:9,target:'ally',description:'味方単体のNPを増やし、Busterスター集中度とクリティカル威力をアップ。',effects:[{type:'npCharge',target:'selectedAlly',values:[30,32,34,36,38,40,42,44,46,50]},{type:'cardStarWeightUp',target:'selectedAlly',card:'buster',value:5000,duration:3},{type:'cardCritUp',target:'selectedAlly',card:'buster',values:[50,55,60,65,70,75,80,85,90,100],duration:3}]}],passives:[{name:'対魔力 EX',icon:'class-magic-resistance.png',effects:[{type:'debuffResist',value:25}]},{name:'神性 A',icon:'class-divinity.png',effects:[{type:'damagePlus',value:200}]}],np:{id:'aegirGate',name:'命溢るる大海への門',reading:'ゲート・オブ・エーギル',card:'quick',target:'allEnemies',hits:6,multipliers:[600,800,900,950,1000],description:'敵全体に攻撃し、〔秩序〕特攻。チャージを減らす。',special:{kind:'trait',key:'秩序',ocMultipliers:[1.5,1.625,1.75,1.875,2]},after:[{type:'enemyChargeDown',target:'allEnemies',value:1}]},source:'https://w.atwiki.jp/f_go/pages/5698.html'},
      skadiCaster:{id:'skadiCaster',no:'215',name:'スカサハ＝スカディ',classId:'caster',rarity:5,maxLevel:90,maxHp:14406,atk:10753,levelStats:{max:{hp:14406,atk:10753},100:{hp:15775,atk:11774},120:{hp:18529,atk:13829}},attribute:'sky',traits:['サーヴァント','神性','人型','王','神霊','混沌','善'],cards:['quick','quick','arts','arts','buster'],hits:{quick:4,arts:3,buster:4,extra:5,np:0},na:.67,nd:3,starRate:10.8,starWeight:49,deathRate:30,skillIcons:['skill-quick-up.png','skill-defense-up.png','skill-np-charge.png'],skills:[{name:'原初のルーン',baseCt:8,target:'ally',description:'味方単体のQuick性能とQuickクリティカル威力をアップ(3T)。',effects:[{type:'cardUp',target:'selectedAlly',card:'quick',values:[30,32,34,36,38,40,42,44,46,50],duration:3},{type:'cardCritUp',target:'selectedAlly',card:'quick',values:[50,55,60,65,70,75,80,85,90,100],duration:3}]},{name:'凍える吹雪 B',baseCt:8,target:'enemy',description:'敵全体の防御力とクリティカル発生率をダウン(3T)。',effects:[{type:'defenseUp',target:'allEnemies',values:[-20,-21,-22,-23,-24,-25,-26,-27,-28,-30],duration:3,debuff:true}]},{name:'大神の叡智 B+',baseCt:8,target:'ally',description:'味方単体のNPを増やす。',effects:[{type:'npCharge',target:'selectedAlly',values:[30,32,34,36,38,40,42,44,46,50]}]}],passives:[{name:'陣地作成 EX',icon:'class-territory-creation.png',effects:[{type:'cardUp',card:'arts',value:12}]},{name:'道具作成 A',icon:'class-item-construction.png',effects:[{type:'debuffSuccess',value:10}]}],np:{id:'skyGate',name:'死溢るる魔境への門',reading:'ゲート・オブ・スカイ',card:'arts',target:'support',hits:0,multipliers:[0,0,0,0,0],description:'味方全体を強化し、回避・即死無効・ダメージカットを付与。',after:[{type:'attackUp',target:'allAllies',npLevelValues:[20,25,27.5,28.8,30],duration:5},{type:'critUp',target:'allAllies',npLevelValues:[50,75,87.5,93.8,100],duration:5,uses:3},{type:'evade',target:'allAllies',value:1,duration:3}]},source:'https://w.atwiki.jp/f_go/pages/3375.html'},
      juanaMadQueen:{id:'juanaMadQueen',no:'050',name:'フアナ狂女王',classId:'berserker',rarity:5,maxLevel:90,maxHp:12472,atk:11361,levelStats:{max:{hp:12472,atk:11361},100:{hp:13664,atk:12436},120:{hp:16058,atk:14598}},attribute:'man',traits:['サーヴァント','人型','女性','混沌','中庸','人の力','バーサーカー','騎乗','ヒト科','王'],cards:['quick','arts','buster','buster','buster'],hits:{quick:4,arts:4,buster:3,extra:5,np:6},na:.51,nd:5,starRate:4.9,starWeight:9,deathRate:56.8,skillIcons:['skill-buff-add.png','skill-attack-up.png','skill-np-per-turn.png'],skills:[{name:'二重召喚 B',baseCt:7,target:'self',description:'自身のNP獲得量をアップし、防御不利を打ち消す(3T)。',effects:[{type:'npGainUp',target:'self',values:[20,22,24,26,28,30,32,34,36,40],duration:3}]},{name:'幽閉されし狂女王 B',baseCt:7,target:'self',description:'自身のNPを増やし、攻撃力とスター発生率をアップ、必中を付与。',effects:[{type:'npCharge',target:'self',values:[10,11,12,13,14,15,16,17,18,20]},{type:'attackUp',target:'self',values:[10,11,12,13,14,15,16,17,18,20],duration:3},{type:'starRateUp',target:'self',values:[50,55,60,65,70,75,80,85,90,100],duration:3}]},{name:'王は我のみ A+',baseCt:9,target:'self',description:'自身に〔王〕特攻、毎ターンスター・NP獲得、NP増加。',effects:[{type:'traitPowerUp',target:'self',trait:'王',values:[30,32,34,36,38,40,42,44,46,50],duration:3},{type:'npCharge',target:'self',values:[20,21,22,23,24,25,26,27,28,30]}]}],passives:[{name:'狂化 E（A相当）',icon:'class-madness-enhancement.png',effects:[{type:'cardUp',card:'buster',value:10}]},{name:'気配遮断 C-',icon:'class-presence-concealment.png',effects:[{type:'starRateUp',value:5.5}]},{name:'騎乗 D',icon:'class-riding.png',effects:[{type:'cardUp',card:'quick',value:4}]}],np:{id:'coffinJuana',name:'驢馬担ぎし黒死の棺',reading:'コフィン・オブ・フアナ・ラ・ロカ',card:'quick',target:'allEnemies',hits:6,multipliers:[600,800,900,950,1000],description:'敵全体に攻撃。〔毒〕特攻、毒と蝕毒を付与。',special:{kind:'trait',key:'毒',ocMultipliers:[1.5,1.625,1.75,1.875,2]},after:[{type:'poison',target:'allEnemies',ocValues:[1000,1250,1500,1750,2000],duration:5,debuff:true}]},source:'https://w.atwiki.jp/siroi_human/pages/882.html'},
      aliceLiddell:{id:'aliceLiddell',no:"047'",name:'アリス・リデル',classId:'berserker',rarity:5,maxLevel:90,maxHp:11785,atk:12712,levelStats:{max:{hp:11785,atk:12712},100:{hp:12911,atk:13915},120:{hp:15174,atk:16334}},attribute:'beast',traits:['サーヴァント','人型','女性','混沌','善','獣の力','バーサーカー','領域外の生命','ヒト科以外','超巨大','人類の脅威','対人','イギリスゆかりの者','子供のサーヴァント'],cards:['quick','quick','arts','arts','buster'],hits:{quick:6,arts:4,buster:5,extra:6,np:5},na:.38,nd:5,starRate:4.9,starWeight:10,deathRate:39,skillIcons:['skill-arts-up.png','skill-special-attack.png','skill-np-charge.png'],skills:[{name:'不思議の国 B',baseCt:9,target:'self',description:'自身のQuick・Arts性能とNP獲得量をアップ(3T)。',effects:[{type:'cardUp',target:'self',card:'quick',values:[10,12,14,16,18,20,22,24,26,30],duration:3},{type:'cardUp',target:'self',card:'arts',values:[10,12,14,16,18,20,22,24,26,30],duration:3},{type:'npGainUp',target:'self',values:[10,11,12,13,14,15,16,17,18,20],duration:3}]},{name:'鏡の国 A++',baseCt:10,target:'enemy',description:'敵全体に〔チェック〕特性を付与し、自身に〔チェック〕特攻を付与。',effects:[{type:'addTrait',target:'allEnemies',trait:'チェック',value:1,duration:1,debuff:true},{type:'traitPowerUp',target:'self',trait:'チェック',values:[20,21,22,23,24,25,26,27,28,30],duration:3}]},{name:'物語は少女の為に C',baseCt:9,target:'self',description:'自身のNPを増やし、宝具威力をアップ。攻撃時に〔虚構概念〕特性を付与。',effects:[{type:'npCharge',target:'self',values:[30,32,34,36,38,40,42,44,46,50]},{type:'npPowerUp',target:'self',values:[10,12,14,16,18,20,22,24,26,30],duration:3},{type:'onAttackAddTrait',target:'self',trait:'虚構概念',chance:60,duration:3}]}],passives:[{name:'領域外の生命 EX',icon:'class-special-attack.png',effects:[{type:'debuffResist',value:12}]},{name:'夢見る少女の物語 C',icon:'class-no-effect.png',effects:[{type:'npPerTurn',value:5}]}],np:{id:'nurseryTale',name:'夢見る少女の物語',reading:'ナーサリー・テイル',card:'arts',target:'allEnemies',hits:5,multipliers:[450,600,675,712.5,750],description:'自身の宝具威力とNP獲得量をアップし、敵全体に〔虚構概念〕特攻攻撃。',before:[{type:'npPowerUp',target:'self',ocValues:[10,15,20,25,30],duration:3},{type:'npGainUp',target:'self',ocValues:[10,15,20,25,30],duration:3}],special:{kind:'trait',key:'虚構概念',multiplier:1.5}},source:'https://w.atwiki.jp/siroi_human/pages/820.html'}
    };

  Object.assign(DATA.servants, SERVANTS);

  if (typeof module !== 'undefined' && module.exports) module.exports = SERVANTS;
})(typeof window !== 'undefined' ? window : globalThis);
