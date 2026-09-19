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

test('findDuplicateIuran matches only the same member and period', () => {
  const transactions = [
    { ID_Anggota: 'ANG-1', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026' },
    { ID_Anggota: 'ANG-1', Bulan_Iuran: 'Februari', Tahun_Iuran: '2026' },
    { ID_Anggota: 'ANG-2', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026' }
  ];

  assert.ok(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' }));
  assert.ok(findDuplicateIuran(transactions, { idAnggota: 'ANG-2', bulanIuran: 'Januari', tahunIuran: '2026' }));
  assert.equal(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Maret', tahunIuran: '2026' }), undefined);
  assert.equal(findDuplicateIuran(transactions, { idAnggota: 'ANG-3', bulanIuran: 'Januari', tahunIuran: '2026' }), undefined);
});

test('findDuplicateIuran compares the year as a string', () => {
  // Years arrive as strings from Firestore but may be numbers in a payload.
  const transactions = [{ ID_Anggota: 'ANG-1', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026' }];
  assert.ok(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: 2026 }));
});

test('findDuplicateIuran ignores transaction with excludeId', () => {
  const transactions = [
    { ID_Transaksi: 'TRX-101', ID_Anggota: 'ANG-1', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026' },
    { ID_Transaksi: 'TRX-102', ID_Anggota: 'ANG-1', Bulan_Iuran: 'Februari', Tahun_Iuran: '2026' }
  ];
  assert.equal(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' }, 'TRX-101'), undefined);
  assert.ok(findDuplicateIuran(transactions, { idAnggota: 'ANG-1', bulanIuran: 'Januari', tahunIuran: '2026' }, 'TRX-999'));
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

test('restoreSnapshot rejects snapshot with duplicate IDs before touching Firestore', async () => {
  // Duplicate anggota
  await expectRejected(
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

  // Duplicate kategori
  await expectRejected(
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

  // Duplicate transaksi
  await expectRejected(
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
