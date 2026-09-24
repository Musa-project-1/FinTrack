/**
 * @module app
 * Main application orchestrator and event-delegation coordinator.
 *
 * The UI is driven entirely by delegated `[data-action]` listeners rather than
 * inline handlers, which keeps the markup compatible with a strict
 * Content-Security-Policy.
 */

import {
  setItemsToShow, setState, saveCache, loadCache, getIsAdminSession, setCurrentRekapYear
} from "./core/state.js";
import { fetchInitialData } from "./core/api.js";
import { showToast, setConnectionStatus, isOnline, handleNominalInput } from "./core/utils.js";
import { syncOfflineTransactions, deleteOfflineTransaction } from "./core/offline.js";
import { initAnalytics } from "./core/analytics.js";
import { GA_MEASUREMENT_ID, GA_ID_KEY, GROUP_OPEN_KEY } from "./core/config.js";
import { initSync, destroySync, notifySynced } from "./core/sync.js";
import {
  applyTheme, toggleTheme, setTheme, applyHeaderStatsPreference, toggleHeaderStats, setHeaderStatsPosition,
  applyDensityPreference, setDensity, applyAccentPreference, setAccentColor, applyNumberFontPreference, setNumberFont,
  applyBgTexturePreference, setBgTexture, applyArrearsTonePreference, setArrearsTone, applyProgressFormatPreference, setProgressFormat
} from "./ui/theme.js";
import {
  openModal, closeModal, switchTab,
  filterKategori, updateCounterOps, updateCounterIuran, pilihSemuaIuran,
  renderCheckboxIuran, filterAnggotaIuran, closeMobileMenu,
  closeHeaderDropdown, closeConfirmDialog, executeConfirmAction
} from "./ui/modal.js";
import {
  renderAll, renderChart, bukaProfilAnggota, toggleIuranCard, renderTableTransaksi, renderTableRekap, loadMoreHistory
} from "./render.js";

import {
  handleUI, submitLoginAdmin, logoutAdminAction, loginGoogleSuperAdminAction, handleStealthBadgeClick
} from "./handlers/auth.js";
import {
  setBottomNavActive, closeActiveModal, setHistoryFilter, setupRekapSearchListener,
  openTampilanModal, setIndicatorStyle, setPrivacyMode, setCurrencyFormat, applyPrivacyMode,
  openCommandHubModal, setupMenuSearchListener
} from "./handlers/navigation.js";
import {
  openQuickPaySheet, submitQuickPay, bukaModalTransaksi, submitIuran,
  submitOperasional, bukaModalEdit, submitEditTransaksi, konfirmasiHapus, eksekusiHapus
} from "./handlers/transactions.js";
import {
  openSkippedMonthsModal, renderAuditLogList, openAuditLogModal, addSkippedMonth,
  removeSkippedMonth, renderMasterAnggotaTable, renderMasterKategoriTable,
  openKelolaMasterModal, submitTambahAnggota, toggleStatusAnggotaAction,
  hapusMasterAnggotaAction, submitTambahKategori, hapusMasterKategoriAction,
  bukaModalEditMasterAnggota, bukaModalEditMasterKategori, submitEditMasterAnggota
} from "./handlers/master.js";
import {
  renderOfflineQueueList, openOfflineQueueModal
} from "./handlers/offlineQueue.js";
import {
  cetakStruk, cetakLaporanTahunan, copyMonthlyRecap, exportToCSV, createGroupReminderMessage
} from "./handlers/export.js";
import { exportJSONBackup, restoreJSONBackup } from "./handlers/backup.js";
import { initCustomDropdowns, syncCdrop } from "./ui/cdrop.js";
import { initMonthPickers } from "./ui/mpick.js";
import {
  openGroupPicker, exitGroup, requestGroupPin, submitGroupPin, initGroupsUI, openGroupAdmin,
  resetGroupPinAction, removeGroupAction, renameGroupAction, manageGroupCredsAction,
  copyGroupWhatsAppAction, removeSuperAdminAction
} from "./handlers/groups.js";

let isLoading = false;

/* ── Sync badge helpers ──────────────────────────────────────────── */

const SYNC_BTNS = ['btn-sync-rekap', 'btn-sync-rekap-mobile'];

const setSyncBadge = (state) => {
  SYNC_BTNS.forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.remove('is-clean', 'has-update', 'is-syncing');
    btn.classList.add(state);
    const label = state === 'has-update'
      ? 'Ada data baru — klik untuk muat ulang'
      : state === 'is-syncing'
        ? 'Sedang memuat data...'
        : 'Data sinkron — klik untuk muat ulang';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  });
};

/* ══════════════════════════════════════════════════════════════════
   Cross-module hooks
   These break the render ↔ modal import cycle. They are plain JavaScript
   globals, not inline markup handlers, so they are CSP-safe.
   ══════════════════════════════════════════════════════════════════ */

window.__renderChart = renderChart;
window.__initApp = () => initApp();
window.__filterAnggotaIuran = filterAnggotaIuran;
window.__resetItemsToShow = () => setItemsToShow(20);
window.__renderTableTransaksi = renderTableTransaksi;

/* ══════════════════════════════════════════════════════════════════
   EVENT DELEGATION
   ══════════════════════════════════════════════════════════════════ */

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.getAttribute('data-action');

  // Menu sheet: close itself before opening the target modal (no stacking)
  if (target.closest('#modal-menu') && action !== 'close-modal' && !['logout', 'close-dropdown'].includes(action)) {
    closeModal('modal-menu');
  }
  const id = target.getAttribute('data-id');
  const month = target.getAttribute('data-month');
  const anggota = target.getAttribute('data-anggota');
  const bulan = target.getAttribute('data-bulan');

  switch (action) {
    /* ── Multi-grup: pilih + PIN + kelola ─────────────── */
    case 'open-groups':       openGroupPicker(); break;
    case 'exit-group':        exitGroup(); break;
    case 'request-group-pin': requestGroupPin(id); break;
    case 'submit-group-pin':  submitGroupPin(); break;
    case 'open-group-admin':  closeHeaderDropdown(); openGroupAdmin(); break;
    case 'rename-group':      renameGroupAction(id); break;
    case 'reset-group-pin':   resetGroupPinAction(id); break;
    case 'manage-group-creds': manageGroupCredsAction(id); break;
    case 'copy-cred-wa':      copyGroupWhatsAppAction(); break;
    case 'remove-superadmin-email': removeSuperAdminAction(target.getAttribute('data-email')); break;
    case 'remove-group':      removeGroupAction(id); break;

    /* ── Navigation / menus ───────────────────────── */
    case 'toggle-theme':      toggleTheme(); break;
    case 'toggle-header-stats': toggleHeaderStats(); break;
    case 'open-about':        openModal('modal-about'); break;
    case 'open-faq':          openModal('modal-faq'); break;
    case 'open-tampilan':     openTampilanModal(); break;
    case 'select-indicator-style': setIndicatorStyle(target.getAttribute('data-style')); break;
    case 'select-privacy-mode': setPrivacyMode(target.getAttribute('data-mode')); break;
    case 'select-currency-format': setCurrencyFormat(target.getAttribute('data-format')); break;
    case 'select-theme-mode': setTheme(target.getAttribute('data-theme')); break;
    case 'select-density': setDensity(target.getAttribute('data-density')); break;
    case 'select-stats-pos': setHeaderStatsPosition(target.getAttribute('data-pos')); break;
    case 'select-accent': setAccentColor(target.getAttribute('data-accent')); break;
    case 'select-font': setNumberFont(target.getAttribute('data-font')); break;
    case 'select-texture': setBgTexture(target.getAttribute('data-texture')); break;
    case 'select-arrears': setArrearsTone(target.getAttribute('data-tone')); break;
    case 'select-progress': setProgressFormat(target.getAttribute('data-format')); break;
    case 'toggle-mobile-menu':
    case 'open-menu-modal':
    case 'toggle-dropdown':   openCommandHubModal(); break;
    case 'install-pwa':
      if (window.__pwaPrompt) window.__pwaPrompt.prompt();
      else showToast('Gunakan opsi Add to Home Screen di browser Anda.', 'info');
      break;
    case 'close-dropdown':    closeHeaderDropdown(); break;
    case 'open-login':        closeHeaderDropdown(); openModal('modal-login'); break;
    case 'stealth-badge-click': handleStealthBadgeClick(); break;
    case 'login-google-superadmin': loginGoogleSuperAdminAction(); break;
    case 'open-offline-queue': openOfflineQueueModal(); break;
    case 'open-skipped-months': openSkippedMonthsModal(); break;
    case 'open-audit-log':    closeHeaderDropdown(); openAuditLogModal(); break;
    case 'refresh-audit-log': renderAuditLogList(); break;
    case 'open-kelola-master': closeHeaderDropdown(); openKelolaMasterModal(); break;
    case 'edit-master-anggota': e.stopPropagation(); bukaModalEditMasterAnggota(id); break;
    case 'edit-master-kategori': e.stopPropagation(); bukaModalEditMasterKategori(id); break;
    case 'toggle-status-anggota': toggleStatusAnggotaAction(id, target.getAttribute('data-status')); break;
    case 'hapus-master-anggota': hapusMasterAnggotaAction(id); break;
    case 'hapus-master-kategori': hapusMasterKategoriAction(id); break;
    case 'toggle-status-from-modal': {
      const idAng = document.getElementById('edit-master-anggota-id')?.value;
      const nextSt = document.getElementById('edit-master-status-select')?.value;
      if (idAng && nextSt) {
        closeModal('modal-edit-master-anggota');
        toggleStatusAnggotaAction(idAng, nextSt);
      }
      break;
    }
    case 'view-profil-from-modal': {
      const idAng = document.getElementById('edit-master-anggota-id')?.value;
      if (idAng) {
        closeModal('modal-edit-master-anggota');
        bukaProfilAnggota(idAng);
      }
      break;
    }
    case 'hapus-anggota-from-modal': {
      const idAng = document.getElementById('edit-master-anggota-id')?.value;
      if (idAng) {
        closeModal('modal-edit-master-anggota');
        hapusMasterAnggotaAction(idAng);
      }
      break;
    }
    case 'hapus-kategori-from-modal': {
      const idKat = document.getElementById('edit-master-kategori-id')?.value;
      if (idKat) {
        closeModal('modal-edit-master-kategori');
        hapusMasterKategoriAction(idKat);
      }
      break;
    }
    case 'open-history':      closeHeaderDropdown(); openModal('modal-riwayat'); break;
    case 'open-statistik':    closeHeaderDropdown(); openModal('modal-statistik'); renderChart(); break;
    case 'open-export':       closeHeaderDropdown(); openModal('modal-export'); break;
    case 'buka-transaksi':    bukaModalTransaksi(); break;

    /* ── Bottom navigation (mobile) ───────────────── */
    case 'nav-home':          closeActiveModal(); window.scrollTo({ top: 0, behavior: 'smooth' }); setBottomNavActive('nav-home'); break;
    case 'nav-riwayat':       closeActiveModal(); setBottomNavActive('nav-riwayat'); openModal('modal-riwayat'); break;
    case 'nav-rekap':         closeActiveModal(); setBottomNavActive('nav-rekap'); document.getElementById('section-rekap')?.scrollIntoView({ behavior: 'smooth' }); break;
    case 'nav-catat':
      setBottomNavActive('nav-catat');
      if (getIsAdminSession()) bukaModalTransaksi();
      else openModal('modal-login');
      break;
    case 'nav-menu':
      setBottomNavActive('nav-menu');
      openCommandHubModal();
      break;

    /* ── Modals ───────────────────────────────────── */
    case 'close-modal': {
      const modalEl = target.closest('.modal-overlay');
      if (modalEl?.id) closeModal(modalEl.id);
      break;
    }
    case 'switch-tab':        switchTab(target.getAttribute('data-tab'), target.closest('.modal-content').closest('.modal-overlay').id); break;

    /* ── Member profile ───────────────────────────── */
    case 'profil':            e.stopPropagation(); bukaProfilAnggota(id); break;

    /* ── Transaction actions ──────────────────────── */
    case 'cetak':             e.stopPropagation(); cetakStruk(id); break;
    case 'edit':              e.stopPropagation(); bukaModalEdit(id); break;
    case 'hapus':             e.stopPropagation(); konfirmasiHapus(id); break;
    case 'cetak-dari-edit': {
      const idTrx = document.getElementById('edit-id')?.value;
      if (idTrx) cetakStruk(idTrx);
      break;
    }
    case 'hapus-dari-edit': {
      const idTrx = document.getElementById('edit-id')?.value;
      if (idTrx) {
        closeModal('modal-edit-transaksi');
        konfirmasiHapus(idTrx);
      }
      break;
    }

    /* ── Quick pay ────────────────────────────────── */
    case 'quickpay':
    case 'quickpay-card':     e.stopPropagation(); openQuickPaySheet(anggota, bulan); break;

    /* ── Mobile card accordion ────────────────────── */
    case 'toggle-card':       toggleIuranCard(target.closest('.iuran-member-card')); break;

    /* ── Skipped months ───────────────────────────── */
    case 'add-skip':          addSkippedMonth(); break;
    case 'remove-skip':       removeSkippedMonth(month); break;

    /* ── History ──────────────────────────────────── */
    case 'set-history-filter': setHistoryFilter(target.getAttribute('data-filter'), target); break;
    case 'load-more':         loadMoreHistory(); break;

    /* ── Export / Print ───────────────────────────── */
    case 'copy-monthly-recap': copyMonthlyRecap(); break;
    case 'export-csv':        exportToCSV(); break;
    case 'export-json-backup': exportJSONBackup(); break;
    case 'print-annual':      cetakLaporanTahunan(); break;
    case 'print-reminder':
    case 'action-salin-tagihan-wa': createGroupReminderMessage(); break;

    /* ── Login/Logout ─────────────────────────────── */
    case 'logout':            closeHeaderDropdown(); closeModal('modal-menu'); openModal('modal-logout'); break;
    case 'confirm-logout':    logoutAdminAction(); break;
    case 'cancel-logout':     closeModal('modal-logout'); break;

    /* ── Delete confirmation ──────────────────────── */
    case 'confirm-delete':    eksekusiHapus(); break;
    case 'cancel-delete':     closeModal('modal-hapus'); break;
    case 'confirm-action-submit': executeConfirmAction(); break;
    case 'cancel-confirm-action': closeConfirmDialog(); break;

    /* ── Sync rekap badge ─────────────────────────── */
    case 'sync-rekap-data':
      setSyncBadge('is-syncing');
      initApp(true).then(() => setSyncBadge('is-clean'));
      break;

    /* ── Offline sync ─────────────────────────────── */
    case 'sync-now':          syncOfflineTransactions(() => { initApp(); renderChart(); }); break;
    case 'refresh-offline':   renderOfflineQueueList(); break;
    case 'delete-offline-item': {
      const itemId = parseInt(target.getAttribute('data-item-id'), 10);
      deleteOfflineTransaction(itemId).then(() => { renderOfflineQueueList(); });
      break;
    }
  }
});

/* Delegated checkbox changes (replaces the removed inline onchange) */
document.addEventListener('change', (e) => {
  if (e.target instanceof Element && e.target.classList.contains('chk-iuran')) {
    updateCounterIuran();
  }
});

/* Close dropdown on outside click */
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('header-dropdown');
  if (dropdown && !dropdown.contains(e.target) && dropdown.classList.contains('open')) {
    closeHeaderDropdown();
  }
});

/* Keyboard shortcuts */
document.addEventListener('keydown', (e) => {
  /* Stealth Super Admin shortcut: Ctrl + Shift + G */
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
    e.preventDefault();
    loginGoogleSuperAdminAction();
    return;
  }

  if (e.key === 'Escape') {
    closeHeaderDropdown();
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) closeModal(activeModal.id);
  }

  /* Accessibility: activate mobile cards on Enter / Space */
  if ((e.key === 'Enter' || e.key === ' ') && e.target?.getAttribute('data-action') === 'toggle-card') {
    e.preventDefault();
    e.target.click();
  }
});

/* Close modal on overlay click */
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
});

/* Close mobile menu on resize */
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeMobileMenu();
});

/* ── Form submit handlers ──────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════════
   BOOT + DATA LOADING
   ══════════════════════════════════════════════════════════════════ */

/**
 * Load the active group's data and render it.
 * @param {boolean} [forceRemote] Skip the cache and always hit the server.
 */
export const initApp = async (forceRemote = false) => {
  if (isLoading || (!forceRemote && !localStorage.getItem(GROUP_OPEN_KEY))) return;

  const hasCache = loadCache();
  if (hasCache) {
    renderAll();
  } else {
    const trxList = document.getElementById('table-riwayat-data') || document.getElementById('ui-table-trx');
    if (trxList) trxList.innerHTML = '<tr><td colspan="5"><div style="padding: 10px;"><div class="skeleton skeleton-text"></div></div></td></tr>';
  }

  // A valid cache is enough unless the caller explicitly forces a refresh.
  if (hasCache && !forceRemote) {
    setConnectionStatus(true);
    return;
  }

  isLoading = true;
  try {
    const resJSON = await fetchInitialData();
    if (resJSON && resJSON.status) {
      setState({
        anggota: resJSON.data.anggota || [],
        kategori: resJSON.data.kategori || [],
        transaksi: resJSON.data.transaksi || [],
        skippedMonths: resJSON.data.settings?.skippedMonths || []
      });
      saveCache();
      notifySynced();
      setSyncBadge('is-clean');
      renderAll();
      setConnectionStatus(true);
    } else {
      if (resJSON?.unauthorized) {
        if (hasCache) renderAll();
        showToast(resJSON.message || 'Sesi telah berakhir. Silakan masuk kembali.', 'warning');
        openGroupPicker();
        return;
      }
      setConnectionStatus(false);
      if (hasCache) {
        renderAll();
        showToast('Server sibuk: Menggunakan data tersimpan (offline).', 'warning');
      } else if (resJSON?.message) {
        showToast(resJSON.message, 'error');
      }
    }
  } catch (error) {
    setConnectionStatus(false);
    console.error('initApp failed:', error);
    if (hasCache) renderAll();
    else showToast('Mode Offline: Belum ada data tersimpan.', 'warning');
  } finally {
    isLoading = false;
  }
};

window.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  applyHeaderStatsPreference();
  applyPrivacyMode();
  applyDensityPreference();
  applyAccentPreference();
  applyNumberFontPreference();
  applyBgTexturePreference();
  applyArrearsTonePreference();
  applyProgressFormatPreference();
  handleUI();

  // Data loads only after a group is unlocked; nothing renders before that.
  initCustomDropdowns();
  initMonthPickers();
  setupRekapSearchListener();
  setupMenuSearchListener();

  window.addEventListener('online', () => {
    showToast('Koneksi kembali. Menyinkronkan transaksi offline...', 'success');
    syncOfflineTransactions(() => { initApp(); renderChart(); });
  });
  window.addEventListener('offline', () => {
    showToast('Anda sedang offline. Transaksi akan disimpan lokal.', 'error');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
        syncOfflineTransactions(() => { initApp(); renderChart(); });
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__pwaPrompt = e;
    const btn = document.getElementById('btn-pwa-install');
    if (btn) btn.style.display = 'flex';
  });

  initGroupsUI(() => {
    // On every group change: reset the freshness signal and re-arm the sync
    // listeners for the newly active group, then pull its data.
    destroySync();
    initSync((hasUpdate) => setSyncBadge(hasUpdate ? 'has-update' : 'is-clean'));
    initApp(true);
  });

  if (isOnline()) syncOfflineTransactions(() => { initApp(); renderChart(); });

  const activeGaId = localStorage.getItem(GA_ID_KEY) || GA_MEASUREMENT_ID;
  if (activeGaId) initAnalytics(activeGaId);

  /* ── Input listeners ─────────────────────────────────────────── */

  [document.getElementById('btn-header-menu'), document.getElementById('btn-header-menu-mobile')].filter(Boolean).forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); openModal('modal-menu'); });
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
  if (opsTipe) opsTipe.addEventListener('change', function () { filterKategori('ops-tipe', 'ops-kategori'); updateCounterOps(); });

  const editTipe = document.getElementById('edit-tipe');
  if (editTipe) editTipe.addEventListener('change', function () { filterKategori('edit-tipe', 'edit-kategori'); });

  const searchTrx = document.getElementById('search-trx');
  if (searchTrx) {
    // Debounce like the rekap search (navigation.js): each keystroke otherwise
    // re-filters and re-renders the whole ledger, doing a per-row member/kategori
    // lookup on every character.
    let trxSearchTimer = null;
    searchTrx.addEventListener('input', () => {
      clearTimeout(trxSearchTimer);
      trxSearchTimer = setTimeout(renderTableTransaksi, 150);
    });
  }

  const filterBulan = document.getElementById('filter-bulan');
  if (filterBulan) filterBulan.addEventListener('change', renderTableTransaksi);

  const filterTahun = document.getElementById('filter-tahun');
  if (filterTahun) filterTahun.addEventListener('change', renderTableTransaksi);

  const searchAnggotaIuran = document.getElementById('search-anggota-iuran');
  if (searchAnggotaIuran) searchAnggotaIuran.addEventListener('keyup', filterAnggotaIuran);

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

  const btnTogglePwd = document.getElementById('btn-toggle-pwd');
  if (btnTogglePwd) {
    btnTogglePwd.addEventListener('click', () => {
      const input = document.getElementById('input-admin-pwd');
      const icon = document.getElementById('icon-toggle-pwd');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'ph ph-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'ph ph-eye';
      }
    });
  }

  /* Keep the group picker reachable once the session can no longer read the group. */
  window.addEventListener('finkas:group-changed', () => {
    renderMasterAnggotaTable();
    renderMasterKategoriTable();
  });
});
