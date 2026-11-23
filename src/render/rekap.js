import { syncSkippedMonthsList } from '../ui/svelte-dashboard.js';
import { GROUP_START_YEAR, NAMA_BULAN } from "../core/config.js";
import { getState, currentRekapYear } from "../core/state.js";
import { escapeHtml, parseKasStart } from "../core/utils.js";
import { billingPeriod } from "../core/dues.js";

export const populateTahunRekap = () => {
  const selects = [
    document.getElementById('ui-tahun-rekap-select'),
    document.getElementById('ui-tahun-rekap-select-mobile')
  ].filter(Boolean);

  const state = getState();
  const currentYear = billingPeriod().year;
  const startYear = parseKasStart(state.kasStart)?.year ?? GROUP_START_YEAR;
  const yearsSet = new Set([String(currentYear), currentRekapYear]);
  if (startYear < currentYear) yearsSet.add(String(currentYear - 1));
  state.transaksi.forEach((t) => {
    if (t.Tahun_Iuran && t.Tahun_Iuran !== '-') yearsSet.add(t.Tahun_Iuran.toString());
  });

  const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

  selects.forEach((select) => {
    select.innerHTML = '';
    sortedYears.forEach((y) => {
      const option = document.createElement('option');
      option.value = y;
      option.text = y;
      if (y === currentRekapYear) option.selected = true;
      select.appendChild(option);
    });
    const group = select.closest('.year-pill')?.querySelector('.hybrid-year-glider');
    if (group) {
      const limit = select.id?.endsWith('-mobile') ? 2 : 3;
      group.hidden = sortedYears.length > limit;
      if (group.hidden) {
        group.replaceChildren();
        return;
      }
      const years = [...sortedYears].reverse();
      group.style.setProperty('--year-count', years.length);
      group.style.setProperty('--year-index', Math.max(0, years.indexOf(currentRekapYear)));
      group.innerHTML = '<span class="year-glider-indicator" aria-hidden="true"></span>' + years.map((year) => `<button type="button"
        data-action="select-rekap-year" data-year="${escapeHtml(year)}" aria-pressed="${year === currentRekapYear}">${escapeHtml(year)}</button>`).join('');
    }
  });
};

export { initDuesPagination, filterDuesStatus, markNewlyPaidCells, renderTableRekap, renderIuranMobileCards, toggleIuranCard } from '../ui/svelte-dashboard.js';

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
