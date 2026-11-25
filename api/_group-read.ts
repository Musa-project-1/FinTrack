/**
 * Read operations for a single group's data.
 */
import type { FirestoreDoc, FirestoreHeaders, GroupSettings } from '../src/types/finkas.d.ts';
import { FIRESTORE_BASE, decodeFields, fsGet, fsListAll } from './_sa.ts';
import {
  AUDIT_COLLECTION,
  MEMBERS_COLLECTION,
  CATEGORIES_COLLECTION,
  TRANSACTIONS_COLLECTION,
  col,
  settingsDoc
} from './_store.ts';

const byTimestampDesc = (a: {Timestamp?: string}, b: {Timestamp?: string}) => {
  const tb = new Date(b.Timestamp || 0).getTime();
  const ta = new Date(a.Timestamp || 0).getTime();
  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
};

const fieldsOf = (docs: Array<{name: string, fields: Record<string, any>}>) => docs.map((doc) => doc.fields || {});

const sanitizeMemberForViewer = (doc: Record<string, any>) => {
  const { Nomor_WA: _omitWa, ...safe } = doc;
  return safe;
};

const sanitizeTransactionForViewer = (doc: Record<string, any>) => {
  const { operationId: _omitOpId, ...safe } = doc;
  return safe;
};

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

/** Load the full dataset for one group, omitting private fields for non-admin viewers. */
export async function readGroupData(
  gid: string,
  headers: FirestoreHeaders,
  options: { includePrivate?: boolean } = {}
): Promise<GroupData> {
  const includePrivate = Boolean(options?.includePrivate);
  const [memberDocs, categoryDocs, transactionDocs, settings] = await Promise.all([
    fsListAll(col(gid, MEMBERS_COLLECTION), headers),
    fsListAll(col(gid, CATEGORIES_COLLECTION), headers),
    fsListAll(col(gid, TRANSACTIONS_COLLECTION), headers),
    fsGet(settingsDoc(gid), headers)
  ]);

  const rawMembers = fieldsOf(memberDocs);
  const rawTransactions = fieldsOf(transactionDocs).sort(byTimestampDesc);

  return {
    anggota: includePrivate ? rawMembers : rawMembers.map(sanitizeMemberForViewer),
    kategori: fieldsOf(categoryDocs),
    transaksi: includePrivate ? rawTransactions : rawTransactions.map(sanitizeTransactionForViewer),
    settings: {
      skippedMonths: settings?.skippedMonths || [],
      kasStart: settings?.kasStart || '',
      ...(settings?.paymentAccount ? { paymentAccount: settings.paymentAccount } : {})
    }
  };
}

/** Load the newest 100 audit trail entries for one group, newest first. */
export async function readAuditLog(gid: string, headers: FirestoreHeaders): Promise<Array<Record<string, any>>> {
  const colPath = col(gid, AUDIT_COLLECTION);
  const entries: Array<Record<string, any>> = [];
  let pageToken = '';
  let fallback = false;

  for (let page = 0; page < 60; page += 1) {
    const query = `?pageSize=100&orderBy=${encodeURIComponent('Timestamp desc')}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(`${FIRESTORE_BASE}/${colPath}${query}`, { headers });
    if (page === 0 && (res.status === 404 || res.status === 501)) {
      fallback = true;
      break;
    }
    if (!res.ok) {
      throw new Error(`Gagal membaca riwayat audit (${res.status}).`);
    }
    const json = await res.json();
    (json.documents || []).forEach((doc: FirestoreDoc) => {
      const fields = decodeFields(doc.fields);
      if (!fields.groupId || fields.groupId === gid) {
        entries.push(fields);
      }
    });
    pageToken = json.nextPageToken || '';
    if (!pageToken || entries.length >= 100) break;
  }

  if (fallback) {
    const docs = await fsListAll(colPath, headers, 3, true);
    return docs
      .map((doc) => doc.fields || {})
      .filter((entry) => !entry.groupId || entry.groupId === gid)
      .sort(byTimestampDesc)
      .slice(0, 100);
  }

  return entries.sort(byTimestampDesc).slice(0, 100);
}
