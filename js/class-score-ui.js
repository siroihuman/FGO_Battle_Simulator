(function () {
  'use strict';

  const root = document.getElementById('app');
  const DATA = window.FGO_SIM_DATA || { craftEssences: {} };
  if (!root) return;

  const foldState = new Map();
  let scheduled = false;

  function unitKey(card) {
    const skillButton = card.querySelector('[data-skill]');
    if (skillButton) return skillButton.dataset.skill.split(':')[0];
    const name = card.querySelector('h3');
    return name ? name.textContent.trim() : 'unknown';
  }

  function statusSource(icon) {
    const title = String(icon.getAttribute('title') || '');
    const separator = title.lastIndexOf('｜');
    return separator >= 0 ? title.slice(separator + 1).trim() : '';
  }

  function craftEssenceNames() {
    return new Set(
      Object.values(DATA.craftEssences || {})
        .filter((craftEssence) => craftEssence && craftEssence.id !== 'none')
        .map((craftEssence) => String(craftEssence.name || '').trim())
        .filter(Boolean)
    );
  }

  function makeFold(label, className, icons, stateKey) {
    const details = document.createElement('details');
    details.className = `class-effect-fold ${className}`;
    details.dataset.foldKey = stateKey;
    details.open = foldState.get(stateKey) === true;

    const summary = document.createElement('summary');
    const title = document.createElement('span');
    const count = document.createElement('small');
    title.textContent = label;
    count.textContent = `${icons.length}効果`;
    summary.append(title, count);

    const body = document.createElement('div');
    body.className = 'class-effect-body';
    const iconList = document.createElement('div');
    iconList.className = 'buff-icons';
    icons.forEach((icon) => iconList.appendChild(icon));
    body.appendChild(iconList);

    details.append(summary, body);
    details.addEventListener('toggle', () => {
      foldState.set(stateKey, details.open);
    });
    return details;
  }

  function enhanceCard(card) {
    if (card.dataset.classEffectsReady === 'true') return;

    const statusContainer = Array.from(card.children)
      .find((element) => element.classList && element.classList.contains('buff-icons'));
    if (!statusContainer) return;

    const allIcons = Array.from(statusContainer.querySelectorAll(':scope > .buff-icon'));
    const ceNames = craftEssenceNames();
    const craftEssenceIcons = allIcons.filter((icon) => ceNames.has(statusSource(icon)));
    const passiveIcons = allIcons.filter((icon) =>
      icon.classList.contains('passive') && !craftEssenceIcons.includes(icon)
    );
    if (!passiveIcons.length && !craftEssenceIcons.length) {
      card.dataset.classEffectsReady = 'true';
      return;
    }

    const classScoreIcons = passiveIcons.filter((icon) =>
      String(icon.getAttribute('title') || '').includes('｜クラススコア：')
    );
    const classSkillIcons = passiveIcons.filter((icon) => !classScoreIcons.includes(icon));
    classSkillIcons.forEach((icon) => {
      const image = icon.querySelector('img');
      if (!image) return;
      const filename = String(image.getAttribute('src') || '').split('/').pop();
      if (filename && filename.toLowerCase().endsWith('.png')) {
        image.setAttribute('src', `assets/skill-icons/${filename}`);
      }
    });

    passiveIcons.concat(craftEssenceIcons).forEach((icon) => icon.remove());
    if (!statusContainer.querySelector('.buff-icon')) statusContainer.remove();

    const panel = document.createElement('section');
    panel.className = 'class-passive-panel';
    panel.setAttribute('aria-label', 'クラススキル、クラススコア、概念礼装');

    const key = unitKey(card);
    if (classSkillIcons.length) {
      panel.appendChild(makeFold(
        'クラススキル',
        'class-skill-fold',
        classSkillIcons,
        `${key}:classSkill`
      ));
    }
    if (classScoreIcons.length) {
      panel.appendChild(makeFold(
        'クラススコア',
        'class-score-fold',
        classScoreIcons,
        `${key}:classScore`
      ));
    }
    if (craftEssenceIcons.length) {
      panel.appendChild(makeFold(
        '概念礼装',
        'craft-essence-fold',
        craftEssenceIcons,
        `${key}:craftEssence`
      ));
    }

    const skills = card.querySelector('.skills-row');
    if (skills) skills.insertAdjacentElement('afterend', panel);
    else card.appendChild(panel);
    card.dataset.classEffectsReady = 'true';
  }

  function enhanceAll() {
    scheduled = false;
    root.querySelectorAll('.ally-card').forEach(enhanceCard);
  }

  function scheduleEnhancement() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(enhanceAll);
  }

  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(root, { childList: true, subtree: true });
  scheduleEnhancement();
})();