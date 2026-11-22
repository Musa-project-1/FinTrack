import { mountSvelteDashboard, syncSvelteDashboard } from './svelte-dashboard.js';

export const initBento = mountSvelteDashboard;

export const renderBento = (state, ledger, current, deposits, expenses) =>
  syncSvelteDashboard({
    state, ledger, current, deposits, expenses,
    groupName: document.getElementById('app-group-name')?.textContent?.trim() || '',
    firstRender: document.body?.dataset?.workspaceState === 'loading'
  });
