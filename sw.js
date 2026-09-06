const CACHE_NAME = 'finkas-v86';

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

// Third-party CDN domains to cache for reliable offline usage
const CDN_HOSTS = [
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
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

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Local origin assets: Network-first, fallback to cache with ignoreSearch: true
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
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  // 2. External CDN assets (Chart.js, Phosphor Icons, Google Fonts): Cache-first
  if (CDN_HOSTS.includes(url.hostname) && event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => cached || new Response('', { status: 408, statusText: 'Offline' }));
      })
    );
    return;
  }
});

// Sync handler — notify active window clients to sync the offline queue cleanly via offline.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'finkas-sync-offline') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList && clientList.length > 0) {
          clientList.forEach((client) => client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' }));
        }
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_OFFLINE') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList && clientList.length > 0) {
          clientList.forEach((client) => client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' }));
        }
      })
    );
  }
});
