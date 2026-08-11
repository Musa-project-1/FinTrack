const CACHE_NAME = 'demokas-v2';
const ASSETS = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'https://cdn-icons-png.flaticon.com/512/10433/10433048.png',
  'https://unpkg.com/@phosphor-icons/web@2.1.1/src/index.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch Strategy: Cache Falling Back to Network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

const OFFLINE_DB_NAME = 'demokas-offline-db';
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE_NAME = 'offline-transactions';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxNgvUjtEwupjEZIIBASkM78ksLSlhUfG0X_C5YQuCknNafk6XkmMQ5VVX7XI3s_N9s/exec';

const openOfflineDB = () => {
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

const getOfflineTransactions = async () => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const deleteOfflineTransaction = async (id) => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const sendQueuedOfflineTransactions = async () => {
  try {
    const queued = await getOfflineTransactions();
    if (!queued.length) return;

    for (const item of queued) {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: JSON.stringify(item.payload) })
      });

      if (!response.ok) {
        throw new Error('Server returned ' + response.status);
      }

      const resJSON = await response.json();
      if (resJSON && resJSON.status) {
        await deleteOfflineTransaction(item.id);
      } else {
        throw new Error(resJSON ? resJSON.message || 'Unknown server error' : 'Invalid server response');
      }
    }
  } catch (error) {
    console.warn('Service Worker sync failed:', error);
    throw error;
  }
};

self.addEventListener('sync', (event) => {
  if (event.tag === 'demokas-sync-offline') {
    event.waitUntil(sendQueuedOfflineTransactions());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_OFFLINE') {
    event.waitUntil(sendQueuedOfflineTransactions());
  }
});
