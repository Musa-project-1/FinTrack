import { NAMA_BULAN } from "../config.js";
import { getState, setState, saveCache } from "../state.js";
import { sendAdminPayload, fetchAuditLogApi } from "../api.js";
import { showToast, escapeHtml } from "../utils.js";
import { openModal, closeModal } from "../modal.js";
import { renderAll, renderSkippedMonthsList } from "../render.js";

export const openSkippedMonthsModal = () => {
  renderSkippedMonthsList();
  openModal('modal-skipped-months');
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

export const removeSkippedMonth = async (key) => {
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
   MASTER DATA CRUD (ANGGOTA & KATEGORI)
   ══════════════════════════════════════════════════════════════════ */

export const renderMasterAnggotaTable = () => {
  const tbody = document.getElementById('master-anggota-tbody');
  if (!tbody) return;
  const anggota = getState().anggota || [];
  if (anggota.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="td-muted-center">Belum ada anggota.</td></tr>';
    return;
  }
  tbody.innerHTML = anggota.map((ang) => {
    const isAktif = ang.Status_Aktif === 'Aktif';
    const statusBadge = isAktif
      ? '<span class="badge badge-masuk">Aktif</span>'
      : '<span class="badge badge-keluar">Nonaktif</span>';
    const toggleBtnLabel = isAktif ? 'Nonaktifkan' : 'Aktifkan';
    const nextStatus = isAktif ? 'Nonaktif' : 'Aktif';

    return `
      <tr>
        <td class="td-id-col">${escapeHtml(ang.ID_Anggota)}</td>
        <td class="td-name-col">${escapeHtml(ang.Nama_Anggota)}</td>
        <td class="td-wa-col">${escapeHtml(ang.Nomor_WA || '-')}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="td-action-cell">
          <button class="btn btn-outline btn-compact-action" data-action="toggle-status-anggota" data-id="${escapeHtml(ang.ID_Anggota)}" data-status="${nextStatus}">${toggleBtnLabel}</button>
          <button class="btn btn-danger btn-compact-action ml-4" data-action="hapus-master-anggota" data-id="${escapeHtml(ang.ID_Anggota)}"><i class="ph-bold ph-trash"></i></button>
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
      <tr>
        <td class="td-id-col">${escapeHtml(kat.ID_Kategori)}</td>
        <td class="td-name-col">${escapeHtml(kat.Nama_Kategori)}</td>
        <td class="text-center">${badge}</td>
        <td class="text-center">
          <button class="btn btn-danger btn-compact-action" data-action="hapus-master-kategori" data-id="${escapeHtml(kat.ID_Kategori)}"><i class="ph-bold ph-trash"></i> Hapus</button>
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
  openModal('modal-kelola-master');
};

export const submitTambahAnggota = async (e) => {
  e.preventDefault();
  const nama = document.getElementById('input-nama-anggota').value.trim();
  const noWa = document.getElementById('input-wa-anggota').value.trim();
  if (!nama) return showToast('Nama anggota tidak boleh kosong.', 'error');

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  const res = await sendAdminPayload({ action: 'tambahAnggota', nama, noWa });
  btn.disabled = false;

  if (res && res.status) {
    showToast('Anggota berhasil ditambahkan!', 'success');
    document.getElementById('input-nama-anggota').value = '';
    document.getElementById('input-wa-anggota').value = '';
    await initApp();
    renderMasterAnggotaTable();
  } else {
    showToast(res?.message || 'Gagal menambah anggota.', 'error');
  }
};

export const toggleStatusAnggotaAction = async (idAnggota, nextStatus) => {
  const res = await sendAdminPayload({ action: 'updateStatusAnggota', idAnggota, statusAktif: nextStatus });
  if (res && res.status) {
    showToast(`Status anggota diubah ke ${nextStatus}.`, 'success');
    await initApp();
    renderMasterAnggotaTable();
  } else {
    showToast(res?.message || 'Gagal mengubah status anggota.', 'error');
  }
};

export const hapusMasterAnggotaAction = async (idAnggota) => {
  if (!confirm('Yakin ingin menghapus anggota ini?')) return;
  const res = await sendAdminPayload({ action: 'hapusAnggota', idAnggota });
  if (res && res.status) {
    showToast('Anggota berhasil dihapus.', 'success');
    await initApp();
    renderMasterAnggotaTable();
  } else {
    showToast(res?.message || 'Gagal menghapus anggota.', 'error');
  }
};

export const submitTambahKategori = async (e) => {
  e.preventDefault();
  const tipe = document.getElementById('input-tipe-kategori').value;
  const nama = document.getElementById('input-nama-kategori').value.trim();
  if (!nama) return showToast('Nama kategori tidak boleh kosong.', 'error');

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  const res = await sendAdminPayload({ action: 'tambahKategori', nama, tipe });
  btn.disabled = false;

  if (res && res.status) {
    showToast('Kategori berhasil ditambahkan!', 'success');
    document.getElementById('input-nama-kategori').value = '';
    await initApp();
    renderMasterKategoriTable();
  } else {
    showToast(res?.message || 'Gagal menambah kategori.', 'error');
  }
};

export const hapusMasterKategoriAction = async (idKategori) => {
  if (!confirm('Yakin ingin menghapus kategori ini?')) return;
  const res = await sendAdminPayload({ action: 'hapusKategori', idKategori });
  if (res && res.status) {
    showToast('Kategori berhasil dihapus.', 'success');
    await initApp();
    renderMasterKategoriTable();
  } else {
    showToast(res?.message || 'Gagal menghapus kategori.', 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════
   OFFLINE QUEUE UI
   ══════════════════════════════════════════════════════════════════ */

