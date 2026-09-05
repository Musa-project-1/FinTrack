/**
 * @module app
 * Main application orchestrator and event delegation coordinator.
 */

import {
  setItemsToShow, setState, saveCache, loadCache, getIsAdminSession, setIsAdminSession, setCurrentRekapYear
} from "./state.js";
import { fetchInitialData, checkAdminSessionApi } from "./api.js";
import { formatRp, showToast, setConnectionStatus, isOnline, handleNominalInput } from "./utils.js";
import { openOfflineDB, syncOfflineTransactions, deleteOfflineTransaction } from "./offline.js";
import { applyTheme, toggleTheme } from "./theme.js";
import {
  openModal, closeModal, switchTab, pilihNominalCepat, resetChipAktif,
  filterKategori, updateCounterOps, updateCounterIuran, pilihSemuaIuran,
  renderCheckboxIuran, filterAnggotaIuran, toggleMobileMenu, closeMobileMenu,
  toggleHeaderDropdown, closeHeaderDropdown
} from "./modal.js";
import {
  renderAll, renderChart, bukaProfilAnggota, toggleIuranCard, renderTableTransaksi, renderTableRekap, loadMoreHistory
} from "./render.js";

// Import modular handlers
import {
  handleUI, renderAdminUI, submitLoginAdmin, logoutAdminAction
} from "./handlers/auth.js";
import {
  setBottomNavActive, closeActiveModal, setHistoryFilter, applyRiwayatPreset, clearRiwayatPresetHighlight, setupRekapSearchListener
} from "./handlers/navigation.js";
import {
  openQuickPaySheet, submitQuickPay, bukaModalTransaksi, submitIuran,
  submitOperasional, bukaModalEdit, submitEditTransaksi, konfirmasiHapus, eksekusiHapus
} from "./handlers/transactions.js";
import {
  openSkippedMonthsModal, renderAuditLogList, openAuditLogModal, addSkippedMonth,
  removeSkippedMonth, renderMasterAnggotaTable, renderMasterKategoriTable,
  openKelolaMasterModal, submitTambahAnggota, toggleStatusAnggotaAction,
  hapusMasterAnggotaAction, submitTambahKategori, hapusMasterKategoriAction
} from "./handlers/master.js";
import {
  renderOfflineQueueList, openOfflineQueueModal
} from "./handlers/offlineQueue.js";
import {
  cetakStruk, cetakLaporanTahunan, copyMonthlyRecap, exportToCSV, createGroupReminderMessage
} from "./handlers/export.js";

let isLoading = false;

/* ── Expose renderChart to window for theme toggle callback ────── */
window.__renderChart = renderChart;

/* ── Expose helpers for inline HTML onchange callbacks ─────────── */
window.__updateCounterIuran = updateCounterIuran;
window.__filterAnggotaIuran = filterAnggotaIuran;
window.__resetItemsToShow = () => setItemsToShow(20);
window.__renderTableTransaksi = renderTableTransaksi;

/* ══════════════════════════════════════════════════════════════════
   EVENT DELEGATION — replaces inline onclick handlers
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
    /* ── Navigation / menus ───────────────────────── */
    case 'toggle-theme':     toggleTheme(); break;
    case 'toggle-mobile-menu':
    case 'open-menu-modal':  openModal('modal-menu'); break;
    case 'toggle-dropdown':  openModal('modal-menu'); break;
    case 'close-dropdown':   closeHeaderDropdown(); break;
    case 'open-login':       closeHeaderDropdown(); openModal('modal-login'); break;
    case 'open-offline-queue': openOfflineQueueModal(); break;
    case 'open-skipped-months': openSkippedMonthsModal(); break;
    case 'open-audit-log':   closeHeaderDropdown(); openAuditLogModal(); break;
    case 'refresh-audit-log': renderAuditLogList(); break;
    case 'open-kelola-master': closeHeaderDropdown(); openKelolaMasterModal(); break;
    case 'toggle-status-anggota': toggleStatusAnggotaAction(id, target.getAttribute('data-status')); break;
    case 'hapus-master-anggota': hapusMasterAnggotaAction(id); break;
    case 'hapus-master-kategori': hapusMasterKategoriAction(id); break;
    case 'open-history':     closeHeaderDropdown(); openModal('modal-riwayat'); break;
    case 'open-statistik':   closeHeaderDropdown(); openModal('modal-statistik'); renderChart(); break;
    case 'open-export':      closeHeaderDropdown(); openModal('modal-export'); break;
    case 'buka-transaksi':   bukaModalTransaksi(); break;
    case 'pilih-nominal':    e.stopPropagation(); pilihNominalCepat(parseInt(target.getAttribute('data-nilai')), target, updateCounterIuran); break;

    /* ── Bottom navigation (mobile) ───────────────── */
    case 'nav-home':         closeActiveModal(); window.scrollTo({ top: 0, behavior: 'smooth' }); setBottomNavActive('nav-home'); break;
    case 'nav-riwayat':      closeActiveModal(); setBottomNavActive('nav-riwayat'); openModal('modal-riwayat'); break;
    case 'nav-rekap':        closeActiveModal(); setBottomNavActive('nav-rekap'); document.getElementById('section-rekap')?.scrollIntoView({ behavior: 'smooth' }); break;
    case 'nav-catat':
      setBottomNavActive('nav-catat');
      if (getIsAdminSession()) bukaModalTransaksi();
      else openModal('modal-login');
      break;
    case 'nav-menu':
      setBottomNavActive('nav-menu');
      openModal('modal-menu');
      break;

    /* ── Modals ───────────────────────────────────── */
    case 'close-modal':      closeModal(target.closest('.modal-overlay').id); break;
    case 'switch-tab':       switchTab(target.getAttribute('data-tab'), target.closest('.modal-content').closest('.modal-overlay').id); break;

    /* ── Member profile ───────────────────────────── */
    case 'profil':           e.stopPropagation(); bukaProfilAnggota(id); break;

    /* ── Transaction actions ──────────────────────── */
    case 'cetak':            e.stopPropagation(); cetakStruk(id); break;
    case 'edit':             e.stopPropagation(); bukaModalEdit(id); break;
    case 'hapus':            e.stopPropagation(); konfirmasiHapus(id); break;

    /* ── Quick pay ────────────────────────────────── */
    case 'quickpay':         e.stopPropagation(); openQuickPaySheet(anggota, bulan); break;
    case 'quickpay-card':    e.stopPropagation(); openQuickPaySheet(anggota, bulan); break;

    /* ── Mobile card accordion ────────────────────── */
    case 'toggle-card':      toggleIuranCard(target.closest('.iuran-member-card')); break;

    /* ── Skipped months ───────────────────────────── */
    case 'add-skip':         addSkippedMonth(); break;
    case 'remove-skip':      removeSkippedMonth(month); break;

    /* ── History ──────────────────────────────────── */
    case 'set-history-filter': setHistoryFilter(target.getAttribute('data-filter'), target); break;
    case 'set-riwayat-preset': applyRiwayatPreset(target.getAttribute('data-preset'), target); break;
    case 'load-more':        loadMoreHistory(); break;

    /* ── Export / Print ───────────────────────────── */
    case 'copy-monthly-recap': copyMonthlyRecap(); break;
    case 'export-csv':       exportToCSV(); break;
    case 'print-annual':     cetakLaporanTahunan(); break;
    case 'print-reminder':   createGroupReminderMessage(); break;

    /* ── Login/Logout ─────────────────────────────── */
    case 'logout':           closeHeaderDropdown(); openModal('modal-logout'); break;
    case 'confirm-logout':   logoutAdminAction(); break;
    case 'cancel-logout':    closeModal('modal-logout'); break;

    /* ── Delete confirmation ──────────────────────── */
    case 'confirm-delete':   eksekusiHapus(); break;
    case 'cancel-delete':    closeModal('modal-hapus'); break;

    /* ── Offline sync ─────────────────────────────── */
    case 'sync-now':         syncOfflineTransactions(() => { initApp(); renderChart(); }); break;
    case 'refresh-offline':  renderOfflineQueueList(); break;
    case 'delete-offline-item': {
      const itemId = parseInt(target.getAttribute('data-item-id'), 10);
      deleteOfflineTransaction(itemId).then(() => { renderOfflineQueueList(); });
      break;
    }
  }
});

/* Close dropdown on outside click */
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('header-dropdown');
  if (dropdown && !dropdown.contains(e.target) && dropdown.classList.contains('open')) {
    closeHeaderDropdown();
  }
});

/* Close dropdown on Escape */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const dd = document.getElementById('header-dropdown');
    if (dd) closeHeaderDropdown();
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) closeModal(activeModal.id);
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
  submitQuickPay(e);
});



export const initApp = async () => {
  if (isLoading) return;

  const hasCache = loadCache();
  if (hasCache) {
    renderAll();
  } else {
    const trxList = document.getElementById('ui-table-trx');
    if (trxList) trxList.innerHTML = '<tr><td colspan="5"><div style="padding: 10px;"><div class="skeleton skeleton-text"></div></div></td></tr>';
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
      renderAll();
      setConnectionStatus(true);
    } else {
      if (resJSON) showToast(resJSON.message, 'error');
      setConnectionStatus(false);
    }
  } catch (error) {
    setConnectionStatus(false);
    if (!hasCache) showToast('Mode Offline: Menampilkan data simulasi.', 'warning');
  } finally {
    isLoading = false;
  }
};

/* ══════════════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', async () => {
  applyTheme();

  try {
    const sessionResp = await checkAdminSessionApi();
    handleUI(sessionResp?.status && sessionResp.data ? !!sessionResp.data.isAdmin : false);
  } catch (e) {
    handleUI(false);
  }
  renderAdminUI();

  initApp();
  setupRekapSearchListener();

  document.querySelectorAll('.connection-status').forEach((el) => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => openOfflineQueueModal());
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openOfflineQueueModal(); });
  });

  window.addEventListener('online', () => {
    showToast('Koneksi kembali. Menyinkronkan transaksi offline...', 'success');
    syncOfflineTransactions(() => { initApp(); renderChart(); });
  });
  window.addEventListener('offline', () => {
    showToast('Anda sedang offline. Transaksi akan disimpan lokal.', 'error');
  });

  if (isOnline()) syncOfflineTransactions(() => { initApp(); renderChart(); });

  // Attach input listeners for dynamic updates
  const btnMenuDesktop = document.getElementById('btn-header-menu');
  if (btnMenuDesktop) {
    btnMenuDesktop.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openModal('modal-menu');
    });
  }

  const btnMenuMobile = document.getElementById('btn-header-menu-mobile');
  if (btnMenuMobile) {
    btnMenuMobile.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openModal('modal-menu');
    });
  }

  const iuranNominal = document.getElementById('iuran-nominal');
  if (iuranNominal) iuranNominal.addEventListener('input', function() { handleNominalInput(this); resetChipAktif(); updateCounterIuran(); });

  const opsNominal = document.getElementById('ops-nominal');
  if (opsNominal) opsNominal.addEventListener('input', function() { handleNominalInput(this); updateCounterOps(); });

  const qpNominal = document.getElementById('qp-nominal');
  if (qpNominal) qpNominal.addEventListener('input', function() { handleNominalInput(this); });

  const iuranBulan = document.getElementById('iuran-bulan');
  if (iuranBulan) iuranBulan.addEventListener('change', renderCheckboxIuran);

  const iuranTahun = document.getElementById('iuran-tahun');
  if (iuranTahun) iuranTahun.addEventListener('input', renderCheckboxIuran);

  const opsTipe = document.getElementById('ops-tipe');
  if (opsTipe) opsTipe.addEventListener('change', function() { filterKategori('ops-tipe', 'ops-kategori'); updateCounterOps(); });

  const editTipe = document.getElementById('edit-tipe');
  if (editTipe) editTipe.addEventListener('change', function() { filterKategori('edit-tipe', 'edit-kategori'); });

  const searchTrx = document.getElementById('search-trx');
  if (searchTrx) searchTrx.addEventListener('keyup', renderTableTransaksi);

  const filterBulan = document.getElementById('filter-bulan');
  if (filterBulan) filterBulan.addEventListener('change', () => { clearRiwayatPresetHighlight(); renderTableTransaksi(); });

  const filterTahun = document.getElementById('filter-tahun');
  if (filterTahun) filterTahun.addEventListener('change', () => { clearRiwayatPresetHighlight(); renderTableTransaksi(); });

  const searchAnggotaIuran = document.getElementById('search-anggota-iuran');
  if (searchAnggotaIuran) searchAnggotaIuran.addEventListener('keyup', filterAnggotaIuran);

  const btnPilihSemua = document.getElementById('btn-pilih-semua');
  if (btnPilihSemua) btnPilihSemua.addEventListener('click', pilihSemuaIuran);

  const tahunRekapSelect = document.getElementById('ui-tahun-rekap-select');
  if (tahunRekapSelect) {
    tahunRekapSelect.addEventListener('change', (e) => {
      setCurrentRekapYear(e.target.value);
      renderTableRekap();
    });
  }

  const formTambahAnggota = document.getElementById('form-tambah-anggota');
  if (formTambahAnggota) formTambahAnggota.addEventListener('submit', submitTambahAnggota);

  const formTambahKategori = document.getElementById('form-tambah-kategori');
  if (formTambahKategori) formTambahKategori.addEventListener('submit', submitTambahKategori);

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
});
