import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mockServiceAccount } from './helpers/mock-service-account.mjs';

process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';
const oauthResponse = mockServiceAccount();

import handler from '../api/data.ts';
import { ROLES, signSession, GROUP_SESSION_TTL } from '../api/_session.ts';
import { encodeFields } from '../api/_sa.ts';
import { deleteGroupTree } from '../api/_store.ts';
import { readGroupData, readAuditLog } from '../api/_group-read.ts';
import { parseTransactionInput } from '../api/_write-shared.ts';
import { setKasStart, changeSkippedMonth, updateMemberStatus } from '../api/_write-entities.ts';
import { addTransaction, addBulkTransactions, editTransaction, deleteDocument } from '../api/_write-transactions.ts';
import { validateAttachmentInput, sanitizeFileName, readAttachment, exportAttachments } from '../api/_attachments.ts';
import { validateSnapshot, exportSnapshot, MAX_SNAPSHOT_OPERATIONS } from '../api/_write-snapshot.ts';
import { computeRequestFingerprint } from '../api/_transaction-idempotency.ts';

const mockRes = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  setHeader(k, v) { this.headers[k] = v; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; }
});

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

after(() => {});

test('SEC-20: parseTransactionInput rejects sub-1 floats (0.4 -> 0), non-integers, bad month/year, and oversized IDs', () => {
  const invalidCases = [
    { nominal: 0.4, tipeArus: 'Masuk', idKategori: 'KAT-1' },
    { nominal: 0.01, tipeArus: 'Masuk', idKategori: 'KAT-1' },
    { nominal: 1000.5, tipeArus: 'Masuk', idKategori: 'KAT-1' },
    { nominal: true, tipeArus: 'Masuk', idKategori: 'KAT-1' },
    { nominal: [5000], tipeArus: 'Masuk', idKategori: 'KAT-1' },
    { nominal: 5000, tipeArus: 'Masuk', idKategori: 'A'.repeat(41) },
    { nominal: 5000, tipeArus: 'Masuk', idKategori: 'KAT-1', idAnggota: 'ANG-1|Jan' },
    { nominal: 5000, tipeArus: 'Masuk', idKategori: 'KAT-1', idAnggota: 'A'.repeat(41) },
    { nominal: 5000, tipeArus: 'Masuk', idKategori: 'KAT-1', bulanIuran: 'januari' },
    { nominal: 5000, tipeArus: 'Masuk', idKategori: 'KAT-1', bulanIuran: 'Month13' },
    { nominal: 5000, tipeArus: 'Masuk', idKategori: 'KAT-1', tahunIuran: '26' },
    { nominal: 5000, tipeArus: 'Masuk', idKategori: 'KAT-1', tahunIuran: '1999' },
    { nominal: 5000, tipeArus: 'Masuk', idKategori: 'KAT-1', tahunIuran: '2101' }
  ];

  for (const dataForm of invalidCases) {
    const parsed = parseTransactionInput(dataForm);
    assert.ok('error' in parsed, `Expected error for ${JSON.stringify(dataForm)}`);
  }

  const valid = parseTransactionInput({
    nominal: 10000,
    tipeArus: 'Masuk',
    idKategori: 'KAT-1',
    idAnggota: 'ANG-1',
    bulanIuran: 'Januari',
    tahunIuran: 2026
  });
  assert.ok(!('error' in valid));
  assert.equal(valid.nominal, 10000);
  assert.equal(valid.tahunIuran, '2026');
});

test('SEC-20: setKasStart and changeSkippedMonth reject years outside [2000, 2100]', async () => {
  for (const bad of ['01-0001', '12-1999', '01-2101', '01-2026-extra']) {
    const resKas = await setKasStart('GRP-1', { kasStart: bad }, {});
    assert.equal(resKas.status, false, `setKasStart should reject ${bad}`);
    const resSkip = await changeSkippedMonth('GRP-1', { month: bad }, {}, true);
    assert.equal(resSkip.status, false, `changeSkippedMonth should reject ${bad}`);
  }
});

test('SEC-20: addTransaction, addBulkTransactions, and editTransaction enforce category existence and direction match', async (t) => {
  const gid = 'GRP-CAT-CHECK';
  const headers = { Authorization: 'Bearer test' };
  const trxId = 'TRX-EXISTING-1';
  t.mock.method(globalThis, 'fetch', async (url) => {
    const target = String(url);
    if (target.includes(`/groups/${gid}/kategori/KAT-MASUK`)) {
      return Response.json({ fields: encodeFields({ ID_Kategori: 'KAT-MASUK', Nama_Kategori: 'Iuran', Tipe: 'Masuk', groupId: gid }) });
    }
    if (target.includes(`/groups/${gid}/kategori/KAT-FOREIGN`)) {
      return Response.json({ fields: encodeFields({ ID_Kategori: 'KAT-FOREIGN', Nama_Kategori: 'Iuran', Tipe: 'Masuk', groupId: 'GRP-OTHER' }) });
    }
    if (target.includes(`/groups/${gid}/transaksi/${trxId}`)) {
      return Response.json({ fields: encodeFields({ ID_Transaksi: trxId, Tipe_Arus: 'Masuk', ID_Kategori: 'KAT-MASUK', Nominal: 5000 }) });
    }
    return Response.json({}, { status: 404 });
  });

  // Missing category
  const missingRes = await addTransaction(gid, {
    dataForm: { nominal: 5000, tipeArus: 'Masuk', idKategori: 'KAT-MISSING' }
  }, headers);
  assert.equal(missingRes.status, false);
  assert.match(missingRes.message, /tidak ditemukan/i);

  // Foreign category groupId mismatch
  const foreignRes = await addTransaction(gid, {
    dataForm: { nominal: 5000, tipeArus: 'Masuk', idKategori: 'KAT-FOREIGN' }
  }, headers);
  assert.equal(foreignRes.status, false);

  // Wrong flow direction (Masuk category used for Keluar transaction)
  const mismatchAdd = await addTransaction(gid, {
    dataForm: { nominal: 5000, tipeArus: 'Keluar', idKategori: 'KAT-MASUK' }
  }, headers);
  assert.equal(mismatchAdd.status, false);
  assert.match(mismatchAdd.message, /hanya berlaku untuk arus Masuk/i);

  const mismatchBulk = await addBulkTransactions(gid, {
    operationId: 'OP-BULK-MISMATCH-1',
    listTrx: [{ nominal: 5000, tipeArus: 'Keluar', idKategori: 'KAT-MASUK', idAnggota: 'ANG-1' }]
  }, headers);
  assert.equal(mismatchBulk.status, false);

  const mismatchEdit = await editTransaction(gid, {
    idTransaksi: trxId,
    dataForm: { nominal: 5000, tipeArus: 'Keluar', idKategori: 'KAT-MASUK' }
  }, headers);
  assert.equal(mismatchEdit.status, false);
});

test('SEC-22: prototype pollution keys, deep responseData, and >40-char doc IDs are rejected across API modules', async () => {
  const protoPayload = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => computeRequestFingerprint('tambahTransaksi', protoPayload), /tidak diizinkan/);

  const ctorPayload = JSON.parse('{"constructor":{"prototype":{"polluted":true}}}');
  assert.throws(() => computeRequestFingerprint('tambahTransaksi', ctorPayload), /tidak diizinkan/);

  const badSnapProto = validateSnapshot(JSON.parse('{"anggota":[],"transaksi":[],"__proto__":{"x":1}}'));
  assert.equal(badSnapProto.valid, false);

  const badOpData = validateSnapshot({
    anggota: [],
    kategori: [{ ID_Kategori: 'KAT-1', Nama_Kategori: 'Iuran', Tipe: 'Masuk' }],
    transaksi: [],
    operations: [{
      operationId: 'OP-12345678',
      fingerprint: 'a'.repeat(64),
      responseData: JSON.parse('{"nested":{"__proto__":{"admin":true}}}')
    }]
  });
  assert.equal(badOpData.valid, false);

  const deepObj = {};
  let cur = deepObj;
  for (let i = 0; i < 10; i++) {
    cur.next = {};
    cur = cur.next;
  }
  const deepOpData = validateSnapshot({
    anggota: [],
    transaksi: [],
    operations: [{
      operationId: 'OP-DEEP-1234',
      fingerprint: 'a'.repeat(64),
      responseData: deepObj
    }]
  });
  assert.equal(deepOpData.valid, false);

  const missingCatName = validateSnapshot({
    anggota: [],
    kategori: [{ ID_Kategori: 'KAT-1', Tipe: 'Masuk' }],
    transaksi: []
  });
  assert.equal(missingCatName.valid, false);

  const badTxOpId = validateSnapshot({
    anggota: [],
    transaksi: [{ ID_Transaksi: 'TRX-1', Nominal: 1000, Tipe_Arus: 'Masuk', ID_Kategori: 'KAT-1', operationId: 'bad!' }]
  });
  assert.equal(badTxOpId.valid, false);

  // Oversized (>40 char) doc IDs must reject rather than silently truncating
  const over40 = 'A'.repeat(41);
  assert.equal((await editTransaction('GRP-1', { idTransaksi: over40, dataForm: { nominal: 1000, tipeArus: 'Masuk', idKategori: 'KAT-1' } }, {})).status, false);
  assert.equal((await deleteDocument('GRP-1', { targetCollection: 'transaksi', id: over40 }, {})).status, false);
  assert.equal((await updateMemberStatus('GRP-1', { idAnggota: over40, statusAktif: 'Aktif' }, {})).status, false);
  assert.equal(validateAttachmentInput({ idTransaksi: over40, file: { base64: PNG_HEADER.toString('base64') } }).valid, false);
  assert.equal((await readAttachment('GRP-1', { idTransaksi: over40 }, {})).status, false);
});

test('SEC-21: sanitizeFileName strips leading dots and prevents hidden/dot filenames', () => {
  assert.equal(sanitizeFileName('..jpg', 'TRX-1', 'image/jpeg'), 'jpg.jpg');
  assert.equal(sanitizeFileName('...', 'TRX-1', 'image/png'), 'bukti_TRX-1.png');
  assert.equal(sanitizeFileName('.htaccess', 'TRX-1', 'application/pdf'), 'htaccess.pdf');
});

test('SEC-07: exportSnapshot fails loudly on >40-page truncation, enforces 4 MiB limit, and supports includeAttachments:false', async (t) => {
  const gid = 'GRP-EXP-SIZE';
  const headers = { Authorization: 'Bearer test' };

  // 1. >40-page silent truncation guard in listAllInTx
  t.mock.method(globalThis, 'fetch', async (url) => {
    const s = String(url);
    if (s.endsWith(':beginTransaction')) return Response.json({ transaction: 'tx-1' });
    if (s.endsWith(':rollback')) return Response.json({});
    if (s.includes('pageSize=300') && s.includes('/transaksi')) {
      return Response.json({ documents: [], nextPageToken: 'still-more' });
    }
    if (s.includes('pageSize=300')) return Response.json({ documents: [] });
    return Response.json({ fields: encodeFields({ nama: 'Grup Besar' }) });
  });
  await assert.rejects(() => exportSnapshot(gid, headers), /40 halaman/);

  // 2. 4 MiB response cap with oversized attachment set & includeAttachments:false bypass
  const bigBase64 = Buffer.concat([PNG_HEADER, Buffer.alloc(480 * 1024, 2)]).toString('base64');
  const bigProofDocs = Array.from({ length: 8 }, (_, i) => ({
    name: `projects/p/databases/(default)/documents/groups/${gid}/transaction_proofs/TRX-${i}`,
    fields: encodeFields({
      groupId: gid,
      idTransaksi: `TRX-${i}`,
      name: `proof-${i}.png`,
      type: 'image/png',
      size: 480 * 1024 + PNG_HEADER.length,
      base64: bigBase64
    })
  }));
  t.mock.method(globalThis, 'fetch', async (url) => {
    const s = String(url);
    if (s.endsWith(':beginTransaction')) return Response.json({ transaction: 'tx-2' });
    if (s.endsWith(':rollback')) return Response.json({});
    if (s.includes('/transaction_proofs')) return Response.json({ documents: bigProofDocs });
    if (s.includes('pageSize=300')) return Response.json({ documents: [] });
    return Response.json({ fields: encodeFields({ nama: 'Grup Besar' }) });
  });

  const oversized = await exportSnapshot(gid, headers);
  assert.equal(oversized.status, false);
  assert.equal(oversized.payloadTooLarge, true);

  const ledgerOnly = await exportSnapshot(gid, { includeAttachments: false }, headers);
  assert.equal(ledgerOnly.status, true);
  assert.equal(ledgerOnly.data.snapshot.data.attachments.length, 0);

  const overAtt = await exportAttachments(gid, headers);
  assert.equal(overAtt.status, false);
  assert.equal(overAtt.payloadTooLarge, true);

  assert.equal(MAX_SNAPSHOT_OPERATIONS, 12000);
  const tooManyOps = validateSnapshot({
    anggota: [],
    transaksi: [],
    operations: Array.from({ length: 12001 }, (_, i) => ({
      operationId: `OP-CAP-${String(i).padStart(6, '0')}`,
      fingerprint: 'a'.repeat(64)
    }))
  });
  assert.equal(tooManyOps.valid, false);
});

test('SEC-07: deleteGroupTree paginates past 300 docs without hitting 12k fsListAll ceiling', async (t) => {
  const gid = 'GRP-BIG-DEL';
  let remaining = 350;
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    const s = String(url);
    const method = opts?.method || 'GET';
    if (method === 'GET' && s.includes('/transaksi') && s.includes('pageSize=300')) {
      const batch = Math.min(300, remaining);
      const docs = Array.from({ length: batch }, (_, i) => ({
        name: `projects/p/databases/(default)/documents/groups/${gid}/transaksi/TRX-${remaining - i}`,
        fields: {}
      }));
      return Response.json({ documents: docs });
    }
    if (method === 'GET' && s.includes('pageSize=300')) return Response.json({ documents: [] });
    if (method === 'POST' && s.endsWith(':commit')) {
      const writes = JSON.parse(opts.body).writes;
      remaining -= writes.length;
      return Response.json({ writeResults: writes.map(() => ({})) });
    }
    if (method === 'DELETE') return Response.json({});
    return Response.json({});
  });

  const deleted = await deleteGroupTree(gid, { Authorization: 'Bearer test' });
  assert.equal(deleted, 350);
  assert.equal(remaining, 0);
});

test('SEC-19: readGroupData omits Nomor_WA and operationId by default when includePrivate is false', async (t) => {
  const gid = 'GRP-PII';
  t.mock.method(globalThis, 'fetch', async (url) => {
    const s = String(url);
    if (s.includes('/anggota')) {
      return Response.json({
        documents: [{ name: 'doc1', fields: encodeFields({ ID_Anggota: 'ANG-1', Nama_Anggota: 'Ani', Nomor_WA: '628111222333' }) }]
      });
    }
    if (s.includes('/transaksi')) {
      return Response.json({
        documents: [{ name: 'doc2', fields: encodeFields({ ID_Transaksi: 'TRX-1', Nominal: 10000, operationId: 'OP-INTERNAL-1' }) }]
      });
    }
    if (s.includes('/kategori')) return Response.json({ documents: [] });
    return Response.json({}, { status: 404 });
  });

  const viewerData = await readGroupData(gid, {});
  assert.equal('Nomor_WA' in viewerData.anggota[0], false);
  assert.equal('operationId' in viewerData.transaksi[0], false);

  const adminData = await readGroupData(gid, {}, { includePrivate: true });
  assert.equal(adminData.anggota[0].Nomor_WA, '628111222333');
  assert.equal(adminData.transaksi[0].operationId, 'OP-INTERNAL-1');
});

test('SEC-23: readAuditLog queries Timestamp desc server-side and api/data rate-limits groups and writes', async (t) => {
  const requestedUrls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    const s = String(url);
    requestedUrls.push(s);
    if (s.startsWith('https://oauth2.googleapis.com/')) return oauthResponse();
    if (s.includes('/audit_log')) {
      return Response.json({
        documents: [
          { fields: encodeFields({ Timestamp: '2026-11-25T10:00:00.000Z', Aksi: 'NEWEST', groupId: 'GRP-AUD' }) },
          { fields: encodeFields({ Timestamp: '2026-11-24T10:00:00.000Z', Aksi: 'OLDER', groupId: 'GRP-AUD' }) }
        ]
      });
    }
    if (s.includes('/documents/groups?')) {
      return Response.json({ documents: [] });
    }
    return Response.json({ fields: encodeFields({ nama: 'Group Test', groupId: 'GRP-RL' }) });
  });

  const logs = await readAuditLog('GRP-AUD', {});
  assert.equal(logs[0].Aksi, 'NEWEST');
  assert.ok(requestedUrls.some((u) => u.includes('orderBy=Timestamp%20desc') && u.includes('pageSize=100')));

  // Public `groups` rate limit (120/min per IP)
  const ip = '203.0.113.77';
  for (let i = 0; i < 120; i++) {
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': ip }, body: { action: 'groups' } }, res);
    assert.equal(res.statusCode, 200);
  }
  const blockedGroups = mockRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': ip }, body: { action: 'groups' } }, blockedGroups);
  assert.equal(blockedGroups.statusCode, 429);
  assert.ok(blockedGroups.headers['Retry-After']);

  // Write rate limit (120/min per group+IP)
  const writeIp = '203.0.113.88';
  const adminToken = signSession({ role: ROLES.GROUP_ADMIN, gid: 'GRP-RL' }, GROUP_SESSION_TTL);
  for (let i = 0; i < 120; i++) {
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'x-forwarded-for': writeIp },
      body: { action: 'catatAktivitas', groupId: 'GRP-RL', sessionToken: adminToken, aksi: 'INVALID_TO_SKIP_DB' }
    }, res);
    assert.equal(res.statusCode, 400);
  }
  const blockedWrite = mockRes();
  await handler({
    method: 'POST',
    headers: { 'x-forwarded-for': writeIp },
    body: { action: 'catatAktivitas', groupId: 'GRP-RL', sessionToken: adminToken, aksi: 'LOGOUT_ADMIN' }
  }, blockedWrite);
  assert.equal(blockedWrite.statusCode, 429);
});
