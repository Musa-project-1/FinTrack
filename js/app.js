/**
 * @module app
 * Main application entry point.
 * Wires up event delegation, initializes all modules, and exports
 * global callbacks for backward-compatibility with inline handlers in HTML.
 */

import { GAS_URL, NAMA_BULAN, DEFAULT_MONTHLY_FEE, GROUP_START_YEAR, GROUP_START_MONTH, AVATAR_GRADIENTS, SHEETS_URL } from './config.js';
import {
  getState, setState, addTransaction, saveCache, loadCache,
  getAdminPassword, setAdminPassword, clearAdminPassword,
  getIsAdminSession, setIsAdminSession,
  currentRekapYear, setCurrentRekapYear,
  currentHistoryFilter, setCurrentHistoryFilter,
  setItemsToShow
} from './state.js';
import {
  postToBackend, sendAdminPayload, fetchInitialData,
  loginAdminApi, checkAdminSessionApi, logoutAdminApi, fetchAuditLogApi
} from './api.js';
import { formatRp, showToast, setConnectionStatus, isOnline, handleNominalInput, getRawNominal, hashText, escapeHtml, getInitials, getAvatarGradient } from './utils.js';
import {
  openOfflineDB, addOfflineTransaction, getOfflineTransactions,
  deleteOfflineTransaction, queueOfflinePayload, syncOfflineTransactions
} from './offline.js';
import { applyTheme, toggleTheme } from './theme.js';
import {
  openModal, closeModal, switchTab, pilihNominalCepat, resetChipAktif,
  filterKategori, updateCounterOps, updateCounterIuran, pilihSemuaIuran,
  renderCheckboxIuran, filterAnggotaIuran, toggleMobileMenu, closeMobileMenu,
  toggleHeaderDropdown, closeHeaderDropdown
} from './modal.js';
import {
  renderAll, renderDashboard, renderDropdowns, renderTableTransaksi,
  renderTableRekap, loadMoreHistory, renderChart, bukaProfilAnggota,
  toggleIuranCard, renderSkippedMonthsList, populateTahunRekap, populateFilterTahunHistory
} from './render.js';

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
    case 'toggle-mobile-menu': toggleMobileMenu(); break;
    case 'toggle-dropdown':  toggleHeaderDropdown(); break;
    case 'close-dropdown':   closeHeaderDropdown(); break;
    case 'open-login':       closeHeaderDropdown(); openModal('modal-login'); break;
    case 'open-offline-queue': openOfflineQueueModal(); break;
    case 'open-skipped-months': openSkippedMonthsModal(); break;
    case 'open-audit-log':   closeHeaderDropdown(); openAuditLogModal(); break;
    case 'refresh-audit-log': renderAuditLogList(); break;
    case 'open-database':    window.open(SHEETS_URL, '_blank'); break;
    case 'open-history':     closeHeaderDropdown(); openModal('modal-riwayat'); break;
    case 'open-statistik':   closeHeaderDropdown(); openModal('modal-statistik'); break;
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

/* ── Bottom nav helpers ────────────────────────────────────────── */

const setBottomNavActive = (action) => {
  document.querySelectorAll('.bottom-nav-item').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-action') === action);
  });
};

const closeActiveModal = () => {
  const active = document.querySelector('.modal-overlay.active');
  if (active) closeModal(active.id);
};

/* ══════════════════════════════════════════════════════════════════
   ADMIN UI MANAGEMENT
   ══════════════════════════════════════════════════════════════════ */

const handleUI = (isAdmin) => {
  setIsAdminSession(!!isAdmin);
  document.querySelectorAll('.admin-only').forEach((el) => {
    el.style.display = getIsAdminSession() ? '' : 'none';
  });
  document.querySelectorAll('.non-admin-only').forEach((el) => {
    el.style.display = getIsAdminSession() ? 'none' : '';
  });
  const btn = document.getElementById('btn-login-admin');
  if (btn) {
    btn.innerHTML = getIsAdminSession()
      ? '<i class="ph-fill ph-lock-key-open" style="color: var(--primary); margin-right:8px; font-size:18px;"></i> Admin Aktif'
      : '<i class="ph ph-lock-key" style="margin-right:8px; font-size:18px; color:var(--primary);"></i> Login';
  }
  const logoutBtn = document.getElementById('btn-logout-admin');
  if (logoutBtn) logoutBtn.style.display = getIsAdminSession() ? '' : 'none';
};

const renderAdminUI = () => {
  const btn = document.getElementById('btn-login-admin');
  if (btn) {
    btn.innerHTML = getIsAdminSession()
      ? '<i class="ph-fill ph-lock-key-open" style="color: var(--primary); margin-right:8px; font-size:18px;"></i> Admin Aktif'
      : '<i class="ph ph-lock-key" style="margin-right:8px; font-size:18px; color:var(--primary);"></i> Login';
  }
  document.body.classList.toggle('admin-mode', getIsAdminSession());
  const waBtn = document.getElementById('btn-copy-wa-reminder');
  if (waBtn) waBtn.style.display = getIsAdminSession() ? '' : 'none';
};

/* ══════════════════════════════════════════════════════════════════
   ADMIN LOGIN / LOGOUT
   ══════════════════════════════════════════════════════════════════ */

const submitLoginAdmin = async (e) => {
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Mengecek...';
  btn.disabled = true;

  const pwd = document.getElementById('input-admin-pwd').value;
  const hashedPwd = await hashText(pwd);
  const resJSON = await loginAdminApi(pwd);

  if (resJSON && resJSON.status) {
    setAdminPassword(hashedPwd);
    handleUI(true);
    renderAdminUI();
    closeModal('modal-login');
    document.getElementById('input-admin-pwd').value = '';
    renderAll();
    renderChart();
    showToast('Berhasil Login sebagai Admin!', 'success');
  } else {
    showToast(resJSON ? resJSON.message : 'Gagal terhubung ke server.', 'error');
    document.getElementById('input-admin-pwd').value = '';
    document.getElementById('input-admin-pwd').focus();
  }

  btn.innerHTML = originalText;
  btn.disabled = false;
};

const logoutAdminAction = async () => {
  closeModal('modal-logout');
  const res = await logoutAdminApi();
  if (res && res.status) {
    setIsAdminSession(false);
    clearAdminPassword();
    renderAdminUI();
    handleUI(false);
    renderAll();
    showToast('Berhasil logout.', 'success');
  } else {
    showToast('Gagal logout dari server.', 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════
   HISTORY FILTER
   ══════════════════════════════════════════════════════════════════ */

const setHistoryFilter = (filter, btn) => {
  setCurrentHistoryFilter(filter);
  document.querySelectorAll('#history-filter-chips .chip-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  setItemsToShow(20);
  renderTableTransaksi();
};

/* ── Quick presets: Bulan Ini / Bulan Lalu / Semua Waktu ───────── */

const clearRiwayatPresetHighlight = () => {
  document.querySelectorAll('#history-filter-chips [data-preset]').forEach((b) => b.classList.remove('active'));
};

const applyRiwayatPreset = (preset, btn) => {
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

  clearRiwayatPresetHighlight();
  btn.classList.add('active');
  setItemsToShow(20);
  renderTableTransaksi();
};

/* ══════════════════════════════════════════════════════════════════
   SEARCH LISTENERS
   ══════════════════════════════════════════════════════════════════ */

let rekapSearchTimer = null;
const setupRekapSearchListener = () => {
  const input = document.getElementById('search-member-rekap');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(rekapSearchTimer);
    rekapSearchTimer = setTimeout(() => renderTableRekap(), 150);
  });
};

window.gantiTahunRekap = (v) => { setCurrentRekapYear(v); renderTableRekap(); };

/* ══════════════════════════════════════════════════════════════════
   QUICK PAY (BOTTOM SHEET)
   ══════════════════════════════════════════════════════════════════ */

const openQuickPaySheet = (idAnggota, bulan) => {
  if (!idAnggota || !bulan) return;
  const ang = getState().anggota.find((a) => a.ID_Anggota === idAnggota);
  if (!ang) return showToast('Anggota tidak ditemukan.', 'error');

  document.getElementById('qp-id-anggota').value = idAnggota;
  document.getElementById('qp-bulan').value = bulan;
  document.getElementById('qp-tahun').value = currentRekapYear;
  document.getElementById('qp-nama').innerText = ang.Nama_Anggota;
  document.getElementById('qp-periode').innerText = `Iuran ${bulan} ${currentRekapYear}`;
  const avatar = document.getElementById('qp-avatar');
  avatar.innerText = getInitials(ang.Nama_Anggota);
  avatar.style.background = getAvatarGradient(ang.Nama_Anggota, AVATAR_GRADIENTS);
  const nominalEl = document.getElementById('qp-nominal');
  nominalEl.value = new Intl.NumberFormat('id-ID').format(DEFAULT_MONTHLY_FEE);
  openModal('modal-quickpay');
};

const submitQuickPay = async (e) => {
  e.preventDefault();
  const idAnggota = document.getElementById('qp-id-anggota').value;
  const bulan = document.getElementById('qp-bulan').value;
  const tahun = document.getElementById('qp-tahun').value;
  const nominal = getRawNominal('qp-nominal');

  if (nominal <= 0) return showToast('Nominal harus lebih dari 0.', 'error');

  const state = getState();
  const kat = state.kategori.find((k) => k.Tipe === 'Masuk');
  if (!kat) return showToast('Buat kategori Masuk terlebih dahulu.', 'error');

  const btn = document.getElementById('btn-submit-quickpay');
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Menyimpan...';
  btn.disabled = true;

  const payload = {
    action: 'tambahTransaksi',
    dataForm: {
      tipeArus: 'Masuk', idKategori: kat.ID_Kategori, idAnggota,
      bulanIuran: bulan, tahunIuran: tahun, nominal, keterangan: 'Iuran Anggota'
    }
  };

  const optimisticUpdate = () => {
    addTransaction({
      ID_Transaksi: 'TRX-TEMP-' + Math.floor(Math.random() * 100000), Timestamp: new Date().toISOString(),
      Tipe_Arus: 'Masuk', ID_Kategori: kat.ID_Kategori, ID_Anggota: idAnggota,
      Bulan_Iuran: bulan, Tahun_Iuran: tahun, Nominal: nominal, Keterangan: 'Iuran Anggota'
    });
    renderDashboard(); renderTableTransaksi(); renderTableRekap(); renderChart();
  };

  const resetBtn = () => { btn.innerHTML = '<i class="ph-bold ph-check-circle"></i> BAYAR SEKARANG'; btn.disabled = false; };

  if (!isOnline()) {
    await queueOfflinePayload({ ...payload, adminPassword: getAdminPassword() });
    showToast('Offline: pembayaran disimpan lokal untuk sinkronisasi nanti.', 'success');
    closeModal('modal-quickpay');
    optimisticUpdate();
    resetBtn();
    return;
  }

  try {
    const resJSON = await sendAdminPayload(payload);
    if (!resJSON) {
      await queueOfflinePayload({ ...payload, adminPassword: getAdminPassword() });
      showToast('Offline atau server tidak tersedia. Pembayaran disimpan lokal.', 'success');
      closeModal('modal-quickpay');
      optimisticUpdate();
      return;
    }
    if (resJSON.status) {
      showToast(`Iuran ${bulan} ${tahun} untuk ${getState().anggota.find((a) => a.ID_Anggota === idAnggota)?.Nama_Anggota || 'anggota'} berhasil dicatat!`);
      closeModal('modal-quickpay');
      optimisticUpdate();
    } else {
      showToast(resJSON.message, 'error');
    }
  } catch (error) {
    showToast('Gagal menyimpan data.', 'error');
  } finally {
    resetBtn();
  }
};

/* ══════════════════════════════════════════════════════════════════
   OPEN TRANSACTION MODAL
   ══════════════════════════════════════════════════════════════════ */

const bukaModalTransaksi = () => {
  switchTab('iuran', 'modal-transaksi');
  document.getElementById('search-anggota-iuran').value = '';
  document.getElementById('iuran-tahun').value = new Date().getFullYear();
  document.getElementById('iuran-bulan').value = NAMA_BULAN[new Date().getMonth()];
  renderCheckboxIuran();
  document.getElementById('tab-operasional').querySelector('form').reset();
  document.getElementById('ops-anggota').value = '-';
  document.getElementById('ops-tipe').value = 'Keluar';
  filterKategori('ops-tipe', 'ops-kategori');
  document.getElementById('iuran-nominal').value = new Intl.NumberFormat('id-ID').format(10000);
  resetChipAktif();
  const firstChip = document.querySelector('#chip-group-iuran .chip-btn');
  if (firstChip) firstChip.classList.add('active');
  openModal('modal-transaksi');
};

/* ══════════════════════════════════════════════════════════════════
   SUBMIT IURAN (BULK CONTRIBUTIONS)
   ══════════════════════════════════════════════════════════════════ */

const submitIuran = async (e) => {
  const checkboxes = document.querySelectorAll('.chk-iuran:not(:disabled):checked');
  if (checkboxes.length === 0) return showToast('Pilih minimal 1 anggota!', 'error');

  const btn = document.getElementById('btn-submit-iuran');
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Menyimpan...';
  btn.disabled = true;

  const arrIdAnggota = Array.from(checkboxes).map((chk) => chk.value);
  const formNominal = getRawNominal('iuran-nominal');
  const formKategori = document.getElementById('iuran-kategori').value;
  const formBulan = document.getElementById('iuran-bulan').value;
  const formTahun = document.getElementById('iuran-tahun').value;

  const payload = {
    action: 'tambahTransaksiMassal',
    dataForm: {
      tipeArus: 'Masuk', idKategori: formKategori, arrIdAnggota,
      bulanIuran: formBulan, tahunIuran: formTahun, nominal: formNominal, keterangan: 'Iuran Anggota'
    }
  };

  const optimisticUpdate = (idsToAdd) => {
    const timestamp = new Date().toISOString();
    idsToAdd.forEach((idAng) => {
      addTransaction({
        ID_Transaksi: 'TRX-TEMP-' + Math.floor(Math.random() * 100000), Timestamp: timestamp,
        Tipe_Arus: 'Masuk', ID_Kategori: formKategori, ID_Anggota: idAng,
        Bulan_Iuran: formBulan, Tahun_Iuran: formTahun, Nominal: formNominal, Keterangan: 'Iuran Anggota'
      });
    });
    populateTahunRekap(); renderDashboard(); renderTableTransaksi(); renderTableRekap(); renderChart();
    renderCheckboxIuran();
    document.getElementById('iuran-nominal').value = new Intl.NumberFormat('id-ID').format(10000);
    resetChipAktif();
    const firstChip = document.querySelector('#chip-group-iuran .chip-btn:first-child');
    if (firstChip) firstChip.classList.add('active');
  };

  const resetBtn = () => { btn.innerHTML = 'SIMPAN IURAN'; btn.disabled = false; };

  if (!isOnline()) {
    await queueOfflinePayload({ ...payload, adminPassword: getAdminPassword() });
    showToast('Offline: transaksi iuran disimpan lokal untuk sinkronisasi nanti.', 'success');
    closeModal('modal-transaksi');
    optimisticUpdate(arrIdAnggota);
    resetBtn();
    return;
  }

  try {
    const resJSON = await sendAdminPayload(payload);
    if (!resJSON) {
      await queueOfflinePayload({ ...payload, adminPassword: getAdminPassword() });
      showToast('Offline atau server tidak tersedia. Transaksi disimpan lokal.', 'success');
      closeModal('modal-transaksi');
      resetBtn();
      return;
    }
    if (resJSON.status) {
      const inserted = Number(resJSON.data?.inserted ?? arrIdAnggota.length);
      const skipped = Array.isArray(resJSON.data?.skipped) ? resJSON.data.skipped : [];
      if (inserted === 0) {
        showToast(resJSON.message || 'Semua anggota yang dipilih sudah lunas.', 'warning');
        closeModal('modal-transaksi');
        initApp();
      } else {
        showToast(resJSON.message || 'Iuran berhasil dicatat!', skipped.length ? 'warning' : 'success');
        closeModal('modal-transaksi');
        optimisticUpdate(arrIdAnggota.filter((id) => !skipped.includes(id)));
      }
    } else {
      showToast(resJSON.message, 'error');
    }
  } catch (error) {
    if (!isOnline()) {
      await queueOfflinePayload({ ...payload, adminPassword: getAdminPassword() });
      showToast('Offline: transaksi iuran disimpan lokal untuk sinkronisasi nanti.', 'success');
      closeModal('modal-transaksi');
    } else {
      showToast('Gagal menyimpan data.', 'error');
    }
  } finally {
    resetBtn();
  }
};

/* ══════════════════════════════════════════════════════════════════
   SUBMIT OPERASIONAL (SINGLE TRANSACTION)
   ══════════════════════════════════════════════════════════════════ */

const submitOperasional = async (e) => {
  const btn = document.getElementById('btn-submit-ops');
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Menyimpan...';
  btn.disabled = true;

  const formTipe = document.getElementById('ops-tipe').value;
  const formKategori = document.getElementById('ops-kategori').value;
  const formNominal = getRawNominal('ops-nominal');
  const formAnggota = document.getElementById('ops-anggota').value;
  const formKeterangan = document.getElementById('ops-keterangan').value;

  const payload = {
    action: 'tambahTransaksi',
    dataForm: {
      tipeArus: formTipe, idKategori: formKategori, idAnggota: formAnggota,
      bulanIuran: '-', tahunIuran: '-', nominal: formNominal, keterangan: formKeterangan
    }
  };

  const optimisticUpdate = () => {
    addTransaction({
      ID_Transaksi: 'TRX-TEMP-' + Math.floor(Math.random() * 100000), Timestamp: new Date().toISOString(),
      Tipe_Arus: formTipe, ID_Kategori: formKategori, ID_Anggota: formAnggota,
      Bulan_Iuran: '-', Tahun_Iuran: '-', Nominal: formNominal, Keterangan: formKeterangan
    });
    populateTahunRekap(); renderDashboard(); renderTableTransaksi(); renderTableRekap(); renderChart();
    document.getElementById('tab-operasional').querySelector('form').reset();
    document.getElementById('ops-anggota').value = '-';
    document.getElementById('ops-tipe').value = 'Keluar';
    filterKategori('ops-tipe', 'ops-kategori');
  };

  const resetBtn = () => { btn.innerHTML = 'SIMPAN OPERASIONAL'; btn.disabled = false; };

  if (!isOnline()) {
    await queueOfflinePayload({ ...payload, adminPassword: getAdminPassword() });
    showToast('Offline: transaksi operasional disimpan lokal untuk sinkronisasi nanti.', 'success');
    closeModal('modal-transaksi');
    optimisticUpdate();
    resetBtn();
    return;
  }

  try {
    const resJSON = await sendAdminPayload(payload);
    if (!resJSON) {
      await queueOfflinePayload({ ...payload, adminPassword: getAdminPassword() });
      showToast('Offline atau server tidak tersedia. Transaksi disimpan lokal.', 'success');
      closeModal('modal-transaksi');
      resetBtn();
      return;
    }
    if (resJSON.status) {
      showToast('Transaksi Operasional dicatat!');
      closeModal('modal-transaksi');
      optimisticUpdate();
    } else {
      showToast(resJSON.message, 'error');
    }
  } catch (error) {
    if (!isOnline()) {
      await queueOfflinePayload({ ...payload, adminPassword: getAdminPassword() });
      showToast('Offline: transaksi operasional disimpan lokal untuk sinkronisasi nanti.', 'success');
      closeModal('modal-transaksi');
    } else {
      showToast('Gagal menyimpan data.', 'error');
    }
  } finally {
    resetBtn();
  }
};

/* ══════════════════════════════════════════════════════════════════
   EDIT / DELETE TRANSACTIONS
   ══════════════════════════════════════════════════════════════════ */

const bukaModalEdit = (idTrx) => {
  const trx = getState().transaksi.find((t) => t.ID_Transaksi === idTrx);
  if (!trx) return;
  document.getElementById('edit-id').value = trx.ID_Transaksi;
  document.getElementById('edit-tipe').value = trx.Tipe_Arus;
  filterKategori('edit-tipe', 'edit-kategori');
  setTimeout(() => { document.getElementById('edit-kategori').value = trx.ID_Kategori; }, 50);
  document.getElementById('edit-nominal').value = trx.Nominal;
  document.getElementById('edit-anggota').value = trx.ID_Anggota || '-';
  document.getElementById('edit-bulan').value = trx.Bulan_Iuran || '-';
  document.getElementById('edit-tahun').value = trx.Tahun_Iuran || '';
  document.getElementById('edit-keterangan').value = trx.Keterangan || '';
  document.getElementById('modal-riwayat').classList.remove('active');
  openModal('modal-edit-transaksi');
};

const submitEditTransaksi = async (e) => {
  const btn = document.getElementById('btn-submit-edit');
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Updating...';
  btn.disabled = true;

  const payload = {
    action: 'editTransaksi',
    dataForm: {
      idTransaksi: document.getElementById('edit-id').value,
      tipeArus: document.getElementById('edit-tipe').value,
      idKategori: document.getElementById('edit-kategori').value,
      idAnggota: document.getElementById('edit-anggota').value,
      bulanIuran: document.getElementById('edit-bulan').value,
      tahunIuran: document.getElementById('edit-tahun').value,
      nominal: document.getElementById('edit-nominal').value,
      keterangan: document.getElementById('edit-keterangan').value
    }
  };

  try {
    const resJSON = await sendAdminPayload(payload);
    if (!resJSON) return;
    if (resJSON.status) {
      showToast('Data berhasil diperbarui!');
      closeModal('modal-edit-transaksi');
      initApp();
    } else {
      showToast(resJSON.message, 'error');
    }
  } catch (error) {
    showToast('Sistem (Backend) belum mendukung fitur Edit.', 'error');
  } finally {
    btn.innerHTML = 'UPDATE DATA';
    btn.disabled = false;
  }
};

const konfirmasiHapus = (idTrx) => {
  document.getElementById('hapus-id-target').value = idTrx;
  document.getElementById('modal-hapus').style.zIndex = '110';
  openModal('modal-hapus');
};

const eksekusiHapus = async () => {
  const idTarget = document.getElementById('hapus-id-target').value;
  const btn = document.getElementById('btn-hapus');
  btn.innerHTML = '...';
  btn.disabled = true;

  try {
    const resJSON = await sendAdminPayload({ action: 'hapusTransaksi', idTransaksi: idTarget });
    if (!resJSON) return;
    if (resJSON.status) {
      showToast('Data dihapus!');
      closeModal('modal-hapus');
      initApp();
      renderChart();
    } else {
      showToast(resJSON.message, 'error');
    }
  } catch (error) {
    showToast('Gagal menghapus.', 'error');
  } finally {
    btn.innerHTML = 'Ya, Hapus';
    btn.disabled = false;
  }
};

/* ══════════════════════════════════════════════════════════════════
   SKIPPED MONTHS
   ══════════════════════════════════════════════════════════════════ */

const openSkippedMonthsModal = () => {
  renderSkippedMonthsList();
  openModal('modal-skipped-months');
};

/* ══════════════════════════════════════════════════════════════════
   AUDIT LOG
   ══════════════════════════════════════════════════════════════════ */

const AUDIT_ACTION_LABELS = {
  LOGIN_ADMIN:        { label: 'Login Admin', color: 'var(--primary)' },
  LOGIN_GAGAL:        { label: 'Login Gagal', color: 'var(--danger)' },
  LOGOUT_ADMIN:       { label: 'Logout', color: '#64748b' },
  TAMBAH_TRANSAKSI:   { label: 'Tambah Transaksi', color: 'var(--primary)' },
  TAMBAH_IURAN_MASSAL:{ label: 'Iuran Massal', color: 'var(--primary)' },
  EDIT_TRANSAKSI:     { label: 'Edit Transaksi', color: 'var(--warning)' },
  HAPUS_TRANSAKSI:    { label: 'Hapus Transaksi', color: 'var(--danger)' },
  DUPLIKAT_DITOLAK:   { label: 'Duplikat Ditolak', color: 'var(--danger)' },
  TAMBAH_ANGGOTA:     { label: 'Tambah Anggota', color: 'var(--primary)' },
  TAMBAH_KATEGORI:    { label: 'Tambah Kategori', color: 'var(--primary)' },
  TAMBAH_BULAN_LIBUR: { label: 'Bulan Libur +', color: 'var(--warning)' },
  HAPUS_BULAN_LIBUR:  { label: 'Bulan Libur -', color: 'var(--warning)' }
};

const renderAuditLogList = async () => {
  const tbody = document.getElementById('audit-log-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-muted);">Memuat...</td></tr>';

  const res = await fetchAuditLogApi();
  if (!res || !res.status) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--danger);">${escapeHtml(res?.message || 'Gagal memuat log.')}</td></tr>`;
    return;
  }

  const log = res.data?.log || [];
  if (log.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-muted);">Belum ada aktivitas tercatat.</td></tr>';
    return;
  }

  tbody.innerHTML = log.map((entry) => {
    const meta = AUDIT_ACTION_LABELS[entry.Aksi] || { label: entry.Aksi, color: 'var(--text-main)' };
    const tgl = new Date(entry.Timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <tr>
        <td style="font-size:12px; color:var(--text-muted); white-space:nowrap;">${escapeHtml(tgl)}</td>
        <td style="white-space:nowrap;"><span style="font-size:11px; font-weight:700; color:${meta.color};">${escapeHtml(meta.label)}</span></td>
        <td style="font-size:12px; color:var(--text-main); word-break:break-word;">${escapeHtml(String(entry.Detail || ''))}</td>
      </tr>
    `;
  }).join('');
};

const openAuditLogModal = () => {
  openModal('modal-audit-log');
  renderAuditLogList();
};

const addSkippedMonth = async () => {
  const el = document.getElementById('input-skip-month');
  if (!el || !el.value) return showToast('Pilih bulan terlebih dahulu.', 'error');
  const parts = el.value.split('-');
  if (parts.length !== 2) return showToast('Format bulan salah.', 'error');
  const key = `${parts[1].padStart(2, '0')}-${parts[0]}`;

  const res = await sendAdminPayload({ action: 'addSkippedMonth', month: key });
  if (!res) return showToast('Gagal terhubung ke server.', 'error');
  if (res.status) {
    const state = getState();
    state.skippedMonths = res.data?.skippedMonths || state.skippedMonths.concat([key]);
    renderSkippedMonthsList();
    showToast('Bulan libur berhasil ditambahkan.', 'success');
  } else {
    showToast(res.message || 'Gagal menambahkan bulan libur.', 'error');
  }
};

const removeSkippedMonth = async (key) => {
  const res = await sendAdminPayload({ action: 'removeSkippedMonth', month: key });
  if (!res) return showToast('Gagal terhubung ke server.', 'error');
  if (res.status) {
    const state = getState();
    state.skippedMonths = res.data?.skippedMonths || state.skippedMonths.filter((s) => s !== key);
    renderSkippedMonthsList();
    showToast('Bulan libur dihapus.', 'success');
  } else {
    showToast(res.message || 'Gagal menghapus bulan libur.', 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════
   OFFLINE QUEUE UI
   ══════════════════════════════════════════════════════════════════ */

const renderOfflineQueueList = async () => {
  const container = document.getElementById('offline-queue-list');
  if (!container) return;
  container.innerHTML = '';
  try {
    const queued = await getOfflineTransactions();
    if (!queued || queued.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);">Tidak ada transaksi tertunda.</div>';
      return;
    }
    queued.reverse().forEach((item) => {
      const card = document.createElement('div');
      card.className = 'pending-item';
      const t = new Date(item.queuedAt).toLocaleString('id-ID');
      const action = item.payload?.action || 'unknown';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:700; color:var(--text-main);">${escapeHtml(action)}</div>
            <div style="font-size:12px; color:var(--text-muted);">${t}</div>
            <div style="margin-top:6px; font-size:12px; color:var(--text-muted);">${JSON.stringify(item.payload.dataForm || item.payload || {})}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline" data-action="delete-offline-item" data-item-id="${item.id}">Hapus</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger);">Gagal memuat daftar.</div>';
  }
};

const openOfflineQueueModal = async () => {
  await renderOfflineQueueList();
  openModal('modal-offline-queue');
};

/* ══════════════════════════════════════════════════════════════════
   PRINT RECEIPT / REPORT
   ══════════════════════════════════════════════════════════════════ */

const cetakStruk = (idTrx) => {
  const state = getState();
  const trx = state.transaksi.find((t) => t.ID_Transaksi === idTrx);
  if (!trx) return;
  const tglStr = new Date(trx.Timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const objKategori = state.kategori.find((k) => k.ID_Kategori === trx.ID_Kategori);
  const namaKat = objKategori ? objKategori.Nama_Kategori : '-';
  const objAng = state.anggota.find((a) => a.ID_Anggota === trx.ID_Anggota);
  const namaAnggota = objAng ? objAng.Nama_Anggota : '-';

  const html = `<html><head><title>Struk Transaksi</title><style>body{font-family:'Courier New',monospace;font-size:14px;color:#000;padding:20px;width:300px;margin:0 auto}.header{text-align:center;border-bottom:1px dashed #000;padding-bottom:10px;margin-bottom:10px}.row{display:flex;justify-content:space-between;margin-bottom:5px}.footer{text-align:center;border-top:1px dashed #000;padding-top:10px;margin-top:10px;font-size:12px}h2{margin:0;font-size:18px}</style></head><body><div class="header"><h2>KAS KITA PRO</h2><div>Bukti Transaksi</div><div style="font-size:11px;margin-top:4px;">ID: ${escapeHtml(trx.ID_Transaksi)}</div></div><div style="margin-bottom:15px;font-size:12px;">Waktu: ${escapeHtml(tglStr)}</div><div class="row"><span>Tipe Arus:</span><span><b>${escapeHtml(trx.Tipe_Arus.toUpperCase())}</b></span></div><div class="row"><span>Kategori:</span><span>${escapeHtml(namaKat)}</span></div><div class="row"><span>Anggota:</span><span>${escapeHtml(namaAnggota)}</span></div><div class="row" style="margin-top:10px;padding-top:10px;border-top:1px dashed #ccc;"><span><b>NOMINAL:</b></span><span style="font-size:16px;"><b>${formatRp(trx.Nominal)}</b></span></div><div style="margin-top:15px;">Catatan:<br><i>${escapeHtml(trx.Keterangan || '-')}</i></div><div class="footer">Dicetak oleh Sistem<br><i>Terima kasih</i></div></body></html>`;

  const pw = window.open('', '_blank', 'width=400,height=600');
  pw.document.write(html);
  pw.document.close();
  pw.focus();
  setTimeout(() => { pw.print(); pw.close(); }, 500);
};

const cetakLaporanTahunan = () => {
  const state = getState();
  if (state.anggota.length === 0) return showToast('Tidak ada data anggota untuk dicetak.', 'error');
  closeModal('modal-export');

  const skipSet = new Set(state.skippedMonths || []);
  const mapPembayaran = {};
  state.transaksi.forEach((t) => {
    if (t.Tahun_Iuran && t.Tahun_Iuran.toString() === currentRekapYear) {
      mapPembayaran[`${t.ID_Anggota}_${t.Bulan_Iuran}`] = true;
    }
  });

  const monthTotals = Array(NAMA_BULAN.length).fill(0);
  let tbodyHTML = '';
  let index = 1;
  state.anggota.forEach((ang) => {
    if (ang.Status_Aktif === 'Aktif') {
      let tr = `<tr><td style="text-align:center;">${index++}</td><td style="text-align:left;padding-left:8px;">${escapeHtml(ang.Nama_Anggota)}</td>`;
      NAMA_BULAN.forEach((bulan, idx) => {
        const monthKey = `${(idx + 1).toString().padStart(2, '0')}-${currentRekapYear}`;
        if (skipSet.has(monthKey)) {
          tr += '<td style="text-align:center;color:#999;">-</td>';
        } else if (mapPembayaran[`${ang.ID_Anggota}_${bulan}`]) {
          monthTotals[idx]++;
          tr += '<td style="text-align:center;color:#059669;font-weight:700;">&#10003;</td>';
        } else {
          tr += '<td style="text-align:center;"></td>';
        }
      });
      tbodyHTML += tr + '</tr>';
    }
  });

  const totalsRow = `<tr style="background:#f1f5f9;font-weight:700;"><td colspan="2" style="text-align:left;padding-left:8px;">Jumlah Lunas / Bulan</td>${monthTotals.map((n) => `<td style="text-align:center;">${n}</td>`).join('')}</tr>`;
  const skippedList = Array.from(skipSet)
    .filter((k) => k.endsWith(`-${currentRekapYear}`))
    .map((k) => NAMA_BULAN[parseInt(k.split('-')[0], 10) - 1])
    .join(', ');
  const skippedNote = skippedList ? `<p style="text-align:center;color:#555;font-size:12px;margin-top:8px;">Bulan libur (${currentRekapYear}): <b>${escapeHtml(skippedList)}</b></p>` : '';

  const html = `<html><head><title>Laporan Rekap Iuran ${currentRekapYear}</title><style>body{font-family:'Segoe UI',sans-serif;padding:20px;color:#111}h2{text-align:center;margin-bottom:5px}p{text-align:center;margin-top:0;color:#555;font-size:14px;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #aaa;padding:8px 4px}th{background-color:#eee;text-transform:uppercase;font-size:11px;text-align:center}@media print{@page{size:landscape;margin:15mm}}</style></head><body><h2>Laporan Rekap Iuran Anggota</h2><p>Tahun: <b>${currentRekapYear}</b> | Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p><table><thead><tr><th style="width:30px;">No</th><th style="text-align:left;padding-left:8px;width:180px;">Nama Anggota</th><th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>Mei</th><th>Jun</th><th>Jul</th><th>Agu</th><th>Sep</th><th>Okt</th><th>Nov</th><th>Des</th></tr></thead><tbody>${tbodyHTML}${totalsRow}</tbody></table>${skippedNote}<p style="text-align:center;color:#777;font-size:11px;margin-top:10px;">Keterangan: &#10003; = Lunas &nbsp;|&nbsp; - = Bulan libur (tidak dihitung tunggakan)</p><div style="margin-top:50px;text-align:right;padding-right:60px;"><p style="text-align:right;color:#111;">Mengetahui,</p><br><br><br><p style="text-align:right;color:#111;"><b>Pengurus Kas</b></p></div></body></html>`;

  const pw = window.open('', '_blank');
  pw.document.write(html);
  pw.document.close();
  pw.focus();
  setTimeout(() => { pw.print(); pw.close(); }, 500);
};

/* ══════════════════════════════════════════════════════════════════
   MONTHLY RECAP FOR WHATSAPP
   ══════════════════════════════════════════════════════════════════ */

const copyMonthlyRecap = async () => {
  const state = getState();
  const now = new Date();
  const bulan = NAMA_BULAN[now.getMonth()];
  const tahun = now.getFullYear();
  const monthKey = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${tahun}`;
  const isSkipped = (state.skippedMonths || []).includes(monthKey);

  const inMonth = (t) => {
    const d = new Date(t.Timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === tahun;
  };

  const masuk = state.transaksi.filter((t) => t.Tipe_Arus === 'Masuk' && inMonth(t)).reduce((s, t) => s + (Number(t.Nominal) || 0), 0);
  const keluar = state.transaksi.filter((t) => t.Tipe_Arus === 'Keluar' && inMonth(t)).reduce((s, t) => s + (Number(t.Nominal) || 0), 0);
  const totalMasuk = state.transaksi.filter((t) => t.Tipe_Arus === 'Masuk').reduce((s, t) => s + (Number(t.Nominal) || 0), 0);
  const totalKeluar = state.transaksi.filter((t) => t.Tipe_Arus === 'Keluar').reduce((s, t) => s + (Number(t.Nominal) || 0), 0);

  const paidSet = new Set(
    state.transaksi
      .filter((t) => t.Tipe_Arus === 'Masuk' && t.Bulan_Iuran === bulan && String(t.Tahun_Iuran) === String(tahun) && t.ID_Anggota !== '-')
      .map((t) => t.ID_Anggota)
  );
  const active = state.anggota.filter((a) => a.Status_Aktif === 'Aktif');
  const belum = active.filter((a) => !paidSet.has(a.ID_Anggota)).map((a) => a.Nama_Anggota);

  const lines = [
    `*Rekap Kas ${bulan} ${tahun}*`,
    `Masuk: ${formatRp(masuk)} (${paidSet.size}/${active.length} anggota)`,
    `Keluar: ${formatRp(keluar)}`,
    `Saldo kas: ${formatRp(totalMasuk - totalKeluar)}`
  ];
  if (isSkipped) {
    lines.push('(Bulan libur — tidak ada iuran)');
  } else if (belum.length > 0) {
    lines.push(`Belum bayar: ${belum.join(', ')}`);
  } else {
    lines.push('Semua anggota sudah lunas. Terima kasih!');
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast('Rekap bulanan disalin! Tempel di grup WA.', 'success');
    closeModal('modal-export');
  } catch (err) {
    showToast('Gagal menyalin. Izinkan akses clipboard.', 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════
    CSV EXPORT
   ══════════════════════════════════════════════════════════════════ */

const exportToCSV = () => {
  const state = getState();
  if (state.transaksi.length === 0) return showToast('Tidak ada data untuk diunduh', 'error');
  closeModal('modal-export');

  const q = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const header = ['ID Transaksi', 'Waktu', 'Tipe Arus', 'Kategori', 'Anggota', 'Bulan Iuran', 'Tahun Iuran', 'Nominal', 'Keterangan'];
  const lines = [header.map(q).join(';')];

  [...state.transaksi]
    .sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))
    .forEach((row) => {
      const waktu = new Date(row.Timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const kat = state.kategori.find((k) => k.ID_Kategori === row.ID_Kategori);
      const ang = row.ID_Anggota && row.ID_Anggota !== '-' ? state.anggota.find((a) => a.ID_Anggota === row.ID_Anggota) : null;
      lines.push([
        row.ID_Transaksi,
        waktu,
        row.Tipe_Arus,
        kat ? kat.Nama_Kategori : (row.ID_Kategori || '-'),
        ang ? ang.Nama_Anggota : '-',
        row.Bulan_Iuran || '-',
        row.Tahun_Iuran || '-',
        row.Nominal,
        row.Keterangan || ''
      ].map(q).join(';'));
    });

  // BOM (\uFEFF) agar Excel membaca UTF-8 dengan benar; ';' sesuai locale Excel Indonesia
  const blob = '\uFEFF' + lines.join('\r\n');
  const link = document.createElement('a');
  link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(blob));
  link.setAttribute('download', `Laporan_Kas_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('File Excel (CSV) diunduh!');
};

/* ══════════════════════════════════════════════════════════════════
   WHATSAPP REMINDER MESSAGE
   ══════════════════════════════════════════════════════════════════ */

const createGroupReminderMessage = async () => {
  const startYear = GROUP_START_YEAR;
  const startMonth = GROUP_START_MONTH;
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  const monthlyFee = DEFAULT_MONTHLY_FEE;

  const monthsRange = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    monthsRange.push(`${m.toString().padStart(2, '0')}-${y}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }

  const monthsSet = new Set(monthsRange);
  const skippedSet = new Set(getState().skippedMonths || []);
  const skippedNames = monthsRange.filter((k) => skippedSet.has(k)).map((k) => NAMA_BULAN[parseInt(k.split('-')[0], 10) - 1]);

  const trxByMember = {};
  getState().transaksi.forEach((t) => {
    if (!t.ID_Anggota) return;
    trxByMember[t.ID_Anggota] = trxByMember[t.ID_Anggota] || [];
    trxByMember[t.ID_Anggota].push(t);
  });

  const results = [];
  getState().anggota
    .filter((a) => a.Status_Aktif === 'Aktif')
    .sort((a, b) => a.Nama_Anggota.localeCompare(b.Nama_Anggota))
    .forEach((ang) => {
      let expectedTotal = 0;
      monthsRange.forEach((k) => { if (!skippedSet.has(k)) expectedTotal += monthlyFee; });
      let paidTotal = 0;
      (trxByMember[ang.ID_Anggota] || []).forEach((t) => {
        if (t.Tipe_Arus !== 'Masuk' || !t.Tahun_Iuran || !t.Bulan_Iuran) return;
        const idx = NAMA_BULAN.indexOf(t.Bulan_Iuran);
        if (idx === -1) return;
        const key = `${(idx + 1).toString().padStart(2, '0')}-${t.Tahun_Iuran}`;
        if (monthsSet.has(key)) paidTotal += Number(t.Nominal) || 0;
      });
      const arrears = expectedTotal - paidTotal;
      if (arrears > 0) {
        results.push({ name: ang.Nama_Anggota, unpaidMonths: Math.floor(arrears / monthlyFee), amountRp: formatRp(arrears) });
      }
    });

  if (results.length === 0) return showToast('Semua iuran sudah lunas untuk periode ini.', 'success');

  const endMonthName = NAMA_BULAN[endMonth - 1];
  const header = `Halo teman-teman, pengingat uang kas kelas sampai bulan ${endMonthName} ${endYear} ya! \u{1F4B8}`;
  let skippedNote = '';
  if (skippedNames.length > 0) {
    const uniq = Array.from(new Set(skippedNames));
    const last = uniq.pop();
    skippedNote = `(Catatan: Kas bulan ${uniq.length ? uniq.join(', ') + ' dan ' : ''}${last} libur)`;
  }
  const lines = results.map((r, i) => `${i + 1}. ${r.name} - ${r.amountRp} (kurang ${r.unpaidMonths} bulan)`);
  const parts = [header];
  if (skippedNote) parts.push(skippedNote);
  parts.push('Berikut daftar yang masih ada tunggakan:\n');
  parts.push(lines.join('\n'));
  parts.push('\nYuk segera dilunasin ke bendahara! Terima kasih \u{1F64F}');

  try {
    await navigator.clipboard.writeText(parts.join('\n'));
    alert('Message copied successfully! Please paste it in the Class WA Group.');
    showToast('Pesan berhasil disalin ke clipboard.', 'success');
  } catch (err) {
    console.error('copy failed', err);
    showToast('Gagal menyalin pesan. Silakan izinkan akses clipboard.', 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════
   INIT APP
   ══════════════════════════════════════════════════════════════════ */

let isLoading = false;

const initApp = async () => {
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
});
