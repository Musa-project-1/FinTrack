import { flushSync } from 'svelte';
import { createPagination } from 'finkas/pagination';
import { getState, currentHistoryFilter, getIsAdminView, getActiveGroupId } from 'finkas/core/state';
import { computeHistoryViewModel, formatLedgerRows, type HistoryRowVM } from './history-model';

export { computeHistoryViewModel };
const historyPagination = createPagination('history-pagination', 'transaksi', () => renderTableTransaksi());
export const initHistoryPagination = historyPagination.init;
export const historyStore = $state<{
  rows: HistoryRowVM[];
  allFilteredIds: string[];
  updatedId: string;
  isAdmin: boolean;
  selectMode: boolean;
  selectedIds: string[];
  isDeleting: boolean;
}>({
  rows: [],
  allFilteredIds: [],
  updatedId: '',
  isAdmin: false,
  selectMode: false,
  selectedIds: [],
  isDeleting: false,
});
let mountHistory: () => void;
let updatedRowTimer: ReturnType<typeof setTimeout> | undefined;
export function registerHistoryMount(mountFn: () => void) { mountHistory = mountFn; }

export function toggleHistorySelectMode() {
  if (!historyStore.isAdmin) return;
  historyStore.selectMode = !historyStore.selectMode;
  if (!historyStore.selectMode) historyStore.selectedIds = [];
}

export function toggleHistoryRowSelect(id: string) {
  if (!historyStore.selectMode || !id) return;
  const next = new Set(historyStore.selectedIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  historyStore.selectedIds = [...next];
}

export function toggleSelectAllHistory() {
  if (!historyStore.selectMode) return;
  const all = historyStore.allFilteredIds;
  const allSelected = all.length > 0 && all.every((id) => historyStore.selectedIds.includes(id));
  historyStore.selectedIds = allSelected ? [] : [...all];
}

export function clearHistorySelection(exitMode = false) {
  historyStore.selectedIds = [];
  if (exitMode) historyStore.selectMode = false;
}

export function markUpdatedLedgerRow(id: string) {
  clearTimeout(updatedRowTimer);
  historyStore.updatedId = id;
  if (!id) return;
  updatedRowTimer = setTimeout(() => {
    if (historyStore.updatedId === id) historyStore.updatedId = '';
  }, 1100);
  (updatedRowTimer as { unref?: () => void })?.unref?.();
}

export function resetHistoryGroupState() {
  clearTimeout(updatedRowTimer);
  historyStore.rows = [];
  historyStore.allFilteredIds = [];
  historyStore.updatedId = '';
  historyStore.selectMode = false;
  historyStore.selectedIds = [];
  historyStore.isDeleting = false;
  const count = globalThis.document?.getElementById?.('hybrid-ledger-count');
  if (count) count.textContent = 'Menampilkan 0 transaksi';
}

export function renderTableTransaksi() {
  const doc = globalThis.document;
  const workspace = doc?.getElementById?.('workspace-history');
  if (!workspace || workspace.hidden !== false) return;
  const searchEl = doc.getElementById('workspace-search-history') as HTMLInputElement | null;
  const searchQuery = searchEl ? searchEl.value.toLowerCase() : '';
  const isAdmin = getIsAdminView();
  const { flowCounts, filteredTrx, hint, anggotaById, kategoriById } = computeHistoryViewModel(getState(), {
    filter: currentHistoryFilter, searchQuery, isAdmin
  });
  const labels = { semua: 'Semua', masuk: 'Masuk', keluar: 'Keluar' };
  for (const button of doc.querySelectorAll<HTMLElement>('.workspace-history-tools [data-filter]')) {
    const flow = button.dataset.filter as keyof typeof labels;
    if (Object.hasOwn(labels, flow)) button.textContent = `${labels[flow]} (${flowCounts[flow]})`;
  }
  const rows = historyPagination.paginate(filteredTrx, JSON.stringify([getActiveGroupId(), currentHistoryFilter, searchQuery]));
  const count = doc.getElementById('hybrid-ledger-count');
  if (count) count.textContent = `Menampilkan ${filteredTrx.length} transaksi`;
  historyStore.isAdmin = isAdmin;
  if (!isAdmin && historyStore.selectMode) {
    historyStore.selectMode = false;
    historyStore.selectedIds = [];
  }
  const validIds = filteredTrx.map((t) => t.ID_Transaksi).filter(Boolean);
  historyStore.allFilteredIds = validIds;
  if (historyStore.selectedIds.length) {
    const validSet = new Set(validIds);
    historyStore.selectedIds = historyStore.selectedIds.filter((id) => validSet.has(id));
  }
  historyStore.rows = formatLedgerRows(rows, anggotaById, kategoriById, hint);
  mountHistory();
  flushSync();
}
