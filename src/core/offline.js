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

const normalizeGroupId = (groupId) => typeof groupId === 'string' ? groupId.trim() : '';

/** Return counts only, excluding legacy rows without a group. */
export const countQueuedTransactionsByGroup = async () => {
  if (typeof indexedDB === 'undefined') return {};
  try {
    const counts = new Map();
    for (const item of await getOfflineItems()) {
      const gid = normalizeGroupId(item?.payload?.groupId);
      if (gid) counts.set(gid, (counts.get(gid) || 0) + 1);
    }
    return Object.fromEntries(counts);
  } catch {
    return {};
  }
};

/** Read only the target group's rows and count the remaining rows anonymously. */
export const getGroupOfflineTransactions = async (groupId = getActiveGroupId()) => {
  const targetGid = normalizeGroupId(groupId || getActiveGroupId());
  const rows = await getOfflineItems();
  /** @type {any[]} */
  const items = [];
  let otherGroupCount = 0;
  let unscopedCount = 0;
  for (const item of Array.isArray(rows) ? rows : []) {
    const gid = normalizeGroupId(item?.payload?.groupId);
    if (!gid) unscopedCount++;
    else if (gid === targetGid) items.push(item);
    else otherGroupCount++;
  }
  return { groupId: targetGid, items, otherGroupCount, unscopedCount };
};

/**
 * Count queued items in IndexedDB belonging to a group.
 * @param {string} [groupId]
 * @returns {Promise<number>}
 */
export const countQueuedTransactions = async (groupId = getActiveGroupId()) => {
  const targetGid = normalizeGroupId(groupId || getActiveGroupId());
  if (!targetGid) return 0;
  try {
    const { items } = await getGroupOfflineTransactions(targetGid);
    return items.length;
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
  const targetGid = normalizeGroupId(groupId || getActiveGroupId());
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
 * @param {string} [expectedGroupId]
 * @returns {Promise<boolean>}
 */
export const deleteOfflineTransaction = async (id, expectedGroupId = '') => {
  const guardGid = normalizeGroupId(expectedGroupId);
  if (guardGid) {
    const { items } = await getGroupOfflineTransactions(guardGid);
    if (!items.some((item) => item.id === id)) return false;
  }
  await deleteOfflineItem(id);
  await emitQueueStatus(guardGid || getActiveGroupId(), 'idle');
  return true;
};

/**
 * Queue a payload for later sync. Stempel groupId agar replay tidak
 * nyasar ke grup lain bila user pindah grup sebelum online.
 * @param {{groupId?: string}} payload
 */
export const queueOfflinePayload = async (payload) => {
  const targetGid = normalizeGroupId(payload?.groupId || getActiveGroupId());
  if (!targetGid) throw new Error('ID grup aktif belum dipilih untuk antrean offline.');
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
 * @param {{status: boolean, unauthorized?: boolean, httpStatus?: number, message?: string, data?: {duplicate?: boolean}|null}|null} resJSON
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
 * @param {{status: boolean, unauthorized?: boolean, httpStatus?: number, message?: string, data?: {duplicate?: boolean}|null}|null} resJSON
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
 * @param {{status: boolean, unauthorized?: boolean, httpStatus?: number, message?: string, data?: {duplicate?: boolean}|null}|null} resJSON
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
/** @type {Promise<void>|null} */
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

  const replayGroup = normalizeGroupId(getActiveGroupId());
  if (!replayGroup) return Promise.resolve();

  activeReplayPromise = (async () => {
    let switchedGroup = false;
    const markSwitched = () => { switchedGroup = true; };
    const stillSameGroup = () => !switchedGroup && normalizeGroupId(getActiveGroupId()) === replayGroup;
    if (typeof window !== 'undefined') window.addEventListener('finkas:group-changed', markSwitched);
    let successCount = 0;
    let duplicateCount = 0;
    let skippedUnscoped = 0;
    let skippedOtherGroup = 0;
    try {
      const queued = await getOfflineItems();
      if (queued.some((item) => normalizeGroupId(item?.payload?.groupId) === replayGroup)) {
        await emitQueueStatus(replayGroup, 'sending');
      }

      for (const item of queued) {
        if (!stillSameGroup()) {
          switchedGroup = true;
          console.warn('[finkas] Active group switched during replay, halting obsolete replay');
          break;
        }

        const itemGid = normalizeGroupId(item?.payload?.groupId);
        if (!itemGid) {
          skippedUnscoped++;
          continue;
        }
        if (itemGid !== replayGroup) {
          skippedOtherGroup += 1;
          continue;
        }

        const payloadToSend = { ...item.payload, groupId: replayGroup };
        delete payloadToSend.queuedAt;

        const resJSON = await postToBackend(payloadToSend);
        if (!stillSameGroup()) switchedGroup = true;
        const outcome = classifySyncResponse(resJSON);

        if (outcome === 'unreachable' || outcome === 'unauthorized') {
          if (switchedGroup) return;
          if (outcome === 'unauthorized') {
            showToast('Sesi berakhir. Masuk kembali untuk melanjutkan pengiriman.', 'warning');
          } else {
            showToast('Tidak dapat menyinkronkan transaksi tertunda saat ini.', 'error');
          }
          return;
        }

        await deleteOfflineItem(item.id);
        if (outcome === 'success') successCount++;
        else if (outcome === 'duplicate') duplicateCount++;
        else if (stillSameGroup()) {
          showToast(`Item antrean dibatalkan server: ${resJSON?.message || 'Data tidak valid'}`, 'warning');
        }
        await emitQueueStatus(replayGroup, 'sending');
      }
    } catch (error) {
      console.error('Sync offline transactions failed', error);
      if (stillSameGroup()) showToast('Gagal menyinkronkan transaksi tertunda.', 'error');
      return;
    } finally {
      await emitQueueStatus(replayGroup, 'idle');
      if (!stillSameGroup()) await emitQueueStatus(getActiveGroupId(), 'idle');
      if (typeof window !== 'undefined') window.removeEventListener('finkas:group-changed', markSwitched);
    }

    if (!stillSameGroup()) return;
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
    if (!successCount && !duplicateCount && skippedUnscoped) {
      showToast(`${skippedUnscoped} antrean lama tanpa ID grup dilewati demi isolasi data.`, 'warning');
    }
  })().finally(() => { activeReplayPromise = null; });

  return activeReplayPromise;
};
