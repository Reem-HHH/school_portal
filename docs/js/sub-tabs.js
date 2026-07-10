const subTabMemory = {};

function showSubTab(group, name, { animate = true } = {}) {
  const bar = document.querySelector(`[data-sub-tabs="${group}"]`);
  const root = bar?.closest('.topic-panel');
  if (!root) return;

  subTabMemory[group] = name;
  try { sessionStorage.setItem(`subtab:${group}`, name); } catch (_) {}

  bar.querySelectorAll('.sub-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subTab === name);
    btn.setAttribute('aria-selected', btn.dataset.subTab === name ? 'true' : 'false');
  });

  root.querySelectorAll(':scope > .sub-tab-panel').forEach(panel => {
    const active = panel.dataset.subPanel === name;
    panel.classList.toggle('section-hidden', !active);
    if (active && animate) {
      panel.classList.remove('sub-tab-enter');
      void panel.offsetWidth;
      panel.classList.add('sub-tab-enter');
    }
  });
}

function getActiveSubTab(group) {
  if (subTabMemory[group]) return subTabMemory[group];
  try {
    return sessionStorage.getItem(`subtab:${group}`);
  } catch {
    return null;
  }
}

function wireSubTabs(group, { defaultTab, onChange } = {}) {
  const bar = document.querySelector(`[data-sub-tabs="${group}"]`);
  if (!bar) return;

  const saved = getActiveSubTab(group);
  const initial = saved || defaultTab || bar.querySelector('.sub-tab')?.dataset.subTab;
  if (!initial) return;

  bar.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.subTab === getActiveSubTab(group)) return;
      showSubTab(group, btn.dataset.subTab);
      onChange?.(btn.dataset.subTab, group);
    });
  });
}

function restoreSubTabs(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.querySelectorAll('[data-sub-tabs]').forEach(bar => {
    const group = bar.dataset.subTabs;
    const saved = getActiveSubTab(group);
    const fallback = bar.querySelector('.sub-tab')?.dataset.subTab;
    if (saved || fallback) showSubTab(group, saved || fallback, { animate: false });
  });
}

function isSubTabActive(group, name) {
  return getActiveSubTab(group) === name;
}
