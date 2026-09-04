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

/**
 * Toggle between dark and light theme using native View Transitions API
 * (Hardware GPU accelerated cross-fade) or instant fallback.
 */
export const toggleTheme = () => {
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');

  // If the browser supports View Transitions API (Chrome/Edge/Android/iOS 18+),
  // let the GPU take a screenshot and cross-fade the entire viewport seamlessly.
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      applyTheme();
    });
  } else {
    applyTheme();
  }
};
