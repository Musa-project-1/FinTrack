/**
 * Shared validation helpers and constants for a single group's write handlers.
 *
 * Pure, dependency-free building blocks reused by the transaction, entity and
 * snapshot write modules. Keeping them here lets each handler module stay small
 * and lets the de-duplication / parsing rules be unit-tested in isolation.
 */

export const SKIPPED_MONTH_RE = /^(0[1-9]|1[0-2])-\d{4}$/;
export const ARUS = ['Masuk', 'Keluar'];
export const STATUSES = ['Aktif', 'Nonaktif'];

export const fail = (message) => ({ status: false, message, data: null });
export const ok = (message, data = null) => ({ status: true, message, data });

export const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);
export const cleanDigits = (value, max) => String(value ?? '').replace(/\D/g, '').slice(0, max);

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
export const parseTimestamp = (value) => {
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
export function parseTransactionInput(dataForm) {
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
