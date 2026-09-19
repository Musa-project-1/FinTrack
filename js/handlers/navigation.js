import { setCurrentHistoryFilter, setItemsToShow } from "../core/state.js";
import { openModal, closeModal } from "../ui/modal.js";
import { syncCdrop } from "../ui/cdrop.js";
import { renderAll, renderTableTransaksi, renderTableRekap } from "../render.js";

/* ── Bottom nav helpers ────────────────────────────────────────── */

export const setBottomNavActive = (action) => {
  document.querySelectorAll('.bottom-nav-item').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-action') === action);
  });
};

export const closeActiveModal = () => {
  const active = document.querySelector('.modal-overlay.active');
  if (active) closeModal(active.id);
};

/* ══════════════════════════════════════════════════════════════════
   ADMIN UI MANAGEMENT
   ══════════════════════════════════════════════════════════════════ */


export const setHistoryFilter = (filter, btn) => {
  setCurrentHistoryFilter(filter);
  document.querySelectorAll('[data-action="set-history-filter"]').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  setItemsToShow(20);
  renderTableTransaksi();
};

/* ── Quick presets: Bulan Ini / Bulan Lalu / Semua Waktu ───────── */

export const clearRiwayatPresetHighlight = () => {
  document.querySelectorAll('#history-filter-chips [data-preset]').forEach((b) => b.classList.remove('active'));
};

export const applyRiwayatPreset = (preset, btn) => {
  const now = new Date();
  let year = now.getFullYear();
  let monthIdx = now.getMonth();
  if (preset === 'last-month') {
    monthIdx -= 1;
    if (monthIdx < 0) { monthIdx = 11; year -= 1; }
  }

  const bulanSel = document.getElementById('filter-bulan');
  const tahunSel = document.getElementById('filter-tahun');
  if (!bulanSel || !tahunSel) return;

  if (preset === 'all-time') {
    bulanSel.value = 'all';
    tahunSel.value = 'all';
  } else {
    const yearStr = String(year);
    if (!Array.from(tahunSel.options).some((o) => o.value === yearStr)) {
      const opt = document.createElement('option');
      opt.value = yearStr;
      opt.text = yearStr;
      tahunSel.appendChild(opt);
    }
    bulanSel.value = String(monthIdx);
    tahunSel.value = yearStr;
  }
  syncCdrop('filter-bulan');
  syncCdrop('filter-tahun');

  clearRiwayatPresetHighlight();
  btn.classList.add('active');
  setItemsToShow(20);
  renderTableTransaksi();
};

/* ══════════════════════════════════════════════════════════════════
   SEARCH LISTENERS
   ══════════════════════════════════════════════════════════════════ */

let rekapSearchTimer = null;
export const setupRekapSearchListener = () => {
  const inputs = [
    document.getElementById('search-member-rekap'),
    document.getElementById('search-member-rekap-mobile')
  ].filter(Boolean);

  inputs.forEach((input) => {
    input.addEventListener('input', (e) => {
      // Keep desktop & mobile search inputs synchronized
      inputs.forEach((other) => { if (other !== input) other.value = input.value; });
      clearTimeout(rekapSearchTimer);
      rekapSearchTimer = setTimeout(() => renderTableRekap(), 150);
    });
  });
};

/* ══════════════════════════════════════════════════════════════════
   PENGATURAN TAMPILAN MODAL
   ══════════════════════════════════════════════════════════════════ */

export const applyPrivacyMode = () => {
  try {
    const isPrivate = localStorage.getItem('finkas_privacy_mode') === 'on';
    document.body.classList.toggle('privacy-mode', isPrivate);
  } catch (_) {}
};

export const openTampilanModal = () => {
  const currentIndicator = localStorage.getItem('finkas_indicator_style') || 'paid';
  document.querySelectorAll('#indicator-style-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-style') === currentIndicator);
  });

  const currentPrivacy = localStorage.getItem('finkas_privacy_mode') === 'on' ? 'on' : 'off';
  document.querySelectorAll('#privacy-mode-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-mode') === currentPrivacy);
  });

  const currentFormat = localStorage.getItem('finkas_currency_format') === 'compact' ? 'compact' : 'full';
  document.querySelectorAll('#currency-format-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-format') === currentFormat);
  });

  const currentTheme = localStorage.getItem('theme') || 'light';
  document.querySelectorAll('#theme-mode-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-theme') === currentTheme);
  });

  const currentDensity = localStorage.getItem('finkas_density') === 'compact' ? 'compact' : 'normal';
  document.querySelectorAll('#density-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-density') === currentDensity);
  });

  const currentPos = localStorage.getItem('finkas_header_stats') === 'true' ? 'header' : 'body';
  document.querySelectorAll('#stats-pos-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-pos') === currentPos);
  });

  const currentAccent = localStorage.getItem('finkas_accent_color') || 'emerald';
  document.querySelectorAll('#accent-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-accent') === currentAccent);
  });

  const currentFont = localStorage.getItem('finkas_number_font') === 'mono' ? 'mono' : 'sans';
  document.querySelectorAll('#font-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-font') === currentFont);
  });

  const currentTexture = localStorage.getItem('finkas_bg_texture') || 'dots';
  document.querySelectorAll('#texture-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-texture') === currentTexture);
  });

  const currentTone = localStorage.getItem('finkas_arrears_tone') || 'red';
  document.querySelectorAll('#arrears-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-tone') === currentTone);
  });

  const currentProgress = localStorage.getItem('finkas_progress_format') === 'ratio' ? 'ratio' : 'bar';
  document.querySelectorAll('#progress-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-format') === currentProgress);
  });

  openModal('modal-tampilan');
};

export const setIndicatorStyle = (styleKey) => {
  if (!styleKey) return;
  try {
    localStorage.setItem('finkas_indicator_style', styleKey);
  } catch (e) {
    console.warn('[finkas] Cannot persist indicator style:', e?.message);
  }
  document.querySelectorAll('#indicator-style-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-style') === styleKey);
  });
  renderTableRekap();
};

export const setPrivacyMode = (mode) => {
  const safeMode = mode === 'on' ? 'on' : 'off';
  try {
    localStorage.setItem('finkas_privacy_mode', safeMode);
  } catch (e) {
    console.warn('[finkas] Cannot persist privacy mode:', e?.message);
  }
  document.querySelectorAll('#privacy-mode-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-mode') === safeMode);
  });
  applyPrivacyMode();
};

export const setCurrencyFormat = (formatKey) => {
  const safeFormat = formatKey === 'compact' ? 'compact' : 'full';
  try {
    localStorage.setItem('finkas_currency_format', safeFormat);
  } catch (e) {
    console.warn('[finkas] Cannot persist currency format:', e?.message);
  }
  document.querySelectorAll('#currency-format-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-format') === safeFormat);
  });
  renderAll();
};

/* ══════════════════════════════════════════════════════════════════
   COMMAND HUB SEARCH & LAUNCHER
   ══════════════════════════════════════════════════════════════════ */

export const openCommandHubModal = () => {
  const searchInput = document.getElementById('search-nav-menu');
  if (searchInput) {
    searchInput.value = '';
    document.querySelectorAll('#modal-menu .nav-item').forEach((it) => { it.style.display = 'flex'; });
    document.querySelectorAll('#modal-menu .nav-group').forEach((gr) => { gr.style.display = 'block'; });
  }
  const groupLabel = document.getElementById('command-footer-group');
  if (groupLabel) {
    const activeGroupName = document.getElementById('app-group-name')?.textContent?.trim() || 'Finkas';
    groupLabel.textContent = `Grup: ${activeGroupName}`;
  }
  openModal('modal-menu');
};

export const setupMenuSearchListener = () => {
  const searchInput = document.getElementById('search-nav-menu');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const items = document.querySelectorAll('#modal-menu .nav-item');
    const groups = document.querySelectorAll('#modal-menu .nav-group');

    items.forEach((item) => {
      const text = (item.querySelector('.nav-txt')?.textContent || '').toLowerCase();
      const sub = (item.querySelector('.nav-sub')?.textContent || '').toLowerCase();
      const keywords = (item.getAttribute('data-keywords') || '').toLowerCase();
      const match = !query || text.includes(query) || sub.includes(query) || keywords.includes(query);
      item.style.display = match ? 'flex' : 'none';
    });

    groups.forEach((group) => {
      const visible = Array.from(group.querySelectorAll('.nav-item')).some((it) => it.style.display !== 'none');
      group.style.display = visible ? 'block' : 'none';
    });
  });
};

