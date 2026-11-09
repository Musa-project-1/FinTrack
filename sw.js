const CACHE_NAME = 'finkas-v188';

// Local assets including ES modules, stylesheets, icons, and manifest
const LOCAL_ASSETS = [
  '/',
  'index.html',
  'onboarding.html',
  '404.html',
  'privacy.html',
  'offline.html',
  'css/onboarding.css',
  'css/onboarding-icons.css',
  'css/onboarding-motion.css',
  'style.css',
  'manifest.json',
  /* Bagian 14 — latar panggung langit→bumi. 375,6 KB, di bawah anggaran
     400 KB di Fase 0.5, jadi ia boleh di-precache supaya landing tetap utuh
     saat offline — tanpa ini panggungnya kehilangan langitnya. */
  'assets/hero-atmosphere.png',
  'assets/hero-atmosphere.webp',
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
  'src/core/config.js',
  'src/core/utils.js',
  'src/core/state.js',
  'src/core/api-client.js',
  'src/core/api.js',
  'src/core/api-auth.js',
  'src/core/offline.js',
  'src/core/offline-store.js',
  'src/core/mutation.js',
  'src/core/analytics.js',
  'src/core/sync.js',
  'src/core/cash-report.js',
  'src/core/dues.js',
  'src/handlers/attachments.js',
  'src/handlers/cash-report.js',
  'src/ui/save-status.js',
  'src/ui/theme.js',
  'src/ui/modal.js',
  'src/ui/transaction-form.js',
  'src/render.js',
  'src/render/dashboard.js',
  'src/render/rekap.js',
  'src/render/transactions.js',
  'src/render/profile.js',
  'src/handlers/auth.js',
  'src/handlers/backup.js',
  'src/handlers/export.js',
  'src/handlers/master.js',
  'src/handlers/navigation.js',
  'src/handlers/offlineQueue.js',
  'src/handlers/transaction-shared.js',
  'src/handlers/quickpay.js',
  'src/handlers/transactions.js',
  'src/handlers/groups.js',
  'src/ui/cdrop.js',
  'src/ui/mpick.js',
  'src/ui/keel.js',
  'src/ui/gestures.js',
  'src/app.js',
  'src/sw-register.js',
  'src/onboarding.js',
  'src/journey.js'
];

// Third-party CDN domains to cache for reliable offline usage
const CDN_HOSTS = [
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

  // API responses are per-session and must never land in Cache Storage.
  // The gateway is POST-only today; this keeps a future GET from being stored.
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    return;
  }

  // 1. Local origin assets: network-first with a 3s timeout, fallback to cache.
  //    A hard network-first (no timeout) made every load on a slow-but-connected
  //    link wait for the network to fail before serving the cache; racing a
  //    timeout keeps the app responsive while the background fetch still
  //    refreshes the cache when it eventually resolves.
  if (url.origin === location.origin && event.request.method === 'GET') {
    event.respondWith((async () => {
      const cachedPromise = caches.match(event.request, { cacheName: CACHE_NAME, ignoreSearch: true });

      const networkPromise = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => null);

      const timeout = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 3000));
      const winner = await Promise.race([networkPromise, timeout]);
      if (winner && winner !== 'TIMEOUT') return winner;

      // Network slow or failed — serve cache if we have it (the fetch above
      // keeps running and refreshes the cache for next time).
      const cached = await cachedPromise;
      if (cached) return cached;

      // Nothing cached: wait out the network rather than failing early.
      const net = await networkPromise;
      if (net) return net;

      // Offline navigation fallback: serve cached app shell so PWA functions offline
      if (event.request.mode === 'navigate') {
        const appShell = (await caches.match('index.html', { cacheName: CACHE_NAME })) ||
                         (await caches.match('/', { cacheName: CACHE_NAME }));
        if (appShell) return appShell;

        const offlinePage = await caches.match('offline.html', { cacheName: CACHE_NAME });
        if (offlinePage) return offlinePage;
      }

      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    })());
    return;
  }

  // 2. External CDN assets (Chart.js, Phosphor Icons, Google Fonts): Cache-first
  if (CDN_HOSTS.includes(url.hostname) && event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request, { cacheName: CACHE_NAME }).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) {
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
