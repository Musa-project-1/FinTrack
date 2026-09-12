/**
 * @module api-client
 * Transport for the Finkas serverless API.
 *
 * The client owns no database credentials. Every call carries a signed session
 * token (see core/state.js) and the server decides what it is allowed to do.
 */

import { API, DEFAULT_GROUP_ID } from './config.js';
import { getActiveGroupId, clearGroupSession, resolveSessionToken } from './state.js';

/** Audit events the client is allowed to record (everything else is server-side). */
const CLIENT_AUDIT_ACTIONS = new Set([
  'BACKUP_DATABASE',
  'RESTORE_DATABASE',
  'OFFLINE_SYNC',
  'LOGOUT_ADMIN'
]);

/**
 * Group owning a payload, falling back to the active group.
 * @param {object} [payload]
 * @returns {string}
 */
export const resolveGroupId = (payload) =>
  (payload && payload.groupId) || getActiveGroupId() || DEFAULT_GROUP_ID;

/**
 * POST JSON to a Finkas endpoint.
 *
 * Resolves to `null` only when the request could not be made at all (offline),
 * which callers treat as "queue and retry". Any HTTP response — including an
 * error — resolves to the parsed body with the status attached.
 *
 * @param {string} endpoint
 * @param {object} body
 * @returns {Promise<object|null>}
 */
export const apiPost = async (endpoint, body) => {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });

    const json = await res.json().catch(() => null);
    if (!json || typeof json !== 'object') {
      return { status: false, httpStatus: res.status, message: `Respons server tidak valid (${res.status}).` };
    }
    return { ...json, httpStatus: res.status };
  } catch (err) {
    console.warn('[finkas] API request failed:', endpoint, err?.message);
    return null;
  }
};

/**
 * Call the data gateway for a group.
 *
 * @param {object} options
 * @param {string} options.action Server action name ('read', 'audit', a write action…).
 * @param {object} [options.payload] Extra fields merged into the request body.
 * @param {boolean} [options.needsWrite] Require the admin session rather than the group session.
 * @param {boolean} [options.requiresAuth] Set false for public actions (e.g. the group directory).
 * @returns {Promise<object|null>}
 */
export const dataRequest = async ({ action, payload = {}, needsWrite = false, requiresAuth = true }) => {
  const groupId = resolveGroupId(payload);
  const sessionToken = requiresAuth ? resolveSessionToken(groupId, needsWrite) : '';

  if (requiresAuth && !sessionToken) {
    return { status: false, httpStatus: 401, unauthorized: true, message: 'Sesi tidak ditemukan. Silakan masuk kembali.' };
  }

  const result = await apiPost(API.DATA, { ...payload, action, groupId, sessionToken });
  if (!result) return null;

  if (requiresAuth && result.httpStatus === 401) {
    // The token is gone or expired — drop it so the user is asked for the PIN again.
    clearGroupSession(groupId);
    return { ...result, unauthorized: true };
  }
  return result;
};

/**
 * Record a client-side activity in the group audit trail.
 *
 * Only allow-listed, low-risk events are accepted; authentication and mutation
 * events are logged by the server that performs them, so they cannot be forged
 * from the browser.
 *
 * @param {string} aksi
 * @param {string} detail
 */
export const logAuditEvent = (aksi, detail) => {
  if (!CLIENT_AUDIT_ACTIONS.has(aksi)) return;
  void dataRequest({
    action: 'catatAktivitas',
    payload: { aksi, detail: String(detail || '').slice(0, 200) },
    needsWrite: true
  });
};
