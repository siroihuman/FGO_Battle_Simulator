(function (global) {
  'use strict';

  const servants = Object.create(null);
  const effectHooks = Object.create(null);

  function registerServant(servantId, definition) {
    if (!servantId) throw new Error('servantId is required.');
    servants[servantId] = Object.assign({
      servantId,
      commonEffects: [],
      triggerEffects: [],
      uniqueMechanics: [],
      hooks: {}
    }, definition || {});
    return servants[servantId];
  }

  function registerEffectHook(ownerServantId, eventName, statusType, handler) {
    if (typeof handler !== 'function') throw new Error('handler must be a function.');
    if (!effectHooks[eventName]) effectHooks[eventName] = [];
    effectHooks[eventName].push({ ownerServantId, statusType, handler });
  }

  function runServantHook(engine, servantId, eventName, context) {
    const definition = servants[servantId];
    const hook = definition && definition.hooks && definition.hooks[eventName];
    if (typeof hook === 'function') return hook(engine, context || {});
    return undefined;
  }

  function runEffectHooks(engine, eventName, context) {
    const hooks = effectHooks[eventName] || [];
    hooks.forEach((entry) => entry.handler(engine, context || {}, entry));
  }

  function get(servantId) {
    return servants[servantId] || null;
  }

  function list() {
    return Object.values(servants);
  }

  const api = {
    registerServant,
    registerEffectHook,
    runServantHook,
    runEffectHooks,
    get,
    list
  };

  global.FGO_SERVANT_MECHANICS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
