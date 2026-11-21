const CACHE_NAME = 'finkas-v288';

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
  'css/onboarding-hero-stage.css',
  'css/onboarding-sections.css',
  'css/onboarding-footer-portal.css',
  'css/onboarding-motion.css',
  'css/privacy.css',
  'style.css',
  'src/workspace-boot-theme.js',
  'css/modules/passbook.css',
  'css/modules/groups-superadmin.css',
  'css/modules/pin-input.css',
  'src/ui/pin-input.js',
  'manifest.json',
  'icons/favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'icons/icon-light-192.svg',
  'fonts/ledger/jetbrains-mono-cyrillic-ext.woff2',
  'fonts/ledger/jetbrains-mono-cyrillic.woff2',
  'fonts/ledger/jetbrains-mono-greek.woff2',
  'fonts/ledger/jetbrains-mono-vietnamese.woff2',
  'fonts/ledger/jetbrains-mono-latin-ext.woff2',
  'fonts/ledger/jetbrains-mono-latin.woff2',
  'fonts/ledger/plus-jakarta-sans-cyrillic-ext.woff2',
  'fonts/ledger/plus-jakarta-sans-vietnamese.woff2',
  'fonts/ledger/plus-jakarta-sans-latin-ext.woff2',
  'fonts/ledger/plus-jakarta-sans-latin.woff2',
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
  'src/ui/workspace.js',
  'src/ui/pagination.js',
  'src/ui/bento-dashboard.js',
  'src/ui/spotlight.js',
  'src/ui/dues-status.js',
  'src/ui/kasi-mascot.js',
  'src/ui/kasi-stage.js',
  'src/ui/kasi-effects.js',
  'src/ui/guided-tour.js',
  'css/modules/kasi-mascot.css',
  'css/modules/guided-tour.css',
  'css/modules/hybrid-layout.css',
  'css/modules/hybrid-motion.css',
  'css/modules/hybrid-settings.css',
  'css/modules/hybrid-spotlight.css',
  'src/ui/hybrid-motion.js',
  'src/ui/hybrid-chart.js',
  'css/modules/hybrid-workspace.css',
  'src/core/payment-account.js',
  'src/handlers/payment-account.js',
  'src/handlers/self-pay.js',
  'src/render/receipt.js',
  'css/modules/self-pay.css',
  'src/ui/bulk-dues.js',
  'css/modules/bento-dashboard.css',
  'css/modules/spotlight.css',
  'css/modules/workspace.css',
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
  'src/ui/control-a11y.js',
  'src/ui/mpick.js',
  'src/ui/dpick.js',
  'src/ui/keel.js',
  'src/ui/gestures.js',
  'src/app.js',
  'src/sw-register.js',
  'src/onboarding.js',
  'src/onboarding-boot-theme.js',
  'src/onboarding-stage.js',
  'src/onboarding-motion.js',
  'src/journey.js',
  'src/privacy.js'
];

const OPTIONAL_ASSETS = [
  'assets/hero-atmosphere.webp',
  'assets/mountain-far.webp',
  'assets/mountain-near.webp'
];

// Third-party CDN domains to cache for reliable offline usage
const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// Core shell installation is atomic; decorative assets may fail independently.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(LOCAL_ASSETS);
      await Promise.allSettled(OPTIONAL_ASSETS.map((asset) => cache.add(asset)));
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('finkas-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function offlineResponse() {
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// Register the entire write lifetime synchronously, before any cache lookup settles.
function cacheNetworkResponse(event, network, allowOpaque = false) {
  event.waitUntil(network.then((response) => {
    if (response && (response.ok || (allowOpaque && response.type === 'opaque'))) {
      const copy = response.clone();
      return caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
  }).catch(() => null));
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return;
  if (event.request.method !== 'GET') return;

  if (url.origin === location.origin) {
    const network = fetch(event.request).catch(() => null);
    cacheNetworkResponse(event, network);

    if (event.request.mode === 'navigate') {
      event.respondWith((async () => {
        let timer;
        const timeout = new Promise((resolve) => {
          timer = setTimeout(() => resolve(null), 1500);
        });
        const response = await Promise.race([network, timeout]);
        clearTimeout(timer);
        if (response && response.ok) return response;
        const fallback = (await caches.match('index.html', { cacheName: CACHE_NAME })) ||
          (await caches.match('/', { cacheName: CACHE_NAME })) ||
          (await caches.match('offline.html', { cacheName: CACHE_NAME }));
        return fallback || response || offlineResponse();
      })());
    } else {
      // Warm assets return immediately while the protected network task refreshes them.
      event.respondWith((async () => {
        const cached = await caches.match(event.request, { cacheName: CACHE_NAME, ignoreSearch: true });
        return cached || await network || offlineResponse();
      })());
    }
    return;
  }

  if (CDN_HOSTS.includes(url.hostname)) {
    // A hit never starts a network request; misses retain opaque response support.
    const result = caches.match(event.request, { cacheName: CACHE_NAME }).then(async (cached) => {
      if (cached) return { response: cached, fresh: false };
      const response = await fetch(event.request).catch(() => null);
      return { response, fresh: true };
    });
    event.waitUntil(result.then(({ response, fresh }) => {
      if (fresh && response && (response.ok || response.type === 'opaque')) {
        const copy = response.clone();
        return caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
    }).catch(() => null));
    event.respondWith(result.then(({ response }) => response || offlineResponse()));
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
