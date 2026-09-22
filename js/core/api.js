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

const EMPTY_DATA = { anggota: [], kategori: [], transaksi: [], settings: { skippedMonths: [] } };

/** Back-off window after the database reports a quota error. */
let quotaCooldownUntil = 0;
const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

const isQuotaError = (message) => /kuota|quota|429/i.test(String(message || ''));

/**
 * Fetch all data for the active group.
 * @returns {Promise<{status: boolean, data?: object, message: string}>}
 */
export const fetchInitialData = async () => {
  try {
    if (Date.now() < quotaCooldownUntil) {
      return { status: false, message: 'Batas kuota Firestore tercapai. Menggunakan data cache offline.' };
    }

    const groupId = getActiveGroupId();
    if (!groupId) {
      return { status: true, message: 'Belum ada grup aktif.', data: EMPTY_DATA };
    }

    const res = await dataRequest({ action: 'read', payload: { groupId } });
    if (!res) {
      return { status: false, message: 'Tidak dapat terhubung ke server.', data: null };
    }
    if (!res.status) {
      if (isQuotaError(res.message)) quotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
      return { status: false, message: res.message || 'Gagal memuat data.', unauthorized: res.unauthorized };
    }

    const data = res.data || {};
    return {
      status: true,
      message: 'Data berhasil ditarik dari server.',
      data: {
        anggota: data.anggota || [],
        kategori: data.kategori || [],
        transaksi: data.transaksi || [],
        settings: { skippedMonths: data.settings?.skippedMonths || [] }
      }
    };
  } catch (error) {
    console.error('Fetch initial data error:', error);
    return { status: false, message: error?.message || 'Gagal memuat data.', data: null };
  }
};

/**
 * Send a mutation to the gateway.
 *
 * Returns `null` when the request never reached the server (offline), which
 * callers treat as "queue this payload and retry".
 *
 * @param {object} payload Must carry an `action` matching a server write action.
 * @returns {Promise<{status: boolean, message: string, data: object|null}|null>}
 */
export const postToBackend = async (payload) => {
  if (!payload || typeof payload !== 'object' || !payload.action) {
    return { status: false, message: 'Payload tidak valid.', data: null };
  }

  const res = await dataRequest({ action: payload.action, payload, needsWrite: true });
  if (!res) return null;
  if (res.status && typeof window !== 'undefined') {
    // Announce a successful mutation so the sync module can advance this tab's
    // freshness marker and signal sibling tabs — decoupled via a window event
    // to avoid a circular import between api.js and sync.js.
    window.dispatchEvent(new CustomEvent('finkas:mutation-success', {
      detail: { updatedAt: res.updatedAt || null }
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
 * @returns {Promise<{hasUpdate: boolean, updatedAt: string|null}>}
 */
export const checkGroupUpdate = async (since) => {
  try {
    const groupId = getActiveGroupId();
    if (!groupId) return { hasUpdate: false, updatedAt: null };
    const res = await dataRequest({ action: 'checkUpdate', payload: { groupId, since } });
    if (!res || !res.status) return { hasUpdate: false, updatedAt: null };
    return { hasUpdate: Boolean(res.data?.hasUpdate), updatedAt: res.data?.updatedAt || null };
  } catch {
    return { hasUpdate: false, updatedAt: null };
  }
};
