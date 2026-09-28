/**
 * Full-database snapshot validation and restore for a single group.
 *
 * `validateSnapshot` is pure and exported so both backup and restore paths can
 * be tested without network calls. `restoreSnapshot` writes new records BEFORE
 * pruning stale ones so a mid-restore failure never empties a collection.
 */
import { encodeFields, fsCommit, fsListAll, fsPatch } from './_sa.js';
import {
  CATEGORIES_COLLECTION,
  MEMBERS_COLLECTION,
  TRANSACTIONS_COLLECTION,
  col,
  isValidDocId,
  newId,
  nowIso,
  settingsDoc,
  memberName,
  writeAuditLog
} from './_store.js';
import {
  SKIPPED_MONTH_RE,
  ARUS,
  STATUSES,
  fail,
  ok,
  cleanText,
  cleanDigits,
  parseTransactionInput
} from './_write-shared.js';

/**
 * Validate full snapshot data shape, limits and record integrity before writing.
 * Exported so both backup and restore paths can be tested without network calls.
 *
 * @param {object} data
 * @returns {{valid: boolean, error?: string, data?: {anggota: Array, kategori: Array, transaksi: Array, skippedMonths: Array}}}
 */
export function validateSnapshot(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Format snapshot tidak valid.' };
  }
  if (!Array.isArray(data.anggota) || !Array.isArray(data.transaksi)) {
    return { valid: false, error: 'Format snapshot tidak valid.' };
  }
  if (data.kategori !== undefined && !Array.isArray(data.kategori)) {
    return { valid: false, error: 'Format snapshot tidak valid (kategori bukan array).' };
  }
  if (data.skippedMonths !== undefined && !Array.isArray(data.skippedMonths)) {
    return { valid: false, error: 'Format snapshot tidak valid (bulan dilewati bukan array).' };
  }

  const anggota = data.anggota;
  const kategori = Array.isArray(data.kategori) ? data.kategori : [];
  const transaksi = data.transaksi;
  const rawSkipped = data.skippedMonths;

  if (anggota.length > 1000) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum anggota (1.000).' };
  }
  if (kategori.length > 200) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum kategori (200).' };
  }
  if (transaksi.length > 10000) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum transaksi (10.000).' };
  }
  if (Array.isArray(rawSkipped) && rawSkipped.length > 120) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum bulan dilewati (120).' };
  }

  const skippedMonths = Array.isArray(rawSkipped)
    ? rawSkipped.filter((m) => SKIPPED_MONTH_RE.test(m))
    : [];

  // Validate every record and verify uniqueness before touching Firestore.
  const seenMember = new Set();
  for (const a of anggota) {
    const id = cleanText(a?.ID_Anggota ?? a?.idAnggota, 40);
    const nama = cleanText(a?.Nama_Anggota ?? a?.namaAnggota, 80);
    if (!id || !isValidDocId(id) || !nama) {
      return { valid: false, error: 'Data anggota di snapshot tidak valid (ID atau Nama kosong).' };
    }
    if (seenMember.has(id)) {
      return { valid: false, error: `Snapshot mengandung duplikat ID_Anggota: ${id}` };
    }
    seenMember.add(id);
  }

  const seenKat = new Set();
  for (const k of kategori) {
    const id = cleanText(k?.ID_Kategori ?? k?.idKategori, 40);
    const tipe = k?.Tipe ?? k?.tipe;
    if (!id || !isValidDocId(id) || !ARUS.includes(tipe)) {
      return { valid: false, error: 'Data kategori di snapshot tidak valid.' };
    }
    if (seenKat.has(id)) {
      return { valid: false, error: `Snapshot mengandung duplikat ID_Kategori: ${id}` };
    }
    seenKat.add(id);
  }

  const seenTrx = new Set();
  for (const t of transaksi) {
    const parsed = parseTransactionInput(t);
    if (parsed.error) return { valid: false, error: `Transaksi di snapshot tidak valid: ${parsed.error}` };
    const id = cleanText(t?.ID_Transaksi ?? t?.idTransaksi, 40);
    if (id) {
      if (!isValidDocId(id)) {
        return { valid: false, error: `Snapshot mengandung ID_Transaksi tidak valid: ${id}` };
      }
      if (seenTrx.has(id)) {
        return { valid: false, error: `Snapshot mengandung duplikat ID_Transaksi: ${id}` };
      }
      seenTrx.add(id);
    }
  }

  return {
    valid: true,
    data: {
      anggota,
      kategori,
      transaksi,
      skippedMonths
    }
  };
}

/**
 * Restore a full database snapshot into a group.
 *
 * Ordering matters for safety: every record is validated first, then the new
 * records are written (upserted) BEFORE any deletion happens, and only stale
 * documents — those whose id is absent from the snapshot — are removed at the
 * end. A failure partway through therefore leaves the group with its old data
 * plus whatever was written, never an empty or half-wiped group (the previous
 * delete-then-write order could wipe everything and then fail before writing).
 *
 * @param {string} gid
 * @param {object} payload  { data: { anggota, kategori, transaksi, skippedMonths } }
 * @param {object} headers
 */
export async function restoreSnapshot(gid, payload, headers) {
  const validated = validateSnapshot(payload?.data);
  if (!validated.valid) {
    return fail(validated.error);
  }

  const { anggota, kategori, transaksi, skippedMonths } = validated.data;
  const timestamp = nowIso();

  // Last path segment of a Firestore resource name is the document id.
  const idOf = (doc) => String(doc.name || '').split('/').pop();

  /**
   * Upsert every record, then delete only the documents that the snapshot does
   * not contain. Writes happen before deletes so a mid-restore failure never
   * empties the collection.
   */
  const upsertThenPrune = async (collName, keptIds, buildWrites) => {
    const writes = buildWrites();
    for (let i = 0; i < writes.length; i += 400) {
      await fsCommit(writes.slice(i, i + 400), headers);
    }
    const existing = await fsListAll(col(gid, collName), headers);
    const stale = existing.filter((doc) => !keptIds.has(idOf(doc)));
    for (let i = 0; i < stale.length; i += 400) {
      await fsCommit(stale.slice(i, i + 400).map((doc) => ({ delete: doc.name })), headers);
    }
  };

  // Anggota.
  const anggotaIds = new Set();
  await upsertThenPrune(MEMBERS_COLLECTION, anggotaIds, () =>
    anggota.map((a) => {
      const id = cleanText(a.ID_Anggota ?? a.idAnggota, 40);
      anggotaIds.add(id);
      return {
        update: {
          name: memberName(gid, MEMBERS_COLLECTION, id),
          fields: encodeFields({
            ID_Anggota: id,
            Nama_Anggota: cleanText(a.Nama_Anggota ?? a.namaAnggota, 80),
            Nomor_WA: cleanDigits(a.Nomor_WA ?? a.nomorWa, 20),
            Status_Aktif: STATUSES.includes(a.Status_Aktif ?? a.statusAktif) ? (a.Status_Aktif ?? a.statusAktif) : 'Aktif',
            // Preserve the join date from the backup when present; blank means
            // "legacy member" (owes the full window), matching addMember's default.
            Tanggal_Gabung: cleanText(a.Tanggal_Gabung ?? a.tanggalGabung, 30),
            groupId: gid
          })
        }
      };
    })
  );

  // Kategori.
  const kategoriIds = new Set();
  await upsertThenPrune(CATEGORIES_COLLECTION, kategoriIds, () =>
    kategori.map((k) => {
      const id = cleanText(k.ID_Kategori ?? k.idKategori, 40);
      kategoriIds.add(id);
      return {
        update: {
          name: memberName(gid, CATEGORIES_COLLECTION, id),
          fields: encodeFields({
            ID_Kategori: id,
            Nama_Kategori: cleanText(k.Nama_Kategori ?? k.namaKategori, 60),
            Tipe: k.Tipe ?? k.tipe,
            groupId: gid
          })
        }
      };
    })
  );

  // Transaksi.
  const transaksiIds = new Set();
  await upsertThenPrune(TRANSACTIONS_COLLECTION, transaksiIds, () =>
    transaksi.map((t) => {
      const idTrx = cleanText(t.ID_Transaksi ?? t.idTransaksi, 40) || newId('TRX');
      transaksiIds.add(idTrx);
      return {
        update: {
          name: memberName(gid, TRANSACTIONS_COLLECTION, idTrx),
          fields: encodeFields({
            ID_Transaksi: idTrx,
            Timestamp: cleanText(t.Timestamp ?? t.timestamp, 30) || timestamp,
            Tipe_Arus: t.Tipe_Arus ?? t.tipeArus,
            ID_Kategori: cleanText(t.ID_Kategori ?? t.idKategori, 40),
            ID_Anggota: cleanText(t.ID_Anggota ?? t.idAnggota, 40) || '-',
            Bulan_Iuran: cleanText(t.Bulan_Iuran ?? t.bulanIuran, 20) || '-',
            Tahun_Iuran: cleanText(t.Tahun_Iuran ?? t.tahunIuran, 4) || '-',
            Nominal: Math.round(Number(t.Nominal ?? t.nominal) || 0),
            Keterangan: cleanText(t.Keterangan ?? t.keterangan, 200),
            groupId: gid
          })
        }
      };
    })
  );

  // Update skippedMonths in settings.
  await fsPatch(settingsDoc(gid), { skippedMonths }, headers, ['skippedMonths']);

  await writeAuditLog(
    gid,
    'RESTORE_DATABASE',
    `Snapshot dipulihkan: ${anggota.length} anggota, ${transaksi.length} transaksi`,
    headers
  );
  return ok('Database berhasil dipulihkan dari snapshot.', {
    anggota: anggota.length,
    kategori: kategori.length,
    transaksi: transaksi.length
  });
}
