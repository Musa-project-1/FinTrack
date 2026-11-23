/**
 * Idempotency and receipt handling for group write operations.
 *
 * Provides receipt tracking in Firestore (groups/{gid}/operations/{operationId})
 * committed in the same atomic `fsCommit` batch as the transaction ledger rows.
 */
import type { FirestoreHeaders } from '../src/types/finkas.d.ts';
import crypto from 'node:crypto';
import { col, nowIso } from './_store.ts';
import { docName, fsGet, encodeFields } from './_sa.ts';

export const OPERATIONS_COLLECTION = 'operations';

export const operationDoc = (gid: string, opId: string) => `${col(gid, OPERATIONS_COLLECTION)}/${opId}`;

export const isValidOperationId = (opId: unknown) =>
  typeof opId === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(opId);

export function parseOperationId(raw: unknown) {
  if (raw === undefined || raw === null || raw === '') return { id: null };
  if (typeof raw !== 'string') return { error: 'ID operasi harus berupa teks.' };
  if (raw.length > 128) return { error: 'ID operasi melebihi batas 128 karakter.' };
  const cleaned = raw.trim();
  if (!isValidOperationId(cleaned)) return { error: 'Format ID operasi tidak valid.' };
  return { id: cleaned };
}

/** Compute a deterministic SHA-256 fingerprint from the action and normalized data.
 * Sorts object keys recursively to guarantee order-invariance. */
export function computeRequestFingerprint(action: string, normalizedData: object): string {
  const canonicalJson = JSON.stringify({ action, data: normalizedData }, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: Record<string, unknown>, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
    }
    return value;
  });
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

/** Generate a deterministic transaction document ID derived from group and operation ID. */
export function transactionIdForOperation(gid: string, operationId: string, index: number|null = null): string {
  const seed = index === null || index === undefined
    ? `${gid}:${operationId}`
    : `${gid}:${operationId}:${index}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16).toUpperCase();
  return `TRX-${hash}`;
}

/** Retrieve an existing operation receipt from Firestore. */
export async function getOperationReceipt(gid: string, operationId: string, headers: FirestoreHeaders) {
  if (!isValidOperationId(operationId)) return null;
  try {
    const receipt = await fsGet(operationDoc(gid, operationId), headers);
    if (receipt?.groupId && receipt.groupId !== gid) {
      console.error('[finkas] getOperationReceipt groupId mismatch:', gid, operationId, receipt.groupId);
      return null;
    }
    return receipt;
  } catch (err) {
    console.error('[finkas] getOperationReceipt failed:', gid, operationId, err?.message);
    throw err;
  }
}

/** Build a Firestore atomic commit write for the operation receipt with exists:false precondition. */
export function buildReceiptWrite(gid: string, operationId: string, fingerprint: string, action: string, response: {status: boolean, message: string, data?: object|null}) {
  const receiptDoc = {
    groupId: gid,
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

/** Convert a decoded Firestore receipt doc into a standard API response. */
export function receiptToResponse(receipt: {responseStatus?: boolean, responseMessage?: string, responseData?: object|null}): {status: boolean, message: string, data: object|null} {
  return {
    status: receipt.responseStatus !== false,
    message: receipt.responseMessage || 'Transaksi disimpan.',
    data: receipt.responseData || null
  };
}
