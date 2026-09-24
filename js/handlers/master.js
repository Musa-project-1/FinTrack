import { getState, getIsAdminSession } from "../core/state.js";
import { postToBackend, fetchAuditLogApi } from "../core/api.js";
import { queueOfflinePayload, isUnsyncedTempId } from "../core/offline.js";
import { showToast, showDatabaseToast, escapeHtml, isOnline } from "../core/utils.js";
import { openModal, closeModal, switchTab, showConfirmDialog } from "../ui/modal.js";
import { renderSkippedMonthsList } from "../render.js";
const refreshAppData = async () => { if (window.__initApp) await window.__initApp(); };

/** Temporary id for an optimistic master row until the server confirms it. */
const tempMasterId = (prefix) => {
  const rand = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);
  return `${prefix}-TEMP-${rand.toUpperCase()}`;
};

/**
 * Deliver a master-data mutation, queueing it when the device is offline or the
 * request never reaches the server. Mirrors the transaction handler's
 * `deliverMutation` so master edits are as offline-resilient as iuran entry.
 *
 * @param {object} payload Must carry a server write `action`.
 * @returns {Promise<{delivered: boolean, result: object|null}>}
 */
const deliverMutation = async (payload) => {
  if (!isOnline()) {
    await queueOfflinePayload(payload);
    return { delivered: false, result: null };
  }
  const result = await postToBackend(payload);
  if (!result) {
    await queueOfflinePayload(payload);
    return { delivered: false, result: null };
  }
  return { delivered: true, result };
};

export const openSkippedMonthsModal = () => {
  openKelolaMasterModal();
  switchTab('tab-master-skipped', 'modal-kelola-master');
};

/* ══════════════════════════════════════════════════════════════════
   AUDIT LOG
   ══════════════════════════════════════════════════════════════════ */

/**
 * Human-readable labels for every audit action the server can record.
 * An unknown action falls back to its raw tag (see renderAuditLogList).
 */
export const AUDIT_ACTION_LABELS = {
  // Sessions & access
  LOGIN_ADMIN:              { label: 'Login Admin', color: 'var(--primary)' },
  LOGIN_GAGAL:              { label: 'Login Gagal', color: 'var(--danger)' },
  LOGIN_SUPERADMIN_GOOGLE:  { label: 'Login Google', color: 'var(--primary)' },
  LOGOUT_ADMIN:             { label: 'Logout', color: '#64748b' },
  PIN_BENAR:                { label: 'PIN Benar', color: '#64748b' },
  PIN_SALAH:                { label: 'PIN Salah', color: 'var(--danger)' },
  PIN_TIDAK_DISETEL:        { label: 'Tanpa PIN', color: 'var(--warning)' },

  // Transactions
  TAMBAH_TRANSAKSI:         { label: 'Tambah Transaksi', color: 'var(--primary)' },
  TAMBAH_IURAN_MASSAL:      { label: 'Iuran Massal', color: 'var(--primary)' },
  EDIT_TRANSAKSI:           { label: 'Edit Transaksi', color: 'var(--warning)' },
  HAPUS_TRANSAKSI:          { label: 'Hapus Transaksi', color: 'var(--danger)' },
  DUPLIKAT_DITOLAK:         { label: 'Duplikat Ditolak', color: 'var(--danger)' },
  OFFLINE_SYNC:             { label: 'Sinkron Offline', color: '#64748b' },

  // Master data
  TAMBAH_ANGGOTA:           { label: 'Tambah Anggota', color: 'var(--primary)' },
  HAPUS_ANGGOTA:            { label: 'Hapus Anggota', color: 'var(--danger)' },
  STATUS_ANGGOTA:           { label: 'Status Anggota', color: 'var(--warning)' },
  TAMBAH_KATEGORI:          { label: 'Tambah Kategori', color: 'var(--primary)' },
  HAPUS_KATEGORI:           { label: 'Hapus Kategori', color: 'var(--danger)' },
  TAMBAH_BULAN_LIBUR:       { label: 'Bulan Libur +', color: 'var(--warning)' },
  HAPUS_BULAN_LIBUR:        { label: 'Bulan Libur -', color: 'var(--warning)' },

  // Backup
  BACKUP_DATABASE:          { label: 'Backup', color: '#64748b' },
  RESTORE_DATABASE:         { label: 'Restore', color: 'var(--warning)' },

  // Group administration
  BUAT_GRUP:                { label: 'Buat Grup', color: 'var(--primary)' },
  HAPUS_GRUP:               { label: 'Hapus Grup', color: 'var(--danger)' },
  UBAH_NAMA:                { label: 'Ubah Nama', color: 'var(--warning)' },
  UBAH_PIN:                 { label: 'Ubah PIN', color: 'var(--warning)' },
  UBAH_KREDENSIAL_ADMIN:    { label: 'Ubah Admin', color: 'var(--warning)' },
  TAMBAH_SUPERADMIN:        { label: 'Super Admin +', color: 'var(--primary)' },
  HAPUS_SUPERADMIN:         { label: 'Super Admin -', color: 'var(--danger)' }
};

export const renderAuditLogList = async () => {
  const tbody = document.getElementById('audit-log-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" class="td-muted-center">Memuat...</td></tr>';

  const res = await fetchAuditLogApi();
  if (!res || !res.status) {
    tbody.innerHTML = `<tr><td colspan="3" class="td-muted-center text-danger">${escapeHtml(res?.message || 'Gagal memuat log.')}</td></tr>`;
    return;
  }

  const log = res.data?.log || [];
  if (log.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="td-muted-center">Belum ada aktivitas tercatat.</td></tr>';
    return;
  }

  tbody.innerHTML = log.map((entry) => {
    const meta = AUDIT_ACTION_LABELS[entry.Aksi] || { label: entry.Aksi, color: 'var(--text-main)' };
    const tgl = new Date(entry.Timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <tr>
        <td class="td-audit-time">${escapeHtml(tgl)}</td>
        <td class="ws-nowrap"><span class="audit-action-tag" style="color:${meta.color};">${escapeHtml(meta.label)}</span></td>
        <td class="td-audit-detail">${escapeHtml(String(entry.Detail || ''))}</td>
      </tr>
    `;
  }).join('');
};

export const openAuditLogModal = () => {
  openModal('modal-audit-log');
  renderAuditLogList();
};

export const addSkippedMonth = async () => {
  const el = document.getElementById('input-skip-month');
  if (!el || !el.value) return showToast('Pilih bulan terlebih dahulu.', 'error');
  const parts = el.value.split('-');
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return showToast('Format bulan salah.', 'error');
  const key = `${parts[1].padStart(2, '0')}-${parts[0]}`;

  showConfirmDialog({
    title: 'Tetapkan Bulan Libur?',
    message: `Anggota akan dibebaskan dari kewajiban iuran untuk bulan ${key}. Simpan ke database?`,
    icon: 'ph-fill ph-calendar-x',
    badgeClass: 'warning',
    confirmText: 'Ya, Tetapkan Libur',
    onConfirm: async () => {
      const { delivered, result } = await deliverMutation({ action: 'addSkippedMonth', month: key });
      const state = getState();
      if (!delivered) {
        // Offline — queued. Reflect locally (server op is idempotent on replay).
        if (!state.skippedMonths.includes(key)) state.skippedMonths = state.skippedMonths.concat([key]);
        renderSkippedMonthsList();
        showDatabaseToast('Bulan Libur Ditetapkan (Offline)', `Bulan ${key} akan disinkronkan saat online.`);
        return;
      }
      if (result.status) {
        state.skippedMonths = result.data?.skippedMonths || state.skippedMonths.concat([key]);
        renderSkippedMonthsList();
        showDatabaseToast('Bulan Libur Ditetapkan', `Bulan ${key} dibebaskan dari iuran.`);
      } else {
        showToast(result.message || 'Gagal menambahkan bulan libur.', 'error');
      }
    }
  });
};

export const removeSkippedMonth = async (key) => {
  if (!key || typeof key !== 'string' || !/^\d{2}-\d{4}$/.test(key)) {
    return showToast('Format bulan libur tidak valid.', 'error');
  }

  showConfirmDialog({
    title: 'Hapus Bulan Libur?',
    message: `Kewajiban iuran untuk bulan ${key} akan diaktifkan kembali. Simpan perubahan ke database?`,
    icon: 'ph-fill ph-calendar-check',
    confirmText: 'Ya, Aktifkan Kembali',
    onConfirm: async () => {
      const { delivered, result } = await deliverMutation({ action: 'removeSkippedMonth', month: key });
      const state = getState();
      if (!delivered) {
        state.skippedMonths = state.skippedMonths.filter((s) => s !== key);
        renderSkippedMonthsList();
        showDatabaseToast('Bulan Libur Dicabut (Offline)', `Bulan ${key} akan disinkronkan saat online.`);
        return;
      }
      if (result.status) {
        state.skippedMonths = result.data?.skippedMonths || state.skippedMonths.filter((s) => s !== key);
        renderSkippedMonthsList();
        showDatabaseToast('Bulan Libur Dicabut', `Bulan ${key} kembali aktif untuk penagihan.`);
      } else {
        showToast(result.message || 'Gagal menghapus bulan libur.', 'error');
      }
    }
  });
};

/* ══════════════════════════════════════════════════════════════════
   MASTER DATA CRUD (ANGGOTA & KATEGORI)
   ══════════════════════════════════════════════════════════════════ */

export const renderMasterAnggotaTable = () => {
  const tbody = document.getElementById('master-anggota-tbody');
  if (!tbody) return;
  const anggota = getState().anggota || [];
  if (anggota.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="td-muted-center">Belum ada anggota terdaftar.</td></tr>';
    return;
  }
  tbody.innerHTML = anggota.map((ang) => {
    const isAktif = ang.Status_Aktif === 'Aktif';
    const statusBadge = isAktif
      ? '<span class="badge badge-masuk"><i class="ph-bold ph-check"></i> Aktif</span>'
      : '<span class="badge badge-keluar"><i class="ph-bold ph-x"></i> Nonaktif</span>';
    const rawWa = (ang.Nomor_WA || '').trim();
    const cleanWa = rawWa.replace(/\D/g, '');
    const waDisplay = cleanWa
      ? `<a href="https://wa.me/${cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa}" target="_blank" rel="noopener" class="master-wa-link" title="Chat WhatsApp"><i class="ph-fill ph-whatsapp-logo"></i> <span>${escapeHtml(rawWa)}</span></a>`
      : '<span class="text-muted">-</span>';

    return `
      <tr class="master-row ${isAktif ? 'is-aktif' : 'is-nonaktif'}">
        <td class="td-id-col"><span class="master-id-pill">${escapeHtml(ang.ID_Anggota)}</span></td>
        <td class="td-name-col">
          <div class="master-name-wrap">
            <span class="master-mobile-id">${escapeHtml(ang.ID_Anggota)}</span>
            <span class="master-name-text">${escapeHtml(ang.Nama_Anggota)}</span>
          </div>
        </td>
        <td class="td-wa-col">${waDisplay}</td>
        <td class="td-status-col text-center">${statusBadge}</td>
        <td class="td-action-col">
          <div class="master-actions-wrap">
            <button class="btn btn-outline btn-master-action" data-action="edit-master-anggota" data-id="${escapeHtml(ang.ID_Anggota)}" title="Kelola Anggota">
              <i class="ph-bold ph-pencil-simple"></i> <span>Edit</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

export const renderMasterKategoriTable = () => {
  const tbody = document.getElementById('master-kategori-tbody');
  if (!tbody) return;
  const kategori = getState().kategori || [];
  if (kategori.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="td-muted-center">Belum ada kategori.</td></tr>';
    return;
  }
  tbody.innerHTML = kategori.map((kat) => {
    const isMasuk = kat.Tipe === 'Masuk';
    const badge = isMasuk
      ? '<span class="badge badge-masuk"><i class="ph-bold ph-arrow-down-left"></i> Masuk</span>'
      : '<span class="badge badge-keluar"><i class="ph-bold ph-arrow-up-right"></i> Keluar</span>';

    return `
      <tr class="master-row ${isMasuk ? 'is-masuk' : 'is-keluar'}">
        <td class="td-id-col"><span class="master-id-pill">${escapeHtml(kat.ID_Kategori)}</span></td>
        <td class="td-name-col">
          <div class="master-name-wrap">
            <span class="master-mobile-id">${escapeHtml(kat.ID_Kategori)}</span>
            <span class="master-name-text">${escapeHtml(kat.Nama_Kategori)}</span>
          </div>
        </td>
        <td class="td-status-col text-center">${badge}</td>
        <td class="td-action-col">
          <div class="master-actions-wrap">
            <button class="btn btn-outline btn-master-action" data-action="edit-master-kategori" data-id="${escapeHtml(kat.ID_Kategori)}" title="Kelola Kategori">
              <i class="ph-bold ph-pencil-simple"></i> <span>Edit</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

export const bukaModalEditMasterAnggota = (idAnggota) => {
  const ang = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
  if (!ang) return;

  const rawWa = (ang.Nomor_WA || '').trim();
  const cleanWa = rawWa.replace(/\D/g, '');

  const idInput = document.getElementById('edit-master-anggota-id');
  if (idInput) idInput.value = ang.ID_Anggota;

  const idBadge = document.getElementById('edit-master-anggota-id-badge');
  if (idBadge) idBadge.textContent = ang.ID_Anggota;

  const namaInput = document.getElementById('edit-master-nama-input');
  if (namaInput) namaInput.value = ang.Nama_Anggota;

  const waInput = document.getElementById('edit-master-wa-input');
  if (waInput) waInput.value = rawWa;

  const statusSelect = document.getElementById('edit-master-status-select');
  if (statusSelect) {
    statusSelect.value = ang.Status_Aktif || 'Aktif';
  }

  const waLink = document.getElementById('edit-master-anggota-wa-link');
  if (waLink) {
    if (cleanWa) {
      waLink.href = `https://wa.me/${cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa}`;
      waLink.style.display = 'inline-flex';
    } else {
      waLink.style.display = 'none';
    }
  }

  openModal('modal-edit-master-anggota');
};

export const submitEditMasterAnggota = async (e) => {
  e?.preventDefault?.();
  const idAnggota = (document.getElementById('edit-master-anggota-id')?.value || '').trim();
  const nama = (document.getElementById('edit-master-nama-input')?.value || '').trim();
  const noWa = (document.getElementById('edit-master-wa-input')?.value || '').trim();
  const statusAktif = document.getElementById('edit-master-status-select')?.value || 'Aktif';

  if (!idAnggota) return showToast('ID anggota tidak ditemukan.', 'error');
  if (!nama) return showToast('Nama anggota tidak boleh kosong.', 'error');
  if (nama.length < 2) return showToast('Nama anggota minimal 2 karakter.', 'error');

  // Optimistic row whose create has not synced yet — the server has no matching
  // document, so a queued edit can only fail as "not found". Block until synced.
  if (isUnsyncedTempId(idAnggota)) {
    return showToast('Anggota ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum mengeditnya.', 'warning');
  }

  const btn = document.getElementById('btn-submit-edit-anggota');
  if (btn) btn.disabled = true;

  const { delivered, result } = await deliverMutation({
    action: 'updateStatusAnggota',
    idAnggota,
    statusAktif,
    nama,
    noWa
  });

  if (btn) btn.disabled = false;

  if (!delivered) {
    // Offline — queued. Reflect locally so the table matches until sync.
    const ang = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
    if (ang) { ang.Nama_Anggota = nama; ang.Status_Aktif = statusAktif; ang.Nomor_WA = noWa; }
    showDatabaseToast('Perubahan Disimpan (Offline)', `Data ${nama} akan disinkronkan saat online.`);
    closeModal('modal-edit-master-anggota');
    renderMasterAnggotaTable();
    return;
  }

  if (result.status) {
    showDatabaseToast('Data Anggota Diperbarui', `Perubahan untuk ${nama} berhasil disimpan.`);
    closeModal('modal-edit-master-anggota');
    await refreshAppData();
    renderMasterAnggotaTable();
  } else {
    showToast(result.message || 'Gagal menyimpan perubahan anggota.', 'error');
  }
};

export const bukaModalEditMasterKategori = (idKategori) => {
  const kat = (getState().kategori || []).find((k) => k.ID_Kategori === idKategori);
  if (!kat) return;

  const isMasuk = kat.Tipe === 'Masuk';
  const idInput = document.getElementById('edit-master-kategori-id');
  if (idInput) idInput.value = kat.ID_Kategori;

  const idBadge = document.getElementById('edit-master-kategori-id-badge');
  if (idBadge) idBadge.textContent = kat.ID_Kategori;

  const namaEl = document.getElementById('edit-master-kategori-nama');
  if (namaEl) namaEl.textContent = kat.Nama_Kategori;

  const tipeBadge = document.getElementById('edit-master-kategori-tipe-badge');
  if (tipeBadge) {
    tipeBadge.className = `badge ${isMasuk ? 'badge-masuk' : 'badge-keluar'}`;
    tipeBadge.innerHTML = `<i class="ph-bold ${isMasuk ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}"></i> Kas ${kat.Tipe}`;
  }

  openModal('modal-edit-master-kategori');
};

export const openKelolaMasterModal = () => {
  if (!getIsAdminSession()) {
    showToast('Hanya admin yang dapat mengakses menu ini.', 'error');
    openModal('modal-login');
    return;
  }
  renderMasterAnggotaTable();
  renderMasterKategoriTable();
  renderSkippedMonthsList();
  openModal('modal-kelola-master');
};

export const submitTambahAnggota = async (e) => {
  e.preventDefault();
  const nama = (document.getElementById('input-nama-anggota')?.value || '').trim();
  const noWa = (document.getElementById('input-wa-anggota')?.value || '').trim();
  if (!nama) return showToast('Nama anggota tidak boleh kosong.', 'error');
  if (nama.length < 2) return showToast('Nama anggota minimal 2 karakter.', 'error');

  showConfirmDialog({
    title: 'Tambah Anggota Baru?',
    message: `Daftarkan ${nama} ke daftar anggota kas grup?`,
    icon: 'ph-fill ph-user-plus',
    confirmText: 'Ya, Daftarkan',
    onConfirm: async () => {
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      const { delivered, result } = await deliverMutation({ action: 'tambahAnggota', nama, noWa });
      if (btn) btn.disabled = false;

      if (!delivered) {
        // Offline — queued. Show an optimistic row with a temp id; the next
        // online refetch replaces it with the server record.
        getState().anggota.push({ ID_Anggota: tempMasterId('ANG'), Nama_Anggota: nama, Nomor_WA: noWa, Status_Aktif: 'Aktif' });
        document.getElementById('input-nama-anggota').value = '';
        document.getElementById('input-wa-anggota').value = '';
        showDatabaseToast('Anggota Disimpan (Offline)', `${nama} akan disinkronkan saat online.`);
        renderMasterAnggotaTable();
        return;
      }

      if (result.status) {
        showDatabaseToast('Anggota Baru Ditambahkan', `Anggota ${nama} berhasil didaftarkan ke database.`);
        document.getElementById('input-nama-anggota').value = '';
        document.getElementById('input-wa-anggota').value = '';
        await refreshAppData();
        renderMasterAnggotaTable();
      } else {
        showToast(result.message || 'Gagal menambah anggota.', 'error');
      }
    }
  });
};

export const toggleStatusAnggotaAction = async (idAnggota, nextStatus) => {
  if (!idAnggota || !['Aktif', 'Nonaktif'].includes(nextStatus)) {
    return showToast('Parameter status anggota tidak valid.', 'error');
  }
  const ang = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
  const angName = ang?.Nama_Anggota || 'Anggota';

  if (isUnsyncedTempId(idAnggota)) {
    return showToast('Anggota ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum mengubah statusnya.', 'warning');
  }

  showConfirmDialog({
    title: 'Ubah Status Anggota?',
    message: `Ubah status ${angName} menjadi "${nextStatus}"? Anggota nonaktif tidak akan dimasukkan ke penagihan iuran aktif.`,
    icon: nextStatus === 'Aktif' ? 'ph-fill ph-user-check' : 'ph-fill ph-user-minus',
    badgeClass: nextStatus === 'Aktif' ? '' : 'warning',
    confirmText: 'Ya, Ubah Status',
    onConfirm: async () => {
      const { delivered, result } = await deliverMutation({ action: 'updateStatusAnggota', idAnggota, statusAktif: nextStatus });
      if (!delivered) {
        const target = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
        if (target) target.Status_Aktif = nextStatus;
        showDatabaseToast('Status Disimpan (Offline)', `Status ${angName} akan disinkronkan saat online.`);
        renderMasterAnggotaTable();
        return;
      }
      if (result.status) {
        showDatabaseToast('Status Anggota Diperbarui', `Status ${angName} berhasil diubah ke ${nextStatus}.`);
        await refreshAppData();
        renderMasterAnggotaTable();
      } else {
        showToast(result.message || 'Gagal mengubah status anggota.', 'error');
      }
    }
  });
};

export const hapusMasterAnggotaAction = async (idAnggota) => {
  if (!idAnggota) return showToast('ID anggota tidak valid.', 'error');
  const ang = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
  const angName = ang?.Nama_Anggota || 'Anggota';

  if (isUnsyncedTempId(idAnggota)) {
    return showToast('Anggota ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum menghapusnya.', 'warning');
  }

  showConfirmDialog({
    title: 'Hapus Anggota?',
    message: `Data ${angName} akan dihapus permanen dari master anggota grup. Riwayat transaksi lama tetap tersimpan. Lanjutkan?`,
    icon: 'ph-bold ph-trash',
    badgeClass: 'danger',
    confirmText: 'Ya, Hapus Anggota',
    confirmClass: 'btn-danger-solid',
    onConfirm: async () => {
      const { delivered, result } = await deliverMutation({ action: 'hapusAnggota', idAnggota });
      if (!delivered) {
        // Offline — queued. Remove locally; if the server later rejects it
        // (e.g. transactions still reference this member), the offline-sync
        // reconciliation surfaces that and the next refetch restores the row.
        const arr = getState().anggota;
        const idx = arr.findIndex((a) => a.ID_Anggota === idAnggota);
        if (idx !== -1) arr.splice(idx, 1);
        showDatabaseToast('Penghapusan Disimpan (Offline)', `${angName} akan dihapus saat online.`);
        renderMasterAnggotaTable();
        return;
      }
      if (result.status) {
        showDatabaseToast('Anggota Dihapus', `${angName} berhasil dihapus dari database.`);
        await refreshAppData();
        renderMasterAnggotaTable();
      } else {
        showToast(result.message || 'Gagal menghapus anggota.', 'error');
      }
    }
  });
};

export const submitTambahKategori = async (e) => {
  e.preventDefault();
  const tipe = document.getElementById('input-tipe-kategori')?.value;
  const nama = (document.getElementById('input-nama-kategori')?.value || '').trim();
  if (!['Masuk', 'Keluar'].includes(tipe)) return showToast('Pilih tipe kategori yang valid.', 'error');
  if (!nama) return showToast('Nama kategori tidak boleh kosong.', 'error');

  showConfirmDialog({
    title: 'Tambah Kategori Kas?',
    message: `Simpan kategori baru "${nama}" (${tipe}) ke database kas?`,
    icon: 'ph-fill ph-tag',
    confirmText: 'Ya, Simpan Kategori',
    onConfirm: async () => {
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      const { delivered, result } = await deliverMutation({ action: 'tambahKategori', nama, tipe });
      if (btn) btn.disabled = false;

      if (!delivered) {
        // Offline — queued. Optimistic row with a temp id; reconciled on refetch.
        getState().kategori.push({ ID_Kategori: tempMasterId(tipe === 'Masuk' ? 'KAT-M' : 'KAT-K'), Nama_Kategori: nama, Tipe: tipe });
        document.getElementById('input-nama-kategori').value = '';
        showDatabaseToast('Kategori Disimpan (Offline)', `Kategori "${nama}" akan disinkronkan saat online.`);
        renderMasterKategoriTable();
        return;
      }

      if (result.status) {
        showDatabaseToast('Kategori Kas Ditambahkan', `Kategori "${nama}" (${tipe}) berhasil disimpan.`);
        document.getElementById('input-nama-kategori').value = '';
        await refreshAppData();
        renderMasterKategoriTable();
      } else {
        showToast(result.message || 'Gagal menambah kategori.', 'error');
      }
    }
  });
};

export const hapusMasterKategoriAction = async (idKategori) => {
  if (!idKategori) return showToast('ID kategori tidak valid.', 'error');
  const kat = (getState().kategori || []).find((k) => k.ID_Kategori === idKategori);
  const katName = kat?.Nama_Kategori || 'Kategori';

  if (isUnsyncedTempId(idKategori)) {
    return showToast('Kategori ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum menghapusnya.', 'warning');
  }

  showConfirmDialog({
    title: 'Hapus Kategori?',
    message: `Kategori "${katName}" akan dihapus dari pilihan transaksi kas. Lanjutkan?`,
    icon: 'ph-bold ph-trash',
    badgeClass: 'danger',
    confirmText: 'Ya, Hapus Kategori',
    confirmClass: 'btn-danger-solid',
    onConfirm: async () => {
      const { delivered, result } = await deliverMutation({ action: 'hapusKategori', idKategori });
      if (!delivered) {
        const arr = getState().kategori;
        const idx = arr.findIndex((k) => k.ID_Kategori === idKategori);
        if (idx !== -1) arr.splice(idx, 1);
        showDatabaseToast('Penghapusan Disimpan (Offline)', `Kategori "${katName}" akan dihapus saat online.`);
        renderMasterKategoriTable();
        return;
      }
      if (result.status) {
        showDatabaseToast('Kategori Dihapus', `Kategori "${katName}" berhasil dihapus.`);
        await refreshAppData();
        renderMasterKategoriTable();
      } else {
        showToast(result.message || 'Gagal menghapus kategori.', 'error');
      }
    }
  });
};
