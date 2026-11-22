import { createPagination } from '../ui/pagination.js';
import { byNewestTimestamp } from "../core/config.js";
import { getState, currentHistoryFilter, getIsAdminView, getActiveGroupId } from "../core/state.js";
import { formatDisplayRp, escapeHtml } from "../core/utils.js";

const historyPagination = createPagination('history-pagination', 'transaksi', () => renderTableTransaksi());
export const initHistoryPagination = historyPagination.init;

/* ── Transaction history ledger (#workspace-history) ───────────── */

export const renderTableTransaksi = () => {
  const workspace = document.getElementById('workspace-history');
  if (!workspace || workspace.hidden !== false) return;
  const state = getState();

  const searchInput = document.getElementById('workspace-search-history');
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';

  const anggotaById = new Map(state.anggota.map((a) => [a.ID_Anggota, a]));
  const kategoriById = new Map(state.kategori.map((k) => [k.ID_Kategori, k]));

  const flowCounts = { semua: 0, masuk: 0, keluar: 0 };
  const filteredTrx = [...state.transaksi].sort(byNewestTimestamp).filter((trx) => {
    const rowTipe = (trx.Tipe_Arus || '').toLowerCase();
    const rowIsIuran = Boolean(trx.ID_Anggota) && trx.ID_Anggota !== '-';

    const matchesChip =
      currentHistoryFilter === 'semua' ||
      (currentHistoryFilter === 'masuk' && rowTipe === 'masuk') ||
      (currentHistoryFilter === 'keluar' && rowTipe === 'keluar') ||
      (currentHistoryFilter === 'iuran' && rowIsIuran) ||
      (currentHistoryFilter === 'operasional' && !rowIsIuran);

    const objKat = kategoriById.get(trx.ID_Kategori);
    const namaKat = objKat ? objKat.Nama_Kategori.toLowerCase() : '';
    const angObj = trx.ID_Anggota && trx.ID_Anggota !== '-' ? anggotaById.get(trx.ID_Anggota) : null;
    const namaAnggota = angObj ? angObj.Nama_Anggota.toLowerCase() : '';
    const ket = (trx.Keterangan || '').toLowerCase();
    const bulanIuran = (trx.Bulan_Iuran || '').toLowerCase();
    const tahunIuran = String(trx.Tahun_Iuran || '');
    const idTrx = (trx.ID_Transaksi || '').toLowerCase();

    const matchesSearch =
      searchQuery === '' ||
      namaAnggota.includes(searchQuery) ||
      ket.includes(searchQuery) ||
      namaKat.includes(searchQuery) ||
      bulanIuran.includes(searchQuery) ||
      tahunIuran.includes(searchQuery) ||
      idTrx.includes(searchQuery);

    if (!matchesSearch) return false;
    flowCounts.semua++;
    if (rowTipe === 'masuk' || rowTipe === 'keluar') flowCounts[rowTipe]++;
    return matchesChip;
  });

  const labels = { semua: 'Semua', masuk: 'Masuk', keluar: 'Keluar' };
  for (const button of document.querySelectorAll('.workspace-history-tools [data-filter]')) {
    const flow = button.dataset.filter;
    button.textContent = `${labels[flow]} (${flowCounts[flow]})`;
  }
  const rows = historyPagination.paginate(filteredTrx,
    JSON.stringify([getActiveGroupId(), currentHistoryFilter, searchQuery]));
  renderWorkspaceLedger(rows, filteredTrx.length, anggotaById, kategoriById);
};

const renderWorkspaceLedger = (rows, count, members, categories) => {
  const list = document.getElementById('hybrid-ledger-list');
  if (!list) return;
  const countEl = document.getElementById('hybrid-ledger-count');
  if (countEl) countEl.textContent = `Menampilkan ${count} transaksi`;
  const hint = getIsAdminView() ? 'Koreksi / Struk' : 'Lihat Struk';
  list.innerHTML = rows.length ? rows.map((trx) => {
    const inflow = trx.Tipe_Arus === 'Masuk';
    const category = categories.get(trx.ID_Kategori)?.Nama_Kategori || 'Operasional';
    const member = members.get(trx.ID_Anggota)?.Nama_Anggota;
    const title = member && trx.Bulan_Iuran && trx.Bulan_Iuran !== '-'
      ? `Iuran ${trx.Bulan_Iuran} · ${member}` : trx.Keterangan?.trim() || category;
    const date = new Date(trx.Timestamp);
    const label = Number.isFinite(date.valueOf()) ? date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric'
    }) : '—';
    const flow = inflow ? 'inflow' : 'outflow';
    return `<button type="button" class="ledger-row" data-action="open-receipt" data-id="${escapeHtml(trx.ID_Transaksi)}">
      <span class="ledger-type-icon ${flow}" aria-hidden="true"><i class="ph ${inflow ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i></span>
      <span class="ledger-main">
        <span class="ledger-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
        <span class="ledger-meta"><span class="mono">${escapeHtml(label)}</span>
          <span class="cat-tag">${escapeHtml(category)}</span><span class="ledger-id">${escapeHtml(trx.ID_Transaksi)}</span></span>
      </span>
      <span class="ledger-amt-col"><span class="ledger-amt ${flow} nominal-val sensitive-amt">${inflow ? '+' : '−'}${escapeHtml(formatDisplayRp(trx.Nominal))}</span>
        <span class="ledger-action-hint">${hint}</span></span>
    </button>`;
  }).join('') : '<p class="hybrid-ledger-empty">Belum ada transaksi yang sesuai filter.</p>';
};
