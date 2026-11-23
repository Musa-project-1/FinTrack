import type { DashboardInput } from '../stores/store.svelte';
import { mountSvelteDashboard, syncSvelteDashboard } from '../mount';

export const initBento = mountSvelteDashboard;

export const renderBento = (
  state: DashboardInput['state'], ledger: DashboardInput['ledger'], current: DashboardInput['current'],
  deposits: number, expenses: DashboardInput['expenses']
) =>
  syncSvelteDashboard({
    state, ledger, current, deposits, expenses,
    groupName: document.getElementById('app-group-name')?.textContent?.trim() || '',
    firstRender: document.body?.dataset?.workspaceState === 'loading'
  });
