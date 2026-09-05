/**
 * @module render
 * Clean aggregator & re-exporter for modular renderers.
 */

export { renderDashboard, renderDropdowns, renderChart } from './render/dashboard.js';
export { renderTableTransaksi, loadMoreHistory, populateFilterTahunHistory } from './render/transactions.js';
export { renderTableRekap, renderIuranMobileCards, toggleIuranCard, populateTahunRekap, renderSkippedMonthsList } from './render/rekap.js';
export { bukaProfilAnggota } from './render/profile.js';

import { populateTahunRekap } from './render/rekap.js';
import { populateFilterTahunHistory, renderTableTransaksi } from './render/transactions.js';
import { renderDashboard, renderDropdowns, renderChart } from './render/dashboard.js';
import { renderTableRekap } from './render/rekap.js';

/**
 * Re-render every major UI section.
 */
export const renderAll = () => {
  populateTahunRekap();
  populateFilterTahunHistory();
  renderDashboard();
  renderDropdowns();
  renderTableTransaksi();
  renderTableRekap();
  window.__renderChart && window.__renderChart();
};
