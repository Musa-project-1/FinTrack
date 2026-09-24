/**
 * Mutating operations for a single group's data.
 *
 * Every handler validates its input, writes the change and appends an audit
 * entry. Handlers return `{status, message, data}` for business-level
 * rejections and throw for infrastructure failures (the router maps those to
 * HTTP 500).
 */
import {
  encodeFields,
  fsCommit,
  fsCreateIfAbsent,
  fsDelete,
  fsGet,
  fsListAll,
  fsPatch
} from './_sa.js';
import {
  CATEGORIES_COLLECTION,
  MEMBERS_COLLECTION,
  TRANSACTIONS_COLLECTION,
  col,
  iuranId,
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
 * Normalise a client-supplied transaction date into an ISO timestamp.
 *
 * The client sends the date the payment actually happened (local noon, so the
 * calendar day is stable across Indonesian timezones). Anything unparseable or
 * outside a sane year range is ignored, and the caller falls back to `nowIso()`.
 *
 * @param {*} value ISO string or date-like value.
 * @returns {string|null} ISO timestamp, or null when absent/invalid.
 */
const parseTimestamp = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) return null;
  return date.toISOString();
};

/**
 * Validate the shared transaction payload shape.
 * @returns {{nominal: number, tipeArus: string, idKategori: string, idAnggota: string,
 *            bulanIuran: string, tahunIuran: string, keterangan: string}|{error: string}}
 */
function parseTransactionInput(dataForm) {
  const nominal = Number(dataForm?.nominal ?? dataForm?.Nominal);
  if (!Number.isFinite(nominal) || nominal <= 0) return { error: 'Nominal transaksi harus lebih besar dari 0.' };
  if (nominal > 1_000_000_000_000) return { error: 'Nominal transaksi melebihi batas wajar.' };

  const tipeArus = dataForm?.tipeArus ?? dataForm?.Tipe_Arus;
  if (!ARUS.includes(tipeArus)) return { error: 'Tipe arus harus Masuk atau Keluar.' };

  const idKategori = cleanText(dataForm?.idKategori ?? dataForm?.ID_Kategori, 40);
  if (!idKategori || idKategori === '-') return { error: 'Kategori transaksi harus dipilih.' };

  return {
    nominal: Math.round(nominal),
    tipeArus,
    idKategori,
    idAnggota: cleanText(dataForm?.idAnggota ?? dataForm?.ID_Anggota, 40) || '-',
    bulanIuran: cleanText(dataForm?.bulanIuran ?? dataForm?.Bulan_Iuran, 20) || '-',
    tahunIuran: cleanText(dataForm?.tahunIuran ?? dataForm?.Tahun_Iuran, 4) || '-',
    keterangan: cleanText(dataForm?.keterangan ?? dataForm?.Keterangan, 200),
    timestamp: parseTimestamp(dataForm?.timestamp ?? dataForm?.Timestamp)
  };
}

/**
 * Find an existing iuran payment matching the member and period.
 * Exported so the de-duplication rule can be tested directly.
 */
export const findDuplicateIuran = (transactions, input, excludeId = null) =>
  transactions.find((t) =>
    (!excludeId || t.ID_Transaksi !== excludeId) &&
    t.Tipe_Arus === 'Masuk' &&
    t.ID_Anggota === input.idAnggota &&
    t.Bulan_Iuran === input.bulanIuran &&
    String(t.Tahun_Iuran) === String(input.tahunIuran)
  );

export const isIuranPayment = (input) =>
  input?.tipeArus === 'Masuk' &&
  input?.idAnggota !== '-' &&
  input?.bulanIuran !== '-' &&
  input?.tahunIuran !== '-';

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
  const writeResults = await Promise.all(
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
  for (const r of writeResults) {
    if (r.ok) {
      insertedCount += 1;
    } else {
      skipped.push(r.idAnggota);
    }
  }

  await writeAuditLog(gid, 'TAMBAH_IURAN_MASSAL', `${insertedCount} iuran dicatat, ${skipped.length} dilewati`, headers);
  return ok(`${insertedCount} transaksi massal berhasil disimpan.`, { inserted: insertedCount, skipped });
}

export async function editTransaction(gid, payload, headers) {
  const idTarget = cleanText(payload?.idTransaksi || payload?.dataForm?.idTransaksi, 40);
  if (!idTarget) return fail('ID transaksi tidak valid.');

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

    if (isIuran) {
      const created = await fsCreateIfAbsent(`${col(gid, TRANSACTIONS_COLLECTION)}/${targetId}`, doc, headers);
      if (!created) {
        return fail(`Iuran ${input.bulanIuran} ${input.tahunIuran} sudah tercatat pada transaksi lain.`);
      }
    } else {
      await fsPatch(`${col(gid, TRANSACTIONS_COLLECTION)}/${targetId}`, doc, headers);
    }
    await fsDelete(`${col(gid, TRANSACTIONS_COLLECTION)}/${idTarget}`, headers);
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

  const patchData = { Status_Aktif: statusAktif };
  const updateMask = ['Status_Aktif'];

  const nama = cleanText(payload?.nama, 80);
  if (nama && nama.length >= 2) {
    patchData.Nama_Anggota = nama;
    updateMask.push('Nama_Anggota');
  }

  if (payload?.noWa !== undefined && payload?.noWa !== null) {
    patchData.Nomor_WA = cleanDigits(payload.noWa, 20);
    updateMask.push('Nomor_WA');
  }

  await fsPatch(`${col(gid, MEMBERS_COLLECTION)}/${idAnggota}`, patchData, headers, updateMask);
  await writeAuditLog(gid, 'STATUS_ANGGOTA', `${idAnggota} diperbarui (${statusAktif})`, headers);
  return ok('Data anggota diperbarui.');
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
    if (!id || !nama) {
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
    if (!id || !ARUS.includes(tipe)) {
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
 * Deletes all existing documents in members, categories, and transactions,
 * then write the backup records in batches of 400 (Firestore commit limit).
 * Each record is validated before any writes begin so a malformed backup is
 * rejected cleanly rather than leaving the group in a partial state.
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
        name: memberName(gid, MEMBERS_COLLECTION, cleanText(a.ID_Anggota ?? a.idAnggota, 40)),
        fields: encodeFields({
          ID_Anggota: cleanText(a.ID_Anggota ?? a.idAnggota, 40),
          Nama_Anggota: cleanText(a.Nama_Anggota ?? a.namaAnggota, 80),
          Nomor_WA: cleanDigits(a.Nomor_WA ?? a.nomorWa, 20),
          Status_Aktif: STATUSES.includes(a.Status_Aktif ?? a.statusAktif) ? (a.Status_Aktif ?? a.statusAktif) : 'Aktif',
          groupId: gid
        })
      }
    }));
    await fsCommit(batch, headers);
  }

  // Write kategori.
  for (let i = 0; i < kategori.length; i += 400) {
    const batch = kategori.slice(i, i + 400).map((k) => ({
      update: {
        name: memberName(gid, CATEGORIES_COLLECTION, cleanText(k.ID_Kategori ?? k.idKategori, 40)),
        fields: encodeFields({
          ID_Kategori: cleanText(k.ID_Kategori ?? k.idKategori, 40),
          Nama_Kategori: cleanText(k.Nama_Kategori ?? k.namaKategori, 60),
          Tipe: k.Tipe ?? k.tipe,
          groupId: gid
        })
      }
    }));
    await fsCommit(batch, headers);
  }

  // Write transaksi.
  for (let i = 0; i < transaksi.length; i += 400) {
    const batch = transaksi.slice(i, i + 400).map((t) => {
      const idTrx = cleanText(t.ID_Transaksi ?? t.idTransaksi, 40) || newId('TRX');
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
