const CACHE_NAME = 'finkas-v68';

// Local assets including ES modules, stylesheets, icons, and manifest
const LOCAL_ASSETS = [
  '/',
  'index.html',
  'style.css',
  'manifest.json',
  'icons/favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'icons/icon-light-192.svg',
  'js/config.js',
  'js/utils.js',
  'js/state.js',
  'js/api.js',
  'js/offline.js',
  'js/theme.js',
  'js/modal.js',
  'js/render.js',
  'js/render/dashboard.js',
  'js/render/rekap.js',
  'js/render/transactions.js',
  'js/render/profile.js',
  'js/handlers/auth.js',
  'js/handlers/export.js',
  'js/handlers/master.js',
  'js/handlers/navigation.js',
  'js/handlers/offlineQueue.js',
  'js/handlers/transactions.js',
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

// Fetch — network-first for local files (always fresh when online),
// fall back to cache when offline. External requests go to network.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin === location.origin && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

/* ── Offline queue sync ────────────────────────────────────────── */

const OFFLINE_DB_NAME = 'finkas-offline-db';
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE_NAME = 'offline-transactions';

// Firebase Firestore Project Configuration for Background Sync
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/finkas-kas/databases/(default)/documents';

const toFirestoreFields = (obj) => {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) fields[key] = { nullValue: null };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (typeof val === 'number') fields[key] = { doubleValue: val };
    else if (Array.isArray(val)) {
      fields[key] = { arrayValue: { values: val.map((v) => ({ stringValue: String(v) })) } };
    } else {
      fields[key] = { stringValue: String(val) };
    }
  }
  return fields;
};

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
      const payload = item.payload || {};
      const dataForm = payload.dataForm || {};
      const idTrx = 'TRX-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const doc = {
        ID_Transaksi: idTrx,
        Timestamp: new Date().toISOString(),
        Tipe_Arus: dataForm.tipeArus || 'Masuk',
        ID_Kategori: dataForm.idKategori || '-',
        ID_Anggota: dataForm.idAnggota || '-',
        Bulan_Iuran: dataForm.bulanIuran || '-',
        Tahun_Iuran: dataForm.tahunIuran || '-',
        Nominal: Number(dataForm.nominal) || 0,
        Keterangan: dataForm.keterangan || ''
      };

      const response = await fetch(`${FIRESTORE_BASE}/transaksi/${idTrx}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(doc) })
      });

      if (response.ok) {
        await deleteOfflineTransaction(item.id);
      }
    }
  } catch (error) {
    console.warn('Service Worker sync failed:', error);
    throw error;
  }
};

self.addEventListener('sync', (event) => {
  if (event.tag === 'finkas-sync-offline') {
    event.waitUntil(sendQueuedOfflineTransactions());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_OFFLINE') {
    event.waitUntil(sendQueuedOfflineTransactions());
  }
});
