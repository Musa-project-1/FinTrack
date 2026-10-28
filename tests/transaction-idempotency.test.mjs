import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRequestFingerprint,
  transactionIdForOperation,
  isValidOperationId,
  parseOperationId,
  buildReceiptWrite,
  receiptToResponse,
  OPERATIONS_COLLECTION
} from '../api/_transaction-idempotency.js';
import { addTransaction, editTransaction, deleteDocument, addBulkTransactions } from '../api/_write-transactions.js';
import { readTransactions, readGroupData } from '../api/_group-read.js';
import { decodeFields } from '../api/_sa.js';

class MemoryFirestore {
  constructor(projectId = 'finkas-kas') {
    this.projectId = projectId;
    this.docs = new Map(); // docPath -> fields
  }

  docPath(url) {
    const prefix = `projects/${this.projectId}/databases/(default)/documents/`;
    let str = String(url);
    if (str.startsWith('/')) str = str.slice(1);
    const idx = str.indexOf(prefix);
    if (idx === -1) return null;
    let path = str.slice(idx + prefix.length);
    const queryIdx = path.indexOf('?');
    if (queryIdx !== -1) path = path.slice(0, queryIdx);
    return decodeURIComponent(path);
  }

  handleFetch(url, opts) {
    const urlStr = String(url);
    const method = (opts?.method || 'GET').toUpperCase();

    if (urlStr.includes('oauth2.googleapis.com')) {
      return new Response(JSON.stringify({ access_token: 'mock-sa-token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (urlStr.includes(':commit') && method === 'POST') {
      const body = JSON.parse(opts.body || '{}');
      const writes = body.writes || [];
      const writeResults = [];
      for (const w of writes) {
        if (w.currentDocument?.exists === false) {
          const path = this.docPath(w.update.name);
          if (this.docs.has(path)) {
            return new Response(JSON.stringify({
              error: { code: 409, status: 'ALREADY_EXISTS', message: 'Document already exists' }
            }), { status: 409, headers: { 'Content-Type': 'application/json' } });
          }
        }
        if (w.update) {
          const path = this.docPath(w.update.name);
          const current = this.docs.get(path) || {};
          const updated = { ...current, ...(w.update.fields || {}) };
          this.docs.set(path, updated);
          writeResults.push({ updateTime: new Date().toISOString() });
        } else if (w.delete) {
          const path = this.docPath(w.delete);
          this.docs.delete(path);
          writeResults.push({});
        }
      }
      return new Response(JSON.stringify({ writeResults }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'GET') {
      const path = this.docPath(urlStr);
      if (urlStr.includes('pageSize=')) {
        const results = [];
        for (const [docPath, fields] of this.docs.entries()) {
          const lastSlash = docPath.lastIndexOf('/');
          const parentCol = lastSlash !== -1 ? docPath.slice(0, lastSlash) : '';
          if (parentCol === path) {
            results.push({
              name: `projects/${this.projectId}/databases/(default)/documents/${docPath}`,
              fields
            });
          }
        }
        return new Response(JSON.stringify({ documents: results }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (this.docs.has(path)) {
        return new Response(JSON.stringify({
          name: `projects/${this.projectId}/databases/(default)/documents/${path}`,
          fields: this.docs.get(path)
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('{"error": "NOT_FOUND"}', { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'PATCH') {
      const path = this.docPath(urlStr);
      const body = JSON.parse(opts.body || '{}');
      const current = this.docs.get(path) || {};
      const newFields = body.fields || {};
      const merged = { ...current, ...newFields };
      this.docs.set(path, merged);
      return new Response(JSON.stringify({
        name: `projects/${this.projectId}/databases/(default)/documents/${path}`,
        fields: merged
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'DELETE') {
      const path = this.docPath(urlStr);
      this.docs.delete(path);
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

test('isValidOperationId validates format and length', () => {
  assert.equal(isValidOperationId('OP-1234567890abcdef'), true);
  assert.equal(isValidOperationId('c56a4180-65aa-42ec-a945-5fd21dec0538'), true);
  assert.equal(isValidOperationId('OP-123'), false, 'too short');
  assert.equal(isValidOperationId(''), false, 'empty');
  assert.equal(isValidOperationId(null), false, 'null');
  assert.equal(isValidOperationId('bad id with spaces!'), false, 'invalid characters');
});

test('parseOperationId enforces length cap and rejects oversized IDs rather than truncating', () => {
  assert.deepEqual(parseOperationId(''), { id: null });
  assert.deepEqual(parseOperationId(null), { id: null });
  assert.deepEqual(parseOperationId(undefined), { id: null });
  assert.deepEqual(parseOperationId('OP-VALID-12345678'), { id: 'OP-VALID-12345678' });

  const oversized = 'A'.repeat(129);
  const resOver = parseOperationId(oversized);
  assert.ok(resOver.error);
  assert.match(resOver.error, /128/);

  const resInvalid = parseOperationId('short');
  assert.ok(resInvalid.error);
});

test('computeRequestFingerprint is deterministic and sensitive to payload changes', () => {
  const data1 = {
    nominal: 10000,
    tipeArus: 'Masuk',
    idKategori: 'KAT-1',
    idAnggota: 'ANG-1',
    bulanIuran: 'Januari',
    tahunIuran: '2026',
    keterangan: 'Cicilan 1'
  };
  const data2 = { ...data1 };
  const dataDifferent = { ...data1, nominal: 15000 };

  const fp1 = computeRequestFingerprint('tambahTransaksi', data1);
  const fp2 = computeRequestFingerprint('tambahTransaksi', data2);
  const fpDiff = computeRequestFingerprint('tambahTransaksi', dataDifferent);

  assert.equal(typeof fp1, 'string');
  assert.equal(fp1.length, 64, 'SHA-256 hex string is 64 chars');
  assert.equal(fp1, fp2, 'identical normalized payloads yield identical fingerprints');
  assert.notEqual(fp1, fpDiff, 'different nominal yields different fingerprint');
});

test('computeRequestFingerprint produces identical hash regardless of key insertion order', () => {
  const orderA = { nominal: 10000, idAnggota: 'ANG-1', bulanIuran: 'Januari' };
  const orderB = { bulanIuran: 'Januari', nominal: 10000, idAnggota: 'ANG-1' };

  const fpA = computeRequestFingerprint('tambahTransaksi', orderA);
  const fpB = computeRequestFingerprint('tambahTransaksi', orderB);

  assert.equal(fpA, fpB, 'fingerprint must be invariant to object key order');
});

test('transactionIdForOperation produces fixed-width deterministic ID', () => {
  const id1 = transactionIdForOperation('GRP-1', 'OP-ABCDEF1234567890');
  const id2 = transactionIdForOperation('GRP-1', 'OP-ABCDEF1234567890');
  const id3 = transactionIdForOperation('GRP-1', 'OP-DIFFERENT123456');

  assert.match(id1, /^TRX-[0-9A-F]{16}$/);
  assert.equal(id1, id2, 'deterministic for same group and opId');
  assert.notEqual(id1, id3, 'distinct for different opId');
});

test('buildReceiptWrite formats Firestore update with exists:false precondition', () => {
  const gid = 'GRP-TEST';
  const opId = 'OP-1234567890';
  const fp = 'fingerprint-abc';
  const response = { status: true, message: 'Transaksi disimpan.', data: { ID_Transaksi: 'TRX-1' } };

  const write = buildReceiptWrite(gid, opId, fp, 'tambahTransaksi', response);
  assert.equal(write.currentDocument?.exists, false, 'precondition exists:false is mandatory');
  assert.ok(write.update?.name?.includes(`groups/${gid}/${OPERATIONS_COLLECTION}/${opId}`));

  const receiptFields = write.update?.fields;
  assert.equal(receiptFields?.operationId?.stringValue, opId);
  assert.equal(receiptFields?.fingerprint?.stringValue, fp);
  assert.equal(receiptFields?.action?.stringValue, 'tambahTransaksi');
  assert.equal(receiptFields?.status?.stringValue, 'COMMITTED');
  assert.equal(receiptFields?.responseStatus?.booleanValue, true);
});

test('receiptToResponse reconstructs standard API response', () => {
  const receipt = {
    operationId: 'OP-1',
    fingerprint: 'fp',
    responseStatus: true,
    responseMessage: 'Transaksi disimpan.',
    responseData: { ID_Transaksi: 'TRX-10', Nominal: 5000 }
  };
  const res = receiptToResponse(receipt);
  assert.equal(res.status, true);
  assert.equal(res.message, 'Transaksi disimpan.');
  assert.deepEqual(res.data, { ID_Transaksi: 'TRX-10', Nominal: 5000 });
});

/* ── Slice 2: addTransaction idempotency and multiple installments ── */

test('addTransaction with unique operationId allows multiple installments for same member and month', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => memDb.handleFetch(url, opts);

  const GID = 'GRP-IDEMP';
  const HEADERS = { Authorization: 'Bearer mock-token' };

  try {
    // Installment 1: Rp5.000 for Januari 2026
    const res1 = await addTransaction(GID, {
      operationId: 'OP-INSTALLMENT-1',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Januari',
        tahunIuran: '2026',
        nominal: 5000,
        keterangan: 'Cicilan 1'
      }
    }, HEADERS);

    assert.equal(res1.status, true);
    assert.equal(res1.data.Nominal, 5000);
    assert.equal(res1.data.operationId, 'OP-INSTALLMENT-1');

    // Installment 2: Another Rp5.000 for same member and SAME month with NEW operationId
    const res2 = await addTransaction(GID, {
      operationId: 'OP-INSTALLMENT-2',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Januari',
        tahunIuran: '2026',
        nominal: 5000,
        keterangan: 'Cicilan 2'
      }
    }, HEADERS);

    assert.equal(res2.status, true);
    assert.equal(res2.data.Nominal, 5000);
    assert.notEqual(res1.data.ID_Transaksi, res2.data.ID_Transaksi, 'each installment has unique ID');

    // Verify both installments exist in the ledger via readTransactions
    const rows = await readTransactions(GID, HEADERS);
    const janRows = rows.filter((r) => r.ID_Anggota === 'ANG-1' && r.Bulan_Iuran === 'Januari');
    assert.equal(janRows.length, 2, 'both installments must exist as separate ledger rows');
    const total = janRows.reduce((sum, r) => sum + Number(r.Nominal), 0);
    assert.equal(total, 10000, 'combined total settles the monthly dues');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('addTransaction replay with same operationId returns original result without duplicating ledger rows', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => memDb.handleFetch(url, opts);

  const GID = 'GRP-IDEMP';
  const HEADERS = { Authorization: 'Bearer mock-token' };

  try {
    const payload = {
      operationId: 'OP-REPLAY-1',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Februari',
        tahunIuran: '2026',
        nominal: 10000,
        keterangan: 'Iuran Feb'
      }
    };

    const first = await addTransaction(GID, payload, HEADERS);
    assert.equal(first.status, true);

    // Replay exact same payload with same operationId
    const second = await addTransaction(GID, payload, HEADERS);
    assert.equal(second.status, true);
    assert.equal(second.data.ID_Transaksi, first.data.ID_Transaksi);
    assert.equal(second.data.Nominal, 10000);

    const rows = await readTransactions(GID, HEADERS);
    const febRows = rows.filter((r) => r.ID_Anggota === 'ANG-1' && r.Bulan_Iuran === 'Februari');
    assert.equal(febRows.length, 1, 'exactly-once: exactly 1 transaction must exist in ledger');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('addTransaction rejects same operationId when submitted with different payload', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => memDb.handleFetch(url, opts);

  const GID = 'GRP-IDEMP';
  const HEADERS = { Authorization: 'Bearer mock-token' };

  try {
    const res1 = await addTransaction(GID, {
      operationId: 'OP-CONFLICT-1',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Maret',
        tahunIuran: '2026',
        nominal: 10000,
        keterangan: 'Original'
      }
    }, HEADERS);
    assert.equal(res1.status, true);

    // Submit same operationId with different nominal
    const res2 = await addTransaction(GID, {
      operationId: 'OP-CONFLICT-1',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Maret',
        tahunIuran: '2026',
        nominal: 20000,
        keterangan: 'Tampered'
      }
    }, HEADERS);

    assert.equal(res2.status, false, 'payload mismatch on same operationId must reject');
    assert.match(res2.message, /operation ID/i);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('replay of operationId after transaction deletion does NOT resurrect the transaction', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => memDb.handleFetch(url, opts);

  const GID = 'GRP-IDEMP';
  const HEADERS = { Authorization: 'Bearer mock-token' };

  try {
    const payload = {
      operationId: 'OP-RESURRECT-TEST',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'April',
        tahunIuran: '2026',
        nominal: 10000,
        keterangan: 'Akan dihapus'
      }
    };

    const res1 = await addTransaction(GID, payload, HEADERS);
    assert.equal(res1.status, true);
    const createdTrxId = res1.data.ID_Transaksi;

    // Delete the transaction from ledger
    const resDel = await deleteDocument(GID, { targetCollection: 'transaksi', id: createdTrxId }, HEADERS);
    assert.equal(resDel.status, true);

    const rowsAfterDel = await readTransactions(GID, HEADERS);
    assert.equal(rowsAfterDel.length, 0, 'ledger must be empty after delete');

    // Late replay arrives (e.g. offline queue retry)
    const resReplay = await addTransaction(GID, payload, HEADERS);
    assert.equal(resReplay.status, true);

    // Assert the transaction was NOT resurrected in the ledger
    const rowsAfterReplay = await readTransactions(GID, HEADERS);
    assert.equal(rowsAfterReplay.length, 0, 'replay must NOT resurrect deleted payment in ledger');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('parallel replay of same operationId resolves safely to original receipt without creating duplicates', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => memDb.handleFetch(url, opts);

  const GID = 'GRP-IDEMP';
  const HEADERS = { Authorization: 'Bearer mock-token' };

  try {
    const payload = {
      operationId: 'OP-RACE-PARALLEL',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Mei',
        tahunIuran: '2026',
        nominal: 10000,
        keterangan: 'Parallel test'
      }
    };

    // Run both requests concurrently in Promise.all
    const [res1, res2] = await Promise.all([
      addTransaction(GID, payload, HEADERS),
      addTransaction(GID, payload, HEADERS)
    ]);

    assert.equal(res1.status, true);
    assert.equal(res2.status, true);
    assert.equal(res1.data.ID_Transaksi, res2.data.ID_Transaksi);

    const rows = await readTransactions(GID, HEADERS);
    const meiRows = rows.filter((r) => r.ID_Anggota === 'ANG-1' && r.Bulan_Iuran === 'Mei');
    assert.equal(meiRows.length, 1, 'only one transaction in ledger despite concurrent submission');
  } finally {
    globalThis.fetch = realFetch;
  }
});

/* ── Slice 3: editTransaction & deleteDocument idempotency & identity stability ── */

test('editTransaction preserves transaction identity (stable create identity across edits)', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => memDb.handleFetch(url, opts);

  const GID = 'GRP-IDEMP';
  const HEADERS = { Authorization: 'Bearer mock-token' };

  try {
    const createRes = await addTransaction(GID, {
      operationId: 'OP-CREATE-FOR-EDIT',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Juni',
        tahunIuran: '2026',
        nominal: 5000,
        keterangan: 'Cicilan 1 Juni'
      }
    }, HEADERS);
    assert.equal(createRes.status, true);
    const originalTrxId = createRes.data.ID_Transaksi;

    // Edit the transaction (e.g. adjust nominal to 7500 and note)
    const editRes = await editTransaction(GID, {
      operationId: 'OP-EDIT-1',
      idTransaksi: originalTrxId,
      dataForm: {
        idTransaksi: originalTrxId,
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Juni',
        tahunIuran: '2026',
        nominal: 7500,
        keterangan: 'Koreksi Cicilan 1 Juni'
      }
    }, HEADERS);

    assert.equal(editRes.status, true);
    assert.equal(editRes.data.idTransaksi, originalTrxId, 'create identity must be stable across edit');

    const rows = await readTransactions(GID, HEADERS);
    const junRows = rows.filter((r) => r.ID_Anggota === 'ANG-1' && r.Bulan_Iuran === 'Juni');
    assert.equal(junRows.length, 1);
    assert.equal(junRows[0].ID_Transaksi, originalTrxId);
    assert.equal(junRows[0].Nominal, 7500);

    // Replay edit with same operationId
    const editReplay = await editTransaction(GID, {
      operationId: 'OP-EDIT-1',
      idTransaksi: originalTrxId,
      dataForm: {
        idTransaksi: originalTrxId,
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Juni',
        tahunIuran: '2026',
        nominal: 7500,
        keterangan: 'Koreksi Cicilan 1 Juni'
      }
    }, HEADERS);
    assert.equal(editReplay.status, true);
    assert.equal(editReplay.data.idTransaksi, originalTrxId);

    // Conflict: edit with same operationId but different nominal must reject
    const editConflict = await editTransaction(GID, {
      operationId: 'OP-EDIT-1',
      idTransaksi: originalTrxId,
      dataForm: {
        idTransaksi: originalTrxId,
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Juni',
        tahunIuran: '2026',
        nominal: 9999,
        keterangan: 'Tampered edit'
      }
    }, HEADERS);
    assert.equal(editConflict.status, false);
    assert.match(editConflict.message, /operation ID/i);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('deleteDocument on transaction with operationId is idempotent', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => memDb.handleFetch(url, opts);

  const GID = 'GRP-IDEMP';
  const HEADERS = { Authorization: 'Bearer mock-token' };

  try {
    const createRes = await addTransaction(GID, {
      operationId: 'OP-CREATE-FOR-DELETE',
      dataForm: {
        tipeArus: 'Masuk',
        idKategori: 'KAT-1',
        idAnggota: 'ANG-1',
        bulanIuran: 'Juli',
        tahunIuran: '2026',
        nominal: 5000,
        keterangan: 'Akan dihapus'
      }
    }, HEADERS);
    assert.equal(createRes.status, true);
    const trxId = createRes.data.ID_Transaksi;

    const delPayload = {
      operationId: 'OP-DELETE-1',
      targetCollection: 'transaksi',
      idTransaksi: trxId
    };

    const del1 = await deleteDocument(GID, delPayload, HEADERS);
    assert.equal(del1.status, true);

    const rows = await readTransactions(GID, HEADERS);
    assert.equal(rows.filter((r) => r.ID_Transaksi === trxId).length, 0);

    // Replay delete with same operationId returns original result (no error: not found)
    const del2 = await deleteDocument(GID, delPayload, HEADERS);
    assert.equal(del2.status, true);
  } finally {
    globalThis.fetch = realFetch;
  }
});

/* ── Slice 4: Bulk transactions atomic idempotency ── */

test('addBulkTransactions with operationId is atomic (no partial write on commit failure) and returns real rows', async () => {
  const memDb = new MemoryFirestore();
  const realFetch = globalThis.fetch;
  let failCommit = false;

  globalThis.fetch = (url, opts) => {
    if (failCommit && opts?.method === 'POST' && url.includes(':commit')) {
      return new Response(JSON.stringify({
        error: { code: 503, status: 'UNAVAILABLE', message: 'Simulated network drop on batch commit' }
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    return memDb.handleFetch(url, opts);
  };

  const GID = 'GRP-IDEMP';
  const HEADERS = { Authorization: 'Bearer mock-token' };

  try {
    const bulkPayload = {
      operationId: 'OP-BULK-ATOMIC-1',
      listTrx: [
        {
          idAnggota: 'ANG-OK-1',
          nominal: 20000,
          bulanIuran: 'Agustus',
          tahunIuran: '2026',
          idKategori: 'KAT-1'
        },
        {
          idAnggota: 'ANG-OK-2',
          nominal: 20000,
          bulanIuran: 'Agustus',
          tahunIuran: '2026',
          idKategori: 'KAT-1'
        }
      ]
    };

    // Attempt 1: Full batch commit fails on network
    failCommit = true;
    await assert.rejects(async () => {
      await addBulkTransactions(GID, bulkPayload, HEADERS);
    });

    // Ledger must be completely empty: zero partial writes!
    const rowsAfterFail = await readTransactions(GID, HEADERS);
    assert.equal(rowsAfterFail.length, 0, 'no partial row writes allowed on failure');

    // Attempt 2: Network succeeds, atomic commit of all rows + receipt
    failCommit = false;
    const res2 = await addBulkTransactions(GID, bulkPayload, HEADERS);
    assert.equal(res2.status, true);
    assert.equal(res2.data.inserted, 2);
    assert.equal(res2.data.rows.length, 2);
    assert.ok(res2.data.rows[0].ID_Transaksi);
    assert.ok(res2.data.rows[1].ID_Transaksi);

    const rowsAfterSuccess = await readTransactions(GID, HEADERS);
    assert.equal(rowsAfterSuccess.length, 2);

    // Attempt 3: Replay returns identical cached response
    const res3 = await addBulkTransactions(GID, bulkPayload, HEADERS);
    assert.equal(res3.status, true);
    assert.deepEqual(res3.data, res2.data);
  } finally {
    globalThis.fetch = realFetch;
  }
});
