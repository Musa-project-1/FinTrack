import { flushSync, mount } from 'svelte';
import { initHybridMotion } from 'finkas/hybrid-motion';
import { resetDashboardGroupState, updateDashboardStore, type DashboardInput } from './stores/store.svelte';
import { resetSpotlightGroupState, registerSpotlightMount, setSpotlightStampStyle } from './stores/spotlight.svelte';
import { resetHistoryGroupState, registerHistoryMount } from './stores/history.svelte';
import { resetStatsGroupState, registerStatsMount } from './stores/stats.svelte';
import { resetRekapGroupState, registerRekapMount } from './stores/rekap.svelte';

import { updateGroupPickerStore, type GroupPickerInput } from './stores/group-picker.svelte';
import { updateGroupAdminStore, updateSuperAdminStore, type GroupAdminInput, type SuperAdminInput } from './stores/group-admin.svelte';
import { updateOfflineQueueStore, resetOfflineQueueState, type OfflineQueueInput } from './stores/offline-queue.svelte';

import { updateProfileStore, setProfileStampStyle, resetProfileState, type ProfileInput } from './stores/profile.svelte';
import { updateReceiptStore, resetReceiptState, type ReceiptInput } from './stores/receipt.svelte';
import { updateSelfPayStore, resetSelfPayState, type SelfPayInput } from './stores/self-pay.svelte';

import {
  resetMasterState, updateMasterAnggotaStore, setMasterAnggotaQuery, updateMasterKategoriStore,
  updateAuditLogStore, updateSkippedMonthsStore, type MasterAnggotaRow, type MasterKategoriRow,
  type AuditLogInput, type SkippedMonthItem
} from './stores/master.svelte';
import { resetCashReportState, updateCashReportStore, type CashReportInput } from './stores/cash-report.svelte';

import {
  resetTransactionFormState, updateIuranChecklistStore, setIuranChecklistQuery,
  updateIuranReviewChipsStore, updateQuickPayPresetsStore, type IuranChecklistItem,
  type IuranReviewChip, type QuickPayPreset
} from './stores/transaction-form.svelte';
import { resetYearGliderState, updateYearGliderSlot, type YearSlot } from './stores/year-glider.svelte';
import { resetStampPreviewState, updateStampPreviewStore } from './stores/stamp-preview.svelte';

export { initDuesPagination, filterDuesStatus, markNewlyPaidCells, renderTableRekap,
  renderIuranMobileCards, toggleIuranCard, resetRekapFilter } from './stores/rekap.svelte';
export { computeRekapViewModel } from './stores/rekap-model';
export { initHistoryPagination, renderTableTransaksi, computeHistoryViewModel } from './stores/history.svelte';
export { renderHybridChart, computeStatsViewModel, selectStatsMonth } from './stores/stats.svelte';
export { computeDashboardViewModel, updateDashboardStore, setSelectedSparkMonth } from './stores/store.svelte';

export {
  initSpotlight, renderSpotlight, showSpotlightDetail, getPinnedMemberId, setMemberPin, toggleMemberPin,
  computeSpotlightViewModel
} from './stores/spotlight.svelte';

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
  resetMasterState();
  resetCashReportState();
  resetTransactionFormState();
  resetYearGliderState();
  resetStampPreviewState();
  const doc = globalThis.document;
  const alertEl = doc?.getElementById?.('cash-report-alert');
  if (typeof HTMLElement !== 'undefined' && alertEl instanceof HTMLElement) alertEl.style.display = 'none';
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

type Components = typeof import('./components');
type SimpleIsland = Exclude<keyof Components, 'YearGlider'>;

let registeredComponents: Components | null = null;

/** Register Svelte island components eagerly in browser ESM entries (avoids CJS require). */
export function registerComponents(comps: Components) {
  registeredComponents = comps;
}

function mountOnce(target: Element | null, render: (comps: Components, target: Element) => void) {
  if (!target?.ownerDocument || typeof Element === 'undefined' || mounted.has(target)) return;
  if (!registeredComponents) throw new Error('Svelte island components must be registered via registerComponents() before mounting.');
  target.replaceChildren();
  render(registeredComponents, target);
  mounted.add(target);
  mountedDocuments.add(target.ownerDocument);
}

function mountIsland(target: Element | null, component: SimpleIsland) {
  mountOnce(target, (components, el) => mount(components[component], { target: el }));
}

function syncIsland(id: string, component: SimpleIsland) {
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

export function syncMasterAnggotaRows(input: { rows: MasterAnggotaRow[]; query?: string }) {
  updateMasterAnggotaStore(input);
  syncIsland('master-anggota-tbody', 'MasterAnggotaRows');
}

export function syncMasterAnggotaFilter(query: string) {
  setMasterAnggotaQuery(query);
  const target = globalThis.document?.getElementById?.('master-anggota-tbody');
  if (!target) return;
  if (mounted.has(target)) {
    flushSync();
    return;
  }
  const q = query.trim().toLowerCase();
  target.querySelectorAll?.<HTMLElement>('tr.master-row').forEach(row => {
    const text = row.dataset.search || row.textContent || '';
    row.style.display = text.toLowerCase().includes(q) ? '' : 'none';
  });
}

export function syncMasterKategoriRows(input: { rows: MasterKategoriRow[] }) {
  updateMasterKategoriStore(input);
  syncIsland('master-kategori-tbody', 'MasterKategoriRows');
}

export function syncAuditLogRows(input: AuditLogInput) {
  updateAuditLogStore(input);
  syncIsland('audit-log-tbody', 'AuditLogRows');
}

export function syncSkippedMonthsList(input: { items: SkippedMonthItem[] }) {
  updateSkippedMonthsStore(input);
  syncIsland('skipped-months-list', 'SkippedMonthsList');
}

export function syncCashReport(input: CashReportInput) {
  listenForGroupChanges();
  updateCashReportStore(input);
  const doc = globalThis.document;
  mountIsland(doc?.getElementById?.('cash-report-alert'), 'CashReportAlert');
  mountIsland(doc?.getElementById?.('cash-report-details'), 'CashReportRows');
  if (mountedDocuments.has(doc)) flushSync();
}

export function syncIuranChecklist(input: { items: IuranChecklistItem[]; query?: string; target?: Element | null }) {
  listenForGroupChanges();
  updateIuranChecklistStore(input);
  const target = input.target ?? globalThis.document?.getElementById?.('iuran-checkbox-anggota');
  mountIsland(target, 'IuranMemberChecklist');
  if (target && mounted.has(target)) flushSync();
}

export function syncIuranChecklistFilter(query: string, target = globalThis.document?.getElementById?.('iuran-checkbox-anggota')) {
  setIuranChecklistQuery(query);
  if (target && mounted.has(target)) {
    flushSync();
    return;
  }
  const q = query.toLowerCase();
  globalThis.document?.querySelectorAll<HTMLElement>('.checkbox-grid .checkbox-item').forEach(item => {
    const name = item.querySelector?.('.chk-name-pending, .chk-name-lunas')?.textContent || item.innerText || '';
    item.style.display = name.toLowerCase().includes(q) ? 'flex' : 'none';
  });
}

export function syncIuranReviewChips(input: { visible: IuranReviewChip[]; extraCount: number; moreLabel: string }) {
  updateIuranReviewChipsStore(input);
  syncIsland('rev-iuran-chips', 'IuranReviewChips');
}

export function syncQuickPayPresets(input: { chips: QuickPayPreset[] }) {
  updateQuickPayPresetsStore(input);
  syncIsland('qp-presets', 'QuickPayPresets');
}

export function syncYearGlider({ target, slot, years, activeYear, hidden }: {
  target: HTMLElement | null; slot: YearSlot; years: string[]; activeYear: string; hidden: boolean
}) {
  if (!target) return;
  listenForGroupChanges();
  target.hidden = hidden;
  if (!hidden) {
    target.style.setProperty('--year-count', String(years.length));
    target.style.setProperty('--year-index', String(Math.max(0, years.indexOf(activeYear))));
  }
  updateYearGliderSlot(slot, { years: hidden ? [] : years, activeYear });
  mountOnce(target, (components, el) => mount(components.YearGlider, { target: el, props: { slot } }));
  if (mounted.has(target)) flushSync();
}

export function syncStampStylePreview(input: { styleKey: string; animate: boolean }) {
  updateStampPreviewStore(input);
  syncIsland('hybrid-stamp-sample', 'StampStylePreview');
}

export function refreshSpotlightStampStyle(styleKey: string) {
  setSpotlightStampStyle(styleKey);
  const target = globalThis.document?.getElementById?.('member-spotlight');
  if (target && mounted.has(target)) flushSync();
}
export * from './ui/dues-status';
export * from './ui/pagination';
export * from './ui/hybrid-motion';
export * from './ui/bulk-dues';
export * from './ui/transaction-form';
export * from './ui/edit-wizard';
export * from './ui/modal';
export * from './ui/save-status';
export * from './ui/i18n';
export * from './ui/theme';
export * from './ui/keel';
export * from './ui/control-a11y';
export * from './ui/cdrop';
export * from './ui/dpick';
export * from './ui/mpick';
export * from './ui/kasi-effects';
export * from './ui/kasi-stage';
export * from './ui/kasi-mascot';
export * from './stores/workspace-sync';
export * from './handlers/profile';
export * from './handlers/receipt';
export * from './ui/workspace';
export * from './ui/guided-tour';
export * from './handlers/attachments';
export * from './handlers/auth';
export * from './handlers/backup';
export * from './handlers/cash-report';
export * from './handlers/export';
export * from './handlers/groups';
export * from './ui/gestures';
export * from './ui/ui-moments';
export * from './ui/pin-input';
export * from './ui/bento-dashboard';
export { initApp, bootWorkspaceApp } from './app';
export * from './handlers/master';
export { flashMasterAnggotaSaved, flashMasterKategoriSaved, masterAnggotaStore, masterKategoriStore } from './stores/master.svelte';
export * from './handlers/navigation';
export * from './handlers/offlineQueue';
export * from './handlers/payment-account';
export * from './handlers/quickpay';
export * from './handlers/self-pay';
export * from './handlers/transaction-shared';
export { bukaModalTransaksi, submitIuran, submitOperasional, bukaModalEdit, submitEditTransaksi,
  konfirmasiHapus, eksekusiHapus } from './handlers/transactions';
export { initSkyJourney, skyLayerStatesAt } from './pages/journey';
export { initAmbientMotion, initEditorialFooter, initFeatureDossier, initHorizonSpline, initSectionReveal, initThemeToggle } from './pages/onboarding-motion';
export { INITIAL_DEMO_SALDO, initOnboardingStage, formatRp as formatOnboardingRp } from './pages/onboarding-stage';
export { bootOnboardingPage, submitPin } from './pages/onboarding';
export { bootPrivacyPage } from './pages/privacy';
export * from './core/config';
export * from './core/utils';
export * from './core/dues';
export * from './core/payment-account';
export * from './core/analytics';
export * from './core/state';
export * from './core/api-auth';
export * from './core/api-client';
export * from './core/offline-store';
export * from './core/mutation';
export * from './core/sync';
export * from './core/cash-report';
export { checkGroupUpdate, fetchAuditLogApi, fetchGroupsApi, fetchInitialData, postToBackend } from './core/api';
export {
  addOfflineTransaction, classifySyncResponse, countQueuedTransactions,
  countQueuedTransactionsByGroup, deleteOfflineTransaction, emitQueueStatus,
  getGroupOfflineTransactions, getOfflineTransactions, isAuthExpired,
  isRetryableServerError, isUnsyncedTempId, queueOfflinePayload,
  syncOfflineTransactions
} from './core/offline';
