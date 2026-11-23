/**
 * Mutating operations for a single group's data.
 *
 * This module is now a thin barrel: the handlers live in focused sub-modules
 * (transactions, entities, snapshot) with their shared validation helpers in
 * `_write-shared.ts`. It re-exports the full public surface so existing callers
 * (`api/data.ts`) and the test suite keep importing from one place.
 */
import type { FirestoreHeaders } from '../src/types/finkas.d.ts';
import { addTransaction, addBulkTransactions, editTransaction, deleteDocument } from './_write-transactions.ts';
import {
  changeSkippedMonth,
  setKasStart,
  setPaymentAccount,
  addMember,
  updateMemberStatus,
  addCategory,
  noteClientAudit
} from './_write-entities.ts';
import { validateSnapshot, restoreSnapshot } from './_write-snapshot.ts';
import { TRANSACTIONS_COLLECTION, MEMBERS_COLLECTION, CATEGORIES_COLLECTION } from './_store.ts';

// Re-export the shared pure helpers and every handler so both the router and
// the unit tests can import them from this module unchanged.
export {
  findDuplicateIuran,
  isIuranPayment
} from './_write-shared.ts';
export { addTransaction, addBulkTransactions, editTransaction, deleteDocument } from './_write-transactions.ts';
export {
  changeSkippedMonth,
  setKasStart,
  setPaymentAccount,
  addMember,
  updateMemberStatus,
  addCategory,
  noteClientAudit
} from './_write-entities.ts';
export { validateSnapshot, restoreSnapshot } from './_write-snapshot.ts';

/* ── Dispatch table ──────────────────────────────────────────────── */

export type GroupWriteHandler = (gid: string, payload: Record<string, any>, headers: FirestoreHeaders) => Promise<{status: boolean, message: string, data?: unknown, updatedAt?: string}>;

/** Action name → handler. Used by the data gateway's router. */
export const WRITE_HANDLERS: Record<string, GroupWriteHandler> = {
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
  setPaymentAccount,
  catatAktivitas: noteClientAudit,
  restoreSnapshot
};
