import { getState, getIsAdminSession, getActiveGroupId, saveCache } from "finkas/core/state";
import { isUnsyncedTempId } from "finkas/core/offline";
import { getInput, getSelect, requiredField, showToast, showDatabaseToast, getInitials } from "finkas/core/utils";
import { deliverMutation, generateTempId, requestAppRefresh } from "finkas/core/mutation";
import { withLiquidSave } from "../ui/keel";
import { openModal, closeModal, switchTab, showConfirmDialog } from "../ui/modal";
import { syncCdrop } from "../ui/cdrop";
import { renderSkippedMonthsList } from "../stores/workspace-sync";
import { syncMasterAnggotaRows, syncMasterAnggotaFilter, syncMasterKategoriRows } from "../mount";
import { flashMasterAnggotaSaved, flashMasterKategoriSaved } from "../stores/master.svelte";

export { AUDIT_ACTION_LABELS, renderAuditLogList, openAuditLogModal } from "./audit-log";

const refreshAppData = async () => { requestAppRefresh(); };

/** Temporary id for an optimistic master row until the server confirms it. */
const tempMasterId = (prefix: string) => generateTempId(prefix);

export const openSkippedMonthsModal = () => {
  openKelolaMasterModal();
  switchTab('tab-master-skipped', 'modal-kelola-master');
};

const requireMasterAdminContext = () => {
  if (!getIsAdminSession()) {
    showToast('Hanya admin grup yang berwenang mengubah data master.', 'error');
    return '';
  }
  const targetGroupId = getActiveGroupId();
  if (!targetGroupId) {
    showToast('Pilih grup kas aktif terlebih dahulu.', 'error');
    return '';
  }
  return targetGroupId;
};

const ensureMasterGroupActive = (targetGroupId: string): boolean => {
  if (getIsAdminSession() && getActiveGroupId() === targetGroupId) return true;
  showToast('Grup kas telah berganti. Operasi dibatalkan.', 'warning');
  return false;
};

const abortedGroupResult = () => ({
  outcome: 'neutral' as const,
  done: () => showToast('Grup kas telah berganti. Operasi dibatalkan.', 'warning')
});

const parseMonthInputKey = (inputId: string, emptyMsg: string): string => {
  const el = getInput(inputId);
  if (!el || !el.value) { showToast(emptyMsg, 'error'); return ''; }
  const parts = el.value.split('-');
  if (parts.length !== 2 || Number.isNaN(Number(parts[0])) || Number.isNaN(Number(parts[1]))) {
    showToast('Format bulan salah.', 'error');
    return '';
  }
  return `${parts[1].padStart(2, '0')}-${parts[0]}`;
};

type DeliveredMasterResult = Extract<Awaited<ReturnType<typeof deliverMutation>>, { delivered: true }>['result'];

type MasterMutationSpec = {
  targetGroupId: string;
  dialog: Omit<Parameters<typeof showConfirmDialog>[0], 'onConfirm'>;
  payload: Parameters<typeof deliverMutation>[0];
  errorMessage: string;
  onOffline: () => void;
  onOnline: (result: DeliveredMasterResult) => void | Promise<void>;
};

const confirmMasterMutation = ({ targetGroupId, dialog, payload, errorMessage, onOffline, onOnline }: MasterMutationSpec) => {
  showConfirmDialog({
    ...dialog,
    onConfirm: async () => {
      if (!ensureMasterGroupActive(targetGroupId)) return;
      const delivery = await deliverMutation(payload);
      if (getActiveGroupId() !== targetGroupId) return;
      if (!delivery.delivered) {
        onOffline();
        saveCache(targetGroupId);
        return;
      }
      if (delivery.result.status) await onOnline(delivery.result);
      else showToast(delivery.result.message || errorMessage, 'error');
    }
  });
};

export const addSkippedMonth = async () => {
  const targetGroupId = requireMasterAdminContext();
  if (!targetGroupId) return;
  const key = parseMonthInputKey('input-skip-month', 'Pilih bulan terlebih dahulu.');
  if (!key) return;

  confirmMasterMutation({
    targetGroupId,
    dialog: {
      title: 'Tetapkan Bulan Libur?',
      message: `Anggota akan dibebaskan dari kewajiban iuran untuk bulan ${key}. Simpan ke database?`,
      icon: 'ph-fill ph-calendar-x',
      badgeClass: 'warning',
      confirmText: 'Ya, Tetapkan Libur'
    },
    payload: { action: 'addSkippedMonth', groupId: targetGroupId, month: key },
    errorMessage: 'Gagal menambahkan bulan libur.',
    onOffline: () => {
      const state = getState();
      // Offline — queued. Reflect locally (server op is idempotent on replay).
      if (!state.skippedMonths.includes(key)) state.skippedMonths = state.skippedMonths.concat([key]);
      renderSkippedMonthsList();
      showDatabaseToast('Bulan Libur Ditetapkan (Offline)', `Bulan ${key} akan disinkronkan saat online.`);
    },
    onOnline: (result) => {
      const state = getState();
      state.skippedMonths = result.data?.skippedMonths || state.skippedMonths.concat([key]);
      renderSkippedMonthsList();
      showDatabaseToast('Bulan Libur Ditetapkan', `Bulan ${key} dibebaskan dari iuran.`);
    }
  });
};

export const removeSkippedMonth = async (key: string | null) => {
  const targetGroupId = requireMasterAdminContext();
  if (!targetGroupId) return;
  if (!key || typeof key !== 'string' || !/^\d{2}-\d{4}$/.test(key)) {
    return showToast('Format bulan libur tidak valid.', 'error');
  }

  confirmMasterMutation({
    targetGroupId,
    dialog: {
      title: 'Hapus Bulan Libur?',
      message: `Kewajiban iuran untuk bulan ${key} akan diaktifkan kembali. Simpan perubahan ke database?`,
      icon: 'ph-fill ph-calendar-check',
      confirmText: 'Ya, Aktifkan Kembali'
    },
    payload: { action: 'removeSkippedMonth', groupId: targetGroupId, month: key },
    errorMessage: 'Gagal menghapus bulan libur.',
    onOffline: () => {
      const state = getState();
      state.skippedMonths = state.skippedMonths.filter((s) => s !== key);
      renderSkippedMonthsList();
      showDatabaseToast('Bulan Libur Dicabut (Offline)', `Bulan ${key} akan disinkronkan saat online.`);
    },
    onOnline: (result) => {
      const state = getState();
      state.skippedMonths = result.data?.skippedMonths || state.skippedMonths.filter((s) => s !== key);
      renderSkippedMonthsList();
      showDatabaseToast('Bulan Libur Dicabut', `Bulan ${key} kembali aktif untuk penagihan.`);
    }
  });
};

/* ── Kas start (awal mulai kas) ──────────────────────────────────── */

/** Populate the kas-start month picker from state (YYYY-MM for input type=month). */
export const populateKasStartInput = () => {
  const el = getInput('input-kas-start');
  if (!el) return;
  const kasStart = getState().kasStart || '';
  // Stored as MM-YYYY; the month input needs YYYY-MM.
  const m = /^(\d{2})-(\d{4})$/.exec(kasStart);
  el.value = m ? `${m[2]}-${m[1]}` : '';
};

export const saveKasStart = async () => {
  const targetGroupId = requireMasterAdminContext();
  if (!targetGroupId) return;
  const key = parseMonthInputKey('input-kas-start', 'Pilih bulan awal mulai kas terlebih dahulu.');
  if (!key) return;

  confirmMasterMutation({
    targetGroupId,
    dialog: {
      title: 'Tetapkan Awal Mulai Kas?',
      message: `Grup akan mulai menagih iuran sejak bulan ${key}. Bulan sebelumnya tidak dihitung sebagai tunggakan. Simpan ke database?`,
      icon: 'ph-fill ph-calendar-check',
      confirmText: 'Ya, Simpan'
    },
    payload: { action: 'setKasStart', groupId: targetGroupId, kasStart: key },
    errorMessage: 'Gagal menyimpan awal mulai kas.',
    onOffline: () => {
      getState().kasStart = key;
      showDatabaseToast('Awal Kas Disimpan (Offline)', `Awal kas ${key} akan disinkronkan saat online.`);
    },
    onOnline: (result) => {
      getState().kasStart = result.data?.kasStart ?? key;
      showDatabaseToast('Awal Mulai Kas Diperbarui', `Grup menagih iuran sejak ${key}.`);
    }
  });
};

/* ══════════════════════════════════════════════════════════════════
   MASTER DATA CRUD (ANGGOTA & KATEGORI)
   ══════════════════════════════════════════════════════════════════ */

const syncMasterTabCounts = () => {
  const { anggota = [], kategori = [], skippedMonths = [] } = getState();
  const elAng = document.getElementById('master-count-anggota');
  const elKat = document.getElementById('master-count-kategori');
  const elSkip = document.getElementById('master-count-skipped');
  const elStats = document.getElementById('master-anggota-stats');

  if (elAng) elAng.textContent = String(anggota.length);
  if (elKat) elKat.textContent = String(kategori.length);
  if (elSkip) elSkip.textContent = String(skippedMonths.length);
  if (elStats) {
    const aktifCount = anggota.filter((a) => a.Status_Aktif === 'Aktif').length;
    const nonaktifCount = anggota.length - aktifCount;
    elStats.textContent = nonaktifCount > 0
      ? `${aktifCount} aktif · ${nonaktifCount} nonaktif`
      : `${aktifCount} aktif`;
  }
};

export const filterMasterAnggota = () => {
  syncMasterAnggotaFilter(getInput('search-master-anggota')?.value || '');
};

export const renderMasterAnggotaTable = () => {
  if (!document.getElementById('master-anggota-tbody')) return;
  syncMasterTabCounts();
  const rows = (getState().anggota || []).map((ang) => {
    const id = String(ang.ID_Anggota ?? '');
    const name = String(ang.Nama_Anggota ?? '');
    const rawWa = String(ang.Nomor_WA || '').trim();
    const cleanWa = rawWa.replace(/\D/g, '');
    const waHref = cleanWa ? `https://wa.me/${cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa}` : '';
    return {
      id, name, initials: getInitials(name), isAktif: ang.Status_Aktif === 'Aktif',
      rawWa, waHref, searchText: `${name} ${id} ${rawWa}`
    };
  });
  syncMasterAnggotaRows({ rows, query: getInput('search-master-anggota')?.value || '' });
};

export const renderMasterKategoriTable = () => {
  if (!document.getElementById('master-kategori-tbody')) return;
  syncMasterTabCounts();
  const rows = (getState().kategori || []).map((kat) => ({
    id: String(kat.ID_Kategori ?? ''), name: String(kat.Nama_Kategori ?? ''),
    tipe: String(kat.Tipe ?? ''), isMasuk: kat.Tipe === 'Masuk'
  }));
  syncMasterKategoriRows({ rows });
};

export const bukaModalEditMasterAnggota = (idAnggota: string) => {
  const ang = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
  if (!ang) return;

  const rawWa = (ang.Nomor_WA || '').trim();
  const cleanWa = rawWa.replace(/\D/g, '');
  const isAktif = (ang.Status_Aktif || 'Aktif') === 'Aktif';

  const idInput = getInput('edit-master-anggota-id');
  if (idInput) idInput.value = ang.ID_Anggota;

  const avatarEl = document.getElementById('edit-master-anggota-avatar');
  if (avatarEl) {
    avatarEl.textContent = getInitials(ang.Nama_Anggota);
    avatarEl.classList?.toggle?.('is-inactive', !isAktif);
  }

  const idBadge = document.getElementById('edit-master-anggota-id-badge');
  if (idBadge) idBadge.textContent = ang.ID_Anggota;

  const namaInput = getInput('edit-master-nama-input');
  if (namaInput) namaInput.value = ang.Nama_Anggota;

  const waInput = getInput('edit-master-wa-input');
  if (waInput) waInput.value = rawWa;

  const statusSelect = getSelect('edit-master-status-select');
  if (statusSelect) {
    statusSelect.value = ang.Status_Aktif || 'Aktif';
    syncCdrop('edit-master-status-select');
  }

  const waLink = (document.getElementById('edit-master-anggota-wa-link') as HTMLAnchorElement | null);
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

export const submitEditMasterAnggota = async (e: Event) => {
  e?.preventDefault?.();
  const targetGroupId = requireMasterAdminContext();
  if (!targetGroupId) return;
  const idAnggota = (getInput('edit-master-anggota-id')?.value || '').trim();
  const nama = (getInput('edit-master-nama-input')?.value || '').trim();
  const noWa = (getInput('edit-master-wa-input')?.value || '').trim();
  const statusAktif = getSelect('edit-master-status-select')?.value === 'Nonaktif' ? 'Nonaktif' : 'Aktif';

  if (!idAnggota) return showToast('ID anggota tidak ditemukan.', 'error');
  if (!nama) return showToast('Nama anggota tidak boleh kosong.', 'error');
  if (nama.length < 2) return showToast('Nama anggota minimal 2 karakter.', 'error');

  // Optimistic row whose create has not synced yet — the server has no matching
  // document, so a queued edit can only fail as "not found". Block until synced.
  if (isUnsyncedTempId(idAnggota)) {
    return showToast('Anggota ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum mengeditnya.', 'warning');
  }

  await withLiquidSave(
    'btn-submit-edit-anggota',
    async () => {
      if (!ensureMasterGroupActive(targetGroupId)) return abortedGroupResult();
      const { delivered, result } = await deliverMutation({
        action: 'updateStatusAnggota',
        groupId: targetGroupId,
        idAnggota,
        statusAktif,
        nama,
        noWa
      });
      if (getActiveGroupId() !== targetGroupId) return { outcome: 'neutral', done: () => {} };

      if (!delivered) {
        // Offline — queued. Reflect locally so the table matches until sync.
        const ang = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
        if (ang) { ang.Nama_Anggota = nama; ang.Status_Aktif = statusAktif; ang.Nomor_WA = noWa; }
        saveCache(targetGroupId);
        return {
          outcome: 'success',
          onSettled: () => {
            if (getActiveGroupId() !== targetGroupId) return;
            renderMasterAnggotaTable();
            flashMasterAnggotaSaved(idAnggota);
          },
          done: () => {
            if (getActiveGroupId() !== targetGroupId) return;
            closeModal('modal-edit-master-anggota');
            showDatabaseToast('Perubahan Disimpan (Offline)', `Data ${nama} akan disinkronkan saat online.`);
          }
        };
      }

      if (!result.status) {
        return {
          outcome: 'error',
          done: () => showToast(result.message || 'Gagal menyimpan perubahan anggota.', 'error')
        };
      }

      return {
        outcome: 'success',
        done: async () => {
          if (getActiveGroupId() !== targetGroupId) return;
          closeModal('modal-edit-master-anggota');
          showDatabaseToast('Data Anggota Diperbarui', `Perubahan untuk ${nama} berhasil disimpan.`);
          await refreshAppData();
          if (getActiveGroupId() !== targetGroupId) return;
          renderMasterAnggotaTable();
          flashMasterAnggotaSaved(idAnggota);
        }
      };
    },
    { settleMs: 320 }
  );
};

export const bukaModalEditMasterKategori = (idKategori: string) => {
  const kat = (getState().kategori || []).find((k) => k.ID_Kategori === idKategori);
  if (!kat) return;

  const isMasuk = kat.Tipe === 'Masuk';
  const idInput = getInput('edit-master-kategori-id');
  if (idInput) idInput.value = kat.ID_Kategori;

  const idBadge = document.getElementById('edit-master-kategori-id-badge');
  if (idBadge) idBadge.textContent = kat.ID_Kategori;

  const namaEl = document.getElementById('edit-master-kategori-nama');
  if (namaEl) namaEl.textContent = kat.Nama_Kategori;

  const icon = document.createElement('i');
  icon.className = `ph-bold ${isMasuk ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}`;
  icon.setAttribute('aria-hidden', 'true');
  const iconWrap = document.getElementById('edit-master-kategori-icon');
  if (iconWrap) {
    iconWrap.className = `master-kat-icon is-lg ${isMasuk ? 'is-masuk' : 'is-keluar'}`;
    iconWrap.replaceChildren(icon);
  }

  const tipeBadge = document.getElementById('edit-master-kategori-tipe-badge');
  if (tipeBadge) {
    tipeBadge.className = `badge ${isMasuk ? 'badge-masuk' : 'badge-keluar'}`;
    tipeBadge.replaceChildren(icon.cloneNode(), document.createTextNode(` Kas ${kat.Tipe}`));
  }

  openModal('modal-edit-master-kategori');
};

export const openKelolaMasterModal = () => {
  if (!getIsAdminSession()) {
    showToast('Hanya admin yang dapat mengakses menu ini.', 'error');
    openModal('modal-login');
    return;
  }
  const searchEl = getInput('search-master-anggota');
  if (searchEl) {
    searchEl.value = '';
    if (!searchEl.dataset?.masterBound) {
      if (searchEl.dataset) searchEl.dataset.masterBound = '1';
      searchEl.addEventListener('input', filterMasterAnggota);
    }
  }
  syncCdrop('input-tipe-kategori');
  renderMasterAnggotaTable();
  renderMasterKategoriTable();
  renderSkippedMonthsList();
  populateKasStartInput();
  syncMasterTabCounts();
  openModal('modal-kelola-master');
};

export const submitTambahAnggota = async (e: Event) => {
  e.preventDefault();
  const targetGroupId = requireMasterAdminContext();
  if (!targetGroupId) return;
  const nama = (getInput('input-nama-anggota')?.value || '').trim();
  const noWa = (getInput('input-wa-anggota')?.value || '').trim();
  if (!nama) return showToast('Nama anggota tidak boleh kosong.', 'error');
  if (nama.length < 2) return showToast('Nama anggota minimal 2 karakter.', 'error');

  showConfirmDialog({
    title: 'Tambah Anggota Baru?',
    message: `Daftarkan ${nama} ke daftar anggota kas grup?`,
    icon: 'ph-fill ph-user-plus',
    confirmText: 'Ya, Daftarkan',
    onConfirm: async () => {
      if (!ensureMasterGroupActive(targetGroupId)) return;
      const btn = (e.target as HTMLFormElement | null)?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
      await withLiquidSave(
        btn,
        async () => {
          if (!ensureMasterGroupActive(targetGroupId)) return abortedGroupResult();
          const { delivered, result } = await deliverMutation({ action: 'tambahAnggota', groupId: targetGroupId, nama, noWa });
          if (getActiveGroupId() !== targetGroupId) return { outcome: 'neutral', done: () => {} };
          if (!delivered) {
            const tempId = tempMasterId('ANG');
            // Offline — queued. Show an optimistic row with a temp id; the next online refetch replaces it.
            getState().anggota.push({ ID_Anggota: tempId, Nama_Anggota: nama, Nomor_WA: noWa, Status_Aktif: 'Aktif' });
            saveCache(targetGroupId);
            requiredField('input-nama-anggota').value = '';
            requiredField('input-wa-anggota').value = '';
            return {
              outcome: 'success',
              onSettled: () => {
                if (getActiveGroupId() !== targetGroupId) return;
                renderMasterAnggotaTable();
                flashMasterAnggotaSaved(tempId);
              },
              done: () => showDatabaseToast('Anggota Disimpan (Offline)', `${nama} akan disinkronkan saat online.`)
            };
          }
          if (!result.status) {
            return { outcome: 'error', done: () => showToast(result.message || 'Gagal menambah anggota.', 'error') };
          }
          return {
            outcome: 'success',
            onSettled: () => {
              if (getActiveGroupId() !== targetGroupId) return;
              requiredField('input-nama-anggota').value = '';
              requiredField('input-wa-anggota').value = '';
            },
            done: async () => {
              if (getActiveGroupId() !== targetGroupId) return;
              showDatabaseToast('Anggota Baru Ditambahkan', `Anggota ${nama} berhasil didaftarkan ke database.`);
              await refreshAppData();
              if (getActiveGroupId() !== targetGroupId) return;
              renderMasterAnggotaTable();
              const addedId = (result.data as { idAnggota?: string } | undefined)?.idAnggota
                || (getState().anggota || []).filter((a) => a.Nama_Anggota === nama).pop()?.ID_Anggota || '';
              if (addedId) flashMasterAnggotaSaved(addedId);
            }
          };
        },
        { savingText: 'Menambah…', doneText: 'Ditambahkan', settleMs: 320 }
      );
    }
  });
};

export const toggleStatusAnggotaAction = async (idAnggota: string, nextStatus: string | null) => {
  const targetGroupId = requireMasterAdminContext();
  if (!targetGroupId) return;
  if (!idAnggota || (nextStatus !== 'Aktif' && nextStatus !== 'Nonaktif')) {
    return showToast('Parameter status anggota tidak valid.', 'error');
  }
  const ang = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
  const angName = ang?.Nama_Anggota || 'Anggota';

  if (isUnsyncedTempId(idAnggota)) {
    return showToast('Anggota ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum mengubah statusnya.', 'warning');
  }

  confirmMasterMutation({
    targetGroupId,
    dialog: {
      title: 'Ubah Status Anggota?',
      message: `Ubah status ${angName} menjadi "${nextStatus}"? Anggota nonaktif tidak akan dimasukkan ke penagihan iuran aktif.`,
      icon: nextStatus === 'Aktif' ? 'ph-fill ph-user-check' : 'ph-fill ph-user-minus',
      badgeClass: nextStatus === 'Aktif' ? '' : 'warning',
      confirmText: 'Ya, Ubah Status'
    },
    payload: { action: 'updateStatusAnggota', groupId: targetGroupId, idAnggota, statusAktif: nextStatus },
    errorMessage: 'Gagal mengubah status anggota.',
    onOffline: () => {
      const target = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
      if (target) target.Status_Aktif = nextStatus;
      showDatabaseToast('Status Disimpan (Offline)', `Status ${angName} akan disinkronkan saat online.`);
      renderMasterAnggotaTable();
      flashMasterAnggotaSaved(idAnggota);
    },
    onOnline: async () => {
      showDatabaseToast('Status Anggota Diperbarui', `Status ${angName} berhasil diubah ke ${nextStatus}.`);
      await refreshAppData();
      if (getActiveGroupId() !== targetGroupId) return;
      renderMasterAnggotaTable();
      flashMasterAnggotaSaved(idAnggota);
    }
  });
};

export const hapusMasterAnggotaAction = async (idAnggota: string) => {
  const targetGroupId = requireMasterAdminContext();
  if (!targetGroupId) return;
  if (!idAnggota) return showToast('ID anggota tidak valid.', 'error');
  const ang = (getState().anggota || []).find((a) => a.ID_Anggota === idAnggota);
  const angName = ang?.Nama_Anggota || 'Anggota';

  if (isUnsyncedTempId(idAnggota)) {
    return showToast('Anggota ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum menghapusnya.', 'warning');
  }

  confirmMasterMutation({
    targetGroupId,
    dialog: {
      title: 'Hapus Anggota?',
      message: `Data ${angName} akan dihapus permanen dari master anggota grup. Riwayat transaksi lama tetap tersimpan. Lanjutkan?`,
      icon: 'ph-bold ph-trash',
      badgeClass: 'danger',
      confirmText: 'Ya, Hapus Anggota',
      confirmClass: 'btn-danger-solid'
    },
    payload: { action: 'hapusAnggota', groupId: targetGroupId, idAnggota },
    errorMessage: 'Gagal menghapus anggota.',
    onOffline: () => {
      // Offline — queued. Remove locally; if the server later rejects it
      // (e.g. transactions still reference this member), the offline-sync
      // reconciliation surfaces that and the next refetch restores the row.
      const arr = getState().anggota;
      const idx = arr.findIndex((a) => a.ID_Anggota === idAnggota);
      if (idx !== -1) arr.splice(idx, 1);
      showDatabaseToast('Penghapusan Disimpan (Offline)', `${angName} akan dihapus saat online.`);
      renderMasterAnggotaTable();
    },
    onOnline: async () => {
      showDatabaseToast('Anggota Dihapus', `${angName} berhasil dihapus dari database.`);
      await refreshAppData();
      if (getActiveGroupId() !== targetGroupId) return;
      renderMasterAnggotaTable();
    }
  });
};

export const submitTambahKategori = async (e: Event) => {
  e.preventDefault();
  const targetGroupId = requireMasterAdminContext();
  if (!targetGroupId) return;
  const tipe = getSelect('input-tipe-kategori')?.value;
  const nama = (getInput('input-nama-kategori')?.value || '').trim();
  if (tipe !== 'Masuk' && tipe !== 'Keluar') return showToast('Pilih tipe kategori yang valid.', 'error');
  if (!nama) return showToast('Nama kategori tidak boleh kosong.', 'error');

  showConfirmDialog({
    title: 'Tambah Kategori Kas?',
    message: `Simpan kategori baru "${nama}" (${tipe}) ke database kas?`,
    icon: 'ph-fill ph-tag',
    confirmText: 'Ya, Simpan Kategori',
    onConfirm: async () => {
      if (!ensureMasterGroupActive(targetGroupId)) return;
      const btn = (e.target as HTMLFormElement | null)?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
      await withLiquidSave(
        btn,
        async () => {
          if (!ensureMasterGroupActive(targetGroupId)) return abortedGroupResult();
          const { delivered, result } = await deliverMutation({ action: 'tambahKategori', groupId: targetGroupId, nama, tipe });
          if (getActiveGroupId() !== targetGroupId) return { outcome: 'neutral', done: () => {} };
          if (!delivered) {
            const tempKatId = tempMasterId(tipe === 'Masuk' ? 'KAT-M' : 'KAT-K');
            getState().kategori.push({ ID_Kategori: tempKatId, Nama_Kategori: nama, Tipe: tipe });
            saveCache(targetGroupId);
            requiredField('input-nama-kategori').value = '';
            return {
              outcome: 'success',
              onSettled: () => {
                if (getActiveGroupId() !== targetGroupId) return;
                renderMasterKategoriTable();
                flashMasterKategoriSaved(tempKatId);
              },
              done: () => showDatabaseToast('Kategori Disimpan (Offline)', `Kategori "${nama}" akan disinkronkan saat online.`)
            };
          }
          if (!result.status) {
            return { outcome: 'error', done: () => showToast(result.message || 'Gagal menambah kategori.', 'error') };
          }
          return {
            outcome: 'success',
            onSettled: () => {
              if (getActiveGroupId() !== targetGroupId) return;
              requiredField('input-nama-kategori').value = '';
            },
            done: async () => {
              if (getActiveGroupId() !== targetGroupId) return;
              showDatabaseToast('Kategori Kas Ditambahkan', `Kategori "${nama}" (${tipe}) berhasil disimpan.`);
              await refreshAppData();
              if (getActiveGroupId() !== targetGroupId) return;
              renderMasterKategoriTable();
              const addedKatId = (result.data as { idKategori?: string } | undefined)?.idKategori
                || (getState().kategori || []).filter((k) => k.Nama_Kategori === nama && k.Tipe === tipe).pop()?.ID_Kategori || '';
              if (addedKatId) flashMasterKategoriSaved(addedKatId);
            }
          };
        },
        { savingText: 'Menambah…', doneText: 'Ditambahkan', settleMs: 320 }
      );
    }
  });
};

export const hapusMasterKategoriAction = async (idKategori: string) => {
  const targetGroupId = requireMasterAdminContext();
  if (!targetGroupId) return;
  if (!idKategori) return showToast('ID kategori tidak valid.', 'error');
  const kat = (getState().kategori || []).find((k) => k.ID_Kategori === idKategori);
  const katName = kat?.Nama_Kategori || 'Kategori';

  if (isUnsyncedTempId(idKategori)) {
    return showToast('Kategori ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum menghapusnya.', 'warning');
  }

  confirmMasterMutation({
    targetGroupId,
    dialog: {
      title: 'Hapus Kategori?',
      message: `Kategori "${katName}" akan dihapus dari pilihan transaksi kas. Lanjutkan?`,
      icon: 'ph-bold ph-trash',
      badgeClass: 'danger',
      confirmText: 'Ya, Hapus Kategori',
      confirmClass: 'btn-danger-solid'
    },
    payload: { action: 'hapusKategori', groupId: targetGroupId, idKategori },
    errorMessage: 'Gagal menghapus kategori.',
    onOffline: () => {
      const arr = getState().kategori;
      const idx = arr.findIndex((k) => k.ID_Kategori === idKategori);
      if (idx !== -1) arr.splice(idx, 1);
      showDatabaseToast('Penghapusan Disimpan (Offline)', `Kategori "${katName}" akan dihapus saat online.`);
      renderMasterKategoriTable();
    },
    onOnline: async () => {
      showDatabaseToast('Kategori Dihapus', `Kategori "${katName}" berhasil dihapus.`);
      await refreshAppData();
      if (getActiveGroupId() !== targetGroupId) return;
      renderMasterKategoriTable();
    }
  });
};
