import { test } from 'node:test';
import assert from 'node:assert/strict';

const { encodeValue, decodeValue, encodeFields, decodeFields } = await import('../api/_sa.js');

/* ── Scalars ─────────────────────────────────────────────────────── */

test('scalars round-trip through the Firestore codec', () => {
  const cases = [
    ['plain string', 'pesan'],
    ['empty string', ''],
    ['zero', 0],
    ['positive integer', 10000],
    ['negative integer', -250],
    ['fractional number', 100.5],
    ['true', true],
    ['false', false],
    ['null', null]
  ];

  for (const [label, value] of cases) {
    assert.deepEqual(decodeValue(encodeValue(value)), value, `round-trip failed for ${label}`);
  }
});

test('integers and fractions use different Firestore types', () => {
  assert.deepEqual(encodeValue(42), { integerValue: '42' });
  assert.deepEqual(encodeValue(42.5), { doubleValue: 42.5 });

  // Both decode back to numbers.
  assert.equal(decodeValue(encodeValue(42)), 42);
  assert.equal(decodeValue(encodeValue(42.5)), 42.5);
});

test('undefined is stored as null rather than dropped', () => {
  assert.deepEqual(encodeValue(undefined), { nullValue: null });
});

/* ── Collections ─────────────────────────────────────────────────── */

test('arrays of primitives round-trip rather than being stringified', () => {
  // The previous implementation flattened every array to strings, so
  // [10000, 20000] came back as ['10000', '20000'].
  const numbers = [10000, 20000, 30000];
  const decoded = decodeValue(encodeValue(numbers));

  assert.deepEqual(decoded, numbers);
  assert.equal(typeof decoded[0], 'number');
});

test('arrays of objects survive the round-trip', () => {
  const value = [
    { nama: 'Budi', nominal: 10000, aktif: true },
    { nama: 'Sari', nominal: 25000, aktif: false }
  ];

  assert.deepEqual(decodeValue(encodeValue(value)), value);
});

test('nested arrays round-trip', () => {
  const value = [[1, 2], [3, [4, 5]]];
  assert.deepEqual(decodeValue(encodeValue(value)), value);
});

test('empty arrays and empty objects round-trip', () => {
  assert.deepEqual(decodeValue(encodeValue([])), []);
  assert.deepEqual(decodeValue(encodeValue({})), {});
});

/* ── Documents ───────────────────────────────────────────────────── */

test('a whole transaction document round-trips', () => {
  const doc = {
    ID_Transaksi: 'TRX-AB12CD34',
    Timestamp: '2026-09-13T00:00:00.000Z',
    Tipe_Arus: 'Masuk',
    ID_Kategori: 'KAT-M1',
    ID_Anggota: 'ANG-1234',
    Bulan_Iuran: 'Januari',
    Tahun_Iuran: '2026',
    Nominal: 10000,
    Keterangan: 'Iuran Anggota',
    groupId: 'GRP-AAAA'
  };

  assert.deepEqual(decodeFields(encodeFields(doc)), doc);
});

test('skipped months (a string array) round-trip', () => {
  const settings = { skippedMonths: ['06-2026', '07-2026'] };
  assert.deepEqual(decodeFields(encodeFields(settings)), settings);
});

test('dot-separated keys are preserved verbatim', () => {
  // Firestore treats a bare key containing a dot as a nested path, so this
  // documents the current behaviour rather than asserting it is ideal.
  const doc = { 'a.b': 'c' };
  assert.deepEqual(Object.keys(decodeFields(encodeFields(doc))), ['a.b']);
});
