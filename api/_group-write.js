/**
 * Mutating operations for a single group's data.
 *
 * Every handler validates its input, writes the change and appends an audit
 * entry. Handlers return `{status, message, data}` for business-level
 * rejections and throw for infrastructure failures (the router maps those to
 * HTTP 500).
 */
import { fsCommit, fsGet, fsPatch, fsDelete } from './_sa.js';
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
  catatAktivitas: noteClientAudit
};
