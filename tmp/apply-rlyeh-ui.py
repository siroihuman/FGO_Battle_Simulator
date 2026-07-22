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

p = Path('tests/engine-tests.js')
text = p.read_text()
text = text.replace("test('実装サーヴァントは12騎'", "test('実装サーヴァントは13騎'", 1)
text = text.replace("'lucifera', 'skadiCaster'", "'lucifera', 'rlyeh', 'skadiCaster'", 1)
p.write_text(text)

p = Path('tests/servant-mechanics-tests.js')
text = p.read_text()
text = text.replace("['aliceLiddell', 'baphomet']", "['aliceLiddell', 'baphomet', 'rlyeh']", 1)
p.write_text(text)
