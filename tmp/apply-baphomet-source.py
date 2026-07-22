from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found: {path}: {old[:80]!r}')
    p.write_text(text.replace(old, new, 1))

replace('js/data.js', """      temporaryTrait: 'Statusup.webp',
      beforeAttackApplyTemporaryTrait: 'Buffatk.webp',""", """      temporaryTrait: 'Dragontrait.webp',
      beforeAttackApplyTemporaryTrait: 'Dragontrait.webp',""")
replace('js/data.js', """      addTrait: 'Statusup.webp',
      onAttackAddTrait: 'Buffatk.webp'""", """      addTrait: 'Dragontrait.webp',
      onAttackAddTrait: 'Dragontrait.webp'""")
replace('js/trait-trigger-aura-effects.js', """  DATA.statusIcons.temporaryTrait = DATA.statusIcons.temporaryTrait || 'Statusup.webp';
  DATA.statusIcons.beforeAttackApplyTemporaryTrait = DATA.statusIcons.beforeAttackApplyTemporaryTrait || 'Buffatk.webp';""", """  DATA.statusIcons.temporaryTrait = DATA.statusIcons.temporaryTrait || 'Dragontrait.webp';
  DATA.statusIcons.beforeAttackApplyTemporaryTrait = DATA.statusIcons.beforeAttackApplyTemporaryTrait || 'Dragontrait.webp';""")
replace('js/card-buff-effects.js', """  const PERFORMANCE_TYPES = new Set(['cardUp', 'cardDown']);""", """  const CARD_BOOST_ICONS = {
    quick: 'Quickupboost.webp',
    arts: 'Artsupboost.webp',
    buster: 'Busterupboost.webp'
  };

  const PERFORMANCE_TYPES = new Set(['cardUp', 'cardDown']);""")
replace('js/card-buff-effects.js', """  DATA.cardStatusIcons = {
    performance: JSON.parse(JSON.stringify(CARD_ICONS)),
    power: JSON.parse(JSON.stringify(CARD_ICONS))
  };""", """  DATA.cardStatusIcons = {
    performance: JSON.parse(JSON.stringify(CARD_ICONS)),
    power: JSON.parse(JSON.stringify(CARD_ICONS)),
    boost: JSON.parse(JSON.stringify(CARD_BOOST_ICONS))
  };""")
replace('js/card-buff-effects.js', """    icons: JSON.parse(JSON.stringify(CARD_ICONS)),
    performanceTypes:""", """    icons: JSON.parse(JSON.stringify(CARD_ICONS)),
    boostIcons: JSON.parse(JSON.stringify(CARD_BOOST_ICONS)),
    performanceTypes:""")
replace('js/engine.js', """else ally.statuses.push({ ...deepClone(effect), source: ce.name, remaining: effect.duration == null ? -1 : effect.duration, passive: false, uses: effect.uses == null ? null : effect.uses });""", """else ally.statuses.push({ ...deepClone(effect), source: ce.name, sourceType: 'craftEssence', craftEssenceId: ce.id, remaining: effect.duration == null ? -1 : effect.duration, passive: false, uses: effect.uses == null ? null : effect.uses });""")

path = Path('js/unique-mechanics/baphomet.js')
text = path.read_text()
text = text.replace("""  const CARD_BOOST_VALUES = [30, 32, 34, 36, 38, 40, 42, 44, 46, 50];""", """  const CARD_BOOST_VALUES = [30, 32, 34, 36, 38, 40, 42, 44, 46, 50];
  const TRAIT_ICON = 'Dragontrait.webp';
  const CARD_BOOST_ICONS = {
    quick: 'Quickupboost.webp',
    arts: 'Artsupboost.webp',
    buster: 'Busterupboost.webp'
  };""", 1)
text = text.replace("""  function isRemovableBuff(status) {
    return Boolean(
      status && isActive(status) && !status.debuff && !status.passive &&
      !status.unremovable && !UNIQUE_TYPES.has(status.type)
    );
  }

  function isFrontlineProvider(unit) {
    return isBaphomet(unit) && isAlive(unit) && unit.frontline !== false;
  }""", """  function isCraftEssenceStatus(status) {
    if (!status) return false;
    if (status.sourceType === 'craftEssence' || status.craftEssenceId) return true;
    return Object.values(DATA.craftEssences || {}).some((craftEssence) =>
      craftEssence && craftEssence.id !== 'none' && craftEssence.name === status.source
    );
  }

  function isRemovableBuff(status) {
    return Boolean(
      status && isActive(status) && !status.debuff && !status.passive &&
      !status.unremovable && !UNIQUE_TYPES.has(status.type) && !isCraftEssenceStatus(status)
    );
  }""", 1)
text = text.replace("""      .find((unit) =>
        !hasActiveType(unit, TYPES.sacrificeImmune) &&
        !hasActiveType(unit, TYPES.blessing)
      ) || null;""", """      .find((unit) => !hasActiveType(unit, TYPES.sacrificeImmune)) || null;""", 1)
text = text.replace("statusIcon: 'Statusup.webp',", "statusIcon: TRAIT_ICON,", 3)
text = text.replace("statusIcon: 'Artsup.webp',", "statusIcon: (DATA.cardStatusIcons && DATA.cardStatusIcons.boost && DATA.cardStatusIcons.boost.arts) || CARD_BOOST_ICONS.arts,", 1)
text = text.replace("""  function transferBuffs(engine, target, provider) {
    const transferable = (target.statuses || []).filter(isRemovableBuff);""", """  function transferBuffs(engine, target, provider) {
    if (!isAlive(target) || !isAlive(provider)) {
      engine._log(`${target ? target.name : '付与対象'}と対象のバフォメットが両方生存していないため、強化献上は発動しない。`, 'condition');
      return [];
    }

    const transferable = (target.statuses || []).filter(isRemovableBuff);""", 1)
text = text.replace("""
    if (!isFrontlineProvider(provider)) {
      engine._log(`フィールド上に対象のバフォメットがいないため、${target.name}の強化献上は無効。`, 'condition');
      return [];
    }
""", "\n", 1)
start = text.index("  const originalUseSkill = proto.useSkill;")
end = text.index("  const originalOrderChange = proto.orderChange;", start)
text = text[:start] + text[end:]
text = text.replace("""  DATA.statusIcons[TYPES.contract] = 'DelayedDebuff.webp';
  DATA.statusIcons[TYPES.cardBoost] = 'Artsup.webp';""", """  DATA.statusIcons[TYPES.blessing] = TRAIT_ICON;
  DATA.statusIcons[TYPES.durationLock] = TRAIT_ICON;
  DATA.statusIcons[TYPES.contract] = 'DelayedDebuff.webp';
  DATA.statusIcons[TYPES.cardBoost] =
    (DATA.cardStatusIcons && DATA.cardStatusIcons.boost && DATA.cardStatusIcons.boost.arts) || CARD_BOOST_ICONS.arts;""", 1)
text = text.replace("""    cardBoostValues: CARD_BOOST_VALUES.slice(),
    definition:""", """    cardBoostValues: CARD_BOOST_VALUES.slice(),
    cardBoostIcons: { ...CARD_BOOST_ICONS },
    definition:""", 1)
path.write_text(text)

p = Path('templates/BUFF_ICON_GUIDE.md')
p.write_text(p.read_text() + """

## 特性付与・カードブーストの共通アイコン

特性を付与する状態は、付与タイミングにかかわらず `Dragontrait.webp` を使用します。

カード性能アップブースト状態は、Quick=`Quickupboost.webp`、Arts=`Artsupboost.webp`、Buster=`Busterupboost.webp` を使用します。通常のカード性能アップとは別アイコンです。
""")
