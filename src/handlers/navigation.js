import { getActiveIndicatorStyle, renderLunasHtml, renderMiniStamp, renderPassbookEmblem, saveIndicatorStyle, STAMP_META } from '../ui/dues-status.js';
import { setCurrentHistoryFilter, setCurrentRekapYear } from "../core/state.js";
import { handleNominalInput } from "../core/utils.js";
import { syncCdrop } from "../ui/cdrop.js";
import {
  openModal, closeModal, getActiveModalId, switchTab,
  filterKategori, updateCounterOps, updateCounterIuran,
  pilihSemuaIuran, renderCheckboxIuran, filterAnggotaIuran
} from "../ui/modal.js";
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
  const isDesktop = typeof window !== 'undefined' &&
    window.innerWidth >= 768 &&
    !(typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);
  if (isDesktop) document.getElementById('search-nav-menu')?.focus?.();
};

export const setupMenuSearchListener = () => {
  const searchInput = document.getElementById('search-nav-menu');
  if (!searchInput || searchInput.dataset?.navBound === '1') return;
  if (searchInput.dataset) searchInput.dataset.navBound = '1';

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (getActiveModalId() === 'modal-menu') closeModal('modal-menu');
      else openCommandHubModal();
    }
  });

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

/* ══════════════════════════════════════════════════════════════════
   APP FORM & INPUT LISTENER WIRING
   ══════════════════════════════════════════════════════════════════ */

/**
 * Bind application form submit handlers, header menu triggers, and ledger filters.
 * @param {object} callbacks
 */
export const initAppFormAndInputListeners = ({
  submitLoginAdmin,
  submitIuran,
  submitOperasional,
  submitEditTransaksi,
  submitQuickPay,
  submitTambahAnggota,
  submitTambahKategori,
  submitEditMasterAnggota,
  restoreJSONBackup,
  renderMasterAnggotaTable,
  renderMasterKategoriTable
}) => {
  document.getElementById('modal-login')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitLoginAdmin(e);
  }, true);

  document.getElementById('modal-transaksi')?.querySelector('#tab-iuran form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitIuran(e);
  });

  document.getElementById('modal-transaksi')?.querySelector('#tab-operasional form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitOperasional(e);
  });

  document.getElementById('modal-edit-transaksi')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitEditTransaksi(e);
  });

  document.getElementById('form-quickpay')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitQuickPay(e);
  });

  [document.getElementById('btn-header-menu'), document.getElementById('btn-header-menu-mobile')].filter(Boolean).forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); openCommandHubModal(); });
  });

  const iuranNominal = document.getElementById('iuran-nominal');
  if (iuranNominal) iuranNominal.addEventListener('input', function () { handleNominalInput(this); updateCounterIuran(); });

  const opsNominal = document.getElementById('ops-nominal');
  if (opsNominal) opsNominal.addEventListener('input', function () { handleNominalInput(this); updateCounterOps(); });

  const qpNominal = document.getElementById('qp-nominal');
  if (qpNominal) qpNominal.addEventListener('input', function () { handleNominalInput(this); });

  const editNominal = document.getElementById('edit-nominal');
  if (editNominal) editNominal.addEventListener('input', function () { handleNominalInput(this); });

  const iuranBulan = document.getElementById('iuran-bulan');
  if (iuranBulan) iuranBulan.addEventListener('change', renderCheckboxIuran);

  const iuranTahun = document.getElementById('iuran-tahun');
  if (iuranTahun) {
    iuranTahun.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 4);
      renderCheckboxIuran();
    });
  }

  const opsTipe = document.getElementById('ops-tipe');
  if (opsTipe) opsTipe.addEventListener('change', function () { filterKategori('ops-tipe', 'ops-kategori'); syncCdrop('ops-kategori'); updateCounterOps(); });

  const editTipe = document.getElementById('edit-tipe');
  if (editTipe) editTipe.addEventListener('change', function () { filterKategori('edit-tipe', 'edit-kategori'); });

  const historySearches = ['workspace-search-history'].map((id) => document.getElementById(id)).filter(Boolean);
  let trxSearchTimer;
  for (const input of historySearches) input.addEventListener('input', () => {
    for (const other of historySearches) if (other !== input) other.value = input.value;
    clearTimeout(trxSearchTimer);
    trxSearchTimer = setTimeout(renderTableTransaksi, 150);
  });

  const searchAnggotaIuran = document.getElementById('search-anggota-iuran');
  if (searchAnggotaIuran) searchAnggotaIuran.addEventListener('input', filterAnggotaIuran);

  const btnPilihSemua = document.getElementById('btn-pilih-semua');
  if (btnPilihSemua) btnPilihSemua.addEventListener('click', pilihSemuaIuran);

  const tahunRekapSelect = document.getElementById('ui-tahun-rekap-select');
  const tahunRekapSelectMobile = document.getElementById('ui-tahun-rekap-select-mobile');
  [tahunRekapSelect, tahunRekapSelectMobile].filter(Boolean).forEach((sel) => {
    sel.addEventListener('change', (e) => {
      setCurrentRekapYear(e.target.value);
      if (tahunRekapSelect) tahunRekapSelect.value = e.target.value;
      if (tahunRekapSelectMobile) tahunRekapSelectMobile.value = e.target.value;
      syncCdrop('ui-tahun-rekap-select');
      syncCdrop('ui-tahun-rekap-select-mobile');
      renderTableRekap();
      renderTableTransaksi();
    });
  });

  const formTambahAnggota = document.getElementById('form-tambah-anggota');
  if (formTambahAnggota) formTambahAnggota.addEventListener('submit', submitTambahAnggota);

  const formTambahKategori = document.getElementById('form-tambah-kategori');
  if (formTambahKategori) formTambahKategori.addEventListener('submit', submitTambahKategori);

  const formEditMasterAnggota = document.getElementById('form-edit-master-anggota');
  if (formEditMasterAnggota) formEditMasterAnggota.addEventListener('submit', submitEditMasterAnggota);

  const inputRestore = document.getElementById('input-restore-json');
  if (inputRestore) inputRestore.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      restoreJSONBackup(e.target.files[0]);
      e.target.value = '';
    }
  });

  /* Keep the group picker reachable once the session can no longer read the group. */
  window.addEventListener('finkas:group-changed', () => {
    renderMasterAnggotaTable();
    renderMasterKategoriTable();
  });
};

