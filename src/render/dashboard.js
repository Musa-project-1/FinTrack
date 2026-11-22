import { renderHybridChart } from '../ui/hybrid-chart.js';
import { enterHybridOverview } from '../ui/hybrid-motion.js';
import { NAMA_BULAN } from "../core/config.js";
import { getState } from "../core/state.js";
import { escapeHtml } from "../core/utils.js";
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

export const renderDropdowns = () => {
  const { anggota, kategori } = getState();

  let optAnggota = '<option value="-">-- Bukan transaksi anggota --</option>';
  anggota.forEach((ang) => {
    if (ang.Status_Aktif === 'Aktif') optAnggota += `<option value="${escapeHtml(ang.ID_Anggota)}">${escapeHtml(ang.Nama_Anggota)}</option>`;
  });
  document.getElementById('edit-anggota').innerHTML = optAnggota;
  document.getElementById('ops-anggota').innerHTML = optAnggota;

  let optKatMasuk = '';
  kategori.forEach((kat) => {
    if (kat.Tipe === 'Masuk') optKatMasuk += `<option value="${escapeHtml(kat.ID_Kategori)}">${escapeHtml(kat.Nama_Kategori)}</option>`;
  });
  if (optKatMasuk === '') optKatMasuk = '<option value="">-- Buat Kategori Masuk Dulu --</option>';
  document.getElementById('iuran-kategori').innerHTML = optKatMasuk;

  filterKategori('ops-tipe', 'ops-kategori');
  const { year, monthIndex } = billingPeriod();
  const tahunEl = document.getElementById('iuran-tahun');
  const bulanEl = document.getElementById('iuran-bulan');
  if (tahunEl) tahunEl.value = year;
  if (bulanEl) bulanEl.value = NAMA_BULAN[monthIndex];
};

/* ── Charts (#workspace-stats) ─────────────────────────────────── */

export const renderChart = async () => {
  const state = getState();
  const workspace = document.getElementById('workspace-stats');
  if (workspace?.hidden === false) renderHybridChart(state);
};
