import type { AppState, GroupSettings, MutationData } from '../../types/finkas';
/**
 * @module api
 * Group data access for Finkas.
 *
 * Every call is routed through the serverless gateway (`/api/data`), which
 * authorizes the request against the caller's signed session and talks to
 * Firestore with the service account. Validation and de-duplication happen
 * server-side; this module only shapes requests and normalizes responses.
 */

import { getActiveGroupId } from './state';
import { dataRequest, logAuditEvent, resolveGroupId, type ApiResponse } from './api-client';

export { logAuditEvent, resolveGroupId };

export {
  loginAdminApi,
  loginGoogleSuperAdminApi,
  fetchSuperAdminsApi,
  addSuperAdminApi,
  removeSuperAdminApi,
  logoutAdminApi
} from './api-auth';

type GroupData = Pick<AppState, 'anggota'|'kategori'|'transaksi'> & {settings: GroupSettings, updatedAt?: string|null, readMarker?: string};
type ResponseFor<T> = ApiResponse<T>|null;

const EMPTY_DATA = { anggota: [], kategori: [], transaksi: [], settings: { skippedMonths: [], kasStart: '' } };

/** Back-off window after the database reports a quota error. */
let quotaCooldownUntil = 0;
const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

const isQuotaError = (message?: string) => /kuota|quota|429/i.test(String(message || ''));

/** Fetch all data for a specific group or active group.
 * Group-scoped and captures conservative marker before the request. */
export const fetchInitialData = async (targetGroupId: string): Promise<{status: boolean, httpStatus: number, groupId: string|null, readMarker: string|null, data: GroupData|null, message: string, unauthorized?: boolean}> => {
  try {
    if (Date.now() < quotaCooldownUntil) {
      return {
        status: false,
        httpStatus: 429,
        groupId: targetGroupId || getActiveGroupId() || null,
        message: 'Batas kuota Firestore tercapai. Menggunakan data cache offline.',
        data: null,
        readMarker: null
      };
    }

    const groupId = targetGroupId || getActiveGroupId();
    if (!groupId) {
      return {
        status: true,
        httpStatus: 200,
        groupId: null,
        message: 'Belum ada grup aktif.',
        data: EMPTY_DATA,
        readMarker: null
      };
    }

    // Capture the read start timestamp BEFORE initiating the server read request.
    // If the server response lacks an updatedAt marker (e.g. empty or legacy group),
    // this conservative marker ensures unread remote changes that occur during or after
    // the read are never cleared by a later completion timestamp.
    const readStartedAt = new Date().toISOString();

    const res: ResponseFor<Partial<GroupData>> = await dataRequest({ action: 'read', payload: { groupId } });
    if (!res) {
      return {
        status: false,
        httpStatus: 0,
        groupId,
        message: 'Tidak dapat terhubung ke server.',
        data: null,
        readMarker: null
      };
    }
    if (!res.status) {
      if (isQuotaError(res.message)) quotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
      return {
        status: false,
        httpStatus: res.httpStatus || 400,
        groupId,
        message: res.message || 'Gagal memuat data.',
        unauthorized: Boolean(res.unauthorized),
        data: null,
        readMarker: null
      };
    }

    const data = res.data || {};
    const readMarker = data.updatedAt || readStartedAt;

    return {
      status: true,
      httpStatus: res.httpStatus || 200,
      groupId,
      readMarker,
      message: 'Data berhasil ditarik dari server.',
      data: {
        anggota: data.anggota || [],
        kategori: data.kategori || [],
        transaksi: data.transaksi || [],
        settings: {
          skippedMonths: data.settings?.skippedMonths || [],
          kasStart: data.settings?.kasStart || '',
          ...(data.settings?.paymentAccount ? { paymentAccount: data.settings.paymentAccount } : {})
        },
        updatedAt: data.updatedAt || null,
        readMarker
      }
    };
  } catch (error) {
    console.error('Fetch initial data error:', error);
    return {
      status: false,
      httpStatus: 500,
      groupId: targetGroupId || getActiveGroupId() || null,
      message: (error instanceof Error ? error.message : String(error)) || 'Gagal memuat data.',
      data: null,
      readMarker: null
    };
  }
};

/** Send a mutation to the gateway.
 *
 * Returns `null` when the request never reached the server (offline), which
 * callers treat as "queue this payload and retry". */
export const postToBackend = async <T=MutationData>(payload: {action: string, groupId?: string, [key: string]: unknown}): Promise<{status: boolean, message?: string, data?: T|null, httpStatus: number}|null> => {
  if (!payload || typeof payload !== 'object' || !payload.action) {
    return { status: false, httpStatus: 400, message: 'Payload tidak valid.', data: null };
  }

  const res: ResponseFor<T> = await dataRequest({ action: payload.action, payload, needsWrite: true });
  if (!res) return null;
  if (res.status && typeof window !== 'undefined') {
    const groupId = resolveGroupId(payload);
    // Announce a successful mutation so the sync module and status listeners
    // can handle the write without falsely treating it as a full data pull.
    window.dispatchEvent(new CustomEvent('finkas:mutation-success', {
      detail: {
        updatedAt: res.updatedAt || null,
        groupId,
        action: payload.action,
        source: 'local-write',
        isFullRead: false
      }
    }));
  }
  return res;
};

/** Fetch the audit trail for the selected group. */
export const fetchAuditLogApi = async (targetGroupId?: string): Promise<{status: boolean, data: {log: object[]}, message?: string}> => {
  const groupId = targetGroupId || getActiveGroupId();
  const res: ResponseFor<{log: object[]}> = await dataRequest({ action: 'audit', groupId, payload: { groupId } });
  if (!res) return { status: false, message: 'Tidak dapat terhubung ke server.', data: { log: [] } };
  if (!res.status) return { status: false, message: res.message, data: { log: [] } };
  return { status: true, data: { log: res.data?.log || [] } };
};

/** Fetch the public group directory. */
export const fetchGroupsApi = async (): Promise<Array<{id: string, nama: string, dibuat?: string}>> => {
  const res: ResponseFor<{groups: {id: string, nama: string, dibuat?: string}[]}> = await dataRequest({ action: 'groups', requiresAuth: false });
  if (!res || !res.status) return [];
  return res.data?.groups || [];
};

/** Lightweight update check — costs exactly 1 Firestore read.
 * Returns whether the server has newer data than the client's last sync. */
export const checkGroupUpdate = async (since: string, targetGroupId: string): Promise<{hasUpdate: boolean, updatedAt: string|null, httpStatus?: number}> => {
  try {
    const groupId = targetGroupId || getActiveGroupId();
    if (!groupId) return { hasUpdate: false, updatedAt: null, httpStatus: 200 };
    const res: ResponseFor<{hasUpdate: boolean, updatedAt: string|null}> = await dataRequest({ action: 'checkUpdate', payload: { groupId, since } });
    if (!res || !res.status) return { hasUpdate: false, updatedAt: null, httpStatus: res?.httpStatus || 0 };
    return { hasUpdate: Boolean(res.data?.hasUpdate), updatedAt: res.data?.updatedAt || null, httpStatus: res.httpStatus || 200 };
  } catch {
    return { hasUpdate: false, updatedAt: null, httpStatus: 0 };
  }
};
