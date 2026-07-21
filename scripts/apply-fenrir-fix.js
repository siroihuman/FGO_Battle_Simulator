'use strict';

const fs = require('fs');

const path = 'js/servants.js';
const source = fs.readFileSync(path, 'utf8');
const startMarker = '      fenrir: {';
const endMarker = '\n      artoriaCaster:';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error('fenrir definition boundary was not found.');
}
if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
  throw new Error('Multiple fenrir definitions were found.');
}

const replacement = `      fenrir: {
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
            description: \`自身に〔神性〕特攻状態を付与[Lv](3T)
＆クリティカル威力をアップ[Lv](3T)
＆スター発生率をアップ[Lv](3T)\`,
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
            description: \`自身のNPを増やす[Lv]
＆攻撃力をアップ[Lv](3T)
＆宝具使用時のチャージ段階を2段階引き上げる状態を付与(1回・3T)\`,
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
            description: \`自身のBusterカードのスター集中度をアップ[Lv](3T)
＆Busterカードのクリティカル威力をアップ[Lv](3T)
＆無敵貫通状態を付与(3T)
＋スターを大量獲得[Lv]\`,
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
          description: \`自身のBusterカード性能をアップ(1T)<OC:効果UP>
＋敵全体に強力な攻撃[Lv]
＆〔天の力を持つ敵〕特攻
＋自身のHPを減少〖デメリット〗\`,
          before: [
            { type: 'cardUp', target: 'self', card: 'buster', ocValues: [10, 20, 30, 40, 50], duration: 1 }
          ],
          special: { kind: 'attribute', key: 'sky', multiplier: 1.5 },
          after: [
            { type: 'hpLoss', target: 'self', value: 1000 }
          ]
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/329.html'
      },`;

const updated = source.slice(0, start) + replacement + source.slice(end);
if (updated === source) throw new Error('No Fenrir data change was produced.');
if (!updated.includes("120: { hp: 16112, atk: 16813 }")) throw new Error('Correct Lv.120 stats were not registered.');
if (!updated.includes("'叛逆する者', '炎'")) throw new Error('Required Fenrir traits were not registered.');
if (!updated.includes("{ type: 'hpLoss', target: 'self', value: 1000 }")) throw new Error('Lethal NP HP loss was not registered.');
if (updated.includes("{ type: 'hpLoss', target: 'self', value: 1000, nonLethal: true }")) throw new Error('Old non-lethal Fenrir NP HP loss remains.');

fs.writeFileSync(path, updated, 'utf8');
console.log('Updated fenrir definition only.');
