from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found: {path}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))

replace('js/app.js', """    const units = pending.target === 'enemy' ? engine.getAliveEnemies() : engine.getAliveAllies();
    return `<div class=\"modal-backdrop\"><div class=\"target-modal-card\"><h2>対象選択</h2>${units.map((unit) => `<button type=\"button\" data-target=\"${unit.id}\">${E(unit.name)}${pending.target === 'ally' ? duplicateBadge(unit, true) : ''}</button>`).join('')}<button type=\"button\" id=\"cancel\">キャンセル</button></div></div>`;""", """    if (pending.kind === 'servantCardType' && !pending.card) {
      return `<div class=\"modal-backdrop\"><div class=\"target-modal-card\"><h2>カードタイプ選択</h2><p>付与するカード性能アップブーストの色を選択してください。</p><button type=\"button\" data-card-type=\"quick\">Quick</button><button type=\"button\" data-card-type=\"arts\">Arts</button><button type=\"button\" data-card-type=\"buster\">Buster</button><button type=\"button\" id=\"cancel\">キャンセル</button></div></div>`;
    }
    const units = pending.target === 'enemy' ? engine.getAliveEnemies() : engine.getAliveAllies();
    const heading = pending.kind === 'servantCardType' ? `${pending.card.toUpperCase()}を付与する対象選択` : '対象選択';
    return `<div class=\"modal-backdrop\"><div class=\"target-modal-card\"><h2>${heading}</h2>${units.map((unit) => `<button type=\"button\" data-target=\"${unit.id}\">${E(unit.name)}${pending.target === 'ally' ? duplicateBadge(unit, true) : ''}</button>`).join('')}<button type=\"button\" id=\"cancel\">キャンセル</button></div></div>`;""")

replace('js/app.js', """        if (targetType === 'self') stableRender(() => engine.useSkill(allyId, index, allyId));
        else {
          pending = { kind: 'servant', ally: allyId, index, target: targetType === 'enemy' ? 'enemy' : 'ally' };
          renderBattle({ viewport: captureViewport() });
        }""", """        if (targetType === 'self') stableRender(() => engine.useSkill(allyId, index, allyId));
        else {
          pending = targetType === 'allyCardType'
            ? { kind: 'servantCardType', ally: allyId, index, target: 'ally', card: null }
            : { kind: 'servant', ally: allyId, index, target: targetType === 'enemy' ? 'enemy' : 'ally' };
          renderBattle({ viewport: captureViewport() });
        }""")

replace('js/app.js', """    root.querySelectorAll('[data-target]').forEach((button) => {
      button.onclick = () => {
        const viewport = captureViewport();
        if (pending.kind === 'servant') engine.useSkill(pending.ally, pending.index, button.dataset.target);
        else engine.useMysticSkill(pending.index, button.dataset.target);
        pending = null;
        renderBattle({ viewport });
      };
    });""", """    root.querySelectorAll('[data-card-type]').forEach((button) => {
      button.onclick = () => {
        pending.card = button.dataset.cardType;
        renderBattle({ viewport: captureViewport() });
      };
    });
    root.querySelectorAll('[data-target]').forEach((button) => {
      button.onclick = () => {
        const viewport = captureViewport();
        if (pending.kind === 'servant' || pending.kind === 'servantCardType') {
          engine.useSkill(pending.ally, pending.index, button.dataset.target, pending.card);
        } else engine.useMysticSkill(pending.index, button.dataset.target);
        pending = null;
        renderBattle({ viewport });
      };
    });""")

replace('js/servants-rlyeh.js', "{ type: 'cooldownReduce', target: 'allOtherAllies', value: 1 },\n          { type: 'hpLoss', target: 'allOtherAllies', value: 2000 }", "{ type: 'cooldownReduce', target: 'allAlliesExceptSelected', value: 1 },\n          { type: 'hpLoss', target: 'allAlliesExceptSelected', value: 2000 }")

replace('js/unique-mechanics/rlyeh.js', """  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {""", """  const originalEffectTargets = proto._effectTargets;
  proto._effectTargets = function (effect, source, selectedTargetId) {
    if (effect && effect.target === 'allAlliesExceptSelected') {
      return this.getAliveAllies().filter((unit) => unit.id !== selectedTargetId);
    }
    return originalEffectTargets.call(this, effect, source, selectedTargetId);
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {""")

replace('tests/rlyeh-tests.js', """  assert.strictEqual(e.useSkill(rlyeh.id, 2, target.id, 'quick').ok, true);
  assert.strictEqual(target.statuses.find((s) => s.type === RLYEH.statusTypes.cardBoost).statusIcon, 'Quickupboost.webp');
  assert.strictEqual(e._statusTotal(target, 'cardUp', { card: 'quick' }), 100);""", """  const before = e._statusTotal(target, 'cardUp', { card: 'quick' });
  assert.strictEqual(e.useSkill(rlyeh.id, 2, target.id, 'quick').ok, true);
  assert.strictEqual(target.statuses.find((s) => s.type === RLYEH.statusTypes.cardBoost).statusIcon, 'Quickupboost.webp');
  const rawAfter = before + 50;
  assert.strictEqual(e._statusTotal(target, 'cardUp', { card: 'quick' }), rawAfter * 2);""")

p = Path('tests/engine-tests.js')
text = p.read_text()
text = text.replace("test('実装サーヴァントは12騎'", "test('実装サーヴァントは13騎'", 1)
text = text.replace("'lucifera', 'skadiCaster'", "'lucifera', 'rlyeh', 'skadiCaster'", 1)
p.write_text(text)

p = Path('tests/servant-mechanics-tests.js')
text = p.read_text()
text = text.replace("['aliceLiddell', 'baphomet']", "['aliceLiddell', 'baphomet', 'rlyeh']", 1)
p.write_text(text)
