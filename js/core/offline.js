/**
 * @module offline
 * IndexedDB offline queue and synchronization logic.
 */

import { OFFLINE_DB_NAME, OFFLINE_DB_VERSION, OFFLINE_STORE_NAME } from './config.js';
import { postToBackend, logAuditEvent } from './api.js';
import { showToast } from './utils.js';
import { getActiveGroupId } from './state.js';

/**
 * Open (or create) the IndexedDB for offline transactions.
 * @returns {Promise<IDBDatabase>}
 */
export const openOfflineDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Add a single transaction to the offline queue.
 * @param {object} transaction
 * @returns {Promise<number>} The auto-generated key.
 */
export const addOfflineTransaction = async (transaction) => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.add(transaction);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all pending offline transactions.
 * @returns {Promise<Array>}
 */
export const getOfflineTransactions = async () => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete a single offline transaction by its key.
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deleteOfflineTransaction = async (id) => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Queue a payload for later sync. Stempel groupId agar replay tidak
 * nyasar ke grup lain bila user pindah grup sebelum online.
 * @param {object} payload
 */
export const queueOfflinePayload = async (payload) => {
  const queuedPayload = {
    payload: { ...payload, groupId: payload.groupId || getActiveGroupId() },
    queuedAt: new Date().toISOString()
  };
  await addOfflineTransaction(queuedPayload);
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await registration.sync.register('finkas-sync-offline');
    } catch (syncError) {
      console.warn('Background sync unavailable:', syncError);
    }
  }
};

/**
 * Sync all pending offline transactions to the backend.
 * @param {Function} [onSuccess] - Called after successful full sync.
 * @returns {Promise<void>}
 */
export const syncOfflineTransactions = async (onSuccess) => {
  try {
    const queued = await getOfflineTransactions();
    if (!queued.length) return;

    let successCount = 0;
    let duplicateCount = 0;
    let skippedOtherGroup = 0;
    const activeGid = getActiveGroupId();

    for (const item of queued) {
      // Jangan replay antrean grup lain ke grup aktif — biarkan menunggu
      // sampai user kembali ke grup pemiliknya.
      if (item.payload?.groupId && item.payload.groupId !== activeGid) {
        skippedOtherGroup += 1;
        continue;
      }
      const payloadToSend = { ...item.payload };
      delete payloadToSend.queuedAt;

      const resJSON = await postToBackend(payloadToSend);
      if (!resJSON) {
        showToast('Tidak dapat menyinkronkan transaksi tertunda saat ini.', 'error');
        return;
      }

      if (resJSON.status || resJSON.data?.duplicate) {
        await deleteOfflineTransaction(item.id);
        if (resJSON.data?.duplicate) {
          duplicateCount += 1;
        } else {
          successCount += 1;
        }
      } else {
        console.warn('[finkas] Offline sync item rejected by server:', item.id, resJSON.message);
        await deleteOfflineTransaction(item.id);
        showToast(`Item antrean dibatalkan server: ${resJSON.message || 'Data tidak valid'}`, 'warning');
        // Do not abort; continue draining valid items behind this rejected item
      }
    }

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
  }
};
