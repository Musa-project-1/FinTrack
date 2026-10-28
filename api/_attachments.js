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
import { Buffer } from 'node:buffer';
import path from 'node:path';
import {
  docName,
  encodeFields,
  fsCommit,
  fsGet,
  fsListAll
} from './_sa.js';
import {
  TRANSACTIONS_COLLECTION,
  col,
  isValidDocId,
  nowIso,
  writeAuditLog
} from './_store.js';

export const PROOFS_COLLECTION = 'transaction_proofs';
export const MAX_ATTACHMENT_BYTES = 512 * 1024; // 524,288 bytes (512 KiB)

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const ok = (message, data = null) => ({ status: true, message, data });
const fail = (message, data = null) => ({ status: false, message, data });

const cleanText = (val, max = 100) => String(val || '').trim().slice(0, max);

/**
 * Validate binary file signature (magic bytes) to prevent extension spoofing.
 *
 * @param {Buffer} buffer
 * @returns {'image/jpeg'|'image/png'|'image/webp'|'application/pdf'|null}
 */
export function detectFileSignature(buffer) {
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

/**
 * Sanitize a filename to avoid path traversal and invalid characters.
 *
 * @param {string} rawName
 * @param {string} idTransaksi
 * @param {string} detectedType
 * @returns {string}
 */
export function sanitizeFileName(rawName, idTransaksi, detectedType) {
  const base = path.basename(String(rawName || '').replace(/[\\/\0]/g, '_')).trim();
  const extMap = {
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
  const sanitized = base.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
  if (!sanitized.toLowerCase().endsWith(expectedExt)) {
    return `${sanitized}${expectedExt}`;
  }
  return sanitized;
}

/**
 * Validate attachment input payload, canonical base64, size and signature.
 *
 * @param {object} payload
 * @returns {{valid: boolean, error?: string, idTransaksi?: string, name?: string, detectedType?: string, size?: number, base64?: string, buffer?: Buffer}}
 */
export function validateAttachmentInput(payload) {
  const idTransaksi = cleanText(payload?.idTransaksi || payload?.dataForm?.idTransaksi, 40);
  if (!idTransaksi || !isValidDocId(idTransaksi)) {
    return { valid: false, error: 'ID transaksi tidak valid.' };
  }

  const file = payload?.file || payload?.dataForm?.file || payload;
  const rawBase64 = String(file?.base64 || file?.data || '').trim();
  if (!rawBase64) {
    return { valid: false, error: 'Berkas bukti kosong.' };
  }

  // Strip data URL prefix if present: "data:image/jpeg;base64,..."
  let cleanBase64 = rawBase64;
  const commaIdx = cleanBase64.indexOf(',');
  if (commaIdx !== -1 && cleanBase64.slice(0, commaIdx).includes('base64')) {
    cleanBase64 = cleanBase64.slice(commaIdx + 1).trim();
  }
  cleanBase64 = cleanBase64.replace(/\s+/g, '');

  if (!cleanBase64) {
    return { valid: false, error: 'Berkas bukti kosong.' };
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

/**
 * Upload or replace a transaction proof document and update Bukti metadata atomically.
 *
 * @param {string} gid
 * @param {object} payload
 * @param {object} headers
 * @returns {Promise<{status: boolean, message: string, data?: object}>}
 */
export async function uploadAttachment(gid, payload, headers) {
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

/**
 * Delete a transaction proof document and clear Bukti metadata atomically.
 *
 * @param {string} gid
 * @param {object} payload
 * @param {object} headers
 * @returns {Promise<{status: boolean, message: string, data?: object}>}
 */
export async function deleteAttachment(gid, payload, headers) {
  const idTransaksi = cleanText(payload?.idTransaksi || payload?.dataForm?.idTransaksi, 40);
  if (!idTransaksi || !isValidDocId(idTransaksi)) {
    return fail('ID transaksi tidak valid.');
  }

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

/**
 * Read the proof document for a single transaction.
 *
 * @param {string} gid
 * @param {object} payload
 * @param {object} headers
 * @returns {Promise<{status: boolean, message: string, data?: object, notFound?: boolean}>}
 */
export async function readAttachment(gid, payload, headers) {
  const idTransaksi = cleanText(payload?.idTransaksi, 40);
  if (!idTransaksi || !isValidDocId(idTransaksi)) {
    return fail('ID transaksi tidak valid.');
  }

  const proof = await fsGet(`${col(gid, PROOFS_COLLECTION)}/${idTransaksi}`, headers);
  if (!proof) {
    return {
      status: false,
      notFound: true,
      message: 'Bukti transaksi tidak ditemukan.'
    };
  }

  return ok('Bukti transaksi berhasil dimuat.', {
    idTransaksi: proof.idTransaksi || idTransaksi,
    name: proof.name || 'bukti',
    type: proof.type || 'application/octet-stream',
    size: Number(proof.size) || 0,
    base64: proof.base64 || '',
    uploadedAt: proof.uploadedAt || ''
  });
}

/**
 * Export all attachments for a group (Admin only).
 * Returns list {idTransaksi, name, type, size, base64}.
 *
 * @param {string} gid
 * @param {object} headers
 * @returns {Promise<{status: boolean, message: string, data: {attachments: Array}}>}
 */
export async function exportAttachments(gid, headers) {
  const docs = await fsListAll(col(gid, PROOFS_COLLECTION), headers);
  const attachments = docs.map((doc) => {
    const f = doc.fields || {};
    return {
      idTransaksi: f.idTransaksi || doc.name.split('/').pop(),
      name: f.name || 'bukti',
      type: f.type || 'application/octet-stream',
      size: Number(f.size) || 0,
      base64: f.base64 || '',
      uploadedAt: f.uploadedAt || ''
    };
  });

  return ok('Berkas bukti berhasil diekspor.', {
    attachments
  });
}

export const ATTACHMENT_WRITE_HANDLERS = {
  uploadAttachment,
  deleteAttachment
};
