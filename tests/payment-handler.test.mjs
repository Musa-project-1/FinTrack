import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Isolated mock environment
function makeElement(id = '') {
  const classes = new Set();
  const children = [];
  const listeners = new Map();
  return {
    id,
    value: '',
    innerText: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    style: {
      setProperty: () => {},
      getPropertyValue: () => ''
    },
    classList: {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      contains: (n) => classes.has(n),
      toggle: (n, force) => {
        if (force === undefined) {
          if (classes.has(n)) classes.delete(n);
          else classes.add(n);
        } else if (force) classes.add(n);
        else classes.delete(n);
      }
    },
    children,
    appendChild: (c) => children.push(c),
    append: (...items) => children.push(...items),
    remove: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    setAttribute: () => {},
    removeAttribute: () => {},
    getAttribute: () => null,
    addEventListener: (event, fn) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    removeEventListener: (event, fn) => {
      const list = listeners.get(event) || [];
      listeners.set(event, list.filter((f) => f !== fn));
    },
    dispatchEvent: (event) => {
      const list = listeners.get(event.type) || [];
      list.forEach((fn) => fn(event));
      return true;
    },
    reset: function () {
      this.value = '';
    }
  };
}

let domElements = new Map();
const getOrCreate = (id) => {
  if (!domElements.has(id)) domElements.set(id, makeElement(id));
  return domElements.get(id);
};

let savedDoc, savedWin, savedStorage, savedRaf, savedIdb;

const inMemoryIdbStore = [];
let nextIdbId = 1;
const mockIndexedDB = {
  open: () => {
    const req = {
      result: {
        transaction: () => ({
          objectStore: () => ({
            add: (item) => {
              const id = nextIdbId++;
              const stored = { ...item, id };
              inMemoryIdbStore.push(stored);
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
                r.result = [...inMemoryIdbStore];
                r.onsuccess?.({ target: r });
              }, 0);
              return r;
            },
            delete: (id) => {
              const idx = inMemoryIdbStore.findIndex((x) => x.id === id);
              if (idx !== -1) inMemoryIdbStore.splice(idx, 1);
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

beforeEach(() => {
  domElements.clear();
  savedDoc = globalThis.document;
  savedWin = globalThis.window;
  savedStorage = globalThis.localStorage;
  savedRaf = globalThis.requestAnimationFrame;
  savedIdb = globalThis.indexedDB;
  globalThis.indexedDB = mockIndexedDB;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: { onLine: true }
  });

  const storageMap = new Map();
  globalThis.localStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear()
  };

  const bodyEl = makeElement('body');
  globalThis.document = {
    body: bodyEl,
    getElementById: (id) => getOrCreate(id),
    querySelectorAll: (sel) => [],
    querySelector: (sel) => null,
    createElement: (tag) => makeElement(tag),
    createDocumentFragment: () => makeElement('fragment'),
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  globalThis.window = {
    innerWidth: 1024,
    navigator: { onLine: true },
    matchMedia: () => ({ matches: false }),
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
});

afterEach(() => {
  globalThis.document = savedDoc;
  globalThis.window = savedWin;
  globalThis.localStorage = savedStorage;
  globalThis.requestAnimationFrame = savedRaf;
  globalThis.indexedDB = savedIdb;
  inMemoryIdbStore.length = 0;
  nextIdbId = 1;
});

test('quickpay defaults to remaining amount from createDuesLedger and blocks paid/exempt', async () => {
  const { setState, setCurrentRekapYear, setAdminSession } = await import('../js/core/state.js');
  const { openQuickPaySheet } = await import('../js/handlers/transactions.js');

  setAdminSession('mock-admin-token');
  setCurrentRekapYear('2026');

  setState({
    kasStart: '01-2026',
    skippedMonths: ['03-2026'], // Maret is exempt
    anggota: [
      { ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi Santoso', Status_Aktif: 'Aktif', Tanggal_Gabung: '2026-01-01' }
    ],
    kategori: [{ ID_Kategori: 'KAT-MASUK', Tipe: 'Masuk' }],
    transaksi: [
      // Rp 5.000 paid for Januari 2026 (partial payment)
      {
        ID_Transaksi: 'TRX-1',
        ID_Anggota: 'ANG-1',
        Tipe_Arus: 'Masuk',
        Bulan_Iuran: 'Januari',
        Tahun_Iuran: '2026',
        Nominal: 5000,
        Timestamp: '2026-01-15T12:00:00Z'
      },
      // Rp 10.000 paid for Februari 2026 (fully paid)
      {
        ID_Transaksi: 'TRX-2',
        ID_Anggota: 'ANG-1',
        Tipe_Arus: 'Masuk',
        Bulan_Iuran: 'Februari',
        Tahun_Iuran: '2026',
        Nominal: 10000,
        Timestamp: '2026-02-15T12:00:00Z'
      }
    ]
  });

  const modal = getOrCreate('modal-quickpay');

  // Case 1: Partial payment (Rp 5.000 paid of Rp 10.000) -> remaining is 5.000
  modal.classList.remove('active');
  openQuickPaySheet('ANG-1', 'Januari');
  assert.equal(modal.classList.contains('active'), true, 'Modal should open for partial dues');
  assert.equal(getOrCreate('qp-nominal').value, '5.000', 'Quickpay should default to remaining 5.000, not 10.000');

  // Case 2: Fully paid period (Rp 10.000 paid) -> should block and not open
  modal.classList.remove('active');
  openQuickPaySheet('ANG-1', 'Februari');
  assert.equal(modal.classList.contains('active'), false, 'Modal should NOT open for already paid dues');

  // Case 3: Exempt period (Maret is skipped) -> should block and not open
  modal.classList.remove('active');
  openQuickPaySheet('ANG-1', 'Maret');
  assert.equal(modal.classList.contains('active'), false, 'Modal should NOT open for exempt dues');
});

test('bukaModalTransaksi defaults month and year to WIB billingPeriod regardless of local machine timezone', async () => {
  const { setAdminSession } = await import('../js/core/state.js');
  const { bukaModalTransaksi } = await import('../js/handlers/transactions.js');

  setAdminSession('mock-admin-token');

  // Freeze Date to 2026-10-31T18:30:00.000Z (which is 2026-11-01 01:30:00 WIB)
  const realDate = globalThis.Date;
  const mockNow = new realDate('2026-10-31T18:30:00.000Z');

  class MockDate extends realDate {
    constructor(...args) {
      if (args.length === 0) super(mockNow.getTime());
      else super(...args);
    }
    static now() {
      return mockNow.getTime();
    }
    // Simulate non-WIB system (e.g. UTC device)
    getMonth() {
      return super.getUTCMonth();
    }
    getFullYear() {
      return super.getUTCFullYear();
    }
  }

  globalThis.Date = MockDate;

  try {
    const tabOps = getOrCreate('tab-operasional');
    const formEl = makeElement('form');
    tabOps.querySelector = (sel) => (sel === 'form' ? formEl : null);

    bukaModalTransaksi();

    const bulanVal = getOrCreate('iuran-bulan').value;
    const tahunVal = getOrCreate('iuran-tahun').value;

    assert.equal(tahunVal, 2026, 'Year must match WIB year');
    assert.equal(bulanVal, 'November', 'Month must match WIB month (November), not local UTC month (Oktober)');
  } finally {
    globalThis.Date = realDate;
  }
});

test('group isolation: aborts confirm if group switched while dialog open', async () => {
  const { setState, setActiveGroupId, setAdminSession, getState } = await import('../js/core/state.js');
  const { submitQuickPay } = await import('../js/handlers/transactions.js');
  const { executeConfirmAction } = await import('../js/ui/modal.js');

  setActiveGroupId('GRP-A');
  setAdminSession('mock-token');

  setState({
    anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi' }],
    kategori: [{ ID_Kategori: 'KAT-MASUK', Tipe: 'Masuk' }],
    transaksi: []
  });

  getOrCreate('qp-id-anggota').value = 'ANG-1';
  getOrCreate('qp-bulan').value = 'Januari';
  getOrCreate('qp-tahun').value = '2026';
  getOrCreate('qp-nominal').value = '10.000';

  const fakeEvent = { preventDefault: () => {} };
  await submitQuickPay(fakeEvent);

  let fetchCalled = false;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return { ok: true, status: 200, json: async () => ({ status: true, data: {} }) };
  };

  try {
    // Switch group to GRP-B BEFORE user confirms
    setActiveGroupId('GRP-B');

    // User confirms in UI
    await executeConfirmAction();

    // Verify no transactions were added to state
    assert.equal(getState().transaksi.length, 0, 'No transaction should be added when group switched');
    assert.equal(fetchCalled, false, 'Fetch should NOT be called when confirm was aborted due to group switch');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('group isolation: after async in-flight response, does not mutate different active group', async () => {
  const { setState, setActiveGroupId, setAdminSession, getState } = await import('../js/core/state.js');
  const { submitQuickPay } = await import('../js/handlers/transactions.js');
  const { executeConfirmAction } = await import('../js/ui/modal.js');

  setActiveGroupId('GRP-A');
  setAdminSession('mock-token');

  setState({
    anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi' }],
    kategori: [{ ID_Kategori: 'KAT-MASUK', Tipe: 'Masuk' }],
    transaksi: []
  });

  getOrCreate('qp-id-anggota').value = 'ANG-1';
  getOrCreate('qp-bulan').value = 'Januari';
  getOrCreate('qp-tahun').value = '2026';
  getOrCreate('qp-nominal').value = '10.000';

  const realFetch = globalThis.fetch;
  // Mock gateway HTTP that switches group while request is in-flight
  globalThis.fetch = async () => {
    setActiveGroupId('GRP-B');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        message: 'Transaksi disimpan.',
        data: {
          transaction: {
            ID_Transaksi: 'TRX-REAL-123',
            Timestamp: '2026-01-01T00:00:00Z',
            Tipe_Arus: 'Masuk',
            ID_Kategori: 'KAT-MASUK',
            ID_Anggota: 'ANG-1',
            Bulan_Iuran: 'Januari',
            Tahun_Iuran: '2026',
            Nominal: 10000,
            Keterangan: 'Iuran Anggota'
          }
        }
      })
    };
  };

  try {
    const fakeEvent = { preventDefault: () => {} };
    await submitQuickPay(fakeEvent);

    await executeConfirmAction();

    // Verify state was NOT mutated for GRP-B
    assert.equal(getState().transaksi.length, 0, 'Must NOT mutate currently active different group');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('online confirmed create adds real server row not TEMP ID', async () => {
  const { setState, setActiveGroupId, setAdminSession, getState } = await import('../js/core/state.js');
  const { submitOperasional } = await import('../js/handlers/transactions.js');
  const { executeConfirmAction } = await import('../js/ui/modal.js');
  const { isUnsyncedTempId } = await import('../js/core/offline.js');

  setActiveGroupId('GRP-A');
  setAdminSession('mock-token');

  setState({
    anggota: [],
    kategori: [{ ID_Kategori: 'KAT-OPS', Nama_Kategori: 'Operasional', Tipe: 'Keluar' }],
    transaksi: []
  });

  getOrCreate('ops-tipe').value = 'Keluar';
  getOrCreate('ops-kategori').value = 'KAT-OPS';
  getOrCreate('ops-nominal').value = '50.000';
  getOrCreate('ops-keterangan').value = 'Beli Spidol';
  getOrCreate('ops-anggota').value = '-';

  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: true,
      message: 'Transaksi disimpan.',
      data: {
        transaction: {
          ID_Transaksi: 'TRX-SERVER-OP-999',
          Timestamp: '2026-03-01T10:00:00Z',
          Tipe_Arus: 'Keluar',
          ID_Kategori: 'KAT-OPS',
          ID_Anggota: '-',
          Bulan_Iuran: '-',
          Tahun_Iuran: '-',
          Nominal: 50000,
          Keterangan: 'Beli Spidol',
          groupId: 'GRP-A'
        }
      }
    })
  });

  try {
    const fakeEvent = { preventDefault: () => {} };
    await submitOperasional(fakeEvent);
    await executeConfirmAction();

    const transactions = getState().transaksi;
    assert.equal(transactions.length, 1);
    assert.equal(transactions[0].ID_Transaksi, 'TRX-SERVER-OP-999', 'Online create must carry real server ID');
    assert.equal(isUnsyncedTempId(transactions[0].ID_Transaksi), false, 'Online confirmed create must NOT be a TEMP ID');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('online confirmed bulk iuran adds real server rows not TEMP IDs', async () => {
  const { setState, setActiveGroupId, setAdminSession, getState } = await import('../js/core/state.js');
  const { submitIuran } = await import('../js/handlers/transactions.js');
  const { executeConfirmAction } = await import('../js/ui/modal.js');
  const { isUnsyncedTempId } = await import('../js/core/offline.js');

  setActiveGroupId('GRP-A');
  setAdminSession('mock-token');

  setState({
    anggota: [
      { ID_Anggota: 'ANG-1', Nama_Anggota: 'Ali' },
      { ID_Anggota: 'ANG-2', Nama_Anggota: 'Budi' }
    ],
    kategori: [{ ID_Kategori: 'KAT-IURAN', Nama_Kategori: 'Iuran Wajib', Tipe: 'Masuk' }],
    transaksi: []
  });

  // Mock DOM querySelectorAll for checked members
  const realQSA = globalThis.document.querySelectorAll;
  globalThis.document.querySelectorAll = (sel) => {
    if (sel.includes('.chk-iuran')) {
      return [{ value: 'ANG-1' }, { value: 'ANG-2' }];
    }
    return realQSA ? realQSA(sel) : [];
  };

  getOrCreate('iuran-nominal').value = '10.000';
  getOrCreate('iuran-kategori').value = 'KAT-IURAN';
  getOrCreate('iuran-bulan').value = 'Januari';
  getOrCreate('iuran-tahun').value = '2026';

  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: true,
      message: '2 transaksi massal berhasil disimpan.',
      data: {
        inserted: 2,
        skipped: [],
        transactions: [
          {
            ID_Transaksi: 'TRX-SRV-BULK-1',
            Timestamp: '2026-01-01T00:00:00Z',
            Tipe_Arus: 'Masuk',
            ID_Kategori: 'KAT-IURAN',
            ID_Anggota: 'ANG-1',
            Bulan_Iuran: 'Januari',
            Tahun_Iuran: '2026',
            Nominal: 10000,
            Keterangan: 'Iuran Anggota',
            groupId: 'GRP-A'
          },
          {
            ID_Transaksi: 'TRX-SRV-BULK-2',
            Timestamp: '2026-01-01T00:00:00Z',
            Tipe_Arus: 'Masuk',
            ID_Kategori: 'KAT-IURAN',
            ID_Anggota: 'ANG-2',
            Bulan_Iuran: 'Januari',
            Tahun_Iuran: '2026',
            Nominal: 10000,
            Keterangan: 'Iuran Anggota',
            groupId: 'GRP-A'
          }
        ]
      }
    })
  });

  try {
    const fakeEvent = { preventDefault: () => {} };
    await submitIuran(fakeEvent);
    await executeConfirmAction();

    const transactions = getState().transaksi;
    assert.equal(transactions.length, 2, 'Should add 2 transactions');
    assert.equal(transactions[0].ID_Transaksi, 'TRX-SRV-BULK-1');
    assert.equal(transactions[1].ID_Transaksi, 'TRX-SRV-BULK-2');
    assert.equal(isUnsyncedTempId(transactions[0].ID_Transaksi), false);
    assert.equal(isUnsyncedTempId(transactions[1].ID_Transaksi), false);
  } finally {
    globalThis.document.querySelectorAll = realQSA;
    globalThis.fetch = realFetch;
  }
});

test('replay or duplicate does not append duplicate rows locally', async () => {
  const { setState, setActiveGroupId, setAdminSession, getState } = await import('../js/core/state.js');
  const { submitOperasional } = await import('../js/handlers/transactions.js');
  const { executeConfirmAction } = await import('../js/ui/modal.js');

  setActiveGroupId('GRP-A');
  setAdminSession('mock-token');

  setState({
    anggota: [],
    kategori: [{ ID_Kategori: 'KAT-OPS', Nama_Kategori: 'Operasional', Tipe: 'Keluar' }],
    transaksi: [
      {
        ID_Transaksi: 'TRX-EXISTING-1',
        Timestamp: '2026-03-01T10:00:00Z',
        Tipe_Arus: 'Keluar',
        ID_Kategori: 'KAT-OPS',
        ID_Anggota: '-',
        Bulan_Iuran: '-',
        Tahun_Iuran: '-',
        Nominal: 50000,
        Keterangan: 'Beli Spidol',
        groupId: 'GRP-A'
      }
    ]
  });

  getOrCreate('ops-tipe').value = 'Keluar';
  getOrCreate('ops-kategori').value = 'KAT-OPS';
  getOrCreate('ops-nominal').value = '50.000';
  getOrCreate('ops-keterangan').value = 'Beli Spidol';
  getOrCreate('ops-anggota').value = '-';

  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: true,
      message: 'Transaksi sudah tercatat (duplikat)',
      data: {
        duplicate: true,
        isReplay: true,
        transaction: {
          ID_Transaksi: 'TRX-EXISTING-1',
          Timestamp: '2026-03-01T10:00:00Z',
          Tipe_Arus: 'Keluar',
          ID_Kategori: 'KAT-OPS',
          ID_Anggota: '-',
          Bulan_Iuran: '-',
          Tahun_Iuran: '-',
          Nominal: 50000,
          Keterangan: 'Beli Spidol',
          groupId: 'GRP-A'
        }
      }
    })
  });

  try {
    const fakeEvent = { preventDefault: () => {} };
    await submitOperasional(fakeEvent);
    await executeConfirmAction();

    const transactions = getState().transaksi;
    assert.equal(transactions.length, 1, 'Duplicate response must not append row');
    assert.equal(transactions[0].ID_Transaksi, 'TRX-EXISTING-1');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('offline creates add temporary row tied to group and operationId and persist cache', async () => {
  const { setState, setActiveGroupId, setAdminSession, getState } = await import('../js/core/state.js');
  const { submitOperasional } = await import('../js/handlers/transactions.js');
  const { executeConfirmAction } = await import('../js/ui/modal.js');
  const { isUnsyncedTempId } = await import('../js/core/offline.js');

  setActiveGroupId('GRP-A');
  setAdminSession('mock-token');

  setState({
    anggota: [],
    kategori: [{ ID_Kategori: 'KAT-OPS', Nama_Kategori: 'Operasional', Tipe: 'Keluar' }],
    transaksi: []
  });

  getOrCreate('ops-tipe').value = 'Keluar';
  getOrCreate('ops-kategori').value = 'KAT-OPS';
  getOrCreate('ops-nominal').value = '25.000';
  getOrCreate('ops-keterangan').value = 'Beli Kertas';
  getOrCreate('ops-anggota').value = '-';

  // Force offline
  globalThis.navigator.onLine = false;
  if (globalThis.window) globalThis.window.navigator.onLine = false;

  try {
    const fakeEvent = { preventDefault: () => {} };
    await submitOperasional(fakeEvent);
    await executeConfirmAction();

    const transactions = getState().transaksi;
    assert.equal(transactions.length, 1, 'Offline submit should add 1 local row');
    const row = transactions[0];
    assert.equal(isUnsyncedTempId(row.ID_Transaksi), true, 'Offline row must have TEMP ID');
    assert.equal(row.groupId, 'GRP-A', 'Offline row must be tied to active group');
    assert.ok(row.operationId, 'Offline row must carry operationId');

    // Check cache persistence in localStorage
    const cached = JSON.parse(globalThis.localStorage.getItem('finkas_cache:GRP-A'));
    assert.ok(cached, 'Cache must be persisted to localStorage');
    assert.equal(cached.transaksi.length, 1);
    assert.equal(cached.transaksi[0].ID_Transaksi, row.ID_Transaksi);
  } finally {
    globalThis.navigator.onLine = true;
    if (globalThis.window) globalThis.window.navigator.onLine = true;
  }
});

test('edit and delete synced confirmed updates state and cache cleanly', async () => {
  const { setState, setActiveGroupId, setAdminSession, getState } = await import('../js/core/state.js');
  const { submitEditTransaksi, eksekusiHapus } = await import('../js/handlers/transactions.js');
  const { executeConfirmAction } = await import('../js/ui/modal.js');

  setActiveGroupId('GRP-A');
  setAdminSession('mock-token');

  setState({
    anggota: [],
    kategori: [{ ID_Kategori: 'KAT-OPS', Nama_Kategori: 'Operasional', Tipe: 'Keluar' }],
    transaksi: [
      {
        ID_Transaksi: 'TRX-REAL-EDIT-1',
        Timestamp: '2026-03-01T10:00:00Z',
        Tipe_Arus: 'Keluar',
        ID_Kategori: 'KAT-OPS',
        ID_Anggota: '-',
        Bulan_Iuran: '-',
        Tahun_Iuran: '-',
        Nominal: 40000,
        Keterangan: 'Beli Buku',
        groupId: 'GRP-A'
      }
    ]
  });

  getOrCreate('edit-id').value = 'TRX-REAL-EDIT-1';
  getOrCreate('edit-tipe').value = 'Keluar';
  getOrCreate('edit-kategori').value = 'KAT-OPS';
  getOrCreate('edit-nominal').value = '60.000';
  getOrCreate('edit-anggota').value = '-';
  getOrCreate('edit-bulan').value = '-';
  getOrCreate('edit-tahun').value = '-';
  getOrCreate('edit-keterangan').value = 'Beli Buku Revisi';

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const body = opts?.body ? JSON.parse(opts.body) : {};
    if (body.action === 'editTransaksi') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          message: 'Transaksi diperbarui',
          data: { idTransaksi: 'TRX-REAL-EDIT-1' }
        })
      };
    }
    if (body.action === 'hapusTransaksi') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          message: 'Transaksi dihapus',
          data: { idTransaksi: 'TRX-REAL-EDIT-1' }
        })
      };
    }
    return { ok: true, status: 200, json: async () => ({ status: true }) };
  };

  try {
    // 1. Test Edit
    const fakeEvent = { preventDefault: () => {} };
    await submitEditTransaksi(fakeEvent);
    await executeConfirmAction();

    let trx = getState().transaksi.find((t) => t.ID_Transaksi === 'TRX-REAL-EDIT-1');
    assert.equal(trx.Nominal, 60000, 'Nominal should be updated to 60000');
    assert.equal(trx.Keterangan, 'Beli Buku Revisi');

    let cached = JSON.parse(globalThis.localStorage.getItem('finkas_cache:GRP-A'));
    assert.equal(cached.transaksi[0].Nominal, 60000, 'Cache should reflect edit');

    // 2. Test Delete
    getOrCreate('hapus-id-target').value = 'TRX-REAL-EDIT-1';
    await eksekusiHapus();

    trx = getState().transaksi.find((t) => t.ID_Transaksi === 'TRX-REAL-EDIT-1');
    assert.equal(trx, undefined, 'Transaction should be removed from state');

    cached = JSON.parse(globalThis.localStorage.getItem('finkas_cache:GRP-A'));
    assert.equal(cached.transaksi.length, 0, 'Cache should reflect deletion');
  } finally {
    globalThis.fetch = realFetch;
  }
});
