/**
 * @module api-client
 * Transport for the Finkas serverless API.
 *
 * The client owns no database credentials. Every call carries a signed session
 * token (see core/state.ts) and the server decides what it is allowed to do.
 */

import { API } from './config';
import {
  clearAdminSession,
  clearGroupSession,
  getActiveGroupId,
  getAdminSession,
  getGroupSession,
  getIsSuperAdmin,
  resolveSessionToken
} from './state';

export type ApiResponse<T> = { status: boolean, httpStatus: number, message?: string, data?: T|null, unauthorized?: boolean, updatedAt?: string };

/** Audit events the client is allowed to record (everything else is server-side). */
const CLIENT_AUDIT_ACTIONS = new Set([
  'BACKUP_DATABASE',
  'RESTORE_DATABASE',
  'OFFLINE_SYNC',
  'LOGOUT_ADMIN'
]);

/** Group owning a payload, falling back to the active group. */
export const resolveGroupId = (payload?: {groupId?: string}): string =>
  (payload && payload.groupId) || getActiveGroupId() || '';

/** POST JSON to a Finkas endpoint.
 *
 * Resolves to `null` only when the request could not be made at all (offline),
 * which callers treat as "queue and retry". Any HTTP response — including an
 * error — resolves to the parsed body with the status attached. */
export const apiPost = async <T>(endpoint: string, body: object): Promise<ApiResponse<T>|null> => {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });

    const json = await res.json().catch(() => null);
    if (!json || typeof json !== 'object') {
      return { status: false, httpStatus: res.status, message: `Respons server tidak valid (${res.status}).` };
    }
    return { ...json, httpStatus: res.status };
  } catch (err) {
    console.warn('[finkas] API request failed:', endpoint, (err instanceof Error ? err.message : String(err)));
    return null;
  }
};

interface DataRequestOptions {
  action: string;
  groupId?: string;
  payload?: { groupId?: string, [key: string]: unknown };
  needsWrite?: boolean;
  requiresAuth?: boolean;
}

/** Call the data gateway for a group. */
export const dataRequest = async <T>({
  action, groupId: explicitGroupId, payload = {}, needsWrite = false, requiresAuth = true
}: DataRequestOptions): Promise<ApiResponse<T>|null> => {
  const groupId = explicitGroupId || resolveGroupId(payload);
  if (requiresAuth && !groupId) {
    return { status: false, httpStatus: 400, unauthorized: true, message: 'ID grup wajib diisi.' };
  }
  const sessionToken = requiresAuth ? resolveSessionToken(groupId, needsWrite) : '';

  if (requiresAuth && !sessionToken) {
    return { status: false, httpStatus: 401, unauthorized: true, message: 'Sesi tidak ditemukan. Silakan masuk kembali.' };
  }

  const result: ApiResponse<T>|null = await apiPost(API.DATA, { ...payload, action, groupId, sessionToken });
  if (!result) return null;

  if (requiresAuth && (result.httpStatus === 401 || result.httpStatus === 403)) {
    // Drop the rejected token only if it is still the active token post-await
    // so late pre-logout or pre-relogin responses never clobber a newer session.
    if (sessionToken === getGroupSession(groupId)) {
      clearGroupSession(groupId);
    }
    const isCurrentAdminSession = Boolean(sessionToken) && sessionToken === getAdminSession();
    const isSuperAdmin = getIsSuperAdmin();
    if (isCurrentAdminSession && (result.httpStatus === 401 || (result.httpStatus === 403 && isSuperAdmin))) {
      clearAdminSession({ preserveGroupSessions: !isSuperAdmin });
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('finkas:session-expired', {
          detail: { groupId, httpStatus: result.httpStatus }
        }));
      }
    }
    return { ...result, unauthorized: true };
  }
  return result;
};

/** Record a client-side activity in the group audit trail.
 *
 * Only allow-listed, low-risk events are accepted; authentication and mutation
 * events are logged by the server that performs them, so they cannot be forged
 * from the browser. */
export const logAuditEvent = (aksi: string, detail: string) => {
  if (!CLIENT_AUDIT_ACTIONS.has(aksi)) return;
  void dataRequest({
    action: 'catatAktivitas',
    payload: { aksi, detail: String(detail || '').slice(0, 200) },
    needsWrite: true
  });
};
