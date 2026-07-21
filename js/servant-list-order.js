(function (global) {
  'use strict';

  const OFFICIAL_SERVANT_IDS = Object.freeze([
    'skadiCaster',
    'artoriaCaster',
    'koyanskayaLight',
    'skadiRuler'
  ]);
  const officialServantIdSet = new Set(OFFICIAL_SERVANT_IDS);

  function parseServantNo(value) {
    const text = String(value ?? '').trim();
    const match = text.match(/\d+/);
    if (!match) {
      return { number: Number.MAX_SAFE_INTEGER, suffix: text };
    }
    return {
      number: Number(match[0]),
      suffix: text.slice((match.index || 0) + match[0].length)
    };
  }

  function compareServantsForList(left, right) {
    const leftOfficial = officialServantIdSet.has(left && left.id);
    const rightOfficial = officialServantIdSet.has(right && right.id);
    if (leftOfficial !== rightOfficial) return leftOfficial ? 1 : -1;

    const leftNo = parseServantNo(left && left.no);
    const rightNo = parseServantNo(right && right.no);
    if (leftNo.number !== rightNo.number) return leftNo.number - rightNo.number;

    if (leftNo.suffix !== rightNo.suffix) {
      if (!leftNo.suffix) return -1;
      if (!rightNo.suffix) return 1;
      return leftNo.suffix.localeCompare(rightNo.suffix, 'ja', { numeric: true, sensitivity: 'base' });
    }

    return String((left && left.id) || '').localeCompare(
      String((right && right.id) || ''),
      'en',
      { numeric: true, sensitivity: 'base' }
    );
  }

  function orderServantsForList(servants) {
    return Object.fromEntries(
      Object.entries(servants || {}).sort(([, left], [, right]) => compareServantsForList(left, right))
    );
  }

  const DATA = global.FGO_SIM_DATA;
  if (DATA && DATA.servants) {
    DATA.servants = orderServantsForList(DATA.servants);
  }

  const API = {
    OFFICIAL_SERVANT_IDS,
    compareServantsForList,
    orderServantsForList
  };

  global.FGO_SIM_SERVANT_LIST_ORDER = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
