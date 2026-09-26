import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  addTransaction,
  addBulkTransactions,
  editTransaction,
  deleteDocument,
  changeSkippedMonth,
  addMember,
  updateMemberStatus,
  addCategory,
  noteClientAudit,
  findDuplicateIuran,
  isIuranPayment,
  validateSnapshot,
  restoreSnapshot,
  WRITE_HANDLERS
} = await import('../api/_group-write.js');
const { newId, iuranId } = await import('../api/_store.js');

const GID = 'GRP-AAAA';
/** Rejections happen before Firestore is touched, so headers are never read. */
const NO_HEADERS = {};

/** Assert a handler rejected the input rather than proceeding to write it. */
const expectRejected = async (resultPromise, label) => {
  const result = await resultPromise;
  assert.equal(result.status, false, `${label} should have been rejected`);
  assert.equal(typeof result.message, 'string');
  assert.ok(result.message.length > 0, `${label} should explain the rejection`);
  return result;
};

/* ── Transactions ────────────────────────────────────────────────── */

test('addTransaction rejects invalid payloads', async () => {
  const bad = [
    ['missing dataForm', {}],
    ['missing nominal', { dataForm: { tipeArus: 'Masuk', idKategori: 'KAT-M1' } }],
    ['zero nominal', { dataForm: { nominal: 0, tipeArus: 'Masuk', idKategori: 'KAT-M1' } }],
    ['negative nominal', { dataForm: { nominal: -100, tipeArus: 'Masuk', idKategori: 'KAT-M1' } }],
    ['non-numeric nominal', { dataForm: { nominal: 'abc', tipeArus: 'Masuk', idKategori: 'KAT-M1' } }],
    ['absurd nominal', { dataForm: { nominal: 2e12, tipeArus: 'Masuk', idKategori: 'KAT-M1' } }],
    ['bad tipeArus', { dataForm: { nominal: 10000, tipeArus: 'Transfer', idKategori: 'KAT-M1' } }],
    ['missing kategori', { dataForm: { nominal: 10000, tipeArus: 'Masuk' } }],
    ['placeholder kategori', { dataForm: { nominal: 10000, tipeArus: 'Masuk', idKategori: '-' } }]
  ];

  for (const [label, payload] of bad) {
    await expectRejected(addTransaction(GID, payload, NO_HEADERS), `addTransaction: ${label}`);
  }
});

test('addBulkTransactions rejects empty and oversized lists', async () => {
  await expectRejected(addBulkTransactions(GID, { listTrx: [] }, NO_HEADERS), 'empty list');
  await expectRejected(addBulkTransactions(GID, {}, NO_HEADERS), 'missing list');

  const tooMany = Array.from({ length: 301 }, () => ({
    nominal: 10000, tipeArus: 'Masuk', idKategori: 'KAT-M1', idAnggota: 'ANG-1'
  }));
  await expectRejected(addBulkTransactions(GID, { listTrx: tooMany }, NO_HEADERS), 'oversized list');
});

test('addBulkTransactions rejects a list of invalid entries', async () => {
  await expectRejected(addBulkTransactions(GID, {
    listTrx: [{ nominal: 0, tipeArus: 'Masuk', idKategori: 'KAT-M1', idAnggota: 'ANG-1' }]
  }, NO_HEADERS), 'zero nominal entry');

  // Every entry targets the non-member placeholder, so nothing is left to insert.
  await expectRejected(addBulkTransactions(GID, {
    listTrx: [{ nominal: 10000, tipeArus: 'Masuk', idKategori: 'KAT-M1', idAnggota: '-' }]
  }, NO_HEADERS), 'all placeholders');
});

test('editTransaction requires an id and a valid body', async () => {
  await expectRejected(editTransaction(GID, { dataForm: { nominal: 10000, tipeArus: 'Masuk', idKategori: 'K' } }, NO_HEADERS), 'missing id');
  await expectRejected(editTransaction(GID, { idTransaksi: 'TRX-1', dataForm: { nominal: 0, tipeArus: 'Masuk', idKategori: 'K' } }, NO_HEADERS), 'zero nominal');
});

test('addTransaction honours a client-supplied Timestamp and ignores an invalid one', async () => {
  const originalFetch = globalThis.fetch;
  const patched = [];
  try {
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      if (options?.method === 'PATCH') {
        patched.push({ url: urlStr, body: JSON.parse(options.body) });
        return { ok: true, status: 200, json: async () => ({}) };
      }
      // audit log commit + anything else
      return { ok: true, status: 200, json: async () => ({ writeResults: [{}] }) };
    };

    // Operasional (non-iuran) so the write goes through fsPatch and we can read it back.
    const valid = await addTransaction(GID, {
      dataForm: {
        tipeArus: 'Keluar', idKategori: 'KAT-1', idAnggota: '-',
        nominal: 5000, keterangan: 'Beli spidol', timestamp: '2026-01-22T05:00:00.000Z'
      }
    }, { Authorization: 'Bearer test' });
    assert.equal(valid.status, true);
    assert.equal(valid.data.Timestamp, '2026-01-22T05:00:00.000Z', 'supplied timestamp must be stored verbatim');

    // A garbage timestamp is dropped, and the doc still gets a valid ISO (now).
    const bad = await addTransaction(GID, {
      dataForm: {
        tipeArus: 'Keluar', idKategori: 'KAT-1', idAnggota: '-',
        nominal: 5000, keterangan: 'Beli map', timestamp: 'bukan-tanggal'
      }
    }, { Authorization: 'Bearer test' });
    assert.equal(bad.status, true);
    assert.notEqual(bad.data.Timestamp, 'bukan-tanggal');
    assert.ok(!Number.isNaN(new Date(bad.data.Timestamp).getTime()), 'fallback timestamp must be a valid date');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('editTransaction moves document to target iuranId when period changes and deletes old document', async () => {
  const originalFetch = globalThis.fetch;
  const deletedDocs = [];
  const createdDocs = [];

  const janInput = { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' };
  const marInput = { idAnggota: 'ANG-1', bulanIuran: 'Maret', tahunIuran: '2026' };
  const janId = iuranId(GID, janInput);
  const marId = iuranId(GID, marInput);

  try {
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      // fsGet existing document
      if ((!options?.method || options.method === 'GET') && urlStr.includes(janId)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            name: `projects/p/databases/(default)/documents/groups/${GID}/transaksi/${janId}`,
            fields: {
              ID_Transaksi: { stringValue: janId },
              Timestamp: { stringValue: '2026-01-01T00:00:00.000Z' },
              Tipe_Arus: { stringValue: 'Masuk' },
              ID_Kategori: { stringValue: 'KAT-1' },
              ID_Anggota: { stringValue: 'ANG-1' },
              Bulan_Iuran: { stringValue: 'Januari' },
              Tahun_Iuran: { stringValue: '2026' },
              Nominal: { integerValue: '10000' }
            }
          })
        };
      }
      // fsListAll (readTransactions) returns existing jan doc
      if ((!options?.method || options.method === 'GET') && urlStr.includes('pageSize=300')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            documents: [{
              name: `projects/p/databases/(default)/documents/groups/${GID}/transaksi/${janId}`,
              fields: {
                ID_Transaksi: { stringValue: janId },
                Tipe_Arus: { stringValue: 'Masuk' },
                ID_Anggota: { stringValue: 'ANG-1' },
                Bulan_Iuran: { stringValue: 'Januari' },
                Tahun_Iuran: { stringValue: '2026' }
              }
            }]
          })
        };
      }
      // fsCreateIfAbsent / audit (commit)
      if (options?.method === 'POST' && urlStr.includes(':commit')) {
        const body = JSON.parse(options.body);
        createdDocs.push(body);
        return { ok: true, status: 200, json: async () => ({ writeResults: [{}] }) };
      }
      // fsDelete
      if (options?.method === 'DELETE') {
        deletedDocs.push(urlStr);
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const res = await editTransaction(
      GID,
      {
        idTransaksi: janId,
        dataForm: {
          tipeArus: 'Masuk',
          idKategori: 'KAT-1',
          idAnggota: 'ANG-1',
          bulanIuran: 'Maret',
          tahunIuran: '2026',
          nominal: 10000,
          keterangan: 'Pindah ke Maret'
        }
      },
      { Authorization: 'Bearer test' }
    );

    assert.equal(res.status, true);
    assert.equal(res.data.idTransaksi, marId);
    assert.ok(deletedDocs.some((u) => u.includes(janId)), 'old janId document should be deleted');
    assert.ok(createdDocs.some((b) => JSON.stringify(b).includes(marId)), 'new marId document should be created');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('addBulkTransactions uses fsCreateIfAbsent precondition and handles duplicates gracefully', async () => {
  const originalFetch = globalThis.fetch;
  const dupId = iuranId(GID, { idAnggota: 'ANG-DUP', bulanIuran: 'Januari', tahunIuran: '2026' });

  try {
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      // readTransactions (fsListAll) returns empty
      if ((!options?.method || options.method === 'GET') && urlStr.includes('pageSize=300')) {
        return { ok: true, status: 200, json: async () => ({ documents: [] }) };
      }
      // Simulate fsCreateIfAbsent: first member succeeds, second fails precondition (already exists)
      if (options?.method === 'POST' && urlStr.includes(':commit')) {
        const body = JSON.parse(options.body);
        const writeName = body.writes?.[0]?.update?.name || '';
        if (writeName.includes(dupId)) {
          return {
            ok: false,
            status: 409,
            text: async () => 'FAILED_PRECONDITION: document already exists'
          };
        }
        return { ok: true, status: 200, json: async () => ({ writeResults: [{}] }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const payload = {
      listTrx: [
        { tipeArus: 'Masuk', idKategori: 'KAT-1', idAnggota: 'ANG-OK', bulanIuran: 'Januari', tahunIuran: '2026', nominal: 10000 },
        { tipeArus: 'Masuk', idKategori: 'KAT-1', idAnggota: 'ANG-DUP', bulanIuran: 'Januari', tahunIuran: '2026', nominal: 10000 }
      ]
    };

    const res = await addBulkTransactions(GID, payload, { Authorization: 'Bearer test' });
    assert.equal(res.status, true);
    assert.equal(res.data.inserted, 1);
    assert.deepEqual(res.data.skipped, ['ANG-DUP']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('addBulkTransactions tolerates individual row network failure without crashing entire batch', async () => {
  const originalFetch = globalThis.fetch;
  const failId = iuranId(GID, { idAnggota: 'ANG-FAIL', bulanIuran: 'Februari', tahunIuran: '2026' });

  try {
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      if ((!options?.method || options.method === 'GET') && urlStr.includes('pageSize=300')) {
        return { ok: true, status: 200, json: async () => ({ documents: [] }) };
      }
      if (options?.method === 'POST' && urlStr.includes(':commit')) {
        const body = JSON.parse(options.body);
        const writeName = body.writes?.[0]?.update?.name || '';
        if (writeName.includes(failId)) {
          throw new Error('Simulated network disconnect on row commit');
        }
        return { ok: true, status: 200, json: async () => ({ writeResults: [{}] }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const payload = {
      listTrx: [
        { tipeArus: 'Masuk', idKategori: 'KAT-1', idAnggota: 'ANG-PASS', bulanIuran: 'Februari', tahunIuran: '2026', nominal: 15000 },
        { tipeArus: 'Masuk', idKategori: 'KAT-1', idAnggota: 'ANG-FAIL', bulanIuran: 'Februari', tahunIuran: '2026', nominal: 15000 }
      ]
    };

    const res = await addBulkTransactions(GID, payload, { Authorization: 'Bearer test' });
    assert.equal(res.status, true);
    assert.equal(res.data.inserted, 1);
    assert.deepEqual(res.data.skipped, ['ANG-FAIL']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* ── Deletion ────────────────────────────────────────────────────── */

test('deleteDocument only allows the three data collections', async () => {
  // Anything credential-bearing must be unreachable through this handler.
  for (const collection of ['private', 'settings', 'groups', 'anggota_extra', '']) {
    await expectRejected(
      deleteDocument(GID, { targetCollection: collection, id: 'X' }, NO_HEADERS),
      `deleteDocument: ${collection || '(empty)'}`
    );
  }

  await expectRejected(deleteDocument(GID, { targetCollection: 'transaksi' }, NO_HEADERS), 'missing id');
});

test('deleteDocument rejects path traversal or invalid characters in id', async () => {
  const badIds = ['../foo', '..', 'foo/bar', 'a..b', '../../../settings/app_config', 'id with spaces', 'id!@#'];
  for (const badId of badIds) {
    await expectRejected(
      deleteDocument(GID, { targetCollection: 'transaksi', id: badId }, NO_HEADERS),
      `deleteDocument bad id: ${badId}`
    );
  }
});

test('editTransaction rejects path traversal or invalid characters in idTarget', async () => {
  const badIds = ['../foo', '..', 'foo/bar', '../../../settings/app_config', 'id with spaces'];
  for (const badId of badIds) {
    await expectRejected(
      editTransaction(GID, { idTransaksi: badId, dataForm: { nominal: 10000, tipeArus: 'Masuk', idKategori: 'KAT-1' } }, NO_HEADERS),
      `editTransaction bad idTarget: ${badId}`
    );
  }
});

test('updateMemberStatus rejects path traversal or invalid characters in idAnggota', async () => {
  const badIds = ['../foo', '..', 'foo/bar', '../../../settings/app_config', 'id with spaces'];
  for (const badId of badIds) {
    await expectRejected(
      updateMemberStatus(GID, { idAnggota: badId, statusAktif: 'Aktif' }, NO_HEADERS),
      `updateMemberStatus bad idAnggota: ${badId}`
    );
  }
});

/* ── Skipped months ──────────────────────────────────────────────── */

test('changeSkippedMonth requires an MM-YYYY value', async () => {
  const bad = ['', '6-2026', '13-2026', '00-2026', '2026-06', 'Juni-2026', '06/2026'];

  for (const month of bad) {
    await expectRejected(
      changeSkippedMonth(GID, { month }, NO_HEADERS, true),
      `changeSkippedMonth: ${month || '(empty)'}`
    );
    await expectRejected(
      changeSkippedMonth(GID, { month }, NO_HEADERS, false),
      `changeSkippedMonth remove: ${month || '(empty)'}`
    );
  }
});

/* ── Members ─────────────────────────────────────────────────────── */

test('addMember requires a name of at least two characters', async () => {
  await expectRejected(addMember(GID, {}, NO_HEADERS), 'missing name');
  await expectRejected(addMember(GID, { nama: '' }, NO_HEADERS), 'empty name');
  await expectRejected(addMember(GID, { nama: '   ' }, NO_HEADERS), 'whitespace name');
  await expectRejected(addMember(GID, { nama: 'A' }, NO_HEADERS), 'one-character name');
});

test('updateMemberStatus requires a valid status', async () => {
  await expectRejected(updateMemberStatus(GID, { idAnggota: 'ANG-1', statusAktif: 'Aktif!' }, NO_HEADERS), 'bad status');
  await expectRejected(updateMemberStatus(GID, { statusAktif: 'Aktif' }, NO_HEADERS), 'missing id');
});

/* ── Categories ──────────────────────────────────────────────────── */

test('addCategory requires a name and a valid type', async () => {
  await expectRejected(addCategory(GID, { nama: 'Iuran', tipe: 'Transfer' }, NO_HEADERS), 'bad type');
  await expectRejected(addCategory(GID, { tipe: 'Masuk' }, NO_HEADERS), 'missing name');
  await expectRejected(addCategory(GID, { nama: 'Sumbangan' }, NO_HEADERS), 'missing type');
});

/* ── Client-reported audit ───────────────────────────────────────── */

test('noteClientAudit only accepts the allow-listed actions', async () => {
  // Everything the server records itself must be rejected here, otherwise a
  // member could forge entries in the audit log.
  const forbidden = [
    'TAMBAH_TRANSAKSI',
    'HAPUS_TRANSAKSI',
    'STATUS_ANGGOTA',
    'LOGIN_ADMIN',
    'BUAT_GRUP',
    'UBAH_KREDENSIAL_ADMIN',
    '',
    'anything'
  ];

  for (const aksi of forbidden) {
    await expectRejected(noteClientAudit(GID, { aksi }, NO_HEADERS), `noteClientAudit: ${aksi || '(empty)'}`);
  }
});

/* ── Duplicate detection ─────────────────────────────────────────── */

test('findDuplicateIuran matches only the same member and period with Tipe_Arus Masuk', () => {
  const transactions = [
    { ID_Anggota: 'ANG-1', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026', Tipe_Arus: 'Masuk' },
    { ID_Anggota: 'ANG-1', Bulan_Iuran: 'Februari', Tahun_Iuran: '2026', Tipe_Arus: 'Masuk' },
    { ID_Anggota: 'ANG-2', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026', Tipe_Arus: 'Masuk' }
  ];

  assert.ok(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' }));
  assert.ok(findDuplicateIuran(transactions, { idAnggota: 'ANG-2', bulanIuran: 'Januari', tahunIuran: '2026' }));
  assert.equal(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Maret', tahunIuran: '2026' }), undefined);
  assert.equal(findDuplicateIuran(transactions, { idAnggota: 'ANG-3', bulanIuran: 'Januari', tahunIuran: '2026' }), undefined);
});

test('findDuplicateIuran compares the year as a string', () => {
  // Years arrive as strings from Firestore but may be numbers in a payload.
  const transactions = [{ ID_Anggota: 'ANG-1', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026', Tipe_Arus: 'Masuk' }];
  assert.ok(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: 2026 }));
});

test('findDuplicateIuran ignores transaction with excludeId', () => {
  const transactions = [
    { ID_Transaksi: 'TRX-101', ID_Anggota: 'ANG-1', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026', Tipe_Arus: 'Masuk' },
    { ID_Transaksi: 'TRX-102', ID_Anggota: 'ANG-1', Bulan_Iuran: 'Februari', Tahun_Iuran: '2026', Tipe_Arus: 'Masuk' }
  ];
  assert.equal(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' }, 'TRX-101'), undefined);
  assert.ok(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' }, 'TRX-999'));
});

test('findDuplicateIuran ignores transactions with Tipe_Arus Keluar', () => {
  const transactions = [
    { ID_Anggota: 'ANG-1', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026', Tipe_Arus: 'Keluar' }
  ];
  assert.equal(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' }), undefined);
});

test('isIuranPayment requires Tipe_Arus Masuk and valid member & period', () => {
  assert.equal(isIuranPayment({ tipeArus: 'Masuk', idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' }), true);
  assert.equal(isIuranPayment({ tipeArus: 'Keluar', idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' }), false);
  assert.equal(isIuranPayment({ tipeArus: 'Masuk', idAnggota: '-', bulanIuran: 'Januari', tahunIuran: '2026' }), false);
  assert.equal(isIuranPayment({ tipeArus: 'Masuk', idAnggota: 'ANG-1', bulanIuran: '-', tahunIuran: '2026' }), false);
  assert.equal(isIuranPayment({ tipeArus: 'Masuk', idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '-' }), false);
});

/* ── Dispatch table ──────────────────────────────────────────────── */

test('the write dispatch table exposes exactly the expected actions', () => {
  const expected = [
    'tambahTransaksi',
    'tambahTransaksiMassal',
    'editTransaksi',
    'hapusTransaksi',
    'hapusAnggota',
    'hapusKategori',
    'tambahAnggota',
    'updateStatusAnggota',
    'tambahKategori',
    'addSkippedMonth',
    'removeSkippedMonth',
    'setKasStart',
    'catatAktivitas',
    'restoreSnapshot'
  ];

  assert.deepEqual(Object.keys(WRITE_HANDLERS).sort(), [...expected].sort());
  for (const [name, handler] of Object.entries(WRITE_HANDLERS)) {
    assert.equal(typeof handler, 'function', `${name} must be a function`);
  }
});

/* ── Snapshot restore guards ─────────────────────────────────────── */

test('restoreSnapshot rejects malformed snapshot payload before touching Firestore', async () => {
  await expectRejected(restoreSnapshot(GID, {}, NO_HEADERS), 'empty payload');
  await expectRejected(restoreSnapshot(GID, { data: {} }, NO_HEADERS), 'missing collections');
  await expectRejected(restoreSnapshot(GID, { data: { anggota: 'not an array', transaksi: [] } }, NO_HEADERS), 'invalid anggota type');
});

test('restoreSnapshot rejects document IDs with path traversal or invalid characters', async () => {
  await expectRejected(
    restoreSnapshot(GID, {
      data: {
        anggota: [{ ID_Anggota: '../../../settings/app_config', Nama_Anggota: 'Bad' }],
        kategori: [],
        transaksi: []
      }
    }, NO_HEADERS),
    'bad anggota id'
  );

  await expectRejected(
    restoreSnapshot(GID, {
      data: {
        anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Ok' }],
        kategori: [{ ID_Kategori: '../bad_cat', Tipe: 'Masuk' }],
        transaksi: []
      }
    }, NO_HEADERS),
    'bad kategori id'
  );

  await expectRejected(
    restoreSnapshot(GID, {
      data: {
        anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Ok' }],
        kategori: [{ ID_Kategori: 'KAT-1', Tipe: 'Masuk' }],
        transaksi: [{ ID_Transaksi: '../../private/config', nominal: 1000, tipeArus: 'Masuk', idKategori: 'KAT-1' }]
      }
    }, NO_HEADERS),
    'bad transaksi id'
  );
});

test('restoreSnapshot rejects snapshot with duplicate IDs before touching Firestore', async () => {
  // Duplicate anggota
  const resAng = await expectRejected(
    restoreSnapshot(
      GID,
      {
        data: {
          anggota: [
            { ID_Anggota: 'ANG-1', Nama_Anggota: 'Anggota Satu' },
            { ID_Anggota: 'ANG-1', Nama_Anggota: 'Anggota Kembar' }
          ],
          kategori: [{ ID_Kategori: 'KAT-1', Tipe: 'Masuk' }],
          transaksi: []
        }
      },
      NO_HEADERS
    ),
    'duplicate ID_Anggota'
  );
  assert.match(resAng.message, /duplikat ID_Anggota/);

  // Duplicate kategori
  const resKat = await expectRejected(
    restoreSnapshot(
      GID,
      {
        data: {
          anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Anggota Satu' }],
          kategori: [
            { ID_Kategori: 'KAT-1', Tipe: 'Masuk' },
            { ID_Kategori: 'KAT-1', Tipe: 'Keluar' }
          ],
          transaksi: []
        }
      },
      NO_HEADERS
    ),
    'duplicate ID_Kategori'
  );
  assert.match(resKat.message, /duplikat ID_Kategori/);

  // Duplicate transaksi
  const resTrx = await expectRejected(
    restoreSnapshot(
      GID,
      {
        data: {
          anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Anggota Satu' }],
          kategori: [{ ID_Kategori: 'KAT-1', Tipe: 'Masuk' }],
          transaksi: [
            { ID_Transaksi: 'TRX-101', Nominal: 10000, Tipe_Arus: 'Masuk', ID_Kategori: 'KAT-1' },
            { ID_Transaksi: 'TRX-101', Nominal: 20000, Tipe_Arus: 'Masuk', ID_Kategori: 'KAT-1' }
          ]
        }
      },
      NO_HEADERS
    ),
    'duplicate ID_Transaksi'
  );
  assert.match(resTrx.message, /duplikat ID_Transaksi/);
});

test('restoreSnapshot rejects snapshot exceeding collection limits', async () => {
  const overAng = Array.from({ length: 1001 }, (_, i) => ({ ID_Anggota: `A-${i}`, Nama_Anggota: `User ${i}` }));
  const resAng = await expectRejected(
    restoreSnapshot(GID, { data: { anggota: overAng, transaksi: [] } }, NO_HEADERS),
    'over 1000 anggota'
  );
  assert.match(resAng.message, /batas maksimum anggota/);

  const overTrx = Array.from({ length: 10001 }, (_, i) => ({
    ID_Transaksi: `T-${i}`,
    Nominal: 1000,
    Tipe_Arus: 'Masuk',
    ID_Kategori: 'KAT-1'
  }));
  const resTrx = await expectRejected(
    restoreSnapshot(GID, { data: { anggota: [], transaksi: overTrx } }, NO_HEADERS),
    'over 10000 transaksi'
  );
  assert.match(resTrx.message, /batas maksimum transaksi/);
});

test('validateSnapshot accepts realistic snapshot shape produced by exportJSONBackup', () => {
  const realisticSnapshot = {
    anggota: [
      {
        ID_Anggota: 'ANG-1',
        Nama_Anggota: 'Budi Santoso',
        Nomor_WA: '08123456789',
        Status_Aktif: 'Aktif'
      }
    ],
    kategori: [
      {
        ID_Kategori: 'KAT-1',
        Nama_Kategori: 'Iuran Bulanan',
        Tipe: 'Masuk'
      }
    ],
    transaksi: [
      {
        ID_Transaksi: 'TRX-977FA9E41BD0DF20',
        Timestamp: '2026-03-20T10:00:00.000Z',
        Tipe_Arus: 'Masuk',
        ID_Kategori: 'KAT-1',
        ID_Anggota: 'ANG-1',
        Bulan_Iuran: 'Maret',
        Tahun_Iuran: '2026',
        Nominal: 10000,
        Keterangan: 'Iuran Kas Maret'
      }
    ],
    skippedMonths: ['01-2026']
  };

  const validated = validateSnapshot(realisticSnapshot);
  assert.equal(validated.valid, true);
  assert.equal(validated.data.transaksi.length, 1);
  assert.equal(validated.data.transaksi[0].ID_Transaksi, 'TRX-977FA9E41BD0DF20');
  assert.equal(validated.data.transaksi[0].Nominal, 10000);
});

test('restoreSnapshot accepts valid snapshot end-to-end with mocked Firestore REST', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      // Mock fsListAll returning empty documents
      if (!options?.method || options.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ documents: [] })
        };
      }
      // Mock fsCommit or fsPatch
      return {
        ok: true,
        status: 200,
        json: async () => ({ writeResults: [{}] })
      };
    };
    const realisticPayload = {
      data: {
        anggota: [
          {
            ID_Anggota: 'ANG-1',
            Nama_Anggota: 'Budi Santoso',
            Nomor_WA: '08123456789',
            Status_Aktif: 'Aktif'
          }
        ],
        kategori: [
          {
            ID_Kategori: 'KAT-1',
            Nama_Kategori: 'Iuran Kas',
            Tipe: 'Masuk'
          }
        ],
        transaksi: [
          {
            ID_Transaksi: 'TRX-101',
            Timestamp: '2026-03-20T10:00:00.000Z',
            Tipe_Arus: 'Masuk',
            ID_Kategori: 'KAT-1',
            ID_Anggota: 'ANG-1',
            Bulan_Iuran: 'Maret',
            Tahun_Iuran: '2026',
            Nominal: 10000,
            Keterangan: 'Iuran Maret'
          }
        ],
        skippedMonths: ['01-2026']
      }
    };

    const result = await restoreSnapshot(GID, realisticPayload, { Authorization: 'Bearer test' });
    assert.equal(result.status, true);
    assert.equal(result.data.transaksi, 1);
    assert.equal(result.data.anggota, 1);
    assert.equal(result.data.kategori, 1);
    assert.match(result.message, /Database berhasil dipulihkan/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('restoreSnapshot writes before deleting and only prunes stale documents (no destructive wipe)', async () => {
  const originalFetch = globalThis.fetch;
  const events = []; // ordered log of {kind, detail}
  try {
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      // fsListAll: the members collection already holds ANG-1 (kept) and ANG-OLD (stale).
      if ((!options?.method || options.method === 'GET') && urlStr.includes('/anggota')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            documents: [
              { name: `projects/p/databases/(default)/documents/groups/${GID}/anggota/ANG-1`, fields: { ID_Anggota: { stringValue: 'ANG-1' } } },
              { name: `projects/p/databases/(default)/documents/groups/${GID}/anggota/ANG-OLD`, fields: { ID_Anggota: { stringValue: 'ANG-OLD' } } }
            ]
          })
        };
      }
      if (!options?.method || options.method === 'GET') {
        return { ok: true, status: 200, json: async () => ({ documents: [] }) };
      }
      if (options.method === 'POST' && urlStr.includes(':commit')) {
        const body = JSON.parse(options.body);
        const isDelete = body.writes?.[0]?.delete !== undefined;
        events.push({ kind: isDelete ? 'delete' : 'write', names: body.writes.map((w) => w.delete || w.update?.name) });
        return { ok: true, status: 200, json: async () => ({ writeResults: [{}] }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const payload = {
      data: {
        anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi' }],
        kategori: [],
        transaksi: [],
        skippedMonths: []
      }
    };

    const result = await restoreSnapshot(GID, payload, { Authorization: 'Bearer test' });
    assert.equal(result.status, true);

    // The upsert for a collection must be committed before its prune delete.
    const firstWriteIdx = events.findIndex((e) => e.kind === 'write');
    const firstDeleteIdx = events.findIndex((e) => e.kind === 'delete');
    assert.ok(firstWriteIdx !== -1, 'at least one write must happen');
    assert.ok(firstWriteIdx < firstDeleteIdx || firstDeleteIdx === -1, 'writes must precede deletes');

    // Only the stale ANG-OLD is deleted; the kept ANG-1 is never deleted.
    const deletedNames = events.filter((e) => e.kind === 'delete').flatMap((e) => e.names);
    assert.ok(deletedNames.some((n) => n.includes('ANG-OLD')), 'stale doc ANG-OLD must be pruned');
    assert.ok(!deletedNames.some((n) => n.includes('/anggota/ANG-1')), 'kept doc ANG-1 must never be deleted');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* ── Identifier generation & entropy ─────────────────────────────── */

test('newId enforces entropy floor and generates distinct values', () => {
  const samples = new Set();
  for (let i = 0; i < 500; i++) {
    const id = newId('TRX');
    assert.ok(id.startsWith('TRX-'), `Expected TRX- prefix, got: ${id}`);
    // Floor is 8 bytes = 16 hex characters
    const hexPart = id.replace('TRX-', '');
    assert.ok(hexPart.length >= 16, `Expected hex part to be >= 16 chars, got ${hexPart.length} (${id})`);
    samples.add(id);
  }
  assert.equal(samples.size, 500, 'All 500 generated IDs must be strictly unique');
});

test('iuranId produces deterministic hash-based IDs', () => {
  const inputA = { idAnggota: 'ANG-01', bulanIuran: 'Januari', tahunIuran: '2026' };
  const inputB = { idAnggota: 'ANG-01', bulanIuran: 'Februari', tahunIuran: '2026' };

  const idA1 = iuranId(GID, inputA);
  const idA2 = iuranId(GID, inputA);
  const idB = iuranId(GID, inputB);

  assert.equal(idA1, idA2, 'Same input must produce identical iuranId');
  assert.notEqual(idA1, idB, 'Different periods must produce distinct iuranIds');
  assert.ok(idA1.startsWith('TRX-'), `Expected TRX- prefix, got ${idA1}`);
  assert.equal(idA1.replace('TRX-', '').length, 24, 'Hex digest length should be 24 chars');
});
