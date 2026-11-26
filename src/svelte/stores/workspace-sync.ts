/**
 * @module stores/workspace-sync
 * Reactive workspace view coordinator replacing the legacy `src/svelte/render/`
 * directory. Syncs dashboard KPIs, year selector, dropdowns, skipped months,
 * and analytics views from core state into Svelte 5 stores.
 */
import { GROUP_START_YEAR, NAMA_BULAN } from 'finkas/core/config';
import { billingPeriod, createDuesLedger } from 'finkas/core/dues';
import { currentRekapYear, getState } from 'finkas/core/state';
import { parseKasStart } from 'finkas/core/utils';
import { syncSkippedMonthsList, syncSvelteDashboard, syncYearGlider } from '../mount';
import { syncCdrop } from '../ui/cdrop';
import { enterHybridOverview } from '../ui/hybrid-motion';
import { filterKategori } from '../ui/transaction-form';
import { renderTableTransaksi, markUpdatedLedgerRow } from './history.svelte';
import {
  initDuesPagination,
  filterDuesStatus,
  markNewlyPaidCells,
  renderTableRekap,
  renderIuranMobileCards,
  toggleIuranCard,
} from './rekap.svelte';
import { renderSpotlight } from './spotlight.svelte';
import { renderHybridChart } from './stats.svelte';

export {
  renderTableTransaksi,
  markUpdatedLedgerRow,
  initDuesPagination,
  filterDuesStatus,
  markNewlyPaidCells,
  renderTableRekap,
  renderIuranMobileCards,
  toggleIuranCard,
};

export const renderDashboard = () => {
  let tMasuk = 0;
  let tKeluar = 0;
  let deposits = 0;
  const expenses = new Map<string, number>();
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
    state,
    ledger,
    current,
    deposits,
    expenses,
    totalMasuk: tMasuk,
    totalKeluar: tKeluar,
    groupName: document.getElementById('app-group-name')?.textContent?.trim() || '',
    firstRender: document.body?.dataset?.workspaceState === 'loading',
  });
  if (document.getElementById('bento-spark-month')) {
    renderSpotlight(ledger, current);
    enterHybridOverview();
  }
};

function setSelectOptions(id: string, items: string[][]) {
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

  const members = anggota
    .filter((ang) => ang.Status_Aktif === 'Aktif')
    .map((ang) => [ang.ID_Anggota, ang.Nama_Anggota]);
  members.unshift(['-', '-- Bukan transaksi anggota --']);
  setSelectOptions('edit-anggota', members);
  setSelectOptions('ops-anggota', members);

  const income = kategori
    .filter((kat) => kat.Tipe === 'Masuk')
    .map((kat) => [kat.ID_Kategori, kat.Nama_Kategori]);
  setSelectOptions('iuran-kategori', income.length ? income : [['', '-- Buat Kategori Masuk Dulu --']]);

  filterKategori('ops-tipe', 'ops-kategori');
  const { year, monthIndex } = billingPeriod();
  const tahunEl = document.getElementById('iuran-tahun') as HTMLInputElement | null;
  const bulanEl = document.getElementById('iuran-bulan') as HTMLSelectElement | null;
  if (tahunEl) tahunEl.value = String(year);
  if (bulanEl) bulanEl.value = NAMA_BULAN[monthIndex];
};

export const renderChart = async () => {
  const state = getState();
  const workspace = document.getElementById('workspace-stats');
  if (workspace?.hidden === false) renderHybridChart(state);
};

export const populateTahunRekap = () => {
  const selects = [
    document.getElementById('ui-tahun-rekap-select'),
    document.getElementById('ui-tahun-rekap-select-mobile'),
  ].filter((select) => select !== null);

  const state = getState();
  const currentYear = billingPeriod().year;
  const startYear = parseKasStart(state.kasStart)?.year ?? GROUP_START_YEAR;
  const yearsSet = new Set([String(currentYear), currentRekapYear]);
  if (startYear < currentYear) yearsSet.add(String(currentYear - 1));
  state.transaksi.forEach((t) => {
    if (t.Tahun_Iuran && t.Tahun_Iuran !== '-') yearsSet.add(t.Tahun_Iuran.toString());
  });

  const sortedYears = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));

  selects.forEach((select) => {
    const options = sortedYears.map((y) => {
      const option = document.createElement('option');
      option.value = y;
      option.text = y;
      if (y === currentRekapYear) option.selected = true;
      return option;
    });
    select.replaceChildren(...options);
    const group = select.closest('.year-pill')?.querySelector('.hybrid-year-glider') as HTMLElement | null | undefined;
    if (group) {
      const slot = select.id?.endsWith('-mobile') ? 'mobile' : 'desktop';
      const hidden = sortedYears.length > (slot === 'mobile' ? 2 : 3);
      syncYearGlider({
        target: group,
        slot,
        years: hidden ? [] : [...sortedYears].reverse(),
        activeYear: currentRekapYear,
        hidden,
      });
    }
  });
};

export const renderSkippedMonthsList = () => {
  const container = document.getElementById('skipped-months-list');
  const countBadge = document.getElementById('master-count-skipped');
  const { skippedMonths } = getState();
  if (countBadge) countBadge.textContent = String((skippedMonths || []).length);
  if (!container) return;
  const items = (skippedMonths || [])
    .slice()
    .sort()
    .reverse()
    .map((mm) => {
      const parts = mm.split('-');
      const label = parts.length === 2 ? `${NAMA_BULAN[parseInt(parts[0], 10) - 1]} ${parts[1]}` : mm;
      return { mm, label };
    });
  syncSkippedMonthsList({ items });
};

/** Re-sync every major workspace store & control. */
export const renderAll = () => {
  populateTahunRekap();
  renderDashboard();
  renderDropdowns();
  renderTableTransaksi();
  renderTableRekap();
  syncCdrop();
  renderChart();
};
