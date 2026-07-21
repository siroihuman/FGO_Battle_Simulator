'use strict';

const fs = require('fs');

const path = 'js/servants.js';
const source = fs.readFileSync(path, 'utf8');
const startMarker = '      juanaMadQueen:{';
const endMarker = '\n      aliceLiddell:';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error('juanaMadQueen definition boundary was not found.');
}
if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
  throw new Error('Multiple juanaMadQueen definitions were found.');
}

const replacement = `      juanaMadQueen: {
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
            description: \`自身のNP獲得量をアップ[Lv](3T)
＆クラス相性の防御不利を打ち消す状態を付与(3T)\`,
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
            description: \`自身のNPを増やす[Lv]
＆攻撃力をアップ[Lv](3T)
＆スター発生率をアップ[Lv](3T)
＆必中状態を付与(3T)\`,
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
            description: \`自身に〔王〕特攻状態を付与[Lv](3T)
＆毎ターンスター獲得状態を付与[Lv](3T)
＆毎ターンNP獲得状態を付与[Lv](3T)
＆NPを増やす[Lv]\`,
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
          description: \`敵全体に強力な攻撃[Lv]
＆〔毒〕状態特攻<OC:特攻威力UP>
＆毒状態を付与(5T)<OC:効果UP>
＆蝕毒状態を付与(5T)\`,
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
      },`;

const updated = source.slice(0, start) + replacement + source.slice(end);
if (updated === source) throw new Error('No Juana servant data change was produced.');
if (!updated.includes("id: 'doubleSummon'")) throw new Error('Juana skill IDs were not registered.');
if (!updated.includes("type: 'defenseClassDisadvantageNullify'")) throw new Error('Defense disadvantage nullification was not registered.');
if (!updated.includes("name: '王の棺 A'")) throw new Error('King Coffin passive was not registered.');
if (!updated.includes("kind: 'status'")) throw new Error('Status-based NP special attack was not registered.');

fs.writeFileSync(path, updated, 'utf8');
console.log('Updated juanaMadQueen definition only.');
