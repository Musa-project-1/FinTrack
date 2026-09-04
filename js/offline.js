/**
 * @module offline
 * IndexedDB offline queue and synchronization logic.
 */

import { OFFLINE_DB_NAME, OFFLINE_DB_VERSION, OFFLINE_STORE_NAME } from './config.js';
import { postToBackend } from './api.js';
import { showToast } from './utils.js';

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
 * Queue a payload for later sync. Attempts to register Background Sync.
 * @param {object} payload
 */
export const queueOfflinePayload = async (payload) => {
  const queuedPayload = {
    payload,
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

    for (const item of queued) {
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
          showToast(`Transaksi duplikat dilewati: ${resJSON.message}`, 'success');
        } else {
          successCount += 1;
        }
      } else {
        showToast(`Sinkronisasi gagal: ${resJSON.message}`, 'error');
        return;
      }
    }

    if (successCount > 0) {
      showToast(`Terkirim ${successCount} transaksi tertunda.`, 'success');
      if (onSuccess) onSuccess();
    }
  } catch (error) {
    console.error('Sync offline transactions failed', error);
    showToast('Gagal menyinkronkan transaksi tertunda.', 'error');
  }
};
