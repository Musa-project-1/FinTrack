/**
 * Idempotency and receipt handling for group write operations.
 *
 * Provides receipt tracking in Firestore (groups/{gid}/operations/{operationId})
 * committed in the same atomic `fsCommit` batch as the transaction ledger rows.
 */
import crypto from 'node:crypto';
import { col, nowIso } from './_store.js';
import { docName, fsGet, encodeFields } from './_sa.js';

export const OPERATIONS_COLLECTION = 'operations';

export const operationDoc = (gid, opId) => `${col(gid, OPERATIONS_COLLECTION)}/${opId}`;

export const isValidOperationId = (opId) =>
  typeof opId === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(opId);

export function parseOperationId(raw) {
  if (raw === undefined || raw === null || raw === '') return { id: null };
  if (typeof raw !== 'string') return { error: 'ID operasi harus berupa teks.' };
  if (raw.length > 128) return { error: 'ID operasi melebihi batas 128 karakter.' };
  const cleaned = raw.trim();
  if (!isValidOperationId(cleaned)) return { error: 'Format ID operasi tidak valid.' };
  return { id: cleaned };
}

/**
 * Compute a deterministic SHA-256 fingerprint from the action and normalized data.
 * Sorts object keys recursively to guarantee order-invariance.
 *
 * @param {string} action
 * @param {object} normalizedData
 * @returns {string} 64-char hex SHA-256 digest
 */
export function computeRequestFingerprint(action, normalizedData) {
  const canonicalJson = JSON.stringify({ action, data: normalizedData }, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
    }
    return value;
  });
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

/**
 * Generate a deterministic transaction document ID derived from group and operation ID.
 *
 * @param {string} gid
 * @param {string} operationId
 * @returns {string} E.g. 'TRX-1A2B3C4D5E6F7890'
 */
export function transactionIdForOperation(gid, operationId, index = null) {
  const seed = index === null || index === undefined
    ? `${gid}:${operationId}`
    : `${gid}:${operationId}:${index}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16).toUpperCase();
  return `TRX-${hash}`;
}

/**
 * Retrieve an existing operation receipt from Firestore.
 *
 * @param {string} gid
 * @param {string} operationId
 * @param {object} headers
 * @returns {Promise<object|null>}
 */
export async function getOperationReceipt(gid, operationId, headers) {
  if (!isValidOperationId(operationId)) return null;
  try {
    return await fsGet(operationDoc(gid, operationId), headers);
  } catch (err) {
    console.error('[finkas] getOperationReceipt failed:', gid, operationId, err?.message);
    throw err;
  }
}

/**
 * Build a Firestore atomic commit write for the operation receipt with exists:false precondition.
 *
 * @param {string} gid
 * @param {string} operationId
 * @param {string} fingerprint
 * @param {string} action
 * @param {object} response
 * @returns {object} Firestore write object for fsCommit
 */
export function buildReceiptWrite(gid, operationId, fingerprint, action, response) {
  const receiptDoc = {
    operationId,
    fingerprint,
    action,
    status: 'COMMITTED',
    createdAt: nowIso(),
    responseStatus: Boolean(response.status),
    responseMessage: response.message || '',
    responseData: response.data || null
  };
  return {
    update: {
      name: docName(col(gid, OPERATIONS_COLLECTION), operationId),
      fields: encodeFields(receiptDoc)
    },
    currentDocument: { exists: false }
  };
}

/**
 * Convert a decoded Firestore receipt doc into a standard API response.
 *
 * @param {object} receipt
 * @returns {{status: boolean, message: string, data: object|null}}
 */
export function receiptToResponse(receipt) {
  return {
    status: receipt.responseStatus !== false,
    message: receipt.responseMessage || 'Transaksi disimpan.',
    data: receipt.responseData || null
  };
}
