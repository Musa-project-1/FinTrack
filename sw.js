const CACHE_NAME = 'finkas-v122';

// Local assets including ES modules, stylesheets, icons, and manifest
const LOCAL_ASSETS = [
  '/',
  'index.html',
  'onboarding.html',
  '404.html',
  'privacy.html',
  'css/onboarding.css',
  'style.css',
  'manifest.json',
  'icons/favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'icons/icon-light-192.svg',
  'fonts/phosphor/phosphor.css',
  'fonts/phosphor/regular/style.css',
  'fonts/phosphor/regular/Phosphor.woff2',
  'fonts/phosphor/bold/style.css',
  'fonts/phosphor/bold/Phosphor-Bold.woff2',
  'fonts/phosphor/fill/style.css',
  'fonts/phosphor/fill/Phosphor-Fill.woff2',
  'fonts/phosphor/duotone/style.css',
  'fonts/phosphor/duotone/Phosphor-Duotone.woff2',
  'fonts/phosphor/light/style.css',
  'fonts/phosphor/light/Phosphor-Light.woff2',
  'fonts/phosphor/thin/style.css',
  'fonts/phosphor/thin/Phosphor-Thin.woff2',
  'js/core/config.js',
  'js/core/utils.js',
  'js/core/state.js',
  'js/core/api-client.js',
  'js/core/api.js',
  'js/core/api-auth.js',
  'js/core/offline.js',
  'js/core/analytics.js',
  'js/ui/theme.js',
  'js/ui/modal.js',
  'js/render.js',
  'js/render/dashboard.js',
  'js/render/rekap.js',
  'js/render/transactions.js',
  'js/render/profile.js',
  'js/handlers/auth.js',
  'js/handlers/backup.js',
  'js/handlers/export.js',
  'js/handlers/master.js',
  'js/handlers/navigation.js',
  'js/handlers/offlineQueue.js',
  'js/handlers/transactions.js',
  'js/handlers/groups.js',
  'js/ui/cdrop.js',
  'js/ui/mpick.js',
  'js/app.js',
  'js/sw-register.js',
  'js/onboarding.js'
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
      const results = await Promise.allSettled(
        LOCAL_ASSETS.map((asset) => cache.add(asset))
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn('SW install: failed to cache some assets', failed);
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
        .catch(async () => {
          const cached = await caches.match(event.request, { ignoreSearch: true });
          return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        })
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
