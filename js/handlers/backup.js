/**
 * @module handlers/backup
 * Disaster Recovery: Full JSON Snapshot Backup & Restore.
 */

import { getState, setState, saveCache, getIsAdminSession, getActiveGroupId, getGroups } from '../core/state.js';
import { postToBackend, logAuditEvent } from '../core/api.js';
import { showToast } from '../core/utils.js';
import { renderAll } from '../render.js';
import { closeModal } from '../ui/modal.js';

/**
 * Export full JSON snapshot of Finkas database for disaster recovery.
 */
export const exportJSONBackup = () => {
  if (!getIsAdminSession()) {
    return showToast('Hanya admin yang dapat mengunduh backup.', 'error');
  }

  const state = getState();
  if (state.transaksi.length > 10000) {
    return showToast('Jumlah transaksi melebihi batas backup (10.000).', 'error');
  }
  if (state.anggota.length > 1000) {
    return showToast('Jumlah anggota melebihi batas backup (1.000).', 'error');
  }

  const gid = getActiveGroupId();
  const gname = getGroups().find((g) => g.id === gid)?.nama || gid;
  const backupData = {
    app: 'Finkas',
    version: 1,
    exportedAt: new Date().toISOString(),
    group: { id: gid, nama: gname },
    stats: {
      totalAnggota: state.anggota.length,
      totalKategori: state.kategori.length,
      totalTransaksi: state.transaksi.length,
      skippedMonthsCount: state.skippedMonths.length
    },
    data: {
      anggota: state.anggota,
      kategori: state.kategori,
      transaksi: state.transaksi,
      skippedMonths: state.skippedMonths
    }
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const filename = `Finkas_Backup_${gid}_${new Date().toISOString().slice(0, 10)}.json`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  logAuditEvent('BACKUP_DATABASE', `Backup snapshot diunduh (${state.transaksi.length} transaksi)`);
  showToast('File backup JSON berhasil diunduh!', 'success');
  closeModal('modal-export');
};

/**
 * Restore database from a validated JSON backup file.
 * Sends the snapshot to the server via `restoreSnapshot` for a real, persistent restore.
 * @param {File} file
 */
export const restoreJSONBackup = (file) => {
  if (!getIsAdminSession()) {
    return showToast('Hanya admin yang dapat memulihkan database.', 'error');
  }
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = JSON.parse(e.target.result);

      // Schema verification
      if (!content || !content.data || !Array.isArray(content.data.anggota) || !Array.isArray(content.data.transaksi)) {
        return showToast('Format file backup tidak valid atau rusak.', 'error');
      }

      const { anggota, kategori, transaksi, skippedMonths } = content.data;

      if (kategori !== undefined && !Array.isArray(kategori)) {
        return showToast('Format kategori di file backup tidak valid.', 'error');
      }
      if (skippedMonths !== undefined && !Array.isArray(skippedMonths)) {
        return showToast('Format data bulan libur di file backup tidak valid.', 'error');
      }

      const safeKategori = Array.isArray(kategori) ? kategori : [];
      const safeSkipped = Array.isArray(skippedMonths) ? skippedMonths : [];

      if (anggota.length > 1000) {
        return showToast('File backup melebihi batas maksimum anggota (1.000).', 'error');
      }
      if (transaksi.length > 10000) {
        return showToast('File backup melebihi batas maksimum transaksi (10.000).', 'error');
      }
      if (safeKategori.length > 200) {
        return showToast('File backup melebihi batas maksimum kategori (200).', 'error');
      }
      if (safeSkipped.length > 120) {
        return showToast('File backup melebihi batas maksimum bulan dilewati (120).', 'error');
      }

      const invalidAnggota = anggota.some((a) => !a || typeof a !== 'object' || (!a.ID_Anggota && !a.idAnggota));
      if (invalidAnggota) {
        return showToast('Terdapat data anggota tidak valid di file backup.', 'error');
      }

      const invalidTrx = transaksi.some((t) => !t || typeof t !== 'object' || (!t.Nominal && t.nominal === undefined));
      if (invalidTrx) {
        return showToast('Terdapat transaksi tidak valid di file backup.', 'error');
      }

      const countTrx = transaksi.length;
      const countAng = anggota.length;
      const srcGroup = content.group?.nama || content.group?.id || 'tak diketahui';
      const activeGid = getActiveGroupId();
      const activeName = getGroups().find((g) => g.id === activeGid)?.nama || activeGid;

      const confirmMsg = `Pulihkan database dari file backup?\n• Grup asal: ${srcGroup}\n• Grup aktif: ${activeName}\n• ${countAng} Anggota\n• ${safeKategori.length} Kategori\n• ${countTrx} Transaksi\n\nSeluruh data server akan DIGANTIKAN. Tindakan ini tidak dapat dibatalkan.`;
      if (!window.confirm(confirmMsg)) return;
      if (content.group?.id && content.group.id !== activeGid) {
        if (!window.confirm(`Backup milik grup "${srcGroup}", tujuan "${activeName}". Tetap lanjutkan ke grup aktif?`)) return;
      }

      showToast('Memulihkan database ke server...', 'info');

      const res = await postToBackend({
        action: 'restoreSnapshot',
        data: { anggota, kategori: safeKategori, transaksi, skippedMonths: safeSkipped }
      });

      if (!res) {
        showToast('Tidak dapat terhubung ke server. Coba lagi saat online.', 'error');
        return;
      }
      if (!res.status) {
        showToast(res.message || 'Restore gagal.', 'error');
        return;
      }

      // Reflect the restored data locally.
      setState({
        anggota,
        kategori: safeKategori,
        transaksi,
        skippedMonths: safeSkipped
      });
      saveCache();
      renderAll();

      const countRestored = res.data?.transaksi ?? countTrx;
      showToast(`Database berhasil dipulihkan (${countRestored} transaksi)!`, 'success');
      closeModal('modal-export');
    } catch (err) {
      console.error('Restore error:', err);
      showToast('Gagal membaca file backup JSON.', 'error');
    }
  };

  reader.readAsText(file);
};
