import { getActiveIndicatorStyle, renderLunasHtml, renderMiniStamp, renderPassbookEmblem, saveIndicatorStyle, STAMP_META } from '../ui/dues-status.js';
import { setCurrentHistoryFilter } from "../core/state.js";
import { openModal, closeModal, getActiveModalId, switchTab } from "../ui/modal.js";
import { renderAll, renderTableTransaksi, renderTableRekap } from "../render.js";

/* ── Bottom nav helpers ────────────────────────────────────────── */

export const setBottomNavActive = (action) => {
  document.querySelectorAll('.bottom-nav-item').forEach((b) => {
    const active = b.getAttribute('data-action') === action;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'location');
    else b.removeAttribute('aria-current');
  });
};

export const closeActiveModal = () => {
  const id = getActiveModalId();
  if (id) closeModal(id);
};

/* ── History Filter ─────────────────────────────────────────────── */

export const setHistoryFilter = (filter) => {
  setCurrentHistoryFilter(filter);
  document.querySelectorAll('[data-action="set-history-filter"]').forEach((button) => {
    const selected = button.dataset.filter === filter;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
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
    const toggle = document.querySelector('[data-action="toggle-privacy"]');
    toggle?.setAttribute('aria-pressed', String(isPrivate));
    const icon = toggle?.querySelector('i');
    if (icon) icon.className = `ph ${isPrivate ? 'ph-eye-slash' : 'ph-eye'} fs-18`;
  } catch (_) {}
};

const updateStampPicker = (animate = false) => {
  const currentStyle = getActiveIndicatorStyle();
  const meta = STAMP_META[currentStyle] || STAMP_META.seal;
  document.querySelectorAll('#indicator-style-picker .style-option-card').forEach((card) => {
    const active = card.dataset.style === currentStyle;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
  });
  const titleEl = document.querySelector('#tampilan-style-preview .tampilan-preview-title');
  const labelEl = document.getElementById('hybrid-stamp-label');
  const sampleEl = document.getElementById('hybrid-stamp-sample');
  if (titleEl) titleEl.textContent = meta.label;
  if (labelEl) labelEl.textContent = meta.sub;
  if (sampleEl) {
    sampleEl.innerHTML =
      `<span class="tampilan-preview-cell paid">${renderLunasHtml(animate, currentStyle)}</span>` +
      `<span class="tampilan-preview-stamp">${renderPassbookEmblem('paid', currentStyle)}</span>`;
  }
};

export const openDuesLegend = () => {
  switchTab('faq-glossary', 'modal-faq');
  openModal('modal-faq');
  document.getElementById('dues-legend')?.focus();
};

export const openTampilanModal = (tab) => {
  updateStampPicker();

  const currentFormat = localStorage.getItem('finkas_currency_format') === 'compact' ? 'compact' : 'full';
  document.querySelectorAll('#currency-format-picker .style-option-card').forEach((card) => {
    const active = card.getAttribute('data-format') === currentFormat;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
  });

  const currentTheme = localStorage.getItem('theme') || 'light';
  document.querySelectorAll('#theme-mode-picker .style-option-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-theme') === currentTheme);
  });

  openModal('modal-tampilan');
  if (tab === 'tampilan-indikator') document.getElementById('tab-tampilan-indikator')?.scrollIntoView({ block: 'nearest' });
};

export const setIndicatorStyle = (styleKey) => {
  if (!saveIndicatorStyle(styleKey)) return;
  updateStampPicker(true);
  document.querySelectorAll('#passbook-months .paid .passbook-slot-seal').forEach((slot) => { slot.innerHTML = renderPassbookEmblem('paid', styleKey); });
  document.querySelectorAll('#spotlight-months .mini-stamp-ico').forEach((stamp) => { stamp.outerHTML = renderMiniStamp(styleKey); });
  renderTableRekap();
};

export const setPrivacyMode = (mode) => {
  const safeMode = mode === 'on' ? 'on' : 'off';
  try {
    localStorage.setItem('finkas_privacy_mode', safeMode);
  } catch (e) {
    console.warn('[finkas] Cannot persist privacy mode:', e?.message);
  }
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
    const active = card.getAttribute('data-format') === safeFormat;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
  });
  renderAll();
};

/* ══════════════════════════════════════════════════════════════════
   COMMAND HUB SEARCH & LAUNCHER
   ══════════════════════════════════════════════════════════════════ */

const getVisibleNavItems = () =>
  Array.from(document.querySelectorAll('#modal-menu .nav-item')).filter((it) => {
    if (it.classList.contains('is-search-hidden')) return false;
    return typeof getComputedStyle === 'function'
      ? getComputedStyle(it).display !== 'none'
      : it.style.display !== 'none';
  });

const syncNavGroupVisibility = () => {
  document.querySelectorAll('#modal-menu .nav-group').forEach((group) => {
    const visible = Array.from(group.querySelectorAll('.nav-item')).some((it) => {
      if (it.classList.contains('is-search-hidden')) return false;
      return typeof getComputedStyle === 'function'
        ? getComputedStyle(it).display !== 'none'
        : it.style.display !== 'none';
    });
    group.classList.toggle('is-search-hidden', !visible);
  });
};

const applyNavMenuFilter = (rawQuery) => {
  const query = String(rawQuery || '').trim().toLowerCase();
  const clearBtn = document.getElementById('btn-clear-nav-search');
  if (clearBtn) clearBtn.hidden = !query;

  document.querySelectorAll('#modal-menu .nav-item').forEach((item) => {
    const text = (item.querySelector('.nav-txt')?.textContent || '').toLowerCase();
    const sub = (item.querySelector('.nav-sub')?.textContent || '').toLowerCase();
    const keywords = (item.getAttribute('data-keywords') || '').toLowerCase();
    const match = !query || text.includes(query) || sub.includes(query) || keywords.includes(query);
    item.classList.toggle('is-search-hidden', !match);
    item.classList.remove('is-selected');
  });

  syncNavGroupVisibility();

  const visibleItems = getVisibleNavItems();
  const emptyState = document.getElementById('nav-search-empty');
  if (emptyState) emptyState.hidden = visibleItems.length > 0;
  if (query && visibleItems.length > 0) visibleItems[0].classList.add('is-selected');
};

const prepareCommandHubModal = () => {
  const searchInput = document.getElementById('search-nav-menu');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('#modal-menu .nav-item, #modal-menu .nav-group').forEach((el) => {
    el.classList.remove('is-search-hidden', 'is-selected');
  });
  const clearBtn = document.getElementById('btn-clear-nav-search');
  if (clearBtn) clearBtn.hidden = true;
  const emptyState = document.getElementById('nav-search-empty');
  if (emptyState) emptyState.hidden = true;

  const groupLabel = document.getElementById('command-footer-group');
  if (groupLabel) {
    const activeGroupName = document.getElementById('app-group-name')?.textContent?.trim() || 'Finkas';
    groupLabel.textContent = `Grup: ${activeGroupName}`;
  }
  syncNavGroupVisibility();
};

export const openCommandHubModal = () => {
  prepareCommandHubModal();
  openModal('modal-menu');
  syncNavGroupVisibility();
};

export const setupMenuSearchListener = () => {
  const searchInput = document.getElementById('search-nav-menu');
  if (!searchInput) return;

  document.addEventListener('finkas:modal-opened', (e) => {
    if (e.detail?.id === 'modal-menu') prepareCommandHubModal();
  });

  searchInput.addEventListener('input', (e) => applyNavMenuFilter(e.target.value));

  document.getElementById('btn-clear-nav-search')?.addEventListener('click', () => {
    searchInput.value = '';
    applyNavMenuFilter('');
    searchInput.focus();
  });

  searchInput.addEventListener('keydown', (e) => {
    const visibleItems = getVisibleNavItems();
    if (!visibleItems.length) return;
    const currentIdx = visibleItems.findIndex((it) => it.classList.contains('is-selected'));

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const nextIdx = currentIdx < 0
        ? (delta > 0 ? 0 : visibleItems.length - 1)
        : (currentIdx + delta + visibleItems.length) % visibleItems.length;
      visibleItems.forEach((it) => it.classList.remove('is-selected'));
      const target = visibleItems[nextIdx];
      target.classList.add('is-selected');
      target.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const target = (currentIdx >= 0 ? visibleItems[currentIdx] : null)
        || (visibleItems.length === 1 ? visibleItems[0] : null);
      if (target) {
        e.preventDefault();
        target.click();
      }
    }
  });
};

