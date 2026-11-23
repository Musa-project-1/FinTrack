/**
 * @module render
 * Clean aggregator & re-exporter for modular renderers.
 */

export { renderDashboard, renderDropdowns, renderChart } from './dashboard';
export { renderTableTransaksi } from '../stores/history.svelte';
export { renderTableRekap, renderIuranMobileCards, toggleIuranCard, markNewlyPaidCells } from '../stores/rekap.svelte';
export { populateTahunRekap, renderSkippedMonthsList } from './rekap';
export { bukaProfilAnggota } from './profile';

import { populateTahunRekap } from './rekap';
import { renderTableTransaksi } from '../stores/history.svelte';
import { renderDashboard, renderDropdowns, renderChart } from './dashboard';
import { renderTableRekap } from '../stores/rekap.svelte';
import { syncCdrop } from '../ui/cdrop';

/**
 * Re-render every major UI section.
 */
export const renderAll = () => {
  populateTahunRekap();
  renderDashboard();
  renderDropdowns();
  renderTableTransaksi();
  renderTableRekap();
  syncCdrop();
  renderChart();
};
