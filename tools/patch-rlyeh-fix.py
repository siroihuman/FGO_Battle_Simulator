from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:80]!r}')
    p.write_text(text.replace(old, new), encoding='utf-8')

replace('js/unique-mechanics/runtime.js',
"""  proto.useSkill = function (allyId, skillIndex, selectedTargetId) {
    const actor = this.getUnit(allyId);
    const skill = actor && actor.data && actor.data.skills ? actor.data.skills[skillIndex] : null;
    const result = originalUseSkill.call(this, allyId, skillIndex, selectedTargetId);""",
"""  proto.useSkill = function (allyId, skillIndex, selectedTargetId, selectedCardType) {
    const actor = this.getUnit(allyId);
    const skill = actor && actor.data && actor.data.skills ? actor.data.skills[skillIndex] : null;
    const result = originalUseSkill.call(this, allyId, skillIndex, selectedTargetId, selectedCardType);""")

replace('js/unique-mechanics/runtime.js',
"""        selectedTargetId,
        result""",
"""        selectedTargetId,
        selectedCardType,
        result""")

replace('js/servants-rlyeh.js',
"""    skillIcons: ['skill-buff-add.png', 'skill-buff-add.png', 'skill-buff-add.png'],""",
"""    skillIcons: ['skill-general-030.png', 'skill-general-010.png', 'skill-unique-018.png'],""")

replace('js/servants-rlyeh.js',
"""      { name: '領域外の生命 EX', icon: 'class-foreigner.png', effects: [{ type: 'starsPerTurn', value: 2 }, { type: 'debuffResist', value: 12 }] },
      { name: '絶海にて微睡む太古の支配者', icon: 'skill-buff-add.png', effects: [] }""",
"""      { name: '領域外の生命 EX', icon: 'class-general-013.png', effects: [{ type: 'starsPerTurn', value: 2 }, { type: 'debuffResist', value: 12 }] },
      {
        name: '絶海にて微睡む太古の支配者',
        icon: 'skill-general-084.png',
        effects: [{ type: 'rlyehBuffAbsorbOnInstantDeath', value: 1 }]
      }""")

replace('js/unique-mechanics/rlyeh.js',
"""    permanentSleep: 'rlyehPermanentSleep',
    deathRelay: 'rlyehInstantDeathNpRelay'""",
"""    permanentSleep: 'rlyehPermanentSleep',
    deathRelay: 'rlyehInstantDeathNpRelay',
    buffAbsorb: 'rlyehBuffAbsorbOnInstantDeath'""")

replace('js/unique-mechanics/rlyeh.js',
"""    [TYPES.permanentSleep]: '永久睡眠',
    [TYPES.deathRelay]: '即死時・味方全体NP増加'""",
"""    [TYPES.permanentSleep]: '永久睡眠',
    [TYPES.deathRelay]: '即死時・味方全体NP増加',
    [TYPES.buffAbsorb]: '即死成功時・対象の強化状態を吸収'""")

replace('js/unique-mechanics/rlyeh.js',
"""    const buffs = isRlyeh(source) ? (target.statuses || []).filter(isRemovableBuff) : [];""",
"""    const canAbsorb = Boolean(source && (source.statuses || []).some(
      (status) => status.type === TYPES.buffAbsorb && isActive(status)
    ));
    const buffs = canAbsorb ? (target.statuses || []).filter(isRemovableBuff) : [];""")

replace('js/unique-mechanics/rlyeh.js',
"""  const originalCalculateAttackTotal = proto._calculateAttackTotal;
  proto._calculateAttackTotal = function (actor, target, action, chainContext) {
    if (!isRlyeh(actor) || !['ヒト科', '今を生きる人類'].some((trait) => hasTrait(this, target, trait))) {
      return originalCalculateAttackTotal.call(this, actor, target, action, chainContext);
    }
    const actorClass = actor.classId;
    const targetClass = target.classId;
    actor.classId = 'saber';
    target.classId = 'lancer';
    try {
      return originalCalculateAttackTotal.call(this, actor, target, action, chainContext);
    } finally {
      actor.classId = actorClass;
      target.classId = targetClass;
    }
  };

""",
""")

replace('js/unique-mechanics/rlyeh.js',
"""    notes: 'カード色選択、永久睡眠、即死時NP配布、即死成功時強化吸収、固有クラス相性を管理。'""",
"""    notes: 'カード色選択、永久睡眠、即死時NP配布、即死成功時強化吸収を管理。クラス相性は共通システム側で処理する。'""")

replace('tests/rlyeh-tests.js',
"""const RLYEH = require('../js/unique-mechanics/rlyeh.js');""",
"""const RLYEH = require('../js/unique-mechanics/rlyeh.js');
require('../js/unique-mechanics/runtime.js');""")

replace('tests/rlyeh-tests.js',
"""  assert.strictEqual(servant.skills.length, 3);
});""",
"""  assert.strictEqual(servant.skills.length, 3);
  assert.deepStrictEqual(servant.skillIcons, [
    'skill-general-030.png', 'skill-general-010.png', 'skill-unique-018.png'
  ]);
  assert.strictEqual(servant.passives.find((passive) => passive.name === '領域外の生命 EX').icon, 'class-general-013.png');
  assert.strictEqual(servant.passives.find((passive) => passive.name === '絶海にて微睡む太古の支配者').icon, 'skill-general-084.png');
});""")

replace('tests/rlyeh-tests.js',
"""test('古の支配者は選択色ブーストを付与しターン終了時に永久睡眠へ移行', () => {""",
"""test('画面経由と同じ4引数呼び出しでも古の支配者が発動する', () => {
  const e = engine([{ servantId: 'rlyeh', skillLevel: 10 }, { servantId: 'fenrir', skillLevel: 10 }]);
  const [rlyeh, target] = e.getState().allies;
  const result = e.useSkill(rlyeh.id, 2, target.id, 'buster');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.card, 'buster');
  assert.strictEqual(target.statuses.some((status) => status.type === RLYEH.statusTypes.cardBoost && status.card === 'buster'), true);
});

test('古の支配者は選択色ブーストを付与しターン終了時に永久睡眠へ移行', () => {""")

replace('tests/rlyeh-tests.js',
"""test('ルルイエの即死成功時に対象の解除可能な強化を吸収', () => {
  const e = engine([{ servantId: 'rlyeh' }], enemy({ deathRate: 100 }));
  e.rng = () => 0;
  const rlyeh = e.getState().allies[0];""",
"""test('クラススキルで即死成功時強化吸収状態が可視化され、効果も発動する', () => {
  const e = engine([{ servantId: 'rlyeh' }], enemy({ deathRate: 100 }));
  e.rng = () => 0;
  const rlyeh = e.getState().allies[0];
  const absorb = rlyeh.statuses.find((status) => status.type === RLYEH.statusTypes.buffAbsorb);
  assert.ok(absorb);
  assert.strictEqual(absorb.passive, true);
  assert.strictEqual(e.getStatusSummary(rlyeh.id).find((status) => status.type === RLYEH.statusTypes.buffAbsorb).name, '即死成功時・対象の強化状態を吸収');""")

print('patched Rlyeh files')
