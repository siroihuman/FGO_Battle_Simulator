'use strict';

const fs = require('fs');

const path = 'js/servants.js';
const source = fs.readFileSync(path, 'utf8');
const startMarker = '      skadiCaster:';
const endMarker = '\n      juanaMadQueen:';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error('skadiCaster definition boundary was not found.');
}
if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
  throw new Error('Multiple skadiCaster definitions were found.');
}

const replacement = `      skadiCaster: {
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
            description: \`味方単体のQuickカード性能をアップ[Lv](3T)
＆Quickカードのクリティカル威力をアップ[Lv](3T)\`,
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
            description: \`敵全体の防御力をダウン[Lv](3T)
＆クリティカル発生率をダウン[Lv](3T)\`,
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
            description: \`味方単体のNPを増やす[Lv]\`,
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
          description: \`味方全体の攻撃力をアップ[Lv](5T)
＆クリティカル威力をアップ[Lv](3回・5T)
＆回避状態を付与(1回・3T)
＆即死無効状態を付与(1回・3T)
＆被ダメージカット状態を付与(3T)<OC:効果UP>\`,
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
      },`;

const updated = source.slice(0, start) + replacement + source.slice(end);
if (updated === source) throw new Error('No servant data change was produced.');
if (!updated.includes("type: 'instantDeathImmune'")) throw new Error('Instant death immunity was not registered.');
if (!updated.includes("type: 'damageCut'")) throw new Error('Damage cut was not registered.');
if (!updated.includes("name: '女神の神核 A'")) throw new Error('Goddess core passive was not registered.');

fs.writeFileSync(path, updated, 'utf8');
console.log('Updated skadiCaster definition only.');
