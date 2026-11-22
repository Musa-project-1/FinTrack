import { flushSync } from 'svelte';
import { createPagination } from 'finkas/pagination';
import { getState, currentHistoryFilter, getIsAdminView, getActiveGroupId } from '../core/state.js';
import { computeHistoryViewModel, formatLedgerRows, type HistoryRowVM } from './history-model';

export { computeHistoryViewModel };
const historyPagination = createPagination('history-pagination', 'transaksi', () => renderTableTransaksi());
export const initHistoryPagination = historyPagination.init;
export const historyStore = $state<{ rows: HistoryRowVM[] }>({ rows: [] });
let mountHistory: () => void;
export function registerHistoryMount(mountFn: () => void) { mountHistory = mountFn; }

export function resetHistoryGroupState() {
  historyStore.rows = [];
  const count = globalThis.document?.getElementById?.('hybrid-ledger-count');
  if (count) count.textContent = 'Menampilkan 0 transaksi';
}

export function renderTableTransaksi() {
  const doc = globalThis.document;
  const workspace = doc?.getElementById?.('workspace-history');
  if (!workspace || workspace.hidden !== false) return;
  const searchEl = doc.getElementById('workspace-search-history') as HTMLInputElement | null;
  const searchQuery = searchEl ? searchEl.value.toLowerCase() : '';
  const { flowCounts, filteredTrx, hint, anggotaById, kategoriById } = computeHistoryViewModel(getState(), {
    filter: currentHistoryFilter, searchQuery, isAdmin: getIsAdminView()
  });
  const labels = { semua: 'Semua', masuk: 'Masuk', keluar: 'Keluar' };
  for (const button of doc.querySelectorAll<HTMLElement>('.workspace-history-tools [data-filter]')) {
    const flow = button.dataset.filter as keyof typeof labels;
    if (Object.hasOwn(labels, flow)) button.textContent = `${labels[flow]} (${flowCounts[flow]})`;
  }
  const rows = historyPagination.paginate(filteredTrx, JSON.stringify([getActiveGroupId(), currentHistoryFilter, searchQuery]));
  const count = doc.getElementById('hybrid-ledger-count');
  if (count) count.textContent = `Menampilkan ${filteredTrx.length} transaksi`;
  historyStore.rows = formatLedgerRows(rows, anggotaById, kategoriById, hint);
  mountHistory();
  flushSync();
}
