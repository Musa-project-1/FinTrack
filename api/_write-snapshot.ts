/**
 * Full-database snapshot validation, atomic export and restore for a group.
 *
 * `validateSnapshot` is pure and exported so both backup and restore paths can
 * be tested without network calls. `restoreSnapshot` writes new records BEFORE
 * pruning stale ones so a mid-restore failure never empties a collection.
 *
 * Export uses a Firestore read-only transaction when available to ensure an
 * atomic, point-in-time consistent snapshot across all collections.
 */
import type { Anggota, FirestoreDoc, FirestoreHeaders, Kategori, SnapshotData, SnapshotEnvelope, Transaksi } from '../src/types/finkas.d.ts';
import type { FirestoreWrite } from './_sa.ts';
import { Buffer } from 'node:buffer';
import { normalizePaymentAccount, validatePaymentAccount } from '../src/svelte/core/payment-account.ts';
import {
  FIRESTORE_BASE,
  decodeFields,
  encodeFields,
  fsListAll,
  fsPatch
} from './_sa.ts';
import {
  CATEGORIES_COLLECTION,
  MEMBERS_COLLECTION,
  TRANSACTIONS_COLLECTION,
  col,
  commitWritesInBatches,
  groupDoc,
  memberName,
  nowIso,
  parseDocId,
  settingsDoc,
  writeAuditLog
} from './_store.ts';
import {
  ARUS,
  STATUSES,
  assertSafeJsonValue,
  cleanDigits,
  cleanText,
  fail,
  isValidMonthYear,
  ok,
  parseTransactionInput
} from './_write-shared.ts';
import {
  MAX_EXPORT_ATTACHMENTS_BYTES,
  PROOFS_COLLECTION,
  validateAttachmentInput
} from './_attachments.ts';
import {
  OPERATIONS_COLLECTION,
  parseOperationId
} from './_transaction-idempotency.ts';

export const MAX_SNAPSHOT_OPERATIONS = 12000;
const FORBIDDEN_SNAPSHOT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const hasForbiddenObjectKeys = (obj: unknown): string | null => {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (FORBIDDEN_SNAPSHOT_KEYS.has(key)) return key;
  }
  return null;
};

/* ── Read-only Transaction Helpers ───────────────────────────────── */

async function beginReadOnlyTx(headers: FirestoreHeaders) {
  try {
    const res = await fetch(`${FIRESTORE_BASE}:beginTransaction`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { readOnly: {} } })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.transaction || null;
  } catch {
    return null;
  }
}

async function rollbackTx(headers: FirestoreHeaders, transaction: string | null) {
  if (!transaction) return;
  try {
    await fetch(`${FIRESTORE_BASE}:rollback`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction })
    });
  } catch (err) {
    console.warn('[finkas] Rollback transaction failed:', (err instanceof Error ? err.message : String(err)));
  }
}

async function listAllInTx(colPath: string, headers: FirestoreHeaders, transaction: string | null) {
  const docs: Array<{name: string, fields: Record<string, any>}> = [];
  let pageToken = '';
  for (let page = 0; page < 40; page += 1) {
    const txParam = transaction ? `&transaction=${encodeURIComponent(transaction)}` : '';
    const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const query = `?pageSize=300${txParam}${pageParam}`;
    const res = await fetch(`${FIRESTORE_BASE}/${colPath}${query}`, { headers });
    if (!res.ok) {
      throw new Error(`Gagal membaca koleksi (${res.status}): ${colPath}`);
    }
    const json = await res.json();
    (json.documents || []).forEach((doc: FirestoreDoc) => {
      docs.push({ name: doc.name || '', fields: decodeFields(doc.fields) });
    });
    pageToken = json.nextPageToken || '';
    if (!pageToken) break;
  }
  if (pageToken) {
    throw new Error(`Koleksi melebihi batas 40 halaman: ${colPath}`);
  }
  return docs;
}

async function getDocInTx(docPath: string, headers: FirestoreHeaders, transaction: string | null) {
  const txParam = transaction ? `?transaction=${encodeURIComponent(transaction)}` : '';
  const res = await fetch(`${FIRESTORE_BASE}/${docPath}${txParam}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Gagal membaca dokumen (${res.status}): ${docPath}`);
  }
  const json = await res.json();
  return decodeFields(json.fields);
}

/* ── Validation ─────────────────────────────────────────────────── */

/** Legacy backups can supply camelCase entity fields until restore normalizes them. */
type ValidatedSnapshot = Omit<SnapshotData, 'anggota'|'kategori'|'transaksi'> & {
  anggota: Record<string, unknown>[], kategori: Record<string, unknown>[], transaksi: Record<string, unknown>[]
};

/** Validate full snapshot data shape, limits and record integrity before writing. */
export function validateSnapshot(raw: Record<string, unknown> & {data?: Record<string, unknown>}): {valid: false, error: string} | {valid: true, data: ValidatedSnapshot} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'Format snapshot tidak valid.' };
  }
  const forbiddenRaw = hasForbiddenObjectKeys(raw);
  if (forbiddenRaw) {
    return { valid: false, error: `Kunci objek tidak diizinkan dalam snapshot: ${forbiddenRaw}` };
  }

  const data = (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data))
    ? raw.data
    : raw;
  const forbiddenData = hasForbiddenObjectKeys(data);
  if (forbiddenData) {
    return { valid: false, error: `Kunci objek tidak diizinkan dalam snapshot: ${forbiddenData}` };
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
  if (data.attachments !== undefined && !Array.isArray(data.attachments)) {
    return { valid: false, error: 'Format snapshot tidak valid (lampiran bukan array).' };
  }
  if (data.operations !== undefined && !Array.isArray(data.operations)) {
    return { valid: false, error: 'Format snapshot tidak valid (operasi bukan array).' };
  }

  const anggota = data.anggota;
  const kategori = Array.isArray(data.kategori) ? data.kategori : [];
  const transaksi = data.transaksi;
  const rawSkipped = data.skippedMonths;
  const rawAttachments = Array.isArray(data.attachments) ? data.attachments : [];
  const rawOperations = Array.isArray(data.operations) ? data.operations : [];

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
  if (rawAttachments.length > 10000) {
    return { valid: false, error: 'Snapshot melebihi batas maksimum lampiran (10.000).' };
  }
  if (rawOperations.length > MAX_SNAPSHOT_OPERATIONS) {
    return { valid: false, error: `Snapshot melebihi batas maksimum histori operasi (${MAX_SNAPSHOT_OPERATIONS.toLocaleString('id-ID')}).` };
  }

  const rawKasStartInput = data.kasStart ?? raw.kasStart;
  let rawKasStart = '';
  if (rawKasStartInput !== undefined && rawKasStartInput !== null && !(typeof rawKasStartInput === 'string' && rawKasStartInput.trim() === '')) {
    if (!isValidMonthYear(rawKasStartInput)) {
      return { valid: false, error: 'Format awal kas di snapshot tidak valid (harus MM-YYYY tahun 2000–2100).' };
    }
    rawKasStart = String(rawKasStartInput).trim();
  }

  if (data.paymentAccount != null && validatePaymentAccount(data.paymentAccount)) {
    return { valid: false, error: 'Pengaturan rekening di snapshot tidak valid.' };
  }
  const paymentAccount = data.paymentAccount == null ? undefined : normalizePaymentAccount(data.paymentAccount);

  const skippedMonths = Array.isArray(rawSkipped)
    ? rawSkipped.filter((m: unknown): m is string => isValidMonthYear(m)).map((m) => m.trim())
    : [];

  const seenMember = new Set<string>();
  for (const a of anggota) {
    if (!a || typeof a !== 'object' || Array.isArray(a) || hasForbiddenObjectKeys(a)) {
      return { valid: false, error: 'Data anggota di snapshot tidak valid.' };
    }
    const parsedId = parseDocId(a.ID_Anggota ?? a.idAnggota);
    const id = parsedId.id;
    const nama = cleanText(a.Nama_Anggota ?? a.namaAnggota, 80);
    if (parsedId.error || !id || !nama) {
      return { valid: false, error: parsedId.error || 'Data anggota di snapshot tidak valid (ID atau Nama kosong).' };
    }
    if (seenMember.has(id)) {
      return { valid: false, error: `Snapshot mengandung duplikat ID_Anggota: ${id}` };
    }
    seenMember.add(id);
  }

  const seenKat = new Set<string>();
  for (const k of kategori) {
    if (!k || typeof k !== 'object' || Array.isArray(k) || hasForbiddenObjectKeys(k)) {
      return { valid: false, error: 'Data kategori di snapshot tidak valid.' };
    }
    const parsedId = parseDocId(k.ID_Kategori ?? k.idKategori);
    const id = parsedId.id;
    const namaKat = cleanText(k.Nama_Kategori ?? k.namaKategori, 60);
    const tipe = k.Tipe ?? k.tipe;
    if (parsedId.error || !id || !namaKat || typeof tipe !== 'string' || !ARUS.includes(tipe)) {
      return { valid: false, error: parsedId.error || 'Data kategori di snapshot tidak valid.' };
    }
    if (seenKat.has(id)) {
      return { valid: false, error: `Snapshot mengandung duplikat ID_Kategori: ${id}` };
    }
    seenKat.add(id);
  }

  const seenTrx = new Set<string>();
  const normalizedParsedTrx: Array<{ raw: Record<string, any>; id: string; nominal: number; opId?: string }> = [];
  for (const t of transaksi) {
    if (!t || typeof t !== 'object' || Array.isArray(t) || hasForbiddenObjectKeys(t)) {
      return { valid: false, error: 'Transaksi di snapshot tidak valid.' };
    }
    const parsed = parseTransactionInput(t);
    if ('error' in parsed) return { valid: false, error: `Transaksi di snapshot tidak valid: ${parsed.error}` };
    const parsedId = parseDocId(t.ID_Transaksi ?? t.idTransaksi);
    if (parsedId.error || !parsedId.id) {
      return { valid: false, error: `Snapshot mengandung ID_Transaksi tidak valid: ${String(t.ID_Transaksi ?? t.idTransaksi ?? '')}` };
    }
    const id = parsedId.id;
    if (seenTrx.has(id)) {
      return { valid: false, error: `Snapshot mengandung duplikat ID_Transaksi: ${id}` };
    }
    let validatedOpId: string | undefined;
    if (t.operationId !== undefined && t.operationId !== null && t.operationId !== '') {
      const parsedOp = parseOperationId(t.operationId);
      if (parsedOp.error || !parsedOp.id) {
        return { valid: false, error: `Snapshot mengandung operationId transaksi tidak valid pada ${id}.` };
      }
      validatedOpId = parsedOp.id;
    }
    seenTrx.add(id);
    normalizedParsedTrx.push({ raw: t, id, nominal: parsed.nominal, opId: validatedOpId });
  }

  const seenProof = new Set<string>();
  const validAttachments: SnapshotData['attachments'] = [];
  for (const att of rawAttachments) {
    if (!att || typeof att !== 'object' || Array.isArray(att) || hasForbiddenObjectKeys(att)) {
      return { valid: false, error: 'Data lampiran di snapshot tidak valid.' };
    }
    const parsedAttId = parseDocId(att.idTransaksi);
    if (parsedAttId.error || !parsedAttId.id) {
      return { valid: false, error: `ID transaksi lampiran tidak valid: ${String(att.idTransaksi ?? '')}` };
    }
    const idTrx = parsedAttId.id;
    if (!seenTrx.has(idTrx)) {
      return { valid: false, error: `Lampiran bukti mengacu pada transaksi yang tidak ada dalam snapshot: ${idTrx}` };
    }
    if (seenProof.has(idTrx)) {
      return { valid: false, error: `Snapshot mengandung duplikat bukti untuk transaksi: ${idTrx}` };
    }
    seenProof.add(idTrx);

    const check = validateAttachmentInput({ idTransaksi: idTrx, file: att });
    if (!check.valid) {
      return { valid: false, error: `Lampiran untuk transaksi ${idTrx} tidak valid: ${check.error}` };
    }

    validAttachments.push({
      idTransaksi: idTrx,
      name: check.name,
      type: check.detectedType,
      size: check.size,
      base64: check.base64,
      uploadedAt: cleanText(att.uploadedAt, 30) || nowIso()
    });
  }

  const seenOp = new Set<string>();
  const validOperations: SnapshotData['operations'] = [];
  for (const op of rawOperations) {
    if (!op || typeof op !== 'object' || Array.isArray(op) || hasForbiddenObjectKeys(op)) {
      return { valid: false, error: 'Data operasi di snapshot tidak valid.' };
    }
    const parsedOp = parseOperationId(op.operationId);
    if (parsedOp.error || !parsedOp.id) {
      return { valid: false, error: `ID operasi tidak valid: ${String(op.operationId ?? '')}` };
    }
    const opId = parsedOp.id;
    if (seenOp.has(opId)) {
      return { valid: false, error: `Snapshot mengandung duplikat operationId: ${opId}` };
    }
    seenOp.add(opId);

    if (typeof op.fingerprint !== 'string' || !/^[a-f0-9]{64}$/i.test(op.fingerprint.trim())) {
      return { valid: false, error: `Fingerprint operasi tidak valid: ${opId}` };
    }
    const fingerprint = op.fingerprint.trim();

    let safeResponseData: object | null = null;
    if (op.responseData !== undefined && op.responseData !== null) {
      if (typeof op.responseData !== 'object' || Array.isArray(op.responseData)) {
        return { valid: false, error: `Data respons operasi tidak valid: ${opId}` };
      }
      const safetyErr = assertSafeJsonValue(op.responseData, 6, 256 * 1024);
      if (safetyErr) {
        return { valid: false, error: `Data respons operasi tidak aman (${opId}): ${safetyErr}` };
      }
      safeResponseData = op.responseData;
    }

    validOperations.push({
      operationId: opId,
      fingerprint,
      action: cleanText(op.action, 50),
      status: cleanText(op.status, 20) || 'COMMITTED',
      createdAt: cleanText(op.createdAt, 30) || nowIso(),
      responseStatus: op.responseStatus !== false,
      responseMessage: cleanText(op.responseMessage, 200),
      responseData: safeResponseData
    });
  }

  // Normalize Bukti metadata on transactions strictly from included attachments.
  const proofMap = new Map(validAttachments.map((a) => [a.idTransaksi, a]));
  const normalizedTransaksi = normalizedParsedTrx.map(({ raw: t, id: idTrx, nominal, opId }) => {
    const att = proofMap.get(idTrx);
    const copy: Record<string, unknown> = { ...t, Nominal: nominal };
    if (opId) copy.operationId = opId;
    else delete copy.operationId;
    if (att) {
      copy.Bukti = {
        name: att.name,
        type: att.type,
        size: att.size,
        uploadedAt: att.uploadedAt
      };
    } else {
      delete copy.Bukti;
    }
    return copy;
  });

  return {
    valid: true,
    data: {
      anggota,
      kategori,
      transaksi: normalizedTransaksi,
      skippedMonths,
      kasStart: rawKasStart,
      ...(paymentAccount ? { paymentAccount } : {}),
      attachments: validAttachments,
      operations: validOperations
    }
  };
}

/* ── Export Snapshot ─────────────────────────────────────────────── */

/** Export an atomic point-in-time snapshot of a group's full ledger and proofs. */
export async function exportSnapshot(gid: string, payloadOrHeaders: Record<string, any>, maybeHeaders?: FirestoreHeaders): Promise<{status: boolean, message: string, data?: object|null, payloadTooLarge?: boolean}> {
  const headers: FirestoreHeaders = maybeHeaders ?? payloadOrHeaders;
  const payload = maybeHeaders ? payloadOrHeaders : {};
  const includeAttachments = payload?.includeAttachments !== false && !payload?.metadataOnly;
  const transaction = await beginReadOnlyTx(headers);
  const consistency = transaction ? 'firestore-read-only-transaction' : 'best-effort-read';

  try {
    const [
      memberDocs,
      categoryDocs,
      transactionDocs,
      proofDocs,
      operationDocs,
      settings,
      groupDocInfo
    ] = await Promise.all([
      listAllInTx(col(gid, MEMBERS_COLLECTION), headers, transaction),
      listAllInTx(col(gid, CATEGORIES_COLLECTION), headers, transaction),
      listAllInTx(col(gid, TRANSACTIONS_COLLECTION), headers, transaction),
      includeAttachments ? listAllInTx(col(gid, PROOFS_COLLECTION), headers, transaction) : Promise.resolve([]),
      listAllInTx(col(gid, OPERATIONS_COLLECTION), headers, transaction),
      getDocInTx(settingsDoc(gid), headers, transaction),
      getDocInTx(groupDoc(gid), headers, transaction)
    ]);

    const anggota = (memberDocs.map((d) => d.fields).sort((a, b) => (a.ID_Anggota || '').localeCompare(b.ID_Anggota || '')) as Anggota[]);
    const kategori = (categoryDocs.map((d) => d.fields).sort((a, b) => (a.ID_Kategori || '').localeCompare(b.ID_Kategori || '')) as Kategori[]);
    const belongsToGroup = (doc: {name: string, fields: Record<string, any>}) => !doc.fields?.groupId || doc.fields.groupId === gid;
    const attachments = includeAttachments
      ? proofDocs.filter(belongsToGroup).map((d) => {
          const f = d.fields || {};
          return {
            idTransaksi: f.idTransaksi || d.name.split('/').pop(),
            name: f.name || 'bukti',
            type: f.type || 'application/octet-stream',
            size: Number(f.size) || 0,
            base64: f.base64 || '',
            uploadedAt: f.uploadedAt || ''
          };
        }).sort((a, b) => (a.idTransaksi || '').localeCompare(b.idTransaksi || ''))
      : [];

    const operations = operationDocs.filter(belongsToGroup).map((d) => {
      const f = d.fields || {};
      return {
        operationId: f.operationId || d.name.split('/').pop(),
        fingerprint: f.fingerprint || '',
        action: f.action || '',
        status: f.status || 'COMMITTED',
        createdAt: f.createdAt || '',
        responseStatus: f.responseStatus !== false,
        responseMessage: f.responseMessage || '',
        responseData: f.responseData || null
      };
    }).sort((a, b) => (a.operationId || '').localeCompare(b.operationId || ''));

    const proofMap = new Map(attachments.map((a) => [a.idTransaksi, a]));
    const transaksi = (transactionDocs.map((d) => {
      const f: Record<string, any> = { ...d.fields };
      const idTrx = f.ID_Transaksi || d.name.split('/').pop();
      const att = proofMap.get(idTrx);
      if (att) {
        f.Bukti = {
          name: att.name,
          type: att.type,
          size: att.size,
          uploadedAt: att.uploadedAt
        };
      } else {
        delete f.Bukti;
      }
      return f;
    }).sort((a, b) => new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime()) as Transaksi[]);

    const s = settings;
    const skippedMonths = Array.isArray(s?.skippedMonths) ? s.skippedMonths : [];
    const kasStart = s?.kasStart || '';
    const gname = groupDocInfo?.nama || gid;

    const snapshot: SnapshotEnvelope = {
      app: 'Finkas',
      version: 2,
      exportedAt: nowIso(),
      consistency,
      group: { id: gid, nama: gname },
      stats: {
        totalAnggota: anggota.length,
        totalKategori: kategori.length,
        totalTransaksi: transaksi.length,
        totalAttachments: attachments.length,
        totalOperations: operations.length,
        skippedMonthsCount: skippedMonths.length
      },
      data: {
        anggota,
        kategori,
        transaksi,
        skippedMonths,
        kasStart,
        ...(s?.paymentAccount ? { paymentAccount: s.paymentAccount } : {}),
        attachments,
        operations
      }
    };

    const envelopeBytes = Buffer.byteLength(JSON.stringify({ status: true, data: { snapshot } }), 'utf8');
    if (envelopeBytes > MAX_EXPORT_ATTACHMENTS_BYTES) {
      return {
        status: false,
        payloadTooLarge: true,
        message: 'Ukuran snapshot melebihi batas respon 4 MiB karena lampiran bukti. Ekspor dengan includeAttachments: false lalu ekspor lampiran secara bertahap.',
        data: { stats: snapshot.stats, maxBytes: MAX_EXPORT_ATTACHMENTS_BYTES }
      };
    }

    return ok('Snapshot database berhasil diekspor.', { snapshot });
  } finally {
    if (transaction) {
      await rollbackTx(headers, transaction);
    }
  }
}

/* ── Restore Snapshot ────────────────────────────────────────────── */

/** Restore a full database snapshot into a group. */
export async function restoreSnapshot(gid: string, payload: Record<string, any> & { data?: Record<string, any>, sourceGroupId?: string, confirmCrossGroup?: boolean, allowCrossGroup?: boolean }, headers: FirestoreHeaders) {
  const rawData = payload?.data || payload;
  const explicitSourceGid = cleanText(payload?.sourceGroupId || payload?.group?.id || rawData?.group?.id || rawData?.groupId, 40);
  const embeddedGids = [rawData?.anggota, rawData?.kategori, rawData?.transaksi]
    .flatMap((records) => Array.isArray(records) ? records.map((r) => cleanText(r?.groupId, 40)) : []);
  const sourceGid = explicitSourceGid && explicitSourceGid !== gid
    ? explicitSourceGid
    : embeddedGids.find((id) => id && id !== gid) || explicitSourceGid || embeddedGids.find(Boolean);
  if (sourceGid && sourceGid !== gid && !payload?.confirmCrossGroup && !payload?.allowCrossGroup) {
    return fail(`Snapshot berasal dari grup "${sourceGid}", bukan grup tujuan "${gid}". Konfirmasi pemulihan lintas grup diperlukan.`);
  }

  const validated = validateSnapshot(rawData);
  if (!validated.valid) {
    return fail(validated.error);
  }

  const { anggota, kategori, transaksi, skippedMonths, kasStart, paymentAccount, attachments, operations } = validated.data;
  const timestamp = nowIso();
  const idOf = (doc: {name?: string}) => String(doc.name || '').split('/').pop() || '';

  // Pre-read all existing collections before mutating anything so a read/limit failure aborts cleanly.
  const [existingAnggota, existingKategori, existingProofs, existingOperations, existingTransaksi] = await Promise.all([
    fsListAll(col(gid, MEMBERS_COLLECTION), headers),
    fsListAll(col(gid, CATEGORIES_COLLECTION), headers),
    fsListAll(col(gid, PROOFS_COLLECTION), headers),
    fsListAll(col(gid, OPERATIONS_COLLECTION), headers),
    fsListAll(col(gid, TRANSACTIONS_COLLECTION), headers)
  ]);

  const anggotaIds = new Set<string>();
  const anggotaWrites: FirestoreWrite[] = anggota.map((a) => {
    const id = cleanText(a.ID_Anggota ?? a.idAnggota, 40);
    const status = a.Status_Aktif ?? a.statusAktif;
    anggotaIds.add(id);
    return {
      update: {
        name: memberName(gid, MEMBERS_COLLECTION, id),
        fields: encodeFields({
          ID_Anggota: id,
          Nama_Anggota: cleanText(a.Nama_Anggota ?? a.namaAnggota, 80),
          Nomor_WA: cleanDigits(a.Nomor_WA ?? a.nomorWa, 20),
          Status_Aktif: typeof status === 'string' && STATUSES.includes(status) ? status : 'Aktif',
          Tanggal_Gabung: cleanText(a.Tanggal_Gabung ?? a.tanggalGabung, 30),
          groupId: gid
        })
      }
    };
  });

  const kategoriIds = new Set<string>();
  const kategoriWrites: FirestoreWrite[] = kategori.map((k) => {
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
  });

  const attachmentIds = new Set<string>();
  const attachmentWrites: FirestoreWrite[] = attachments.map((att) => {
    attachmentIds.add(att.idTransaksi);
    return {
      update: {
        name: memberName(gid, PROOFS_COLLECTION, att.idTransaksi),
        fields: encodeFields({
          groupId: gid,
          idTransaksi: att.idTransaksi,
          name: att.name,
          type: att.type,
          size: att.size,
          base64: att.base64,
          uploadedAt: att.uploadedAt
        })
      }
    };
  });

  const operationIds = new Set<string>();
  const operationWrites: FirestoreWrite[] = operations.map((op) => {
    operationIds.add(op.operationId);
    return {
      update: {
        name: memberName(gid, OPERATIONS_COLLECTION, op.operationId),
        fields: encodeFields({
          groupId: gid,
          operationId: op.operationId,
          fingerprint: op.fingerprint,
          action: op.action,
          status: op.status,
          createdAt: op.createdAt,
          responseStatus: op.responseStatus,
          responseMessage: op.responseMessage,
          responseData: op.responseData
        })
      }
    };
  });

  const transaksiIds = new Set<string>();
  const transaksiWrites: FirestoreWrite[] = transaksi.map((t) => {
    const idTrx = cleanText(t.ID_Transaksi ?? t.idTransaksi, 40);
    transaksiIds.add(idTrx);
    const fields: Record<string, any> = {
      ID_Transaksi: idTrx,
      Timestamp: cleanText(t.Timestamp ?? t.timestamp, 30) || timestamp,
      Tipe_Arus: t.Tipe_Arus ?? t.tipeArus,
      ID_Kategori: cleanText(t.ID_Kategori ?? t.idKategori, 40),
      ID_Anggota: cleanText(t.ID_Anggota ?? t.idAnggota, 40) || '-',
      Bulan_Iuran: cleanText(t.Bulan_Iuran ?? t.bulanIuran, 20) || '-',
      Tahun_Iuran: cleanText(t.Tahun_Iuran ?? t.tahunIuran, 4) || '-',
      Nominal: Number(t.Nominal ?? t.nominal),
      Keterangan: cleanText(t.Keterangan ?? t.keterangan, 200),
      groupId: gid
    };
    if (t.operationId) fields.operationId = String(t.operationId);
    if (t.Bukti) fields.Bukti = t.Bukti;

    return {
      update: {
        name: memberName(gid, TRANSACTIONS_COLLECTION, idTrx),
        fields: encodeFields(fields)
      }
    };
  });

  // Upsert all collections before pruning any stale documents.
  await commitWritesInBatches(anggotaWrites, headers);
  await commitWritesInBatches(kategoriWrites, headers);
  await commitWritesInBatches(attachmentWrites, headers);
  await commitWritesInBatches(operationWrites, headers);
  await commitWritesInBatches(transaksiWrites, headers);

  const staleDeletes: FirestoreWrite[] = [
    ...existingAnggota.filter((doc) => !anggotaIds.has(idOf(doc))),
    ...existingKategori.filter((doc) => !kategoriIds.has(idOf(doc))),
    ...existingProofs.filter((doc) => !attachmentIds.has(idOf(doc))),
    ...existingOperations.filter((doc) => !operationIds.has(idOf(doc))),
    ...existingTransaksi.filter((doc) => !transaksiIds.has(idOf(doc)))
  ].map((doc) => ({ delete: doc.name }));

  await commitWritesInBatches(staleDeletes, headers);

  // Restoring a cash ledger across groups must retain the target group's transfer account.
  const settings: Record<string, any> = { skippedMonths, kasStart: kasStart || '' };
  if (paymentAccount && sourceGid === gid) settings.paymentAccount = paymentAccount;
  await fsPatch(settingsDoc(gid), settings, headers, Object.keys(settings));

  await writeAuditLog(
    gid,
    'RESTORE_DATABASE',
    `Snapshot dipulihkan: ${anggota.length} anggota, ${transaksi.length} transaksi, ${attachments.length} bukti, ${operations.length} operasi`,
    headers
  );

  return ok('Database berhasil dipulihkan dari snapshot.', {
    anggota: anggota.length,
    kategori: kategori.length,
    transaksi: transaksi.length,
    attachments: attachments.length,
    operations: operations.length
  });
}
