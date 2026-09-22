/**
 * Read operations for a single group's data.
 */
import { fsGet, fsListAll } from './_sa.js';
import { MEMBERS_COLLECTION, CATEGORIES_COLLECTION, TRANSACTIONS_COLLECTION, col, groupDoc, settingsDoc } from './_store.js';

const byTimestampDesc = (a, b) =>
  new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime();

const fieldsOf = (docs) => docs.map((doc) => doc.fields || {});

/**
 * Read only the updatedAt field from the group root document.
 * Costs exactly 1 Firestore read.
 * @param {string} gid
 * @param {object} headers
 * @param {string} since ISO timestamp the client last synced
 * @returns {Promise<{hasUpdate: boolean, updatedAt: string|null}>}
 */
export async function readGroupVersion(gid, headers, since) {
  const doc = await fsGet(groupDoc(gid), headers);
  const updatedAt = doc?.updatedAt || null;
  const hasUpdate = updatedAt ? (since ? updatedAt > since : true) : false;
  return { hasUpdate, updatedAt };
}

/**
 * Load only the transactions collection for one group.
 * Used by write handlers for duplicate checking without reading other collections.
 * @param {string} gid
 * @param {object} headers
 * @returns {Promise<Array>}
 */
export async function readTransactions(gid, headers) {
  const docs = await fsListAll(col(gid, TRANSACTIONS_COLLECTION), headers);
  return fieldsOf(docs);
}

/**
 * Load the full dataset for one group.
 * @param {string} gid
 * @param {object} headers Authorized Firestore headers.
 * @returns {Promise<{anggota: Array, kategori: Array, transaksi: Array, settings: {skippedMonths: string[]}}>}
 */
export async function readGroupData(gid, headers) {
  const [memberDocs, categoryDocs, transactionDocs, settings] = await Promise.all([
    fsListAll(col(gid, MEMBERS_COLLECTION), headers),
    fsListAll(col(gid, CATEGORIES_COLLECTION), headers),
    fsListAll(col(gid, TRANSACTIONS_COLLECTION), headers),
    fsGet(settingsDoc(gid), headers)
  ]);

  return {
    anggota: fieldsOf(memberDocs),
    kategori: fieldsOf(categoryDocs),
    transaksi: fieldsOf(transactionDocs).sort(byTimestampDesc),
    settings: { skippedMonths: settings?.skippedMonths || [] }
  };
}

/**
 * Load the audit trail for one group, newest first.
 * @returns {Promise<Array>}
 */
export async function readAuditLog(gid, headers) {
  const docs = await fsListAll(col(gid, 'audit_log'), headers, 3);
  return docs
    .map((doc) => doc.fields || {})
    .sort((a, b) => new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime())
    .slice(0, 100);
}
