/**
 * @module render
 * Clean aggregator & re-exporter for modular renderers.
 */

export { renderDashboard, renderDropdowns, renderChart } from './render/dashboard.js';
export { renderTableTransaksi } from './render/transactions.js';
export { renderTableRekap, renderIuranMobileCards, toggleIuranCard, populateTahunRekap, renderSkippedMonthsList, markNewlyPaidCells } from './render/rekap.js';
export { bukaProfilAnggota } from './render/profile.js';

import { populateTahunRekap } from './render/rekap.js';
import { renderTableTransaksi } from './render/transactions.js';
import { renderDashboard, renderDropdowns, renderChart } from './render/dashboard.js';
import { renderTableRekap } from './render/rekap.js';
import { syncCdrop } from './ui/cdrop.js';

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
