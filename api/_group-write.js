/**
 * Mutating operations for a single group's data.
 *
 * Every handler validates its input, writes the change and appends an audit
 * entry. Handlers return `{status, message, data}` for business-level
 * rejections and throw for infrastructure failures (the router maps those to
 * HTTP 500).
 */
import { fsCommit, fsGet, fsPatch, fsDelete, fsListAll } from './_sa.js';
import {
  CATEGORIES_COLLECTION,
  MEMBERS_COLLECTION,
  TRANSACTIONS_COLLECTION,
  col,
  newId,
  nowIso,
  settingsDoc,
  memberName,
  writeAuditLog
} from './_store.js';
import { readTransactions } from './_group-read.js';

const SKIPPED_MONTH_RE = /^(0[1-9]|1[0-2])-\d{4}$/;
const ARUS = ['Masuk', 'Keluar'];
const STATUSES = ['Aktif', 'Nonaktif'];

const fail = (message) => ({ status: false, message, data: null });
const ok = (message, data = null) => ({ status: true, message, data });

const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);
const cleanDigits = (value, max) => String(value ?? '').replace(/\D/g, '').slice(0, max);

/**
 * Validate the shared transaction payload shape.
 * @returns {{nominal: number, tipeArus: string, idKategori: string, idAnggota: string,
 *            bulanIuran: string, tahunIuran: string, keterangan: string}|{error: string}}
 */
function parseTransactionInput(dataForm) {
  const nominal = Number(dataForm?.nominal);
  if (!Number.isFinite(nominal) || nominal <= 0) return { error: 'Nominal transaksi harus lebih besar dari 0.' };
  if (nominal > 1_000_000_000_000) return { error: 'Nominal transaksi melebihi batas wajar.' };

  const tipeArus = dataForm?.tipeArus;
  if (!ARUS.includes(tipeArus)) return { error: 'Tipe arus harus Masuk atau Keluar.' };

  const idKategori = cleanText(dataForm?.idKategori, 40);
  if (!idKategori || idKategori === '-') return { error: 'Kategori transaksi harus dipilih.' };

  return {
    nominal: Math.round(nominal),
    tipeArus,
    idKategori,
    idAnggota: cleanText(dataForm?.idAnggota, 40) || '-',
    bulanIuran: cleanText(dataForm?.bulanIuran, 20) || '-',
    tahunIuran: cleanText(dataForm?.tahunIuran, 4) || '-',
    keterangan: cleanText(dataForm?.keterangan, 200)
  };
}

/**
 * Find an existing iuran payment matching the member and period.
 * Exported so the de-duplication rule can be tested directly.
 */
export const findDuplicateIuran = (transactions, input, excludeId = null) =>
  transactions.find((t) =>
    (!excludeId || t.ID_Transaksi !== excludeId) &&
    t.ID_Anggota === input.idAnggota &&
    t.Bulan_Iuran === input.bulanIuran &&
    String(t.Tahun_Iuran) === String(input.tahunIuran)
  );

const isIuranPayment = (input) =>
  input.idAnggota !== '-' && input.bulanIuran !== '-' && input.tahunIuran !== '-';

/* ── Transactions ────────────────────────────────────────────────── */

export async function addTransaction(gid, payload, headers) {
  const input = parseTransactionInput(payload?.dataForm);
  if (input.error) return fail(input.error);

  if (isIuranPayment(input)) {
    const transaksi = await readTransactions(gid, headers);
    if (findDuplicateIuran(transaksi, input)) {
      return ok(`Iuran ${input.bulanIuran} ${input.tahunIuran} sudah tercatat sebelumnya.`, { duplicate: true });
    }
  }

  const idTrx = newId('TRX');
  const doc = {
    ID_Transaksi: idTrx,
    Timestamp: nowIso(),
    Tipe_Arus: input.tipeArus,
    ID_Kategori: input.idKategori,
    ID_Anggota: input.idAnggota,
    Bulan_Iuran: input.bulanIuran,
    Tahun_Iuran: input.tahunIuran,
    Nominal: input.nominal,
    Keterangan: input.keterangan,
    groupId: gid
  };

  await fsPatch(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTrx}`, doc, headers);
  await writeAuditLog(gid, 'TAMBAH_TRANSAKSI', `${doc.Tipe_Arus} Rp${doc.Nominal} (${doc.Keterangan || doc.Bulan_Iuran})`, headers);
  return ok('Transaksi disimpan.', doc);
}

export async function addBulkTransactions(gid, payload, headers) {
  let listTrx = Array.isArray(payload?.listTrx) ? payload.listTrx : [];
  if (!listTrx.length && Array.isArray(payload?.dataForm?.arrIdAnggota)) {
    const { arrIdAnggota, tipeArus, idKategori, bulanIuran, tahunIuran, nominal, keterangan } = payload.dataForm;
    listTrx = arrIdAnggota.map((idAnggota) => ({ tipeArus, idKategori, idAnggota, bulanIuran, tahunIuran, nominal, keterangan }));
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
  const writes = accepted.map((input) => {
    const idTrx = newId('TRX');
    return {
      update: {
        name: memberName(gid, TRANSACTIONS_COLLECTION, idTrx),
        fields: {
          ID_Transaksi: { stringValue: idTrx },
          Timestamp: { stringValue: timestamp },
          Tipe_Arus: { stringValue: input.tipeArus },
          ID_Kategori: { stringValue: input.idKategori },
          ID_Anggota: { stringValue: input.idAnggota },
          Bulan_Iuran: { stringValue: input.bulanIuran },
          Tahun_Iuran: { stringValue: input.tahunIuran },
          Nominal: { integerValue: String(input.nominal) },
          Keterangan: { stringValue: input.keterangan },
          groupId: { stringValue: gid }
        }
      }
    };
  });

  await fsCommit(writes, headers);
  await writeAuditLog(gid, 'TAMBAH_IURAN_MASSAL', `${accepted.length} iuran dicatat, ${skipped.length} dilewati`, headers);
  return ok(`${accepted.length} transaksi massal berhasil disimpan.`, { inserted: accepted.length, skipped });
}

export async function editTransaction(gid, payload, headers) {
  const idTarget = cleanText(payload?.idTransaksi || payload?.dataForm?.idTransaksi, 40);
  if (!idTarget) return fail('ID transaksi tidak valid.');

  const input = parseTransactionInput(payload?.dataForm);
  if (input.error) return fail(input.error);

  const existing = await fsGet(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTarget}`, headers);
  if (!existing) return fail('Transaksi tidak ditemukan.');

  if (isIuranPayment(input)) {
    const transaksi = await readTransactions(gid, headers);
    if (findDuplicateIuran(transaksi, input, idTarget)) {
      return fail(`Iuran ${input.bulanIuran} ${input.tahunIuran} sudah tercatat pada transaksi lain.`);
    }
  }

  const updated = {
    Tipe_Arus: input.tipeArus,
    ID_Kategori: input.idKategori,
    ID_Anggota: input.idAnggota,
    Bulan_Iuran: input.bulanIuran,
    Tahun_Iuran: input.tahunIuran,
    Nominal: input.nominal,
    Keterangan: input.keterangan
  };

  await fsPatch(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTarget}`, updated, headers, Object.keys(updated));
  await writeAuditLog(gid, 'EDIT_TRANSAKSI', `ID: ${idTarget}`, headers);
  return ok('Transaksi berhasil diupdate.');
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

/* ── Skipped months ──────────────────────────────────────────────── */

export async function changeSkippedMonth(gid, payload, headers, shouldAdd) {
  const month = cleanText(payload?.month, 7);
  if (!SKIPPED_MONTH_RE.test(month)) return fail('Format bulan libur harus MM-YYYY.');

  const settings = await fsGet(settingsDoc(gid), headers);
  const current = settings?.skippedMonths || [];
  const updated = shouldAdd
    ? (current.includes(month) ? current : [...current, month])
    : current.filter((m) => m !== month);

  await fsPatch(settingsDoc(gid), { skippedMonths: updated }, headers, ['skippedMonths']);
  await writeAuditLog(gid, shouldAdd ? 'TAMBAH_BULAN_LIBUR' : 'HAPUS_BULAN_LIBUR', month, headers);
  return ok('Pengaturan bulan libur diperbarui.', { skippedMonths: updated });
}

/* ── Members ─────────────────────────────────────────────────────── */

export async function addMember(gid, payload, headers) {
  const nama = cleanText(payload?.nama, 80);
  if (!nama) return fail('Nama anggota wajib diisi.');
  if (nama.length < 2) return fail('Nama anggota minimal 2 karakter.');

  const idAnggota = newId('ANG', 4);
  const doc = {
    ID_Anggota: idAnggota,
    Nama_Anggota: nama,
    Nomor_WA: cleanDigits(payload?.noWa, 20),
    Status_Aktif: 'Aktif',
    groupId: gid
  };

  await fsPatch(`${col(gid, MEMBERS_COLLECTION)}/${idAnggota}`, doc, headers);
  await writeAuditLog(gid, 'TAMBAH_ANGGOTA', nama, headers);
  return ok('Anggota berhasil ditambahkan.', doc);
}

export async function updateMemberStatus(gid, payload, headers) {
  const idAnggota = cleanText(payload?.idAnggota, 40);
  const statusAktif = payload?.statusAktif;
  if (!idAnggota) return fail('ID anggota tidak valid.');
  if (!STATUSES.includes(statusAktif)) return fail('Status anggota harus Aktif atau Nonaktif.');

  const existing = await fsGet(`${col(gid, MEMBERS_COLLECTION)}/${idAnggota}`, headers);
  if (!existing) return fail('Anggota tidak ditemukan.');

  await fsPatch(`${col(gid, MEMBERS_COLLECTION)}/${idAnggota}`, { Status_Aktif: statusAktif }, headers, ['Status_Aktif']);
  await writeAuditLog(gid, 'STATUS_ANGGOTA', `${idAnggota} -> ${statusAktif}`, headers);
  return ok('Status anggota diperbarui.');
}

/* ── Categories ──────────────────────────────────────────────────── */

export async function addCategory(gid, payload, headers) {
  const nama = cleanText(payload?.nama, 60);
  const tipe = payload?.tipe;
  if (!nama) return fail('Nama kategori wajib diisi.');
  if (!ARUS.includes(tipe)) return fail('Tipe kategori harus Masuk atau Keluar.');

  const idKategori = newId(tipe === 'Masuk' ? 'KAT-M' : 'KAT-K', 3);
  const doc = { ID_Kategori: idKategori, Nama_Kategori: nama, Tipe: tipe, groupId: gid };

  await fsPatch(`${col(gid, CATEGORIES_COLLECTION)}/${idKategori}`, doc, headers);
  await writeAuditLog(gid, 'TAMBAH_KATEGORI', `${nama} (${tipe})`, headers);
  return ok('Kategori berhasil ditambahkan.', doc);
}

/* ── Client-reported activities ──────────────────────────────────── */

/** Low-risk events the browser is allowed to record itself. */
const CLIENT_AUDIT_ACTIONS = new Set([
  'BACKUP_DATABASE',
  'RESTORE_DATABASE',
  'OFFLINE_SYNC',
  'LOGOUT_ADMIN'
]);

export async function noteClientAudit(gid, payload, headers) {
  const aksi = cleanText(payload?.aksi, 40);
  if (!CLIENT_AUDIT_ACTIONS.has(aksi)) return fail('Aksi audit tidak diizinkan.');
  await writeAuditLog(gid, aksi, cleanText(payload?.detail, 200), headers);
  return ok('Aktivitas dicatat.');
}

/* ── Restore snapshot ─────────────────────────────────────────────── */

/**
 * Replace the group's data collections with a validated JSON backup snapshot.
 *
 * Strategy: delete all existing anggota, kategori, transaksi and settings docs,
 * then write the backup records in batches of 400 (Firestore commit limit).
 * Each record is validated before any writes begin so a malformed backup is
 * rejected cleanly rather than leaving the group in a partial state.
 *
 * @param {string} gid
 * @param {object} payload  { data: { anggota, kategori, transaksi, skippedMonths } }
 * @param {object} headers
 */
export async function restoreSnapshot(gid, payload, headers) {
  const data = payload?.data;
  if (!data || !Array.isArray(data.anggota) || !Array.isArray(data.transaksi)) {
    return fail('Format snapshot tidak valid.');
  }

  const anggota = data.anggota.slice(0, 1000);
  const kategori = Array.isArray(data.kategori) ? data.kategori.slice(0, 200) : [];
  const transaksi = data.transaksi.slice(0, 10000);
  const skippedMonths = Array.isArray(data.skippedMonths)
    ? data.skippedMonths.filter((m) => SKIPPED_MONTH_RE.test(m)).slice(0, 120)
    : [];

  // Validate every record before touching Firestore.
  for (const a of anggota) {
    if (!cleanText(a?.ID_Anggota, 40) || !cleanText(a?.Nama_Anggota, 80)) {
      return fail('Data anggota di snapshot tidak valid (ID atau Nama kosong).');
    }
  }
  for (const k of kategori) {
    if (!cleanText(k?.ID_Kategori, 40) || !ARUS.includes(k?.Tipe)) {
      return fail('Data kategori di snapshot tidak valid.');
    }
  }
  for (const t of transaksi) {
    const parsed = parseTransactionInput(t);
    if (parsed.error) return fail(`Transaksi di snapshot tidak valid: ${parsed.error}`);
  }

  // Delete all existing records in the three data collections.
  for (const collName of [MEMBERS_COLLECTION, CATEGORIES_COLLECTION, TRANSACTIONS_COLLECTION]) {
    const existing = await fsListAll(col(gid, collName), headers);
    for (let i = 0; i < existing.length; i += 400) {
      const batch = existing.slice(i, i + 400).map((doc) => ({ delete: doc.name }));
      await fsCommit(batch, headers);
    }
  }

  // Write anggota.
  const timestamp = nowIso();

  for (let i = 0; i < anggota.length; i += 400) {
    const batch = anggota.slice(i, i + 400).map((a) => ({
      update: {
        name: memberName(gid, MEMBERS_COLLECTION, cleanText(a.ID_Anggota, 40)),
        fields: {
          ID_Anggota: { stringValue: cleanText(a.ID_Anggota, 40) },
          Nama_Anggota: { stringValue: cleanText(a.Nama_Anggota, 80) },
          Nomor_WA: { stringValue: cleanDigits(a.Nomor_WA, 20) },
          Status_Aktif: { stringValue: STATUSES.includes(a.Status_Aktif) ? a.Status_Aktif : 'Aktif' },
          groupId: { stringValue: gid }
        }
      }
    }));
    await fsCommit(batch, headers);
  }

  // Write kategori.
  for (let i = 0; i < kategori.length; i += 400) {
    const batch = kategori.slice(i, i + 400).map((k) => ({
      update: {
        name: memberName(gid, CATEGORIES_COLLECTION, cleanText(k.ID_Kategori, 40)),
        fields: {
          ID_Kategori: { stringValue: cleanText(k.ID_Kategori, 40) },
          Nama_Kategori: { stringValue: cleanText(k.Nama_Kategori, 60) },
          Tipe: { stringValue: k.Tipe },
          groupId: { stringValue: gid }
        }
      }
    }));
    await fsCommit(batch, headers);
  }

  // Write transaksi.
  for (let i = 0; i < transaksi.length; i += 400) {
    const batch = transaksi.slice(i, i + 400).map((t) => {
      const idTrx = cleanText(t.ID_Transaksi, 40) || newId('TRX');
      return {
        update: {
          name: memberName(gid, TRANSACTIONS_COLLECTION, idTrx),
          fields: {
            ID_Transaksi: { stringValue: idTrx },
            Timestamp: { stringValue: cleanText(t.Timestamp, 30) || timestamp },
            Tipe_Arus: { stringValue: t.Tipe_Arus },
            ID_Kategori: { stringValue: cleanText(t.ID_Kategori, 40) },
            ID_Anggota: { stringValue: cleanText(t.ID_Anggota, 40) || '-' },
            Bulan_Iuran: { stringValue: cleanText(t.Bulan_Iuran, 20) || '-' },
            Tahun_Iuran: { stringValue: cleanText(t.Tahun_Iuran, 4) || '-' },
            Nominal: { integerValue: String(Math.round(Number(t.Nominal) || 0)) },
            Keterangan: { stringValue: cleanText(t.Keterangan, 200) },
            groupId: { stringValue: gid }
          }
        }
      };
    });
    await fsCommit(batch, headers);
  }

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

/* ── Dispatch table ──────────────────────────────────────────────── */

/** Action name → handler. Used by the data gateway's router. */
export const WRITE_HANDLERS = {
  tambahTransaksi: addTransaction,
  tambahTransaksiMassal: addBulkTransactions,
  editTransaksi: editTransaction,
  hapusTransaksi: (gid, payload, headers) =>
    deleteDocument(gid, { ...payload, targetCollection: TRANSACTIONS_COLLECTION }, headers),
  hapusAnggota: (gid, payload, headers) =>
    deleteDocument(gid, { ...payload, targetCollection: MEMBERS_COLLECTION }, headers),
  hapusKategori: (gid, payload, headers) =>
    deleteDocument(gid, { ...payload, targetCollection: CATEGORIES_COLLECTION }, headers),
  tambahAnggota: addMember,
  updateStatusAnggota: updateMemberStatus,
  tambahKategori: addCategory,
  addSkippedMonth: (gid, payload, headers) => changeSkippedMonth(gid, payload, headers, true),
  removeSkippedMonth: (gid, payload, headers) => changeSkippedMonth(gid, payload, headers, false),
  catatAktivitas: noteClientAudit,
  restoreSnapshot
};
