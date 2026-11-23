/**
 * @module app
 * Main application orchestrator and event-delegation coordinator.
 *
 * The UI is driven entirely by delegated `[data-action]` listeners rather than
 * inline handlers, which keeps the markup compatible with a strict
 * Content-Security-Policy.
 */

import {
  setState, saveCache, loadCache, getIsAdminView, getState, getActiveGroupId
} from "./core/state.js";
import { fetchInitialData } from "./core/api.js";
import { getInput, getSelect, closestHtml, showToast, setConnectionStatus, isOnline } from "./core/utils.js";
import { syncOfflineTransactions, deleteOfflineTransaction, countQueuedTransactions } from "./core/offline.js";
import { initAnalytics } from "./core/analytics.js";
import { GA_MEASUREMENT_ID, GA_ID_KEY, GROUP_OPEN_KEY, ACTIVE_GROUP_NAME_KEY } from "./core/config.js";
import { initSync, destroySync, notifySynced, setSyncBadge, runManualSyncRekap } from "./core/sync.js";
import {
  applyTheme, watchSystemTheme, toggleTheme, setTheme, setPalette, applyHeaderStatsPreference,
  applyDensityPreference, applyAccentPreference, applyNumberFontPreference,
  applyBgTexturePreference, setBgTexture, applyArrearsTonePreference, applyProgressFormatPreference,
  applyLanguagePreference, setLanguage
} from "./ui/theme.js";
import {
  openModal, closeModal, switchTab, updateCounterIuran, closeMobileMenu,
  closeHeaderDropdown, closeConfirmDialog, executeConfirmAction
} from "./ui/modal.js";
import {
  renderAll, renderChart, bukaProfilAnggota, toggleIuranCard, renderTableRekap
} from "./render.js";

import {
  handleUI, initLoginModal, initRoleSwitcher, setAdminViewModeAction, submitLoginAdmin, logoutAdminAction, loginGoogleSuperAdminAction, handleStealthBadgeClick
} from "./handlers/auth.js";
import {
  setBottomNavActive, closeActiveModal, setHistoryFilter, setupRekapSearchListener,
  openTampilanModal, openDuesLegend, setIndicatorStyle, setPrivacyMode, setCurrencyFormat, applyPrivacyMode,
  openCommandHubModal, setupMenuSearchListener, initAppFormAndInputListeners
} from "./handlers/navigation.js";
import {
  openQuickPaySheet, submitQuickPay, bukaModalTransaksi, submitIuran,
  submitOperasional, bukaModalEdit, submitEditTransaksi, konfirmasiHapus, eksekusiHapus
} from "./handlers/transactions.js";
import {
  openSkippedMonthsModal, renderAuditLogList, openAuditLogModal, addSkippedMonth,
  removeSkippedMonth, saveKasStart, renderMasterAnggotaTable, renderMasterKategoriTable,
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
import { printMonthlyCashReport, exportMonthlyCashCSV, initMonthlyCashReport } from "./handlers/cash-report.js";
import { copyPassbook } from "./render/profile.js";
import { initSelfPay, openSelfPay, selectSelfPayPreset, copySelfPay } from "./handlers/self-pay.js";
import { initPaymentAccount } from "./handlers/payment-account.js";
import { copyReceipt, initReceipt, openReceipt, openMonthReceipt, downloadReceiptAttachment } from "./render/receipt.js";
import { initAttachmentControls } from "./handlers/attachments.js";
import { initSaveStatus } from "./ui/save-status.js";
import { exportJSONBackup, restoreJSONBackup } from "./handlers/backup.js";
import { initCustomDropdowns } from "./ui/cdrop.js";
import { initTransactionModalControls } from "./ui/transaction-form.js";
import { initMonthPickers } from "./ui/mpick.js";
import { initDatePickers } from "./ui/dpick.js";
import { initKasi, playKasiAction } from "./ui/kasi-mascot.js";
import { initGuidedTour, startGuidedTour, advanceGuidedTour } from "./ui/guided-tour.js";
import { initHistoryPagination } from "./render/transactions.js";
import { filterDuesStatus, initDuesPagination } from "./render/rekap.js";
import { getLastGroupDirection, initHybridMotion, runGroupSwitchTransition } from "./ui/hybrid-motion.js";
import { initBento } from "./ui/bento-dashboard.js";
import { initSpotlight, showSpotlightDetail, getPinnedMemberId, setMemberPin, toggleMemberPin } from "./ui/spotlight.js";
import { initBulkDues, toggleBulkMode, reviewBulkDues } from "./ui/bulk-dues.js";
import { initWorkspace, switchWorkspace, openWorkspaceHistory } from "./ui/workspace.js";
import { initGestures } from "./ui/gestures.js";
import {
  openGroupPicker, exitGroup, requestGroupPin, submitGroupPin, initGroupsUI, openGroupAdmin,
  resetGroupPinAction, removeGroupAction, renameGroupAction, manageGroupCredsAction,
  copyGroupWhatsAppAction, removeSuperAdminAction
} from "./handlers/groups.js";

let isLoading = false;

/* ══════════════════════════════════════════════════════════════════
   Cross-module event mediator
   Decoupled cross-module coordination via standard CustomEvents.
   ══════════════════════════════════════════════════════════════════ */

if (typeof window !== 'undefined') {
  window.addEventListener('finkas:request-refresh', () => {
    initApp(true, false);
  });
}

/* ══════════════════════════════════════════════════════════════════
   EVENT DELEGATION
   ══════════════════════════════════════════════════════════════════ */

document.addEventListener('click', (e) => {
  const target = closestHtml(e.target, '[data-action]');
  if (!target) return;

  const action = target.getAttribute('data-action') || '';

  // Menu sheet: close itself before opening the target modal (no stacking)
  if (target.closest('#modal-menu') && action !== 'close-modal' && !['logout', 'close-dropdown'].includes(action)) {
    closeModal('modal-menu');
  }
  const id = target.getAttribute('data-id') || '';
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
    case 'bulk-toggle': toggleBulkMode(switchWorkspace); break;
    case 'bulk-review': reviewBulkDues(bukaModalTransaksi); break;
    case 'bento-history': openWorkspaceHistory(target.dataset.filter); break;
    case 'spotlight-month': showSpotlightDetail(Number(target.dataset.index)); break;
    case 'spotlight-unpin': setMemberPin('', true); break;
    case 'toggle-member-pin': toggleMemberPin(id); break;
    case 'spotlight-pay': showSpotlightDetail('pay'); break;
    case 'select-rekap-year': {
      const select = target.closest('.year-pill')?.querySelector('select');
      if (!select || !target.dataset.year) break;
      select.value = target.dataset.year;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    }
    case 'filter-dues-status': filterDuesStatus(target.dataset.statusFilter || 'all'); break;
    case 'switch-workspace': switchWorkspace(target.dataset.panel); break;
    case 'select-palette': setPalette(target.dataset.palette, e, target); break;
    case 'select-language': setLanguage(target.dataset.lang === 'en' ? 'en' : 'id'); break;
    case 'set-role-view': setAdminViewModeAction(target.dataset.role); break;
    case 'toggle-privacy': setPrivacyMode(document.body.classList.contains('privacy-mode') ? 'off' : 'on'); break;
    case 'toggle-theme':      toggleTheme(e, target); break;
    case 'open-about':        openModal('modal-about'); break;
    case 'open-dues-legend': openDuesLegend(); break;
    case 'open-faq':          openModal('modal-faq'); break;
    case 'start-guided-tour': startGuidedTour(); break;
    case 'guided-tour-step': advanceGuidedTour(target.dataset.step); break;
    case 'kasi-action': target.dataset.kasi === 'guide' ? startGuidedTour() : playKasiAction(target.dataset.kasi); break;
    case 'open-stamp-settings': openTampilanModal('tampilan-indikator'); break;
    case 'open-tampilan':     openTampilanModal(); break;
    case 'select-indicator-style': setIndicatorStyle(target.getAttribute('data-style')); break;
    case 'select-currency-format': setCurrencyFormat(target.getAttribute('data-format')); break;
    case 'select-theme-mode': {
      const theme = target.dataset.theme;
      if (theme === 'auto' || theme === 'light' || theme === 'dark') setTheme(theme, e, target);
      break;
    }
    case 'select-texture': setBgTexture(target.getAttribute('data-texture')); break;
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
      const idAng = getInput('edit-master-anggota-id')?.value;
      const nextSt = getSelect('edit-master-status-select')?.value;
      if (idAng && nextSt) {
        closeModal('modal-edit-master-anggota');
        toggleStatusAnggotaAction(idAng, nextSt);
      }
      break;
    }
    case 'view-profil-from-modal': {
      const idAng = getInput('edit-master-anggota-id')?.value;
      if (idAng) {
        closeModal('modal-edit-master-anggota');
        bukaProfilAnggota(idAng);
      }
      break;
    }
    case 'hapus-anggota-from-modal': {
      const idAng = getInput('edit-master-anggota-id')?.value;
      if (idAng) {
        closeModal('modal-edit-master-anggota');
        hapusMasterAnggotaAction(idAng);
      }
      break;
    }
    case 'hapus-kategori-from-modal': {
      const idKat = getInput('edit-master-kategori-id')?.value;
      if (idKat) {
        closeModal('modal-edit-master-kategori');
        hapusMasterKategoriAction(idKat);
      }
      break;
    }
    case 'open-history':      closeHeaderDropdown(); switchWorkspace('history'); document.getElementById('workspace-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'open-statistik':    closeHeaderDropdown(); switchWorkspace('stats'); document.getElementById('workspace-stats')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'open-export':       closeHeaderDropdown(); openModal('modal-export'); break;
    case 'buka-transaksi':    bukaModalTransaksi(); break;

    /* ── Bottom navigation (mobile) ───────────────── */
    case 'nav-stats':
      closeActiveModal(); switchWorkspace('stats'); document.getElementById('workspace-stats')?.scrollIntoView(); break;
    case 'nav-pay':
      openSelfPay(getPinnedMemberId() || getState().anggota.find((person) => person.Status_Aktif === 'Aktif')?.ID_Anggota);
      break;
    case 'nav-riwayat':       closeActiveModal(); switchWorkspace('history'); setBottomNavActive('nav-riwayat'); document.getElementById('workspace-history')?.scrollIntoView(); break;
    case 'nav-rekap': {
      closeActiveModal();
      switchWorkspace('iuran');
      setBottomNavActive('nav-rekap');
      const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
      document.getElementById('section-rekap')?.scrollIntoView({ behavior });
      break;
    }
    case 'nav-catat':
      setBottomNavActive('nav-catat');
      if (getIsAdminView()) bukaModalTransaksi();
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
    case 'switch-tab': {
      const modal = target.closest('.modal-content')?.closest('.modal-overlay');
      if (modal && target.dataset.tab) switchTab(target.dataset.tab, modal.id);
      break;
    }

    /* ── Member profile ───────────────────────────── */
    case 'open-self-pay': openSelfPay(id, month === null ? undefined : Number(month), Number(target.dataset.year)); break;
    case 'self-pay-preset': selectSelfPayPreset(target.dataset.preset); break;
    case 'self-pay-copy': copySelfPay(target.dataset.copy); break;
    case 'passbook-copy': copyPassbook(); break;
    case 'open-month-receipt': openMonthReceipt(id, Number(month), Number(target.dataset.year)); break;
    case 'open-receipt': openReceipt(id); break;
    case 'copy-receipt': copyReceipt(); break;
    case 'receipt-attachment': if (target instanceof HTMLButtonElement) downloadReceiptAttachment(target); break;
    case 'profil':            e.stopPropagation(); bukaProfilAnggota(id); break;

    /* ── Transaction actions ──────────────────────── */
    case 'cetak':             e.stopPropagation(); cetakStruk(id); break;
    case 'edit':              e.stopPropagation(); bukaModalEdit(id); break;
    case 'hapus':             e.stopPropagation(); konfirmasiHapus(id); break;
    case 'cetak-dari-edit': {
      const idTrx = getInput('edit-id')?.value;
      if (idTrx) cetakStruk(idTrx);
      break;
    }
    case 'hapus-dari-edit': {
      const idTrx = getInput('edit-id')?.value;
      if (idTrx) {
        closeModal('modal-edit-transaksi');
        konfirmasiHapus(idTrx);
      }
      break;
    }

    /* ── Quick pay ────────────────────────────────── */
    case 'quickpay':
    case 'quickpay-card':     e.stopPropagation(); if (anggota && bulan) openQuickPaySheet(anggota, bulan, target.dataset.year); break;

    /* ── Mobile card accordion ────────────────────── */
    case 'toggle-card':       toggleIuranCard(target.closest('.iuran-member-card')); break;

    /* ── Skipped months ───────────────────────────── */
    case 'add-skip':          addSkippedMonth(); break;
    case 'remove-skip':       removeSkippedMonth(month); break;
    case 'save-kas-start':    saveKasStart(); break;

    /* ── Transaction attachments ───────────────────── */
    case 'upload-attachment':
    case 'download-attachment':
    case 'delete-attachment':
      /* Handled by dedicated event listeners in initAttachmentControls */
      break;

    /* ── History ──────────────────────────────────── */
    case 'set-history-filter': setHistoryFilter(target.dataset.filter); break;

    /* ── Export / Print ───────────────────────────── */
    case 'copy-monthly-recap': copyMonthlyRecap(); break;
    case 'export-csv':        exportToCSV(); break;
    case 'export-json-backup': exportJSONBackup(); break;
    case 'print-annual':      cetakLaporanTahunan(); break;
    case 'print-reminder':
    case 'action-salin-tagihan-wa': createGroupReminderMessage(); break;
    case 'print-monthly-report': printMonthlyCashReport(); break;
    case 'export-monthly-csv': exportMonthlyCashCSV(); break;

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
      runManualSyncRekap(initApp, () => isLoading);
      break;

    /* ── Offline sync ─────────────────────────────── */
    case 'sync-now':          syncOfflineTransactions(() => { initApp(); renderChart(); }); break;
    case 'refresh-offline':   renderOfflineQueueList(); break;
    case 'delete-offline-item': {
      const itemId = parseInt(target.dataset.itemId || '', 10);
      const groupId = getActiveGroupId();
      if (!groupId?.trim()) break;
      deleteOfflineTransaction(itemId, groupId).then(() => { renderOfflineQueueList(); });
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
  if (dropdown && !dropdown.contains(/** @type {Node | null} */ (e.target)) && dropdown.classList.contains('open')) {
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
  }
});

/* Close mobile menu on resize */
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeMobileMenu();
});

/* ══════════════════════════════════════════════════════════════════
   BOOT + DATA LOADING
   ══════════════════════════════════════════════════════════════════ */

/**
 * Initialize application data.
 * @param {boolean} [forceRemote] Skip the cache and always hit the server.
 * @param {boolean} [isUserInitiated] True if triggered directly by the user clicking sync.
 */
export const initApp = async (forceRemote = false, isUserInitiated = false) => {
  if (!forceRemote && !localStorage.getItem(GROUP_OPEN_KEY)) return false;

  const group = getActiveGroupId();
  if (!group) return false;
  const boot = document.body.dataset;
  if (boot.workspaceGroup !== group || boot.workspaceState === 'unavailable') {
    boot.workspaceState = 'loading';
    const label = document.getElementById('workspace-startup-label');
    const groupName = localStorage.getItem(ACTIVE_GROUP_NAME_KEY);
    if (label) label.textContent = groupName ? `Membuka ${groupName}…` : 'Memuat buku kas…';
  }
  boot.workspaceGroup = group;
  if (isLoading) return false;
  const hasCache = loadCache(group);
  if (hasCache) {
    renderAll();
    boot.workspaceState = 'ready';
  }

  if (hasCache && !forceRemote) {
    setConnectionStatus(true);
    return true;
  }

  isLoading = true;
  try {
    const resJSON = await fetchInitialData(group);
    if (getActiveGroupId() !== group) return false;
    if (resJSON?.status && resJSON.data) {
      setState({
        anggota: resJSON.data.anggota || [],
        kategori: resJSON.data.kategori || [],
        transaksi: resJSON.data.transaksi || [],
        skippedMonths: resJSON.data.settings?.skippedMonths || [],
        kasStart: resJSON.data.settings?.kasStart || '',
        paymentAccount: resJSON.data.settings?.paymentAccount || null
      });
      saveCache(group);
      notifySynced(resJSON.data?.updatedAt, resJSON.groupId || group || undefined);
      setSyncBadge('is-clean');
      if (boot.workspaceState !== 'ready') {
        await runGroupSwitchTransition(() => {
          if (getActiveGroupId() !== group) return;
          renderAll();
          boot.workspaceState = 'ready';
        }, { direction: getLastGroupDirection(), focusHeading: true });
      } else {
        renderAll();
      }
      setConnectionStatus(true);
      return true;
    } else {
      if (resJSON?.unauthorized) {
        if (hasCache) renderAll();
        showToast(resJSON.message || 'Sesi telah berakhir. Silakan masuk kembali.', 'warning');
        openGroupPicker();
        return false;
      }
      setConnectionStatus(false);
      if (hasCache) {
        renderAll();
        if (isUserInitiated) {
          showToast('Server sibuk: Menggunakan data tersimpan (offline).', 'warning');
        }
      } else if (resJSON?.message) {
        showToast(resJSON.message, 'error');
      }
      return false;
    }
  } catch (error) {
    setConnectionStatus(false);
    if (getActiveGroupId() !== group) return false;
    console.error('initApp failed:', error);
    if (hasCache) {
      renderAll();
      if (isUserInitiated) {
        showToast('Server sibuk: Menggunakan data tersimpan (offline).', 'warning');
      }
    } else {
      showToast('Mode Offline: Belum ada data tersimpan.', 'warning');
    }
    return false;
  } finally {
    isLoading = false;
    if (getActiveGroupId() !== group) void initApp(true);
    else if (boot.workspaceState !== 'ready') {
      boot.workspaceState = 'unavailable';
      const errMsg = document.querySelector('.workspace-startup-error p');
      if (errMsg) {
        errMsg.textContent = isOnline()
          ? 'Buku kas belum bisa dimuat dari server. Periksa koneksi lalu tekan Coba Lagi.'
          : 'Perangkat sedang offline dan belum ada data kas tersimpan. Sambungkan internet lalu tekan Coba Lagi.';
      }
    }
  }
};

// Mount into the parsed template before startup listeners inspect the cards.
initBento();

window.addEventListener('DOMContentLoaded', async () => {
  initWorkspace();
  initDuesPagination();
  initHistoryPagination();
  initHybridMotion();
  initKasi();
  initGuidedTour();
  initSpotlight();
  initSelfPay();
  initReceipt();
  initPaymentAccount();
  document.addEventListener('finkas:member-pin-changed', renderTableRekap);
  initBulkDues();
  applyAccentPreference();
  applyTheme();
  watchSystemTheme();
  applyHeaderStatsPreference();
  applyPrivacyMode();
  applyDensityPreference();
  applyNumberFontPreference();
  applyBgTexturePreference();
  applyArrearsTonePreference();
  applyProgressFormatPreference();
  applyLanguagePreference();
  handleUI();

  // Data loads only after a group is unlocked; nothing renders before that.
  initCustomDropdowns();
  initTransactionModalControls();
  initMonthPickers();
  initDatePickers();
  initAttachmentControls();
  initMonthlyCashReport();
  initSaveStatus();
  setupRekapSearchListener();
  setupMenuSearchListener();
  initLoginModal();
  initRoleSwitcher();
  initGestures();

  window.addEventListener('finkas:group-changed', () => {
    if (document.getElementById('modal-offline-queue')?.classList.contains('active')) renderOfflineQueueList();
  });

  let hasBeenOffline = false;

  window.addEventListener('online', async () => {
    if (!hasBeenOffline) return;
    hasBeenOffline = false;
    const groupId = getActiveGroupId();
    const pendingCount = await countQueuedTransactions(groupId);
    if (pendingCount > 0 && groupId === getActiveGroupId()) {
      showToast('Koneksi kembali. Menyinkronkan transaksi offline...', 'success');
      syncOfflineTransactions(() => { initApp(); renderChart(); });
    }
  });
  window.addEventListener('offline', () => {
    hasBeenOffline = true;
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

  initAppFormAndInputListeners({
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
});
