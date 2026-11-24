import { refreshProfileStampStyle, refreshSpotlightStampStyle, syncStampStylePreview } from '../mount';
import { getActiveIndicatorStyle, saveIndicatorStyle, STAMP_META } from '../ui/dues-status';
import { setCurrentHistoryFilter, setCurrentRekapYear } from "finkas/core/state";
import { getInput, getSelect, htmlElements, handleNominalInput } from "finkas/core/utils";
import { syncCdrop } from "../ui/cdrop";
import {
  openModal, closeModal, closeGroupScopedModals, getActiveModalId, switchTab,
  filterKategori, updateCounterOps, updateCounterIuran,
  pilihSemuaIuran, renderCheckboxIuran, filterAnggotaIuran
} from "../ui/modal";
import { renderAll, renderTableTransaksi, renderTableRekap } from "../render/index";

/* ── Bottom nav helpers ────────────────────────────────────────── */

export const setBottomNavActive = (action: string) => {
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

export const setHistoryFilter = (filter?: string) => {
  if (!filter) return;
  setCurrentHistoryFilter(filter);
  htmlElements('[data-action="set-history-filter"]').forEach((button) => {
    const selected = button.dataset.filter === filter;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderTableTransaksi();
};



/* ══════════════════════════════════════════════════════════════════
   SEARCH LISTENERS
   ══════════════════════════════════════════════════════════════════ */

let rekapSearchTimer: ReturnType<typeof setTimeout> | undefined;
let trxSearchTimer: ReturnType<typeof setTimeout> | undefined;

export const resetGroupScopedUI = () => {
  clearTimeout(rekapSearchTimer);
  rekapSearchTimer = undefined;
  clearTimeout(trxSearchTimer);
  trxSearchTimer = undefined;
  for (const id of ['search-member-rekap', 'search-member-rekap-mobile', 'workspace-search-history',
    'search-anggota-iuran', 'master-search-anggota', 'audit-search-input']) {
    const input = getInput(id);
    if (input) input.value = '';
  }
  for (const button of htmlElements('[data-action="set-history-filter"]')) {
    const active = button.dataset.filter === 'semua';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const button of htmlElements('[data-status-filter]')) {
    button.setAttribute('aria-pressed', String(button.dataset.statusFilter === 'all'));
  }
  closeGroupScopedModals();
};

export const setupRekapSearchListener = () => {
  const inputs = [
    getInput('search-member-rekap'),
    getInput('search-member-rekap-mobile')
  ].filter(el => el != null);

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

let privacyPopTimer: ReturnType<typeof setTimeout> | undefined;

export const applyPrivacyMode = (animate = false) => {
  try {
    const isPrivate = localStorage.getItem('finkas_privacy_mode') === 'on';
    document.body.classList.toggle('privacy-mode', isPrivate);
    const toggle = document.querySelector<HTMLElement>('[data-action="toggle-privacy"]');
    toggle?.setAttribute('aria-pressed', String(isPrivate));
    const icon = toggle?.querySelector('i');
    if (icon) icon.className = `ph ${isPrivate ? 'ph-eye-slash' : 'ph-eye'} fs-18`;
    if (animate && toggle?.classList) {
      toggle.classList.remove('is-toggling');
      void toggle.offsetWidth;
      toggle.classList.add('is-toggling');
      clearTimeout(privacyPopTimer);
      privacyPopTimer = setTimeout(() => toggle.classList?.remove('is-toggling'), 220);
      (privacyPopTimer as { unref?: () => void })?.unref?.();
    }
  } catch (_) {}
};

const updateStampPicker = (animate = false) => {
  const currentStyle = getActiveIndicatorStyle();
  const meta = STAMP_META[currentStyle] || STAMP_META.seal;
  htmlElements('#indicator-style-picker .style-option-card').forEach((card) => {
    const active = card.dataset.style === currentStyle;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
  });
  const titleEl = document.querySelector('#tampilan-style-preview .tampilan-preview-title');
  const labelEl = document.getElementById('hybrid-stamp-label');
  const sampleEl = document.getElementById('hybrid-stamp-sample');
  if (titleEl) titleEl.textContent = meta.label;
  if (labelEl) labelEl.textContent = meta.sub;
  if (sampleEl) syncStampStylePreview({ styleKey: currentStyle, animate });
};

export const openDuesLegend = () => {
  switchTab('faq-glossary', 'modal-faq');
  openModal('modal-faq');
  document.getElementById('dues-legend')?.focus();
};

export const openTampilanModal = (tab?: string) => {
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

export const setIndicatorStyle = (styleKey: string | null) => {
  if (!styleKey || !saveIndicatorStyle(styleKey)) return;
  updateStampPicker(true);
  refreshProfileStampStyle(styleKey);
  refreshSpotlightStampStyle(styleKey);
  renderTableRekap();
};

export const setPrivacyMode = (mode: string) => {
  const safeMode = mode === 'on' ? 'on' : 'off';
  try {
    localStorage.setItem('finkas_privacy_mode', safeMode);
  } catch (e) {
    console.warn('[finkas] Cannot persist privacy mode:', e?.message);
  }
  applyPrivacyMode(true);
};

export const setCurrencyFormat = (formatKey: string | null) => {
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
  Array.from(htmlElements('#modal-menu .nav-item')).filter((it) => {
    if (it.classList.contains('is-search-hidden')) return false;
    return typeof getComputedStyle === 'function'
      ? getComputedStyle(it).display !== 'none'
      : it.style.display !== 'none';
  });

const syncNavGroupVisibility = () => {
  document.querySelectorAll('#modal-menu .nav-group').forEach((group) => {
    const visible = Array.from(htmlElements('.nav-item', group)).some((it) => {
      if (it.classList.contains('is-search-hidden')) return false;
      return typeof getComputedStyle === 'function'
        ? getComputedStyle(it).display !== 'none'
        : it.style.display !== 'none';
    });
    group.classList.toggle('is-search-hidden', !visible);
  });
};

const applyNavMenuFilter = (rawQuery: string) => {
  const query = String(rawQuery || '').trim().toLowerCase();
  const clearBtn = document.getElementById('btn-clear-nav-search');
  if (clearBtn) clearBtn.hidden = !query;

  htmlElements('#modal-menu .nav-item').forEach((item) => {
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
  const searchInput = getInput('search-nav-menu');
  if (searchInput) searchInput.value = '';
  htmlElements('#modal-menu .nav-item, #modal-menu .nav-group').forEach((el) => {
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
  const searchInput = getInput('search-nav-menu');
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

  searchInput.addEventListener('input', (e) => applyNavMenuFilter(searchInput.value));

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

type FormCallbacks = Pick<typeof import('./auth'), 'submitLoginAdmin'> &
  Pick<typeof import('./transactions'), 'submitIuran'|'submitOperasional'|'submitEditTransaksi'> &
  Pick<typeof import('./quickpay'), 'submitQuickPay'> &
  Pick<typeof import('./master'), 'submitTambahAnggota'|'submitTambahKategori'|'submitEditMasterAnggota'|'renderMasterAnggotaTable'|'renderMasterKategoriTable'> &
  Pick<typeof import('./backup'), 'restoreJSONBackup'>;
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
}: FormCallbacks) => {
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

  [document.getElementById('btn-header-menu'), document.getElementById('btn-header-menu-mobile')].filter(el => el != null).forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); openCommandHubModal(); });
  });

  const iuranNominal = getInput('iuran-nominal');
  if (iuranNominal) iuranNominal.addEventListener('input', function () { handleNominalInput(this); updateCounterIuran(); });

  const opsNominal = getInput('ops-nominal');
  if (opsNominal) opsNominal.addEventListener('input', function () { handleNominalInput(this); updateCounterOps(); });

  const qpNominal = getInput('qp-nominal');
  if (qpNominal) qpNominal.addEventListener('input', function () { handleNominalInput(this); });

  const editNominal = getInput('edit-nominal');
  if (editNominal) editNominal.addEventListener('input', function () { handleNominalInput(this); });

  const iuranBulan = document.getElementById('iuran-bulan');
  if (iuranBulan) iuranBulan.addEventListener('change', renderCheckboxIuran);

  const iuranTahun = getInput('iuran-tahun');
  if (iuranTahun) {
    iuranTahun.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 4);
      renderCheckboxIuran();
    });
  }

  const opsTipe = document.getElementById('ops-tipe');
  if (opsTipe) opsTipe.addEventListener('change', function () { filterKategori('ops-tipe', 'ops-kategori'); syncCdrop('ops-kategori'); updateCounterOps(); });

  const editTipe = document.getElementById('edit-tipe');
  if (editTipe) editTipe.addEventListener('change', function () { filterKategori('edit-tipe', 'edit-kategori'); syncCdrop('edit-kategori'); });

  const historySearches = ['workspace-search-history'].map((id) => getInput(id)).filter(el => el != null);
  for (const input of historySearches) input.addEventListener('input', () => {
    for (const other of historySearches) if (other !== input) other.value = input.value;
    clearTimeout(trxSearchTimer);
    trxSearchTimer = setTimeout(renderTableTransaksi, 150);
  });

  const searchAnggotaIuran = document.getElementById('search-anggota-iuran');
  if (searchAnggotaIuran) searchAnggotaIuran.addEventListener('input', filterAnggotaIuran);

  const btnPilihSemua = document.getElementById('btn-pilih-semua');
  if (btnPilihSemua) btnPilihSemua.addEventListener('click', pilihSemuaIuran);

  const tahunRekapSelect = getSelect('ui-tahun-rekap-select');
  const tahunRekapSelectMobile = getSelect('ui-tahun-rekap-select-mobile');
  [tahunRekapSelect, tahunRekapSelectMobile].filter(el => el != null).forEach((sel) => {
    sel.addEventListener('change', (e) => {
      setCurrentRekapYear(sel.value);
      if (tahunRekapSelect) tahunRekapSelect.value = sel.value;
      if (tahunRekapSelectMobile) tahunRekapSelectMobile.value = sel.value;
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

  const inputRestore = getInput('input-restore-json');
  if (inputRestore) inputRestore.addEventListener('change', (e) => {
    if (inputRestore.files && inputRestore.files[0]) {
      restoreJSONBackup(inputRestore.files[0]);
      inputRestore.value = '';
    }
  });

  /* Keep the group picker reachable once the session can no longer read the group. */
  window.addEventListener('finkas:group-changed', () => {
    resetGroupScopedUI();
    renderMasterAnggotaTable();
    renderMasterKategoriTable();
  });
};

