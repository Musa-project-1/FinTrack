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

const { classifySyncResponse, isUnsyncedTempId } = await import('../js/core/offline.js');

test('classifySyncResponse returns unreachable when network or backend gives no response', () => {
  assert.equal(classifySyncResponse(null), 'unreachable');
  assert.equal(classifySyncResponse(undefined), 'unreachable');
});

test('classifySyncResponse returns success when response status is true', () => {
  assert.equal(classifySyncResponse({ status: true, message: 'Berhasil' }), 'success');
  assert.equal(classifySyncResponse({ status: true, data: { inserted: 1 } }), 'success');
});

test('classifySyncResponse returns duplicate when backend flags already paid dues', () => {
  assert.equal(classifySyncResponse({ status: false, data: { duplicate: true } }), 'duplicate');
});

test('classifySyncResponse returns rejected when backend rejects invalid payload (W-13, T-5)', () => {
  // Invalid nominal or malformed schema returns status: false without duplicate flag
  const rejectedResponse = { status: false, message: 'Nominal transaksi harus lebih besar dari 0.' };
  assert.equal(classifySyncResponse(rejectedResponse), 'rejected');

  const rejectedMember = { status: false, message: 'Anggota tidak ditemukan.' };
  assert.equal(classifySyncResponse(rejectedMember), 'rejected');
});

test('offline replay simulation: rejects bad item, drains valid items, and halts on network outage', () => {
  const mockQueue = [
    { id: 1, payload: { nominal: 0 } },         // Will be rejected (invalid)
    { id: 2, payload: { nominal: 10000 } },     // Will succeed
    { id: 3, payload: { nominal: 20000 } }      // Will encounter network error
  ];

  const outcomes = [];
  const deletedIds = [];

  for (const item of mockQueue) {
    let mockResponse;
    if (item.id === 1) mockResponse = { status: false, message: 'Nominal harus > 0' };
    else if (item.id === 2) mockResponse = { status: true, message: 'Berhasil' };
    else if (item.id === 3) mockResponse = null; // Network failure

    const outcome = classifySyncResponse(mockResponse);
    outcomes.push({ id: item.id, outcome });

    if (outcome === 'unreachable') {
      // Must abort loop on unreachable so remaining items stay queued
      break;
    }

    if (outcome === 'success' || outcome === 'duplicate' || outcome === 'rejected') {
      // Deleted from queue so rejected items do NOT loop forever (W-13 fix)
      deletedIds.push(item.id);
    }
  }

  assert.deepEqual(outcomes, [
    { id: 1, outcome: 'rejected' },
    { id: 2, outcome: 'success' },
    { id: 3, outcome: 'unreachable' }
  ]);

  // Item 1 (rejected) and Item 2 (success) were removed; Item 3 stays in queue
  assert.deepEqual(deletedIds, [1, 2]);
});

test('isUnsyncedTempId matches optimistic rows across every collection prefix, not just transactions', () => {
  // Optimistic ids from tempTransactionId() and tempMasterId(prefix) all carry
  // the "-TEMP-" marker. Editing/deleting one through the offline queue would
  // target a server id that will never exist, so the guard must catch them all.
  assert.equal(isUnsyncedTempId('TRX-TEMP-9F3A2B10'), true);
  assert.equal(isUnsyncedTempId('ANG-TEMP-1C2D3E4F'), true);
  assert.equal(isUnsyncedTempId('KAT-M-TEMP-AABBCCDD'), true);
  assert.equal(isUnsyncedTempId('KAT-K-TEMP-11223344'), true);

  // Real server ids and non-string input must never be treated as temp.
  assert.equal(isUnsyncedTempId('TRX-20260101-0001'), false);
  assert.equal(isUnsyncedTempId('ANG-1'), false);
  assert.equal(isUnsyncedTempId(''), false);
  assert.equal(isUnsyncedTempId(null), false);
  assert.equal(isUnsyncedTempId(undefined), false);
});
