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
import {
  docName,
  encodeFields,
  fsCommit,
  fsCreateIfAbsent,
  fsDelete,
  fsGet,
  fsPatch,
  isPreconditionFailure
} from './_sa.js';
import {
  CATEGORIES_COLLECTION,
  MEMBERS_COLLECTION,
  TRANSACTIONS_COLLECTION,
  col,
  iuranId,
  isValidDocId,
  newId,
  nowIso,
  writeAuditLog
} from './_store.js';
import { readTransactions } from './_group-read.js';
import {
  fail,
  ok,
  cleanText,
  parseTransactionInput,
  findDuplicateIuran,
  isIuranPayment
} from './_write-shared.js';

/* ── Transactions ────────────────────────────────────────────────── */

export async function addTransaction(gid, payload, headers) {
  const input = parseTransactionInput(payload?.dataForm);
  if (input.error) return fail(input.error);

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

export async function addBulkTransactions(gid, payload, headers) {
  let listTrx = Array.isArray(payload?.listTrx) ? payload.listTrx : [];
  if (!listTrx.length && Array.isArray(payload?.dataForm?.arrIdAnggota)) {
    const { arrIdAnggota, tipeArus, idKategori, bulanIuran, tahunIuran, nominal, keterangan, timestamp } = payload.dataForm;
    listTrx = arrIdAnggota.map((idAnggota) => ({ tipeArus, idKategori, idAnggota, bulanIuran, tahunIuran, nominal, keterangan, timestamp }));
  }
  if (!listTrx.length) return fail('Daftar transaksi massal tidak boleh kosong.');
  if (listTrx.length > 300) return fail('Maksimal 300 transaksi per permintaan.');

  const parsed = [];
  for (const raw of listTrx) {
    const input = parseTransactionInput(raw);
    if (input.error) return fail(input.error);
    if (input.idAnggota === '-') continue;
    parsed.push(input);
  }
  if (!parsed.length) return fail('Data transaksi massal tidak valid.');

  const transaksi = await readTransactions(gid, headers);
  const skipped = [];
  const accepted = [];
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

export async function editTransaction(gid, payload, headers) {
  const idTarget = cleanText(payload?.idTransaksi || payload?.dataForm?.idTransaksi, 40);
  if (!idTarget || !isValidDocId(idTarget)) return fail('ID transaksi tidak valid.');

  const input = parseTransactionInput(payload?.dataForm);
  if (input.error) return fail(input.error);

  const existing = await fsGet(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTarget}`, headers);
  if (!existing) return fail('Transaksi tidak ditemukan.');

  const isIuran = isIuranPayment(input);
  if (isIuran) {
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

  const targetId = isIuran ? iuranId(gid, input) : (wasIuran ? newId('TRX') : idTarget);

  if (targetId !== idTarget) {
    const doc = {
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

    const targetDocName = docName(col(gid, TRANSACTIONS_COLLECTION), targetId);
    const oldDocName = docName(col(gid, TRANSACTIONS_COLLECTION), idTarget);
    const writes = [
      {
        update: { name: targetDocName, fields: encodeFields(doc) },
        ...(isIuran ? { currentDocument: { exists: false } } : {})
      },
      {
        delete: oldDocName
      }
    ];

    try {
      await fsCommit(writes, headers);
    } catch (err) {
      if (isIuran && isPreconditionFailure(err)) {
        return fail(`Iuran ${input.bulanIuran} ${input.tahunIuran} sudah tercatat pada transaksi lain.`);
      }
      throw err;
    }
  } else {
    const updated = {
      Tipe_Arus: input.tipeArus,
      ID_Kategori: input.idKategori,
      ID_Anggota: input.idAnggota,
      Bulan_Iuran: input.bulanIuran,
      Tahun_Iuran: input.tahunIuran,
      Nominal: input.nominal,
      Keterangan: input.keterangan
    };
    // Only rewrite the timestamp when the admin supplied a new date; otherwise
    // leave the original recording time untouched.
    if (input.timestamp) updated.Timestamp = input.timestamp;
    await fsPatch(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTarget}`, updated, headers, Object.keys(updated));
  }

  await writeAuditLog(gid, 'EDIT_TRANSAKSI', `ID: ${idTarget}${targetId !== idTarget ? ` -> ${targetId}` : ''}`, headers);
  return ok('Transaksi berhasil diupdate.', { idTransaksi: targetId });
}

/* ── Group-scoped document deletion ──────────────────────────────── */

const DELETABLE = [TRANSACTIONS_COLLECTION, MEMBERS_COLLECTION, CATEGORIES_COLLECTION];
const DELETE_AUDIT = {
  [TRANSACTIONS_COLLECTION]: 'HAPUS_TRANSAKSI',
  [MEMBERS_COLLECTION]: 'HAPUS_ANGGOTA',
  [CATEGORIES_COLLECTION]: 'HAPUS_KATEGORI'
};

export async function deleteDocument(gid, payload, headers) {
  const collection = cleanText(payload?.targetCollection, 20);
  const id = cleanText(payload?.idTransaksi || payload?.id, 40);
  if (!DELETABLE.includes(collection)) return fail('Jalur koleksi tidak diizinkan.');
  if (!id) return fail('ID dokumen wajib diisi.');
  if (!isValidDocId(id)) return fail('ID dokumen tidak valid.');

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

  await fsDelete(`${col(gid, collection)}/${id}`, headers);
  await writeAuditLog(gid, DELETE_AUDIT[collection], `ID: ${id}`, headers);
  return ok(`Data ${id} berhasil dihapus secara permanen.`);
}
