/**
 * @module offline-store
 * Pure IndexedDB persistence adapter for offline transactions and queueing.
 *
 * Zero UI or network dependencies — acts as a clean storage adapter at the seam.
 */

import { OFFLINE_DB_NAME, OFFLINE_DB_VERSION, OFFLINE_STORE_NAME } from './config';

/** Open (or create) the IndexedDB instance for offline queueing. */
export const openOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/** Add a payload item to the offline IndexedDB store. */
export const addOfflineItem = async (item: object): Promise<IDBValidKey> => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.add(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

interface OfflineItem {
  id: number;
  queuedAt: string;
  payload: {
    action: string;
    groupId?: string;
    operationId?: string;
    queuedAt?: unknown;
    nama?: string;
    month?: string;
    dataForm?: {
      nominal?: number | string;
      keterangan?: string;
      bulanIuran?: string;
      tahunIuran?: number | string;
    };
    [key: string]: unknown;
  };
}

/** Retrieve all queued items from the offline store. */
export const getOfflineItems = async (): Promise<OfflineItem[]> => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/** Delete a single queued item from the offline store by its key. */
export const deleteOfflineItem = async (id: number): Promise<void> => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
