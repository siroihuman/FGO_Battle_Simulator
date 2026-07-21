'use strict';

const fs = require('fs');

const path = 'js/servants.js';
const source = fs.readFileSync(path, 'utf8');
const startMarker = '      aliceLiddell:{';
const endMarker = '\n    };';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error('aliceLiddell definition boundary was not found.');
}
if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
  throw new Error('Multiple aliceLiddell definitions were found.');
}

const replacement = `      aliceLiddell: {
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
            description: \`自身のQuickカード性能をアップ[Lv](3T)
＆Artsカード性能をアップ[Lv](3T)
＆NP獲得量をアップ[Lv](3T)
＋〔不思議の国の住人〕状態の味方全体のNPを増やす[Lv]\`,
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
            description: \`敵全体に〔チェック〕状態を付与(1T)
＋自身に〔チェック〕特攻状態を付与[Lv](3T)
＆「〔チェック〕攻撃時、自身に〔チェックメイト〕状態を付与(3T)する状態」を付与(3T)
＆「ターン開始時に敵全体に〔チェック〕状態を付与(1T)する状態」を付与(2回)
＆「3ターン後に自身の〔チェックメイト〕状態の数に応じて〔赤のチェスピース〕特攻状態を付与[Lv](3T)し、敵全体に〔赤のチェスピース〕状態を付与(3T)する状態」を付与(1回)\`,
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
            description: \`自身のNPを増やす[Lv]
＆宝具威力をアップ[Lv](3T)
＆「攻撃時のダメージ前に確率で対象に〔虚構概念〕特性(1T)を付与する状態」を付与(3T)
＋自身を除く味方全体に〔不思議の国の住人〕状態を付与(1T)\`,
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
          description: \`自身の宝具威力をアップ(3T)<OC:効果UP>
＆NP獲得量をアップ(3T)<OC:効果UP>
＋敵全体に強力な攻撃[Lv]
＆〔虚構概念〕特攻\`,
          before: [
            { type: 'npPowerUp', target: 'self', ocValues: [10, 15, 20, 25, 30], duration: 3 },
            { type: 'npGainUp', target: 'self', ocValues: [10, 15, 20, 25, 30], duration: 3 }
          ],
          special: { kind: 'trait', key: '虚構概念', multiplier: 1.5 },
          after: []
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/820.html'
      }`;

const updated = source.slice(0, start) + replacement + source.slice(end);
if (updated === source) throw new Error('No Alice Liddell data change was produced.');
if (!updated.includes("id: 'lookingGlassCountry'")) throw new Error('Enhanced Looking-Glass Country was not registered.');
if (!updated.includes("resolver: 'aliceLiddellRedChessResolver'")) throw new Error('Alice delayed resolver was not registered.');
if (!updated.includes("modifierType: 'npGainUp'")) throw new Error('Alice conditional NP gain aura was not registered.');
if (updated.includes('onAttackAddTrait')) throw new Error('Old post-attack permanent trait effect remains.');

fs.writeFileSync(path, updated, 'utf8');
console.log('Updated aliceLiddell definition only.');
