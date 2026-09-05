import { NAMA_BULAN, DEFAULT_MONTHLY_FEE } from "../config.js";
import { getState, setState, addTransaction, saveCache, getIsAdminSession } from "../state.js";
import { postToBackend, sendAdminPayload } from "../api.js";
import { formatRp, showToast, isOnline, getRawNominal, escapeHtml } from "../utils.js";
import { openOfflineDB, addOfflineTransaction, queueOfflinePayload } from "../offline.js";
import { openModal, closeModal, switchTab, resetChipAktif, renderCheckboxIuran } from "../modal.js";
import { renderAll, renderDashboard, renderTableTransaksi, renderTableRekap } from "../render.js";

export const openQuickPaySheet = (idAnggota, bulan) => {
  if (!idAnggota || !bulan) return;
  const ang = getState().anggota.find((a) => a.ID_Anggota === idAnggota);
  if (!ang) return showToast('Anggota tidak ditemukan.', 'error');

  document.getElementById('qp-id-anggota').value = idAnggota;
  document.getElementById('qp-bulan').value = bulan;
  document.getElementById('qp-tahun').value = currentRekapYear;
  document.getElementById('qp-nama').innerText = ang.Nama_Anggota;
  document.getElementById('qp-periode').innerText = `Iuran ${bulan} ${currentRekapYear}`;
  
  const avatar = document.getElementById('qp-avatar');
  const anggotaList = getState().anggota || [];
  const idx = anggotaList.findIndex((a) => a.ID_Anggota === idAnggota);
  const nomorUrut = idx !== -1 ? String(idx + 1).padStart(2, '0') : '01';
  avatar.innerText = nomorUrut;
  avatar.style.background = '';
  
  const nominalEl = document.getElementById('qp-nominal');
  nominalEl.value = new Intl.NumberFormat('id-ID').format(DEFAULT_MONTHLY_FEE);
  openModal('modal-quickpay');
};

export const submitQuickPay = async (e) => {
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

export const bukaModalTransaksi = () => {
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

export const submitIuran = async (e) => {
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

export const submitOperasional = async (e) => {
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

export const bukaModalEdit = (idTrx) => {
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

export const submitEditTransaksi = async (e) => {
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

export const konfirmasiHapus = (idTrx) => {
  document.getElementById('hapus-id-target').value = idTrx;
  document.getElementById('modal-hapus').style.zIndex = '110';
  openModal('modal-hapus');
};

export const eksekusiHapus = async () => {
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

