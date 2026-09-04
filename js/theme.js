/**
 * @module theme
 * Dark/light theme toggle and persistence.
 */

import { THEME_KEY } from './config.js';
import { getCashFlowChart, getExpenseChart } from './state.js';

/**
 * Apply the saved theme to the document and update meta theme-color.
 */
export const applyTheme = () => {
  const isDark = localStorage.getItem(THEME_KEY) === 'dark';
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const themeIcons = document.querySelectorAll('.theme-icon');

  if (isDark) {
    document.body.classList.add('dark-mode');
    themeIcons.forEach((icon) => icon.classList.replace('ph-moon', 'ph-sun'));
    if (metaTheme) metaTheme.setAttribute('content', '#0f172a');
  } else {
    document.body.classList.remove('dark-mode');
    themeIcons.forEach((icon) => icon.classList.replace('ph-sun', 'ph-moon'));
    if (metaTheme) metaTheme.setAttribute('content', '#f1f5f9');
  }

  // Re-render charts only if the statistics modal is currently open
  // This prevents main thread freeze / lag when switching themes on dashboard
  const statModal = document.getElementById('modal-statistik');
  if (statModal && statModal.classList.contains('active')) {
    const renderChartFn = window.__renderChart;
    if (renderChartFn) renderChartFn();
  }
};

let themeTransitionTimeout = null;

/**
 * Toggle between dark and light theme with synchronized transition.
 */
export const toggleTheme = () => {
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');

  // Trigger synchronized global transition class
  document.body.classList.add('theme-transitioning');
  if (themeTransitionTimeout) clearTimeout(themeTransitionTimeout);

  applyTheme();

  themeTransitionTimeout = setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
  }, 260);
};
