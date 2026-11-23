import { renderHybridChart } from '../ui/hybrid-chart.js';
import { enterHybridOverview } from '../ui/hybrid-motion.js';
import { NAMA_BULAN } from "../core/config.js";
import { getState } from "../core/state.js";
import { billingPeriod, createDuesLedger } from "../core/dues.js";
import { syncSvelteDashboard } from "../ui/svelte-dashboard.js";
import { renderSpotlight } from "../ui/spotlight.js";
import { filterKategori } from "../ui/modal.js";

/* ── Dashboard summary cards ───────────────────────────────────── */

export const renderDashboard = () => {
  let tMasuk = 0, tKeluar = 0, deposits = 0;
  const expenses = new Map();
  const state = getState();
  state.transaksi.forEach((trx) => {
    const nom = Number(trx.Nominal) || 0;
    if (trx.Tipe_Arus === 'Masuk') {
      tMasuk += nom;
      deposits++;
    } else if (trx.Tipe_Arus === 'Keluar') {
      tKeluar += nom;
      expenses.set(trx.ID_Kategori, (expenses.get(trx.ID_Kategori) || 0) + nom);
    }
  });
  const current = billingPeriod();
  const ledger = createDuesLedger(state, { year: current.year });
  syncSvelteDashboard({
    state, ledger, current, deposits, expenses, totalMasuk: tMasuk, totalKeluar: tKeluar,
    groupName: document.getElementById('app-group-name')?.textContent?.trim() || '',
    firstRender: document.body?.dataset?.workspaceState === 'loading'
  });
  if (document.getElementById('bento-spark-month')) {
    renderSpotlight(ledger, current);
    enterHybridOverview();
  }
};

/* ── Dropdown population ───────────────────────────────────────── */

function setSelectOptions(id, items) {
  const select = document.getElementById(id);
  if (!select) return;
  const nodes = items.map(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  });
  select.replaceChildren(...nodes);
}

export const renderDropdowns = () => {
  const { anggota, kategori } = getState();

  const members = anggota.filter(ang => ang.Status_Aktif === 'Aktif').map(ang => [ang.ID_Anggota, ang.Nama_Anggota]);
  members.unshift(['-', '-- Bukan transaksi anggota --']);
  setSelectOptions('edit-anggota', members);
  setSelectOptions('ops-anggota', members);

  const income = kategori.filter(kat => kat.Tipe === 'Masuk').map(kat => [kat.ID_Kategori, kat.Nama_Kategori]);
  setSelectOptions('iuran-kategori', income.length ? income : [['', '-- Buat Kategori Masuk Dulu --']]);

  filterKategori('ops-tipe', 'ops-kategori');
  const { year, monthIndex } = billingPeriod();
  const tahunEl = /** @type {HTMLInputElement | null} */ (document.getElementById('iuran-tahun'));
  const bulanEl = /** @type {HTMLSelectElement | null} */ (document.getElementById('iuran-bulan'));
  if (tahunEl) tahunEl.value = String(year);
  if (bulanEl) bulanEl.value = NAMA_BULAN[monthIndex];
};

/* ── Charts (#workspace-stats) ─────────────────────────────────── */

export const renderChart = async () => {
  const state = getState();
  const workspace = document.getElementById('workspace-stats');
  if (workspace?.hidden === false) renderHybridChart(state);
};
