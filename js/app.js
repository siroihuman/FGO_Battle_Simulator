(function () {
  'use strict';

  const DATA = window.FGO_SIM_DATA;
  const { BattleEngine } = window.FGO_SIM_ENGINE;
  const PRESENTATION = window.FGO_BATTLE_PRESENTATION;
  const root = document.getElementById('app');

  if (!PRESENTATION) throw new Error('battle presentation runtime is required.');

  const E = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
  const opt = (value, label, selected) =>
    `<option value="${E(value)}"${String(value) === String(selected) ? ' selected' : ''}>${E(label)}</option>`;
  const enemyDefault = (index) => ({
    enabled: index === 0,
    name: `エネミー${index + 1}`,
    classId: 'archer',
    attribute: 'sky',
    traits: [],
    traitText: '',
    hp: 100000,
    attack: 2500,
    dtdr: 1,
    deathRate: 0.2,
    instantDeathRate: 0,
    chargeMax: 3,
    critRate: 10,
    npTarget: 'all'
  });

  const DEFAULT = {
    randomSeed: true,
    seed: 314058,
    startingStars: 0,
    mysticCodeId: 'chaldea',
    mysticCodeLevel: 10,
    party: Array.from({ length: 6 }, (_, index) => ({
      servantId: index < 3 ? (index === 0 ? 'fenrir' : 'koyanskayaLight') : '',
      ascension: 'max',
      fouHp: 0,
      fouAtk: 0,
      cardEnhanceQuick: 0,
      cardEnhanceArts: 0,
      cardEnhanceBuster: 0,
      npLevel: 1,
      skillLevel: 10,
      startingNp: 50,
      craftEssenceId: 'none'
    })),
    waves: Array.from({ length: 6 }, (_, waveIndex) => ({
      enabled: waveIndex === 0,
      enemies: Array.from({ length: 3 }, (_, enemyIndex) => enemyDefault(enemyIndex))
    }))
  };

  let config = load();
  let engine = null;
  let pending = null;
  let activeWave = 0;
  let logOpen = true;
  let resultOpen = false;
  let battleScrollState = {};
  let battleResolving = false;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem('fgoSim110') || 'null');
      return saved ? Object.assign(clone(DEFAULT), saved) : clone(DEFAULT);
    } catch {
      return clone(DEFAULT);
    }
  }

  function save() {
    localStorage.setItem('fgoSim110', JSON.stringify(config));
  }

  function servantOpts(selected) {
    return opt('', '空き枠', selected) + Object.values(DATA.servants)
      .map((servant) => opt(servant.id, `No.${servant.no} ${servant.name}`, selected))
      .join('');
  }

  function ceOpts(selected) {
    return Object.values(DATA.craftEssences)
      .map((craftEssence) => opt(craftEssence.id, craftEssence.name, selected))
      .join('');
  }

  function cls(selected) {
    return Object.entries(DATA.classNames).map(([value, label]) => opt(value, label, selected)).join('');
  }

  function attr(selected) {
    return Object.entries(DATA.attributeNames).map(([value, label]) => opt(value, label, selected)).join('');
  }

  function partyRow(entry, index) {
    return `<div class="setup-card party-setup-card">
      <div class="setup-card-title">${index < 3 ? '前衛' : '控え'} ${index % 3 + 1}</div>
      <label>サーヴァント<select name="p${index}s">${servantOpts(entry.servantId)}</select></label>
      <div class="setup-grid-3">
        <label>育成段階<select name="p${index}asc">${opt('max', '最終再臨：Lv.最大', entry.ascension || 'max')}${opt('100', '聖杯転臨1：Lv.100', entry.ascension)}${opt('120', '聖杯転臨2：Lv.120', entry.ascension)}</select></label>
        <label>宝具Lv<input name="p${index}n" type="number" min="1" max="5" value="${entry.npLevel || 1}"></label>
        <label>スキルLv<input name="p${index}l" type="number" min="1" max="10" value="${entry.skillLevel || 10}"></label>
        <label>開始NP<input name="p${index}np" type="number" min="0" max="300" value="${entry.startingNp || 0}"></label>
        <label>HPフォウ<input name="p${index}fh" type="number" min="0" max="2000" step="5" value="${entry.fouHp || 0}"></label>
        <label>ATKフォウ<input name="p${index}fa" type="number" min="0" max="2000" step="5" value="${entry.fouAtk || 0}"></label>
      </div>
      <details class="growth-fold">
        <summary>コマンドカード強化</summary>
        <p class="field-note">通常攻撃だけに加算。0～500、50刻み。</p>
        <div class="setup-grid-3">
          <label>Quick<input name="p${index}cq" type="number" min="0" max="500" step="50" value="${entry.cardEnhanceQuick || 0}"></label>
          <label>Arts<input name="p${index}ca" type="number" min="0" max="500" step="50" value="${entry.cardEnhanceArts || 0}"></label>
          <label>Buster<input name="p${index}cb" type="number" min="0" max="500" step="50" value="${entry.cardEnhanceBuster || 0}"></label>
        </div>
      </details>
      <details class="ce-fold">
        <summary>概念礼装</summary>
        <label>装備<select name="p${index}ce">${ceOpts(entry.craftEssenceId || 'none')}</select></label>
      </details>
    </div>`;
  }

  function enemyRow(entry, index, waveIndex) {
    return `<div class="setup-card enemy-setup-card">
      <div class="setup-card-title inline-title">
        <span>エネミー ${index + 1}</span>
        <label class="toggle-label"><input name="w${waveIndex}e${index}on" type="checkbox"${entry.enabled !== false ? ' checked' : ''}><span>使用</span></label>
      </div>
      <div class="setup-grid-3">
        <label class="span-2">名称<input name="w${waveIndex}e${index}name" value="${E(entry.name)}"></label>
        <label>クラス<select name="w${waveIndex}e${index}class">${cls(entry.classId)}</select></label>
        <label>属性<select name="w${waveIndex}e${index}attr">${attr(entry.attribute)}</select></label>
        <label class="span-3">特性（記述式）<input name="w${waveIndex}e${index}traits" value="${E(entry.traitText || (entry.traits || []).join(' / '))}" placeholder="例：神性 / 王 / 人型"></label>
        <label>HP<input name="w${waveIndex}e${index}hp" type="number" value="${entry.hp}"></label>
        <label>攻撃<input name="w${waveIndex}e${index}atk" type="number" value="${entry.attack}"></label>
        <label>NP補正<input name="w${waveIndex}e${index}dtdr" type="number" step=".05" value="${entry.dtdr}"></label>
        <label>DR<input name="w${waveIndex}e${index}dr" type="number" step=".1" value="${entry.deathRate}"></label>
        <label>チャージ<input name="w${waveIndex}e${index}cm" type="number" value="${entry.chargeMax}"></label>
        <label>クリ率<input name="w${waveIndex}e${index}cr" type="number" value="${entry.critRate}"></label>
      </div>
    </div>`;
  }

  function wavePanel(waveIndex) {
    const wave = config.waves[waveIndex] || clone(DEFAULT.waves[waveIndex]);
    return `<div class="wave-panel${waveIndex === activeWave ? ' active' : ''}" data-wave-panel="${waveIndex}">
      <div class="wave-tools">
        <label><input type="checkbox" name="w${waveIndex}enabled"${wave.enabled ? ' checked' : ''}> このウェーブを使用</label>
        <button type="button" data-bulk-wave="${waveIndex}">エネミー1の設定を全体へコピー</button>
      </div>
      ${wave.enemies.map((enemy, index) => enemyRow(enemy, index, waveIndex)).join('')}
    </div>`;
  }

  function renderSetup() {
    root.innerHTML = `<main class="setup-screen">
      <header class="setup-header">
        <div><p class="eyebrow">BATTLE SETUP</p><h1>${E(DATA.title)} <span>v${DATA.version}</span></h1></div>
        <button form="setup" class="primary-button large-button top-start-button">戦闘開始</button>
      </header>
      <form id="setup">
        <section class="setup-section">
          <div class="section-heading"><h2>味方編成</h2><p>前衛3騎＋控え3騎。戦闘不能時は控えが自動登場します。</p></div>
          <div class="setup-card-list party-list">${config.party.map(partyRow).join('')}</div>
        </section>
        <section class="setup-section">
          <div class="section-heading"><h2>魔術礼装</h2></div>
          <div class="setup-grid-3">
            <label>魔術礼装<select name="mc">${Object.values(DATA.mysticCodes).map((code) => opt(code.id, code.name, config.mysticCodeId)).join('')}</select></label>
            <label>Lv<input name="mcl" type="number" min="1" max="10" value="${config.mysticCodeLevel}"></label>
          </div>
        </section>
        <section class="setup-section">
          <div class="section-heading"><h2>ウェーブ設定</h2><p>最大6ウェーブ、各3体まで設定できます。</p></div>
          <div class="wave-tabs">${Array.from({ length: 6 }, (_, index) => `<button type="button" data-wave-tab="${index}" class="${index === activeWave ? 'active' : ''}">WAVE ${index + 1}</button>`).join('')}</div>
          ${Array.from({ length: 6 }, (_, index) => wavePanel(index)).join('')}
        </section>
        <section class="setup-section compact-settings">
          <div class="setup-grid-3">
            <label class="toggle-label"><input name="randomSeed" type="checkbox"${config.randomSeed ? ' checked' : ''}><span>毎試合シードをランダム決定</span></label>
            <label>固定シード<input name="seed" type="number" value="${config.seed}"></label>
            <label>開始スター<input name="stars" type="number" min="0" max="50" value="${config.startingStars}"></label>
          </div>
        </section>
        <div class="setup-actions"><button type="button" id="reset" class="secondary-button">初期設定</button></div>
      </form>
    </main>`;

    root.querySelectorAll('[data-wave-tab]').forEach((button) => {
      button.onclick = () => {
        activeWave = Number(button.dataset.waveTab);
        captureSetup();
        renderSetup();
      };
    });
    root.querySelectorAll('[data-bulk-wave]').forEach((button) => {
      button.onclick = () => {
        captureSetup();
        const waveIndex = Number(button.dataset.bulkWave);
        const source = clone(config.waves[waveIndex].enemies[0]);
        config.waves[waveIndex].enemies = [clone(source), clone(source), clone(source)];
        renderSetup();
      };
    });
    root.querySelector('#reset').onclick = () => {
      config = clone(DEFAULT);
      renderSetup();
    };
    root.querySelector('#setup').onsubmit = start;
  }

  function captureSetup() {
    const form = root.querySelector('#setup');
    if (!form) return;
    const data = new FormData(form);
    config.party = Array.from({ length: 6 }, (_, index) => ({
      servantId: data.get(`p${index}s`),
      ascension: data.get(`p${index}asc`) || 'max',
      fouHp: Math.min(2000, Math.max(0, Number(data.get(`p${index}fh`)) || 0)),
      fouAtk: Math.min(2000, Math.max(0, Number(data.get(`p${index}fa`)) || 0)),
      cardEnhanceQuick: Math.min(500, Math.max(0, Number(data.get(`p${index}cq`)) || 0)),
      cardEnhanceArts: Math.min(500, Math.max(0, Number(data.get(`p${index}ca`)) || 0)),
      cardEnhanceBuster: Math.min(500, Math.max(0, Number(data.get(`p${index}cb`)) || 0)),
      npLevel: Number(data.get(`p${index}n`)) || 1,
      skillLevel: Number(data.get(`p${index}l`)) || 10,
      startingNp: Number(data.get(`p${index}np`)) || 0,
      craftEssenceId: data.get(`p${index}ce`) || 'none'
    }));
    config.waves = Array.from({ length: 6 }, (_, waveIndex) => ({
      enabled: data.get(`w${waveIndex}enabled`) === 'on',
      enemies: Array.from({ length: 3 }, (_, enemyIndex) => ({
        enabled: data.get(`w${waveIndex}e${enemyIndex}on`) === 'on',
        name: data.get(`w${waveIndex}e${enemyIndex}name`) || `エネミー${enemyIndex + 1}`,
        classId: data.get(`w${waveIndex}e${enemyIndex}class`),
        attribute: data.get(`w${waveIndex}e${enemyIndex}attr`),
        traitText: data.get(`w${waveIndex}e${enemyIndex}traits`) || '',
        traits: String(data.get(`w${waveIndex}e${enemyIndex}traits`) || '')
          .split(/[\/／,，\n]+/).map((value) => value.trim()).filter(Boolean),
        hp: Number(data.get(`w${waveIndex}e${enemyIndex}hp`)) || 1,
        attack: Number(data.get(`w${waveIndex}e${enemyIndex}atk`)) || 1,
        dtdr: Number(data.get(`w${waveIndex}e${enemyIndex}dtdr`)) || 1,
        deathRate: Number(data.get(`w${waveIndex}e${enemyIndex}dr`)) || 0,
        instantDeathRate: 0,
        chargeMax: Number(data.get(`w${waveIndex}e${enemyIndex}cm`)) || 3,
        critRate: Number(data.get(`w${waveIndex}e${enemyIndex}cr`)) || 10,
        npTarget: 'all'
      }))
    }));
    config.mysticCodeId = data.get('mc');
    config.mysticCodeLevel = Number(data.get('mcl')) || 10;
    config.randomSeed = data.get('randomSeed') === 'on';
    config.seed = Number(data.get('seed')) || 1;
    config.startingStars = Number(data.get('stars')) || 0;
  }

  function start(event) {
    event.preventDefault();
    captureSetup();
    const party = config.party.filter((entry) => entry.servantId);
    const waves = config.waves.filter((wave) => wave.enabled && wave.enemies.some((enemy) => enemy.enabled));
    if (!party.length) return alert('サーヴァントを設定してください。');
    if (!waves.length) return alert('ウェーブを1つ以上設定してください。');
    const battle = clone(config);
    battle.party = party;
    battle.waves = waves;
    battle.seed = config.randomSeed ? Math.floor(Math.random() * 2147483647) + 1 : config.seed;
    config.seed = battle.seed;
    save();
    engine = new BattleEngine(battle);
    renderBattle({ preserveViewport: false });
  }

  const ICON = DATA.statusIcons || {};

  function groupedStatuses(id) {
    const list = engine.getStatusSummary(id);
    const out = [];
    const map = new Map();
    for (const status of list) {
      if (status.passive) {
        out.push(status);
        continue;
      }
      const key = [status.type, status.card, status.trait, status.attribute, status.remaining, status.uses, status.debuff].join('|');
      if (!map.has(key)) map.set(key, { ...status });
      else map.get(key).value = (map.get(key).value || 0) + (status.value || 0);
    }
    return out.concat([...map.values()]);
  }

  function statusHtml(unit) {
    const statuses = groupedStatuses(unit.id);
    if (!statuses.length) return '<span class="empty-status">効果なし</span>';
    return `<div class="buff-icons">${statuses.map((status) => `<div class="buff-icon${status.passive ? ' passive' : ''}${status.debuff ? ' debuff' : ''}" title="${E(status.name)}｜${E(status.source || '')}">
      <img src="assets/status-icons/${status.statusIcon || ICON[status.type] || 'Statusup.webp'}">
      <span>${status.value ? `${status.value}${['guts', 'damagePlus'].includes(status.type) ? '' : '%'}` : ''}</span>
      <small>${status.remaining < 0 ? '∞' : `${status.remaining}T`}</small>
    </div>`).join('')}</div>`;
  }

  function bar(percent, className, gaugeType) {
    return `<div class="bar ${className}" data-gauge-track="${gaugeType}"><div data-gauge-fill="${gaugeType}" style="width:${Math.max(0, Math.min(100, percent))}%"></div></div>`;
  }

  function duplicateBadge(unit, compact = false) {
    const identity = PRESENTATION.duplicateIdentity(engine.getState(), unit);
    if (!identity) return '';
    const title = `${unit.name}：${identity.label}（${identity.position}）`;
    return `<span class="duplicate-servant-badge ${identity.className}${compact ? ' compact' : ''}" title="${E(title)}"><b>${E(identity.label)}</b><small>${E(identity.position)}</small></span>`;
  }

  function ally(unit) {
    const selectedOwner = engine.getState().selectedActions.some((action) => action.actorId === unit.id);
    const identity = PRESENTATION.duplicateIdentity(engine.getState(), unit);
    return `<article class="ally-card${unit.alive ? '' : ' defeated'}${selectedOwner ? ' selected-command-owner' : ''}${identity ? ` duplicate-servant ${identity.className}` : ''}" data-unit-id="${E(unit.id)}" data-unit-side="ally">
      <div class="unit-topline"><span class="class-badge">${E(DATA.classNames[unit.classId])}</span><span>${unit.frontline ? '前衛' : '控え'}</span></div>
      <div class="unit-name-row"><h3>${E(unit.name)}</h3>${duplicateBadge(unit)}</div>
      <div class="unit-growth">${E(unit.levelLabel)}／HPフォウ+${unit.fouHp}／ATKフォウ+${unit.fouAtk}</div>
      <div class="hp-line"><span>HP</span><strong data-gauge-value="hp">${Math.round(unit.hp)}/${unit.maxHp}</strong></div>
      ${bar((unit.hp / unit.maxHp) * 100, 'hp-bar', 'hp')}
      <div class="np-line"><span>NP</span><strong data-gauge-value="np">${unit.np.toFixed(2)}%</strong></div>
      ${bar(Math.min(100, unit.np), 'np-bar', 'np')}
      <div class="skills-row">${unit.data.skills.map((skill, index) => `<button type="button" class="skill-button" data-skill="${unit.id}:${index}" ${!unit.frontline || !unit.alive || unit.cooldowns[index] > 0 || battleResolving ? 'disabled' : ''} title="${E(skill.description)}">
        <img src="assets/skill-icons/${unit.data.skillIcons[index]}"><span>${E(skill.name)}</span><small>${unit.cooldowns[index] ? `CT${unit.cooldowns[index]}` : `Lv.${unit.skillLevels[index]}`}</small>
      </button>`).join('')}</div>
      ${statusHtml(unit)}
    </article>`;
  }

  function enemy(unit) {
    return `<button type="button" class="enemy-card${unit.id === engine.getState().selectedEnemyId ? ' selected-target' : ''}" data-enemy="${unit.id}" data-unit-id="${E(unit.id)}" data-unit-side="enemy" ${unit.alive && !battleResolving ? '' : 'disabled'}>
      <h3>${E(unit.name)}</h3><div>${E(DATA.classNames[unit.classId])}</div>
      <div class="hp-line"><span>HP</span><strong data-gauge-value="hp">${Math.round(unit.hp)}/${unit.maxHp}</strong></div>
      ${bar((unit.hp / unit.maxHp) * 100, 'hp-bar enemy-hp', 'hp')}
      ${statusHtml(unit)}
    </button>`;
  }

  function actionCard(card) {
    const actor = engine.getUnit(card.actorId);
    const selectedIndex = engine.getState().selectedActions.findIndex((action) => action.type === 'card' && action.cardId === card.id);
    const identity = PRESENTATION.duplicateIdentity(engine.getState(), actor);
    const label = identity ? `${actor.name} ${identity.label} ${identity.position}` : actor.name;
    return `<button type="button" class="command-card ${card.card}${selectedIndex >= 0 ? ' selected' : ''}${identity ? ` duplicate-servant-card ${identity.className}` : ''}" data-card="${card.id}" data-actor-id="${actor.id}" aria-label="${E(label)} ${card.card}">
      ${selectedIndex >= 0 ? `<b class="order-badge">${selectedIndex + 1}</b>` : ''}
      <div class="command-owner-line"><span class="command-servant">${E(actor.name)}</span>${duplicateBadge(actor, true)}</div>
      <strong>${card.card.toUpperCase()}</strong><small>CRITICAL ${card.critChance || 0}%</small>
    </button>`;
  }

  function np(unit) {
    const selectedIndex = engine.getState().selectedActions.findIndex((action) => action.type === 'np' && action.actorId === unit.id);
    const identity = PRESENTATION.duplicateIdentity(engine.getState(), unit);
    return `<button type="button" class="np-command ${unit.data.np.card}${selectedIndex >= 0 ? ' selected' : ''}${identity ? ` duplicate-servant-card ${identity.className}` : ''}" data-np="${unit.id}" ${unit.np < 100 || battleResolving ? 'disabled' : ''} title="${E(unit.data.np.description)}">
      <div class="command-owner-line"><span>${E(unit.name)}</span>${duplicateBadge(unit, true)}</div>
      <strong>${E(unit.data.np.name)}</strong><small>NP ${unit.np.toFixed(2)}%</small>
    </button>`;
  }

  function mystic() {
    const mysticCode = engine.getMysticCode();
    const state = engine.getState();
    return `<section class="mystic-panel"><h3>${E(mysticCode.name)} Lv.${engine.config.mysticCodeLevel || 10}</h3>
      <div class="skills-row">${mysticCode.skills.map((skill, index) => `<button type="button" class="skill-button master" data-master="${index}" ${state.mysticCodeCooldowns[index] > 0 || battleResolving ? 'disabled' : ''} title="${E(skill.description)}">
        <img src="assets/skill-icons/skill-buff-add.png"><span>${E(skill.name)}</span><small>${state.mysticCodeCooldowns[index] ? `CT${state.mysticCodeCooldowns[index]}` : '使用可能'}</small>
      </button>`).join('')}</div>
    </section>`;
  }

  function modal() {
    if (!pending) return '';
    if (pending.kind === 'order') {
      const front = engine.getUnit(pending.front);
      const back = engine.getUnit(pending.back);
      return `<div class="modal-backdrop"><div class="target-modal-card order-change-modal">
        <h2>オーダーチェンジ</h2><p class="order-guide">前衛と控えを1騎ずつ選択し、最後に確定してください。</p>
        <div class="order-selection-summary"><span>前衛：<strong>${front ? E(front.name) : '未選択'}</strong></span><span>控え：<strong>${back ? E(back.name) : '未選択'}</strong></span></div>
        <p>前衛を選択</p><div class="order-choice-list">${engine.getAliveAllies().map((unit) => `<button type="button" class="order-choice${pending.front === unit.id ? ' selected' : ''}" data-order-front="${unit.id}" aria-pressed="${pending.front === unit.id}">${E(unit.name)}${duplicateBadge(unit, true)}</button>`).join('')}</div>
        <p>控えを選択</p><div class="order-choice-list">${engine.getReserveAllies().map((unit) => `<button type="button" class="order-choice${pending.back === unit.id ? ' selected' : ''}" data-order-back="${unit.id}" aria-pressed="${pending.back === unit.id}">${E(unit.name)}${duplicateBadge(unit, true)}</button>`).join('')}</div>
        <div class="order-modal-actions"><button type="button" id="order-confirm" class="primary-button" ${pending.front && pending.back ? '' : 'disabled'}>オーダーチェンジ確定</button><button type="button" id="cancel" class="secondary-button">キャンセル</button></div>
      </div></div>`;
    }
    const units = pending.target === 'enemy' ? engine.getAliveEnemies() : engine.getAliveAllies();
    return `<div class="modal-backdrop"><div class="target-modal-card"><h2>対象選択</h2>${units.map((unit) => `<button type="button" data-target="${unit.id}">${E(unit.name)}${pending.target === 'ally' ? duplicateBadge(unit, true) : ''}</button>`).join('')}<button type="button" id="cancel">キャンセル</button></div></div>`;
  }

  function result() {
    if (!engine.getState().winner) return '';
    const state = engine.getState();
    return `<div class="winner-overlay"><div class="winner-card ${state.winner}"><p>BATTLE RESULT</p><h2>${state.winner === 'allies' ? '勝利' : '敗北'}</h2>
      <p>到達ウェーブ ${state.wave}/${state.maxWaves}　ターン ${state.turn}　乱数シード ${engine.seed}</p>
      <button type="button" id="result-log" class="primary-button">戦闘ログを確認</button><button type="button" id="again" class="primary-button">同じ設定でもう一度</button><button type="button" id="setupback" class="secondary-button">編成設定へ</button>
      ${resultOpen ? `<div class="result-log">${logs()}</div>` : ''}
    </div></div>`;
  }

  function logs() {
    return engine.getState().logs.slice().reverse().map((entry) => `<div class="log-entry ${E(entry.type || '')}"><span>W${engine.getState().wave} T${entry.turn}</span><p>${E(entry.message)}</p></div>`).join('');
  }

  function captureBattleScroll() {
    const selectors = ['.ally-row', '.enemy-row', '.np-row', '.command-row', '.skills-row'];
    const out = {};
    selectors.forEach((selector) => {
      out[selector] = [...root.querySelectorAll(selector)].map((element) => element.scrollLeft);
    });
    battleScrollState = out;
  }

  function restoreBattleScroll() {
    Object.entries(battleScrollState).forEach(([selector, values]) => {
      [...root.querySelectorAll(selector)].forEach((element, index) => {
        element.scrollLeft = values[index] || 0;
      });
    });
  }

  function captureViewport() {
    return { x: window.scrollX, y: window.scrollY };
  }

  function restoreViewport(viewport) {
    if (!viewport) return;
    const restore = () => window.scrollTo(viewport.x, viewport.y);
    restore();
    requestAnimationFrame(restore);
  }

  function renderBattle(options = {}) {
    const hadBattle = Boolean(root.querySelector('.battle-screen'));
    const viewport = options.viewport || (options.preserveViewport !== false && hadBattle ? captureViewport() : null);
    captureBattleScroll();
    const state = engine.getState();
    const displayedAllies = state.allies.slice().sort((a, b) => Number(b.frontline) - Number(a.frontline) || a.slot - b.slot);
    root.innerHTML = `<main class="battle-screen${battleResolving ? ' battle-resolving' : ''}">
      <header class="battle-header">
        <div class="battle-title"><span>WAVE ${state.wave}/${state.maxWaves}</span><strong>TURN ${state.turn}</strong><small>SEED ${engine.seed}</small></div>
        <div class="battle-resources"><strong>★ ${state.stars}</strong></div>
        <div class="header-actions"><button type="button" id="back" ${battleResolving ? 'disabled' : ''}>編成設定</button></div>
      </header>
      <section class="battlefield"><div class="enemy-row">${state.enemies.map(enemy).join('')}</div></section>
      <section class="battlefield"><div class="ally-row">${displayedAllies.map(ally).join('')}</div></section>
      ${mystic()}
      <section class="command-panel">
        <div class="np-row">${engine.getAliveAllies().map(np).join('')}</div>
        <div class="command-row">${state.hand.map(actionCard).join('')}</div>
        <div class="command-actions"><button type="button" id="clear" ${battleResolving ? 'disabled' : ''}>選択解除</button><button type="button" id="go" ${state.selectedActions.length === 3 && !battleResolving ? '' : 'disabled'}>攻撃開始</button></div>
      </section>
      <section class="battle-log${logOpen ? ' open' : ''}"><button type="button" id="logtoggle" class="log-toggle">BATTLE LOG</button><div class="log-list">${logs()}</div></section>
    </main>${modal()}${result()}`;
    bind();
    restoreBattleScroll();
    restoreViewport(viewport);
  }

  function stableRender(action) {
    if (battleResolving) return;
    const viewport = captureViewport();
    action();
    renderBattle({ viewport });
  }

  function resolutionGauge(unit, includeNp) {
    return `<div class="resolution-unit" data-unit-id="${E(unit.id)}" data-unit-side="${unit.side}">
      <div class="resolution-unit-title"><strong>${E(unit.name)}</strong><small>${unit.side === 'ally' ? (unit.frontline ? '前衛' : '控え') : '敵'}</small></div>
      <div class="hp-line"><span>HP</span><strong data-gauge-value="hp">${Math.round(unit.hp)}/${unit.maxHp}</strong></div>
      ${bar(PRESENTATION.gaugePercent(unit.hp, unit.maxHp), unit.side === 'enemy' ? 'hp-bar enemy-hp' : 'hp-bar', 'hp')}
      ${includeNp ? `<div class="np-line"><span>NP</span><strong data-gauge-value="np">${Number(unit.np || 0).toFixed(2)}%</strong></div>${bar(Math.min(100, Number(unit.np || 0)), 'np-bar', 'np')}` : ''}
    </div>`;
  }

  function resolutionPanelHtml(before) {
    return `<div class="turn-resolution-panel" role="status" aria-live="polite">
      <div class="resolution-heading"><div><p>TURN RESOLUTION</p><h3>攻撃・ターン処理中</h3></div><span class="resolution-spinner" aria-hidden="true"></span></div>
      <div class="resolution-groups">
        <section><h4>ENEMY HP</h4><div class="resolution-unit-list enemy-resolution-list">${before.enemies.map((unit) => resolutionGauge(unit, false)).join('')}</div></section>
        <section><h4>ALLY HP / NP</h4><div class="resolution-unit-list ally-resolution-list">${before.allies.map((unit) => resolutionGauge(unit, true)).join('')}</div></section>
      </div>
    </div>`;
  }

  function updateGaugeElement(element, unit) {
    const hpText = element.querySelector('[data-gauge-value="hp"]');
    const hpFill = element.querySelector('[data-gauge-fill="hp"]');
    if (hpText) hpText.textContent = `${Math.round(unit.hp)}/${unit.maxHp}`;
    if (hpFill) hpFill.style.width = `${PRESENTATION.gaugePercent(unit.hp, unit.maxHp)}%`;
    const npText = element.querySelector('[data-gauge-value="np"]');
    const npFill = element.querySelector('[data-gauge-fill="np"]');
    if (npText && unit.np != null) npText.textContent = `${Number(unit.np).toFixed(2)}%`;
    if (npFill && unit.np != null) npFill.style.width = `${Math.max(0, Math.min(100, Number(unit.np)))}%`;
    element.classList.toggle('defeated', unit.hp <= 0);
  }

  function animateTurnResolution(before, after, viewport) {
    return new Promise((resolve) => {
      const screen = root.querySelector('.battle-screen');
      const panel = root.querySelector('.command-panel');
      if (!screen || !panel) {
        resolve();
        return;
      }
      battleResolving = true;
      screen.classList.add('battle-resolving');
      panel.classList.add('resolving');
      panel.insertAdjacentHTML('beforeend', resolutionPanelHtml(before));
      screen.querySelectorAll('button').forEach((button) => { button.disabled = true; });
      restoreViewport(viewport);

      const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reducedMotion ? 240 : 900;
      const startedAt = performance.now();

      function frame(now) {
        const raw = Math.min(1, (now - startedAt) / duration);
        const progress = 1 - Math.pow(1 - raw, 3);
        root.querySelectorAll('[data-unit-id]').forEach((element) => {
          const startUnit = before.units.get(element.dataset.unitId);
          if (!startUnit) return;
          const targetUnit = PRESENTATION.animationTarget(startUnit, after);
          updateGaugeElement(element, PRESENTATION.interpolateUnit(startUnit, targetUnit, progress));
        });
        if (raw < 1) {
          requestAnimationFrame(frame);
          return;
        }
        const heading = root.querySelector('.turn-resolution-panel h3');
        if (heading) heading.textContent = after.winner ? '戦闘結果を確定' : `TURN ${after.turn} コマンド選択へ`;
        setTimeout(resolve, reducedMotion ? 40 : 220);
      }

      requestAnimationFrame(frame);
    });
  }

  async function executeTurnWithPresentation() {
    if (battleResolving) return;
    const viewport = captureViewport();
    const before = PRESENTATION.snapshot(engine.getState());
    const response = engine.executeCommandChain();
    if (!response.ok) {
      alert(response.reason);
      return;
    }
    const after = PRESENTATION.snapshot(engine.getState());
    await animateTurnResolution(before, after, viewport);
    battleResolving = false;
    renderBattle({ viewport });
  }

  function preventMouseFocusScroll(button) {
    button.onmousedown = (event) => event.preventDefault();
  }

  function bind() {
    root.querySelectorAll('[data-enemy]').forEach((button) => {
      preventMouseFocusScroll(button);
      button.onclick = () => stableRender(() => engine.selectEnemy(button.dataset.enemy));
    });
    root.querySelectorAll('[data-card]').forEach((button) => {
      preventMouseFocusScroll(button);
      button.onclick = () => stableRender(() => engine.toggleCard(button.dataset.card));
    });
    root.querySelectorAll('[data-np]').forEach((button) => {
      preventMouseFocusScroll(button);
      button.onclick = () => stableRender(() => engine.toggleNp(button.dataset.np));
    });
    root.querySelectorAll('[data-skill]').forEach((button) => {
      button.onclick = () => {
        if (battleResolving) return;
        const [allyId, indexText] = button.dataset.skill.split(':');
        const index = Number(indexText);
        const targetType = engine.getSkillTargetType(allyId, index);
        if (targetType === 'self') stableRender(() => engine.useSkill(allyId, index, allyId));
        else {
          pending = { kind: 'servant', ally: allyId, index, target: targetType === 'enemy' ? 'enemy' : 'ally' };
          renderBattle({ viewport: captureViewport() });
        }
      };
    });
    root.querySelectorAll('[data-master]').forEach((button) => {
      button.onclick = () => {
        if (battleResolving) return;
        const index = Number(button.dataset.master);
        const targetType = engine.getMysticSkillTargetType(index);
        if (targetType === 'orderChange') pending = { kind: 'order', index, front: null, back: null };
        else if (targetType === 'self') return stableRender(() => engine.useMysticSkill(index, null));
        else pending = { kind: 'master', index, target: targetType === 'enemy' ? 'enemy' : 'ally' };
        renderBattle({ viewport: captureViewport() });
      };
    });
    root.querySelectorAll('[data-target]').forEach((button) => {
      button.onclick = () => {
        const viewport = captureViewport();
        if (pending.kind === 'servant') engine.useSkill(pending.ally, pending.index, button.dataset.target);
        else engine.useMysticSkill(pending.index, button.dataset.target);
        pending = null;
        renderBattle({ viewport });
      };
    });
    root.querySelectorAll('[data-order-front]').forEach((button) => {
      button.onclick = () => {
        pending.front = button.dataset.orderFront;
        renderBattle({ viewport: captureViewport() });
      };
    });
    root.querySelectorAll('[data-order-back]').forEach((button) => {
      button.onclick = () => {
        pending.back = button.dataset.orderBack;
        renderBattle({ viewport: captureViewport() });
      };
    });

    const orderConfirm = root.querySelector('#order-confirm');
    if (orderConfirm) orderConfirm.onclick = () => {
      if (!pending.front || !pending.back) return;
      const viewport = captureViewport();
      const response = engine.orderChange(pending.front, pending.back);
      if (!response.ok) {
        alert(response.reason);
        return;
      }
      engine.getState().mysticCodeCooldowns[pending.index] = Math.max(1, 15 - (engine.config.mysticCodeLevel >= 6 ? 1 : 0) - (engine.config.mysticCodeLevel >= 10 ? 1 : 0));
      pending = null;
      renderBattle({ viewport });
    };

    const cancel = root.querySelector('#cancel');
    if (cancel) cancel.onclick = () => {
      const viewport = captureViewport();
      pending = null;
      renderBattle({ viewport });
    };

    const clear = root.querySelector('#clear');
    if (clear) clear.onclick = () => stableRender(() => engine.clearSelection());
    const go = root.querySelector('#go');
    if (go) go.onclick = executeTurnWithPresentation;
    const back = root.querySelector('#back');
    if (back) back.onclick = () => {
      if (!battleResolving && confirm('編成設定へ戻りますか？')) renderSetup();
    };
    const logToggle = root.querySelector('#logtoggle');
    if (logToggle) logToggle.onclick = () => {
      logOpen = !logOpen;
      renderBattle({ viewport: captureViewport() });
    };
    const resultLog = root.querySelector('#result-log');
    if (resultLog) resultLog.onclick = () => {
      resultOpen = !resultOpen;
      renderBattle({ viewport: captureViewport() });
    };
    const again = root.querySelector('#again');
    if (again) again.onclick = () => {
      const battle = clone(config);
      battle.party = battle.party.filter((entry) => entry.servantId);
      battle.waves = battle.waves.filter((wave) => wave.enabled && wave.enemies.some((enemy) => enemy.enabled));
      battle.seed = config.randomSeed ? Math.floor(Math.random() * 2147483647) + 1 : config.seed;
      engine = new BattleEngine(battle);
      resultOpen = false;
      battleResolving = false;
      renderBattle({ preserveViewport: false });
    };
    const setupBack = root.querySelector('#setupback');
    if (setupBack) setupBack.onclick = renderSetup;
  }

  renderSetup();
})();
