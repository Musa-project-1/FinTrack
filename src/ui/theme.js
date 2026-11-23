import { htmlElements } from '../core/utils.js';
import { runHybridThemeWipe } from './hybrid-motion.js';
/**
 * @module theme
 * Dark/light theme toggle and persistence.
 */

import { THEME_KEY } from '../core/config.js';
export { getLanguage, applyLanguagePreference, setLanguage } from './i18n.js';

const safeGetItem = (key, fallback = /** @type {string|null} */ (null)) => {
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
 * Apply the saved header stats position preference (locked to body in Hybrid Kinetic).
 */
export const applyHeaderStatsPreference = () => {
  document.body.classList.remove('header-stats-active');
};

/**
 * Apply the saved density preference to document.body.
 */
export const applyDensityPreference = () => {
  document.body.classList.remove('density-compact');
};

/**
 * Apply the saved theme to the document and update meta theme-color.
 */
const systemTheme = () => window.matchMedia?.('(prefers-color-scheme: dark)');

export const watchSystemTheme = () => {
  systemTheme()?.addEventListener('change', () => {
    if (safeGetItem(THEME_KEY) === 'auto') applyTheme();
  });
};

export const applyTheme = () => {
  const saved = safeGetItem(THEME_KEY, 'light');
  let isDark = saved === 'dark';
  if (saved === 'auto') {
    isDark = systemTheme()?.matches;
  }
  const metaTheme = /** @type {HTMLMetaElement|null} */ (document.querySelector('meta[name="theme-color"]'));
  const themeIcons = document.querySelectorAll('.theme-icon');

  if (isDark) {
    document.body.classList.add('dark-mode');
    themeIcons.forEach((icon) => icon.classList.replace('ph-moon', 'ph-sun'));
  } else {
    document.body.classList.remove('dark-mode');
    themeIcons.forEach((icon) => icon.classList.replace('ph-sun', 'ph-moon'));
  }

  if (metaTheme) metaTheme.content = getComputedStyle(document.body).getPropertyValue('--bg-color').trim();
  updatePicker('theme', saved);
  document.dispatchEvent(new CustomEvent('finkas:theme-changed'));
};

/**
 * Explicitly set theme mode ('light', 'dark', or 'auto').
 * @param {'light'|'dark'|'auto'} themeKey
 */
export const setTheme = (themeKey, event, trigger) => {
  if (!['light', 'dark', 'auto'].includes(themeKey)) return;
  const willBeDark = themeKey === 'dark' || (themeKey === 'auto' && Boolean(systemTheme()?.matches));
  safeSetItem(THEME_KEY, themeKey);
  if (document.body.classList.contains('dark-mode') === willBeDark) applyTheme();
  else runHybridThemeWipe(applyTheme, event, trigger);
};

const updatePicker = (name, value) => {
  htmlElements(`[data-action="select-${name === 'theme' ? 'theme-mode' : name}"]`).forEach((card) => {
    const active = card.dataset[name] === value;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
  });
};

const palettes = ['terracotta', 'cobalt', 'charcoal', 'indigo'];

export const applyAccentPreference = () => {
  const saved = safeGetItem('finkas_palette') || '';
  const palette = palettes.includes(saved) ? saved : 'cobalt';
  document.body.dataset.palette = palette;
  updatePicker('palette', palette);
};

export const setPalette = (palette, event, trigger) => {
  if (!palettes.includes(palette) || document.body.dataset.palette === palette) return;
  runHybridThemeWipe(() => {
    safeSetItem('finkas_palette', palette);
    applyAccentPreference();
    applyTheme();
  }, event, trigger);
};

/**
 * Number font preference ('mono' | 'sans').
 */
export const applyNumberFontPreference = () => {
  try {
    const isMono = localStorage.getItem('finkas_number_font') !== 'sans';
    document.body.classList.toggle('font-mono-numbers', isMono);
  } catch (_) {}
};

const textures = ['aurora', 'topo', 'paper', 'clean'];
const legacyTextures = new Map([['dots', 'aurora'], ['grid', 'paper'], ['solid', 'clean']]);

export const applyBgTexturePreference = () => {
  const saved = safeGetItem('finkas_bg_texture') || '';
  const texture = textures.includes(saved) ? saved : legacyTextures.get(saved) || 'aurora';
  document.body.dataset.canvas = texture;
  updatePicker('texture', texture);
};

export const setBgTexture = (texture) => {
  if (!textures.includes(texture)) return;
  safeSetItem('finkas_bg_texture', texture);
  applyBgTexturePreference();
};

/**
 * Arrears highlight tone preference ('red' | 'neutral' | 'amber').
 */
export const applyArrearsTonePreference = () => {
  document.body.classList.remove('arrears-tone-red', 'arrears-tone-neutral', 'arrears-tone-amber');
  document.body.classList.add('arrears-tone-amber');
};

/**
 * Progress summary format preference ('bar' | 'ratio').
 */
export const applyProgressFormatPreference = () => {
  document.body.classList.remove('progress-format-ratio');
};

export const toggleTheme = (event, trigger) =>
  setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark', event, trigger);
