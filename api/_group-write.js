/**
 * Mutating operations for a single group's data.
 *
 * This module is now a thin barrel: the handlers live in focused sub-modules
 * (transactions, entities, snapshot) with their shared validation helpers in
 * `_write-shared.js`. It re-exports the full public surface so existing callers
 * (`api/data.js`) and the test suite keep importing from one place.
 */
import { addTransaction, addBulkTransactions, editTransaction, deleteDocument } from './_write-transactions.js';
import {
  changeSkippedMonth,
  setKasStart,
  addMember,
  updateMemberStatus,
  addCategory,
  noteClientAudit
} from './_write-entities.js';
import { validateSnapshot, restoreSnapshot } from './_write-snapshot.js';
import { TRANSACTIONS_COLLECTION, MEMBERS_COLLECTION, CATEGORIES_COLLECTION } from './_store.js';

// Re-export the shared pure helpers and every handler so both the router and
// the unit tests can import them from this module unchanged.
export {
  findDuplicateIuran,
  isIuranPayment
} from './_write-shared.js';
export { addTransaction, addBulkTransactions, editTransaction, deleteDocument } from './_write-transactions.js';
export {
  changeSkippedMonth,
  setKasStart,
  addMember,
  updateMemberStatus,
  addCategory,
  noteClientAudit
} from './_write-entities.js';
export { validateSnapshot, restoreSnapshot } from './_write-snapshot.js';

/* ── Dispatch table ──────────────────────────────────────────────── */

/** Action name → handler. Used by the data gateway's router. */
export const WRITE_HANDLERS = {
  tambahTransaksi: addTransaction,
  tambahTransaksiMassal: addBulkTransactions,
  editTransaksi: editTransaction,
  hapusTransaksi: (gid, payload, headers) =>
    deleteDocument(gid, { ...payload, targetCollection: TRANSACTIONS_COLLECTION }, headers),
  hapusAnggota: (gid, payload, headers) =>
    deleteDocument(gid, { ...payload, targetCollection: MEMBERS_COLLECTION }, headers),
  hapusKategori: (gid, payload, headers) =>
    deleteDocument(gid, { ...payload, targetCollection: CATEGORIES_COLLECTION }, headers),
  tambahAnggota: addMember,
  updateStatusAnggota: updateMemberStatus,
  tambahKategori: addCategory,
  addSkippedMonth: (gid, payload, headers) => changeSkippedMonth(gid, payload, headers, true),
  removeSkippedMonth: (gid, payload, headers) => changeSkippedMonth(gid, payload, headers, false),
  setKasStart,
  catatAktivitas: noteClientAudit,
  restoreSnapshot
};
