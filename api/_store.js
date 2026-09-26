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
import { fsCommit, fsDelete, fsGet, fsListAll, fsPatch, docName } from './_sa.js';

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

export const DOC_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
export const isValidDocId = (id) => DOC_ID_RE.test(String(id || '').trim());

export const groupDoc = (gid) => `groups/${gid}`;
export const col = (gid, name) => `groups/${gid}/${name}`;
export const settingsDoc = (gid) => `groups/${gid}/settings/app_config`;
export const privateDoc = (gid) => `groups/${gid}/private/config`;

/**
 * Read the superadmin email list from the server-only config document.
 * The primary owner, when configured, is always included.
 *
 * A read failure is rethrown. An empty list would let every authorization
 * check either revoke everyone or, if the caller ignored it, trust everyone.
 * @param {object} headers
 * @returns {Promise<string[]>}
 */
export async function readSuperadminEmails(headers) {
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

/**
 * Generate an opaque identifier.
 * @param {string} prefix e.g. `TRX`
 * @param {number} [bytes] Requested entropy, raised to the floor above. Never
 *   pass less than the floor for an id that can be written more than once,
 *   such as a transaction.
 */
export const newId = (prefix, bytes = ID_BYTES) =>
  `${prefix}-${crypto.randomBytes(Math.max(bytes, ID_BYTES)).toString('hex').toUpperCase()}`;

/**
 * Deterministic identifier for one member's dues in one period.
 *
 * Two concurrent submissions for the same member and month therefore target the
 * same document, so an atomic create-if-absent write rejects the second instead
 * of appending a duplicate row to the ledger. The components are hashed so the
 * id stays a fixed width whatever the member id or month name contains.
 *
 * @param {string} gid
 * @param {{idAnggota: string, bulanIuran: string, tahunIuran: string}} input
 * @returns {string}
 */
export const iuranId = (gid, input) => {
  const key = [gid, input.idAnggota, input.bulanIuran, input.tahunIuran].join('|');
  const digest = crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
  return `TRX-${digest.toUpperCase()}`;
};

/** Current timestamp in the format the client already stores. */
export const nowIso = () => new Date().toISOString();

/**
 * Append an audit entry. Best effort — a failure here must never fail the
 * caller's operation, but it is always logged.
 */
export async function writeAuditLog(gid, aksi, detail, headers) {
  try {
    const id = newId('LOG');
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
 * Stamp the group root document with the current timestamp whenever a
 * mutation succeeds. Clients poll this field via the lightweight
 * `checkUpdate` action to detect remote changes without a full data pull.
 * Best-effort — never fails the caller's write.
 */
export async function touchGroupUpdated(gid, headers) {
  const ts = nowIso();
  try {
    await fsPatch(groupDoc(gid), { updatedAt: ts }, headers, ['updatedAt']);
    return ts;
  } catch (err) {
    console.error('[finkas] touchGroupUpdated failed:', gid, err?.message);
    return null;
  }
}

/**
 * Public directory of groups — identifiers and names only, never credentials.
 * @returns {Promise<Array<{id: string, nama: string}>>}
 */
export async function listGroups(headers) {
  const docs = await fsListAll('groups', headers);
  return docs
    .filter((doc) => Boolean(doc.fields?.nama))
    .map((doc) => {
      const fields = doc.fields || {};
      return {
        id: doc.name.split('/').pop(),
        nama: fields.nama || 'Grup'
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

/** Full resource name for a document inside a group collection. */
export const memberName = (gid, collection, id) => docName(col(gid, collection), id);
