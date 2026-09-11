import { NAMA_BULAN } from "../core/config.js";
import { getState, setState, saveCache, getIsAdminSession } from "../core/state.js";
import { sendAdminPayload, fetchAuditLogApi } from "../core/api.js";
import { showToast, showDatabaseToast, escapeHtml } from "../core/utils.js";
import { openModal, closeModal, switchTab, showConfirmDialog } from "../ui/modal.js";
import { renderAll, renderSkippedMonthsList } from "../render.js";
const refreshAppData = async () => { if (window.__initApp) await window.__initApp(); };

export const openSkippedMonthsModal = () => {
  openKelolaMasterModal();
  switchTab('tab-master-skipped', 'modal-kelola-master');
};

/* ══════════════════════════════════════════════════════════════════
   AUDIT LOG
   ══════════════════════════════════════════════════════════════════ */

export const AUDIT_ACTION_LABELS = {
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
      const res = await sendAdminPayload({ action: 'addSkippedMonth', month: key });
      if (!res) return showToast('Gagal terhubung ke server.', 'error');
      if (res.status) {
        const state = getState();
        state.skippedMonths = res.data?.skippedMonths || state.skippedMonths.concat([key]);
        renderSkippedMonthsList();
        showDatabaseToast('Bulan Libur Ditetapkan', `Bulan ${key} dibebaskan dari iuran.`);
      } else {
        showToast(res.message || 'Gagal menambahkan bulan libur.', 'error');
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
      const res = await sendAdminPayload({ action: 'removeSkippedMonth', month: key });
      if (!res) return showToast('Gagal terhubung ke server.', 'error');
      if (res.status) {
        const state = getState();
        state.skippedMonths = res.data?.skippedMonths || state.skippedMonths.filter((s) => s !== key);
        renderSkippedMonthsList();
        showDatabaseToast('Bulan Libur Dicabut', `Bulan ${key} kembali aktif untuk penagihan.`);
      } else {
        showToast(res.message || 'Gagal menghapus bulan libur.', 'error');
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
    const toggleBtnLabel = isAktif ? 'Nonaktifkan' : 'Aktifkan';
    const toggleIcon = isAktif ? 'ph-user-minus' : 'ph-user-check';
    const nextStatus = isAktif ? 'Nonaktif' : 'Aktif';
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
            <button class="btn btn-outline btn-master-action" data-action="toggle-status-anggota" data-id="${escapeHtml(ang.ID_Anggota)}" data-status="${nextStatus}">
              <i class="ph-bold ${toggleIcon}"></i> <span>${toggleBtnLabel}</span>
            </button>
            <button class="btn btn-danger-outline btn-master-action btn-master-delete" data-action="hapus-master-anggota" data-id="${escapeHtml(ang.ID_Anggota)}" title="Hapus Anggota" aria-label="Hapus Anggota">
              <i class="ph-bold ph-trash"></i>
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
            <button class="btn btn-danger-outline btn-master-action btn-master-delete" data-action="hapus-master-kategori" data-id="${escapeHtml(kat.ID_Kategori)}" title="Hapus Kategori">
              <i class="ph-bold ph-trash"></i> <span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
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
      const res = await sendAdminPayload({ action: 'tambahAnggota', nama, noWa });
      if (btn) btn.disabled = false;

      if (res && res.status) {
        showDatabaseToast('Anggota Baru Ditambahkan', `Anggota ${nama} berhasil didaftarkan ke database.`);
        document.getElementById('input-nama-anggota').value = '';
        document.getElementById('input-wa-anggota').value = '';
        await refreshAppData();
        renderMasterAnggotaTable();
      } else {
        showToast(res?.message || 'Gagal menambah anggota.', 'error');
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

  showConfirmDialog({
    title: 'Ubah Status Anggota?',
    message: `Ubah status ${angName} menjadi "${nextStatus}"? Anggota nonaktif tidak akan dimasukkan ke penagihan iuran aktif.`,
    icon: nextStatus === 'Aktif' ? 'ph-fill ph-user-check' : 'ph-fill ph-user-minus',
    badgeClass: nextStatus === 'Aktif' ? '' : 'warning',
    confirmText: 'Ya, Ubah Status',
    onConfirm: async () => {
      const res = await sendAdminPayload({ action: 'updateStatusAnggota', idAnggota, statusAktif: nextStatus });
      if (res && res.status) {
        showDatabaseToast('Status Anggota Diperbarui', `Status ${angName} berhasil diubah ke ${nextStatus}.`);
        await refreshAppData();
        renderMasterAnggotaTable();
      } else {
        showToast(res?.message || 'Gagal mengubah status anggota.', 'error');
      }
    }
  });
};

export const hapusMasterAnggotaAction = async (idAnggota) => {
  if (!idAnggota) return showToast('ID anggota tidak valid.', 'error');
  const ang = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
  const angName = ang?.Nama_Anggota || 'Anggota';

  showConfirmDialog({
    title: 'Hapus Anggota?',
    message: `Data ${angName} akan dihapus permanen dari master anggota grup. Riwayat transaksi lama tetap tersimpan. Lanjutkan?`,
    icon: 'ph-bold ph-trash',
    badgeClass: 'danger',
    confirmText: 'Ya, Hapus Anggota',
    confirmClass: 'btn-danger-solid',
    onConfirm: async () => {
      const res = await sendAdminPayload({ action: 'hapusAnggota', idAnggota });
      if (res && res.status) {
        showDatabaseToast('Anggota Dihapus', `${angName} berhasil dihapus dari database.`);
        await refreshAppData();
        renderMasterAnggotaTable();
      } else {
        showToast(res?.message || 'Gagal menghapus anggota.', 'error');
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
      const res = await sendAdminPayload({ action: 'tambahKategori', nama, tipe });
      if (btn) btn.disabled = false;

      if (res && res.status) {
        showDatabaseToast('Kategori Kas Ditambahkan', `Kategori "${nama}" (${tipe}) berhasil disimpan.`);
        document.getElementById('input-nama-kategori').value = '';
        await refreshAppData();
        renderMasterKategoriTable();
      } else {
        showToast(res?.message || 'Gagal menambah kategori.', 'error');
      }
    }
  });
};

export const hapusMasterKategoriAction = async (idKategori) => {
  if (!idKategori) return showToast('ID kategori tidak valid.', 'error');
  const kat = (getState().kategori || []).find((k) => k.ID_Kategori === idKategori);
  const katName = kat?.Nama_Kategori || 'Kategori';

  showConfirmDialog({
    title: 'Hapus Kategori?',
    message: `Kategori "${katName}" akan dihapus dari pilihan transaksi kas. Lanjutkan?`,
    icon: 'ph-bold ph-trash',
    badgeClass: 'danger',
    confirmText: 'Ya, Hapus Kategori',
    confirmClass: 'btn-danger-solid',
    onConfirm: async () => {
      const res = await sendAdminPayload({ action: 'hapusKategori', idKategori });
      if (res && res.status) {
        showDatabaseToast('Kategori Dihapus', `Kategori "${katName}" berhasil dihapus.`);
        await refreshAppData();
        renderMasterKategoriTable();
      } else {
        showToast(res?.message || 'Gagal menghapus kategori.', 'error');
      }
    }
  });
};

/* ══════════════════════════════════════════════════════════════════
   OFFLINE QUEUE UI
   ══════════════════════════════════════════════════════════════════ */

