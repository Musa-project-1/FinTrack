import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

import {
  API,
  CACHE_KEY,
  ACTIVE_GROUP_KEY,
  ACTIVE_GROUP_NAME_KEY,
  GROUP_OPEN_KEY,
  GROUP_SESSIONS_KEY,
  DEFAULT_GROUP_ID,
  apiPost,
  dataRequest,
  loginAdminApi,
  logoutAdminApi,
  setActiveGroupId,
  getActiveGroupId,
  setState,
  getState,
  saveCache,
  loadCache,
  clearCache,
  clearAllCaches,
  resetLedgerState,
  setGroupSession,
  getGroupSession,
  clearAllGroupSessions,
  setAdminSession,
  getAdminSession,
  setAdminRole,
  setAdminEmail,
  clearAdminSession,
  queueOfflinePayload,
  syncOfflineTransactions,
  deleteOfflineTransaction,
  addOfflineTransaction,
  getOfflineTransactions,
  renderOfflineQueueList,
  openOfflineQueueModal,
  restoreJSONBackup,
  exportToCSV,
  cetakStruk,
  cetakLaporanTahunan,
  initAnalytics,
  initSync,
  destroySync,
  notifySynced
} from '../src/ui/svelte-dashboard.js';

function installMockIndexedDB() {
  const stores = { 'offline-transactions': [] };
  let autoId = 1;
  globalThis.indexedDB = {
    open() {
      const req = {
        result: {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => {},
          transaction: (name) => ({
            objectStore: () => ({
              add: (val) => {
                const entry = { ...val, id: autoId++ };
                stores[name].push(entry);
                const r = { result: entry.id };
                queueMicrotask(() => r.onsuccess?.({ target: r }));
                return r;
              },
              getAll: () => {
                const r = { result: stores[name].map((item) => structuredClone(item)) };
                queueMicrotask(() => r.onsuccess?.({ target: r }));
                return r;
              },
              delete: (id) => {
                const idx = stores[name].findIndex((x) => x.id === id);
                if (idx !== -1) stores[name].splice(idx, 1);
                const r = {};
                queueMicrotask(() => r.onsuccess?.({ target: r }));
                return r;
              }
            })
          })
        }
      };
      queueMicrotask(() => req.onsuccess?.({ target: req }));
      return req;
    }
  };
}

function createSwHarness(overrides = {}) {
  const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const listeners = {};
  const calls = { puts: [], matchCalls: [], matchAllOpts: [], clientMsgs: [] };
  const cache = {
    addAll: async () => {},
    add: async () => {},
    put: async (key, value) => { calls.puts.push([key, value]); },
    ...overrides.cache
  };
  const caches = {
    open: async () => cache,
    match: async (key, options) => {
      calls.matchCalls.push([key, options]);
      return overrides.match ? overrides.match(key, options) : undefined;
    },
    keys: async () => [],
    delete: async () => {},
    ...overrides.caches
  };
  vm.runInNewContext(source, {
    URL,
    Response,
    location: { origin: 'https://finkas.test' },
    caches,
    fetch: overrides.fetch || (async () => new Response('ok')),
    setTimeout: () => 1,
    clearTimeout: () => {},
    self: {
      addEventListener: (name, fn) => { listeners[name] = fn; },
      skipWaiting: async () => {},
      clients: {
        claim: async () => {},
        matchAll: async (opts) => {
          calls.matchAllOpts.push(opts);
          return [{ postMessage: (msg) => calls.clientMsgs.push(msg) }];
        }
      }
    }
  });
  return {
    calls,
    listeners,
    dispatchFetch(url, mode = 'cors', method = 'GET') {
      const pending = [];
      let response;
      listeners.fetch({
        request: { url, mode, method },
        waitUntil: (p) => pending.push(p),
        respondWith: (p) => { response = p; }
      });
      return { response, done: () => Promise.all(pending) };
    }
  };
}

let dom;
let prevFetch;
let prevBC;
let prevNavDesc;

function installDom(html = '<!doctype html><html><head></head><body><div id="toast-container"></div><div id="offline-queue-list"></div><button id="btn-sync-offline-now"></button><dialog id="modal-offline-queue"></dialog></body></html>') {
  dom?.window.close();
  dom = new JSDOM(html, { url: 'https://finkas.test' });
  prevNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  for (const key of ['window', 'document', 'Element', 'HTMLElement', 'Node', 'Text', 'Comment', 'MutationObserver', 'Event', 'CustomEvent', 'FileReader', 'Blob', 'URL']) {
    globalThis[key] = dom.window[key];
  }
  Object.defineProperty(dom.window.navigator, 'onLine', { configurable: true, get: () => true });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  globalThis.cancelAnimationFrame = clearTimeout;
  globalThis.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  globalThis.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  localStorage.clear();
  clearAdminSession();
  clearAllGroupSessions();
  resetLedgerState();
}

beforeEach(() => {
  prevFetch = globalThis.fetch;
  prevBC = globalThis.BroadcastChannel;
  installDom();
  installMockIndexedDB();
});

afterEach(() => {
  destroySync();
  globalThis.fetch = prevFetch;
  globalThis.BroadcastChannel = prevBC;
  if (prevNavDesc) {
    Object.defineProperty(globalThis, 'navigator', prevNavDesc);
  }
  dom?.window.close();
  dom = null;
});

/* ── SEC-03: Client logout endpoint ────────────────────────────────────────── */

test('SEC-03: API.LOGOUT is defined and logoutAdminApi posts sessionToken then clears local sessions', async () => {
  assert.equal(API.LOGOUT, '/api/logout');
  setActiveGroupId('GRP-OUT');
  setAdminSession('tok-admin-logout');
  setGroupSession('GRP-OUT', 'tok-admin-logout');

  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return Response.json({ status: true });
  };

  await logoutAdminApi();
  assert.deepEqual(calls.map((c) => c.url), ['/api/logout']);
  assert.equal(calls[0].body.sessionToken, 'tok-admin-logout');
  assert.equal(getAdminSession(), '');
  assert.equal(getGroupSession('GRP-OUT'), '');

  // Late 401 from pre-logout/pre-relogin request must not clobber a new session or emit finkas:session-expired
  setAdminSession('tok-old');
  setGroupSession('GRP-OUT', 'tok-old');
  let expiredOnStale = 0;
  const onExpired = () => { expiredOnStale++; };
  window.addEventListener('finkas:session-expired', onExpired);
  const inFlight = Promise.withResolvers();
  globalThis.fetch = () => inFlight.promise;
  const staleReq = dataRequest({ action: 'read', groupId: 'GRP-OUT', needsWrite: true });
  setAdminSession('tok-new');
  setGroupSession('GRP-OUT', 'tok-new');
  inFlight.resolve(Response.json({ status: false, message: 'Expired' }, { status: 401 }));
  await staleReq;
  window.removeEventListener('finkas:session-expired', onExpired);
  assert.equal(getAdminSession(), 'tok-new');
  assert.equal(getGroupSession('GRP-OUT'), 'tok-new');
  assert.equal(expiredOnStale, 0);

  // Also clears session cleanly when offline/fetch fails
  setAdminSession('tok-offline-logout');
  globalThis.fetch = async () => { throw new Error('offline'); };
  await logoutAdminApi();
  assert.equal(getAdminSession(), '');
});

/* ── SEC-08 / PWA-01: Cache clearing & workspace auth gating ───────────────── */

test('SEC-08: clearCache, clearAllCaches, and resetLedgerState purge PII caches and active group markers', () => {
  setActiveGroupId('GRP-PII-1');
  setState({
    anggota: [{ ID_Anggota: 'A1', Nama_Anggota: 'Rahasia' }],
    kategori: [{ ID_Kategori: 'K1', Nama_Kategori: 'Iuran' }],
    transaksi: [{ ID_Transaksi: 'T1', Tipe_Arus: 'Masuk', Nominal: 10000, Timestamp: '2026-01-01' }]
  });
  saveCache('GRP-PII-1');
  localStorage.setItem('finkas_spotlight:GRP-PII-1', 'A1');
  localStorage.setItem(`${CACHE_KEY}:GRP-PII-2`, '{"anggota":[]}');
  localStorage.setItem(CACHE_KEY, '{"anggota":[]}');
  localStorage.setItem(ACTIVE_GROUP_NAME_KEY, 'Group Satu');
  localStorage.setItem(GROUP_OPEN_KEY, '1');
  localStorage.setItem('theme', 'dark');

  clearCache('GRP-PII-1');
  assert.equal(localStorage.getItem(`${CACHE_KEY}:GRP-PII-1`), null);
  assert.equal(localStorage.getItem('finkas_spotlight:GRP-PII-1'), null);
  assert.ok(localStorage.getItem(`${CACHE_KEY}:GRP-PII-2`), 'other group cache must remain on clearCache(gid)');

  clearCache(DEFAULT_GROUP_ID);
  assert.equal(localStorage.getItem(CACHE_KEY), null);

  clearAllCaches();
  assert.equal(localStorage.getItem(`${CACHE_KEY}:GRP-PII-2`), null);
  assert.equal(localStorage.getItem('theme'), 'dark');

  resetLedgerState();
  assert.deepEqual(getState(), {
    anggota: [],
    kategori: [],
    transaksi: [],
    skippedMonths: [],
    kasStart: '',
    paymentAccount: null
  });
  assert.equal(getActiveGroupId(), '');
  assert.equal(localStorage.getItem(ACTIVE_GROUP_KEY), null);
  assert.equal(localStorage.getItem(ACTIVE_GROUP_NAME_KEY), null);
  assert.equal(localStorage.getItem(GROUP_OPEN_KEY), null);
});

test('SEC-08: loadWorkspace checks session token before rendering cached PII', () => {
  const appSrc = readFileSync(new URL('../src/svelte/app.ts', import.meta.url), 'utf8');
  assert.match(appSrc, /resolveSessionToken\(group,\s*false\)[\s\S]*loadCache\(group\)/);
  assert.match(appSrc, /if\s*\(resJSON\?\.unauthorized\)\s*\{[\s\S]*clearCache\(group\);[\s\S]*resetLedgerState/);
});

/* ── SEC-09 / PWA-02: Offline queue allowlist, initiator scope, admin guards ── */

test('SEC-09: queueOfflinePayload enforces allowlist and rejects privileged/unsupported actions', async () => {
  setActiveGroupId('GRP-Q1');
  setAdminSession('tok-q1');

  for (const forbidden of ['restoreSnapshot', 'setPaymentAccount', 'uploadAttachment', 'deleteAttachment', 'uploadProof']) {
    await assert.rejects(
      queueOfflinePayload({ action: forbidden, groupId: 'GRP-Q1' }),
      /tidak diizinkan/
    );
  }
  await queueOfflinePayload({ action: 'setKasStart', kasStart: '01-2026', groupId: 'GRP-Q1' });
  const rows = await getOfflineTransactions();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].payload.action, 'setKasStart');
  assert.ok(typeof rows[0].initiatorScope === 'string' && rows[0].initiatorScope.length > 0);
});

test('SEC-09: syncOfflineTransactions requires admin session and quarantines cross-user/tampered IDB rows', async () => {
  setActiveGroupId('GRP-Q2');
  setAdminSession('tok-alice');
  setAdminRole('group_admin');
  setAdminEmail('alice@example.com');

  await queueOfflinePayload({ action: 'tambahAnggota', nama: 'Alice Item' });
  await addOfflineTransaction({
    payload: { groupId: 'GRP-Q2', action: 'restoreSnapshot', data: {} },
    initiatorScope: 'tampered',
    queuedAt: '2026-01-01T00:00:00Z'
  });
  await addOfflineTransaction({
    payload: { groupId: 'GRP-Q2', action: 'tambahAnggota', nama: 'No Scope Item' },
    queuedAt: '2026-01-01T00:00:00Z'
  });

  const sent = [];
  globalThis.fetch = async (_url, opts) => {
    sent.push(JSON.parse(opts.body));
    return Response.json({ status: true });
  };

  // Non-admin must never replay anything
  clearAdminSession({ preserveGroupSessions: true });
  await syncOfflineTransactions();
  assert.equal(sent.length, 0);

  // Different admin user logs in: Alice's queued item must stay quarantined, NOT replayed as Bob
  setAdminSession('tok-bob');
  setAdminRole('group_admin');
  setAdminEmail('bob@example.com');
  await syncOfflineTransactions();
  assert.equal(sent.length, 0);

  // Alice logs back in: only Alice's valid allowlisted item replays; tampered & unscoped stay quarantined
  setAdminSession('tok-alice-2');
  setAdminRole('group_admin');
  setAdminEmail('alice@example.com');
  await syncOfflineTransactions();
  assert.deepEqual(sent.map((p) => [p.action, p.nama]), [
    ['tambahAnggota', 'Alice Item'],
    ['catatAktivitas', undefined]
  ]);
  const remaining = await getOfflineTransactions();
  assert.equal(remaining.length, 2);
});

test('SEC-09 & SEC-42: group-switch replay is not dropped, and queue UI/delete enforce admin session + own key', async () => {
  setActiveGroupId('GRP-R1');
  setAdminSession('tok-r1');
  setAdminRole('group_admin');
  setAdminEmail('r1@example.com');

  await queueOfflinePayload({ action: 'tambahAnggota', groupId: 'GRP-R1', nama: 'Member R1' });
  await queueOfflinePayload({ action: 'tambahAnggota', groupId: 'GRP-R2', nama: 'Member R2' });

  // Non-admin cannot open modal, list items, or delete queued entries
  clearAdminSession({ preserveGroupSessions: true });
  await openOfflineQueueModal();
  assert.equal(document.getElementById('modal-offline-queue').open, false);
  const itemsBeforeDelete = await getOfflineTransactions();
  assert.equal(await deleteOfflineTransaction(itemsBeforeDelete[0].id, 'GRP-R1'), false);
  assert.equal((await getOfflineTransactions()).length, 2);

  // Prototype-key action in IDB must render safely in renderOfflineQueueList
  setAdminSession('tok-r1');
  setAdminRole('group_admin');
  setAdminEmail('r1@example.com');
  await addOfflineTransaction({
    payload: { groupId: 'GRP-R1', action: 'constructor' },
    queuedAt: '2026-01-01T00:00:00Z'
  });
  await renderOfflineQueueList();

  // Switch from R1 to R2 while R1's replay is in-flight, then trigger R2 replay immediately
  const started = Promise.withResolvers();
  const gateR1 = Promise.withResolvers();
  const sent = [];
  globalThis.fetch = (_url, opts) => {
    const body = JSON.parse(opts.body);
    sent.push([body.groupId, body.action]);
    if (body.groupId === 'GRP-R1') {
      started.resolve();
      return gateR1.promise;
    }
    return Promise.resolve(Response.json({ status: true }));
  };

  const p1 = syncOfflineTransactions();
  await started.promise;
  setActiveGroupId('GRP-R2');
  const p2 = syncOfflineTransactions();
  gateR1.resolve(Response.json({ status: true }));
  await Promise.all([p1, p2]);
  assert.ok(sent.some(([gid, act]) => gid === 'GRP-R2' && act === 'tambahAnggota'));
});

/* ── SEC-10 & SEC-18: Superadmin token scoping, 401/403 sync, credentials omit */

test('SEC-10 & SEC-18: superadmin never writes groupSessions, apiPost omits credentials, and 401/403 drops admin mode cleanly', async () => {
  let fetchOpts;
  globalThis.fetch = async (_url, opts) => {
    fetchOpts = opts;
    return Response.json({
      status: true,
      data: { sessionToken: 'super-tok', role: 'superadmin', email: 'root@example.com', groupId: 'GRP-SA' }
    });
  };

  await loginAdminApi('root@example.com', 'secret', 'GRP-SA');
  assert.equal(fetchOpts.credentials, 'omit');
  assert.equal(getAdminSession(), 'super-tok');
  assert.equal(getGroupSession('GRP-SA'), '');

  // Superadmin 403 triggers full clearAdminSession (including groupSessions) + event
  setGroupSession('GRP-OTHER', 'member-other');
  let expiredEvents = 0;
  window.addEventListener('finkas:session-expired', () => { expiredEvents++; });

  globalThis.fetch = async () => Response.json({ status: false, message: 'Forbidden' }, { status: 403 });
  const resSuper403 = await dataRequest({ action: 'read', groupId: 'GRP-SA' });
  assert.equal(resSuper403.unauthorized, true);
  assert.equal(getAdminSession(), '');
  assert.equal(getGroupSession('GRP-OTHER'), '');
  assert.equal(expiredEvents, 1);

  // Regular group_admin 403 on an unauthorized group preserves admin session for own group
  setAdminSession('ga-tok');
  setAdminRole('group_admin');
  setGroupSession('GRP-OWN', 'ga-tok');
  const resGa403 = await dataRequest({ action: 'read', groupId: 'GRP-FOREIGN' });
  assert.equal(resGa403.unauthorized, true);
  assert.equal(getAdminSession(), 'ga-tok');

  // Regular group_admin 401 drops admin session while preserving other group sessions
  setGroupSession('GRP-KEEP', 'pin-keep');
  globalThis.fetch = async () => Response.json({ status: false, message: 'Expired' }, { status: 401 });
  const resGa401 = await dataRequest({ action: 'read', groupId: 'GRP-OWN', needsWrite: true });
  assert.equal(resGa401.unauthorized, true);
  assert.equal(getAdminSession(), '');
  assert.equal(getGroupSession('GRP-KEEP'), 'pin-keep');
  assert.equal(getGroupSession('GRP-OWN'), '');

  // Clean static verification
  const apiRes = await apiPost('/api/test', { ok: 1 });
  assert.equal(apiRes.status, false);
});

/* ── SEC-24, SEC-25, SEC-40: SW hardening & SW message origin checks ──────── */

test('SEC-24/25/40: sw.js normalizes /api/ paths, rejects opaque/redirected caching, passes through 404/500, and drops SYNC_OFFLINE', async () => {
  const sw = createSwHarness({
    fetch: async (target) => {
      const url = typeof target === 'string' ? target : target.url;
      if (url.endsWith('/missing-page')) return new Response('Not Found', { status: 404 });
      if (url.endsWith('/boom')) return new Response('Server Error', { status: 500 });
      return new Response('fresh asset', { status: 200 });
    },
    caches: {
      open: async () => ({
        addAll: async () => {},
        add: async () => {},
        put: async (key, value) => { sw.calls.puts.push([key, value]); }
      }),
      match: async () => new Response('stale shell', { status: 200 })
    }
  });

  // Bypass variations for /api/
  for (const apiPath of ['https://finkas.test//api/data', 'https://finkas.test/%61pi/data', 'https://finkas.test/%2fapi/login', 'https://finkas.test/API/data']) {
    const ev = sw.dispatchFetch(apiPath);
    assert.equal(ev.response, undefined, `${apiPath} must bypass SW fetch interception`);
  }

  // Online non-ok navigate response is returned directly, not masked by cached index.html, and never cached
  const ev404 = sw.dispatchFetch('https://finkas.test/missing-page', 'navigate');
  const res404 = await ev404.response;
  assert.equal(res404.status, 404);
  await ev404.done();
  assert.equal(sw.calls.puts.length, 0);

  const ev500 = sw.dispatchFetch('https://finkas.test/boom', 'navigate');
  const res500 = await ev500.response;
  assert.equal(res500.status, 500);
  await ev500.done();
  assert.equal(sw.calls.puts.length, 0);

  // Query-string normalization for static LOCAL_ASSETS
  const evCss = sw.dispatchFetch('https://finkas.test/style.css?v=999', 'cors');
  await evCss.response;
  await evCss.done();
  assert.equal(sw.calls.puts.at(-1)[0], 'https://finkas.test/style.css');

  // SYNC_OFFLINE listener removed; sync drops includeUncontrolled
  assert.equal(sw.listeners.message, undefined);
  const syncPending = [];
  sw.listeners.sync({ tag: 'finkas-sync-offline', waitUntil: (p) => syncPending.push(p) });
  await Promise.all(syncPending);
  assert.equal(sw.calls.matchAllOpts.length, 1);
  assert.equal(sw.calls.matchAllOpts[0].type, 'window');
  assert.equal(sw.calls.matchAllOpts[0].includeUncontrolled, undefined);

  const appSrc = readFileSync(new URL('../src/svelte/app.ts', import.meta.url), 'utf8');
  assert.match(appSrc, /event\.source\s*!==\s*navigator\.serviceWorker\.controller/);
});

/* ── SEC-26: GA4 validation ────────────────────────────────────────────────── */

test('SEC-26: initAnalytics enforces GA4 G-* pattern and app.ts removes GA_ID_KEY localStorage fallback', () => {
  initAnalytics('GTM-INJECT1');
  initAnalytics('G-123');
  initAnalytics('G-ABC!1234');
  assert.equal(document.querySelectorAll('script').length, 0);

  initAnalytics('G-AB12CD34');
  const scripts = document.querySelectorAll('script');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-AB12CD34');

  const appSrc = readFileSync(new URL('../src/svelte/app.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(appSrc, /localStorage\.getItem\(GA_ID_KEY\)/);
});

/* ── SEC-27 / SEC-42: Safe cache load, backup restore, groupSessions keys ───── */

test('SEC-27 & SEC-42: loadCache & groupSessions reject prototype pollution and malformed entries', () => {
  setActiveGroupId('GRP-SAFE');
  // Inject explicit own "__proto__" key inside raw JSON text
  localStorage.setItem(`${CACHE_KEY}:GRP-SAFE`,
    '{"anggota":[{"ID_Anggota":"A1","Nama_Anggota":"Safe"}],"kategori":[],"transaksi":[],"paymentAccount":{"bank":"BCA","number":"123-456","holder":"Bendahara","whatsapp":"08123456789"},"__proto__":{"pollutedProp":"bad"}}'
  );
  assert.equal(loadCache('GRP-SAFE'), true);
  assert.equal(({}).pollutedProp, undefined);
  assert.equal(getState().paymentAccount.whatsapp, '628123456789');

  // Nested array row in anggota must fail loadCache validation
  localStorage.setItem(`${CACHE_KEY}:GRP-SAFE`, '{"anggota":[["nested"]],"kategori":[],"transaksi":[]}');
  assert.equal(loadCache('GRP-SAFE'), false);

  // groupSessions rejects prototype keys and invalid groupIds
  setGroupSession('__proto__', 'evil');
  setGroupSession('constructor', 'evil');
  setGroupSession('../etc', 'evil');
  assert.equal(getGroupSession('__proto__'), '');
  assert.equal(getGroupSession('constructor'), '');
  assert.equal(JSON.parse(localStorage.getItem(GROUP_SESSIONS_KEY) || '{}').constructor, Object);
});

test('SEC-27: restoreJSONBackup enforces 20 MiB cap, schema/numeric checks, fail-closed confirm, and group binding', async () => {
  setActiveGroupId('GRP-BKP');
  setAdminSession('tok-bkp');

  let fetchCalls = 0;
  globalThis.fetch = async (_url, opts) => {
    fetchCalls++;
    return Response.json({ status: true, data: { transaksi: 1, attachments: 0 }, body: JSON.parse(opts.body) });
  };

  // > 20 MiB rejected before reading
  let readStarted = false;
  globalThis.FileReader = class {
    readAsText() { readStarted = true; }
  };
  restoreJSONBackup({ name: 'huge.json', size: 20 * 1024 * 1024 + 1 });
  assert.equal(readStarted, false);

  // Helper to simulate synchronous FileReader.onload completion
  const runRestoreWith = (jsonObj, { confirmFn = () => true, switchAfterStart = false } = {}) => {
    let onloadPromise;
    window.confirm = confirmFn;
    globalThis.FileReader = class {
      readAsText() {
        onloadPromise = this.onload({ target: { result: typeof jsonObj === 'string' ? jsonObj : JSON.stringify(jsonObj) } });
        if (switchAfterStart) setActiveGroupId('GRP-OTHER-WAIT');
      }
    };
    restoreJSONBackup({ name: 'backup.json', size: 512 });
    return onloadPromise;
  };

  // Reject NaN/negative nominal & array-in-entity
  await runRestoreWith({
    group: { id: 'GRP-BKP', nama: 'BKP' },
    data: {
      anggota: [{ ID_Anggota: 'A1' }],
      transaksi: [{ Nominal: -500, Tipe_Arus: 'Masuk', Timestamp: '2026-01-01T00:00:00Z' }]
    }
  });
  assert.equal(fetchCalls, 0);

  await runRestoreWith({
    group: { id: 'GRP-BKP', nama: 'BKP' },
    data: {
      anggota: [['nested']],
      transaksi: [{ Nominal: 1000, Tipe_Arus: 'Masuk', Timestamp: '2026-01-01T00:00:00Z' }]
    }
  });
  assert.equal(fetchCalls, 0);

  // Reject raw malformed paymentAccount strings before digit-stripping normalization
  await runRestoreWith({
    group: { id: 'GRP-BKP', nama: 'BKP' },
    data: {
      anggota: [{ ID_Anggota: 'A1' }],
      transaksi: [{ Nominal: 1000, Tipe_Arus: 'Masuk', Timestamp: '2026-01-01T00:00:00Z' }],
      paymentAccount: { bank: 'BCA', number: '1234567890', holder: 'Bendahara', whatsapp: 'bad<script>08123456789' }
    }
  });
  assert.equal(fetchCalls, 0);

  // Fail closed when window.confirm is missing on cross-group/missing-id restore
  await runRestoreWith({
    data: {
      anggota: [{ ID_Anggota: 'A1' }],
      transaksi: [{ Nominal: 1000, Tipe_Arus: 'Masuk', Timestamp: '2026-01-01T00:00:00Z' }]
    }
  }, { confirmFn: null });
  assert.equal(fetchCalls, 0);

  // Missing content.group.id prompts twice (base confirm + missing-id warning), dispatches request-refresh instead of mutating local state
  const confirms = [];
  let refreshRequested = 0;
  window.addEventListener('finkas:request-refresh', () => { refreshRequested++; });

  let sentPayload;
  globalThis.fetch = async (_url, opts) => {
    fetchCalls++;
    sentPayload = JSON.parse(opts.body);
    return Response.json({ status: true, data: { transaksi: 1, attachments: 0 } });
  };
  await runRestoreWith({
    data: {
      anggota: [{ ID_Anggota: 'A1' }],
      transaksi: [{ Nominal: 5000, Tipe_Arus: 'Masuk', Timestamp: '2026-01-01T00:00:00Z' }]
    }
  }, {
    confirmFn: (msg) => {
      confirms.push(msg);
      return true;
    }
  });
  assert.equal(fetchCalls, 1);
  assert.equal(confirms.length, 2);
  assert.match(confirms[1], /ID GRUP HILANG/i);
  assert.equal(sentPayload.groupId, 'GRP-BKP');
  assert.equal(refreshRequested, 1);
  assert.equal(getState().anggota.length, 0, 'restore must request refresh instead of writing un-normalized JSON straight to state');
});

/* ── SEC-30: BroadcastChannel validation ───────────────────────────────────── */

test('SEC-30: openMutationChannel drops malformed or invalid BroadcastChannel messages', () => {
  const channels = [];
  globalThis.BroadcastChannel = class {
    constructor(name) { this.name = name; channels.push(this); }
    postMessage() {}
    close() {}
  };

  setActiveGroupId('GRP-BC1');
  const badgeUpdates = [];
  initSync((hasUpdate) => badgeUpdates.push(hasUpdate));
  notifySynced('2026-01-01T00:00:00Z');
  const ch = channels.at(-1);

  for (const badMsg of [null, [], { type: 'other', groupId: 'GRP-BC1' }, { type: 'mutation' }, { type: 'mutation', groupId: '../bad' }, { type: 'mutation', groupId: '__proto__' }]) {
    ch.onmessage({ data: badMsg });
  }
  assert.equal(badgeUpdates.at(-1), false);

  ch.onmessage({ data: { type: 'mutation', groupId: 'GRP-BC1' } });
  assert.equal(badgeUpdates.at(-1), true);
});

/* ── SEC-41 & SEC-43: CSV formula escaping and window.opener isolation ────── */

test('SEC-41 & SEC-43: exportToCSV prevents formula injection and print windows sever opener', async () => {
  setActiveGroupId('GRP-EXP');
  setState({
    anggota: [{ ID_Anggota: 'A1', Nama_Anggota: '=HYPERLINK("http://evil")', Status_Aktif: 'Aktif' }],
    kategori: [{ ID_Kategori: 'K1', Nama_Kategori: '+SUM(1,2)' }],
    transaksi: [{
      ID_Transaksi: 'TRX-1',
      ID_Anggota: 'A1',
      ID_Kategori: 'K1',
      Tipe_Arus: 'Masuk',
      Nominal: 25000,
      Keterangan: '@cmd|calc',
      Timestamp: '2026-01-15T10:00:00.000Z'
    }]
  });

  let capturedCsv = '';
  globalThis.Blob = class {
    constructor(parts) { capturedCsv = parts.join(''); }
  };
  globalThis.URL.createObjectURL = () => 'blob:test';
  globalThis.URL.revokeObjectURL = () => {};
  exportToCSV();

  assert.match(capturedCsv, /"'=HYPERLINK/);
  assert.match(capturedCsv, /"'\+SUM\(1,2\)"/);
  assert.match(capturedCsv, /"'@cmd\|calc"/);
  assert.match(capturedCsv, /;25000;"/);

  const openedWindows = [];
  window.open = () => {
    const pw = {
      opener: window,
      document: { open() {}, write() {}, close() {} },
      focus() {},
      addEventListener() {},
      print() {},
      close() {}
    };
    openedWindows.push(pw);
    return pw;
  };

  cetakStruk('TRX-1');
  cetakLaporanTahunan();
  assert.equal(openedWindows.length, 2);
  for (const pw of openedWindows) {
    assert.equal(pw.opener, null);
  }
});
