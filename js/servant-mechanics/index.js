(function (global) {
  'use strict';
  const M = global.FGO_SERVANT_MECHANICS || require('./registry.js');

  if (typeof require !== 'undefined') {
    require('./koyanskayaLight.js');
    require('./fenrir.js');
    require('./artoriaCaster.js');
    require('./skadiRuler.js');
    require('./skadiCaster.js');
    require('./juanaMadQueen.js');
    require('./aliceLiddell.js');
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
