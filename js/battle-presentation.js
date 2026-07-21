(function (global) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const servantKey = (unit) => unit && (unit.servantId || (unit.data && unit.data.id) || unit.name || unit.id);

  function positionLabel(unit) {
    if (!unit) return '';
    const slot = Number(unit.slot || 0);
    if (unit.frontline) return `前衛${slot + 1}`;
    return `控え${Math.max(1, slot - 2)}`;
  }

  function duplicateIdentity(state, unit) {
    if (!state || !unit) return null;
    const key = servantKey(unit);
    const matches = (state.allies || [])
      .filter((entry) => servantKey(entry) === key)
      .slice()
      .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
    if (matches.length < 2) return null;
    const index = Math.max(0, matches.findIndex((entry) => entry.id === unit.id));
    return {
      index: index + 1,
      count: matches.length,
      label: `同名${index + 1}`,
      position: positionLabel(unit),
      className: `duplicate-tone-${(index % 6) + 1}`
    };
  }

  function unitSnapshot(unit, side, wave) {
    return {
      id: unit.id,
      side,
      wave: Number(wave || 1),
      name: unit.name,
      servantId: unit.servantId || (unit.data && unit.data.id) || null,
      slot: Number(unit.slot || 0),
      frontline: Boolean(unit.frontline),
      alive: Boolean(unit.alive),
      hp: Math.max(0, Number(unit.hp || 0)),
      maxHp: Math.max(1, Number(unit.maxHp || 1)),
      np: side === 'ally' ? Math.max(0, Number(unit.np || 0)) : null
    };
  }

  function snapshot(state) {
    const wave = Number(state.wave || 1);
    const allies = (state.allies || []).map((unit) => unitSnapshot(unit, 'ally', wave));
    const enemies = (state.enemies || []).map((unit) => unitSnapshot(unit, 'enemy', wave));
    const units = new Map();
    allies.concat(enemies).forEach((unit) => units.set(unit.id, unit));
    return {
      wave,
      turn: Number(state.turn || 1),
      phase: state.phase || 'command',
      winner: state.winner || null,
      stars: Math.max(0, Number(state.stars || 0)),
      nextStars: Math.max(0, Number(state.nextStars || 0)),
      allies,
      enemies,
      units
    };
  }

  function animationTarget(beforeUnit, afterSnapshot) {
    const waveChanged = Boolean(
      beforeUnit &&
      beforeUnit.side === 'enemy' &&
      afterSnapshot &&
      Number(beforeUnit.wave || 1) !== Number(afterSnapshot.wave || 1)
    );
    if (!waveChanged) {
      const current = afterSnapshot && afterSnapshot.units ? afterSnapshot.units.get(beforeUnit.id) : null;
      if (current) return current;
    }
    return {
      ...beforeUnit,
      alive: false,
      hp: 0,
      np: beforeUnit.side === 'ally' ? beforeUnit.np : null
    };
  }

  function interpolateNumber(from, to, progress) {
    const t = clamp(progress, 0, 1);
    return Number(from || 0) + (Number(to || 0) - Number(from || 0)) * t;
  }

  function interpolateUnit(beforeUnit, afterUnit, progress) {
    return {
      ...beforeUnit,
      alive: progress >= 1 ? Boolean(afterUnit.alive) : Boolean(beforeUnit.alive),
      hp: interpolateNumber(beforeUnit.hp, afterUnit.hp, progress),
      maxHp: Math.max(1, Number(afterUnit.maxHp || beforeUnit.maxHp || 1)),
      np: beforeUnit.side === 'ally'
        ? interpolateNumber(beforeUnit.np, afterUnit.np, progress)
        : null
    };
  }

  function gaugePercent(value, max) {
    return clamp((Number(value || 0) / Math.max(1, Number(max || 1))) * 100, 0, 100);
  }

  const API = {
    duplicateIdentity,
    positionLabel,
    snapshot,
    animationTarget,
    interpolateUnit,
    gaugePercent
  };

  global.FGO_BATTLE_PRESENTATION = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
