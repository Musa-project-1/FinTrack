import { test, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { installMockIndexedDB } from './helpers/mock-indexeddb.mjs';
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

const {
  classifySyncResponse, isUnsyncedTempId, addOfflineTransaction, getOfflineTransactions,
  queueOfflinePayload, countQueuedTransactions, getGroupOfflineTransactions,
  deleteOfflineTransaction, syncOfflineTransactions
} = await import('../src/ui/svelte-dashboard.js');
const { setActiveGroupId, setGroupSession, setAdminSession } = await import('../src/ui/svelte-dashboard.js');
const { renderOfflineQueueList } = await import('../src/ui/svelte-dashboard.js');

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
  // Quick pay receives this exact shape: status stays true, data.duplicate flags it.
  assert.equal(classifySyncResponse({ status: true, data: { duplicate: true } }), 'duplicate');
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

test('offline replay simulation: skips queued items belonging to different groups', () => {
  const activeGid = 'GRP-ALPHA';
  const mockQueue = [
    { id: 1, payload: { groupId: 'GRP-BETA', nominal: 50000 } }, // Different group
    { id: 2, payload: { groupId: 'GRP-ALPHA', nominal: 15000 } }, // Current active group
    { id: 3, payload: { nominal: 10000 } }                        // Legacy/unscoped item
  ];

  const processed = [];
  const skippedIds = [];

  for (const item of mockQueue) {
    if (item.payload?.groupId !== activeGid) {
      skippedIds.push(item.id);
      continue;
    }
    processed.push(item.id);
  }

  assert.deepEqual(skippedIds, [1, 3]);
  assert.deepEqual(processed, [2]);
});

const modalMarkup = readFileSync(new URL('../src/svelte/shell/modals/MasterModals.svelte', import.meta.url), 'utf8');
let dom;
after(() => dom?.window.close());
beforeEach(() => {
  installMockIndexedDB();
  dom ??= new JSDOM('');
  dom.window.document.open();
  dom.window.document.write(modalMarkup);
  dom.window.document.close();
  for (const key of ['window', 'document', 'Element', 'HTMLElement', 'Node', 'Text', 'Comment', 'Event', 'CustomEvent']) {
    globalThis[key] = dom.window[key];
  }
  setActiveGroupId('GRP-A');
  for (const gid of ['GRP-A', 'GRP-B']) setGroupSession(gid, 'test-session');
  setAdminSession('test-admin');
});

const seedMixedQueue = async () => {
  await addOfflineTransaction({ payload: { groupId: ' GRP-A ', action: 'tambahAnggota', nama: 'Anggota A' } });
  await queueOfflinePayload({ groupId: ' GRP-B ', action: 'tambahTransaksi', nama: 'Anggota B',
    dataForm: { keterangan: 'Catatan B', kategori: 'Kategori B', nominal: 987654 } });
  await addOfflineTransaction({ payload: { action: 'tambahAnggota', nama: 'Nama lama' } });
};

test('enqueue requires a nonempty group and stamps the normalized active group', async () => {
  setActiveGroupId(' ');
  await assert.rejects(queueOfflinePayload({}), /ID grup aktif belum dipilih/);
  assert.deepEqual(await getOfflineTransactions(), []);
  setActiveGroupId(' GRP-A ');
  await queueOfflinePayload({ action: 'tambahAnggota' });
  assert.equal((await getOfflineTransactions())[0].payload.groupId, 'GRP-A');
});

test('queue partitions and guarded deletion respect stored ownership', async () => {
  await seedMixedQueue();
  await addOfflineTransaction({ payload: { groupId: '   ' } });
  const rows = await getOfflineTransactions();
  assert.equal(rows[1].payload.groupId, 'GRP-B');
  assert.equal(await countQueuedTransactions(), 1);
  assert.deepEqual(await getGroupOfflineTransactions(), {
    groupId: 'GRP-A', items: [rows[0]], otherGroupCount: 1, unscopedCount: 2
  });
  setActiveGroupId('');
  assert.equal(await countQueuedTransactions(), 0);
  assert.deepEqual(await getGroupOfflineTransactions(), {
    groupId: '', items: [], otherGroupCount: 2, unscopedCount: 2
  });
  for (const id of [2, 3, 4, 5]) assert.equal(await deleteOfflineTransaction(id, 'GRP-A'), false);
  assert.equal(await deleteOfflineTransaction(1, ' GRP-A '), true);
  assert.deepEqual(await getOfflineTransactions(), rows.slice(1));
});

test('replay posts and audits only the active group and preserves other rows', async () => {
  await seedMixedQueue();
  const rows = await getOfflineTransactions();
  const sent = [];
  globalThis.fetch = async (_, opts) => {
    const { action, groupId } = JSON.parse(opts.body);
    sent.push([action, groupId]);
    return Response.json({ status: true });
  };
  let successes = 0;
  await syncOfflineTransactions(() => successes++);
  assert.deepEqual(sent, [['tambahAnggota', 'GRP-A'], ['catatAktivitas', 'GRP-A']]);
  assert.deepEqual(await getOfflineTransactions(), rows.slice(1));
  assert.equal(successes, 1);
});

for (const [outcome, status, body, consumed] of [
  ['success', 200, { status: true }, true],
  ['duplicate', 200, { status: true, data: { duplicate: true } }, true],
  ['rejected', 400, { status: false }, true],
  ['unauthorized', 401, { status: false }, false],
  ['unreachable', 503, { status: false }, false]
]) {
  test(`group switch during POST halts replay without toast, audit or callback (${outcome})`, async t => {
    await seedMixedQueue();
    await queueOfflinePayload({ action: 'tambahAnggota' });
    const rows = await getOfflineTransactions();
    document.body.insertAdjacentHTML('beforeend', '<div id="toast-container"></div>');
    const sent = [];
    const idle = [];
    const onQueueChanged = ({ detail }) => {
      if (detail.state === 'idle') idle.push([detail.groupId, detail.pendingCount]);
    };
    window.addEventListener('finkas:queue-changed', onQueueChanged);
    t.after(() => window.removeEventListener('finkas:queue-changed', onQueueChanged));
    const started = Promise.withResolvers();
    const response = Promise.withResolvers();
    globalThis.fetch = (_, opts) => {
      const { action, groupId } = JSON.parse(opts.body);
      sent.push([action, groupId]);
      started.resolve();
      return response.promise;
    };
    let successes = 0;
    const replay = syncOfflineTransactions(() => successes++);
    await started.promise;
    setActiveGroupId('GRP-B');
    response.resolve(Response.json(body, { status }));
    await replay;
    assert.equal(successes, 0);
    assert.equal(document.getElementById('toast-container').childElementCount, 0);
    assert.deepEqual(sent, [['tambahAnggota', 'GRP-A']]);
    assert.deepEqual(await getOfflineTransactions(), consumed ? rows.slice(1) : rows);
    assert.deepEqual(idle, [['GRP-A', consumed ? 1 : 2], ['GRP-B', 1]]);
  });
}

test('offline queue modal limits cards, counts and controls to the active group', async () => {
  await seedMixedQueue();
  const list = document.getElementById('offline-queue-list');
  const pill = document.getElementById('queue-count-pill');
  const sync = document.getElementById('btn-sync-offline-now');
  for (const count of [1, 0]) {
    await renderOfflineQueueList();
    assert.equal(list.querySelectorAll('[data-item-id]').length, count);
    if (count) {
      assert.equal(list.querySelector('[data-item-id]').dataset.itemId, '1');
      assert.match(list.textContent, /Anggota A/);
    } else {
      assert.match(list.textContent, /Semua tersinkron/);
    }
    assert.match(list.textContent, /1 antrean milik grup lain/);
    assert.match(list.textContent, /1 antrean lama tanpa ID grup/);
    assert.doesNotMatch(list.innerHTML, /GRP-B|Catatan B|Anggota B|Kategori B|987[.]?654|Nama lama/);
    assert.equal(pill.textContent, `${count} tertunda`);
    assert.equal(sync.disabled, count === 0);
    if (count) await deleteOfflineTransaction(1, 'GRP-A');
  }
});
