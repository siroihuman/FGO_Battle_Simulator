'use strict';

const fs = require('fs');

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Expected marker not found: ${path}`);
  fs.writeFileSync(path, source.replace(before, after));
}

const servantPath = 'js/servants.js';
const servantSource = fs.readFileSync(servantPath, 'utf8');
if (!servantSource.includes("      baphomet: {")) {
  const marker = "        source: 'https://w.atwiki.jp/siroi_human/pages/795.html'\n      }\n    };";
  const block = `        source: 'https://w.atwiki.jp/siroi_human/pages/795.html'
      },
      baphomet: {
        id: 'baphomet',
        no: '084',
        name: 'バフォメット',
        classId: 'beast',
        rarity: 5,
        maxLevel: 90,
        maxHp: 12964,
        atk: 12774,
        levelStats: {
          max: { hp: 12964, atk: 12774 },
          100: { hp: 14203, atk: 13983 },
          120: { hp: 16692, atk: 16413 }
        },
        attribute: 'beast',
        traits: [
          'サーヴァント', '性別不明', '秩序', '悪', '獣の力', 'ビースト', '神性',
          'ヒト科以外', 'ケモノ科', '魔獣型', '悪魔', '人類の脅威', '対人', 'エヌマ特攻無効'
        ],
        cards: ['quick', 'arts', 'arts', 'arts', 'buster'],
        hits: { quick: 5, arts: 6, buster: 5, extra: 7, np: 7 },
        na: 0.25,
        nd: 3.00,
        starRate: 10.0,
        starWeight: 145,
        deathRate: 0.5,
        skillIcons: [
          'skill-general-003.png',
          'skill-general-010.png',
          'skill-unique-022.png'
        ],
        skills: [
          {
            id: 'innocentMonsterGoat',
            name: '無辜の怪物（山羊） EX',
            baseCt: 9,
            target: 'ally',
            description: \`味方単体のArtsカード性能をアップ[Lv](3T)
＆Artsカードのクリティカル威力をアップ[Lv](3T)
＆Artsカードのスター集中度をアップ[Lv](3T)
＋〔怨嗟の崇拝者〕特性の味方全体のArtsカード性能をアップ(3T)
＆毎ターンスター獲得状態を付与(3T)\`,
            effects: [
              { type: 'cardUp', target: 'selectedAlly', card: 'arts', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'cardCritUp', target: 'selectedAlly', card: 'arts', values: levelValues([30, 32, 34, 36, 38, 40, 42, 44, 46, 50]), duration: 3 },
              { type: 'cardStarWeightUp', target: 'selectedAlly', card: 'arts', values: levelValues([3000, 3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600, 5000]), duration: 3 },
              {
                type: 'cardUp',
                target: 'allAllies',
                card: 'arts',
                value: 30,
                duration: 3,
                targetCondition: { kind: 'targetHasTrait', key: '怨嗟の崇拝者' }
              },
              {
                type: 'starsPerTurn',
                target: 'allAllies',
                value: 15,
                duration: 3,
                targetCondition: { kind: 'targetHasTrait', key: '怨嗟の崇拝者' }
              }
            ]
          },
          {
            id: 'dissolveAndIntegrate',
            name: '解体して統合せよ A++',
            baseCt: 10,
            target: 'self',
            description: \`自身を除く味方全体のNPを増やす[Lv]
＋自身のNPをすごく増やす[Lv]
＆「自身がフィールドにいる間、ターン終了時自身を除く味方全体の〔怨嗟の崇拝者〕のNPを少し増やす状態」を付与[Lv](3T)\`,
            effects: [
              { type: 'npCharge', target: 'allOtherAllies', values: levelValues([10, 12, 14, 16, 18, 20, 22, 24, 26, 30]) },
              { type: 'npCharge', target: 'self', values: levelValues([50, 53, 56, 59, 62, 65, 68, 71, 74, 80]) },
              {
                type: 'triggerEffect',
                target: 'self',
                event: 'turnEnd',
                provider: true,
                providerFrontlineOnly: true,
                duration: 3,
                effects: [{
                  type: 'npCharge',
                  target: 'allOtherAllies',
                  values: levelValues([2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9, 4.1, 5]),
                  targetCondition: { kind: 'targetHasTrait', key: '怨嗟の崇拝者' }
                }],
                label: 'フィールド滞在中・崇拝者NP増加'
              }
            ]
          },
          {
            id: 'worshippedBlackGoat',
            name: '崇拝されし黒山羊 B',
            baseCt: 12,
            target: 'self',
            description: \`自身を除く先頭の味方単体に〔怨嗟の崇拝者〕特性を付与(3T)<解除不能・重複不可>
＆〔黒山羊の加護〕状態を付与(3T)<解除不能・生贄選択不能・オーダーチェンジ不能・重複不可>
＆解除可能な強化状態の残りターン数を固定する状態を付与
＆Artsカード性能アップブースト状態を付与[Lv]
＆加護解除時に強化解除・強化献上・即死耐性無視の即死を行う状態を付与(1回・3T)<解除不能・重複不可>\`,
            effects: []
          }
        ],
        passives: [
          { name: '獣の権能 E', icon: 'skill-general-024.png', effects: [{ type: 'critUp', value: 6 }] },
          {
            name: '単独顕現 A++',
            icon: 'class-independent-action.png',
            effects: [
              { type: 'critUp', value: 11.5 },
              { type: 'deathResist', value: 11.5 },
              { type: 'mentalResist', value: 11.5 }
            ]
          },
          {
            name: '異端審問（贄） EX',
            icon: 'class-unique-008.png',
            effects: [
              { type: 'baphometOfferingImmune', value: 1 },
              { type: 'baphometSacrificeImmune', value: 1 },
              { type: 'baphometWorshipperTraitNullify', value: 1 }
            ]
          }
        ],
        np: {
          id: 'aquelarre',
          name: '黒山羊と魔女達の夜',
          reading: 'アクエラーレ',
          card: 'arts',
          target: 'allEnemies',
          hits: 7,
          multipliers: [450, 600, 675, 712.5, 750],
          description: \`敵全体のArts攻撃耐性をダウン(3T)
＆強力な攻撃[Lv]
＆〔人型〕特攻<OC:特攻威力UP>
＋〔怨嗟の崇拝者〕特性の味方全体のNPを増やす\`,
          before: [
            { type: 'cardResist', target: 'allEnemies', card: 'arts', value: 20, duration: 3, debuff: true, chance: 100 }
          ],
          special: {
            kind: 'trait',
            key: '人型',
            ocMultipliers: [1.5, 1.625, 1.75, 1.875, 2]
          },
          after: [
            {
              type: 'npCharge',
              target: 'allAllies',
              value: 30,
              targetCondition: { kind: 'targetHasTrait', key: '怨嗟の崇拝者' }
            }
          ]
        },
        source: 'https://w.atwiki.jp/siroi_human/pages/844.html'
      }
    };`;
  if (!servantSource.includes(marker)) throw new Error('Lucifera insertion marker not found.');
  fs.writeFileSync(servantPath, servantSource.replace(marker, block));
}

replaceOnce(
  'index.html',
  '  <script src="js/craft-essence-effects.js"></script>\n  <script src="js/unique-mechanics/runtime.js"></script>',
  '  <script src="js/craft-essence-effects.js"></script>\n  <script src="js/unique-mechanics/baphomet.js"></script>\n  <script src="js/unique-mechanics/runtime.js"></script>'
);

fs.writeFileSync('js/unique-mechanics/index.js', `'use strict';\n\nconst registry = require('./registry.js');\nrequire('./alice-liddell.js');\nrequire('./baphomet.js');\n\nmodule.exports = registry;\n`);

replaceOnce(
  'tests/engine-tests.js',
  "test('実装サーヴァントは10騎', () => {\n  assert.deepStrictEqual(Object.keys(DATA.servants).sort(), ['aliceLiddell', 'artoriaCaster', 'fenrir', 'inugamiGyobu', 'juanaMadQueen', 'koyanskayaLight', 'lucifera', 'skadiCaster', 'skadiRuler', 'yaoyaOshichi']);\n});",
  "test('実装サーヴァントは11騎', () => {\n  assert.deepStrictEqual(Object.keys(DATA.servants).sort(), ['aliceLiddell', 'artoriaCaster', 'baphomet', 'fenrir', 'inugamiGyobu', 'juanaMadQueen', 'koyanskayaLight', 'lucifera', 'skadiCaster', 'skadiRuler', 'yaoyaOshichi']);\n});"
);

replaceOnce(
  'tests/servant-mechanics-tests.js',
  "assert(UNIQUE.list().length === 0, '登録済みサーヴァントに固有例外処理ファイルがない');",
  "const uniqueIds = UNIQUE.list().map((entry) => entry.servantId).sort();\nassert(JSON.stringify(uniqueIds) === JSON.stringify(['aliceLiddell', 'baphomet']), '固有例外処理はアリス・リデルとバフォメットだけに登録される');"
);

replaceOnce(
  'templates/SERVANT_MECHANICS_GUIDE.md',
  '現在登録済みのサーヴァントにはUnique Mechanicsがないため、個別ファイルはありません。',
  '現在は、共通処理だけでは再現できないアリス・リデルとバフォメットに個別ファイルがあります。'
);
replaceOnce(
  'templates/SERVANT_MECHANICS_GUIDE.md',
  'ブラウザでは`index.html`の`registry.js`より後、`engine.js`より前へ個別ファイルを追加します。',
  'ブラウザでは`registry.js`と、その固有処理が利用する共通ランタイムより後、`unique-mechanics/runtime.js`より前へ個別ファイルを追加します。'
);
replaceOnce(
  'templates/SERVANT_MECHANICS_GUIDE.md',
  '| アリス・リデル | 共通処理・攻撃時特性付与 | なし |\n\nしたがって、上記7騎の個別ファイルは作成しません。',
  '| アリス・リデル | 共通処理・攻撃時特性付与 | 赤のチェスピース遅延resolver |\n| バフォメット | 共通処理・条件対象・ターン終了時NP増加 | 黒山羊の加護、強化ターン固定、強化献上、生贄、固有クラス相性 |\n\n個別ファイルは共通処理へ変換できない処理を持つアリス・リデルとバフォメットだけに作成します。'
);

console.log('Baphomet data and integration files updated.');
