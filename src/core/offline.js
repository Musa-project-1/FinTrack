/**
 * @module offline
 * IndexedDB offline queue and synchronization logic.
 */

import {
  openOfflineDB,
  addOfflineItem,
  getOfflineItems,
  deleteOfflineItem
} from './offline-store.js';

import { postToBackend, logAuditEvent } from './api.js';
import { showToast } from './utils.js';
import { getActiveGroupId } from './state.js';

export {
  openOfflineDB,
  addOfflineItem as addOfflineTransaction,
  getOfflineItems as getOfflineTransactions
};

/**
 * Count queued items in IndexedDB belonging to a group.
 * @param {string} [groupId]
 * @returns {Promise<number>}
 */
export const countQueuedTransactions = async (groupId) => {
  try {
    const targetGid = groupId || getActiveGroupId();
    const items = await getOfflineItems();
    if (!Array.isArray(items)) return 0;
    return items.filter((item) => {
      const itemGid = item.payload?.groupId || getActiveGroupId();
      return itemGid === targetGid;
    }).length;
  } catch (err) {
    console.warn('[finkas] countQueuedTransactions error:', err?.message);
    return 0;
  }
};

/**
 * Dispatch truthful queue status event.
 * @param {string} [groupId]
 * @param {'idle' | 'queued' | 'sending' | 'failed'} [queueState='idle']
 * @returns {Promise<number>}
 */
export const emitQueueStatus = async (groupId, queueState = 'idle') => {
  const targetGid = groupId || getActiveGroupId();
  const pendingCount = await countQueuedTransactions(targetGid);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('finkas:queue-changed', {
      detail: { groupId: targetGid, pendingCount, state: queueState }
    }));
  }
  return pendingCount;
};

/**
 * Delete a single queued item and notify listeners of updated count.
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deleteOfflineTransaction = async (id) => {
  await deleteOfflineItem(id);
  await emitQueueStatus(getActiveGroupId(), 'idle');
};

/**
 * Queue a payload for later sync. Stempel groupId agar replay tidak
 * nyasar ke grup lain bila user pindah grup sebelum online.
 * @param {object} payload
 */
export const queueOfflinePayload = async (payload) => {
  const targetGid = payload.groupId || getActiveGroupId();
  const queuedPayload = {
    payload: { ...payload, groupId: targetGid },
    queuedAt: new Date().toISOString()
  };
  await addOfflineItem(queuedPayload);
  await emitQueueStatus(targetGid, 'queued');

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration?.sync?.register('finkas-sync-offline');
    } catch (syncError) {
      console.warn('Background sync unavailable:', syncError);
    }
  }
};

/**
 * Check whether a backend response indicates an expired/missing/unauthorized session.
 * Queued transactions must NEVER be dropped when the session expires; they remain in IDB
 * until the user re-authenticates.
 *
 * @param {object|null} resJSON
 * @returns {boolean}
 */
export const isAuthExpired = (resJSON) => {
  if (!resJSON) return false;
  if (resJSON.unauthorized) return true;
  const status = resJSON.httpStatus;
  if (status === 401 || status === 403) return true;
  const msg = String(resJSON.message || '');
  if (/sesi.*(berakhir|tidak ditemukan|habis|kedaluwarsa)|unauthorized|token.*(expired|invalid|tidak valid)|masuk kembali/i.test(msg)) {
    return true;
  }
  return false;
};

/**
 * Check whether a backend response represents a transient server/network error
 * that should be kept in the offline queue and retried safely (e.g. 5xx, 429 quota).
 *
 * @param {object|null} resJSON
 * @returns {boolean}
 */
export const isRetryableServerError = (resJSON) => {
  if (!resJSON) return true;
  const status = resJSON.httpStatus;
  if (typeof status === 'number' && (status === 429 || status >= 500)) {
    return true;
  }
  const msg = String(resJSON.message || '');
  if (/kuota|quota|429|terlalu banyak permintaan|server error|500|502|503|504/i.test(msg)) {
    return true;
  }
  return false;
};

/**
 * Determine the outcome of a single queued item sync response.
 * Exported so offline sync decision logic can be tested directly without IndexedDB.
 *
 * @param {object|null} resJSON
 * @returns {'unreachable' | 'unauthorized' | 'success' | 'duplicate' | 'rejected'}
 */
export const classifySyncResponse = (resJSON) => {
  if (!resJSON) return 'unreachable';
  if (isAuthExpired(resJSON)) return 'unauthorized';
  if (resJSON.data?.duplicate) return 'duplicate';
  if (resJSON.status) return 'success';
  if (isRetryableServerError(resJSON)) return 'unreachable';
  return 'rejected';
};

/**
 * True when an id belongs to an optimistic row whose create has not been
 * confirmed by the server yet.
 * @param {string} id
 * @returns {boolean}
 */
export const isUnsyncedTempId = (id) => typeof id === 'string' && /-TEMP-/.test(id);

/** Active replay promise to prevent concurrent replay races. */
let activeReplayPromise = null;

/**
 * Sync all pending offline transactions to the backend.
 * Avoids concurrent replay races and aborts cleanly across group switches.
 *
 * @param {Function} [onSuccess] - Called after successful full sync.
 * @returns {Promise<void>}
 */
export const syncOfflineTransactions = (onSuccess) => {
  if (activeReplayPromise) {
    return activeReplayPromise;
  }

  activeReplayPromise = (async () => {
    const replayGroup = getActiveGroupId();
    try {
      const initialCount = await countQueuedTransactions(replayGroup);
      if (initialCount > 0) {
        await emitQueueStatus(replayGroup, 'sending');
      }

      const queued = await getOfflineItems();
      if (!queued.length) {
        await emitQueueStatus(replayGroup, 'idle');
        return;
      }

      let successCount = 0;
      let duplicateCount = 0;
      let skippedOtherGroup = 0;

      for (const item of queued) {
        const currentActive = getActiveGroupId();
        // If user switched group during replay, halt replay of the previous group
        if (currentActive !== replayGroup) {
          console.warn('[finkas] Active group switched during replay, halting obsolete replay');
          break;
        }

        const itemGid = item.payload?.groupId || replayGroup;
        if (itemGid !== replayGroup) {
          skippedOtherGroup += 1;
          continue;
        }

        const payloadToSend = { ...item.payload };
        delete payloadToSend.queuedAt;

        const resJSON = await postToBackend(payloadToSend);
        const outcome = classifySyncResponse(resJSON);

        if (outcome === 'unreachable' || outcome === 'unauthorized') {
          if (outcome === 'unauthorized') {
            showToast('Sesi berakhir. Masuk kembali untuk melanjutkan pengiriman.', 'warning');
          } else {
            showToast('Tidak dapat menyinkronkan transaksi tertunda saat ini.', 'error');
          }
          await emitQueueStatus(replayGroup, 'idle');
          return;
        }

        if (outcome === 'success' || outcome === 'duplicate') {
          await deleteOfflineItem(item.id);
          if (outcome === 'duplicate') {
            duplicateCount += 1;
          } else {
            successCount += 1;
          }
          await emitQueueStatus(replayGroup, 'sending');
        } else {
          console.warn('[finkas] Offline sync item rejected by server:', item.id, resJSON.message);
          await deleteOfflineItem(item.id);
          showToast(`Item antrean dibatalkan server: ${resJSON.message || 'Data tidak valid'}`, 'warning');
          await emitQueueStatus(replayGroup, 'sending');
        }
      }

      await emitQueueStatus(getActiveGroupId(), 'idle');

      if (successCount > 0 || duplicateCount > 0) {
        logAuditEvent('OFFLINE_SYNC', `Rekonsiliasi: ${successCount} tersimpan, ${duplicateCount} duplikat dilewati`);
        const msg = duplicateCount > 0
          ? `Sinkronisasi selesai: ${successCount} transaksi dicatat, ${duplicateCount} dilewati (sudah lunas).`
          : `Terkirim ${successCount} transaksi tertunda.`;
        showToast(skippedOtherGroup > 0 ? `${msg} ${skippedOtherGroup} antrean grup lain menunggu.` : msg, 'success');
        if (onSuccess) onSuccess();
      } else if (skippedOtherGroup > 0) {
        showToast(`${skippedOtherGroup} antrean milik grup lain – pindah grup untuk mengirim.`, 'info');
      }
    } catch (error) {
      console.error('Sync offline transactions failed', error);
      showToast('Gagal menyinkronkan transaksi tertunda.', 'error');
      await emitQueueStatus(getActiveGroupId(), 'idle');
    } finally {
      activeReplayPromise = null;
    }
  })();

  return activeReplayPromise;
};
