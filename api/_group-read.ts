/**
 * Read operations for a single group's data.
 */
import type { FirestoreHeaders, GroupSettings } from '../src/types/finkas.d.ts';
import { fsGet, fsListAll } from './_sa.ts';
import { MEMBERS_COLLECTION, CATEGORIES_COLLECTION, TRANSACTIONS_COLLECTION, col, settingsDoc } from './_store.ts';

const byTimestampDesc = (a: {Timestamp?: string}, b: {Timestamp?: string}) =>
  new Date(b.Timestamp || 0).getTime() - new Date(a.Timestamp || 0).getTime();

const fieldsOf = (docs: Array<{name: string, fields: Record<string, any>}>) => docs.map((doc) => doc.fields || {});

/** Load only the transactions collection for one group.
 * Used by write handlers for duplicate checking without reading other collections. */
export async function readTransactions(gid: string, headers: FirestoreHeaders): Promise<Array<Record<string, any>>> {
  const docs = await fsListAll(col(gid, TRANSACTIONS_COLLECTION), headers);
  return fieldsOf(docs);
}

interface GroupData {
  anggota: Record<string, any>[];
  kategori: Record<string, any>[];
  transaksi: Record<string, any>[];
  updatedAt?: string;
  settings: GroupSettings;
}

/** Load the full dataset for one group. */
export async function readGroupData(gid: string, headers: FirestoreHeaders): Promise<GroupData> {
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
      kasStart: settings?.kasStart || '',
      ...(settings?.paymentAccount ? { paymentAccount: settings.paymentAccount } : {})
    }
  };
}

/** Load the audit trail for one group, newest first. */
export async function readAuditLog(gid: string, headers: FirestoreHeaders): Promise<Array<Record<string, any>>> {
  // Bounded read: the audit view only shows the newest ~100 entries, so a
  // partial list past the 3-page cap is expected, not an error.
  const docs = await fsListAll(col(gid, 'audit_log'), headers, 3, true);
  return docs
    .map((doc) => doc.fields || {})
    .filter((entry) => !entry.groupId || entry.groupId === gid)
    .sort(byTimestampDesc)
    .slice(0, 100);
}
