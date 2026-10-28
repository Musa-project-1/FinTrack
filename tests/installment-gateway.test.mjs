import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateway, payment, pdf } from './helpers/installment-gateway.mjs';

// Approved seam: signed /api/data requests and public ledger/proof reads.
test('gateway bulk operation adds another installment and returns real committed rows', async (t) => {
  const db = gateway(t);
  assert.equal((await db.add('OP-INSTALLMENT-ONE')).code, 200);
  const payload = { action: 'tambahTransaksiMassal', operationId: 'OP-BULK-INSTALLMENT', listTrx: [payment()] };
  const result = await db.call(payload);
  assert.equal(result.code, 200);
  assert.equal(result.body.data.inserted, 1, 'a new operation is not deduped by member-period');
  assert.equal(result.body.data.rows.length, 1);
  assert.equal(result.body.data.rows[0].Nominal, 5000);
  assert.ok(result.body.data.rows[0].ID_Transaksi);
  assert.deepEqual(result.body.data.skipped, []);
  const replay = await db.call(payload);
  assert.deepEqual(replay.body.data, result.body.data);
  const rows = await db.rows();
  assert.equal(rows.length, 2);
  assert.equal(rows.reduce((sum, row) => sum + row.Nominal, 0), 10000);
});

test('gateway bulk rejects commit on failure without partial row writes then replays cleanly', async (t) => {
  const db = gateway(t);
  const payload = {
    action: 'tambahTransaksiMassal',
    operationId: 'OP-BULK-FAIL-REPLAY',
    listTrx: [payment({ idAnggota: 'ANG-1' }), payment({ idAnggota: 'ANG-2' })]
  };

  db.failCommit = true;
  const failure = await db.call(payload);
  assert.equal(failure.code, 500);

  // Assert zero partial writes
  const rowsAfterFail = await db.rows();
  assert.equal(rowsAfterFail.length, 0);

  // Replay after recovery
  const success = await db.call(payload);
  assert.equal(success.code, 200);
  assert.equal(success.body.data.inserted, 2);
  assert.equal(success.body.data.rows.length, 2);

  const rowsAfterSuccess = await db.rows();
  assert.equal(rowsAfterSuccess.length, 2);
});

test('gateway rejects operationId reuse when payload differs in timestamp, category or amount', async (t) => {
  const db = gateway(t);
  const opId = 'OP-FINGERPRINT-MISMATCH';
  const base = payment();
  assert.equal((await db.call({ action: 'tambahTransaksi', operationId: opId, dataForm: base })).code, 200);

  // Different timestamp
  const diffTs = await db.call({
    action: 'tambahTransaksi',
    operationId: opId,
    dataForm: { ...base, timestamp: '2026-01-20T10:00:00.000Z' }
  });
  assert.equal(diffTs.code, 400);
  assert.match(diffTs.body.message, /operation ID/i);

  // Different category
  const diffKat = await db.call({
    action: 'tambahTransaksi',
    operationId: opId,
    dataForm: { ...base, idKategori: 'KAT-OTHER' }
  });
  assert.equal(diffKat.code, 400);

  // Different amount
  const diffNominal = await db.call({
    action: 'tambahTransaksi',
    operationId: opId,
    dataForm: { ...base, nominal: 99999 }
  });
  assert.equal(diffNominal.code, 400);
});

test('deleted transaction is NOT resurrected by operationId replay', async (t) => {
  const db = gateway(t);
  const opId = 'OP-NO-RESURRECT';
  const createRes = await db.add(opId);
  assert.equal(createRes.code, 200);
  const id = createRes.body.data.ID_Transaksi;

  assert.equal((await db.remove(id)).code, 200);
  assert.equal((await db.rows()).length, 0);

  // Late replay arrives
  const replay = await db.add(opId);
  assert.equal(replay.code, 200);
  // Must NOT resurrect in ledger
  assert.equal((await db.rows()).length, 0);
});

test('concurrent edits do not overwrite attachments and deletion removes proofs atomically', async (t) => {
  const db = gateway(t);
  const createRes = await db.add('OP-PROOF-TX');
  assert.equal(createRes.code, 200);
  const id = createRes.body.data.ID_Transaksi;

  // Upload proof
  const uploadRes = await db.call({
    action: 'uploadAttachment',
    idTransaksi: id,
    file: pdf('test-proof.pdf')
  });
  assert.equal(uploadRes.code, 200);

  // Edit transaction in-place with exists:true updateMask
  const editRes = await db.call({
    action: 'editTransaksi',
    operationId: 'OP-EDIT-WITH-PROOF',
    idTransaksi: id,
    dataForm: payment({ nominal: 8000, keterangan: 'Updated note' })
  });
  assert.equal(editRes.code, 200);

  // Verify attachment still intact on transaction and proof doc
  const rows = await db.rows();
  assert.equal(rows[0].Nominal, 8000);
  assert.ok(rows[0].Bukti, 'Bukti metadata must be preserved');
  assert.equal(rows[0].Bukti.name, 'test-proof.pdf');

  const proofRead = await db.call({ action: 'readAttachment', idTransaksi: id });
  assert.equal(proofRead.code, 200);
  assert.equal(proofRead.body.data.name, 'test-proof.pdf');

  // Delete transaction: must delete both transaction doc and proof doc atomically
  const delRes = await db.remove(id, 'OP-DELETE-TX-PROOF');
  assert.equal(delRes.code, 200);

  assert.equal((await db.rows()).length, 0);
  const proofReadAfterDel = await db.call({ action: 'readAttachment', idTransaksi: id });
  assert.equal(proofReadAfterDel.code, 404);
});

test('edit vs delete precondition: editing a deleted transaction fails cleanly without resurrecting', async (t) => {
  const db = gateway(t);
  const createRes = await db.add('OP-EDIT-DEL-RACE');
  assert.equal(createRes.code, 200);
  const id = createRes.body.data.ID_Transaksi;

  assert.equal((await db.remove(id)).code, 200);

  const editRes = await db.call({
    action: 'editTransaksi',
    idTransaksi: id,
    dataForm: payment({ nominal: 9000 })
  });
  assert.equal(editRes.code, 400);
  assert.match(editRes.body.message, /tidak ditemukan/i);
  assert.equal((await db.rows()).length, 0);
});

test('legacy requests without operationId retain dedupe compatibility', async (t) => {
  const db = gateway(t);
  const p = payment();

  // First legacy submission succeeds
  const res1 = await db.call({ action: 'tambahTransaksi', dataForm: p });
  assert.equal(res1.code, 200);
  assert.equal(res1.body.data.duplicate, undefined);

  // Second legacy submission for same member & month returns duplicate: true
  const res2 = await db.call({ action: 'tambahTransaksi', dataForm: p });
  assert.equal(res2.code, 200);
  assert.equal(res2.body.data.duplicate, true);

  // Only one transaction exists in ledger
  assert.equal((await db.rows()).length, 1);
});

test('malformed and oversized operationId is rejected not truncated', async () => {
  const { parseOperationId } = await import('../api/_transaction-idempotency.js');
  const oversized = 'A'.repeat(129);
  const res = parseOperationId(oversized);
  assert.ok(res.error);
  assert.match(res.error, /128/);

  const malformed = parseOperationId('bad id!');
  assert.ok(malformed.error);
});
