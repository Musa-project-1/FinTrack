/**
 * @module api
 * Group data access for Finkas.
 *
 * Every call is routed through the serverless gateway (`/api/data`), which
 * authorizes the request against the caller's signed session and talks to
 * Firestore with the service account. Validation and de-duplication happen
 * server-side; this module only shapes requests and normalizes responses.
 */

import { getActiveGroupId } from './state.js';
import { dataRequest, logAuditEvent, resolveGroupId } from './api-client.js';

export { logAuditEvent, resolveGroupId };

export {
  loginAdminApi,
  loginGoogleSuperAdminApi,
  fetchSuperAdminsApi,
  addSuperAdminApi,
  removeSuperAdminApi,
  logoutAdminApi
} from './api-auth.js';

const EMPTY_DATA = { anggota: [], kategori: [], transaksi: [], settings: { skippedMonths: [], kasStart: '' } };

/** Back-off window after the database reports a quota error. */
let quotaCooldownUntil = 0;
const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

const isQuotaError = (message) => /kuota|quota|429/i.test(String(message || ''));

/**
 * Fetch all data for a specific group or active group.
 * Group-scoped and captures conservative marker before the request.
 *
 * @param {string} [targetGroupId] Optional explicit group ID
 * @returns {Promise<{status: boolean, httpStatus: number, groupId: string|null, readMarker: string|null, data?: object, message: string, unauthorized?: boolean}>}
 */
export const fetchInitialData = async (targetGroupId) => {
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

    const res = await dataRequest({ action: 'read', payload: { groupId } });
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
          kasStart: data.settings?.kasStart || ''
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
      message: error?.message || 'Gagal memuat data.',
      data: null,
      readMarker: null
    };
  }
};

/**
 * Send a mutation to the gateway.
 *
 * Returns `null` when the request never reached the server (offline), which
 * callers treat as "queue this payload and retry".
 *
 * @param {object} payload Must carry an `action` matching a server write action.
 * @returns {Promise<{status: boolean, message: string, data: object|null, httpStatus?: number}|null>}
 */
export const postToBackend = async (payload) => {
  if (!payload || typeof payload !== 'object' || !payload.action) {
    return { status: false, httpStatus: 400, message: 'Payload tidak valid.', data: null };
  }

  const res = await dataRequest({ action: payload.action, payload, needsWrite: true });
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

/**
 * Fetch the audit trail for the active group.
 * @returns {Promise<{status: boolean, data: {log: Array}, message?: string}>}
 */
export const fetchAuditLogApi = async () => {
  const res = await dataRequest({ action: 'audit', payload: { groupId: getActiveGroupId() } });
  if (!res) return { status: false, message: 'Tidak dapat terhubung ke server.', data: { log: [] } };
  if (!res.status) return { status: false, message: res.message, data: { log: [] } };
  return { status: true, data: { log: res.data?.log || [] } };
};

/**
 * Fetch the public group directory.
 * @returns {Promise<Array<{id: string, nama: string, dibuat: string}>>}
 */
export const fetchGroupsApi = async () => {
  const res = await dataRequest({ action: 'groups', requiresAuth: false });
  if (!res || !res.status) return [];
  return res.data?.groups || [];
};

/**
 * Lightweight update check — costs exactly 1 Firestore read.
 * Returns whether the server has newer data than the client's last sync.
 * @param {string} since ISO timestamp of the client's last successful sync
 * @param {string} [targetGroupId] Optional target group ID
 * @returns {Promise<{hasUpdate: boolean, updatedAt: string|null, httpStatus?: number}>}
 */
export const checkGroupUpdate = async (since, targetGroupId) => {
  try {
    const groupId = targetGroupId || getActiveGroupId();
    if (!groupId) return { hasUpdate: false, updatedAt: null, httpStatus: 200 };
    const res = await dataRequest({ action: 'checkUpdate', payload: { groupId, since } });
    if (!res || !res.status) return { hasUpdate: false, updatedAt: null, httpStatus: res?.httpStatus || 0 };
    return { hasUpdate: Boolean(res.data?.hasUpdate), updatedAt: res.data?.updatedAt || null, httpStatus: res.httpStatus || 200 };
  } catch {
    return { hasUpdate: false, updatedAt: null, httpStatus: 0 };
  }
};
