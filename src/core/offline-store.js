/**
 * @module offline-store
 * Pure IndexedDB persistence adapter for offline transactions and queueing.
 *
 * Zero UI or network dependencies — acts as a clean storage adapter at the seam.
 */

import { OFFLINE_DB_NAME, OFFLINE_DB_VERSION, OFFLINE_STORE_NAME } from './config.js';

/**
 * Open (or create) the IndexedDB instance for offline queueing.
 * @returns {Promise<IDBDatabase>}
 */
export const openOfflineDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }
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
 * Add a payload item to the offline IndexedDB store.
 * @param {object} item
 * @returns {Promise<number>} Auto-generated store key.
 */
export const addOfflineItem = async (item) => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.add(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Retrieve all queued items from the offline store.
 * @returns {Promise<Array>}
 */
export const getOfflineItems = async () => {
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
 * Delete a single queued item from the offline store by its key.
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deleteOfflineItem = async (id) => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
