import type { SnapshotEnvelope } from '../../types/finkas';
import { normalizePaymentAccount, validatePaymentAccount } from 'finkas/core/payment-account';
/**
 * @module handlers/backup
 * Disaster Recovery: Full JSON Snapshot Backup & Restore.
 *
 * Guarantees atomic, point-in-time consistent backups by requesting the authoritative
 * snapshot from the server gateway. Never mixes stale local state or ignores pending
 * mutations, and explicitly preserves kasStart, attachments, and operation receipts.
 */

import {
  getIsAdminSession,
  getActiveGroupId,
  getGroups,
  isPlainRecord,
  parseSafeJson
} from 'finkas/core/state';
import { postToBackend, logAuditEvent } from 'finkas/core/api';
import { requestAppRefresh } from 'finkas/core/mutation';
import { showToast, isOnline } from 'finkas/core/utils';
import { getOfflineItems } from 'finkas/core/offline-store';
import { closeModal } from '../ui/modal';
import { flashDownloadRing, isReducedMotion } from '../ui/ui-moments';

const MAX_BACKUP_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Export full JSON snapshot of Finkas database for disaster recovery directly from server.
 */
export const exportJSONBackup = async (btn?: HTMLElement | null) => {
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
    console.warn('[finkas] Gagal memeriksa antrean offline:', (err instanceof Error ? err.message : String(err)));
  }

  showToast('Mengambil snapshot atomic dari server...', 'info');

  const res = await postToBackend<{ snapshot: SnapshotEnvelope }>({ action: 'exportSnapshot' });
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

  flashDownloadRing(btn, 'Backup Siap');
  const trxCount = backupData.stats?.totalTransaksi ?? backupData.data?.transaksi?.length ?? 0;
  const attCount = backupData.stats?.totalAttachments ?? backupData.data?.attachments?.length ?? 0;
  logAuditEvent('BACKUP_DATABASE', `Backup snapshot diunduh (${trxCount} transaksi, ${attCount} bukti)`);
  showToast('File backup JSON berhasil diunduh dari server!', 'success');
  if (btn?.closest?.('#modal-export') && !isReducedMotion()) {
    const t = setTimeout(() => closeModal('modal-export'), 520);
    (t as unknown as { unref?: () => void })?.unref?.();
  } else {
    closeModal('modal-export');
  }
  return backupData;
};

/**
 * Restore database from a validated JSON backup file.
 * Sends the snapshot to the server via `restoreSnapshot` for an atomic, persistent restore.
 */
export const restoreJSONBackup = (file: File) => {
  if (!getIsAdminSession()) {
    return showToast('Hanya admin yang dapat memulihkan database.', 'error');
  }

  if (!isOnline()) {
    return showToast('Restore database harus dilakukan saat online langsung ke server.', 'error');
  }

  if (!file) return;

  const targetGid = getActiveGroupId();
  if (!targetGid) {
    return showToast('ID grup aktif belum dipilih.', 'error');
  }

  if (typeof file.size === 'number' && file.size > MAX_BACKUP_FILE_BYTES) {
    return showToast('Ukuran file backup melebihi batas maksimum 20 MB.', 'error');
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      if (getActiveGroupId() !== targetGid) {
        return showToast('Grup aktif berubah sebelum file dibaca, restore dibatalkan.', 'warning');
      }

      const rawText = typeof e.target?.result === 'string' ? e.target.result : String(e.target?.result ?? '');
      if (rawText.length > MAX_BACKUP_FILE_BYTES) {
        return showToast('Ukuran file backup melebihi batas maksimum 20 MB.', 'error');
      }

      const content = parseSafeJson(rawText, 32);

      // Schema verification
      if (!isPlainRecord(content) || !isPlainRecord(content.data) || !Array.isArray(content.data.anggota) || !Array.isArray(content.data.transaksi)) {
        return showToast('Format file backup tidak valid atau rusak.', 'error');
      }

      const {
        anggota,
        kategori,
        transaksi,
        skippedMonths,
        kasStart,
        paymentAccount,
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
      if (kasStart !== undefined && kasStart !== null && typeof kasStart !== 'string') {
        return showToast('Format tanggal mulai kas di file backup tidak valid.', 'error');
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

      const invalidAnggota = anggota.some((a) => !isPlainRecord(a) || !(
        (typeof a.ID_Anggota === 'string' && a.ID_Anggota.trim()) ||
        (typeof a.idAnggota === 'string' && a.idAnggota.trim())
      ));
      if (invalidAnggota) {
        return showToast('Terdapat data anggota tidak valid di file backup.', 'error');
      }

      const invalidKategori = safeKategori.some((k) => !isPlainRecord(k) || !(
        (typeof k.ID_Kategori === 'string' && k.ID_Kategori.trim()) ||
        (typeof k.idKategori === 'string' && k.idKategori.trim())
      ));
      if (invalidKategori) {
        return showToast('Terdapat data kategori tidak valid di file backup.', 'error');
      }

      const invalidTrx = transaksi.some((t) => {
        if (!isPlainRecord(t)) return true;
        const nominal = Number(t.Nominal ?? t.nominal);
        const tipe = t.Tipe_Arus ?? t.tipeArus;
        const ts = t.Timestamp ?? t.timestamp;
        return !Number.isFinite(nominal) || nominal <= 0
          || (tipe !== 'Masuk' && tipe !== 'Keluar')
          || typeof ts !== 'string' || !Number.isFinite(Date.parse(ts));
      });
      if (invalidTrx) {
        return showToast('Terdapat transaksi tidak valid di file backup.', 'error');
      }

      const invalidSkipped = safeSkipped.some((m) => typeof m !== 'string' || !m.trim() || m.trim().length > 20);
      if (invalidSkipped) {
        return showToast('Terdapat data bulan libur tidak valid di file backup.', 'error');
      }

      const invalidAttachments = safeAttachments.some((att) =>
        !isPlainRecord(att)
        || typeof att.idTransaksi !== 'string' || !att.idTransaksi.trim()
        || typeof att.base64 !== 'string' || !att.base64.length
      );
      if (invalidAttachments) {
        return showToast('Terdapat lampiran bukti tidak valid di file backup.', 'error');
      }

      const invalidOperations = safeOperations.some((op) =>
        !isPlainRecord(op)
        || typeof op.operationId !== 'string' || !op.operationId.trim()
        || typeof op.action !== 'string' || !op.action.trim()
      );
      if (invalidOperations) {
        return showToast('Terdapat riwayat operasi tidak valid di file backup.', 'error');
      }

      let normalizedPaymentAccount: ReturnType<typeof normalizePaymentAccount> | null = null;
      if (paymentAccount !== undefined && paymentAccount !== null) {
        if (!isPlainRecord(paymentAccount)) {
          return showToast('Format rekening tujuan di file backup tidak valid.', 'error');
        }
        const paErr = validatePaymentAccount(paymentAccount);
        if (paErr) {
          return showToast(paErr, 'error');
        }
        normalizedPaymentAccount = normalizePaymentAccount(paymentAccount);
      }

      const countTrx = transaksi.length;
      const countAng = anggota.length;
      const groupMeta = isPlainRecord(content.group) ? content.group : null;
      const srcGid = typeof groupMeta?.id === 'string' ? groupMeta.id.trim() : '';
      const srcGroup = (typeof groupMeta?.nama === 'string' && groupMeta.nama.trim()) || srcGid || 'tak diketahui';
      const missingGroupId = !srcGid;
      const activeName = getGroups().find((g) => g.id === targetGid)?.nama || targetGid;
      const isCrossGroup = Boolean(srcGid && srcGid !== targetGid);

      const confirmMsg =
        `Pulihkan database dari file backup?\n` +
        `• Grup asal: ${srcGroup}\n` +
        `• Grup aktif: ${activeName}\n` +
        `• ${countAng} Anggota\n` +
        `• ${safeKategori.length} Kategori\n` +
        `• ${countTrx} Transaksi\n` +
        `• ${safeAttachments.length} Bukti Pembayaran\n\n` +
        `Seluruh data server akan DIGANTIKAN. Tindakan ini tidak dapat dibatalkan.`;

      if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
        return showToast('Konfirmasi interaktif tidak tersedia; restore dibatalkan.', 'error');
      }

      if (!window.confirm(confirmMsg)) return;
      if (missingGroupId) {
        const missingMsg =
          `PERINGATAN ID GRUP HILANG:\n` +
          `File backup ini tidak mencantumkan ID grup asal.\n` +
          `Data grup "${activeName}" (${targetGid}) akan digantikan sepenuhnya. Tetap lanjutkan?`;
        if (!window.confirm(missingMsg)) return;
      } else if (isCrossGroup) {
        const crossMsg =
          `PERINGATAN LINTAS GRUP:\n` +
          `Backup ini berasal dari grup "${srcGroup}" (${srcGid}), ` +
          `tetapi grup aktif adalah "${activeName}" (${targetGid}).\n\n` +
          `Seluruh data grup tujuan akan digantikan dengan data dari backup ini. Tetap lanjutkan?`;
        if (!window.confirm(crossMsg)) return;
      }

      if (getActiveGroupId() !== targetGid) {
        return showToast('Grup aktif berubah, restore dibatalkan.', 'warning');
      }

      showToast('Memulihkan database ke server...', 'info');

      const res = await postToBackend<{ transaksi: number; attachments: number }>({
        action: 'restoreSnapshot',
        groupId: targetGid,
        sourceGroupId: srcGid,
        confirmCrossGroup: isCrossGroup,
        data: {
          anggota,
          kategori: safeKategori,
          transaksi,
          skippedMonths: safeSkipped,
          kasStart: typeof kasStart === 'string' ? kasStart : '',
          ...(normalizedPaymentAccount && srcGid === targetGid ? { paymentAccount: normalizedPaymentAccount } : {}),
          attachments: safeAttachments,
          operations: safeOperations
        }
      });

      if (getActiveGroupId() !== targetGid) return;

      if (!res) {
        showToast('Tidak dapat terhubung ke server. Coba lagi saat online.', 'error');
        return;
      }
      if (!res.status) {
        showToast(res.message || 'Restore gagal.', 'error');
        return;
      }

      requestAppRefresh();

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
