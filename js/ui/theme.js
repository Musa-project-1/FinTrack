/**
 * @module theme
 * Dark/light theme toggle and persistence.
 */

import { THEME_KEY, HEADER_STATS_KEY } from '../core/config.js';
import { showToast } from '../core/utils.js';

const safeGetItem = (key, fallback = null) => {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (_) {
    return fallback;
  }
};

const safeSetItem = (key, val) => {
  try {
    localStorage.setItem(key, String(val));
  } catch (_) {}
};

/**
 * Apply the saved header stats position preference.
 */
export const applyHeaderStatsPreference = () => {
  const isHeaderStats = safeGetItem(HEADER_STATS_KEY) === 'true';
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

  const iconMobile = document.getElementById('icon-toggle-stats-mobile');
  if (iconMobile) {
    iconMobile.className = isHeaderStats ? 'ph ph-rows fs-18' : 'ph ph-layout fs-18';
  }
};

/**
 * Set and persist header stats position preference.
 * @param {'header'|'body'} position
 */
export const setHeaderStatsPosition = (position) => {
  const isHeader = position === 'header';
  safeSetItem(HEADER_STATS_KEY, String(isHeader));
  applyHeaderStatsPreference();
  document.querySelectorAll('#stats-pos-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-pos') === position);
  });
};

/**
 * Apply the saved density preference to document.body.
 */
export const applyDensityPreference = () => {
  const isCompact = safeGetItem('finkas_density') === 'compact';
  document.body.classList.toggle('density-compact', isCompact);
};

/**
 * Set and persist layout density preference.
 * @param {'normal'|'compact'} densityKey
 */
export const setDensity = (densityKey) => {
  const isCompact = densityKey === 'compact';
  safeSetItem('finkas_density', isCompact ? 'compact' : 'normal');
  document.querySelectorAll('#density-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-density') === densityKey);
  });
  applyDensityPreference();
};

/**
 * Toggle header stats position preference.
 */
export const toggleHeaderStats = () => {
  const current = safeGetItem(HEADER_STATS_KEY) === 'true';
  const next = !current;
  safeSetItem(HEADER_STATS_KEY, String(next));
  applyHeaderStatsPreference();
  showToast(next ? 'Ringkasan kas dipindahkan ke Header!' : 'Ringkasan kas dikembalikan ke Dashboard!', 'success');
};

/**
 * Apply the saved theme to the document and update meta theme-color.
 */
export const applyTheme = () => {
  const saved = safeGetItem(THEME_KEY, 'light');
  let isDark = saved === 'dark';
  if (saved === 'auto') {
    isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const themeIcons = document.querySelectorAll('.theme-icon');

  if (isDark) {
    document.body.classList.add('dark-mode');
    themeIcons.forEach((icon) => icon.classList.replace('ph-moon', 'ph-sun'));
    if (metaTheme) metaTheme.setAttribute('content', '#08131d');
  } else {
    document.body.classList.remove('dark-mode');
    themeIcons.forEach((icon) => icon.classList.replace('ph-sun', 'ph-moon'));
    if (metaTheme) metaTheme.setAttribute('content', '#e8f1f6');
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
 * Explicitly set theme mode ('light', 'dark', or 'auto').
 * @param {'light'|'dark'|'auto'} themeKey
 */
export const setTheme = (themeKey) => {
  safeSetItem(THEME_KEY, themeKey);
  applyTheme();
  document.querySelectorAll('#theme-mode-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-theme') === themeKey);
  });
};

/**
 * Accent color palette preference ('emerald' | 'cyan' | 'indigo' | 'amber').
 */
export const applyAccentPreference = () => {
  const accent = safeGetItem('finkas_accent_color', 'emerald');
  document.body.setAttribute('data-accent', accent);
};

export const setAccentColor = (accentKey) => {
  safeSetItem('finkas_accent_color', accentKey);
  document.querySelectorAll('#accent-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-accent') === accentKey);
  });
  applyAccentPreference();
};

/**
 * Number font preference ('mono' | 'sans').
 */
export const applyNumberFontPreference = () => {
  try {
    const isMono = localStorage.getItem('finkas_number_font') === 'mono';
    document.body.classList.toggle('font-mono-numbers', isMono);
  } catch (_) {}
};

export const setNumberFont = (fontKey) => {
  const isMono = fontKey === 'mono';
  try {
    localStorage.setItem('finkas_number_font', isMono ? 'mono' : 'sans');
  } catch (e) {
    console.warn('[finkas] Cannot persist number font:', e?.message);
  }
  document.querySelectorAll('#font-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-font') === fontKey);
  });
  applyNumberFontPreference();
};

/**
 * Canvas background texture preference ('dots' | 'grid' | 'solid').
 */
export const applyBgTexturePreference = () => {
  try {
    const texture = localStorage.getItem('finkas_bg_texture') || 'dots';
    document.body.classList.remove('bg-texture-dots', 'bg-texture-grid', 'bg-texture-solid');
    document.body.classList.add(`bg-texture-${texture}`);
  } catch (_) {}
};

export const setBgTexture = (textureKey) => {
  try {
    localStorage.setItem('finkas_bg_texture', textureKey);
  } catch (e) {
    console.warn('[finkas] Cannot persist bg texture:', e?.message);
  }
  document.querySelectorAll('#texture-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-texture') === textureKey);
  });
  applyBgTexturePreference();
};

/**
 * Arrears highlight tone preference ('red' | 'neutral' | 'amber').
 */
export const applyArrearsTonePreference = () => {
  try {
    const tone = localStorage.getItem('finkas_arrears_tone') || 'red';
    document.body.classList.remove('arrears-tone-red', 'arrears-tone-neutral', 'arrears-tone-amber');
    document.body.classList.add(`arrears-tone-${tone}`);
  } catch (_) {}
};

export const setArrearsTone = (toneKey) => {
  try {
    localStorage.setItem('finkas_arrears_tone', toneKey);
  } catch (e) {
    console.warn('[finkas] Cannot persist arrears tone:', e?.message);
  }
  document.querySelectorAll('#arrears-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-tone') === toneKey);
  });
  applyArrearsTonePreference();
};

/**
 * Progress summary format preference ('bar' | 'ratio').
 */
export const applyProgressFormatPreference = () => {
  try {
    const isRatio = localStorage.getItem('finkas_progress_format') === 'ratio';
    document.body.classList.toggle('progress-format-ratio', isRatio);
  } catch (_) {}
};

export const setProgressFormat = (formatKey) => {
  const isRatio = formatKey === 'ratio';
  try {
    localStorage.setItem('finkas_progress_format', isRatio ? 'ratio' : 'bar');
  } catch (e) {
    console.warn('[finkas] Cannot persist progress format:', e?.message);
  }
  document.querySelectorAll('#progress-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-format') === formatKey);
  });
  applyProgressFormatPreference();
};

/**
 * Toggle between dark and light theme using native View Transitions API
 * (Hardware GPU accelerated cross-fade) or instant fallback.
 */
let isTransitioning = false;

export const toggleTheme = () => {
  if (isTransitioning) return; // Prevent rapid multi-clicks triggering AbortError

  const isDark = document.body.classList.contains('dark-mode');
  safeSetItem(THEME_KEY, isDark ? 'light' : 'dark');

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
