import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Synthetic browser environment: storage, DOM, IndexedDB and BroadcastChannel
const storage = new Map();
let storageFails = false;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem(key) { if (storageFails) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
  setItem(key, value) { if (storageFails) throw new Error('Quota exceeded'); storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  clear() { storage.clear(); }
} });

globalThis.BroadcastChannel = class {
  messages = [];
  postMessage(msg) { this.messages.push(msg); }
  close() {}
};

const domListeners = new Map();
globalThis.window = {
  navigator: { onLine: true },
  addEventListener: (t, fn) => {
    if (!domListeners.has(t)) domListeners.set(t, new Set());
    domListeners.get(t).add(fn);
  },
  removeEventListener: (t, fn) => {
    domListeners.get(t)?.delete(fn);
  },
  dispatchEvent: (e) => {
    const list = domListeners.get(e.type);
    if (list) for (const fn of list) fn(e);
    return true;
  }
};

const docListeners = new Map();
globalThis.document = {
  visibilityState: 'visible',
  addEventListener: (t, fn) => {
    if (!docListeners.has(t)) docListeners.set(t, new Set());
    docListeners.get(t).add(fn);
  },
  removeEventListener: (t, fn) => {
    docListeners.get(t)?.delete(fn);
  },
  dispatchEvent: (e) => {
    const list = docListeners.get(e.type);
    if (list) for (const fn of list) fn(e);
    return true;
  }
};

const element = {
  textContent: '',
  attributes: new Map(),
  title: '',
  setAttribute(k, v) { this.attributes.set(k, String(v)); },
  getAttribute(k) { return this.attributes.get(k) ?? null; }
};
document.getElementById = (id) => id === 'ui-save-status' ? element : null;

// Mock in-memory IndexedDB for offline store
let idbItems = [];
let nextId = 1;
globalThis.indexedDB = {
  open: () => {
    const req = {
      result: {
        transaction: () => ({
          objectStore: () => ({
            add: (item) => {
              const id = nextId++;
              const stored = { ...item, id };
              idbItems.push(stored);
              const r = { result: id };
              setTimeout(() => r.onsuccess?.({ target: r }), 0);
              return r;
            },
            getAll: () => {
              const r = { result: idbItems.map((x) => ({ ...x })) };
              setTimeout(() => r.onsuccess?.({ target: r }), 0);
              return r;
            },
            delete: (id) => {
              const idx = idbItems.findIndex((x) => x.id === id);
              if (idx !== -1) idbItems.splice(idx, 1);
              const r = { result: undefined };
              setTimeout(() => r.onsuccess?.({ target: r }), 0);
              return r;
            }
          })
        })
      }
    };
    setTimeout(() => req.onsuccess?.({ target: req }), 0);
    return req;
  }
};

const state = await import('../js/core/state.js');
const ui = await import('../js/ui/save-status.js');
const sync = await import('../js/core/sync.js');
const offline = await import('../js/core/offline.js');
const api = await import('../js/core/api.js');

const makeLedger = () => ({
  anggota: [{ id: 'ANG-1', nama: 'Budi' }],
  kategori: [{ id: 'KAT-1', nama: 'Kas' }],
  transaksi: [{ id: 'TRX-1', nominal: 50000 }]
});

let testGroupCounter = 0;

beforeEach(() => {
  storageFails = false;
  storage.clear();
  idbItems = [];
  nextId = 1;
  window.navigator.onLine = true;
  document.visibilityState = 'visible';
  testGroupCounter += 1;
  state.setActiveGroupId(`TEST-GRP-${testGroupCounter}`);
  state.setGroupSession(`TEST-GRP-${testGroupCounter}`, 'test-token');
  state.setAdminSession('test-admin-token');
  element.textContent = '';
  element.attributes.clear();
  globalThis.fetch = async () => {
    throw new Error('Unexpected network access in isolated test');
  };
});

afterEach(() => {
  ui.destroySaveStatus();
  sync.destroySync();
});

test('storage events: actual saveCache/loadCache land events and unverified status is never claimed saved', async () => {
  ui.initSaveStatus({ container: element });
  // Unknown initially: must NOT say "Tersimpan"
  assert.match(element.textContent, /belum.*(diverifikasi|terverifikasi)/i);
  assert.doesNotMatch(element.textContent, /tersimpan di perangkat/i);

  // Successful saveCache makes it saved
  state.setState(makeLedger());
  assert.equal(state.saveCache(), true);
  assert.match(element.textContent, /tersimpan di perangkat/i);

  // In-memory mutation before save resets to unverified
  state.addTransaction({ id: 'TRX-NEW', nominal: 1000 });
  assert.doesNotMatch(element.textContent, /tersimpan di perangkat/i, 'dirty ledger must reset storage confirmation');

  // Quota failure reports cache failure truthfully
  storageFails = true;
  assert.equal(state.saveCache(), false);
  assert.match(element.textContent, /penyimpanan.*gagal/i);
  assert.doesNotMatch(element.textContent, /hanya.*memori/i, 'cache failure must not claim all copies are only in memory');

  // Successful loadCache restores saved
  storageFails = false;
  assert.equal(state.loadCache(), true);
  assert.match(element.textContent, /tersimpan di perangkat/i);

  // Group change resets storage verification
  state.setActiveGroupId('TEST-GRP-OTHER');
  assert.match(element.textContent, /belum.*(diverifikasi|terverifikasi)/i);
});

test('truthful queue count from IDB: queue, delete, and replay reflect active group count', async () => {
  const currentGid = state.getActiveGroupId();
  ui.initSaveStatus({ container: element });

  // 1. Enqueue payload for current group
  await offline.queueOfflinePayload({
    action: 'tambahTransaksi',
    groupId: currentGid,
    dataForm: { nominal: 10000 }
  });
  assert.match(element.textContent, /1.*menunggu kirim/i);

  // 2. Enqueue payload for a DIFFERENT group: must not inflate current group count
  await offline.queueOfflinePayload({
    action: 'tambahTransaksi',
    groupId: 'DIFFERENT-GROUP',
    dataForm: { nominal: 99000 }
  });
  assert.match(element.textContent, /1.*menunggu kirim/i, 'different group item must not affect active group queue');

  // 3. Delete item from IDB
  const currentItems = await offline.getOfflineTransactions();
  const activeItem = currentItems.find((x) => x.payload?.groupId === currentGid);
  assert.ok(activeItem);
  await offline.deleteOfflineTransaction(activeItem.id);
  assert.doesNotMatch(element.textContent, /1.*menunggu kirim/i);
  assert.equal(await offline.countQueuedTransactions(currentGid), 0);
});

test('temporary errors (500, 429) preserve queue and halt replay', async () => {
  const currentGid = state.getActiveGroupId();
  ui.initSaveStatus({ container: element });

  await offline.queueOfflinePayload({
    action: 'tambahTransaksi',
    groupId: currentGid,
    dataForm: { nominal: 15000 }
  });

  // Server returns 500
  globalThis.fetch = async () => new Response(JSON.stringify({ status: false, message: 'Internal Server Error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });

  await offline.syncOfflineTransactions();
  const queuedAfter500 = await offline.getOfflineTransactions();
  assert.equal(queuedAfter500.length, 1, '500 error must preserve queued item in IDB');

  // Server returns 429
  globalThis.fetch = async () => new Response(JSON.stringify({ status: false, message: 'Too Many Requests' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' }
  });

  await offline.syncOfflineTransactions();
  const queuedAfter429 = await offline.getOfflineTransactions();
  assert.equal(queuedAfter429.length, 1, '429 error must preserve queued item in IDB');
});

test('auth expired (401/403) does NOT lose queued data', async () => {
  const currentGid = state.getActiveGroupId();
  await offline.queueOfflinePayload({
    action: 'tambahTransaksi',
    groupId: currentGid,
    dataForm: { nominal: 75000 }
  });

  // Server returns 401 Unauthorized
  globalThis.fetch = async () => new Response(JSON.stringify({ status: false, message: 'Sesi berakhir' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });

  await offline.syncOfflineTransactions();
  const queuedAfter401 = await offline.getOfflineTransactions();
  assert.equal(queuedAfter401.length, 1, 'Auth expired must never delete queued transactions from IDB');
  assert.equal(queuedAfter401[0].payload.dataForm.nominal, 75000);
});

test('concurrent replay calls share single in-flight run and prevent duplicate requests', async () => {
  const currentGid = state.getActiveGroupId();
  await offline.queueOfflinePayload({
    action: 'tambahTransaksi',
    groupId: currentGid,
    dataForm: { nominal: 25000 }
  });

  const dispatchedActions = [];
  globalThis.fetch = async (_url, opts) => {
    const body = JSON.parse(opts.body);
    dispatchedActions.push(body.action);
    await new Promise((r) => setTimeout(r, 10));
    return new Response(JSON.stringify({ status: true, message: 'OK', data: { idTransaksi: 'TX-OK' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const run1 = offline.syncOfflineTransactions();
  const run2 = offline.syncOfflineTransactions();
  await Promise.all([run1, run2]);

  const mutationCalls = dispatchedActions.filter((a) => a === 'tambahTransaksi');
  assert.equal(mutationCalls.length, 1, 'Concurrent sync calls must execute replay exactly once');
  const remaining = await offline.getOfflineTransactions();
  assert.equal(remaining.length, 0);
});

test('fetchInitialData captures conservative readMarker before request and includes explicit groupId', async () => {
  const testGid = 'TEST-FETCH-GROUP';
  state.setGroupSession(testGid, 'token-read');

  const beforeCall = new Date().toISOString();
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({
      status: true,
      data: {
        anggota: [{ id: 'A1', nama: 'Test' }],
        kategori: [],
        transaksi: [],
        updatedAt: '2026-01-01T12:00:00.000Z'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const res = await api.fetchInitialData(testGid);
  assert.equal(res.status, true);
  assert.equal(res.groupId, testGid);
  assert.equal(res.readMarker, '2026-01-01T12:00:00.000Z');
  assert.equal(res.httpStatus, 200);

  // If server lacks updatedAt, readMarker falls back to conservative timestamp captured before read
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({
      status: true,
      data: { anggota: [], kategori: [], transaksi: [] }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const res2 = await api.fetchInitialData(testGid);
  assert.equal(res2.status, true);
  assert.ok(res2.readMarker);
  assert.ok(res2.readMarker >= beforeCall);
});

test('pending check vs new read: in-flight checkUpdate does not falsely mark stale when new read completes', async () => {
  const currentGid = state.getActiveGroupId();
  let resolveCheck;
  const checkPromise = new Promise((resolve) => { resolveCheck = resolve; });

  globalThis.fetch = async (_url, opts) => {
    const body = JSON.parse(opts.body);
    if (body.action === 'checkUpdate') {
      return checkPromise;
    }
    return new Response(JSON.stringify({ status: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  sync.initSync();
  sync.notifySynced('2026-01-01T00:00:00.000Z', currentGid);

  // Start in-flight check against 2026-01-01
  const checkAction = sync.checkForUpdate();

  // Full fetch occurs while check is in-flight: new read completed at 2026-01-02T12:00:00.000Z
  sync.notifySynced('2026-01-02T12:00:00.000Z', currentGid);

  // CheckUpdate resolves with remote change at 2026-01-02T10:00:00.000Z (older than current read marker)
  resolveCheck(new Response(JSON.stringify({
    status: true,
    data: { hasUpdate: true, updatedAt: '2026-01-02T10:00:00.000Z' }
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  await checkAction;
  assert.equal(sync.getHasRemoteUpdate(), false, 'in-flight check for already incorporated update must not mark group stale');
});
