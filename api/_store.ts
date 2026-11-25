/**
 * Firestore layout for Finkas: collection paths, identifier generation and
 * group-level housekeeping shared by the serverless functions.
 *
 * Layout:
 *   groups/{gid}                      name + creation date (public, no secrets)
 *   groups/{gid}/private/config       pin_hash, admin_password_hash (server only)
 *   groups/{gid}/settings/app_config  skippedMonths
 *   groups/{gid}/anggota|kategori|transaksi|audit_log
 */
import type { FirestoreHeaders } from '../src/types/finkas.d.ts';
import type { FirestoreWrite } from './_sa.ts';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { fsCommit, fsDelete, fsGet, fsListAll, fsPatch, docName } from './_sa.ts';

export const MEMBERS_COLLECTION = 'anggota';
export const CATEGORIES_COLLECTION = 'kategori';
export const TRANSACTIONS_COLLECTION = 'transaksi';
export const AUDIT_COLLECTION = 'audit_log';
export const GROUP_SUBCOLLECTIONS = [
  MEMBERS_COLLECTION,
  CATEGORIES_COLLECTION,
  TRANSACTIONS_COLLECTION,
  'transaction_proofs',
  'operations',
  AUDIT_COLLECTION,
  'private',
  'settings'
];

/** Server-only document holding the master password hash and the superadmin list. */
export const APP_CONFIG_DOC = 'settings/app_config';

export const GROUP_ID_RE = /^[A-Za-z0-9-]{3,40}$/;
export const isValidGroupId = (gid: unknown): boolean =>
  typeof gid === 'string' && GROUP_ID_RE.test(gid.trim());

export const DOC_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
export const isValidDocId = (id: unknown): boolean =>
  typeof id === 'string' && DOC_ID_RE.test(id.trim());

/** Validate a document ID strictly without silently truncating oversized inputs. */
export function parseDocId(raw: unknown): { id: string | null; error?: string } {
  if (raw === undefined || raw === null || raw === '') return { id: null };
  if (typeof raw !== 'string') return { id: null, error: 'ID dokumen harus berupa teks.' };
  const cleaned = raw.trim();
  if (!cleaned) return { id: null };
  if (cleaned.length > 40) return { id: null, error: 'ID dokumen melebihi batas 40 karakter.' };
  if (!DOC_ID_RE.test(cleaned)) return { id: null, error: 'ID dokumen tidak valid.' };
  return { id: cleaned };
}

export const groupDoc = (gid: string) => `groups/${gid}`;
export const col = (gid: string, name: string) => `groups/${gid}/${name}`;
export const settingsDoc = (gid: string) => `groups/${gid}/settings/app_config`;
export const privateDoc = (gid: string) => `groups/${gid}/private/config`;

/** Read the superadmin email list from the server-only config document.
 * The primary owner, when configured, is always included.
 *
 * A read failure is rethrown. An empty list would let every authorization
 * check either revoke everyone or, if the caller ignored it, trust everyone. */
export async function readSuperadminEmails(headers: FirestoreHeaders): Promise<string[]> {
  let config;
  try {
    config = await fsGet(APP_CONFIG_DOC, headers);
  } catch (err) {
    console.error('[finkas] Failed to read superadmin list:', err?.message);
    throw err;
  }

  const owner = (process.env.FINKAS_PRIMARY_OWNER || '').toLowerCase().trim();
  const raw = config?.superadmin_emails;
  const list = (Array.isArray(raw) ? raw : [])
    .map((v) => String(v || '').toLowerCase().trim())
    .filter(Boolean);
  if (owner && !list.includes(owner)) list.unshift(owner);
  return list;
}

/**
 * Entropy floor for generated identifiers, in bytes.
 *
 * Identifiers are Firestore document ids and every write is an upsert, so a
 * collision silently replaces whichever record already holds that id. At 4
 * bytes (32 bits) that happens about once in 85 across 10,000 transactions —
 * far too often for a cash ledger. At 8 bytes (64 bits) the same risk is below
 * 1 in 10^10, for eight extra characters per id.
 */
const ID_BYTES = 8;

/** Generate an opaque identifier. */
export const newId = (prefix: string, bytes: number = ID_BYTES) =>
  `${prefix}-${crypto.randomBytes(Math.max(bytes, ID_BYTES)).toString('hex').toUpperCase()}`;

/** Deterministic identifier for one member's dues in one period.
 *
 * Two concurrent submissions for the same member and month therefore target the
 * same document, so an atomic create-if-absent write rejects the second instead
 * of appending a duplicate row to the ledger. The components are hashed so the
 * id stays a fixed width whatever the member id or month name contains. */
export const iuranId = (gid: string, input: {idAnggota: string, bulanIuran: string, tahunIuran: string}): string => {
  const key = [gid, input.idAnggota, input.bulanIuran, input.tahunIuran].join('|');
  const digest = crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
  return `TRX-${digest.toUpperCase()}`;
};

/** Current timestamp in the format the client already stores. */
export const nowIso = () => new Date().toISOString();

/** Append an audit entry. Best effort — a failure here must never fail the
 * caller's operation, but it is always logged. */
export async function writeAuditLog(gid: string, aksi: string, detail: string, headers: FirestoreHeaders) {
  if (!isValidGroupId(gid)) {
    console.error('[finkas] Audit log skipped for invalid groupId:', gid, aksi);
    return;
  }
  try {
    const id = newId('LOG');
    await fsPatch(col(gid, AUDIT_COLLECTION) + `/${id}`, {
      ID_Log: id,
      groupId: gid,
      Timestamp: nowIso(),
      Aksi: aksi,
      Detail: String(detail || '').slice(0, 500)
    }, headers);
  } catch (err) {
    console.error('[finkas] Audit log write failed:', gid, aksi, err?.message);
  }
}

/** Stamp the group root document with the current timestamp whenever a
 * mutation succeeds. Clients poll this field via the lightweight
 * `checkUpdate` action to detect remote changes without a full data pull.
 * Best-effort — never fails the caller's write. */
export async function touchGroupUpdated(gid: string, headers: FirestoreHeaders) {
  const ts = nowIso();
  try {
    await fsPatch(groupDoc(gid), { updatedAt: ts }, headers, ['updatedAt']);
    return ts;
  } catch (err) {
    console.error('[finkas] touchGroupUpdated failed:', gid, err?.message);
    return null;
  }
}

/** Public directory of groups — identifiers and names only, never credentials. */
export async function listGroups(headers: FirestoreHeaders): Promise<Array<{id: string, nama: string}>> {
  const docs = await fsListAll('groups', headers);
  return docs
    .filter((doc) => Boolean(doc.fields?.nama))
    .map((doc) => {
      const fields = doc.fields || {};
      return {
        id: doc.name.slice(doc.name.lastIndexOf('/') + 1),
        nama: fields.nama || 'Grup'
      };
    });
}

/** Read the credential document for a group. */
export async function getPrivateConfig(gid: string, headers: FirestoreHeaders): Promise<{admin_email?: string, admin_password_hash?: string, pin_hash?: string}|null> {
  return fsGet(privateDoc(gid), headers);
}

/** Persist credential fields for a group (private subcollection only). */
export async function setPrivateConfig(gid: string, data: Record<string, unknown>, headers: FirestoreHeaders) {
  const updateMask = Object.keys(data);
  await fsPatch(privateDoc(gid), { ...data, updatedAt: nowIso() }, headers, [...updateMask, 'updatedAt']);
  return true;
}

export const MAX_BATCH_COMMIT_BYTES = 4 * 1024 * 1024;
export const MAX_BATCH_COMMIT_WRITES = 400;

/** Commit Firestore writes in chunks respecting both count and serialized JSON byte limits. */
export async function commitWritesInBatches(
  writes: FirestoreWrite[],
  headers: FirestoreHeaders,
  maxBytes: number = MAX_BATCH_COMMIT_BYTES,
  maxCount: number = MAX_BATCH_COMMIT_WRITES
) {
  let batch: FirestoreWrite[] = [];
  let batchBytes = 16; // `{"writes":[]}` envelope overhead

  for (const write of writes) {
    const writeBytes = Buffer.byteLength(JSON.stringify(write), 'utf8') + 1;
    if (writeBytes > maxBytes) {
      throw new Error('Ukuran operasi tunggal melebihi batas batch Firestore.');
    }
    if (batch.length > 0 && (batch.length >= maxCount || batchBytes + writeBytes > maxBytes)) {
      await fsCommit(batch, headers);
      batch = [];
      batchBytes = 16;
    }
    batch.push(write);
    batchBytes += writeBytes;
  }

  if (batch.length > 0) {
    await fsCommit(batch, headers);
  }
}

/** Remove a group and every document nested beneath it. */
export async function deleteGroupTree(gid: string, headers: FirestoreHeaders): Promise<number> {
  let deleted = 0;
  for (const name of GROUP_SUBCOLLECTIONS) {
    const colPath = col(gid, name);
    for (let page = 0; page < 200; page += 1) {
      const docs = await fsListAll(colPath, headers, 1, true);
      if (!docs.length) break;
      const writes = docs.map((doc) => ({ delete: doc.name }));
      await commitWritesInBatches(writes, headers);
      deleted += writes.length;
    }
  }
  await fsDelete(groupDoc(gid), headers);
  return deleted;
}

/** Full resource name for a document inside a group collection. */
export const memberName = (gid: string, collection: string, id: string) => docName(col(gid, collection), id);
