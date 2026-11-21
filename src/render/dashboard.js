import { renderHybridChart } from '../ui/hybrid-chart.js';
import { animateHybridAmount, enterHybridOverview } from '../ui/hybrid-motion.js';
import { NAMA_BULAN, GROUP_START_YEAR, GROUP_START_MONTH } from "../core/config.js";
import { getState } from "../core/state.js";
import { formatDisplayRp, escapeHtml, parseKasStart } from "../core/utils.js";
import { billingPeriod, createDuesLedger } from "../core/dues.js";
import { renderBento } from "../ui/bento-dashboard.js";
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
  const saldo = tMasuk - tKeluar;
  const saldoFormatted = formatDisplayRp(saldo);

  const elMasuk = document.getElementById('ui-masuk');
  const elKeluar = document.getElementById('ui-keluar');
  const elSaldo = document.getElementById('ui-saldo');

  const firstRender = document.body?.dataset?.workspaceState === 'loading';
  animateHybridAmount(elMasuk, tMasuk, { from: firstRender ? 0 : undefined });
  animateHybridAmount(elKeluar, tKeluar, { from: firstRender ? 0 : undefined });
  animateHybridAmount(elSaldo, saldo, { from: firstRender ? 0 : undefined });

  if (document.getElementById('bento-spark-month')) {
    elSaldo?.style.setProperty('--amount-length', saldoFormatted.length);
    const current = billingPeriod();
    const ledger = createDuesLedger(state, { year: current.year });
    renderBento(state, ledger, current, deposits, expenses);
    renderSpotlight(ledger, current);
    renderGroupOverview(state, ledger);
    enterHybridOverview();
  }
};

const renderGroupOverview = (state, ledger) => {
  const section = document.getElementById('group-overview');
  const groupName = document.getElementById('app-group-name')?.textContent.trim();
  if (!section || !groupName) return;
  const start = parseKasStart(state.kasStart);
  const startLabel = start ? `${NAMA_BULAN[start.monthIndex]} ${start.year}` :
    `${NAMA_BULAN[GROUP_START_MONTH - 1]} ${GROUP_START_YEAR}`;
  document.getElementById('group-overview-name').textContent = groupName;
  document.getElementById('group-overview-fee').textContent = `Iuran ${formatDisplayRp(ledger.monthlyFee)}/bln`;
  document.getElementById('group-overview-members').textContent = `${ledger.members.length} anggota aktif`;
  document.getElementById('group-overview-start').textContent = `Awal kas: ${startLabel}`;
  section.hidden = false;
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
