from pathlib import Path
import re

root = Path('.')
engine_path = root / 'js' / 'engine.js'
index_path = root / 'index.html'
readme_path = root / 'README.md'

engine = engine_path.read_text(encoding='utf-8')

old_data = "  const DATA = global.FGO_SIM_DATA || (typeof require !== 'undefined' ? require('./data.js') : null);"
new_data = old_data + "\n  const MECHANICS = global.FGO_SERVANT_MECHANICS || (typeof require !== 'undefined' ? require('./servant-mechanics/index.js') : null);"
if 'const MECHANICS =' not in engine:
    engine = engine.replace(old_data, new_data, 1)

method_anchor = "    selectEnemy(enemyId) {"
methods = """    _hasTrait(unit, trait) { return hasTrait(unit, trait); }\n\n    _normalizeTrait(value) { return normalizeTrait(value); }\n\n    _runServantHook(actor, eventName, context) {\n      if (!MECHANICS || !actor) return undefined;\n      return MECHANICS.runServantHook(this, actor.servantId, eventName, context || {});\n    }\n\n    _runEffectHooks(eventName, context) {\n      if (!MECHANICS) return;\n      MECHANICS.runEffectHooks(this, eventName, context || {});\n    }\n\n"""
if '_runEffectHooks(eventName' not in engine:
    engine = engine.replace(method_anchor, methods + method_anchor, 1)

# 宝具前後・攻撃時フック
np_log = "      this._log(`${actor.name} 宝具「${np.name}」 OC${oc}。NPを0%にリセット。`, 'np');"
if "_runServantHook(actor, 'beforeNp'" not in engine:
    engine = engine.replace(np_log, np_log + "\n      this._runServantHook(actor, 'beforeNp', { actor, action, np, oc });\n      this._runEffectHooks('beforeNp', { actor, action, np, oc });", 1)

np_target_log = "        this._log(`${target.name}に${result.damage.toLocaleString('ja-JP')}ダメージ。`, 'damage');"
if "_runEffectHooks('afterNpAttack'" not in engine:
    engine = engine.replace(np_target_log, np_target_log + "\n        const attackContext = { actor, target, action: { ...action, type: 'np', card: np.card }, result, np, oc };\n        this._runEffectHooks('afterAttack', attackContext);\n        this._runEffectHooks('afterNpAttack', attackContext);", 1)

np_after = "      (np.after || []).forEach((raw) => { const effect={...raw}; if(Array.isArray(effect.npLevelValues)) effect.value=effect.npLevelValues[actor.npLevel-1]; this._applyEffect(effect, actor, this.state.selectedEnemyId, { oc, level: 10 }); });"
if "_runServantHook(actor, 'afterNp'" not in engine:
    engine = engine.replace(np_after, np_after + "\n      this._runServantHook(actor, 'afterNp', { actor, action, np, oc, totalDamage, totalNpGain, totalStars });\n      this._runEffectHooks('afterNp', { actor, action, np, oc, totalDamage, totalNpGain, totalStars });", 1)

# 通常攻撃の直書き例外をEffect Hookへ置換
pattern = re.compile(
    r"\n\s*actor\.statuses\.filter\(s=>s\.type==='onAttackAddTrait'\).*?\n\s*if \(card\.card === 'buster'\) \{.*?\n\s*\}\n\s*\}",
    re.S,
)
replacement = """
      const attackContext = { actor, target, action: resolvedAction, result, card };
      this._runEffectHooks('afterAttack', attackContext);
      this._runEffectHooks('afterNormalAttack', attackContext);
    }"""
if "const attackContext = { actor, target, action: resolvedAction" not in engine:
    engine, count = pattern.subn(replacement, engine, count=1)
    if count != 1:
        raise RuntimeError('Could not replace hard-coded normal attack exceptions.')

engine_path.write_text(engine, encoding='utf-8')

index = index_path.read_text(encoding='utf-8')
anchor = '  <script src="js/mystic-codes.js"></script>'
scripts = '''  <script src="js/mystic-codes.js"></script>\n  <script src="js/servant-mechanics/registry.js"></script>\n  <script src="js/servant-mechanics/koyanskayaLight.js"></script>\n  <script src="js/servant-mechanics/fenrir.js"></script>\n  <script src="js/servant-mechanics/artoriaCaster.js"></script>\n  <script src="js/servant-mechanics/skadiRuler.js"></script>\n  <script src="js/servant-mechanics/skadiCaster.js"></script>\n  <script src="js/servant-mechanics/juanaMadQueen.js"></script>\n  <script src="js/servant-mechanics/aliceLiddell.js"></script>'''
if 'js/servant-mechanics/registry.js' not in index:
    index = index.replace(anchor, scripts, 1)
index_path.write_text(index, encoding='utf-8')

readme = readme_path.read_text(encoding='utf-8')
section = '''\n\n## サーヴァント別の例外処理\n\nサーヴァント固有のトリガー処理・独自処理は `js/engine.js` へ直接追加せず、`js/servant-mechanics/` 以下で1騎1ファイルとして管理します。\n\n- `registry.js`：フック登録基盤\n- `index.js`：Node.jsテスト用ローダー\n- `<servantId>.js`：各サーヴァントの分類と例外処理\n\n通常処理、限定的例外処理、固有例外処理の分類と追加方法は `templates/SERVANT_MECHANICS_GUIDE.md` を参照してください。\n'''
if '## サーヴァント別の例外処理' not in readme:
    readme += section
readme_path.write_text(readme, encoding='utf-8')
