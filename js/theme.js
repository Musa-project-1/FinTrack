/**
 * @module theme
 * Dark/light theme toggle and persistence.
 */

import { THEME_KEY, HEADER_STATS_KEY } from './config.js';
import { getCashFlowChart, getExpenseChart } from './state.js';
import { showToast } from './utils.js';

/**
 * Apply the saved header stats position preference.
 */
export const applyHeaderStatsPreference = () => {
  const isHeaderStats = localStorage.getItem(HEADER_STATS_KEY) === 'true';
  document.body.classList.toggle('header-stats-active', isHeaderStats);

  const textEl = document.getElementById('text-toggle-stats-pos');
  const iconEl = document.getElementById('icon-toggle-stats-pos');
  if (textEl) {
    textEl.innerText = isHeaderStats ? 'Kembalikan Kartu ke Body' : 'Pindah Kartu ke Header';
  }
  if (iconEl) {
    iconEl.className = isHeaderStats ? 'ph ph-rows' : 'ph ph-layout';
  }

  const iconHdr = document.getElementById('icon-toggle-stats-header');
  if (iconHdr) {
    iconHdr.className = isHeaderStats ? 'ph ph-rows fs-18' : 'ph ph-layout fs-18';
  }
};

/**
 * Toggle header stats position preference.
 */
export const toggleHeaderStats = () => {
  const current = localStorage.getItem(HEADER_STATS_KEY) === 'true';
  const next = !current;
  localStorage.setItem(HEADER_STATS_KEY, String(next));
  applyHeaderStatsPreference();
  showToast(next ? 'Ringkasan kas dipindahkan ke Header!' : 'Ringkasan kas dikembalikan ke Dashboard!', 'success');
};

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
let isTransitioning = false;

export const toggleTheme = () => {
  if (isTransitioning) return; // Prevent rapid multi-clicks triggering AbortError

  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');

  // If the browser supports View Transitions API (Chrome/Edge/Android/iOS 18+),
  // let the GPU take a screenshot and cross-fade the entire viewport seamlessly.
  if (typeof document.startViewTransition === 'function') {
    try {
      isTransitioning = true;
      const transition = document.startViewTransition(() => {
        applyTheme();
      });

      // Handle all internal ViewTransition promise rejections (ready, updateCallbackDone, finished)
      if (transition) {
        if (transition.ready) transition.ready.catch(() => {});
        if (transition.updateCallbackDone) transition.updateCallbackDone.catch(() => {});
        if (transition.finished) {
          transition.finished
            .catch(() => {})
            .finally(() => {
              isTransitioning = false;
            });
        } else {
          isTransitioning = false;
        }
      } else {
        isTransitioning = false;
      }
    } catch (e) {
      isTransitioning = false;
      applyTheme();
    }
  } else {
    applyTheme();
  }
};
