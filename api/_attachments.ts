/**
 * Transaction attachment management for Finkas.
 *
 * Stores original transaction proofs in a dedicated group subcollection
 * (`transaction_proofs`) using the transaction ID as the document ID.
 *
 * Transaction documents store only lightweight `Bukti` metadata (name, type,
 * size, uploadedAt) to keep ledger queries, rekap calculations, and local cache
 * fast and well within memory budgets. Full bytes never leave the proof document.
 *
 * Allowed file formats: JPEG, PNG, WebP, PDF up to 512 KiB.
 */
import type { FirestoreHeaders } from '../src/types/finkas.d.ts';
import { Buffer } from 'node:buffer';
import type { GroupWriteHandler } from './_group-write.ts';
import path from 'node:path';
import {
  docName,
  encodeFields,
  fsCommit,
  fsGet,
  fsListAll
} from './_sa.ts';
import {
  TRANSACTIONS_COLLECTION,
  col,
  nowIso,
  parseDocId,
  writeAuditLog
} from './_store.ts';

export const PROOFS_COLLECTION = 'transaction_proofs';
export const MAX_ATTACHMENT_BYTES = 512 * 1024; // 524,288 bytes (512 KiB)
export const MAX_ATTACHMENT_BASE64_CHARS = Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4; // 699,052 chars
const MAX_RAW_BASE64_CHARS = 760_000; // fast-fail cap covering data URL prefix + whitespace
export const MAX_EXPORT_ATTACHMENTS_BYTES = 4 * 1024 * 1024; // 4 MiB (safely under Vercel 4.5 MiB cap)

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const ok = <T>(message: string, data: T) => ({ status: true, message, data });
const fail = (message: string, data: object | null = null) => ({ status: false, message, data });

interface ProofInput {
  base64?: string;
  data?: string;
  size?: number;
  type?: string;
  mimeType?: string;
  name?: string;
  filename?: string;
}
interface ProofRequest extends ProofInput {
  idTransaksi?: string;
  file?: ProofInput;
  dataForm?: { idTransaksi?: string, file?: ProofInput };
}

type AttachmentValidation =
  | { valid: false, error: string }
  | {
      valid: true;
      idTransaksi: string;
      name: string;
      detectedType: string;
      size: number;
      base64: string;
      buffer: Buffer;
    };

const cleanText = (val: unknown, max = 100) => String(val || '').trim().slice(0, max);

/** Validate binary file signature (magic bytes) to prevent extension spoofing. */
export function detectFileSignature(buffer: Buffer): 'image/jpeg'|'image/png'|'image/webp'|'application/pdf'|null {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  // JPEG: starts with FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: starts with RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  // PDF: starts with %PDF-
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  ) {
    return 'application/pdf';
  }

  return null;
}

/** Reject PDFs containing active JavaScript or external action dictionary keys. */
export function hasDangerousPdfContent(buffer: Buffer): boolean {
  const text = buffer.toString('latin1');
  const normalizedNames = text.replace(/\/[A-Za-z0-9_#]+/g, (token) =>
    token.replace(/#([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
  );
  return /\/(?:JavaScript|JS|OpenAction|AA|Launch|RichMedia|SubmitForm|EmbeddedFile|GoToE|GoToR)(?:$|[\s/<>\[\]()%])/i.test(normalizedNames);
}

/** Sanitize a filename to avoid path traversal and invalid characters. */
export function sanitizeFileName(rawName: string|undefined, idTransaksi: string, detectedType: string): string {
  const base = path.basename(String(rawName || '').replace(/[\\/\0]/g, '_'))
    .trim()
    .replace(/\.{2,}/g, '.')
    .replace(/^[._]+/, '');
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf'
  };
  const expectedExt = extMap[detectedType] || '';
  if (!base || base === '.' || base === '..') {
    return `bukti_${idTransaksi}${expectedExt}`;
  }
  // If base has no extension or doesn't end in expected extension, append it
  const sanitized = base
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._]+/, '')
    .slice(0, 80);
  if (!sanitized) {
    return `bukti_${idTransaksi}${expectedExt}`;
  }
  if (expectedExt && !sanitized.toLowerCase().endsWith(expectedExt)) {
    return `${sanitized}${expectedExt}`;
  }
  return sanitized;
}

/** Validate attachment input payload, canonical base64, size and signature. */
export function validateAttachmentInput(payload: ProofRequest): AttachmentValidation {
  const parsedId = parseDocId(payload?.idTransaksi ?? payload?.dataForm?.idTransaksi);
  if (parsedId.error || !parsedId.id) {
    return { valid: false, error: parsedId.error || 'ID transaksi tidak valid.' };
  }
  const idTransaksi = parsedId.id;

  const file = payload?.file || payload?.dataForm?.file || payload;
  const rawField = file?.base64 ?? file?.data;
  if (typeof rawField !== 'string') {
    return { valid: false, error: 'Berkas bukti kosong.' };
  }
  const rawBase64 = rawField.trim();
  if (!rawBase64) {
    return { valid: false, error: 'Berkas bukti kosong.' };
  }
  if (rawBase64.length > MAX_RAW_BASE64_CHARS) {
    return { valid: false, error: 'Ukuran berkas melebihi batas maksimal 512 KiB.' };
  }

  // Strip and validate data URL prefix if present: "data:image/jpeg;base64,..."
  let cleanBase64 = rawBase64;
  let dataUrlMime = '';
  if (/^data:/i.test(cleanBase64)) {
    const commaIdx = cleanBase64.indexOf(',');
    if (commaIdx === -1) {
      return { valid: false, error: 'Format data URL base64 tidak valid.' };
    }
    const header = cleanBase64.slice(5, commaIdx).trim();
    if (!/;base64$/i.test(header)) {
      return { valid: false, error: 'Data URL lampiran harus menggunakan encoding base64.' };
    }
    const rawDataMime = header.slice(0, header.indexOf(';')).trim().toLowerCase();
    dataUrlMime = rawDataMime === 'image/jpg' ? 'image/jpeg' : rawDataMime;
    cleanBase64 = cleanBase64.slice(commaIdx + 1).trim();
  }
  cleanBase64 = cleanBase64.replace(/\s+/g, '');

  if (!cleanBase64) {
    return { valid: false, error: 'Berkas bukti kosong.' };
  }
  if (cleanBase64.length > MAX_ATTACHMENT_BASE64_CHARS) {
    return { valid: false, error: 'Ukuran berkas melebihi batas maksimal 512 KiB.' };
  }

  // Base64 format and padding validation
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64) || cleanBase64.length % 4 !== 0) {
    return { valid: false, error: 'Format base64 tidak valid.' };
  }

  let buffer;
  try {
    buffer = Buffer.from(cleanBase64, 'base64');
  } catch {
    return { valid: false, error: 'Gagal membaca data base64.' };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'Berkas bukti kosong.' };
  }

  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    return { valid: false, error: 'Ukuran berkas melebihi batas maksimal 512 KiB.' };
  }

  // Canonical base64 verification: must round-trip strictly without trailing/corrupt bits
  if (buffer.toString('base64') !== cleanBase64) {
    return { valid: false, error: 'Format base64 tidak kanonikal atau mengalami kerusakan.' };
  }

  // Optional client size confirmation
  const declaredSize = Number(file?.size);
  if (file?.size !== undefined && (!Number.isInteger(declaredSize) || declaredSize <= 0 || declaredSize !== buffer.length)) {
    return { valid: false, error: 'Ukuran berkas tidak sesuai dengan data terunggah.' };
  }

  // Signature validation
  const detectedType = detectFileSignature(buffer);
  if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType)) {
    return {
      valid: false,
      error: 'Format berkas tidak didukung. Hanya JPEG, PNG, WebP, dan PDF yang diizinkan.'
    };
  }

  if (detectedType === 'application/pdf' && hasDangerousPdfContent(buffer)) {
    return {
      valid: false,
      error: 'Berkas PDF mengandung skrip atau aksi aktif yang tidak diizinkan.'
    };
  }

  if (dataUrlMime && dataUrlMime !== detectedType) {
    return {
      valid: false,
      error: `Tipe MIME data URL (${dataUrlMime}) tidak sesuai dengan format asli berkas (${detectedType}).`
    };
  }

  // Declared MIME validation if provided
  const declaredType = cleanText(file?.type || file?.mimeType, 50).toLowerCase();
  if (declaredType) {
    const normalizedDeclared = declaredType === 'image/jpg' ? 'image/jpeg' : declaredType;
    if (normalizedDeclared !== detectedType) {
      return {
        valid: false,
        error: `Tipe MIME berkas (${declaredType}) tidak sesuai dengan format asli berkas (${detectedType}).`
      };
    }
  }

  const name = sanitizeFileName(file?.name || file?.filename, idTransaksi, detectedType);

  return {
    valid: true,
    idTransaksi,
    name,
    detectedType,
    size: buffer.length,
    base64: cleanBase64,
    buffer
  };
}

/* ── Write Handlers ──────────────────────────────────────────────── */

/** Upload or replace a transaction proof document and update Bukti metadata atomically. */
export async function uploadAttachment(gid: string, payload: ProofRequest, headers: FirestoreHeaders) {
  const check = validateAttachmentInput(payload);
  if (!check.valid) return fail(check.error);

  const { idTransaksi, name, detectedType, size, base64 } = check;

  // Verify that the target transaction exists before accepting the upload
  const txDocPath = `${col(gid, TRANSACTIONS_COLLECTION)}/${idTransaksi}`;
  const existingTx = await fsGet(txDocPath, headers);
  if (!existingTx) {
    return fail('Transaksi tidak ditemukan.');
  }

  const timestamp = nowIso();
  const proofDoc = {
    groupId: gid,
    idTransaksi,
    name,
    type: detectedType,
    size,
    base64,
    uploadedAt: timestamp
  };

  const buktiMeta = {
    name,
    type: detectedType,
    size,
    uploadedAt: timestamp
  };

  const proofDocName = docName(col(gid, PROOFS_COLLECTION), idTransaksi);
  const txDocName = docName(col(gid, TRANSACTIONS_COLLECTION), idTransaksi);

  const writes = [
    {
      update: {
        name: proofDocName,
        fields: encodeFields(proofDoc)
      }
    },
    {
      update: {
        name: txDocName,
        fields: encodeFields({ Bukti: buktiMeta })
      },
      updateMask: { fieldPaths: ['Bukti'] },
      currentDocument: { exists: true }
    }
  ];

  await fsCommit(writes, headers);
  await writeAuditLog(
    gid,
    'UPLOAD_BUKTI',
    `ID: ${idTransaksi} (${name}, ${size} B)`,
    headers
  );

  return ok('Bukti transaksi berhasil diunggah.', {
    idTransaksi,
    bukti: buktiMeta
  });
}

/** Delete a transaction proof document and clear Bukti metadata atomically. */
export async function deleteAttachment(gid: string, payload: ProofRequest, headers: FirestoreHeaders) {
  const parsedId = parseDocId(payload?.idTransaksi ?? payload?.dataForm?.idTransaksi);
  if (parsedId.error || !parsedId.id) {
    return fail(parsedId.error || 'ID transaksi tidak valid.');
  }
  const idTransaksi = parsedId.id;

  const txDocPath = `${col(gid, TRANSACTIONS_COLLECTION)}/${idTransaksi}`;
  const existingTx = await fsGet(txDocPath, headers);
  if (!existingTx) {
    return fail('Transaksi tidak ditemukan.');
  }

  const proofDocPath = `${col(gid, PROOFS_COLLECTION)}/${idTransaksi}`;
  const existingProof = await fsGet(proofDocPath, headers);
  if (!existingProof && !existingTx.Bukti) {
    return fail('Bukti transaksi tidak ditemukan.');
  }

  const proofDocName = docName(col(gid, PROOFS_COLLECTION), idTransaksi);
  const txDocName = docName(col(gid, TRANSACTIONS_COLLECTION), idTransaksi);

  const writes = [
    {
      delete: proofDocName
    },
    {
      update: {
        name: txDocName,
        fields: encodeFields({ Bukti: null })
      },
      updateMask: { fieldPaths: ['Bukti'] },
      currentDocument: { exists: true }
    }
  ];

  await fsCommit(writes, headers);
  await writeAuditLog(gid, 'HAPUS_BUKTI', `ID: ${idTransaksi}`, headers);

  return ok('Bukti transaksi berhasil dihapus.', { idTransaksi });
}

/* ── Read Handlers ───────────────────────────────────────────────── */

function formatStoredProof(idTransaksi: string, f: Record<string, any>, includeBase64: boolean = true) {
  const rawType = typeof f.type === 'string' ? f.type.trim().toLowerCase() : '';
  const safeType = ALLOWED_MIME_TYPES.has(rawType) ? rawType : 'application/octet-stream';
  const safeName = sanitizeFileName(typeof f.name === 'string' ? f.name : undefined, idTransaksi, safeType);
  return {
    idTransaksi: typeof f.idTransaksi === 'string' && f.idTransaksi ? f.idTransaksi : idTransaksi,
    name: safeName,
    type: safeType,
    size: Number(f.size) || 0,
    ...(includeBase64 ? { base64: typeof f.base64 === 'string' ? f.base64 : '' } : {}),
    uploadedAt: typeof f.uploadedAt === 'string' ? f.uploadedAt : ''
  };
}

/** Read the proof document for a single transaction. */
export async function readAttachment(gid: string, payload: ProofRequest, headers: FirestoreHeaders): Promise<{status: boolean, message: string, data?: object|null, notFound?: boolean}> {
  const parsedId = parseDocId(payload?.idTransaksi);
  if (parsedId.error || !parsedId.id) {
    return fail(parsedId.error || 'ID transaksi tidak valid.');
  }
  const idTransaksi = parsedId.id;

  const proof = await fsGet(`${col(gid, PROOFS_COLLECTION)}/${idTransaksi}`, headers);
  if (!proof || (proof.groupId && proof.groupId !== gid)) {
    return {
      status: false,
      notFound: true,
      message: 'Bukti transaksi tidak ditemukan.'
    };
  }

  return ok('Bukti transaksi berhasil dimuat.', formatStoredProof(idTransaksi, proof, true));
}

/** Export attachments for a group (Admin only), bounded under Vercel's payload limit.
 * Supports optional pagination (`offset`, `limit`) and `metadataOnly`. */
export async function exportAttachments(
  gid: string,
  headers: FirestoreHeaders,
  options: { offset?: unknown; limit?: unknown; metadataOnly?: unknown } = {}
): Promise<{status: boolean, message: string, data?: object|null, payloadTooLarge?: boolean}> {
  const docs = await fsListAll(col(gid, PROOFS_COLLECTION), headers);
  const scoped = docs
    .filter((doc) => !doc.fields?.groupId || doc.fields.groupId === gid)
    .map((doc) => {
      const f = doc.fields || {};
      const docId = doc.name.split('/').pop() || '';
      return formatStoredProof(docId, f, !Boolean(options?.metadataOnly));
    })
    .sort((a, b) => a.idTransaksi.localeCompare(b.idTransaksi));

  const hasPaging = options?.offset !== undefined || options?.limit !== undefined;
  const metadataOnly = Boolean(options?.metadataOnly);

  if (!hasPaging) {
    let totalBytes = 128;
    for (const item of scoped) {
      totalBytes += Buffer.byteLength(JSON.stringify(item), 'utf8') + 1;
      if (!metadataOnly && totalBytes > MAX_EXPORT_ATTACHMENTS_BYTES) {
        return {
          status: false,
          payloadTooLarge: true,
          message: 'Ukuran total berkas bukti melebihi batas respon 4 MiB. Gunakan paginasi (offset/limit) atau mode metadataOnly.',
          data: { total: scoped.length, maxBytes: MAX_EXPORT_ATTACHMENTS_BYTES }
        };
      }
    }
    return ok('Berkas bukti berhasil diekspor.', { attachments: scoped });
  }

  const offset = Math.max(0, Math.floor(Number(options?.offset) || 0));
  const rawLimit = options?.limit === undefined ? 50 : Math.floor(Number(options.limit) || 0);
  const limit = Math.min(Math.max(1, rawLimit), 200);

  const page: typeof scoped = [];
  let pageBytes = 128;
  let idx = offset;
  for (; idx < scoped.length && page.length < limit; idx += 1) {
    const item = scoped[idx];
    const itemBytes = Buffer.byteLength(JSON.stringify(item), 'utf8') + 1;
    if (page.length > 0 && pageBytes + itemBytes > MAX_EXPORT_ATTACHMENTS_BYTES) break;
    page.push(item);
    pageBytes += itemBytes;
  }

  return ok('Berkas bukti berhasil diekspor.', {
    attachments: page,
    total: scoped.length,
    offset,
    hasMore: idx < scoped.length,
    nextOffset: idx < scoped.length ? idx : null
  });
}

export const ATTACHMENT_WRITE_HANDLERS: Record<string, GroupWriteHandler> = {
  uploadAttachment,
  deleteAttachment
};
