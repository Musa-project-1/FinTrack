/**
 * @module handlers/backup
 * Disaster Recovery: Full JSON Snapshot Backup & Restore.
 *
 * Guarantees atomic, point-in-time consistent backups by requesting the authoritative
 * snapshot from the server gateway. Never mixes stale local state or ignores pending
 * mutations, and explicitly preserves kasStart, attachments, and operation receipts.
 */

import {
  getState,
  setState,
  saveCache,
  getIsAdminSession,
  getActiveGroupId,
  getGroups
} from '../core/state.js';
import { postToBackend, logAuditEvent } from '../core/api.js';
import { showToast, isOnline } from '../core/utils.js';
import { getOfflineItems } from '../core/offline-store.js';
import { renderAll } from '../render.js';
import { closeModal } from '../ui/modal.js';

/**
 * Export full JSON snapshot of Finkas database for disaster recovery directly from server.
 */
export const exportJSONBackup = async () => {
  if (!getIsAdminSession()) {
    return showToast('Hanya admin yang dapat mengunduh backup.', 'error');
  }

  if (!isOnline()) {
    return showToast('Backup database harus dilakukan saat online langsung dari server.', 'error');
  }

  // Prevent dirty backup: verify no pending un-replayed mutations in local queue
  try {
    const pending = await getOfflineItems();
    if (Array.isArray(pending) && pending.length > 0) {
      return showToast(
        `Terdapat ${pending.length} transaksi tertunda yang belum tersimpan di server. ` +
        `Sinkronkan antrean terlebih dahulu sebelum mengunduh backup.`,
        'error'
      );
    }
  } catch (err) {
    console.warn('[finkas] Gagal memeriksa antrean offline:', err?.message);
  }

  showToast('Mengambil snapshot atomic dari server...', 'info');

  const res = await postToBackend({ action: 'exportSnapshot' });
  if (!res) {
    return showToast('Tidak dapat terhubung ke server untuk mengambil snapshot database.', 'error');
  }
  if (!res.status || !res.data?.snapshot) {
    return showToast(res.message || 'Gagal mengambil backup dari server.', 'error');
  }

  const backupData = res.data.snapshot;
  const gid = getActiveGroupId();
  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const filename = `Finkas_Backup_${gid}_${new Date().toISOString().slice(0, 10)}.json`;

  if (typeof document !== 'undefined' && document.createElement) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  const trxCount = backupData.stats?.totalTransaksi ?? backupData.data?.transaksi?.length ?? 0;
  const attCount = backupData.stats?.totalAttachments ?? backupData.data?.attachments?.length ?? 0;
  logAuditEvent('BACKUP_DATABASE', `Backup snapshot diunduh (${trxCount} transaksi, ${attCount} bukti)`);
  showToast('File backup JSON berhasil diunduh dari server!', 'success');
  closeModal('modal-export');
  return backupData;
};

/**
 * Restore database from a validated JSON backup file.
 * Sends the snapshot to the server via `restoreSnapshot` for an atomic, persistent restore.
 * @param {File} file
 */
export const restoreJSONBackup = (file) => {
  if (!getIsAdminSession()) {
    return showToast('Hanya admin yang dapat memulihkan database.', 'error');
  }

  if (!isOnline()) {
    return showToast('Restore database harus dilakukan saat online langsung ke server.', 'error');
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

      const {
        anggota,
        kategori,
        transaksi,
        skippedMonths,
        kasStart,
        attachments,
        operations
      } = content.data;

      if (kategori !== undefined && !Array.isArray(kategori)) {
        return showToast('Format kategori di file backup tidak valid.', 'error');
      }
      if (skippedMonths !== undefined && !Array.isArray(skippedMonths)) {
        return showToast('Format data bulan libur di file backup tidak valid.', 'error');
      }
      if (attachments !== undefined && !Array.isArray(attachments)) {
        return showToast('Format data lampiran bukti di file backup tidak valid.', 'error');
      }
      if (operations !== undefined && !Array.isArray(operations)) {
        return showToast('Format data riwayat operasi di file backup tidak valid.', 'error');
      }

      const safeKategori = Array.isArray(kategori) ? kategori : [];
      const safeSkipped = Array.isArray(skippedMonths) ? skippedMonths : [];
      const safeAttachments = Array.isArray(attachments) ? attachments : [];
      const safeOperations = Array.isArray(operations) ? operations : [];

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
      if (safeAttachments.length > 10000) {
        return showToast('File backup melebihi batas maksimum lampiran (10.000).', 'error');
      }
      if (safeOperations.length > 20000) {
        return showToast('File backup melebihi batas maksimum riwayat operasi (20.000).', 'error');
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
      const srcGid = content.group?.id || '';
      const activeGid = getActiveGroupId();
      const activeName = getGroups().find((g) => g.id === activeGid)?.nama || activeGid;
      const isCrossGroup = Boolean(srcGid && srcGid !== activeGid);

      const confirmMsg =
        `Pulihkan database dari file backup?\n` +
        `• Grup asal: ${srcGroup}\n` +
        `• Grup aktif: ${activeName}\n` +
        `• ${countAng} Anggota\n` +
        `• ${safeKategori.length} Kategori\n` +
        `• ${countTrx} Transaksi\n` +
        `• ${safeAttachments.length} Bukti Pembayaran\n\n` +
        `Seluruh data server akan DIGANTIKAN. Tindakan ini tidak dapat dibatalkan.`;

      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (!window.confirm(confirmMsg)) return;
        if (isCrossGroup) {
          const crossMsg =
            `PERINGATAN LINTAS GRUP:\n` +
            `Backup ini berasal dari grup "${srcGroup}" (${srcGid}), ` +
            `tetapi grup aktif adalah "${activeName}" (${activeGid}).\n\n` +
            `Seluruh data grup tujuan akan digantikan dengan data dari backup ini. Tetap lanjutkan?`;
          if (!window.confirm(crossMsg)) return;
        }
      }

      showToast('Memulihkan database ke server...', 'info');

      const res = await postToBackend({
        action: 'restoreSnapshot',
        sourceGroupId: srcGid,
        confirmCrossGroup: isCrossGroup,
        data: {
          anggota,
          kategori: safeKategori,
          transaksi,
          skippedMonths: safeSkipped,
          kasStart: kasStart || '',
          attachments: safeAttachments,
          operations: safeOperations
        }
      });

      if (!res) {
        showToast('Tidak dapat terhubung ke server. Coba lagi saat online.', 'error');
        return;
      }
      if (!res.status) {
        showToast(res.message || 'Restore gagal.', 'error');
        return;
      }

      // Reflect restored data locally
      setState({
        anggota,
        kategori: safeKategori,
        transaksi,
        skippedMonths: safeSkipped,
        kasStart: kasStart || ''
      });
      saveCache();
      renderAll();

      const countRestored = res.data?.transaksi ?? countTrx;
      const countAtt = res.data?.attachments ?? safeAttachments.length;
      showToast(`Database berhasil dipulihkan (${countRestored} transaksi, ${countAtt} bukti)!`, 'success');
      closeModal('modal-export');
    } catch (err) {
      console.error('Restore error:', err);
      showToast('Gagal membaca file backup JSON.', 'error');
    }
  };

  reader.readAsText(file);
};
