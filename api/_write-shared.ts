import type { ArusTipe } from '../src/types/finkas.d.ts';
import { Buffer } from 'node:buffer';
import { NAMA_BULAN } from '../src/svelte/core/config.ts';
import { parseDocId } from './_store.ts';
/**
 * Shared validation helpers and constants for a single group's write handlers.
 *
 * Pure, dependency-free building blocks reused by the transaction, entity and
 * snapshot write modules. Keeping them here lets each handler module stay small
 * and lets the de-duplication / parsing rules be unit-tested in isolation.
 */

export const SKIPPED_MONTH_RE = /^(0[1-9]|1[0-2])-\d{4}$/;
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;
export const VALID_MONTHS = new Set(NAMA_BULAN);
export const ARUS = ['Masuk', 'Keluar'];
export const STATUSES = ['Aktif', 'Nonaktif'];
const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const isValidMonthYear = (raw: unknown): boolean => {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!SKIPPED_MONTH_RE.test(trimmed)) return false;
  const year = Number(trimmed.slice(3));
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
};

/** Reject prototype-pollution keys, non-plain objects, excessive depth, and oversized JSON payloads. */
export function assertSafeJsonValue(value: unknown, maxDepth: number = 6, maxBytes: number = 256 * 1024): string | null {
  const walk = (node: unknown, depth: number): string | null => {
    if (depth > maxDepth) return 'Struktur data melebihi batas kedalaman yang diizinkan.';
    if (node === null || node === undefined) return null;
    const t = typeof node;
    if (t === 'string' || t === 'boolean') return null;
    if (t === 'number') return Number.isFinite(node) ? null : 'Nilai numerik tidak valid.';
    if (t !== 'object') return 'Tipe nilai JSON tidak didukung.';

    if (Array.isArray(node)) {
      for (const item of node) {
        const err = walk(item, depth + 1);
        if (err) return err;
      }
      return null;
    }

    const proto = Object.getPrototypeOf(node);
    if (proto !== Object.prototype && proto !== null) {
      return 'Objek JSON tidak valid.';
    }
    for (const key of Object.getOwnPropertyNames(node)) {
      if (FORBIDDEN_JSON_KEYS.has(key)) {
        return `Kunci objek tidak diizinkan: ${key}`;
      }
      const err = walk((node as Record<string, unknown>)[key], depth + 1);
      if (err) return err;
    }
    return null;
  };

  const err = walk(value, 0);
  if (err) return err;
  if (value !== undefined) {
    try {
      const bytes = Buffer.byteLength(JSON.stringify(value) || '', 'utf8');
      if (bytes > maxBytes) return 'Ukuran payload JSON melebihi batas yang diizinkan.';
    } catch {
      return 'Data JSON tidak dapat diserialisasi.';
    }
  }
  return null;
}

export const fail = (message: string) => ({ status: false, message, data: null });
export const ok = (message: string, data: object|null = null) => ({ status: true, message, data });

export const cleanText = (value: unknown, max: number) =>
  (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    ? String(value).trim().slice(0, max)
    : '';
export const cleanDigits = (value: unknown, max: number) =>
  (typeof value === 'string' || typeof value === 'number')
    ? String(value).replace(/\D/g, '').slice(0, max)
    : '';

export const MAX_BULK_TRANSACTIONS = 300;
export const MAX_COMMIT_WRITES = 500;

/** Normalise a client-supplied transaction date into an ISO timestamp.
 *
 * The client sends the date the payment actually happened (local noon, so the
 * calendar day is stable across Indonesian timezones). Anything unparseable or
 * outside a sane year range is ignored, and the caller falls back to `nowIso()`. */
export const parseTimestamp = (value: unknown): string|null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  return date.toISOString();
};

export interface TransactionInput {
  nominal: number;
  tipeArus: ArusTipe;
  idKategori: string;
  idAnggota: string;
  bulanIuran: string;
  tahunIuran: string;
  keterangan: string;
  timestamp: string | null;
  operationId?: string;
}

/** Validate the shared transaction payload shape. */
export function parseTransactionInput(
  dataForm: Record<string, any> | null | undefined
): TransactionInput | { error: string } {
  if (!dataForm || typeof dataForm !== 'object' || Array.isArray(dataForm)) {
    return { error: 'Data transaksi tidak valid.' };
  }
  for (const key of Object.getOwnPropertyNames(dataForm)) {
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      return { error: `Kunci tidak diizinkan dalam data transaksi: ${key}` };
    }
  }

  const rawNominal = dataForm.nominal ?? dataForm.Nominal;
  const nominal = typeof rawNominal === 'number'
    ? rawNominal
    : (typeof rawNominal === 'string' && rawNominal.trim().length > 0 ? Number(rawNominal) : NaN);
  if (!Number.isSafeInteger(nominal) || nominal <= 0) {
    return { error: 'Nominal transaksi harus berupa bilangan bulat lebih besar dari 0.' };
  }
  if (nominal > 1_000_000_000_000) return { error: 'Nominal transaksi melebihi batas wajar.' };

  const tipeArus = dataForm.tipeArus ?? dataForm.Tipe_Arus;
  if (typeof tipeArus !== 'string' || !ARUS.includes(tipeArus)) {
    return { error: 'Tipe arus harus Masuk atau Keluar.' };
  }

  const rawKategori = dataForm.idKategori ?? dataForm.ID_Kategori;
  if (rawKategori === undefined || rawKategori === null || (typeof rawKategori === 'string' && (rawKategori.trim() === '' || rawKategori.trim() === '-'))) {
    return { error: 'Kategori transaksi harus dipilih.' };
  }
  const parsedKat = parseDocId(rawKategori);
  if (parsedKat.error || !parsedKat.id) return { error: parsedKat.error || 'ID kategori tidak valid.' };

  const rawAnggota = dataForm.idAnggota ?? dataForm.ID_Anggota;
  let idAnggota = '-';
  if (rawAnggota !== undefined && rawAnggota !== null && !(typeof rawAnggota === 'string' && (rawAnggota.trim() === '' || rawAnggota.trim() === '-'))) {
    const parsedAng = parseDocId(rawAnggota);
    if (parsedAng.error || !parsedAng.id) return { error: parsedAng.error || 'ID anggota tidak valid.' };
    idAnggota = parsedAng.id;
  }

  const rawBulan = dataForm.bulanIuran ?? dataForm.Bulan_Iuran;
  let bulanIuran = '-';
  if (rawBulan !== undefined && rawBulan !== null && !(typeof rawBulan === 'string' && (rawBulan.trim() === '' || rawBulan.trim() === '-'))) {
    if (typeof rawBulan !== 'string' || !VALID_MONTHS.has(rawBulan.trim())) {
      return { error: 'Bulan iuran tidak valid.' };
    }
    bulanIuran = rawBulan.trim();
  }

  const rawTahun = dataForm.tahunIuran ?? dataForm.Tahun_Iuran;
  let tahunIuran = '-';
  if (rawTahun !== undefined && rawTahun !== null && rawTahun !== '' && !(typeof rawTahun === 'string' && (rawTahun.trim() === '' || rawTahun.trim() === '-'))) {
    if (typeof rawTahun !== 'string' && typeof rawTahun !== 'number') {
      return { error: 'Tahun iuran tidak valid.' };
    }
    const yrStr = String(rawTahun).trim();
    if (!/^\d{4}$/.test(yrStr)) return { error: 'Tahun iuran harus 4 digit.' };
    const yrNum = Number(yrStr);
    if (yrNum < MIN_YEAR || yrNum > MAX_YEAR) {
      return { error: 'Tahun iuran harus antara 2000 dan 2100.' };
    }
    tahunIuran = yrStr;
  }

  return {
    nominal,
    tipeArus: tipeArus as ArusTipe,
    idKategori: parsedKat.id,
    idAnggota,
    bulanIuran,
    tahunIuran,
    keterangan: cleanText(dataForm.keterangan ?? dataForm.Keterangan, 200),
    timestamp: parseTimestamp(dataForm.timestamp ?? dataForm.Timestamp)
  };
}

/** Find an existing iuran payment matching the member and period. */
export const findDuplicateIuran = (transactions: Array<Record<string, any>>, input: {idAnggota: string, bulanIuran: string, tahunIuran: string}, excludeId: string|null = null) =>
  transactions.find((t) =>
    (!excludeId || t.ID_Transaksi !== excludeId) &&
    t.Tipe_Arus === 'Masuk' &&
    t.ID_Anggota === input.idAnggota &&
    t.Bulan_Iuran === input.bulanIuran &&
    String(t.Tahun_Iuran) === String(input.tahunIuran)
  );

export const isIuranPayment = (input: {tipeArus?: string, idAnggota?: string, bulanIuran?: string, tahunIuran?: string} | null | undefined) =>
  input?.tipeArus === 'Masuk' &&
  input?.idAnggota !== '-' &&
  input?.bulanIuran !== '-' &&
  input?.tahunIuran !== '-';
