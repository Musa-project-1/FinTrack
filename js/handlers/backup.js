/**
 * @module handlers/backup
 * Disaster Recovery: Full JSON Snapshot Backup & Restore.
 */

import { getState, setState, saveCache, getIsAdminSession, getActiveGroupId, getGroups } from '../core/state.js';
import { postToBackend, logAuditEvent } from '../core/api.js';
import { showToast, escapeHtml } from '../core/utils.js';
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
      const countTrx = transaksi.length;
      const countAng = anggota.length;
      const srcGroup = content.group?.nama || content.group?.id || 'tak diketahui';
      const activeGid = getActiveGroupId();
      const activeName = getGroups().find((g) => g.id === activeGid)?.nama || activeGid;

      const confirmMsg = `Pulihkan database dari file backup?\n• Grup asal: ${srcGroup}\n• Grup aktif: ${activeName}\n• ${countAng} Anggota\n• ${kategori.length} Kategori\n• ${countTrx} Transaksi\n\nData lokal akan diperbarui dan diselaraskan.`;
      if (!window.confirm(confirmMsg)) return;
      if (content.group?.id && content.group.id !== activeGid) {
        if (!window.confirm(`Backup milik grup "${srcGroup}", tujuan "${activeName}". Tetap lanjutkan ke grup aktif?`)) return;
      }

      // Update state and save cache immediately
      setState({
        anggota: anggota || [],
        kategori: kategori || [],
        transaksi: transaksi || [],
        skippedMonths: skippedMonths || []
      });
      saveCache();
      renderAll();

      logAuditEvent('RESTORE_DATABASE', `Database dipulihkan: ${countTrx} trx, ${countAng} anggota`);
      showToast(`Database berhasil dipulihkan (${countTrx} transaksi)!`, 'success');
      closeModal('modal-export');
    } catch (err) {
      console.error('Restore error:', err);
      showToast('Gagal membaca file backup JSON.', 'error');
    }
  };

  reader.readAsText(file);
};
