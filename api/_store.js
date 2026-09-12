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
import crypto from 'node:crypto';
import { fsCommit, fsDelete, fsGet, fsListAll, fsPatch, docName, decodeFields } from './_sa.js';

export const MEMBERS_COLLECTION = 'anggota';
export const CATEGORIES_COLLECTION = 'kategori';
export const TRANSACTIONS_COLLECTION = 'transaksi';
export const AUDIT_COLLECTION = 'audit_log';
export const GROUP_SUBCOLLECTIONS = [
  MEMBERS_COLLECTION,
  CATEGORIES_COLLECTION,
  TRANSACTIONS_COLLECTION,
  AUDIT_COLLECTION,
  'private',
  'settings'
];

/** Server-only document holding the master password hash and the superadmin list. */
export const APP_CONFIG_DOC = 'settings/app_config';

export const GROUP_ID_RE = /^[A-Za-z0-9-]{3,40}$/;
export const isValidGroupId = (gid) => GROUP_ID_RE.test(String(gid || '').trim());

export const groupDoc = (gid) => `groups/${gid}`;
export const col = (gid, name) => `groups/${gid}/${name}`;
export const settingsDoc = (gid) => `groups/${gid}/settings/app_config`;
export const privateDoc = (gid) => `groups/${gid}/private/config`;

/**
 * Generate an opaque identifier.
 * @param {string} prefix e.g. `TRX`
 * @param {number} bytes Entropy in bytes (4 bytes ≈ 8 hex characters).
 */
export const newId = (prefix, bytes = 4) =>
  `${prefix}-${crypto.randomBytes(bytes).toString('hex').toUpperCase()}`;

/** Current timestamp in the format the client already stores. */
export const nowIso = () => new Date().toISOString();

/**
 * Append an audit entry. Best effort — a failure here must never fail the
 * caller's operation, but it is always logged.
 */
export async function writeAuditLog(gid, aksi, detail, headers) {
  try {
    const id = newId('LOG', 5);
    await fsPatch(col(gid, AUDIT_COLLECTION) + `/${id}`, {
      ID_Log: id,
      Timestamp: nowIso(),
      Aksi: aksi,
      Detail: String(detail || '').slice(0, 500)
    }, headers);
  } catch (err) {
    console.error('[finkas] Audit log write failed:', gid, aksi, err?.message);
  }
}

/**
 * Public directory of groups — identifiers and names only, never credentials.
 * @returns {Promise<Array<{id: string, nama: string, dibuat: string}>>}
 */
export async function listGroups(headers) {
  const docs = await fsListAll('groups', headers);
  return docs.map((doc) => {
    const fields = doc.fields || {};
    return {
      id: doc.name.split('/').pop(),
      nama: fields.nama || 'Grup',
      dibuat: fields.dibuat || ''
    };
  });
}

/**
 * Read the credential document for a group.
 * @returns {Promise<object|null>}
 */
export async function getPrivateConfig(gid, headers) {
  return fsGet(privateDoc(gid), headers);
}

/**
 * Persist credential fields for a group (private subcollection only).
 */
export async function setPrivateConfig(gid, data, headers) {
  const updateMask = Object.keys(data);
  await fsPatch(privateDoc(gid), { ...data, updatedAt: nowIso() }, headers, [...updateMask, 'updatedAt']);
  return true;
}

/**
 * Remove a group and every document nested beneath it.
 * @returns {Promise<number>} Number of documents deleted.
 */
export async function deleteGroupTree(gid, headers) {
  let deleted = 0;
  for (const name of GROUP_SUBCOLLECTIONS) {
    const docs = await fsListAll(col(gid, name), headers);
    for (let i = 0; i < docs.length; i += 400) {
      const writes = docs.slice(i, i + 400).map((doc) => ({ delete: doc.name }));
      await fsCommit(writes, headers);
      deleted += writes.length;
    }
  }
  await fsDelete(groupDoc(gid), headers);
  return deleted;
}

/** Decode a raw Firestore document into a plain object. */
export const docToObject = (doc) => decodeFields(doc?.fields);

/** Full resource name for a document inside a group collection. */
export const memberName = (gid, collection, id) => docName(col(gid, collection), id);
