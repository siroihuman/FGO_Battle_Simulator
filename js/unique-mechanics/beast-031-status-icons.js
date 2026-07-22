(function (global) {
  'use strict';

  const DATA = global.FGO_SIM_DATA ||
    (typeof require !== 'undefined' ? require('../data.js') : null);
  const ENGINE = global.FGO_SIM_ENGINE ||
    (typeof require !== 'undefined' ? require('../engine.js') : null);

  if (typeof require !== 'undefined') require('./beast-031.js');
  if (!DATA || !ENGINE || !ENGINE.BattleEngine) {
    throw new Error('Beast No.031 icon fixes require data and engine.');
  }

  const proto = ENGINE.BattleEngine.prototype;
  if (proto.__beast031StatusIconFixesInstalled) {
    if (typeof module !== 'undefined' && module.exports) module.exports = global.FGO_SIM_BEAST031_STATUS_ICONS;
    return;
  }
  proto.__beast031StatusIconFixesInstalled = true;

  const SERVANT_ID = 'beast031';
  const TYPES = {
    massAttack: 'beast031MassNormalAttack',
    hatred: 'beast031Hatred',
    hatredSpecial: 'beast031HatredSpecial',
    delayedRebellion: 'beast031DelayedRebellionReward',
    slaughter: 'beast031Slaughter'
  };
  const MASS_ATTACK_ICONS = {
    quick: 'Quickall.webp',
    arts: 'Artsall.webp',
    buster: 'Busterall.webp',
    extra: 'Extraattackall.webp'
  };

  // 通常攻撃全体化はカード色ごとに別状態として表示する。
  const servant = DATA.servants && DATA.servants[SERVANT_ID];
  const primordialSin = servant && servant.skills && servant.skills.find((skill) => skill.id === 'primordialSin');
  if (primordialSin && Array.isArray(primordialSin.effects)) {
    primordialSin.effects = primordialSin.effects.flatMap((effect) => {
      if (!effect || effect.type !== TYPES.massAttack || !Array.isArray(effect.cards)) return [effect];
      return effect.cards.map((card) => ({
        ...effect,
        card,
        cards: undefined,
        statusIcon: MASS_ATTACK_ICONS[card] || effect.statusIcon
      }));
    });
  }

  function iconFor(effect, value, source) {
    if (!effect) return null;
    if (effect.type === TYPES.hatred) return 'Burn.webp';
    if (effect.type === TYPES.hatredSpecial) return 'Powerup.webp';
    if (effect.type === TYPES.massAttack) return MASS_ATTACK_ICONS[effect.card] || null;
    if (effect.type === 'debuffResist' && Number(value) < 0 && source === '怨讐の畔 EX') return 'Resistancedown.webp';
    if (effect.type === 'deathResist' && Number(value) < 0) return 'Instaresistdown.webp';
    if (effect.type === 'npGainUp' && source === '鏖殺の獣 EX') return 'Npchargeup.webp';
    if (effect.type === TYPES.slaughter) return 'Buffatk.webp';
    return null;
  }

  const originalAddStatus = proto._addStatus;
  proto._addStatus = function (unit, effect, value, source) {
    const icon = iconFor(effect, value, source);
    const resolved = icon ? { ...effect, statusIcon: icon } : effect;
    return originalAddStatus.call(this, unit, resolved, value, source);
  };

  const originalUseSkill = proto.useSkill;
  proto.useSkill = function (allyId, skillIndex, selectedTargetId, selectedCardType) {
    const actor = this.getUnit(allyId);
    const skill = actor && actor.data && actor.data.skills && actor.data.skills[skillIndex];
    if (!actor || actor.servantId !== SERVANT_ID || !skill || skill.id !== 'eternalSin') {
      return originalUseSkill.call(this, allyId, skillIndex, selectedTargetId, selectedCardType);
    }
    if (this.state.phase !== 'command' || this.state.winner) {
      return { ok: false, reason: '現在はスキルを使用できません。' };
    }
    if (actor.cooldowns[skillIndex] > 0) {
      return { ok: false, reason: `CTが${actor.cooldowns[skillIndex]}残っています。` };
    }

    const level = Math.max(1, Math.min(10, Number(actor.skillLevels[skillIndex] || 10)));
    const selfCharge = [30,32,34,36,38,40,42,44,46,50][level - 1];
    const rewardNp = [25,30,35,40,45,50,55,60,65,75][level - 1];
    const rewardAttack = [30,32,34,36,38,40,42,44,46,50][level - 1];
    actor.cooldowns[skillIndex] = ENGINE.effectiveCooldown(skill.baseCt, level);
    this._addNp(actor, selfCharge, true);

    const donors = this.state.allies.filter((unit) =>
      unit !== actor && unit.alive && unit.frontline &&
      (unit.traits || []).includes('叛逆する者') && unit.np >= 25
    );
    donors.forEach((unit) => {
      unit.np = Math.max(0, unit.np - 25);
      this._addNp(actor, 25, true);
      this._addStatus(unit, {
        type: TYPES.delayedRebellion,
        duration: 1,
        uses: 1,
        rewardNp,
        rewardAttack,
        statusIcon: 'DelayedBuff.webp'
      }, rewardNp, skill.name);
    });
    this._log(`${actor.name}が「${skill.name}」を使用。`, 'skill');
    return { ok: true, absorbed: donors.length };
  };

  const API = { servantId: SERVANT_ID, massAttackIcons: { ...MASS_ATTACK_ICONS } };
  global.FGO_SIM_BEAST031_STATUS_ICONS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
