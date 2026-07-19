(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA || (typeof require !== 'undefined' ? require('./data.js') : null);

  const CLASS_MOD = {
    saber: 1.0, archer: 0.95, lancer: 1.05, rider: 1.0, caster: 0.9,
    assassin: 0.9, berserker: 1.1, shielder: 1.0, ruler: 1.1,
    avenger: 1.1, moonCancer: 1.0, alterEgo: 1.0, foreigner: 1.0,
    pretender: 1.0, beast: 1.0
  };

  const CARD_DAMAGE = {
    quick: [0.8, 0.96, 1.12],
    arts: [1.0, 1.2, 1.4],
    buster: [1.5, 1.8, 2.1]
  };
  const CARD_NP = {
    quick: [1.0, 1.5, 2.0],
    arts: [3.0, 4.5, 6.0],
    buster: [0, 0, 0]
  };
  const CARD_STAR = {
    quick: [0.8, 1.3, 1.8],
    arts: [0, 0, 0],
    buster: [0.1, 0.15, 0.2]
  };
  const NP_CARD_DAMAGE = { quick: 0.8, arts: 1.0, buster: 1.5 };
  const NP_CARD_NP = { quick: 1.0, arts: 3.0, buster: 0 };
  const NP_CARD_STAR = { quick: 0.8, arts: 0, buster: 0.1 };

  const HIT_RATIOS = {
    1: [1],
    2: [1 / 3, 2 / 3],
    3: [1 / 6, 1 / 3, 1 / 2],
    4: [0.1, 0.2, 0.3, 0.4],
    5: [0.066, 0.133, 0.2, 0.266, 0.335],
    6: [0.047, 0.095, 0.142, 0.19, 0.238, 0.288],
    7: [0.036, 0.071, 0.107, 0.143, 0.179, 0.214, 0.25],
    8: [0.028, 0.056, 0.083, 0.111, 0.139, 0.167, 0.194, 0.222],
    9: [0.022, 0.044, 0.067, 0.089, 0.111, 0.133, 0.156, 0.178, 0.2],
    10: [0.018, 0.036, 0.055, 0.073, 0.091, 0.109, 0.127, 0.145, 0.164, 0.182]
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function floor2(value) {
    return Math.floor((Number(value) + 1e-10) * 100) / 100;
  }

  function floor3(value) {
    return Math.floor((Number(value) + 1e-10) * 1000) / 1000;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const TRAIT_ALIASES = {
    servant: 'サーヴァント', divine: '神性', king: '王', humanoid: '人型',
    wildBeast: '猛獣', giant: '超巨大', beastForm: '魔獣型',
    man: '人の力', sky: '天の力', earth: '地の力', star: '星の力', beast: '獣の力'
  };

  function normalizeTrait(value) {
    const raw = String(value == null ? '' : value).trim();
    return TRAIT_ALIASES[raw] || raw;
  }

  function hasTrait(unit, trait) {
    const wanted = normalizeTrait(trait);
    const explicitTraits = (unit.traits || []).map(normalizeTrait);

    // FGOの〔天の力〕〔地の力〕〔人の力〕〔星の力〕〔獣の力〕は、
    // 敵設定では「属性」欄へ入力される。特攻側が特性名で指定されても
    // 属性値と同一のものとして判定する。
    const attributeTrait = normalizeTrait(unit.attribute);
    return explicitTraits.includes(wanted) || attributeTrait === wanted;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(array, rng) {
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function classAffinity(attacker, defender) {
    if (!attacker || !defender) return 1;
    if (defender === 'berserker') {
      if (attacker === 'shielder' || attacker === 'beast') return 1;
      if (attacker === 'berserker') return 1.5;
      return 2;
    }
    if (attacker === 'berserker') {
      if (defender === 'foreigner') return 0.5;
      if (defender === 'shielder' || defender === 'beast') return 1;
      return 1.5;
    }

    const matrix = {
      saber: { lancer: 2, archer: 0.5 },
      archer: { saber: 2, lancer: 0.5 },
      lancer: { archer: 2, saber: 0.5 },
      rider: { caster: 2, assassin: 0.5 },
      caster: { assassin: 2, rider: 0.5 },
      assassin: { rider: 2, caster: 0.5 },
      ruler: { moonCancer: 2, avenger: 0.5 },
      avenger: { ruler: 2, moonCancer: 0.5 },
      moonCancer: { avenger: 2, ruler: 0.5 },
      alterEgo: {
        rider: 1.5, caster: 1.5, assassin: 1.5,
        saber: 0.5, archer: 0.5, lancer: 0.5,
        foreigner: 2, pretender: 2
      },
      pretender: {
        saber: 1.5, archer: 1.5, lancer: 1.5,
        rider: 0.5, caster: 0.5, assassin: 0.5,
        alterEgo: 0.5
      },
      foreigner: { foreigner: 2, alterEgo: 0.5 }
    };
    return matrix[attacker] && matrix[attacker][defender] ? matrix[attacker][defender] : 1;
  }

  function attributeAffinity(attacker, defender) {
    if (!attacker || !defender || attacker === 'neutral' || defender === 'neutral') return 1;
    const strong = { man: 'sky', sky: 'earth', earth: 'man' };
    if (strong[attacker] === defender) return 1.1;
    if (strong[defender] === attacker) return 0.9;
    if ((attacker === 'star' && defender === 'beast') || (attacker === 'beast' && defender === 'star')) return 1.1;
    return 1;
  }

  function enemyStarCorrection(classId) {
    if (['assassin', 'avenger', 'pretender'].includes(classId)) return -0.1;
    if (classId === 'lancer') return -0.05;
    if (['archer', 'alterEgo'].includes(classId)) return 0.05;
    if (classId === 'rider') return 0.1;
    if (classId === 'foreigner') return 0.2;
    return 0;
  }

  function effectiveCooldown(baseCt, skillLevel) {
    return Math.max(1, Number(baseCt) - (skillLevel >= 6 ? 1 : 0) - (skillLevel >= 10 ? 1 : 0));
  }

  function valueAt(effect, level, oc) {
    if (Array.isArray(effect.values)) return Number(effect.values[clamp(level, 1, 10) - 1]);
    if (Array.isArray(effect.ocValues)) return Number(effect.ocValues[clamp(oc || 1, 1, 5) - 1]);
    return Number(effect.value || 0);
  }

  function statusLabel(status) {
    const names = {
      attackUp: '攻撃力アップ', defenseUp: '防御力アップ', cardUp: 'カード性能アップ',
      critUp: 'クリティカル威力アップ', cardCritUp: 'カード限定クリティカル威力アップ',
      starRateUp: 'スター発生率アップ', cardStarWeightUp: 'カード限定スター集中度アップ',
      traitPowerUp: '特性特攻', attributePowerUp: '属性特攻', busterNormalNp: 'Buster通常攻撃時NP増加',
      npPowerUp: '宝具威力アップ', damagePlus: '与ダメージプラス', ocUp: 'OC段階アップ',
      invinciblePierce: '無敵貫通', guts: 'ガッツ', evade: '回避', deathResist: '即死耐性',
      debuffResist: '弱体耐性', mentalResist: '精神異常耐性', critRateDown: 'クリティカル発生率ダウン', critDamageDown: 'クリティカル威力ダウン'
    };
    return names[status.type] || status.type;
  }

  class BattleEngine {
    constructor(config) {
      this.config = deepClone(config || {});
      const seed = Number.isFinite(Number(this.config.seed)) ? Number(this.config.seed) : Date.now();
      this.seed = seed;
      this.rng = mulberry32(seed);
      this.state = {
        turn: 1,
        phase: 'command',
        stars: clamp(this.config.startingStars || 0, 0, 50),
        nextStars: 0,
        selectedEnemyId: null,
        hand: [],
        selectedActions: [],
        allies: [],
        enemies: [],
        deck: [],
        deckCycle: 0,
        logs: [],
        winner: null,
        wave: 1,
        maxWaves: Math.max(1, Math.min(6, (this.config.waves || []).length || 1)),
        mysticCodeCooldowns: [0,0,0]
      };
      this._initialize();
    }

    _initialize() {
      const party = Array.isArray(this.config.party) ? this.config.party : [];
      this.state.allies = party
        .filter((slot) => slot && slot.servantId && DATA.servants[slot.servantId])
        .map((slot, index) => this._createAlly(slot, index));

      const waveConfig = Array.isArray(this.config.waves) && this.config.waves.length ? this.config.waves[0] : null;
      const enemies = waveConfig ? waveConfig.enemies : (Array.isArray(this.config.enemies) ? this.config.enemies : []);
      this.state.enemies = enemies
        .filter((enemy) => enemy && enemy.enabled !== false)
        .map((enemy, index) => this._createEnemy(enemy, index));

      if (!this.state.enemies.length) {
        this.state.enemies.push(this._createEnemy({ name: '訓練用エネミー', hp: 100000 }, 0));
      }
      this.state.selectedEnemyId = this.state.enemies[0].id;
      this._resetDeck();
      this._drawHand();
      this._log(`戦闘開始。乱数シード: ${this.seed}`);
    }

    _createAlly(slot, index) {
      const data = deepClone(DATA.servants[slot.servantId]);
      const skillLevels = data.skills.map((_, skillIndex) => {
        if (Array.isArray(slot.skillLevels)) return clamp(slot.skillLevels[skillIndex] || 10, 1, 10);
        return clamp(slot.skillLevel || 10, 1, 10);
      });
      const ally = {
        id: `ally-${index + 1}`,
        slot: index,
        servantId: data.id,
        data,
        name: data.name,
        classId: data.classId,
        attribute: data.attribute,
        traits: data.traits.slice(),
        maxHp: Number(slot.maxHp || ((data.levelStats||{})[slot.ascension||'max']||{}).hp || data.maxHp) + Number(slot.fouHp||0) + Number((DATA.craftEssences[slot.craftEssenceId] || {}).hp || 0),
        hp: Number(slot.maxHp || ((data.levelStats||{})[slot.ascension||'max']||{}).hp || data.maxHp) + Number(slot.fouHp||0) + Number((DATA.craftEssences[slot.craftEssenceId] || {}).hp || 0),
        atk: Number(slot.atk || ((data.levelStats||{})[slot.ascension||'max']||{}).atk || data.atk) + Number(slot.fouAtk||0) + Number((DATA.craftEssences[slot.craftEssenceId] || {}).atk || 0),
        ascension: slot.ascension || 'max',
        levelLabel: slot.ascension==='120'?'Lv.120':slot.ascension==='100'?'Lv.100':`Lv.${data.maxLevel||90}`,
        fouHp: Number(slot.fouHp||0), fouAtk: Number(slot.fouAtk||0),
        cardEnhancement: {quick:Number(slot.cardEnhanceQuick||0),arts:Number(slot.cardEnhanceArts||0),buster:Number(slot.cardEnhanceBuster||0)},
        craftEssenceId: slot.craftEssenceId || 'none',
        frontline: index < 3,
        np: clamp(slot.startingNp || 0, 0, 300),
        npLevel: clamp(slot.npLevel || 1, 1, 5),
        skillLevels,
        cooldowns: data.skills.map(() => 0),
        statuses: [],
        alive: true
      };
      const ce = DATA.craftEssences[ally.craftEssenceId] || DATA.craftEssences.none;
      (ce.effects || []).forEach((effect) => {
        if (effect.type === 'npCharge') ally.np = clamp(ally.np + Number(effect.value || 0), 0, 300);
        else ally.statuses.push({ ...deepClone(effect), source: ce.name, remaining: effect.duration == null ? -1 : effect.duration, passive: false, uses: effect.uses == null ? null : effect.uses });
      });
      data.passives.forEach((passive) => {
        passive.effects.forEach((effect) => {
          ally.statuses.push({
            ...deepClone(effect),
            source: passive.name,
            remaining: -1,
            passive: true,
            uses: effect.uses == null ? null : effect.uses
          });
        });
      });
      return ally;
    }

    _createEnemy(enemy, index) {
      const maxHp = Math.max(1, Number(enemy.hp || 100000));
      return {
        id: `enemy-${index + 1}`,
        slot: index,
        name: enemy.name || `エネミー${index + 1}`,
        classId: enemy.classId || 'archer',
        attribute: enemy.attribute || 'sky',
        traits: (Array.isArray(enemy.traits) ? enemy.traits : ['サーヴァント', '神性']).map(normalizeTrait),
        maxHp,
        hp: maxHp,
        attack: Math.max(1, Number(enemy.attack || 2500)),
        dtdr: Math.max(0, Number(enemy.dtdr == null ? 1 : enemy.dtdr)),
        deathRate: clamp(enemy.deathRate == null ? 0.2 : enemy.deathRate, 0, 100),
        instantDeathRate: clamp(enemy.instantDeathRate || 0, 0, 1000),
        charge: clamp(enemy.startingCharge || 0, 0, 10),
        chargeMax: clamp(enemy.chargeMax || 3, 1, 10),
        critRate: clamp(enemy.critRate == null ? 10 : enemy.critRate, 0, 100),
        npTarget: enemy.npTarget === 'single' ? 'single' : 'all',
        statuses: [],
        alive: true
      };
    }

    _log(message, kind) {
      this.state.logs.push({ turn: this.state.turn, message: String(message), kind: kind || 'normal' });
      if (this.state.logs.length > 300) this.state.logs.shift();
    }

    getState() {
      return this.state;
    }

    getAliveAllies() {
      return this.state.allies.filter((unit) => unit.frontline && unit.alive && unit.hp > 0);
    }

    getAliveEnemies() {
      return this.state.enemies.filter((unit) => unit.alive && unit.hp > 0);
    }

    getUnit(id) {
      return this.state.allies.concat(this.state.enemies).find((unit) => unit.id === id) || null;
    }

    selectEnemy(enemyId) {
      const enemy = this.state.enemies.find((unit) => unit.id === enemyId && unit.alive);
      if (enemy) this.state.selectedEnemyId = enemy.id;
      return Boolean(enemy);
    }

    _resetDeck() {
      const deck = [];
      this.getAliveAllies().forEach((ally) => {
        ally.data.cards.forEach((card, cardIndex) => {
          deck.push({
            id: `${ally.id}-${card}-${cardIndex}-${this.state.turn}-${Math.floor(this.rng() * 1e9)}`,
            actorId: ally.id,
            card,
            cardIndex,
            randomWeightBonus: 0
          });
        });
      });
      this.state.deck = shuffle(deck, this.rng);
      this.state.deckCycle = 0;
    }

    _drawHand() {
      const aliveIds = new Set(this.getAliveAllies().map((ally) => ally.id));
      if (aliveIds.size === 0) return;
      this.state.deck = this.state.deck.filter((card) => aliveIds.has(card.actorId));
      if (this.state.deck.length < 5) this._resetDeck();
      this.state.hand = this.state.deck.splice(0, 5).filter((card) => aliveIds.has(card.actorId));
      if (this.state.hand.length < 5) {
        this._resetDeck();
        this.state.hand = this.state.deck.splice(0, 5);
      }
      const corrections = shuffle([50, 20, 20, 0, 0], this.rng);
      this.state.hand.forEach((card, index) => { card.randomWeightBonus = corrections[index] || 0; });
      this.state.deckCycle += 1;
      this.state.selectedActions = [];
      this._allocateCriticalStars();
    }

    _cardWeight(card) {
      const ally = this.getUnit(card.actorId);
      if (!ally) return 0;
      const baseWeight = Number(ally.data.starWeight || 0);
      const starUp = this._statusTotal(ally, 'cardStarWeightUp', { card: card.card });
      const concentrationMultiplier = clamp(1 + starUp / 100, 0.001, 500);
      const weight = baseWeight * concentrationMultiplier + Number(card.randomWeightBonus || 0);
      return Math.max(0.01, weight);
    }

    _allocateCriticalStars() {
      const cards = this.state.hand.map((card) => ({ card, weight: this._cardWeight(card), stars: 0 }));
      let available = Math.floor(clamp(this.state.stars, 0, 50));
      while (available > 0 && cards.some((entry) => entry.stars < 10)) {
        const eligible = cards.filter((entry) => entry.stars < 10);
        const totalWeight = eligible.reduce((sum, entry) => sum + entry.weight, 0);
        let cursor = this.rng() * totalWeight;
        let chosen = eligible[eligible.length - 1];
        for (const entry of eligible) {
          cursor -= entry.weight;
          if (cursor <= 0) {
            chosen = entry;
            break;
          }
        }
        chosen.stars += 1;
        available -= 1;
      }
      cards.forEach((entry) => {
        entry.card.assignedStars = entry.stars;
        entry.card.critChance = entry.stars * 10;
      });
    }

    _statusMatches(status, filter) {
      if (!filter) return true;
      if (filter.card && status.card && status.card !== filter.card) return false;
      if (filter.trait && status.trait && status.trait !== filter.trait) return false;
      if (filter.attribute && status.attribute && status.attribute !== filter.attribute) return false;
      return true;
    }

    _statusTotal(unit, type, filter) {
      return (unit.statuses || [])
        .filter((status) => status.type === type && this._statusMatches(status, filter))
        .reduce((sum, status) => sum + Number(status.value || 0), 0);
    }

    _hasStatus(unit, type, filter) {
      return (unit.statuses || []).some((status) => status.type === type && this._statusMatches(status, filter));
    }

    _addStatus(unit, effect, value, source) {
      const status = {
        type: effect.type,
        value: Number(value || 0),
        card: effect.card,
        trait: effect.trait,
        attribute: effect.attribute,
        source: source || '',
        remaining: effect.duration == null ? -1 : Number(effect.duration),
        uses: effect.uses == null ? null : Number(effect.uses),
        debuff: Boolean(effect.debuff),
        statusIcon: effect.statusIcon || null
      };
      unit.statuses.push(status);
      return status;
    }

    _removeExpiredStatuses(unit) {
      unit.statuses = (unit.statuses || []).filter((status) => {
        if (status.remaining < 0) return true;
        if (status.remaining > 0) status.remaining -= 1;
        return status.remaining > 0 && (status.uses == null || status.uses > 0);
      });
    }

    _consumeStatus(unit, status) {
      if (!status || status.uses == null) return;
      status.uses -= 1;
      if (status.uses <= 0) unit.statuses = unit.statuses.filter((entry) => entry !== status);
    }

    _effectTargets(effect, source, selectedTargetId) {
      switch (effect.target) {
        case 'self': return [source];
        case 'selectedAlly': {
          const target = this.state.allies.find((unit) => unit.id === selectedTargetId && unit.alive && unit.frontline);
          return target ? [target] : [];
        }
        case 'selectedEnemy': {
          const target = this.state.enemies.find((unit) => unit.id === selectedTargetId && unit.alive);
          return target ? [target] : [];
        }
        case 'allAllies': return this.getAliveAllies();
        case 'allEnemies': return this.getAliveEnemies();
        case 'party': return this.getAliveAllies();
        default: return [];
      }
    }

    _addNp(unit, amount, snapNearFull) {
      if (!unit || unit.np == null) return;
      const before = Number(unit.np || 0);
      let after = clamp(before + Number(amount || 0), 0, 300);
      if (snapNearFull !== false && amount > 0) {
        const lowerGauge = Math.floor(after / 100) * 100;
        const nextGauge = Math.ceil(after / 100) * 100;
        if (after >= lowerGauge + 99 && after < nextGauge) after = nextGauge;
      }
      unit.np = floor2(after);
    }

    _applyEffect(effect, source, selectedTargetId, context) {
      const oc = context && context.oc ? context.oc : 1;
      const level = context && context.level ? context.level : 10;
      const value = valueAt(effect, level, oc);
      const targets = this._effectTargets(effect, source, selectedTargetId);

      if (effect.type === 'stars') {
        this.state.stars = clamp(this.state.stars + value, 0, 50);
        this._allocateCriticalStars();
        this._log(`スターを${value}個獲得。`);
        return;
      }

      targets.forEach((target) => {
        switch (effect.type) {
          case 'npCharge':
            if (target.np != null) {
              this._addNp(target, value, true);
              this._log(`${target.name}のNPが${value}%増加。`);
            }
            break;
          case 'cooldownReduce':
            target.cooldowns = target.cooldowns.map((ct) => Math.max(0, ct - value));
            this._log(`${target.name}のスキルチャージを${value}進めた。`);
            break;
          case 'hpLoss': {
            const minimum = effect.nonLethal ? 1 : 0;
            target.hp = Math.max(minimum, target.hp - value);
            this._log(`${target.name}のHPが${value}減少。`, 'damage');
            break;
          }
          case 'addTrait':
            if (!hasTrait(target, effect.trait)) target.traits.push(normalizeTrait(effect.trait));
            this._log(`${target.name}に〔${effect.trait}〕特性を付与。`);
            break;
          case 'debuffClear':
            target.statuses = target.statuses.filter(s=>!s.debuff);
            this._log(`${target.name}の弱体状態を解除。`);
            break;
          case 'enemyChargeDown':
            target.charge = Math.max(0, target.charge - value);
            this._log(`${target.name}のチャージを${value}減少。`);
            break;
          default:
            this._addStatus(target, effect, value, source.name);
            this._log(`${target.name}に「${statusLabel(effect)}」${value ? ` ${value}` : ''}を付与。`);
            break;
        }
      });
    }

    useSkill(allyId, skillIndex, selectedTargetId) {
      if (this.state.phase !== 'command' || this.state.winner) return { ok: false, reason: '現在はスキルを使用できません。' };
      const ally = this.state.allies.find((unit) => unit.id === allyId && unit.alive);
      if (!ally) return { ok: false, reason: '使用者が戦闘不能です。' };
      const skill = ally.data.skills[skillIndex];
      if (!skill) return { ok: false, reason: 'スキルがありません。' };
      if (ally.cooldowns[skillIndex] > 0) return { ok: false, reason: `CTが${ally.cooldowns[skillIndex]}残っています。` };

      if (skill.target === 'ally') {
        const target = this.state.allies.find((unit) => unit.id === selectedTargetId && unit.alive && unit.frontline);
        if (!target) return { ok: false, reason: '味方の対象を選択してください。' };
      }
      if (skill.target === 'enemy') {
        const target = this.state.enemies.find((unit) => unit.id === selectedTargetId && unit.alive);
        if (!target) return { ok: false, reason: '敵の対象を選択してください。' };
      }

      const level = ally.skillLevels[skillIndex];
      ally.cooldowns[skillIndex] = effectiveCooldown(skill.baseCt, level);
      this._log(`${ally.name}が「${skill.name}」を使用。`, 'skill');
      skill.effects.forEach((effect) => this._applyEffect(effect, ally, selectedTargetId, { level }));
      if (skill.effects.some((effect) => effect.type === 'cardStarWeightUp')) this._allocateCriticalStars();
      return { ok: true };
    }

    toggleCard(cardId) {
      if (this.state.phase !== 'command' || this.state.winner) return false;
      const existingIndex = this.state.selectedActions.findIndex((action) => action.type === 'card' && action.cardId === cardId);
      if (existingIndex >= 0) {
        this.state.selectedActions.splice(existingIndex, 1);
        return true;
      }
      if (this.state.selectedActions.length >= 3) return false;
      const card = this.state.hand.find((entry) => entry.id === cardId);
      if (!card) return false;
      const actor = this.getUnit(card.actorId);
      if (!actor || !actor.alive) return false;
      this.state.selectedActions.push({ type: 'card', cardId: card.id, actorId: card.actorId, card: card.card });
      return true;
    }

    toggleNp(allyId) {
      if (this.state.phase !== 'command' || this.state.winner) return false;
      const existingIndex = this.state.selectedActions.findIndex((action) => action.type === 'np' && action.actorId === allyId);
      if (existingIndex >= 0) {
        this.state.selectedActions.splice(existingIndex, 1);
        return true;
      }
      if (this.state.selectedActions.length >= 3) return false;
      const ally = this.state.allies.find((unit) => unit.id === allyId && unit.alive);
      if (!ally || ally.np < 100) return false;
      this.state.selectedActions.push({ type: 'np', actorId: ally.id, card: ally.data.np.card });
      return true;
    }

    clearSelection() {
      this.state.selectedActions = [];
    }

    _traitPower(actor, target) {
      let total = 0;
      actor.statuses.forEach((status) => {
        if (status.type === 'traitPowerUp' && hasTrait(target, status.trait)) total += Number(status.value || 0);
        if (status.type === 'attributePowerUp' && target.attribute === status.attribute) total += Number(status.value || 0);
      });
      return total;
    }

    _npSpecialMultiplier(np, target) {
      if (!np.special) return 1;
      if (np.special.kind === 'attribute' && target.attribute === np.special.key) return Number(np.special.multiplier || 1);
      if (np.special.kind === 'trait' && hasTrait(target, np.special.key)) { const oc=Math.max(1,Math.min(5,this._currentNpOc||1)); return Number((np.special.ocMultipliers||[])[oc-1] || np.special.multiplier || 1); }
      return 1;
    }

    _randomDamageFactor() {
      return (900 + Math.floor(this.rng() * 200)) / 1000;
    }

    _calculateAttackTotal(actor, target, action, chainContext) {
      const isNp = action.type === 'np';
      const isExtra = action.type === 'extra';
      const card = action.card;
      const position = clamp(action.position || 0, 0, 2);

      // A枠：ATK × 攻撃倍率 × カード項 × クラス補正 × クラス相性
      //      × 属性相性 × 乱数補正 × 攻撃補正0.23
      const attackMultiplier = isNp ? actor.data.np.multipliers[actor.npLevel - 1] / 100 : 1;
      const cardMod = isExtra ? 1 : (isNp ? NP_CARD_DAMAGE[card] : CARD_DAMAGE[card][position]);
      const cardUp = this._statusTotal(actor, 'cardUp', { card }) / 100;
      const cardResist = this._statusTotal(target, 'cardResist', { card }) / 100;
      const cardPerformanceTerm = clamp(1 + cardUp - cardResist, 0, 5);
      const firstAtkBonus = !isNp && chainContext.firstBonuses.buster ? 0.5 : 0;
      const cardTerm = Math.max(0, cardMod * cardPerformanceTerm + firstAtkBonus);
      const classMod = CLASS_MOD[actor.classId] || 1;
      const classAdv = classAffinity(actor.classId, target.classId);
      const attrAdv = attributeAffinity(actor.attribute, target.attribute);
      const random = this._randomDamageFactor();

      // B枠：攻撃力・防御力 × クリティカル × Extra × 特殊耐性
      const attackUp = this._statusTotal(actor, 'attackUp') / 100;
      const defenseUp = this._statusTotal(target, 'defenseUp') / 100;
      const attackDefenseTerm = clamp(1 + attackUp - defenseUp, 0, 5);
      const critical = Boolean(action.critical) && !isNp && !isExtra;
      const critFactor = critical ? 2 : 1;
      const extraFactor = isExtra ? Number(action.extraBonus || 2) : 1;
      const specialResistance = clamp(1 - this._statusTotal(target, 'specialResistance') / 100, 0, 5);

      // C枠：特攻状態・被ダメージ変化・クリ威力・宝具威力は加算
      const traitPower = this._traitPower(actor, target) / 100;
      const damageTaken = this._statusTotal(target, 'damageTakenUp') / 100;
      const critPower = critical
        ? (this._statusTotal(actor, 'critUp') + this._statusTotal(actor, 'cardCritUp', { card })) / 100
        : 0;
      const npPower = isNp ? this._statusTotal(actor, 'npPowerUp') / 100 : 0;
      const cTerm = Math.max(0.001, 1 + traitPower + damageTaken + critPower + npPower);

      // D枠：宝具固有特攻はC枠とは別に乗算
      const npSpecial = isNp ? this._npSpecialMultiplier(actor.data.np, target) : 1;

      // E枠：固定与ダメージは最終加算。Busterチェインは通常攻撃のみ。
      const fixedDamage = this._statusTotal(actor, 'damagePlus') + this._statusTotal(target, 'damageTakenPlus');
      const commandAtk = (!isNp && !isExtra) ? Number((actor.cardEnhancement || {})[card] || 0) : 0;
      const effectiveAtk = actor.atk + commandAtk;
      const busterChainBonus = !isNp && !isExtra && chainContext.busterChain ? effectiveAtk * 0.2 : 0;

      const a = effectiveAtk * attackMultiplier * cardTerm * classMod * classAdv * attrAdv * random * 0.23;
      const b = attackDefenseTerm * critFactor * extraFactor * specialResistance;
      const damage = a * b * cTerm * npSpecial + fixedDamage + busterChainBonus;
      return Math.floor(Math.max(0, damage));
    }

    getDamageRange(actorId, targetId, action) {
      const actor = this.getUnit(actorId);
      const target = this.getUnit(targetId);
      if (!actor || !target) return null;
      const originalRng = this.rng;
      const factors = [0.9, 1.099];
      const values = factors.map((factor) => {
        this.rng = () => (factor - 0.9) / 0.2;
        return this._calculateAttackTotal(actor, target, action, { firstBonuses: { buster:false }, busterChain:false });
      });
      this.rng = originalRng;
      return { min: values[0], max: values[1] };
    }

    _hitRatios(hitCount) {
      if (HIT_RATIOS[hitCount]) return HIT_RATIOS[hitCount];
      const sum = (hitCount * (hitCount + 1)) / 2;
      return Array.from({ length: hitCount }, (_, index) => (index + 1) / sum);
    }

    _cardNpPerHit(actor, target, action, chainContext, overkill) {
      const isNp = action.type === 'np';
      const isExtra = action.type === 'extra';
      const card = action.card;
      const position = clamp(action.position || 0, 0, 2);
      const cardNp = isExtra ? 1 : (isNp ? NP_CARD_NP[card] : CARD_NP[card][position]);
      const cardUp = this._statusTotal(actor, 'cardUp', { card }) / 100;
      const cardResist = this._statusTotal(target, 'cardResist', { card }) / 100;
      const firstArts = !isNp && chainContext.firstBonuses.arts ? 1 : 0;
      const npGainUp = this._statusTotal(actor, 'npGainUp') / 100;
      const crit = action.critical && !isNp && !isExtra ? 2 : 1;
      const base = floor2(actor.data.na * (cardNp * (Math.min(5, 1 + cardUp) - cardResist) + firstArts) * target.dtdr * Math.min(5, 1 + npGainUp) * crit);
      return base * (overkill ? 1.5 : 1);
    }

    _starRatePerHit(actor, target, action, chainContext, overkill) {
      const isNp = action.type === 'np';
      const isExtra = action.type === 'extra';
      const card = action.card;
      const position = clamp(action.position || 0, 0, 2);
      const cardStar = isExtra ? 1 : (isNp ? NP_CARD_STAR[card] : CARD_STAR[card][position]);
      const cardUp = this._statusTotal(actor, 'cardUp', { card }) / 100;
      const cardResist = this._statusTotal(target, 'cardResist', { card }) / 100;
      const firstQuick = !isNp && chainContext.firstBonuses.quick ? 0.2 : 0;
      const starBuff = this._statusTotal(actor, 'starRateUp') / 100;
      const crit = action.critical && !isNp && !isExtra ? 0.2 : 0;
      const overkillBonus = overkill ? 0.3 : 0;
      const baseRate = actor.data.starRate / 100 + cardStar * (Math.min(5, 1 + cardUp) - cardResist) + firstQuick + enemyStarCorrection(target.classId) + starBuff + crit;
      return clamp(floor3(baseRate) + overkillBonus, 0, 3);
    }

    _rollStars(rate) {
      const guaranteed = Math.floor(rate);
      const fractional = rate - guaranteed;
      return Math.min(3, guaranteed + (this.rng() < fractional ? 1 : 0));
    }

    _takeDamage(unit, amount, sourceLabel) {
      if (!unit.alive) return { damage: 0, guts: false };
      const damage = Math.max(0, Math.floor(amount));
      unit.hp -= damage;
      let guts = false;
      if (unit.hp <= 0) {
        const gutsStatus = unit.statuses.find((status) => status.type === 'guts' && (status.uses == null || status.uses > 0));
        if (gutsStatus) {
          unit.hp = Math.max(1, Number(gutsStatus.value || 1));
          this._consumeStatus(unit, gutsStatus);
          guts = true;
          this._log(`${unit.name}のガッツが発動し、HP${unit.hp}で復活。`, 'heal');
        } else {
          unit.hp = 0;
          unit.alive = false;
          this._log(`${unit.name}は戦闘不能。${sourceLabel ? `（${sourceLabel}）` : ''}`, 'death');
        }
      }
      return { damage, guts };
    }

    _resolveAttackOnTarget(actor, target, action, chainContext) {
      if (!actor.alive || !target.alive) return { damage: 0, np: 0, stars: 0 };
      const total = this._calculateAttackTotal(actor, target, action, chainContext);
      const hitCount = action.type === 'np' ? actor.data.np.hits : (action.type === 'extra' ? actor.data.hits.extra : actor.data.hits[action.card]);
      const ratios = this._hitRatios(hitCount);
      let resolvedDamage = 0;
      let actualHpDamage = 0;
      let npGain = 0;
      let stars = 0;
      ratios.forEach((ratio, index) => {
        // 表示・ログ用ダメージは、対象が途中Hitで戦闘不能になっても全Hit分を合計する。
        // FGOでは宝具の総ダメージ表示が敵の残HPで打ち切られないため、
        // 実際に減少したHP量(actualHpDamage)とは分けて管理する。
        const hitDamage = index === ratios.length - 1
          ? Math.max(0, total - resolvedDamage)
          : Math.floor(total * ratio);
        const overkill = !target.alive || target.hp <= hitDamage;
        resolvedDamage += hitDamage;

        if (target.alive) {
          const hpBefore = Math.max(0, target.hp);
          this._takeDamage(target, hitDamage, actor.name);
          actualHpDamage += Math.min(hitDamage, hpBefore);
        }

        npGain += this._cardNpPerHit(actor, target, action, chainContext, overkill);
        stars += this._rollStars(this._starRatePerHit(actor, target, action, chainContext, overkill));
      });
      return { damage: resolvedDamage, actualHpDamage, np: floor2(npGain), stars };
    }

    _currentEnemyTarget() {
      let target = this.state.enemies.find((enemy) => enemy.id === this.state.selectedEnemyId && enemy.alive);
      if (!target) target = this.getAliveEnemies()[0] || null;
      if (target) this.state.selectedEnemyId = target.id;
      return target;
    }

    _calculateOc(actor, precedingNps) {
      const gaugeOc = clamp(Math.floor(actor.np / 100), 1, 3);
      const ocStatus = actor.statuses.find((status) => status.type === 'ocUp' && (status.uses == null || status.uses > 0));
      const ocBonus = ocStatus ? Number(ocStatus.value || 0) : 0;
      const result = clamp(gaugeOc + precedingNps + ocBonus, 1, 5);
      if (ocStatus) this._consumeStatus(actor, ocStatus);
      return result;
    }

    _executeNp(action, chainContext, precedingNps) {
      const actor = this.getUnit(action.actorId);
      if (!actor || !actor.alive || actor.np < 100) return;
      const np = actor.data.np;
      const oc = this._calculateOc(actor, precedingNps);
      this._currentNpOc = oc;
      actor.np = Math.max(0, actor.np - 100);
      this._log(`${actor.name} 宝具「${np.name}」 OC${oc}。`, 'np');
      (np.before || []).forEach((raw) => { const effect={...raw}; if(Array.isArray(effect.npLevelValues)) effect.value=effect.npLevelValues[actor.npLevel-1]; this._applyEffect(effect, actor, actor.id, { oc, level: 10 }); });

      const targets = np.target === 'support' ? [] : (np.target === 'allEnemies' ? this.getAliveEnemies().slice() : [this._currentEnemyTarget()].filter(Boolean));
      let totalDamage = 0;
      let totalStars = 0;
      targets.forEach((target) => {
        const result = this._resolveAttackOnTarget(actor, target, { ...action, type: 'np', card: np.card, position: 0, critical: false }, chainContext);
        totalDamage += result.damage;
        totalStars += result.stars;
        this._addNp(actor, result.np, false);
        this._log(`${target.name}に${result.damage.toLocaleString('ja-JP')}ダメージ。`, 'damage');
      });
      this.state.nextStars += totalStars;
      (np.after || []).forEach((raw) => { const effect={...raw}; if(Array.isArray(effect.npLevelValues)) effect.value=effect.npLevelValues[actor.npLevel-1]; this._applyEffect(effect, actor, this.state.selectedEnemyId, { oc, level: 10 }); });
      if (totalStars) this._log(`宝具でスターを${totalStars}個獲得（次ターン）。`);
    }

    _executeCard(action, chainContext) {
      const actor = this.getUnit(action.actorId);
      const card = this.state.hand.find((entry) => entry.id === action.cardId);
      const target = this._currentEnemyTarget();
      if (!actor || !actor.alive || !card || !target) return;
      const quickFirstCritBonus = chainContext.firstBonuses.quick ? 20 : 0;
      const effectiveCritChance = clamp(Number(card.critChance || 0) + quickFirstCritBonus, 0, 100);
      const critical = this.rng() * 100 < effectiveCritChance;
      const resolvedAction = { ...action, type: 'card', card: card.card, critical };
      const result = this._resolveAttackOnTarget(actor, target, resolvedAction, chainContext);
      this._addNp(actor, result.np, false);
      this.state.nextStars += result.stars;
      const critText = critical ? ' CRITICAL' : '';
      this._log(`${actor.name}の${card.card.toUpperCase()}攻撃${critText}：${result.damage.toLocaleString('ja-JP')}ダメージ／NP+${result.np.toFixed(2)}／スター${result.stars}。`, critical ? 'critical' : 'damage');
      actor.statuses.filter(s=>s.type==='onAttackAddTrait').forEach(s=>{ if(this.rng()*100<Number(s.chance||60) && !hasTrait(target,s.trait)){target.traits.push(normalizeTrait(s.trait));this._log(`${target.name}に〔${s.trait}〕特性を付与。`);}});

      if (card.card === 'buster') {
        const extraNp = this._statusTotal(actor, 'busterNormalNp');
        if (extraNp > 0) {
          this._addNp(actor, extraNp, true);
          this._log(`${actor.name}はBuster通常攻撃時効果でNP+${extraNp}%。`);
        }
      }
    }

    _executeExtra(actorId, chainContext, selectedActions) {
      const actor = this.getUnit(actorId);
      const target = this._currentEnemyTarget();
      if (!actor || !actor.alive || !target) return;
      const cardTypes = selectedActions.map((action) => action.card);
      const sameType = cardTypes.every((card) => card === cardTypes[0]);
      const result = this._resolveAttackOnTarget(actor, target, {
        type: 'extra', actorId, card: 'extra', position: 0, critical: false, extraBonus: sameType ? 3.5 : 2
      }, chainContext);
      this._addNp(actor, result.np, false);
      this.state.nextStars += result.stars;
      this._log(`${actor.name}のExtra Attack：${result.damage.toLocaleString('ja-JP')}ダメージ／NP+${result.np.toFixed(2)}／スター${result.stars}。`, 'extra');
    }

    _promoteReserve() {
      while (this.getAliveAllies().length < 3) {
        const reserve = this.state.allies.find((unit) => unit.alive && unit.hp > 0 && !unit.frontline);
        if (!reserve) break;
        reserve.frontline = true;
        this._log(`${reserve.name}が控えから登場。`, 'turn');
      }
      this._resetDeck();
      this._drawHand();
    }

    _startNextWave() {
      const waves = Array.isArray(this.config.waves) ? this.config.waves : [];
      if (this.state.wave >= waves.length) return false;
      this.state.wave += 1;
      const wave = waves[this.state.wave - 1];
      this.state.enemies = (wave.enemies || []).filter((e)=>e.enabled !== false).map((e,i)=>this._createEnemy(e,i));
      this.state.selectedEnemyId = this.state.enemies[0] ? this.state.enemies[0].id : null;
      this._log(`WAVE ${this.state.wave} 開始。`, 'turn');
      return true;
    }

    getReserveAllies() { return this.state.allies.filter((u)=>u.alive && u.hp>0 && !u.frontline); }

    orderChange(frontId, reserveId) {
      const front=this.state.allies.find((u)=>u.id===frontId&&u.frontline&&u.alive);
      const reserve=this.state.allies.find((u)=>u.id===reserveId&&!u.frontline&&u.alive);
      if(!front||!reserve) return {ok:false,reason:'入れ替え対象が不正です。'};
      front.frontline=false; reserve.frontline=true;
      this._resetDeck(); this._drawHand();
      this._log(`${front.name}と${reserve.name}をオーダーチェンジ。`,'skill');
      return {ok:true};
    }

    getMysticCode() { return DATA.mysticCodes[this.config.mysticCodeId] || DATA.mysticCodes.chaldea; }
    getMysticSkillTargetType(index) { const s=this.getMysticCode().skills[index]; return s?s.target:null; }
    useMysticSkill(index, selectedTargetId) {
      if(this.state.phase!=='command'||this.state.winner) return {ok:false,reason:'現在は使用できません。'};
      const skill=this.getMysticCode().skills[index]; if(!skill) return {ok:false,reason:'スキルがありません。'};
      if(this.state.mysticCodeCooldowns[index]>0) return {ok:false,reason:'CT中です。'};
      if(skill.target==='orderChange') return {ok:false,orderChange:true};
      const dummy={id:'master',name:this.getMysticCode().name};
      for(const effect of skill.effects){
        const value=valueAt(effect, clamp(this.config.mysticCodeLevel||10,1,10),1);
        const targets=this._effectTargets(effect,dummy,selectedTargetId);
        if(effect.type==='stars'){this.state.stars=clamp(this.state.stars+value,0,50);this._allocateCriticalStars();continue;}
        for(const unit of targets){
          if(effect.type==='heal'){unit.hp=Math.min(unit.maxHp,unit.hp+value);continue;}
          if(effect.type==='npCharge'){this._addNp(unit,value,true);continue;}
          if(effect.type==='cooldownReduce'){unit.cooldowns=unit.cooldowns.map(ct=>Math.max(0,ct-value));continue;}
          if(effect.type==='debuffClear'){unit.statuses=unit.statuses.filter(st=>!st.debuff);continue;}
          if(effect.type==='attackDebuffClear'){unit.statuses=unit.statuses.filter(st=>!(st.debuff&&['attackUp','npPowerUp','cardUp','critUp'].includes(st.type)));continue;}
          this._addStatus(unit,effect,value,skill.name);
        }
      }
      this.state.mysticCodeCooldowns[index]=effectiveCooldown(skill.baseCt,clamp(this.config.mysticCodeLevel||10,1,10));
      this._log(`${this.getMysticCode().name}「${skill.name}」を使用。`,'skill');
      return {ok:true};
    }

    executeCommandChain() {
      if (this.state.phase !== 'command' || this.state.winner) return { ok: false, reason: 'コマンドフェイズではありません。' };
      if (this.state.selectedActions.length !== 3) return { ok: false, reason: 'コマンドカードまたは宝具を3枚選択してください。' };
      const selected = this.state.selectedActions.map((action, index) => ({ ...action, position: index }));
      for (const action of selected) {
        if (action.type === 'np') {
          const ally = this.getUnit(action.actorId);
          if (!ally || ally.np < 100) return { ok: false, reason: 'NPが不足しています。' };
        }
      }

      this.state.phase = 'playerAttack';
      const cardTypes = selected.map((action) => action.card);
      const uniqueTypes = new Set(cardTypes);
      const mighty = uniqueTypes.size === 3;
      const firstCard = cardTypes[0];
      const chainContext = {
        firstBonuses: {
          buster: mighty || firstCard === 'buster',
          arts: mighty || firstCard === 'arts',
          quick: mighty || firstCard === 'quick'
        },
        busterChain: cardTypes.every((card) => card === 'buster'),
        artsChain: cardTypes.every((card) => card === 'arts'),
        quickChain: cardTypes.every((card) => card === 'quick'),
        mighty
      };

      if (chainContext.busterChain) this._log('Buster CHAIN：通常攻撃にBusterチェインボーナス。', 'chain');
      if (chainContext.artsChain) this._log('Arts CHAIN成立。', 'chain');
      if (chainContext.quickChain) this._log('Quick CHAIN成立。', 'chain');
      if (chainContext.mighty) this._log('Mighty CHAIN：3種の1stボーナスが有効。', 'chain');

      let precedingNps = 0;
      selected.forEach((action) => {
        if (!this.getAliveEnemies().length) return;
        if (action.type === 'np') {
          this._executeNp(action, chainContext, precedingNps);
          precedingNps += 1;
        } else {
          this._executeCard(action, chainContext);
        }
      });

      if (chainContext.artsChain) {
        const participants = [...new Set(selected.map((action) => action.actorId))];
        participants.forEach((id) => {
          const ally = this.getUnit(id);
          if (ally && ally.alive) this._addNp(ally, 20, true);
        });
        this._log('Arts CHAIN効果：参加者のNPが20%増加。', 'chain');
      }
      if (chainContext.quickChain) {
        this.state.nextStars += 20;
        this._log('Quick CHAIN効果：スター20個獲得（次ターン）。', 'chain');
      }

      const sameActor = selected.every((action) => action.actorId === selected[0].actorId);
      if (sameActor && this.getAliveEnemies().length) this._executeExtra(selected[0].actorId, chainContext, selected);

      if (!this.getAliveEnemies().length) {
        if (this._startNextWave()) { this._finishTurn(); return { ok: true, finished: false }; }
        this.state.winner = 'allies';
        this.state.phase = 'finished';
        this._log('勝利。', 'victory');
        return { ok: true, finished: true };
      }

      this._performEnemyTurn();
      return { ok: true, finished: Boolean(this.state.winner) };
    }

    _enemyAttackDamage(enemy, ally, isNp, critical) {
      const base = enemy.attack * (isNp ? 2.5 : 1);
      const classAdv = classAffinity(enemy.classId, ally.classId);
      const attrAdv = attributeAffinity(enemy.attribute, ally.attribute);
      const attackUp = this._statusTotal(enemy, 'attackUp') / 100;
      const defenseUp = this._statusTotal(ally, 'defenseUp') / 100;
      const critDown = this._statusTotal(enemy, 'critDamageDown') / 100;
      const critFactor = critical ? Math.max(1, 2 - critDown) : 1;
      return Math.floor(base * classAdv * attrAdv * this._randomDamageFactor() * Math.max(0, 1 + attackUp - defenseUp) * critFactor);
    }

    _canAvoid(ally, enemy, isNp) {
      if (this._hasStatus(enemy, 'invinciblePierce')) return false;
      const evade = ally.statuses.find((status) => status.type === 'evade');
      if (evade) return true;
      const invincible = ally.statuses.find((status) => status.type === 'invincible');
      return Boolean(invincible);
    }

    _applyInstantDeath(enemy, ally) {
      if (!enemy.instantDeathRate || !ally.alive) return false;
      const deathResist = this._statusTotal(ally, 'deathResist') / 100;
      const deathSuccess = (enemy.instantDeathRate / 100) * (ally.data.deathRate / 100) * Math.max(0, 1 - deathResist);
      if (this.rng() < deathSuccess) {
        this._log(`${enemy.name}の即死効果が${ally.name}に成功（成功率${(deathSuccess * 100).toFixed(2)}%）。`, 'death');
        ally.hp = 0;
        const gutsStatus = ally.statuses.find((status) => status.type === 'guts' && (status.uses == null || status.uses > 0));
        if (gutsStatus) {
          ally.hp = Math.max(1, Number(gutsStatus.value || 1));
          this._consumeStatus(ally, gutsStatus);
          this._log(`${ally.name}はガッツで復活。`, 'heal');
        } else {
          ally.alive = false;
        }
        return true;
      }
      this._log(`${enemy.name}の即死効果は${ally.name}に失敗（成功率${(deathSuccess * 100).toFixed(2)}%）。`);
      return false;
    }

    _performEnemyTurn() {
      this.state.phase = 'enemy';
      this._log('敵フェイズ。', 'enemy');
      const enemies = this.getAliveEnemies().slice();
      for (const enemy of enemies) {
        if (!this.getAliveAllies().length) break;
        const isNp = enemy.charge >= enemy.chargeMax;
        const targets = isNp && enemy.npTarget === 'all'
          ? this.getAliveAllies().slice()
          : [this.getAliveAllies()[Math.floor(this.rng() * this.getAliveAllies().length)]];
        if (isNp) {
          enemy.charge = 0;
          this._log(`${enemy.name}が宝具を使用。`, 'enemyNp');
        }
        targets.forEach((ally) => {
          if (!ally || !ally.alive) return;
          if (this._canAvoid(ally, enemy, isNp)) {
            this._log(`${ally.name}は${enemy.name}の攻撃を回避。`, 'evade');
            return;
          }
          const critRateDown = this._statusTotal(enemy, 'critRateDown');
          const critical = !isNp && this.rng() * 100 < Math.max(0, enemy.critRate - critRateDown);
          const damage = this._enemyAttackDamage(enemy, ally, isNp, critical);
          this._takeDamage(ally, damage, enemy.name);
          if (ally.alive) {
            const receivedHits = isNp ? 3 : 1;
            const receivedNp = floor2(ally.data.nd * receivedHits);
            ally.np = clamp(ally.np + receivedNp, 0, 300);
            this._log(`${ally.name}は${damage.toLocaleString('ja-JP')}ダメージ${critical ? '（CRITICAL）' : ''}、被ダメージNP+${receivedNp.toFixed(2)}。`, critical ? 'critical' : 'damage');
            if (isNp) this._applyInstantDeath(enemy, ally);
          }
        });
        if (!isNp && enemy.alive) enemy.charge = Math.min(enemy.chargeMax, enemy.charge + 1);
      }

      if (!this.getAliveAllies().length) {
        this._promoteReserve();
      }
      if (!this.getAliveAllies().length) {
        this.state.winner = 'enemies';
        this.state.phase = 'finished';
        this._log('敗北。', 'defeat');
        return;
      }
      this._finishTurn();
    }

    _finishTurn() {
      this.state.mysticCodeCooldowns = this.state.mysticCodeCooldowns.map((ct)=>Math.max(0,ct-1));
      this.state.allies.forEach((ally) => {
        if (ally.alive) {
          const npPerTurn = this._statusTotal(ally, 'npPerTurn');
          if (npPerTurn) { this._addNp(ally, npPerTurn, true); this._log(`${ally.name}のNPが毎ターン効果で${npPerTurn}%増加。`); }
        }
        ally.cooldowns = ally.cooldowns.map((ct) => Math.max(0, ct - 1));
        this._removeExpiredStatuses(ally);
      });
      this.state.enemies.forEach((enemy) => {
        if (enemy.alive) {
          const poison = this._statusTotal(enemy, 'poison');
          if (poison > 0) { this._takeDamage(enemy, poison, '毒'); this._log(`${enemy.name}に毒ダメージ${Math.floor(poison).toLocaleString('ja-JP')}。`, 'damage'); }
        }
        this._removeExpiredStatuses(enemy);
      });
      this.state.stars = clamp(this.state.nextStars, 0, 50);
      this.state.nextStars = 0;
      this.state.turn += 1;
      this.state.phase = 'command';
      if (this.state.deckCycle >= 3 || this.state.deck.length < 5) this._resetDeck();
      this._drawHand();
      this._log(`TURN ${this.state.turn} 開始。スター${this.state.stars}個。`, 'turn');
    }

    getSkillTargetType(allyId, skillIndex) {
      const ally = this.getUnit(allyId);
      const skill = ally && ally.data.skills[skillIndex];
      return skill ? skill.target : null;
    }

    getStatusSummary(unitId) {
      const unit = this.getUnit(unitId);
      if (!unit) return [];
      return unit.statuses.map((status) => ({
        type: status.type,
        name: statusLabel(status),
        value: status.value,
        card: status.card,
        trait: status.trait,
        attribute: status.attribute,
        remaining: status.remaining,
        uses: status.uses,
        source: status.source,
        passive: Boolean(status.passive),
        debuff: Boolean(status.debuff),
        statusIcon: status.statusIcon || null
      }));
    }
  }

  const API = {
    BattleEngine,
    classAffinity,
    attributeAffinity,
    effectiveCooldown,
    floor2,
    floor3,
    constants: { CLASS_MOD, CARD_DAMAGE, CARD_NP, CARD_STAR, HIT_RATIOS }
  };

  global.FGO_SIM_ENGINE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
