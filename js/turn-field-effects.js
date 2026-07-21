(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('./data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('./engine.js') : null);
  const COMMON = global.FGO_SIM_COMMON_EFFECTS ||
    (typeof require !== 'undefined' ? require('./common-effects.js') : null);

  if (!DATA || !ENGINE || !ENGINE.BattleEngine || !COMMON) {
    throw new Error('turn and field effects runtime requires data, engine and common effects.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__turnFieldEffectsInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_TURN_FIELD_EFFECTS;
    return;
  }
  proto.__turnFieldEffectsInstalled = true;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const normalizeFieldTraits = (traits) => Array.from(new Set(
    (Array.isArray(traits) ? traits : [])
      .map((trait) => String(trait == null ? '' : trait).trim())
      .filter(Boolean)
  ));
  const valueAt = (effect, level, oc) => {
    if (Array.isArray(effect.values)) return Number(effect.values[clamp(level || 10, 1, 10) - 1] || 0);
    if (Array.isArray(effect.ocValues)) return Number(effect.ocValues[clamp(oc || 1, 1, 5) - 1] || 0);
    return Number(effect.value || 0);
  };
  const configuredFieldTraits = (engine, waveNumber) => {
    const waves = Array.isArray(engine.config.waves) ? engine.config.waves : [];
    const wave = waves[Math.max(0, Number(waveNumber || 1) - 1)];
    if (wave && Array.isArray(wave.fieldTraits)) return normalizeFieldTraits(wave.fieldTraits);
    return normalizeFieldTraits(engine.config.fieldTraits);
  };

  const originalInitialize = proto._initialize;
  proto._initialize = function () {
    // 初期Wave開始時効果からもフィールド条件を参照できるよう、元の初期化より先に設定する。
    this.state.fieldTraits = configuredFieldTraits(this, this.state.wave);
    return originalInitialize.apply(this, arguments);
  };

  proto.getFieldTraits = function () {
    return normalizeFieldTraits(this.state.fieldTraits);
  };

  proto.setFieldTraits = function (traits, options) {
    const next = normalizeFieldTraits(traits);
    this.state.fieldTraits = next;
    if (!options || options.log !== false) {
      this._log(`フィールド特性を${next.length ? next.map((trait) => `〔${trait}〕`).join('・') : 'なし'}に変更。`, 'field');
    }
    return this.getFieldTraits();
  };

  proto.hasFieldTrait = function (key) {
    const wanted = String(key == null ? '' : key).trim();
    return Boolean(wanted) && this.getFieldTraits().includes(wanted);
  };

  proto._conditionMet = function (condition, context) {
    if (!condition) return true;
    switch (condition.kind) {
      case 'fieldTrait':
        return this.hasFieldTrait(condition.key);
      case 'all':
        return (condition.conditions || []).every((entry) => this._conditionMet(entry, context));
      case 'any':
        return (condition.conditions || []).some((entry) => this._conditionMet(entry, context));
      case 'not':
        return !this._conditionMet(condition.condition, context);
      default:
        return false;
    }
  };

  const originalStartNextWave = proto._startNextWave;
  proto._startNextWave = function () {
    const previousTraits = this.getFieldTraits();
    const nextWaveNumber = Number(this.state.wave || 1) + 1;
    // Wave開始時効果から新Waveのフィールドを参照できるよう、元処理より先に切り替える。
    this.state.fieldTraits = configuredFieldTraits(this, nextWaveNumber);
    const started = originalStartNextWave.apply(this, arguments);
    if (!started) this.state.fieldTraits = previousTraits;
    return started;
  };

  const originalApplyEffect = proto._applyEffect;
  proto._applyEffect = function (effect, source, selectedTargetId, context) {
    if (effect && effect.condition && !this._conditionMet(effect.condition, {
      effect,
      source,
      selectedTargetId,
      context: context || {}
    })) {
      const condition = effect.condition;
      const label = condition.kind === 'fieldTrait'
        ? `フィールド特性〔${condition.key}〕`
        : '発動条件';
      this._log(`${label}が成立していないため、効果は発動しなかった。`, 'condition');
      return { applied: false, reason: 'condition', condition };
    }

    if (effect && effect.type === 'starsPerTurn') {
      const detail = context || {};
      const value = valueAt(effect, detail.level, detail.oc);
      const targets = this._effectTargets(effect, source, selectedTargetId);
      const statuses = targets.map((target) => {
        const status = this._addStatus(target, effect, value, source && source.name);
        this._log(`${target.name}に「毎ターンスター獲得」 ${value}を付与。`);
        return status;
      });
      return { applied: statuses.length > 0, statuses };
    }

    return originalApplyEffect.call(this, effect, source, selectedTargetId, context);
  };

  proto._applyStarsPerTurn = function () {
    let total = 0;
    this.getAliveAllies().forEach((ally) => {
      const amount = this._statusTotal(ally, 'starsPerTurn');
      if (amount <= 0) return;
      total += amount;
      this._log(`${ally.name}の毎ターンスター獲得：${amount}個（次ターン）。`, 'stars');
    });
    if (total > 0) this.state.nextStars = clamp(this.state.nextStars + total, 0, 50);
    return total;
  };

  const originalRunEffectHooks = proto._runEffectHooks;
  proto._runEffectHooks = function (eventName, context) {
    const result = originalRunEffectHooks.call(this, eventName, context);
    if (eventName !== 'turnEnd') return result;
    const starsPerTurn = this._applyStarsPerTurn();
    return result && typeof result === 'object'
      ? { ...result, starsPerTurn }
      : { handled: true, starsPerTurn };
  };

  const originalGetStatusSummary = proto.getStatusSummary;
  proto.getStatusSummary = function (unitId) {
    return originalGetStatusSummary.call(this, unitId).map((status) => {
      if (status.type !== 'starsPerTurn') return status;
      return {
        ...status,
        name: '毎ターンスター獲得',
        statusIcon: status.statusIcon || DATA.statusIcons.starsPerTurn
      };
    });
  };

  DATA.statusIcons.starsPerTurn = DATA.statusIcons.starsPerTurn || 'Stargainup.webp';
  COMMON.statusNames.starsPerTurn = '毎ターンスター獲得';

  const API = {
    conditionKinds: ['fieldTrait', 'all', 'any', 'not'],
    normalizeFieldTraits,
    statusNames: { starsPerTurn: '毎ターンスター獲得' }
  };

  global.FGO_SIM_TURN_FIELD_EFFECTS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
