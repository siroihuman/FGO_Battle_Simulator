'use strict';

const fs = require('fs');

const path = 'js/servants.js';
const source = fs.readFileSync(path, 'utf8');
const startMarker = '      artoriaCaster: {';
const endMarker = '\n      skadiRuler:';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error('artoriaCaster definition boundary was not found.');
}
if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
  throw new Error('Multiple artoriaCaster definitions were found.');
}

const replacement = `      artoriaCaster: {
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
            description: \`味方全体の攻撃力をアップ[Lv](3T)
＆NPを増やす[Lv]\`,
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
            description: \`味方単体のNPを増やす[Lv]
＋味方全体のNP獲得量をアップ[Lv](3T)\`,
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
            description: \`味方単体のArtsカード性能をアップ[Lv](3T)
＆〔人類の脅威〕特攻状態を付与[Lv](3T)
＆無敵状態を付与(1T)\`,
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
          description: \`味方全体の攻撃力をアップ[Lv](3T)
＆弱体状態を解除
＆対粛正防御状態を付与(1回・3T)<OC:回数UP>\`,
          before: [
            { type: 'attackUp', target: 'allAllies', npLevelValues: [30, 40, 45, 47.5, 50], duration: 3 },
            { type: 'debuffClear', target: 'allAllies' },
            { type: 'antiEnforcementDefense', target: 'allAllies', ocUses: [1, 2, 3, 4, 5], duration: 3 }
          ],
          after: []
        },
        source: 'https://w.atwiki.jp/f_go/pages/4719.html'
      },`;

const updated = source.slice(0, start) + replacement + source.slice(end);
if (updated === source) throw new Error('No servant data change was produced.');
if (!updated.includes("type: 'antiEnforcementDefense'")) throw new Error('Anti-enforcement defense was not registered.');
if (!updated.includes("name: '妖精眼 A'")) throw new Error('Fairy Eyes passive was not registered.');

fs.writeFileSync(path, updated, 'utf8');
console.log('Updated artoriaCaster definition only.');
