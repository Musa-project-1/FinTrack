/**
 * @module app
 * Main application orchestrator and event-delegation coordinator.
 *
 * The UI is driven entirely by delegated `[data-action]` listeners rather than
 * inline handlers, which keeps the markup compatible with a strict
 * Content-Security-Policy.
 */

import {
  setState, saveCache, loadCache, getActiveGroupId
} from "finkas/core/state";
import { fetchInitialData } from "finkas/core/api";
import { showToast, setConnectionStatus, isOnline } from "finkas/core/utils";
import { syncOfflineTransactions, countQueuedTransactions } from "finkas/core/offline";
import { initAnalytics } from "finkas/core/analytics";
import { GA_MEASUREMENT_ID, GA_ID_KEY, GROUP_OPEN_KEY, ACTIVE_GROUP_NAME_KEY } from "finkas/core/config";
import { initSyncEvents, initSync, destroySync, notifySynced, setSyncBadge } from "finkas/core/sync";
import {
  applyTheme, watchSystemTheme, applyHeaderStatsPreference,
  applyDensityPreference, applyAccentPreference, applyNumberFontPreference,
  applyBgTexturePreference, applyArrearsTonePreference, applyProgressFormatPreference,
  applyLanguagePreference
} from "./ui/theme";
import { updateCounterIuran, closeMobileMenu, closeHeaderDropdown } from "./ui/modal";
import { renderAll, renderChart, renderTableRekap } from "./render/index";

import {
  handleUI, initLoginModal, initRoleSwitcher, submitLoginAdmin, loginGoogleSuperAdminAction
} from "./handlers/auth";
import {
  setupRekapSearchListener, applyPrivacyMode, setupMenuSearchListener, initAppFormAndInputListeners
} from "./handlers/navigation";
import { submitQuickPay, submitIuran, submitOperasional, submitEditTransaksi } from "./handlers/transactions";
import {
  renderMasterAnggotaTable, renderMasterKategoriTable,
  submitTambahAnggota, submitTambahKategori, submitEditMasterAnggota
} from "./handlers/master";
import { renderOfflineQueueList } from "./handlers/offlineQueue";
import { initMonthlyCashReport } from "./handlers/cash-report";
import { initSelfPay } from "./handlers/self-pay";
import { initPaymentAccount } from "./handlers/payment-account";
import { initReceipt } from "./render/receipt";
import { initAttachmentControls } from "./handlers/attachments";
import { initSaveStatus } from "./ui/save-status";
import { restoreJSONBackup } from "./handlers/backup";
import { initCustomDropdowns } from "./ui/cdrop";
import { initTransactionModalControls } from "./ui/transaction-form";
import { initEditModalControls } from "./ui/edit-wizard";
import { initMonthPickers } from "./ui/mpick";
import { initDatePickers } from "./ui/dpick";
import { initKasi } from "./ui/kasi-mascot";
import { initGuidedTour } from "./ui/guided-tour";
import { initHistoryPagination } from "./stores/history.svelte";
import { initDuesPagination } from "./stores/rekap.svelte";
import { getLastGroupDirection, initHybridMotion, runGroupSwitchTransition, spinDashboardOdometers } from "./ui/hybrid-motion";
import { initBento } from "./ui/bento-dashboard";
import { initSpotlight } from "./stores/spotlight.svelte";
import { initBulkDues } from "./ui/bulk-dues";
import { initWorkspace } from "./ui/workspace";
import { initGestures } from "./ui/gestures";
import { openGroupPicker, initGroupsUI } from "./handlers/groups";
import { attachAppActionRouter } from "./action-router";

let isLoading = false;

/* ══════════════════════════════════════════════════════════════════
   BOOT + DATA LOADING
   ══════════════════════════════════════════════════════════════════ */

/**
 * Initialize application data.
 * @param {boolean} [forceRemote] Skip the cache and always hit the server.
 * @param {boolean} [isUserInitiated] True if triggered directly by the user clicking sync.
 */
const loadWorkspace = async (forceRemote = false, isUserInitiated = false): Promise<boolean> => {
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
        if (isUserInitiated) spinDashboardOdometers();
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

export async function initApp(forceRemote = false, isUserInitiated = false): Promise<void> {
  await loadWorkspace(forceRemote, isUserInitiated);
}

async function startWorkspace() {
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
  initEditModalControls();
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
}

let booted = false;

export function bootWorkspaceApp(): void {
  if (booted || typeof document === 'undefined') return;
  booted = true;
  initSyncEvents();

  /* ══════════════════════════════════════════════════════════════════
     Cross-module event mediator
     Decoupled cross-module coordination via standard CustomEvents.
     ══════════════════════════════════════════════════════════════════ */

  window.addEventListener('finkas:request-refresh', () => {
    initApp(true, false);
  });

  /* ══════════════════════════════════════════════════════════════════
     EVENT DELEGATION
     ══════════════════════════════════════════════════════════════════ */

  attachAppActionRouter({ loadWorkspace, isLoading: () => isLoading, initApp });

  /* Delegated checkbox changes (replaces the removed inline onchange) */
  document.addEventListener('change', (e) => {
    if (e.target instanceof Element && e.target.classList.contains('chk-iuran')) {
      updateCounterIuran();
    }
  });

  /* Close dropdown on outside click */
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('header-dropdown');
    if (dropdown && !dropdown.contains(e.target as Node | null) && dropdown.classList.contains('open')) {
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

  initBento();
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', startWorkspace);
  else void startWorkspace();
}
