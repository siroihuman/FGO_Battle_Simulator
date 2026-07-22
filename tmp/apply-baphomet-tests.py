from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found: {path}: {old[:80]!r}')
    p.write_text(text.replace(old, new, 1))

replace('tests/trait-trigger-aura-effects-tests.js', """  assert.strictEqual(summary.name, '〔チェック〕特性');
  assert.strictEqual(summary.remaining, 1);""", """  assert.strictEqual(summary.name, '〔チェック〕特性');
  assert.strictEqual(summary.statusIcon, 'Dragontrait.webp');
  assert.strictEqual(summary.remaining, 1);""")
replace('tests/trait-trigger-aura-effects-tests.js', """test('一時特性は弱体解除とターン経過で消える',""", """test('特性付与系状態はすべてDragontrait.webpを使用する', () => {
  ['temporaryTrait', 'beforeAttackApplyTemporaryTrait', 'addTrait', 'onAttackAddTrait']
    .forEach((type) => assert.strictEqual(DATA.statusIcons[type], 'Dragontrait.webp'));
});

test('一時特性は弱体解除とターン経過で消える',""")
replace('tests/card-buff-effects-tests.js', """test('Q/A/B/Ex性能アップとQ/A/B性能ダウンに個別アイコンを表示',""", """test('Q/A/Bカード性能アップブースト用アイコンを登録', () => {
  assert.deepStrictEqual(CARD_BUFFS.boostIcons, {
    quick: 'Quickupboost.webp', arts: 'Artsupboost.webp', buster: 'Busterupboost.webp'
  });
  assert.deepStrictEqual(DATA.cardStatusIcons.boost, CARD_BUFFS.boostIcons);
});

test('Q/A/B/Ex性能アップとQ/A/B性能ダウンに個別アイコンを表示',""")
replace('tests/craft-essence-status-tab-tests.js', """  });
});

test('概念礼装状態を通常バフ欄から専用タブへ移動するUIを登録する',""", """  });
  engine.getState().allies[0].statuses.filter((status) => status.source === '黒の聖杯').forEach((status) => {
    assert.strictEqual(status.sourceType, 'craftEssence');
    assert.strictEqual(status.craftEssenceId, 'blackGrail');
  });
});

test('概念礼装状態を通常バフ欄から専用タブへ移動するUIを登録する',""")

path = Path('tests/baphomet-tests.js')
text = path.read_text()
text = text.replace("""  assert.strictEqual(engine._statusTotal(lucifera, 'cardUp', { card: 'arts' }), artsBeforeBoost * 1.5);
  assert.strictEqual(engine.orderChange(lucifera.id, reserve.id).ok, false);""", """  assert.strictEqual(engine._statusTotal(lucifera, 'cardUp', { card: 'arts' }), artsBeforeBoost * 1.5);
  const summary = engine.getStatusSummary(lucifera.id);
  assert.strictEqual(summary.find((status) => status.type === 'temporaryTrait' && status.trait === WORSHIPPER).statusIcon, 'Dragontrait.webp');
  assert.strictEqual(summary.find((status) => status.type === TYPES.blessing).statusIcon, 'Dragontrait.webp');
  assert.strictEqual(summary.find((status) => status.type === TYPES.durationLock).statusIcon, 'Dragontrait.webp');
  assert.strictEqual(summary.find((status) => status.type === TYPES.cardBoost).statusIcon, 'Artsupboost.webp');
  assert.strictEqual(engine.orderChange(lucifera.id, reserve.id).ok, false);""", 1)
marker = "function hasType(unit, type) {"
block = """test('重複不可状態を持つ対象にもスキル3を再使用でき、固有状態は重複しない', () => {
  const engine = makeEngine();
  const [provider, target] = engine.getState().allies;
  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  provider.cooldowns[2] = 0;
  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  [TYPES.blessing, TYPES.durationLock, TYPES.cardBoost, TYPES.contract]
    .forEach((type) => assert.strictEqual(target.statuses.filter((status) => status.type === type).length, 1));
});

test('重複不可と重複可能が混在する場合は重複可能効果だけ再付与する', () => {
  const engine = makeEngine();
  const actor = engine.getState().allies[0];
  actor.data.skills.push({ id: 'stackTest', name: '重複検証', baseCt: 3, target: 'self', effects: [
    { type: 'attackUp', target: 'self', value: 10, duration: 3, uniqueKey: 'stackTest:unique' },
    { type: 'critUp', target: 'self', value: 5, duration: 3 }
  ] });
  actor.skillLevels.push(10); actor.cooldowns.push(0);
  const index = actor.data.skills.length - 1;
  assert.strictEqual(engine.useSkill(actor.id, index, actor.id).ok, true);
  actor.cooldowns[index] = 0;
  assert.strictEqual(engine.useSkill(actor.id, index, actor.id).ok, true);
  assert.strictEqual(actor.statuses.filter((status) => status.uniqueKey === 'stackTest:unique').length, 1);
  assert.strictEqual(actor.statuses.filter((status) => status.type === 'critUp' && status.value === 5 && !status.passive).length, 2);
});

"""
if marker not in text:
    raise SystemExit('baphomet marker missing')
text = text.replace(marker, block + marker, 1)
old = """test('加護解除時に強化を献上して生贄化し、異端審問がバフォメットの強化を3T延長する', () => {
  const engine = makeEngine();
  const [provider, target] = engine.getState().allies;
  const providerBuff = engine._addStatus(provider, { type: 'attackUp', duration: 1 }, 20, '延長対象');
  const offeredBuff = engine._addStatus(target, { type: 'cardUp', card: 'arts', duration: 2 }, 40, '献上対象');

  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  target.statuses.forEach((status) => {
    if ([TYPES.blessing, TYPES.durationLock, TYPES.cardBoost, TYPES.contract].includes(status.type) ||
        (status.type === 'temporaryTrait' && status.trait === WORSHIPPER)) {
      status.remaining = 1;
    }
  });

  engine._finishTurn();

  assert.strictEqual(target.alive, false);
  assert.strictEqual(target.hp, 0);
  assert.strictEqual(target.statuses.includes(offeredBuff), false);
  const transferred = provider.statuses.find((status) => String(status.source || '').includes('献上対象'));
  assert.ok(transferred);
  assert.strictEqual(providerBuff.remaining, 4);
  assert.strictEqual(transferred.remaining, 5);
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('強化状態1個をバフォメットへ献上')));
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('生贄となり戦闘不能')));
});"""
new = """test('ターン終了時に双方が生存していれば通常強化だけを献上し、概念礼装バフは除外する', () => {
  const engine = makeEngine([
    { servantId: 'baphomet', skillLevel: 10, npLevel: 1 },
    { servantId: 'lucifera', skillLevel: 10, npLevel: 1, craftEssenceId: 'blackGrail' },
    { servantId: 'koyanskayaLight', skillLevel: 10, npLevel: 1 }
  ]);
  const [provider, target] = engine.getState().allies;
  const providerBuff = engine._addStatus(provider, { type: 'attackUp', duration: 1 }, 20, '延長対象');
  const offeredBuff = engine._addStatus(target, { type: 'cardUp', card: 'arts', duration: 2 }, 40, '献上対象');
  const ceBuff = target.statuses.find((status) => status.type === 'npPowerUp' && status.source === '黒の聖杯');
  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  provider.frontline = false;
  target.statuses.forEach((status) => {
    if ([TYPES.blessing, TYPES.durationLock, TYPES.cardBoost, TYPES.contract].includes(status.type) ||
        (status.type === 'temporaryTrait' && status.trait === WORSHIPPER)) status.remaining = 1;
  });
  engine._finishTurn();
  assert.strictEqual(target.alive, false);
  assert.strictEqual(target.statuses.includes(offeredBuff), false);
  assert.strictEqual(target.statuses.includes(ceBuff), true);
  const transferred = provider.statuses.find((status) => String(status.source || '').includes('献上対象'));
  assert.ok(transferred);
  assert.strictEqual(providerBuff.remaining, 4);
  assert.strictEqual(transferred.remaining, 5);
  assert.strictEqual(provider.statuses.some((status) => String(status.source || '').includes('黒の聖杯') && String(status.source || '').includes('献上')), false);
});

test('ターン終了時にバフォメットが戦闘不能なら献上せず対象の通常強化を残す', () => {
  const engine = makeEngine();
  const [provider, target] = engine.getState().allies;
  const buff = engine._addStatus(target, { type: 'attackUp', duration: 2 }, 30, '生存条件検証');
  assert.strictEqual(engine.useSkill(provider.id, 2, provider.id).ok, true);
  target.statuses.forEach((status) => {
    if ([TYPES.blessing, TYPES.durationLock, TYPES.cardBoost, TYPES.contract].includes(status.type) ||
        (status.type === 'temporaryTrait' && status.trait === WORSHIPPER)) status.remaining = 1;
  });
  provider.hp = 0; provider.alive = false;
  engine._finishTurn();
  assert.strictEqual(target.alive, false);
  assert.strictEqual(target.statuses.includes(buff), true);
  assert.ok(engine.getState().logs.some((entry) => entry.message.includes('両方生存していないため、強化献上は発動しない')));
});"""
if old not in text:
    raise SystemExit('offering test block missing')
text = text.replace(old, new, 1)
text = text.replace("  assert.strictEqual(BAPHOMET.cardBoostValues[9], 50);", """  assert.strictEqual(BAPHOMET.cardBoostValues[9], 50);
  assert.deepStrictEqual(BAPHOMET.cardBoostIcons, {
    quick: 'Quickupboost.webp', arts: 'Artsupboost.webp', buster: 'Busterupboost.webp'
  });""", 1)
path.write_text(text)
