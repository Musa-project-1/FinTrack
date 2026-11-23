import { flushSync, mount } from 'svelte';
import { initHybridMotion } from 'finkas/hybrid-motion';
import { resetDashboardGroupState, updateDashboardStore, type DashboardInput } from './store.svelte';
import { resetSpotlightGroupState, registerSpotlightMount } from './spotlight.svelte';
import { resetHistoryGroupState, registerHistoryMount } from './history.svelte';
import { resetStatsGroupState, registerStatsMount } from './stats.svelte';
import { resetRekapGroupState, registerRekapMount } from './rekap.svelte';

import { updateGroupPickerStore, type GroupPickerInput } from './group-picker.svelte';
import { updateGroupAdminStore, updateSuperAdminStore, type GroupAdminInput, type SuperAdminInput } from './group-admin.svelte';
import { updateOfflineQueueStore, resetOfflineQueueState, type OfflineQueueInput } from './offline-queue.svelte';

import { updateProfileStore, setProfileStampStyle, resetProfileState, type ProfileInput } from './profile.svelte';
import { updateReceiptStore, resetReceiptState, type ReceiptInput } from './receipt.svelte';
import { updateSelfPayStore, resetSelfPayState, type SelfPayInput } from './self-pay.svelte';

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

const listeningWindows = new WeakSet<object>();
const mountedDocuments = new WeakSet<Document>();

export function resetSvelteGroupViewState() {
  resetDashboardGroupState();
  resetSpotlightGroupState();
  resetHistoryGroupState();
  resetStatsGroupState();
  resetRekapGroupState();
  resetOfflineQueueState();
  resetProfileState();
  resetReceiptState();
  resetSelfPayState();
  const doc = globalThis.document;
  for (const id of ['group-overview', 'member-spotlight', 'admin-priorities']) {
    const section = doc?.getElementById?.(id);
    if (section) section.hidden = true;
  }
  if (mountedDocuments.has(doc)) flushSync();
}

function listenForGroupChanges() {
  const win = globalThis.window;
  if (!win?.addEventListener || listeningWindows.has(win)) return;
  win.addEventListener('finkas:group-changed', resetSvelteGroupViewState);
  listeningWindows.add(win);
}
listenForGroupChanges();

function mountIsland(target: Element | null, component: keyof typeof import('./components')) {
  if (!target?.ownerDocument || typeof Element === 'undefined' || mounted.has(target)) return;
  // Defer Svelte template initialization until a browser DOM exists.
  const components: typeof import('./components') = require('./components');
  target.replaceChildren();
  mount(components[component], { target });
  mounted.add(target);
  mountedDocuments.add(target.ownerDocument);
}

function syncIsland(id: string, component: keyof typeof import('./components')) {
  listenForGroupChanges();
  const target = globalThis.document?.getElementById?.(id);
  if (!target) return;
  mountIsland(target, component);
  if (mounted.has(target)) flushSync();
}

export function syncGroupPickerList(input: GroupPickerInput) {
  updateGroupPickerStore(input);
  syncIsland('group-picker-list', 'GroupPickerList');
}

export function syncGroupAdminList(input: GroupAdminInput) {
  updateGroupAdminStore(input);
  syncIsland('group-admin-list', 'GroupAdminList');
}

export function syncSuperAdminList(input: SuperAdminInput) {
  updateSuperAdminStore(input);
  syncIsland('superadmin-emails-list', 'SuperAdminList');
}

export function syncOfflineQueueList(input: OfflineQueueInput) {
  updateOfflineQueueStore(input);
  syncIsland('offline-queue-list', 'OfflineQueueList');
}

export function syncMemberProfile(input: ProfileInput) {
  listenForGroupChanges();
  updateProfileStore(input);
  const doc = globalThis.document;
  mountIsland(doc?.getElementById?.('passbook-months'), 'PassbookMonths');
  mountIsland(doc?.getElementById?.('p-list-transaksi'), 'ProfileHistoryList');
  if (mountedDocuments.has(doc)) flushSync();
}

export function refreshProfileStampStyle(styleKey: string) {
  setProfileStampStyle(styleKey);
  const target = globalThis.document?.getElementById?.('passbook-months');
  if (target && mounted.has(target)) flushSync();
}

export function syncReceiptBody(input: ReceiptInput) {
  updateReceiptStore(input);
  syncIsland('receipt-body', 'ReceiptBody');
}

export function syncSelfPayMonths(input: SelfPayInput) {
  updateSelfPayStore(input);
  syncIsland('self-pay-months', 'SelfPayMonths');
}

export function mountSvelteDashboard() {
  listenForGroupChanges();
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
  for (const [target, component] of [
    [group, 'GroupOverview'], [bento, 'BentoDashboard'], [member, 'MemberSpotlight'],
    [admin, 'AdminPriorities'], [history, 'HistoryLedger'], [stats, 'WorkspaceStats'],
    [matrix, 'DuesMatrix'], [cards, 'DuesMobileCards']
  ] as const) {
    mountIsland(target, component);
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
