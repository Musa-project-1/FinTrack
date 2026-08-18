const CACHE_NAME = 'demokas-v4';

// Local assets including ES modules and old script.js as fallback
const LOCAL_ASSETS = [
  '/',
  'index.html',
  'style.css',
  'manifest.json',
  'js/config.js',
  'js/utils.js',
  'js/state.js',
  'js/api.js',
  'js/offline.js',
  'js/theme.js',
  'js/modal.js',
  'js/render.js',
  'js/app.js'
];

// Install — cache local assets, fail gracefully
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(LOCAL_ASSETS);
      } catch (err) {
        console.warn('SW install: failed to cache some assets', err);
      }
    })
  );
  self.skipWaiting();
});

// Activate — purge old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first for local, network-first for external
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only use cache-first for same-origin requests
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
  // External requests (CDN, etc.) go straight to network — no CORS issues
});

/* ── Offline queue sync ────────────────────────────────────────── */

const OFFLINE_DB_NAME = 'demokas-offline-db';
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE_NAME = 'offline-transactions';

// GAS_URL imported from config is not available in SW context (no importScripts
// in module scope for ES modules). Duplicated here intentionally — single source
// of truth lives in js/config.js for the main thread.
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwvRbsRZXKCuU64dZPvJ0c4K3-RggIgM9VKKoDoVVmTSF4jebfN4izABgMG8O6pT0B-/exec';

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
