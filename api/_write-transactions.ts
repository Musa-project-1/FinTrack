/**
 * Transaction write handlers for a single group: add, bulk add, edit and the
 * group-scoped document deletion used by the transaction/member/category
 * delete actions.
 *
 * Every handler validates its input, writes the change and appends an audit
 * entry. Handlers return `{status, message, data}` for business-level
 * rejections and throw for infrastructure failures (the router maps those to
 * HTTP 500).
 */
import type { FirestoreHeaders, Transaksi } from '../src/types/finkas.d.ts';
import type { FirestoreWrite } from './_sa.ts';
import {
  docName,
  encodeFields,
  fsCommit,
  fsCreateIfAbsent,
  fsDelete,
  fsGet,
  fsPatch,
  isPreconditionFailure
} from './_sa.ts';
import {
  CATEGORIES_COLLECTION,
  MEMBERS_COLLECTION,
  TRANSACTIONS_COLLECTION,
  col,
  iuranId,
  newId,
  nowIso,
  parseDocId,
  writeAuditLog
} from './_store.ts';
import { readTransactions } from './_group-read.ts';
import { PROOFS_COLLECTION } from './_attachments.ts';
import {
  fail,
  ok,
  parseTransactionInput,
  type TransactionInput,
  findDuplicateIuran,
  isIuranPayment,
  MAX_BULK_TRANSACTIONS
} from './_write-shared.ts';
import {
  computeRequestFingerprint,
  transactionIdForOperation,
  parseOperationId,
  getOperationReceipt,
  buildReceiptWrite,
  receiptToResponse
} from './_transaction-idempotency.ts';

/* ── Transactions ────────────────────────────────────────────────── */

type Payload = Record<string, any>;

/** Verify every referenced category exists in the group and matches the transaction flow direction. */
async function verifyCategories(
  gid: string,
  inputs: Array<{ idKategori: string; tipeArus: string }>,
  headers: FirestoreHeaders
): Promise<string | null> {
  const unique = new Map<string, Set<string>>();
  for (const item of inputs) {
    let types = unique.get(item.idKategori);
    if (!types) {
      types = new Set();
      unique.set(item.idKategori, types);
    }
    types.add(item.tipeArus);
  }

  const results = await Promise.all(
    [...unique.entries()].map(async ([idKat, types]) => ({
      idKat,
      types,
      doc: await fsGet(`${col(gid, CATEGORIES_COLLECTION)}/${idKat}`, headers)
    }))
  );

  for (const { idKat, types, doc } of results) {
    if (!doc || (doc.groupId && doc.groupId !== gid)) {
      return `Kategori transaksi (${idKat}) tidak ditemukan.`;
    }
    for (const tipe of types) {
      if (doc.Tipe !== tipe) {
        return `Kategori ${doc.Nama_Kategori || idKat} hanya berlaku untuk arus ${doc.Tipe || 'lain'}, bukan ${tipe}.`;
      }
    }
  }
  return null;
}

export async function addTransaction(gid: string, payload: Payload, headers: FirestoreHeaders) {
  const input = parseTransactionInput(payload?.dataForm);
  if ('error' in input) return fail(input.error);

  const rawOpId = payload?.operationId ?? payload?.dataForm?.operationId;
  const parsedOp = parseOperationId(rawOpId);
  if (parsedOp.error) return fail(parsedOp.error);
  const operationId = parsedOp.id;

  // 1. Legacy path without operationId: single-period dedupe
  if (!operationId) {
    const catError = await verifyCategories(gid, [input], headers);
    if (catError) return fail(catError);

    const isIuran = isIuranPayment(input);
    if (isIuran) {
      const transaksi = await readTransactions(gid, headers);
      if (findDuplicateIuran(transaksi, input)) {
        return ok(`Iuran ${input.bulanIuran} ${input.tahunIuran} sudah tercatat sebelumnya.`, { duplicate: true });
      }
    }

    const idTrx = isIuran ? iuranId(gid, input) : newId('TRX');
    const doc = {
      ID_Transaksi: idTrx,
      Timestamp: input.timestamp || nowIso(),
      Tipe_Arus: input.tipeArus,
      ID_Kategori: input.idKategori,
      ID_Anggota: input.idAnggota,
      Bulan_Iuran: input.bulanIuran,
      Tahun_Iuran: input.tahunIuran,
      Nominal: input.nominal,
      Keterangan: input.keterangan,
      groupId: gid
    };

    if (isIuran) {
      const created = await fsCreateIfAbsent(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTrx}`, doc, headers);
      if (!created) {
        return ok(`Iuran ${input.bulanIuran} ${input.tahunIuran} sudah tercatat sebelumnya.`, { duplicate: true });
      }
    } else {
      await fsPatch(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTrx}`, doc, headers);
    }

    await writeAuditLog(gid, 'TAMBAH_TRANSAKSI', `${doc.Tipe_Arus} Rp${doc.Nominal} (${doc.Keterangan || doc.Bulan_Iuran})`, headers);
    return ok('Transaksi disimpan.', doc);
  }

  // 2. Idempotent path with operationId
  const fingerprint = computeRequestFingerprint('tambahTransaksi', {
    nominal: input.nominal,
    tipeArus: input.tipeArus,
    idKategori: input.idKategori,
    idAnggota: input.idAnggota,
    bulanIuran: input.bulanIuran,
    tahunIuran: input.tahunIuran,
    keterangan: input.keterangan,
    timestamp: input.timestamp || null
  });

  const existingReceipt = await getOperationReceipt(gid, operationId, headers);
  if (existingReceipt) {
    if (existingReceipt.fingerprint !== fingerprint) {
      return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
    }
    return receiptToResponse(existingReceipt);
  }

  const catError = await verifyCategories(gid, [input], headers);
  if (catError) return fail(catError);

  const idTrx = transactionIdForOperation(gid, operationId);
  const doc = {
    ID_Transaksi: idTrx,
    Timestamp: input.timestamp || nowIso(),
    Tipe_Arus: input.tipeArus,
    ID_Kategori: input.idKategori,
    ID_Anggota: input.idAnggota,
    Bulan_Iuran: input.bulanIuran,
    Tahun_Iuran: input.tahunIuran,
    Nominal: input.nominal,
    Keterangan: input.keterangan,
    groupId: gid,
    operationId
  };

  const response = ok('Transaksi disimpan.', doc);
  const writes = [
    {
      update: { name: docName(col(gid, TRANSACTIONS_COLLECTION), idTrx), fields: encodeFields(doc) },
      currentDocument: { exists: false }
    },
    buildReceiptWrite(gid, operationId, fingerprint, 'tambahTransaksi', response)
  ];

  try {
    await fsCommit(writes, headers);
  } catch (err) {
    if (isPreconditionFailure(err)) {
      const raced = await getOperationReceipt(gid, operationId, headers);
      if (raced) {
        if (raced.fingerprint !== fingerprint) {
          return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
        }
        return receiptToResponse(raced);
      }
    }
    throw err;
  }

  await writeAuditLog(gid, 'TAMBAH_TRANSAKSI', `${doc.Tipe_Arus} Rp${doc.Nominal} (${doc.Keterangan || doc.Bulan_Iuran})`, headers);
  return response;
}

export async function addAtomicBulk(gid: string, listTrx: Array<Record<string, any>>, operationId: string, headers: FirestoreHeaders) {
  if (listTrx.length > MAX_BULK_TRANSACTIONS) return fail(`Maksimal ${MAX_BULK_TRANSACTIONS} transaksi per permintaan massal.`);

  const parsed: TransactionInput[] = [];
  for (let i = 0; i < listTrx.length; i += 1) {
    const raw = listTrx[i];
    const input = parseTransactionInput({ tipeArus: 'Masuk', ...raw });
    if ('error' in input) return fail(`Baris #${i + 1}: ${input.error}`);
    if (input.idAnggota === '-') continue;
    parsed.push(input);
  }

  const normalizedRows = parsed.map((r, index) => ({
    idAnggota: r.idAnggota,
    nominal: r.nominal,
    bulanIuran: r.bulanIuran,
    tahunIuran: r.tahunIuran,
    idKategori: r.idKategori,
    tipeArus: r.tipeArus,
    keterangan: r.keterangan,
    timestamp: r.timestamp || null,
    rowKey: index
  }));

  const fingerprint = computeRequestFingerprint('tambahTransaksiMassal', {
    operationId,
    rows: normalizedRows
  });

  const existingReceipt = await getOperationReceipt(gid, operationId, headers);
  if (existingReceipt) {
    if (existingReceipt.fingerprint !== fingerprint) {
      return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
    }
    return receiptToResponse(existingReceipt);
  }

  if (!parsed.length) {
    const response = ok('Tidak ada baris transaksi valid untuk disimpan.', { inserted: 0, skipped: [], rows: [] });
    const receiptWrite = buildReceiptWrite(gid, operationId, fingerprint, 'tambahTransaksiMassal', response);
    try {
      await fsCommit([receiptWrite], headers);
    } catch (err) {
      if (isPreconditionFailure(err)) {
        const raced = await getOperationReceipt(gid, operationId, headers);
        if (raced) {
          if (raced.fingerprint !== fingerprint) {
            return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
          }
          return receiptToResponse(raced);
        }
      }
      throw err;
    }
    return response;
  }

  const timestamp = nowIso();
  const catError = await verifyCategories(gid, parsed, headers);
  if (catError) return fail(catError);

  const rows: Transaksi[] = [];
  const writes: FirestoreWrite[] = [];

  for (let index = 0; index < parsed.length; index += 1) {
    const input = parsed[index];
    const rowOpId = `${operationId}-${index}`;
    const idTrx = transactionIdForOperation(gid, operationId, index);
    const doc = {
      ID_Transaksi: idTrx,
      Timestamp: input.timestamp || timestamp,
      Tipe_Arus: input.tipeArus,
      ID_Kategori: input.idKategori,
      ID_Anggota: input.idAnggota,
      Bulan_Iuran: input.bulanIuran,
      Tahun_Iuran: input.tahunIuran,
      Nominal: input.nominal,
      Keterangan: input.keterangan,
      groupId: gid,
      operationId: rowOpId
    };

    rows.push(doc);
    writes.push({
      update: {
        name: docName(col(gid, TRANSACTIONS_COLLECTION), idTrx),
        fields: encodeFields(doc)
      },
      currentDocument: { exists: false }
    });
  }

  const response = ok(`${rows.length} transaksi massal berhasil disimpan.`, {
    inserted: rows.length,
    skipped: [],
    rows
  });

  writes.push(buildReceiptWrite(gid, operationId, fingerprint, 'tambahTransaksiMassal', response));

  try {
    await fsCommit(writes, headers);
  } catch (err) {
    if (isPreconditionFailure(err)) {
      const raced = await getOperationReceipt(gid, operationId, headers);
      if (raced) {
        if (raced.fingerprint !== fingerprint) {
          return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
        }
        return receiptToResponse(raced);
      }
    }
    throw err;
  }

  await writeAuditLog(gid, 'TAMBAH_IURAN_MASSAL', `${rows.length} iuran dicatat (operasi ${operationId})`, headers);
  return response;
}

export async function addBulkTransactions(gid: string, payload: Payload, headers: FirestoreHeaders) {
  let listTrx = Array.isArray(payload?.listTrx)
    ? payload.listTrx
    : (Array.isArray(payload?.transaksiList) ? payload.transaksiList : []);
  if (!listTrx.length && Array.isArray(payload?.dataForm?.arrIdAnggota)) {
    if (payload.dataForm.arrIdAnggota.length > MAX_BULK_TRANSACTIONS) {
      return fail(`Maksimal ${MAX_BULK_TRANSACTIONS} transaksi per permintaan.`);
    }
    const { arrIdAnggota, tipeArus, idKategori, bulanIuran, tahunIuran, nominal, keterangan, timestamp } = payload.dataForm;
    listTrx = arrIdAnggota.map((idAnggota: string) => ({ tipeArus, idKategori, idAnggota, bulanIuran, tahunIuran, nominal, keterangan, timestamp }));
  }
  if (!listTrx.length) return fail('Daftar transaksi massal tidak boleh kosong.');
  if (listTrx.length > MAX_BULK_TRANSACTIONS) return fail(`Maksimal ${MAX_BULK_TRANSACTIONS} transaksi per permintaan.`);

  const rawOpId = payload?.operationId ?? payload?.dataForm?.operationId;
  const parsedOp = parseOperationId(rawOpId);
  if (parsedOp.error) return fail(parsedOp.error);
  const operationId = parsedOp.id;

  if (operationId) return addAtomicBulk(gid, listTrx, operationId, headers);

  const parsed: TransactionInput[] = [];
  for (const raw of listTrx) {
    if (raw && typeof raw === 'object' && raw.operationId !== undefined && raw.operationId !== null && raw.operationId !== '') {
      return fail('ID operasi baris massal memerlukan operationId di tingkat permintaan.');
    }
    const input = parseTransactionInput({ tipeArus: 'Masuk', ...raw });
    if ('error' in input) return fail(input.error);
    if (input.idAnggota === '-') continue;
    parsed.push(input);
  }
  if (!parsed.length) return fail('Data transaksi massal tidak valid.');

  const catError = await verifyCategories(gid, parsed, headers);
  if (catError) return fail(catError);

  const transaksi = await readTransactions(gid, headers);
  const skipped: string[] = [];
  const accepted: TransactionInput[] = [];
  const seenInBatch = new Set();

  for (const input of parsed) {
    if (isIuranPayment(input)) {
      const batchKey = `${input.idAnggota}:${input.bulanIuran}:${input.tahunIuran}`;
      if (seenInBatch.has(batchKey) || findDuplicateIuran(transaksi, input)) {
        skipped.push(input.idAnggota);
        continue;
      }
      seenInBatch.add(batchKey);
    }
    accepted.push(input);
  }

  if (!accepted.length) {
    return ok('Semua iuran dalam daftar massal sudah tercatat sebelumnya.', { inserted: 0, skipped });
  }

  const timestamp = nowIso();
  const writeResults = await Promise.allSettled(
    accepted.map(async (input) => {
      const isIuran = isIuranPayment(input);
      const idTrx = isIuran ? iuranId(gid, input) : newId('TRX');
      const doc = {
        ID_Transaksi: idTrx,
        Timestamp: input.timestamp || timestamp,
        Tipe_Arus: input.tipeArus,
        ID_Kategori: input.idKategori,
        ID_Anggota: input.idAnggota,
        Bulan_Iuran: input.bulanIuran,
        Tahun_Iuran: input.tahunIuran,
        Nominal: input.nominal,
        Keterangan: input.keterangan,
        groupId: gid
      };

      if (isIuran) {
        const created = await fsCreateIfAbsent(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTrx}`, doc, headers);
        if (!created) {
          return { ok: false, idAnggota: input.idAnggota };
        }
      } else {
        await fsPatch(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTrx}`, doc, headers);
      }
      return { ok: true, idAnggota: input.idAnggota };
    })
  );

  let insertedCount = 0;
  for (let i = 0; i < writeResults.length; i += 1) {
    const r = writeResults[i];
    if (r.status === 'fulfilled' && r.value.ok) {
      insertedCount += 1;
    } else {
      if (r.status === 'rejected') {
        console.error('[finkas] addBulkTransactions row write failed:', accepted[i].idAnggota, r.reason?.message);
      }
      skipped.push(accepted[i].idAnggota);
    }
  }

  await writeAuditLog(gid, 'TAMBAH_IURAN_MASSAL', `${insertedCount} iuran dicatat, ${skipped.length} dilewati`, headers);
  return ok(`${insertedCount} transaksi massal berhasil disimpan.`, { inserted: insertedCount, skipped });
}

export async function editTransaction(gid: string, payload: Payload, headers: FirestoreHeaders) {
  const parsedTarget = parseDocId(payload?.idTransaksi ?? payload?.dataForm?.idTransaksi);
  if (parsedTarget.error || !parsedTarget.id) return fail(parsedTarget.error || 'ID transaksi tidak valid.');
  const idTarget = parsedTarget.id;

  const input = parseTransactionInput(payload?.dataForm);
  if ('error' in input) return fail(input.error);

  const rawOpId = payload?.operationId ?? payload?.dataForm?.operationId;
  const parsedOp = parseOperationId(rawOpId);
  if (parsedOp.error) return fail(parsedOp.error);
  const operationId = parsedOp.id;
  let fingerprint: string|null = null;

  if (operationId) {
    fingerprint = computeRequestFingerprint('editTransaksi', {
      idTransaksi: idTarget,
      nominal: input.nominal,
      tipeArus: input.tipeArus,
      idKategori: input.idKategori,
      idAnggota: input.idAnggota,
      bulanIuran: input.bulanIuran,
      tahunIuran: input.tahunIuran,
      keterangan: input.keterangan,
      timestamp: input.timestamp || null
    });

    const existingReceipt = await getOperationReceipt(gid, operationId, headers);
    if (existingReceipt) {
      if (existingReceipt.fingerprint !== fingerprint) {
        return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
      }
      return receiptToResponse(existingReceipt);
    }
  }

  const existing = await fsGet(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTarget}`, headers);
  if (!existing) return fail('Transaksi tidak ditemukan.');

  const catError = await verifyCategories(gid, [input], headers);
  if (catError) return fail(catError);

  const isIuran = isIuranPayment(input);
  const isLegacyManaged = !existing.operationId;
  if (isIuran && isLegacyManaged) {
    const transaksi = await readTransactions(gid, headers);
    if (findDuplicateIuran(transaksi, input, idTarget)) {
      return fail(`Iuran ${input.bulanIuran} ${input.tahunIuran} sudah tercatat pada transaksi lain.`);
    }
  }

  const wasIuran =
    existing.Tipe_Arus === 'Masuk' &&
    existing.ID_Anggota &&
    existing.ID_Anggota !== '-' &&
    existing.Bulan_Iuran &&
    existing.Bulan_Iuran !== '-' &&
    existing.Tahun_Iuran &&
    existing.Tahun_Iuran !== '-';

  // Identity stability depends solely on whether the original record is operation-tracked.
  const targetId = existing.operationId
    ? idTarget
    : (isIuran ? iuranId(gid, input) : (wasIuran ? newId('TRX') : idTarget));

  const response = ok('Transaksi berhasil diupdate.', { idTransaksi: targetId });

  if (targetId !== idTarget) {
    const doc: Record<string, any> = {
      ID_Transaksi: targetId,
      Timestamp: input.timestamp || existing.Timestamp || nowIso(),
      Tipe_Arus: input.tipeArus,
      ID_Kategori: input.idKategori,
      ID_Anggota: input.idAnggota,
      Bulan_Iuran: input.bulanIuran,
      Tahun_Iuran: input.tahunIuran,
      Nominal: input.nominal,
      Keterangan: input.keterangan,
      groupId: gid
    };

    if (existing.Bukti) {
      doc.Bukti = existing.Bukti;
    }

    const targetDocName = docName(col(gid, TRANSACTIONS_COLLECTION), targetId);
    const oldDocName = docName(col(gid, TRANSACTIONS_COLLECTION), idTarget);
    const writes: FirestoreWrite[] = [
      {
        update: { name: targetDocName, fields: encodeFields(doc) },
        currentDocument: { exists: false }
      },
      {
        delete: oldDocName,
        currentDocument: { exists: true }
      }
    ];

    // Atomically move proof document if target changed ID and proof exists
    const existingProof = await fsGet(`${col(gid, PROOFS_COLLECTION)}/${idTarget}`, headers);
    if (existingProof?.groupId && existingProof.groupId !== gid) {
      return fail('Bukti transaksi tidak ditemukan.');
    }
    if (existingProof) {
      const movedProof = {
        ...existingProof,
        groupId: gid,
        idTransaksi: targetId
      };
      writes.push({
        update: {
          name: docName(col(gid, PROOFS_COLLECTION), targetId),
          fields: encodeFields(movedProof)
        },
        currentDocument: { exists: false }
      });
      writes.push({
        delete: docName(col(gid, PROOFS_COLLECTION), idTarget),
        currentDocument: { exists: true }
      });
    }

    if (operationId && fingerprint) {
      writes.push(buildReceiptWrite(gid, operationId, fingerprint, 'editTransaksi', response));
    }

    try {
      await fsCommit(writes, headers);
    } catch (err) {
      if (isPreconditionFailure(err)) {
        if (operationId) {
          const raced = await getOperationReceipt(gid, operationId, headers);
          if (raced) {
            if (raced.fingerprint !== fingerprint) {
              return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
            }
            return receiptToResponse(raced);
          }
        }
        const stillExists = await fsGet(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTarget}`, headers);
        if (!stillExists) {
          return fail('Transaksi tidak ditemukan.');
        }
        if (isIuran) {
          return fail(`Iuran ${input.bulanIuran} ${input.tahunIuran} sudah tercatat pada transaksi lain.`);
        }
        return fail('Terjadi konflik saat memperbarui transaksi.');
      }
      throw err;
    }
  } else {
    // In-place edit: use updateMask over mutable fields only + exists:true to avoid overwriting concurrent Bukti metadata
    const fieldsToUpdate: Record<string, any> = {
      Tipe_Arus: input.tipeArus,
      ID_Kategori: input.idKategori,
      ID_Anggota: input.idAnggota,
      Bulan_Iuran: input.bulanIuran,
      Tahun_Iuran: input.tahunIuran,
      Nominal: input.nominal,
      Keterangan: input.keterangan
    };
    const fieldPaths = [
      'Tipe_Arus',
      'ID_Kategori',
      'ID_Anggota',
      'Bulan_Iuran',
      'Tahun_Iuran',
      'Nominal',
      'Keterangan'
    ];
    if (input.timestamp) {
      fieldsToUpdate.Timestamp = input.timestamp;
      fieldPaths.push('Timestamp');
    }

    const writes: FirestoreWrite[] = [
      {
        update: {
          name: docName(col(gid, TRANSACTIONS_COLLECTION), idTarget),
          fields: encodeFields(fieldsToUpdate)
        },
        updateMask: { fieldPaths },
        currentDocument: { exists: true }
      }
    ];

    if (operationId && fingerprint) {
      writes.push(buildReceiptWrite(gid, operationId, fingerprint, 'editTransaksi', response));
    }

    try {
      await fsCommit(writes, headers);
    } catch (err) {
      if (isPreconditionFailure(err)) {
        if (operationId) {
          const raced = await getOperationReceipt(gid, operationId, headers);
          if (raced) {
            if (raced.fingerprint !== fingerprint) {
              return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
            }
            return receiptToResponse(raced);
          }
        }
        return fail('Transaksi tidak ditemukan.');
      }
      throw err;
    }
  }

  await writeAuditLog(gid, 'EDIT_TRANSAKSI', `ID: ${idTarget}${targetId !== idTarget ? ` -> ${targetId}` : ''}`, headers);
  return response;
}

/* ── Group-scoped document deletion ──────────────────────────────── */

const DELETABLE = [TRANSACTIONS_COLLECTION, MEMBERS_COLLECTION, CATEGORIES_COLLECTION];
const DELETE_AUDIT: Record<string, string> = {
  [TRANSACTIONS_COLLECTION]: 'HAPUS_TRANSAKSI',
  [MEMBERS_COLLECTION]: 'HAPUS_ANGGOTA',
  [CATEGORIES_COLLECTION]: 'HAPUS_KATEGORI'
};

export async function deleteDocument(gid: string, payload: Payload, headers: FirestoreHeaders) {
  const rawCollection = payload?.targetCollection;
  const collection = typeof rawCollection === 'string' ? rawCollection.trim() : '';
  if (!collection || collection.length > 20 || !DELETABLE.includes(collection)) {
    return fail('Jalur koleksi tidak diizinkan.');
  }

  const parsedId = parseDocId(payload?.idTransaksi ?? payload?.id);
  if (parsedId.error) return fail(parsedId.error);
  if (!parsedId.id) return fail('ID dokumen wajib diisi.');
  const id = parsedId.id;

  const rawOpId = payload?.operationId;
  const parsedOp = parseOperationId(rawOpId);
  if (parsedOp.error) return fail(parsedOp.error);
  const operationId = parsedOp.id;
  let fingerprint: string|null = null;

  if (operationId && collection === TRANSACTIONS_COLLECTION) {
    fingerprint = computeRequestFingerprint('hapusTransaksi', {
      idTransaksi: id,
      targetCollection: collection
    });

    const existingReceipt = await getOperationReceipt(gid, operationId, headers);
    if (existingReceipt) {
      if (existingReceipt.fingerprint !== fingerprint) {
        return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
      }
      return receiptToResponse(existingReceipt);
    }
  }

  const existing = await fsGet(`${col(gid, collection)}/${id}`, headers);
  if (!existing) return fail('Dokumen tidak ditemukan.');

  // Referential integrity: block deletion when transactions still reference this record.
  if (collection === MEMBERS_COLLECTION || collection === CATEGORIES_COLLECTION) {
    const transaksi = await readTransactions(gid, headers);
    const refField = collection === MEMBERS_COLLECTION ? 'ID_Anggota' : 'ID_Kategori';
    const refCount = transaksi.filter((t) => t[refField] === id).length;
    if (refCount > 0) {
      const label = collection === MEMBERS_COLLECTION ? 'anggota' : 'kategori';
      return fail(
        `Tidak dapat dihapus: ${refCount} transaksi masih merujuk ${label} ini. ` +
        `Hapus atau pindahkan transaksi terkait terlebih dahulu.`
      );
    }
  }

  const response = ok(`Data ${id} berhasil dihapus secara permanen.`);

  if (collection === TRANSACTIONS_COLLECTION) {
    const writes: FirestoreWrite[] = [
      {
        delete: docName(col(gid, collection), id),
        currentDocument: { exists: true }
      },
      {
        delete: docName(col(gid, PROOFS_COLLECTION), id)
      }
    ];
    if (operationId && fingerprint) {
      writes.push(buildReceiptWrite(gid, operationId, fingerprint, 'hapusTransaksi', response));
    }
    try {
      await fsCommit(writes, headers);
    } catch (err) {
      if (isPreconditionFailure(err)) {
        if (operationId) {
          const raced = await getOperationReceipt(gid, operationId, headers);
          if (raced) {
            if (raced.fingerprint !== fingerprint) {
              return fail('Permintaan ditolak: operation ID sudah digunakan dengan data berbeda.');
            }
            return receiptToResponse(raced);
          }
        }
        return fail('Dokumen tidak ditemukan.');
      }
      throw err;
    }
  } else {
    await fsDelete(`${col(gid, collection)}/${id}`, headers);
  }

  await writeAuditLog(gid, DELETE_AUDIT[collection], `ID: ${id}`, headers);
  return response;
}
