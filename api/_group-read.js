/**
 * Read operations for a single group's data.
 */
import { fsGet, fsListAll } from './_sa.js';
import { MEMBERS_COLLECTION, CATEGORIES_COLLECTION, TRANSACTIONS_COLLECTION, col, settingsDoc } from './_store.js';

const byTimestampDesc = (a, b) =>
  new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime();

const fieldsOf = (docs) => docs.map((doc) => doc.fields || {});

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
    settings: {
      skippedMonths: settings?.skippedMonths || [],
      kasStart: settings?.kasStart || ''
    }
  };
}

/**
 * Load the audit trail for one group, newest first.
 * @returns {Promise<Array>}
 */
export async function readAuditLog(gid, headers) {
  // Bounded read: the audit view only shows the newest ~100 entries, so a
  // partial list past the 3-page cap is expected, not an error.
  const docs = await fsListAll(col(gid, 'audit_log'), headers, 3, true);
  return docs
    .map((doc) => doc.fields || {})
    .sort((a, b) => new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime())
    .slice(0, 100);
}
