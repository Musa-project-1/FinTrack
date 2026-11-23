import { syncSkippedMonthsList, syncYearGlider } from '../mount';
import { GROUP_START_YEAR, NAMA_BULAN } from "finkas/core/config";
import { getState, currentRekapYear } from "finkas/core/state";
import { parseKasStart } from "finkas/core/utils";
import { billingPeriod } from "finkas/core/dues";

export const populateTahunRekap = () => {
  const selects = [
    document.getElementById('ui-tahun-rekap-select'),
    document.getElementById('ui-tahun-rekap-select-mobile')
  ].filter(select => select !== null);

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
    const group = (select.closest('.year-pill')?.querySelector('.hybrid-year-glider') as HTMLElement | null | undefined);
    if (group) {
      const slot = select.id?.endsWith('-mobile') ? 'mobile' : 'desktop';
      const hidden = sortedYears.length > (slot === 'mobile' ? 2 : 3);
      syncYearGlider({ target: group, slot, years: hidden ? [] : [...sortedYears].reverse(), activeYear: currentRekapYear, hidden });
    }
  });
};

export { initDuesPagination, filterDuesStatus, markNewlyPaidCells, renderTableRekap, renderIuranMobileCards, toggleIuranCard } from '../stores/rekap.svelte';

export const renderSkippedMonthsList = () => {
  const container = document.getElementById('skipped-months-list');
  const countBadge = document.getElementById('master-count-skipped');
  const { skippedMonths } = getState();
  if (countBadge) countBadge.textContent = String((skippedMonths || []).length);
  if (!container) return;
  const items = (skippedMonths || []).slice().sort().reverse().map((mm) => {
    const parts = mm.split('-');
    const label = parts.length === 2 ? `${NAMA_BULAN[parseInt(parts[0], 10) - 1]} ${parts[1]}` : mm;
    return { mm, label };
  });
  syncSkippedMonthsList({ items });
};
