import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Minimal in-memory Web Storage for isolated Node test workers.
 */
const makeStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; }
  };
};

if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage) {
  globalThis.localStorage = makeStorage();
}
if (typeof globalThis.sessionStorage === 'undefined' || !globalThis.sessionStorage) {
  globalThis.sessionStorage = makeStorage();
}

const eventTarget = new EventTarget();
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    navigator: { onLine: true },
    dispatchEvent: (e) => eventTarget.dispatchEvent(e),
    addEventListener: (t, fn) => eventTarget.addEventListener(t, fn),
    removeEventListener: (t, fn) => eventTarget.removeEventListener(t, fn)
  };
}

if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = globalThis.window.navigator;
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    getElementById: () => null,
    createElement: () => ({ classList: { add() {}, remove() {} }, style: {}, appendChild() {}, remove() {} }),
    body: { appendChild() {} }
  };
}

if (typeof globalThis.indexedDB === 'undefined') {
  const inMemoryStore = [];
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
                inMemoryStore.push(stored);
                const r = {};
                setTimeout(() => {
                  r.result = id;
                  r.onsuccess?.({ target: r });
                }, 0);
                return r;
              },
              getAll: () => {
                const r = {};
                setTimeout(() => {
                  r.result = [...inMemoryStore];
                  r.onsuccess?.({ target: r });
                }, 0);
                return r;
              },
              delete: (id) => {
                const idx = inMemoryStore.findIndex((x) => x.id === id);
                if (idx !== -1) inMemoryStore.splice(idx, 1);
                const r = {};
                setTimeout(() => {
                  r.result = undefined;
                  r.onsuccess?.({ target: r });
                }, 0);
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
}

const {
  generateOperationId,
  stampMutation,
  deliverMutation
} = await import('../js/core/mutation.js');

const {
  classifySyncResponse,
  isRetryableServerError
} = await import('../js/core/offline.js');

const { setAdminSession, setActiveGroupId } = await import('../js/core/state.js');
setAdminSession('mock-admin-token-12345');
setActiveGroupId('GRP-TEST-1');

const { isValidOperationId } = await import('../api/_transaction-idempotency.js');

test('generateOperationId creates unique, high-entropy (>=128 bit) operation IDs', () => {
  const id1 = generateOperationId();
  const id2 = generateOperationId();

  assert.notEqual(id1, id2);
  assert.ok(isValidOperationId(id1), `id1 '${id1}' must be valid according to server spec`);
  assert.ok(isValidOperationId(id2), `id2 '${id2}' must be valid according to server spec`);
  assert.ok(id1.startsWith('OP-'));
  // >= 128 bits is at least 32 hex chars (OP- + 32 chars = 35 chars)
  assert.ok(id1.length >= 35, `operationId length ${id1.length} must reflect at least 128 bits`);
});

test('classifySyncResponse treats 5xx, 429 and quota errors as unreachable (safe for retry)', () => {
  assert.equal(classifySyncResponse({ status: false, httpStatus: 500, message: 'Internal Server Error' }), 'unreachable');
  assert.equal(classifySyncResponse({ status: false, httpStatus: 502, message: 'Bad Gateway' }), 'unreachable');
  assert.equal(classifySyncResponse({ status: false, httpStatus: 503, message: 'Service Unavailable' }), 'unreachable');
  assert.equal(classifySyncResponse({ status: false, httpStatus: 429, message: 'Too Many Requests' }), 'unreachable');
  assert.equal(classifySyncResponse({ status: false, message: 'Batas kuota Firestore tercapai.' }), 'unreachable');

  // Non-retryable client error remains rejected
  assert.equal(classifySyncResponse({ status: false, httpStatus: 400, message: 'Data tidak valid' }), 'rejected');
  assert.equal(classifySyncResponse({ status: false, message: 'Anggota tidak ditemukan.' }), 'rejected');
});

test('deliverMutation stamps operationId and groupId before dispatch', async () => {
  const dispatchedRequests = [];
  const queuedItems = [];

  // Mock global network state and fetch
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    dispatchedRequests.push({ url, body: JSON.parse(opts.body) });
    return new Response(JSON.stringify({ status: true, message: 'OK', data: { idTransaksi: 'TX-123' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const inputPayload = {
      action: 'tambahTransaksi',
      groupId: 'GRP-TEST-1',
      dataForm: {
        tipeArus: 'Masuk',
        nominal: 15000,
        keterangan: 'Cicilan 1'
      }
    };

    const res = await deliverMutation(inputPayload);
    assert.equal(res.delivered, true);
    assert.equal(res.result.status, true);

    assert.equal(dispatchedRequests.length, 1);
    const sentBody = dispatchedRequests[0].body;

    assert.equal(sentBody.groupId, 'GRP-TEST-1');
    assert.ok(sentBody.operationId);
    assert.ok(isValidOperationId(sentBody.operationId));
    assert.equal(sentBody.dataForm.operationId, sentBody.operationId);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('deliverMutation preserves existing operationId across retries', async () => {
  const dispatchedRequests = [];
  const realFetch = globalThis.fetch;

  globalThis.fetch = async (url, opts) => {
    dispatchedRequests.push({ url, body: JSON.parse(opts.body) });
    return new Response(JSON.stringify({ status: true, message: 'OK', data: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const existingOpId = 'OP-EXISTING-1234567890ABCDEF';
    const payload = {
      action: 'tambahTransaksi',
      groupId: 'GRP-TEST-2',
      operationId: existingOpId,
      dataForm: {
        nominal: 20000
      }
    };

    await deliverMutation(payload);
    assert.equal(dispatchedRequests.length, 1);
    assert.equal(dispatchedRequests[0].body.operationId, existingOpId, 'must preserve pre-existing operationId');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('deliverMutation queues safely when server returns 500 or 429', async () => {
  const realFetch = globalThis.fetch;
  let simulatedStatus = 503;

  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ status: false, message: 'Server temporarily unavailable' }), {
      status: simulatedStatus,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const payload = {
      action: 'tambahTransaksi',
      groupId: 'GRP-TEST-RETRY',
      dataForm: {
        nominal: 50000
      }
    };

    const outcome = await deliverMutation(payload);
    assert.equal(outcome.delivered, false, '5xx must not be marked as successfully delivered');
    assert.ok(outcome.result);
    assert.equal(outcome.result.httpStatus, 503);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('syncOfflineTransactions processes legacy queued items without operationId without error', async () => {
  const { queueOfflinePayload, syncOfflineTransactions } = await import('../js/core/offline.js');
  const realFetch = globalThis.fetch;
  const sentPayloads = [];

  globalThis.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    sentPayloads.push(body);
    return new Response(JSON.stringify({ status: true, message: 'OK', data: { idTransaksi: 'TX-LEGACY-1' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    // Enqueue a legacy payload without operationId
    const legacyPayload = {
      action: 'tambahTransaksi',
      groupId: 'GRP-TEST-1',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Januari',
        tahunIuran: '2026',
        nominal: 10000
      }
    };
    await queueOfflinePayload(legacyPayload);

    let synced = false;
    await syncOfflineTransactions(() => {
      synced = true;
    });

    assert.equal(synced, true);
    assert.ok(sentPayloads.length >= 1);
    const sentLegacy = sentPayloads.find((p) => p.dataForm?.bulanIuran === 'Januari');
    assert.ok(sentLegacy);
    // Legacy item must not have had unexpected operationId injected into it
    assert.equal(Boolean(sentLegacy.operationId), false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('stampMutation stamps operationId and groupId synchronously before any async gap', () => {
  const unstamped = {
    action: 'tambahTransaksiMassal',
    listTrx: [{ idAnggota: 'ANG-1', nominal: 10000 }]
  };
  const stamped = stampMutation(unstamped);
  assert.equal(stamped.groupId, 'GRP-TEST-1');
  assert.ok(stamped.operationId);
  assert.ok(isValidOperationId(stamped.operationId));
  assert.notEqual(stamped, unstamped);
});

test('generateOperationId throws when cryptographically secure entropy source is missing', () => {
  const origCrypto = globalThis.crypto;
  try {
    delete globalThis.crypto;
    assert.throws(() => generateOperationId(), /CSPRNG/i);
  } finally {
    globalThis.crypto = origCrypto;
  }
});
