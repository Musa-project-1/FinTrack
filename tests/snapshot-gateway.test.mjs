import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotFirestore, successful, request, setupLedger, proofFile, PNG } from './helpers/snapshot-firestore.mjs';

const db = new SnapshotFirestore();
const originalFetch = globalThis.fetch;
globalThis.fetch = (...args) => db.fetch(...args);
after(() => { globalThis.fetch = originalFetch; });

test('gateway snapshot roundtrip preserves installments, exact proof bytes, settings and create/delete retry receipts', async () => {
  const gid = db.reset();
  const form = await setupLedger(gid);
  const first = { action: 'tambahTransaksi', operationId: 'snapshot-create-0001', dataForm: form };
  const second = { action: 'tambahTransaksi', operationId: 'snapshot-create-0002', dataForm: { ...form, nominal: 6000 } };
  const row = await successful(gid, first);
  const kept = await successful(gid, second);
  const id = kept.data.ID_Transaksi;
  await successful(gid, { action: 'uploadAttachment', idTransaksi: id, file: proofFile });
  const deletion = { action: 'hapusTransaksi', operationId: 'snapshot-delete-0001', idTransaksi: row.data.ID_Transaksi };
  await successful(gid, deletion);
  const before = await successful(gid, { action: 'exportSnapshot' });
  const backup = before.data.snapshot;
  assert.equal(backup.app, 'Finkas');
  assert.equal(backup.version, 2);
  assert.equal(backup.consistency, 'firestore-read-only-transaction');
  assert.equal(backup.data.kasStart, '01-2026');
  assert.deepEqual(backup.data.skippedMonths, ['02-2026']);
  assert.equal(backup.data.transaksi.length, 1);
  assert.equal(backup.data.transaksi[0].operationId, second.operationId);
  assert.equal(backup.data.operations.length, 3);
  assert.equal(backup.data.attachments.length, 1);
  assert.deepEqual(Buffer.from(backup.data.attachments[0].base64, 'base64'), PNG);
  assert.deepEqual(backup.data.transaksi[0].Bukti, {
    name: proofFile.name, type: proofFile.type, size: proofFile.size,
    uploadedAt: backup.data.attachments[0].uploadedAt
  });
  db.reset(gid); // Disaster: only the independently provisioned group/session survives.
  await successful(gid, { action: 'restoreSnapshot', sourceGroupId: gid, data: backup.data });
  assert.deepEqual((await successful(gid, { action: 'exportSnapshot' })).data.snapshot.data, backup.data);
  assert.deepEqual((await successful(gid, { action: 'readAttachment', idTransaksi: id })).data, backup.data.attachments[0]);
  await successful(gid, first);
  await successful(gid, second);
  await successful(gid, deletion);
  const after = (await successful(gid, { action: 'read' })).data;
  assert.equal(after.transaksi.length, 1);
  assert.equal(after.transaksi[0].Nominal, 6000);
  assert.equal(after.settings.kasStart, '01-2026');
});

test('legacy backups without proof fields normalize stale Bukti metadata and avoid orphan proofs', async () => {
  const gid = db.reset();
  const form = await setupLedger(gid);
  const row = await successful(gid, { action: 'tambahTransaksi', operationId: 'op-legacy-1', dataForm: form });
  const id = row.data.ID_Transaksi;
  await successful(gid, { action: 'uploadAttachment', idTransaksi: id, file: proofFile });

  // Verify attachment exists before restore
  const preAtt = await successful(gid, { action: 'readAttachment', idTransaksi: id });
  assert.equal(preAtt.data.idTransaksi, id);

  // Restore a legacy backup that has Bukti on the transaction but NO proof in attachments
  const legacyData = {
    anggota: [{ ID_Anggota: form.idAnggota, Nama_Anggota: 'Synthetic Member' }],
    kategori: [{ ID_Kategori: form.idKategori, Nama_Kategori: 'Synthetic Dues', Tipe: 'Masuk' }],
    transaksi: [{
      ID_Transaksi: id,
      ID_Anggota: form.idAnggota,
      ID_Kategori: form.idKategori,
      Tipe_Arus: 'Masuk',
      Bulan_Iuran: 'Maret',
      Tahun_Iuran: '2026',
      Nominal: 4000,
      Timestamp: '2026-03-01T05:00:00.000Z',
      Keterangan: 'Legacy tx',
      Bukti: { name: 'stale-phantom.png', size: 999 }
    }],
    skippedMonths: [],
    kasStart: '01-2026',
    attachments: [], // No proof attached!
    operations: []
  };

  await successful(gid, { action: 'restoreSnapshot', sourceGroupId: gid, data: legacyData });

  // 1. Transaction in Firestore must have normalized away the phantom Bukti
  const readRes = await successful(gid, { action: 'read' });
  assert.equal(readRes.data.transaksi[0].Bukti, undefined);

  // 2. Stale proof document in transaction_proofs must have been pruned
  const attRes = await request(gid, { action: 'readAttachment', idTransaksi: id });
  assert.equal(attRes.statusCode, 404);
  assert.match(attRes.body.message, /tidak ditemukan/);
});

test('restoreSnapshot rejects orphan proofs, oversized proofs, invalid signatures, and non-canonical base64', async () => {
  const gid = db.reset();
  const form = await setupLedger(gid);
  const validTxId = 'TRX-VALID-001';

  const baseSnapshot = {
    anggota: [{ ID_Anggota: form.idAnggota, Nama_Anggota: 'Synthetic Member' }],
    kategori: [{ ID_Kategori: form.idKategori, Nama_Kategori: 'Synthetic Dues', Tipe: 'Masuk' }],
    transaksi: [{
      ID_Transaksi: validTxId,
      ID_Anggota: form.idAnggota,
      ID_Kategori: form.idKategori,
      Tipe_Arus: 'Masuk',
      Nominal: 1000,
      Timestamp: '2026-03-01T00:00:00.000Z'
    }],
    attachments: []
  };

  // 1. Orphan proof (idTransaksi not in transaksi list)
  const orphanPayload = {
    ...baseSnapshot,
    attachments: [{
      idTransaksi: 'TRX-UNKNOWN-999',
      name: 'orphan.png',
      type: 'image/png',
      size: PNG.length,
      base64: PNG.toString('base64')
    }]
  };
  const orphanRes = await request(gid, { action: 'restoreSnapshot', data: orphanPayload });
  assert.equal(orphanRes.statusCode, 400);
  assert.match(orphanRes.body.message, /Lampiran bukti mengacu pada transaksi yang tidak ada/);

  // 2. Oversized proof (> 512 KiB)
  const hugeBuf = Buffer.alloc(524289, 0);
  const oversizedPayload = {
    ...baseSnapshot,
    attachments: [{
      idTransaksi: validTxId,
      name: 'huge.png',
      type: 'image/png',
      size: hugeBuf.length,
      base64: hugeBuf.toString('base64')
    }]
  };
  const oversizedRes = await request(gid, { action: 'restoreSnapshot', data: oversizedPayload });
  assert.equal(oversizedRes.statusCode, 400);
  assert.match(oversizedRes.body.message, /512 KiB/);

  // 3. Mismatched MIME signature (claimed png, but bytes are plain text)
  const fakePng = Buffer.from('this is not a valid png signature');
  const fakeSigPayload = {
    ...baseSnapshot,
    attachments: [{
      idTransaksi: validTxId,
      name: 'fake.png',
      type: 'image/png',
      size: fakePng.length,
      base64: fakePng.toString('base64')
    }]
  };
  const fakeSigRes = await request(gid, { action: 'restoreSnapshot', data: fakeSigPayload });
  assert.equal(fakeSigRes.statusCode, 400);
  assert.match(fakeSigRes.body.message, /Format berkas tidak didukung/);

  // 4. Non-canonical base64 encoding (corrupt padding)
  const badBase64Payload = {
    ...baseSnapshot,
    attachments: [{
      idTransaksi: validTxId,
      name: 'corrupt.png',
      type: 'image/png',
      size: PNG.length,
      base64: PNG.toString('base64') + '@@@'
    }]
  };
  const badB64Res = await request(gid, { action: 'restoreSnapshot', data: badBase64Payload });
  assert.equal(badB64Res.statusCode, 400);
  assert.match(badB64Res.body.message, /base64/);
});

test('restoreSnapshot enforces explicit cross-group remap confirmation', async () => {
  const gidA = db.reset('GRP-ALPHA');
  const gidB = 'GRP-BETA';
  db.docs.set(`groups/${gidB}`, { nama: 'Beta Group' });

  const form = await setupLedger(gidA);
  const row = await successful(gidA, { action: 'tambahTransaksi', operationId: 'op-grp-1', dataForm: form });
  const exported = await successful(gidA, { action: 'exportSnapshot' });

  // Attempt to restore snapshot from GRP-ALPHA into GRP-BETA without confirmation
  const unconfirmed = await request(gidB, {
    action: 'restoreSnapshot',
    sourceGroupId: 'GRP-ALPHA',
    data: exported.data.snapshot.data
  });
  assert.equal(unconfirmed.statusCode, 400);
  assert.match(unconfirmed.body.message, /Konfirmasi pemulihan lintas grup diperlukan/);

  // Restore with explicit confirmation succeeds
  const confirmed = await successful(gidB, {
    action: 'restoreSnapshot',
    sourceGroupId: 'GRP-ALPHA',
    confirmCrossGroup: true,
    data: exported.data.snapshot.data
  });
  assert.equal(confirmed.status, true);

  // Verify records are remapped to GRP-BETA
  const betaRead = await successful(gidB, { action: 'read' });
  assert.equal(betaRead.data.transaksi.length, 1);
  assert.equal(betaRead.data.transaksi[0].groupId, 'GRP-BETA');
});

test('uploadAttachment uses atomic updateMask with exists:true to prevent orphan proofs', async () => {
  const gid = db.reset();
  await setupLedger(gid);

  // Attempt to upload attachment for a non-existent transaction ID
  const res = await request(gid, {
    action: 'uploadAttachment',
    idTransaksi: 'TRX-NONEXISTENT',
    file: proofFile
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Transaksi tidak ditemukan/);

  // Ensure NO proof doc was created in Firestore
  assert.equal(db.docs.has(`groups/${gid}/transaction_proofs/TRX-NONEXISTENT`), false);
});
