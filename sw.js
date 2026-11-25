const CACHE_NAME = 'finkas-v327';

// Local assets including ES modules, stylesheets, icons, and manifest
const LOCAL_ASSETS = [
  '/',
  'index.html',
  'onboarding.html',
  '404.html',
  'privacy.html',
  'offline.html',
  'css/onboarding-scoped.css',
  'style.css',
  'src/workspace-boot-theme.js',
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
  'src/ui/svelte-dashboard.js',
  'src/ui/svelte-onboarding.js',
  'src/app.js',
  'src/sw-register.js',
  'src/pages/onboarding.js',
  'src/pages/onboarding-boot-theme.js',
  'src/pages/privacy.js',
  'src/pages/offline.js'
];

const OPTIONAL_ASSETS = [
  'assets/hero-atmosphere.webp',
  'assets/mountain-far.webp',
  'assets/mountain-near.webp'
];

// Third-party CDN domains allowed for HTTPS CORS-verified caching
const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

const STATIC_ASSET_PATHS = new Set(
  LOCAL_ASSETS.concat(OPTIONAL_ASSETS).map((p) => (p === '/' ? '/' : '/' + p.replace(/^\/+/, '')))
);

function normalizePathname(pathname) {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (_) {}
  return decoded.replace(/\/+/g, '/');
}

function isApiRequest(url) {
  if (url.origin !== location.origin) return false;
  const rawCollapsed = url.pathname.replace(/\/+/g, '/');
  const decodedCollapsed = normalizePathname(url.pathname);
  return /^\/+api(\/|$)/i.test(rawCollapsed) || /^\/+api(\/|$)/i.test(decodedCollapsed);
}

function getLocalCacheKey(url) {
  const normPath = url.pathname.replace(/\/+/g, '/') || '/';
  if (STATIC_ASSET_PATHS.has(normPath)) {
    return `${url.origin}${normPath}`;
  }
  return `${url.origin}${normPath}${url.search}`;
}

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

// Chromium aborts navigation responses whose `redirected` flag is true or type is opaqueredirect.
function cleanResponse(response) {
  if (!response || response.type === 'opaqueredirect') return null;
  if (!response.redirected) return response;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// Register the entire write lifetime synchronously, before any cache lookup settles.
// Only cache non-redirected, OK same-origin or CORS responses (never opaque or error responses).
function cacheNetworkResponse(event, cacheKey, network) {
  event.waitUntil(network.then((response) => {
    if (response && response.ok && !response.redirected && response.type !== 'opaqueredirect') {
      const copy = response.clone();
      return caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
    }
  }).catch(() => null));
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (isApiRequest(url)) return;
  if (event.request.method !== 'GET') return;

  if (url.origin === location.origin) {
    const isNavigate = event.request.mode === 'navigate';
    const cacheKey = getLocalCacheKey(url);
    const rawNetwork = (isNavigate ? fetch(event.request.url) : fetch(event.request))
      .catch(() => null);
    cacheNetworkResponse(event, cacheKey, rawNetwork);
    const network = rawNetwork.then((res) => (isNavigate ? cleanResponse(res) : res));

    if (isNavigate) {
      event.respondWith((async () => {
        let timer;
        const timeout = new Promise((resolve) => {
          timer = setTimeout(() => resolve(null), 1500);
        });
        const response = await Promise.race([network, timeout]);
        clearTimeout(timer);
        if (response !== null) return response;
        const exact = cleanResponse(
          await caches.match(cacheKey, { cacheName: CACHE_NAME })
        );
        if (exact) return exact;
        const fallback = cleanResponse(
          (await caches.match('index.html', { cacheName: CACHE_NAME })) ||
          (await caches.match('/', { cacheName: CACHE_NAME })) ||
          (await caches.match('offline.html', { cacheName: CACHE_NAME }))
        );
        return fallback || offlineResponse();
      })());
    } else {
      // Warm assets return immediately while the protected network task refreshes them.
      event.respondWith((async () => {
        const cached = await caches.match(cacheKey, { cacheName: CACHE_NAME });
        return cached || await network || offlineResponse();
      })());
    }
    return;
  }

  if (url.protocol === 'https:' && CDN_HOSTS.includes(url.hostname)) {
    // A hit never starts a network request; cache strictly requires CORS response.ok (no opaque caching).
    const result = caches.match(event.request, { cacheName: CACHE_NAME }).then(async (cached) => {
      if (cached) return { response: cached, fresh: false };
      const response = await fetch(event.request).catch(() => null);
      return { response, fresh: true };
    });
    event.waitUntil(result.then(({ response, fresh }) => {
      if (fresh && response && response.ok && !response.redirected) {
        const copy = response.clone();
        return caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
    }).catch(() => null));
    event.respondWith(result.then(({ response }) => response || offlineResponse()));
  }
});

// Sync handler — notify controlled window clients to sync the offline queue cleanly via offline.ts
self.addEventListener('sync', (event) => {
  if (event.tag === 'finkas-sync-offline') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList && clientList.length > 0) {
          clientList.forEach((client) => client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' }));
        }
      })
    );
  }
});
