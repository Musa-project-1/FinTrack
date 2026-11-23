import { getInput, htmlElements } from '../../core/utils.js';
import { renderChart, renderTableTransaksi } from '../render/index';
import { setBottomNavActive, setHistoryFilter } from '../handlers/navigation';

let gliderSyncers: Array<{ sync(): void; schedule(): void }> = [];
export const syncWorkspaceGliders = (immediate = false) => {
  for (const entry of gliderSyncers) (immediate ? entry.sync : entry.schedule)();
};
const syncAllGliders = () => syncWorkspaceGliders(false);

export const switchWorkspace = (name?: string) => {
  if (name !== 'history' && name !== 'iuran' && name !== 'stats') return;
  const tabs = [...htmlElements('.workspace-tabs [role="tab"]')];
  const index = tabs.findIndex((tab) => tab.dataset.panel === name);
  if (index < 0 || tabs[index].getAttribute('aria-selected') === 'true') return;

  tabs.forEach((tab, position) => {
    const active = position === index;
    const panel = document.getElementById(tab.getAttribute('aria-controls') || '');
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (!panel) return;
    panel.classList.remove('cascade-enter', 'panel-switch-enter');
    panel.hidden = !active;
    if (active) {
      void panel.offsetWidth;
      panel.classList.add('panel-switch-enter');
      const onPanelEnterEnd = (event: AnimationEvent) => {
        if (event.target === panel && event.animationName === 'panel-fade-in') {
          panel.classList.remove('panel-switch-enter');
          panel.removeEventListener('animationend', onPanelEnterEnd);
        }
      };
      panel.addEventListener('animationend', onPanelEnterEnd);
    }
  });
  setBottomNavActive({ history: 'nav-riwayat', iuran: 'nav-rekap', stats: 'nav-stats' }[name]);
  if (name === 'history') renderTableTransaksi();
  if (name === 'stats') renderChart();
  syncWorkspaceGliders(true);
};

export const openWorkspaceHistory = (filter?: string) => {
  const chip = [...htmlElements('[data-action="set-history-filter"]')]
    .find((button) => button.dataset.filter === filter);
  if (chip) {
    const searchEl = getInput('workspace-search-history');
    if (searchEl) searchEl.value = '';
    setHistoryFilter(filter);
  }
  switchWorkspace('history');
  const panel = document.getElementById('workspace-history');
  panel?.focus({ preventScroll: true });
  panel?.scrollIntoView({ block: 'start' });
};

export const initWorkspace = () => {
  const tablist = (document.querySelector('.workspace-tabs') as HTMLElement|null);
  if (!tablist) return;
  const tabs = [...htmlElements('[role="tab"]', tablist)];
  gliderSyncers = [];

  for (const track of htmlElements('.workspace-tabs, .workspace-status-filter, .role-switcher-track')) {
    const syncGlider = () => {
      const selected = (track.querySelector('[aria-selected="true"], [aria-pressed="true"]') as HTMLElement|null);
      if (!selected?.offsetWidth) return;
      track.style.setProperty('--glider-left', `${selected.offsetLeft}px`);
      track.style.setProperty('--glider-width', `${selected.offsetWidth}px`);
    };
    let rafId = 0;
    const scheduleSync = () => {
      if (typeof requestAnimationFrame !== 'function') {
        syncGlider();
        return;
      }
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        syncGlider();
      });
    };
    const resize = new ResizeObserver(scheduleSync);
    const selection = new MutationObserver(scheduleSync);
    resize.observe(track);
    for (const control of track.querySelectorAll('button')) resize.observe(control);
    selection.observe(track, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
      attributeFilter: ['aria-selected', 'aria-pressed']
    });
    gliderSyncers.push({ sync: syncGlider, schedule: scheduleSync });
    syncGlider();
    scheduleSync();
  }

  tablist.addEventListener('keydown', (event) => {
    const current = tabs.findIndex(tab => tab === event.target);
    if (current < 0) return;
    const last = tabs.length - 1;
    const positions: Record<string, number> = {
      ArrowLeft: current === 0 ? last : current - 1,
      ArrowRight: current === last ? 0 : current + 1,
      Home: 0,
      End: last
    };
    const next = positions[event.key];
    if (next === undefined) return;
    event.preventDefault();
    tabs[next].focus();
    switchWorkspace(tabs[next].dataset.panel);
  });

  document.addEventListener('finkas:theme-changed', () => {
    if (document.getElementById('workspace-stats')?.hidden === false) renderChart();
  });
  document.addEventListener('finkas:language-changed', syncAllGliders);
  document.fonts?.ready?.then(syncAllGliders);

  const tabsScroller = document.querySelector('.workspace-tabs-scroll');
  if (tabsScroller && tabs.length > 1 &&
      typeof CSS !== 'undefined' && !CSS.supports('animation-timeline', 'scroll()') &&
      typeof IntersectionObserver !== 'undefined') {
    const [firstTab, lastTab] = [tabs[0], tabs[tabs.length - 1]];
    const fadeObserver = new IntersectionObserver((entries) => {
      for (const { target, intersectionRatio } of entries) {
        tabsScroller.classList.toggle(target === firstTab ? 'more-start' : 'more-end', intersectionRatio < 1);
      }
    }, { root: tabsScroller, threshold: 1, rootMargin: '1px' });
    fadeObserver.observe(firstTab);
    fadeObserver.observe(lastTab);
  }
};
