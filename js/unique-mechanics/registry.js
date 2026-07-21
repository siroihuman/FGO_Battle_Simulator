(function (global) {
  'use strict';

  const mechanics = Object.create(null);

  function register(servantId, definition) {
    if (!servantId) throw new Error('servantId is required.');
    if (!definition || typeof definition !== 'object') throw new Error('definition is required.');
    mechanics[servantId] = Object.assign({ servantId, hooks: {} }, definition);
    return mechanics[servantId];
  }

  function get(servantId) {
    return mechanics[servantId] || null;
  }

  function run(engine, servantId, eventName, context) {
    const definition = get(servantId);
    const hook = definition && definition.hooks && definition.hooks[eventName];
    if (typeof hook === 'function') return hook(engine, context || {});
    return undefined;
  }

  function list() {
    return Object.values(mechanics);
  }

  const api = { register, get, run, list };
  global.FGO_UNIQUE_MECHANICS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
