import { flushSync, mount } from 'svelte';
import { initHybridMotion } from 'finkas/hybrid-motion';
import { updateDashboardStore, type DashboardInput } from './store.svelte';
import { registerSpotlightMount } from './spotlight.svelte';
import { registerHistoryMount } from './history.svelte';
import { registerStatsMount } from './stats.svelte';
import { registerRekapMount } from './rekap.svelte';

export { initDuesPagination, filterDuesStatus, markNewlyPaidCells, renderTableRekap,
  renderIuranMobileCards, toggleIuranCard, resetRekapFilter } from './rekap.svelte';
export { computeRekapViewModel } from './rekap-model';
export { initHistoryPagination, renderTableTransaksi, computeHistoryViewModel } from './history.svelte';
export { renderHybridChart, computeStatsViewModel, selectStatsMonth } from './stats.svelte';
export { computeDashboardViewModel, updateDashboardStore, setSelectedSparkMonth } from './store.svelte';

export {
  initSpotlight, renderSpotlight, showSpotlightDetail, getPinnedMemberId, setMemberPin, toggleMemberPin,
  computeSpotlightViewModel
} from './spotlight.svelte';

registerSpotlightMount(mountSvelteDashboard);
registerHistoryMount(mountSvelteDashboard);
registerStatsMount(mountSvelteDashboard);
registerRekapMount(mountSvelteDashboard);
const mounted = new WeakSet<Element>();

export function mountSvelteDashboard() {
  if (typeof document === 'undefined' || typeof Element === 'undefined' || typeof document.createElementNS !== 'function') return;
  const group = document.getElementById?.('group-overview');
  const bento = document.querySelector?.('.bento-dashboard');
  const member = document.getElementById?.('member-spotlight');
  const admin = document.getElementById?.('admin-priorities');
  const history = document.getElementById?.('hybrid-ledger-list');
  const stats = document.getElementById?.('workspace-stats');
  const matrix = document.getElementById?.('ui-table-rekap');
  const cards = document.getElementById?.('iuran-cards-mobile');
  if (![group, bento, member, admin, history, stats, matrix, cards].some(el => el?.ownerDocument && !mounted.has(el))) return;
  // Rolldown defers component initialization until the browser DOM exists.
  const components: typeof import('./components') = require('./components');
  for (const [target, component] of [
    [group, components.GroupOverview], [bento, components.BentoDashboard], [member, components.MemberSpotlight],
    [admin, components.AdminPriorities], [history, components.HistoryLedger], [stats, components.WorkspaceStats],
    [matrix, components.DuesMatrix], [cards, components.DuesMobileCards]
  ] as const) {
    if (!target?.ownerDocument || mounted.has(target)) continue;
    target.replaceChildren();
    mount(component, { target });
    mounted.add(target);
  }
  initHybridMotion();
}

export function syncSvelteDashboard(input: DashboardInput) {
  const model = updateDashboardStore(input);
  mountSvelteDashboard();
  flushSync();
  const group = globalThis.document?.getElementById?.('group-overview');
  if (group) group.hidden = !model.visible;
}
