'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DATA = require(path.join(__dirname, '..', 'js', 'data.js'));
const ICON_UI = require(path.join(__dirname, '..', 'js', 'mystic-code-skill-icons.js'));

assert.strictEqual(ICON_UI.resolveSkillIcon({ icon: 'skill-attack-up.png' }), 'skill-attack-up.png');
assert.strictEqual(ICON_UI.resolveSkillIcon({}), ICON_UI.DEFAULT_ICON);
assert.strictEqual(ICON_UI.resolveSkillIcon(null), ICON_UI.DEFAULT_ICON);

const mysticCodes = Object.values(DATA.mysticCodes);
assert.ok(mysticCodes.length > 0, '魔術礼装データが登録されていません。');

mysticCodes.forEach((mysticCode) => {
  assert.strictEqual(mysticCode.skills.length, 3, `${mysticCode.name}のスキル数が3つではありません。`);
  mysticCode.skills.forEach((skill, index) => {
    assert.ok(
      typeof skill.icon === 'string' && skill.icon.trim(),
      `${mysticCode.name}のスキル${index + 1}にiconが設定されていません。`
    );
    assert.ok(
      /^[A-Za-z0-9_.-]+$/.test(skill.icon),
      `${mysticCode.name}のスキル${index + 1}のiconはファイル名だけを指定してください。`
    );
  });
});

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'mystic-code-skill-icons.js'), 'utf8');
const image = { src: '', alt: '' };
const button = {
  dataset: { master: '0' },
  querySelector(selector) { return selector === 'img' ? image : null; }
};
const appRoot = {
  querySelectorAll(selector) {
    return selector === '.mystic-panel [data-master]' ? [button] : [];
  }
};
let mutationCallback = null;

class MockBattleEngine {
  getMysticCode() {
    return { skills: [{ name: '個別アイコン', icon: 'skill-attack-up.png' }] };
  }
}

class MockMutationObserver {
  constructor(callback) { mutationCallback = callback; }
  observe() {}
}

const context = {
  FGO_SIM_ENGINE: { BattleEngine: MockBattleEngine },
  document: { getElementById: () => appRoot },
  MutationObserver: MockMutationObserver,
  console
};
vm.createContext(context);
vm.runInContext(source, context);

const engine = new context.FGO_SIM_ENGINE.BattleEngine();
engine.getMysticCode();
mutationCallback();
assert.strictEqual(image.src, 'assets/skill-icons/skill-attack-up.png');
assert.strictEqual(image.alt, '個別アイコン');

console.log('mystic-code-icon-tests: OK');
