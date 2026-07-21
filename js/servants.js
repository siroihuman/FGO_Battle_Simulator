(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);

  if (!DATA) throw new Error('先に js/data.js を読み込んでください。');

  const levelValues = (values) => values;

  const SERVANTS = {
      inugamiGyobu: {
        id: 'inugamiGyobu',
        no: '002',
        name: '隠神刑部',
        classId: 'caster',
        rarity: 1,
        maxLevel: 60,
        maxHp: 7350,
        atk: 5273,
        levelStats: {
          max: { hp: 7350, atk: 5273 },
          100: { hp: 11330, atk: 8194 },
          120: { hp: 13324, atk: 9657 }
        },
        attribute: 'earth',
        traits: ['サーヴァント', '人型', '男性', '秩序', '善', '地の力', 'キャスター', '神性', 'ヒト科以外', 'ケモノ科', '魔獣型', '低レア'],
        cards: ['quick', 'arts', 'arts', 'arts', 'buster'],
        hits: { quick: 3, arts: 2, buster: 1, extra: 4, np: 3 },
        na: 0.49,
        nd: 3.00,
        starRate: 10.7,
        starWeight: 48,
        deathRate: 36.0,
        skillIcons: [
          'skill-np-charge.png',
          'skill-attack-up.png',
          'skill-arts-up.png'
        ],
        skills: [
          {
            id: 'languageUnderstanding',
            name: '言語理解 B',
            baseCt: 7,
            target: 'self',
            description: `自身のNPを増やす[Lv]
＋味方全体のNPを少し増やす`,
            effects: [
              { type: 'npCharge', target: 'self', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]) },
              { type: 'npCharge', target: 'allAllies', value: 10 }
            ]
          },
          {
            id: 'familiarSummoning',
            name: '眷属召喚 A+',
            baseCt: 7,
            target: 'self',
            description: `味方全体の攻撃力をアップ[Lv](3T)
＆Artsカード性能をアップ(3T)`,
            effects: [
              { type: 'attackUp', target: 'allAllies', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'cardUp', target: 'allAllies', card: 'arts', value: 20, duration: 3 }
            ]
          },
          {
            id: 'sorcery',
            name: '妖術 B+',
            baseCt: 7,
            target: 'ally',
            description: `自身のArtsカード性能をアップ[Lv](3T)
＋味方単体のNP獲得量をアップ[Lv](3T)
＆NPを少し増やす`,
            effects: [
              { type: 'cardUp', target: 'self', card: 'arts', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'npGainUp', target: 'selectedAlly', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'npCharge', target: 'selectedAlly', value: 10 }
            ]
          }
        ],
        passives: [
          { name: '陣地作成 B', icon: 'class-territory-creation.png', effects: [{ type: 'cardUp', card: 'arts', value: 8 }] },
          { name: '道具作成 B', icon: 'class-item-construction.png', effects: [{ type: 'debuffSuccess', value: 8 }] },
          { name: '神格 C', icon: 'class-divinity.png', effects: [{ type: 'damagePlus', value: 200 }, { type: 'starRateUp', value: 6 }] }
        ],
        np: {
          id: 'matsuyamaSodoHappyakuYadanukiMonogatari',
          name: '松山騒動八百八狸物語',
          reading: 'まつやまそうどうはっぴゃくやだぬきものがたり',
          card: 'arts',
          target: 'allEnemies',
          hits: 3,
          multipliers: [450, 600, 675, 712.5, 750],
          description: `味方全体の攻撃力をアップ(3T)<OC:効果UP>
＆Artsカード性能をアップ(3T)
＋敵全体に強力な攻撃[Lv]`,
          before: [
            { type: 'attackUp', target: 'allAllies', ocValues: [10, 15, 20, 25, 30], duration: 3 },
            { type: 'cardUp', target: 'allAllies', card: 'arts', value: 10, duration: 3 }
          ],
          after: []
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/262.html'
      },

      yaoyaOshichi: {
        id: 'yaoyaOshichi',
        no: '001',
        name: '八百屋お七',
        classId: 'assassin',
        rarity: 3,
        maxLevel: 70,
        maxHp: 8464,
        atk: 7161,
        levelStats: {
          max: { hp: 8464, atk: 7161 },
          100: { hp: 11476, atk: 9692 },
          120: { hp: 13489, atk: 11383 }
        },
        attribute: 'man',
        traits: ['サーヴァント', '人型', '女性', '混沌', '善', '人の力', 'ヒト科', '対人', '炎', '子供のサーヴァント'],
        cards: ['quick', 'quick', 'quick', 'arts', 'buster'],
        hits: { quick: 4, arts: 3, buster: 3, extra: 6, np: 7 },
        na: 0.71,
        nd: 4.00,
        starRate: 25.1,
        starWeight: 97,
        deathRate: 42.6,
        skillIcons: [
          'skill-quick-up.png',
          'skill-attack-up.png',
          'skill-evade.png'
        ],
        skills: [
          {
            id: 'departedSoulFirebird',
            name: '亡魂の化鶏 C+',
            baseCt: 8,
            target: 'self',
            description: `自身のQuickカード性能をアップ[Lv](3T)
＋味方全体の攻撃力をアップ[Lv](3T)
＆防御力をアップ[Lv](3T)
＆回避状態を付与(1回・3T)`,
            effects: [
              { type: 'cardUp', target: 'self', card: 'quick', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'attackUp', target: 'allAllies', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'defenseUp', target: 'allAllies', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'evade', target: 'allAllies', uses: 1, duration: 3 }
            ]
          },
          {
            id: 'loveSupport',
            name: '恋愛応援 B',
            baseCt: 7,
            target: 'ally',
            description: `味方単体の攻撃力をアップ[Lv](3T)
＆「通常攻撃時確率で魅了状態(1T)を付与する状態」を付与(3T)
＆魅了付与成功率をアップ[Lv](3T)`,
            effects: [
              { type: 'attackUp', target: 'selectedAlly', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              {
                type: 'onNormalAttackApplyDebuff',
                target: 'selectedAlly',
                debuffType: 'charm',
                chance: 50,
                debuffDuration: 1,
                duration: 3,
                normalCardsOnly: true
              },
              { type: 'charmSuccessUp', target: 'selectedAlly', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 }
            ]
          },
          {
            id: 'identityConcealment',
            name: '正体隠蔽 C',
            baseCt: 7,
            target: 'self',
            description: `自身に回避状態を付与(1T)
＆Quickカード性能をアップ[Lv](3T)
＆スター発生率をアップ[Lv](3T)`,
            effects: [
              { type: 'evade', target: 'self', duration: 1 },
              { type: 'cardUp', target: 'self', card: 'quick', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'starRateUp', target: 'self', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 }
            ]
          }
        ],
        passives: [
          { name: '気配遮断 C+', icon: 'class-presence-concealment.png', effects: [{ type: 'starRateUp', value: 6.5 }] }
        ],
        np: {
          id: 'hirenNoEnjomaku',
          name: '悲恋の炎上幕',
          reading: 'ひれんのえんじょうまく',
          card: 'quick',
          target: 'allEnemies',
          hits: 7,
          multipliers: [800, 1000, 1100, 1150, 1200],
          description: `敵全体に強力な〔愛する者〕特攻攻撃[Lv]<OC:特攻威力UP>
＆やけど状態を付与(5T)<OC:効果UP>
＆延焼状態を付与(5T)
＆クリティカル発生率をダウン(5T)`,
          before: [],
          special: { kind: 'trait', key: '愛する者', ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2] },
          after: [
            { type: 'burn', target: 'allEnemies', ocValues: [1000, 1250, 1500, 1750, 2000], duration: 5, debuff: true },
            { type: 'dotAmplify', target: 'allEnemies', dotType: 'burn', value: 100, duration: 5, debuff: true },
            { type: 'critRateDown', target: 'allEnemies', value: 20, duration: 5, debuff: true }
          ]
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/261.html'
      },

      koyanskayaLight: {
        id: 'koyanskayaLight',
        no: '314',
        name: '光のコヤンスカヤ',
        classId: 'assassin',
        rarity: 5,
        maxLevel: 90,
        maxHp: 13081,
        atk: 11616,
        levelStats: {
          max: { hp: 13081, atk: 11616 },
          100: { hp: 14333, atk: 12728 },
          120: { hp: 16851, atk: 14964 }
        },
        attribute: 'beast',
        traits: ['サーヴァント', '人型', '女性', '秩序', '悪', '獣の力', 'アサシン', '神性', '騎乗', '魔性', '魔獣型', '霊衣を持つ者', 'バニー系', 'ケモノ科'],
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
            description: `味方単体のNPを増やす[Lv]
＆スキルチャージを2進める
＋味方全体のHPを1000減らす【デメリット】`,
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
            description: `味方単体に〔人間〕特攻状態を付与[Lv](3T)
＆〔人の力を持つ敵〕特攻状態を付与[Lv](3T)
＆「Buster通常攻撃時に自身のNPを増やす状態」を付与[Lv](3T)
＋スターを獲得[Lv]`,
            effects: [
              { type: 'traitPowerUp', target: 'selectedAlly', trait: '人間', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
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
            description: `味方単体のBusterカード性能をアップ[Lv](3T)
＆Busterカードのクリティカル威力をアップ[Lv](3T)
＆Busterカードのスター集中度をアップ[Lv](3T)`,
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
          description: `自身の攻撃力をアップ(1T)
＋敵全体に強力な攻撃[Lv]
＆チャージを減らす
＋味方全体のNPを少し増やす<OC:効果UP>`,
          before: [{ type: 'attackUp', target: 'self', value: 20, duration: 1 }],
          after: [
            { type: 'enemyChargeDown', target: 'allEnemies', value: 1 },
            { type: 'npCharge', target: 'allAllies', ocValues: [10, 15, 20, 25, 30] }
          ]
        },
        source: 'https://w.atwiki.jp/f_go/pages/5141.html'
      },

      fenrir: {
        id: 'fenrir',
        no: '058',
        name: 'フェンリル',
        classId: 'berserker',
        rarity: 5,
        maxLevel: 90,
        maxHp: 12514,
        atk: 13085,
        levelStats: {
          max: { hp: 12514, atk: 13085 },
          100: { hp: 13710, atk: 14324 },
          120: { hp: 16112, atk: 16813 }
        },
        attribute: 'beast',
        traits: ['サーヴァント', '性別不明', '混沌', '獣の力', 'バーサーカー', '神性', 'ヒト科以外', 'ケモノ科', '魔獣型', '猛獣', '超巨大', '叛逆する者', '炎'],
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
            description: `自身に〔神性〕特攻状態を付与[Lv](3T)
＆クリティカル威力をアップ[Lv](3T)
＆スター発生率をアップ[Lv](3T)`,
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
            description: `自身のNPを増やす[Lv]
＆攻撃力をアップ[Lv](3T)
＆宝具使用時のチャージ段階を2段階引き上げる状態を付与(1回・3T)`,
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
            description: `自身のBusterカードのスター集中度をアップ[Lv](3T)
＆Busterカードのクリティカル威力をアップ[Lv](3T)
＆無敵貫通状態を付与(3T)
＋スターを大量獲得[Lv]`,
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
          description: `自身のBusterカード性能をアップ(1T)<OC:効果UP>
＋敵全体に強力な攻撃[Lv]
＆〔天の力を持つ敵〕特攻
＋自身のHPを減少〖デメリット〗`,
          before: [
            { type: 'cardUp', target: 'self', card: 'buster', ocValues: [10, 20, 30, 40, 50], duration: 1 }
          ],
          special: { kind: 'attribute', key: 'sky', multiplier: 1.5 },
          after: [
            { type: 'hpLoss', target: 'self', value: 1000 }
          ]
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/329.html'
      },
      artoriaCaster: {
        id: 'artoriaCaster',
        no: '284',
        name: 'アルトリア・キャスター',
        classId: 'caster',
        rarity: 5,
        maxLevel: 90,
        maxHp: 14406,
        atk: 10546,
        levelStats: {
          max: { hp: 14406, atk: 10546 },
          100: { hp: 15775, atk: 11548 },
          120: { hp: 18529, atk: 13564 }
        },
        attribute: 'star',
        traits: ['サーヴァント', '人型', '女性', '中立', '善', '星の力', 'キャスター', 'アルトリア顔', 'アーサー', 'エヌマ特攻無効', '円卓の騎士', '妖精'],
        cards: ['quick', 'arts', 'arts', 'arts', 'buster'],
        hits: { quick: 3, arts: 3, buster: 3, extra: 5, np: 0 },
        na: 0.54,
        nd: 3.00,
        starRate: 11.0,
        starWeight: 50,
        deathRate: 36.0,
        skillIcons: [
          'skill-attack-up.png',
          'skill-np-charge.png',
          'skill-arts-up.png'
        ],
        skills: [
          {
            id: 'charismaHope',
            name: '希望のカリスマ B',
            baseCt: 8,
            target: 'self',
            description: `味方全体の攻撃力をアップ[Lv](3T)
＆NPを増やす[Lv]`,
            effects: [
              { type: 'attackUp', target: 'allAllies', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'npCharge', target: 'allAllies', values: levelValues([20, 21, 22, 23, 24, 25, 26, 27, 28, 30]) }
            ]
          },
          {
            id: 'avalonFairy',
            name: 'アヴァロンの妖精 A',
            baseCt: 7,
            target: 'ally',
            description: `味方単体のNPを増やす[Lv]
＋味方全体のNP獲得量をアップ[Lv](3T)`,
            effects: [
              { type: 'npCharge', target: 'selectedAlly', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]) },
              { type: 'npGainUp', target: 'allAllies', values: levelValues([20, 21, 22, 23, 24, 25, 26, 27, 28, 30]), duration: 3 }
            ]
          },
          {
            id: 'holySwordCreation',
            name: '聖剣作成 EX',
            baseCt: 8,
            target: 'ally',
            description: `味方単体のArtsカード性能をアップ[Lv](3T)
＆〔人類の脅威〕特攻状態を付与[Lv](3T)
＆無敵状態を付与(1T)`,
            effects: [
              { type: 'cardUp', target: 'selectedAlly', card: 'arts', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'traitPowerUp', target: 'selectedAlly', trait: '人類の脅威', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'invincible', target: 'selectedAlly', value: 1, duration: 1 }
            ]
          }
        ],
        passives: [
          { name: '対魔力 A', icon: 'class-magic-resistance.png', effects: [{ type: 'debuffResist', value: 20 }] },
          { name: '陣地作成 EX', icon: 'class-territory-creation.png', effects: [{ type: 'cardUp', card: 'arts', value: 12 }] },
          { name: '独自魔術 B', icon: 'skill-crit-up.png', effects: [{ type: 'cardCritUp', card: 'arts', value: 10 }] },
          { name: '妖精眼 A', icon: 'class-magic-resistance.png', effects: [{ type: 'critRateResist', value: 20 }] }
        ],
        np: {
          id: 'aroundCaliburn',
          name: 'きみをいだく希望の星',
          reading: 'アラウンド・カリバーン',
          card: 'arts',
          target: 'support',
          hits: 0,
          multipliers: [0, 0, 0, 0, 0],
          description: `味方全体の攻撃力をアップ[Lv](3T)
＆弱体状態を解除
＆対粛正防御状態を付与(1回・3T)<OC:回数UP>`,
          before: [
            { type: 'attackUp', target: 'allAllies', npLevelValues: [30, 40, 45, 47.5, 50], duration: 3 },
            { type: 'debuffClear', target: 'allAllies' },
            { type: 'antiEnforcementDefense', target: 'allAllies', ocUses: [1, 2, 3, 4, 5], duration: 3 }
          ],
          after: []
        },
        source: 'https://w.atwiki.jp/f_go/pages/4719.html'
      },
      skadiRuler: {
        id: 'skadiRuler',
        no: '357',
        name: 'スカサハ＝スカディ〔ルーラー〕',
        classId: 'ruler',
        rarity: 5,
        maxLevel: 90,
        maxHp: 14850,
        atk: 10868,
        levelStats: {
          max: { hp: 14850, atk: 10868 },
          100: { hp: 16261, atk: 11898 },
          120: { hp: 19101, atk: 13976 }
        },
        attribute: 'sky',
        traits: ['サーヴァント', '人型', '女性', '混沌', '夏', '天の力', 'ルーラー', '神性', '王', '霊衣を持つ者', '神霊', '豚化無効', '夏モード'],
        cards: ['quick', 'quick', 'arts', 'buster', 'buster'],
        hits: { quick: 4, arts: 3, buster: 4, extra: 5, np: 6 },
        na: 0.78,
        nd: 3.00,
        starRate: 9.8,
        starWeight: 102,
        deathRate: 17.5,
        skillIcons: [
          'skill-quick-up.png',
          'skill-attack-up.png',
          'skill-np-charge.png'
        ],
        skills: [
          {
            id: 'primordialRuneMidsummer',
            name: '原初のルーン（盛夏） A',
            baseCt: 8,
            target: 'ally',
            description: `味方単体のQuickカード性能をアップ[Lv](3T)
＆Busterカードのクリティカル威力をアップ[Lv](3T)`,
            effects: [
              { type: 'cardUp', target: 'selectedAlly', card: 'quick', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'cardCritUp', target: 'selectedAlly', card: 'buster', values: levelValues([50, 55, 60, 65, 70, 75, 80, 85, 90, 100]), duration: 3 }
            ]
          },
          {
            id: 'midsummerIce',
            name: '真夏のアイス C',
            baseCt: 9,
            target: 'self',
            description: `味方全体の攻撃力をアップ[Lv](3T)
＆Quickカード性能をアップ[Lv](3T)
＆Busterカード性能をアップ[Lv](3T)
＋自身に毎ターンスター獲得状態を付与[Lv](3T)`,
            effects: [
              { type: 'attackUp', target: 'allAllies', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'cardUp', target: 'allAllies', card: 'quick', values: levelValues([10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15]), duration: 3 },
              { type: 'cardUp', target: 'allAllies', card: 'buster', values: levelValues([10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15]), duration: 3 },
              { type: 'starsPerTurn', target: 'self', values: levelValues([5, 6, 7, 8, 9, 10, 11, 12, 13, 15]), duration: 3 }
            ]
          },
          {
            id: 'summerNightReflection',
            name: '夏の夜更けに我想う A+',
            baseCt: 9,
            target: 'ally',
            description: `味方単体のNPを増やす[Lv]
＆Busterカードのスター集中度をアップ[Lv](1T)
＋スターを獲得[Lv]`,
            effects: [
              { type: 'npCharge', target: 'selectedAlly', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]) },
              { type: 'cardStarWeightUp', target: 'selectedAlly', card: 'buster', values: levelValues([3000, 3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600, 5000]), duration: 1 },
              { type: 'stars', target: 'party', values: levelValues([5, 6, 7, 8, 9, 10, 11, 12, 13, 15]) }
            ]
          }
        ],
        passives: [
          { name: '対魔力 EX', icon: 'class-magic-resistance.png', effects: [{ type: 'debuffResist', value: 25 }] },
          { name: '陣地作成 A', icon: 'class-territory-creation.png', effects: [{ type: 'cardUp', card: 'arts', value: 10 }] },
          { name: '女神の神核 A', icon: 'class-divinity.png', effects: [{ type: 'damagePlus', value: 250 }, { type: 'debuffResist', value: 25 }] }
        ],
        np: {
          id: 'aegirGate',
          name: '命溢るる大海への門',
          reading: 'ゲート・オブ・エーギル',
          card: 'quick',
          target: 'allEnemies',
          hits: 6,
          multipliers: [600, 800, 900, 950, 1000],
          description: `自身に〔水辺〕のあるフィールドにおいてのみ、宝具威力をアップ(1T)<OC:効果UP>
＋敵全体に強力な攻撃[Lv]
＆〔秩序〕特攻<OC:特攻威力アップ>
＆チャージを減らす`,
          before: [
            {
              type: 'npPowerUp',
              target: 'self',
              ocValues: [10, 15, 20, 25, 30],
              duration: 1,
              condition: { kind: 'fieldTrait', key: '水辺' }
            }
          ],
          special: { kind: 'trait', key: '秩序', ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2] },
          after: [
            { type: 'enemyChargeDown', target: 'allEnemies', value: 1 }
          ]
        },
        source: 'https://w.atwiki.jp/f_go/pages/5698.html'
      },
      skadiCaster: {
        id: 'skadiCaster',
        no: '215',
        name: 'スカサハ＝スカディ',
        classId: 'caster',
        rarity: 5,
        maxLevel: 90,
        maxHp: 14406,
        atk: 10753,
        levelStats: {
          max: { hp: 14406, atk: 10753 },
          100: { hp: 15775, atk: 11774 },
          120: { hp: 18529, atk: 13829 }
        },
        attribute: 'sky',
        traits: ['サーヴァント', '人型', '女性', '混沌', '善', '天の力', 'キャスター', '神性', '王', '神霊', '豚化無効'],
        cards: ['quick', 'quick', 'arts', 'arts', 'buster'],
        hits: { quick: 4, arts: 3, buster: 4, extra: 5, np: 0 },
        na: 0.67,
        nd: 3.00,
        starRate: 10.8,
        starWeight: 49,
        deathRate: 30.0,
        skillIcons: [
          'skill-quick-up.png',
          'skill-defense-up.png',
          'skill-np-charge.png'
        ],
        skills: [
          {
            id: 'primordialRune',
            name: '原初のルーン',
            baseCt: 8,
            target: 'ally',
            description: `味方単体のQuickカード性能をアップ[Lv](3T)
＆Quickカードのクリティカル威力をアップ[Lv](3T)`,
            effects: [
              { type: 'cardUp', target: 'selectedAlly', card: 'quick', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'cardCritUp', target: 'selectedAlly', card: 'quick', values: levelValues([50, 55, 60, 65, 70, 75, 80, 85, 90, 100]), duration: 3 }
            ]
          },
          {
            id: 'freezingBlizzard',
            name: '凍える吹雪 B',
            baseCt: 8,
            target: 'enemy',
            description: `敵全体の防御力をダウン[Lv](3T)
＆クリティカル発生率をダウン[Lv](3T)`,
            effects: [
              { type: 'defenseDown', target: 'allEnemies', values: levelValues([20, 21, 22, 23, 24, 25, 26, 27, 28, 30]), chance: 100, duration: 3, debuff: true },
              { type: 'critRateDown', target: 'allEnemies', values: levelValues([20, 21, 22, 23, 24, 25, 26, 27, 28, 30]), chance: 100, duration: 3, debuff: true }
            ]
          },
          {
            id: 'wisdomOfTheGreatGod',
            name: '大神の叡智 B+',
            baseCt: 8,
            target: 'ally',
            description: `味方単体のNPを増やす[Lv]`,
            effects: [
              { type: 'npCharge', target: 'selectedAlly', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]) }
            ]
          }
        ],
        passives: [
          { name: '陣地作成 EX', icon: 'class-territory-creation.png', effects: [{ type: 'cardUp', card: 'arts', value: 12 }] },
          { name: '道具作成 A', icon: 'class-item-construction.png', effects: [{ type: 'debuffSuccess', value: 10 }] },
          { name: '女神の神核 A', icon: 'class-divinity.png', effects: [{ type: 'damagePlus', value: 250 }, { type: 'debuffResist', value: 25 }] }
        ],
        np: {
          id: 'skyGate',
          name: '死溢るる魔境への門',
          reading: 'ゲート・オブ・スカイ',
          card: 'arts',
          target: 'support',
          hits: 0,
          multipliers: [0, 0, 0, 0, 0],
          description: `味方全体の攻撃力をアップ[Lv](5T)
＆クリティカル威力をアップ[Lv](3回・5T)
＆回避状態を付与(1回・3T)
＆即死無効状態を付与(1回・3T)
＆被ダメージカット状態を付与(3T)<OC:効果UP>`,
          before: [
            { type: 'attackUp', target: 'allAllies', npLevelValues: [20, 25, 27.5, 28.8, 30], duration: 5 },
            { type: 'critUp', target: 'allAllies', npLevelValues: [50, 75, 87.5, 93.8, 100], uses: 3, duration: 5 },
            { type: 'evade', target: 'allAllies', uses: 1, duration: 3 },
            { type: 'instantDeathImmune', target: 'allAllies', uses: 1, duration: 3 },
            { type: 'damageCut', target: 'allAllies', ocValues: [500, 750, 1000, 1250, 1500], duration: 3 }
          ],
          after: []
        },
        source: 'https://w.atwiki.jp/f_go/pages/3375.html'
      },
      juanaMadQueen: {
        id: 'juanaMadQueen',
        no: '050',
        name: 'フアナ狂女王',
        classId: 'berserker',
        rarity: 5,
        maxLevel: 90,
        maxHp: 12472,
        atk: 11361,
        levelStats: {
          max: { hp: 12472, atk: 11361 },
          100: { hp: 13664, atk: 12436 },
          120: { hp: 16058, atk: 14598 }
        },
        attribute: 'man',
        traits: ['サーヴァント', '人型', '女性', '混沌', '中庸', '人の力', 'バーサーカー', '騎乗', 'ヒト科', '王'],
        cards: ['quick', 'arts', 'buster', 'buster', 'buster'],
        hits: { quick: 4, arts: 4, buster: 3, extra: 5, np: 6 },
        na: 0.51,
        nd: 5.00,
        starRate: 4.9,
        starWeight: 9,
        deathRate: 56.8,
        skillIcons: [
          'skill-buff-add.png',
          'skill-attack-up.png',
          'skill-np-per-turn.png'
        ],
        skills: [
          {
            id: 'doubleSummon',
            name: '二重召喚 B',
            baseCt: 7,
            target: 'self',
            description: `自身のNP獲得量をアップ[Lv](3T)
＆クラス相性の防御不利を打ち消す状態を付与(3T)`,
            effects: [
              { type: 'npGainUp', target: 'self', values: levelValues([20, 22, 24, 26, 28, 30, 32, 34, 36, 40]), duration: 3 },
              { type: 'defenseClassDisadvantageNullify', target: 'self', duration: 3 }
            ]
          },
          {
            id: 'confinedMadQueen',
            name: '幽閉されし狂女王 B',
            baseCt: 7,
            target: 'self',
            description: `自身のNPを増やす[Lv]
＆攻撃力をアップ[Lv](3T)
＆スター発生率をアップ[Lv](3T)
＆必中状態を付与(3T)`,
            effects: [
              { type: 'npCharge', target: 'self', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]) },
              { type: 'attackUp', target: 'self', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'starRateUp', target: 'self', values: levelValues([50, 55, 60, 65, 70, 75, 80, 85, 90, 100]), duration: 3 },
              { type: 'sureHit', target: 'self', duration: 3 }
            ]
          },
          {
            id: 'onlyIAmKing',
            name: '王は我のみ A+',
            baseCt: 9,
            target: 'self',
            description: `自身に〔王〕特攻状態を付与[Lv](3T)
＆毎ターンスター獲得状態を付与[Lv](3T)
＆毎ターンNP獲得状態を付与[Lv](3T)
＆NPを増やす[Lv]`,
            effects: [
              { type: 'traitPowerUp', target: 'self', trait: '王', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'starsPerTurn', target: 'self', values: levelValues([15, 17, 18, 20, 21, 23, 24, 26, 27, 30]), duration: 3 },
              { type: 'npPerTurn', target: 'self', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              { type: 'npCharge', target: 'self', values: levelValues([20, 21, 22, 23, 24, 25, 26, 27, 28, 30]) }
            ]
          }
        ],
        passives: [
          {
            name: '狂化 E（A相当）',
            icon: 'class-madness-enhancement.png',
            effects: [{ type: 'cardUp', card: 'buster', value: 10 }]
          },
          {
            name: '気配遮断 C-',
            icon: 'class-presence-concealment.png',
            effects: [{ type: 'starRateUp', value: 5.5 }]
          },
          {
            name: '騎乗 D',
            icon: 'class-riding.png',
            effects: [{ type: 'cardUp', card: 'quick', value: 4 }]
          },
          {
            name: '王の棺 A',
            icon: 'class-special-attack.png',
            effects: [
              { type: 'traitPowerUp', trait: '王', value: 20 },
              {
                type: 'triggerEffect',
                target: 'self',
                event: 'afterAttack',
                condition: { kind: 'targetHasTrait', key: '王' },
                effects: [
                  { type: 'poison', target: 'attackedEnemy', value: 500, duration: 5, debuff: true, chance: 100 },
                  { type: 'dotAmplify', target: 'attackedEnemy', dotType: 'poison', value: 100, duration: 5, debuff: true, chance: 100 }
                ],
                label: '王への攻撃時に毒・蝕毒付与'
              }
            ]
          }
        ],
        np: {
          id: 'coffinJuana',
          name: '驢馬担ぎし黒死の棺',
          reading: 'コフィン・オブ・フアナ・ラ・ロカ',
          card: 'quick',
          target: 'allEnemies',
          hits: 6,
          multipliers: [600, 800, 900, 950, 1000],
          description: `敵全体に強力な攻撃[Lv]
＆〔毒〕状態特攻<OC:特攻威力UP>
＆毒状態を付与(5T)<OC:効果UP>
＆蝕毒状態を付与(5T)`,
          before: [],
          special: {
            kind: 'status',
            key: 'poison',
            ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2.0]
          },
          after: [
            { type: 'poison', target: 'allEnemies', ocValues: [1000, 1250, 1500, 1750, 2000], duration: 5, debuff: true, chance: 100 },
            { type: 'dotAmplify', target: 'allEnemies', dotType: 'poison', value: 100, duration: 5, debuff: true, chance: 100 }
          ]
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/882.html'
      },
      aliceLiddell: {
        id: 'aliceLiddell',
        no: "047'",
        name: 'アリス・リデル',
        classId: 'berserker',
        rarity: 5,
        maxLevel: 90,
        maxHp: 11785,
        atk: 12712,
        levelStats: {
          max: { hp: 11785, atk: 12712 },
          100: { hp: 12911, atk: 13915 },
          120: { hp: 15174, atk: 16334 }
        },
        attribute: 'beast',
        traits: ['サーヴァント', '人型', '女性', '混沌', '善', '獣の力', 'バーサーカー', '領域外の生命', 'ヒト科以外', '超巨大', '人類の脅威', '対人', 'イギリスゆかりの者', '子供のサーヴァント'],
        cards: ['quick', 'quick', 'arts', 'arts', 'buster'],
        hits: { quick: 6, arts: 4, buster: 5, extra: 6, np: 5 },
        na: 0.38,
        nd: 5.00,
        starRate: 4.9,
        starWeight: 10,
        deathRate: 39.0,
        skillIcons: [
          'skill-arts-up.png',
          'skill-special-attack.png',
          'skill-np-charge.png'
        ],
        skills: [
          {
            id: 'wonderland',
            name: '不思議の国 B',
            baseCt: 9,
            target: 'self',
            description: `自身のQuickカード性能をアップ[Lv](3T)
＆Artsカード性能をアップ[Lv](3T)
＆NP獲得量をアップ[Lv](3T)
＋〔不思議の国の住人〕状態の味方全体のNPを増やす[Lv]`,
            effects: [
              { type: 'cardUp', target: 'self', card: 'quick', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]), duration: 3 },
              { type: 'cardUp', target: 'self', card: 'arts', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]), duration: 3 },
              { type: 'npGainUp', target: 'self', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
              {
                type: 'npCharge',
                target: 'allAllies',
                values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]),
                condition: { kind: 'targetHasTrait', key: '不思議の国の住人' }
              }
            ]
          },
          {
            id: 'lookingGlassCountry',
            name: '鏡の国 A++',
            baseCt: 10,
            target: 'self',
            description: `敵全体に〔チェック〕状態を付与(1T)
＋自身に〔チェック〕特攻状態を付与[Lv](3T)
＆「〔チェック〕攻撃時、自身に〔チェックメイト〕状態を付与(3T)する状態」を付与(3T)
＆「ターン開始時に敵全体に〔チェック〕状態を付与(1T)する状態」を付与(2回)
＆「3ターン後に自身の〔チェックメイト〕状態の数に応じて〔赤のチェスピース〕特攻状態を付与[Lv](3T)し、敵全体に〔赤のチェスピース〕状態を付与(3T)する状態」を付与(1回)`,
            effects: [
              { type: 'temporaryTrait', target: 'allEnemies', trait: 'チェック', duration: 1, debuff: true, chance: 100 },
              { type: 'traitPowerUp', target: 'self', trait: 'チェック', values: levelValues([20, 21, 22, 23, 24, 25, 26, 27, 28, 30]), duration: 3 },
              {
                type: 'triggerEffect',
                target: 'self',
                event: 'afterAttack',
                duration: 3,
                condition: { kind: 'targetHasTrait', key: 'チェック' },
                effect: { type: 'temporaryTrait', target: 'self', trait: 'チェックメイト', duration: 3 },
                label: 'チェック攻撃時チェックメイト付与'
              },
              {
                type: 'triggerEffect',
                target: 'self',
                event: 'turnStart',
                uses: 2,
                duration: 3,
                effect: { type: 'temporaryTrait', target: 'allEnemies', trait: 'チェック', duration: 1, debuff: true, chance: 100 },
                label: 'ターン開始時チェック付与'
              },
              {
                type: 'delayedEffect',
                target: 'self',
                values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]),
                delayTurns: 3,
                triggerEvent: 'turnEnd',
                resolver: 'aliceLiddellRedChessResolver',
                label: '赤のチェスピース展開'
              }
            ]
          },
          {
            id: 'storyForTheGirl',
            name: '物語は少女の為に C',
            baseCt: 9,
            target: 'self',
            description: `自身のNPを増やす[Lv]
＆宝具威力をアップ[Lv](3T)
＆「攻撃時のダメージ前に確率で対象に〔虚構概念〕特性(1T)を付与する状態」を付与(3T)
＋自身を除く味方全体に〔不思議の国の住人〕状態を付与(1T)`,
            effects: [
              { type: 'npCharge', target: 'self', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]) },
              { type: 'npPowerUp', target: 'self', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]), duration: 3 },
              { type: 'beforeAttackApplyTemporaryTrait', target: 'self', trait: '虚構概念', chance: 60, duration: 1, sourceDuration: 3 },
              { type: 'temporaryTrait', target: 'allOtherAllies', trait: '不思議の国の住人', duration: 1 }
            ]
          }
        ],
        passives: [
          { name: '狂化 EX（-相当）', icon: 'class-madness-enhancement.png', effects: [] },
          {
            name: '領域外の生命 EX',
            icon: 'class-special-attack.png',
            effects: [
              { type: 'starsPerTurn', value: 2 },
              { type: 'debuffResist', value: 12 }
            ]
          },
          {
            name: '夢見る少女の物語 C',
            icon: 'class-no-effect.png',
            effects: [
              { type: 'npPerTurn', value: 5 },
              {
                type: 'aura',
                modifierType: 'attackUp',
                target: 'allEnemies',
                value: -15,
                condition: { kind: 'targetHasTrait', key: '虚構概念' }
              },
              {
                type: 'aura',
                modifierType: 'npGainUp',
                target: 'allAllies',
                value: 15,
                condition: { kind: 'targetHasTrait', key: '虚構概念' },
                conditionTarget: 'attackTarget'
              },
              {
                type: 'aura',
                modifierType: 'debuffResist',
                target: 'allOtherAlliesIncludingReserve',
                value: -15
              }
            ]
          }
        ],
        np: {
          id: 'nurseryTale',
          name: '夢見る少女の物語',
          reading: 'ナーサリー・テイル',
          card: 'arts',
          target: 'allEnemies',
          hits: 5,
          multipliers: [450, 600, 675, 712.5, 750],
          description: `自身の宝具威力をアップ(3T)<OC:効果UP>
＆NP獲得量をアップ(3T)<OC:効果UP>
＋敵全体に強力な攻撃[Lv]
＆〔虚構概念〕特攻`,
          before: [
            { type: 'npPowerUp', target: 'self', ocValues: [10, 15, 20, 25, 30], duration: 3 },
            { type: 'npGainUp', target: 'self', ocValues: [10, 15, 20, 25, 30], duration: 3 }
          ],
          special: { kind: 'trait', key: '虚構概念', multiplier: 1.5 },
          after: []
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/820.html'
      },

      lucifera: {
        id: 'lucifera',
        no: '062',
        name: 'ルシフェラ',
        classId: 'rider',
        rarity: 5,
        maxLevel: 90,
        maxHp: 13269,
        atk: 10867,
        levelStats: {
max: { hp: 13269, atk: 10867 },
100: { hp: 14537, atk: 11896 },
120: { hp: 17084, atk: 13963 }
        },
        attribute: 'earth',
        traits: ['サーヴァント', '人型', '女性', '秩序', '悪', '地の力', 'ライダー', '騎乗', '神性', 'ヒト科', '猛獣', 'イギリスゆかりの者'],
        cards: ['quick', 'arts', 'arts', 'buster', 'buster'],
        hits: { quick: 4, arts: 3, buster: 3, extra: 6, np: 5 },
        na: 0.59,
        nd: 3.00,
        starRate: 8.8,
        starWeight: 200,
        deathRate: 30.0,
        skillIcons: [
'skill-attack-up.png',
'skill-np-charge.png',
'skill-np-charge.png'
        ],
        skills: [
{
  id: 'familiarSixSins',
  name: '使い魔（六罪） A++',
  baseCt: 9,
  target: 'ally',
  description: `味方全体のBusterカード性能をアップ[Lv](3T)
＆攻撃力をアップ[Lv](3T)
＋味方単体の宝具カードのタイプをBusterに切り替える(1T)
＆「宝具使用時に自身のスキルチャージを1進める
＆クリティカル威力をアップ[Lv](3T)
＋スターを獲得[Lv]する状態」を付与(1回・1T)`,
  effects: [
    { type: 'cardUp', target: 'allAllies', card: 'buster', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]), duration: 3 },
    { type: 'attackUp', target: 'allAllies', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]), duration: 3 },
    { type: 'npCardTypeChange', target: 'selectedAlly', card: 'buster', duration: 1 },
    {
      type: 'triggerEffect',
      target: 'selectedAlly',
      event: 'afterNp',
      uses: 1,
      duration: 1,
      effects: [
        { type: 'cooldownReduce', target: 'self', value: 1 },
        { type: 'critUp', target: 'self', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]), duration: 3 },
        { type: 'stars', target: 'party', values: levelValues([5, 6, 7, 8, 9, 10, 11, 12, 13, 15]) }
      ],
      label: '宝具使用時CT短縮・クリティカル威力アップ・スター獲得'
    }
  ]
},
{
  id: 'wheelOfOriginalSin',
  name: '罪源業車 A++',
  baseCt: 9,
  target: 'ally',
  description: `味方全体のNPを増やす[Lv]
＋味方単体のNPを増やす[Lv]
＋自身のNPを少し増やす`,
  effects: [
    { type: 'npCharge', target: 'allAllies', values: levelValues([20, 21, 22, 23, 24, 25, 26, 27, 28, 30]) },
    { type: 'npCharge', target: 'selectedAlly', values: levelValues([10, 11, 12, 13, 14, 15, 16, 17, 18, 20]) },
    { type: 'npCharge', target: 'self', value: 10 }
  ]
},
{
  id: 'queenOfVainglory',
  name: '虚栄の女王 A+',
  baseCt: 10,
  target: 'ally',
  description: `〔悪〕特性の味方全体のスキルチャージを1進める
＋味方単体のNPを倍化する[Lv]
＆「ターン終了時に自身の強化状態を解除する状態」を付与【デメリット】`,
  effects: [
    {
      type: 'cooldownReduce',
      target: 'allAllies',
      value: 1,
      targetCondition: { kind: 'targetHasTrait', key: '悪' }
    },
    { type: 'npScaleUp', target: 'selectedAlly', values: levelValues([50, 55, 60, 65, 70, 75, 80, 85, 90, 100]) },
    {
      type: 'triggerEffect',
      target: 'selectedAlly',
      event: 'turnEnd',
      uses: 1,
      duration: 1,
      effect: { type: 'buffClear', target: 'self' },
      label: 'ターン終了時強化解除'
    }
  ]
}
        ],
        passives: [
{ name: '対魔力 B', icon: 'class-magic-resistance.png', effects: [{ type: 'debuffResist', value: 17.5 }] },
{
  name: '竜種騎乗 A',
  icon: 'class-riding.png',
  effects: [
    { type: 'cardUp', card: 'quick', value: 10 },
    { type: 'critUp', value: 10 }
  ]
},
{ name: '神性 B', icon: 'class-divinity.png', effects: [{ type: 'damagePlus', value: 175 }] }
        ],
        np: {
id: 'septemPeccataMortalia',
name: '高き館の女皇',
reading: 'セプテム・ペッカータ・モルターリア',
card: 'buster',
target: 'allEnemies',
hits: 5,
multipliers: [300, 400, 450, 475, 500],
description: `敵全体に〔悪〕特性を付与(3T)
＆強力な攻撃[Lv]
＆〔悪〕特攻<OC:特攻威力UP>
＋自身を除く味方全体に〔悪〕特性を付与(3T)
＋味方全体の強化解除耐性をアップ(1回・3T)`,
before: [
  { type: 'temporaryTrait', target: 'allEnemies', trait: '悪', duration: 3, debuff: true, chance: 100 }
],
special: {
  kind: 'trait',
  key: '悪',
  ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
},
after: [
  { type: 'temporaryTrait', target: 'allOtherAllies', trait: '悪', duration: 3 },
  { type: 'buffRemovalResist', target: 'allAllies', value: 100, uses: 1, duration: 3 }
]
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/795.html'
      }
    };

  Object.assign(DATA.servants, SERVANTS);

  if (typeof module !== 'undefined' && module.exports) module.exports = SERVANTS;
})(typeof window !== 'undefined' ? window : globalThis);
