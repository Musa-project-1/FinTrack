/**
 * @module api-auth
 * Admin authentication against the Finkas serverless API.
 *
 * The password is sent once, over HTTPS, to be verified server-side with
 * scrypt. What comes back is a signed, expiring session token — never a
 * password hash — and that token is what authorizes later requests.
 */

import { API } from './config.js';
import { apiPost, logAuditEvent } from './api-client.js';
import {
  clearAdminSession,
  getAdminSession,
  setAdminEmail,
  setAdminRole,
  setAdminSession,
  setGroupSession
} from './state.js';

/**
 * Store the session returned by a successful login.
 * @param {object} data Server response payload.
 * @param {string} [fallbackGroupId]
 */
const applySession = (data, fallbackGroupId = '') => {
  setAdminSession(data.sessionToken);
  setAdminRole(data.role || '');
  setAdminEmail(data.email || '');

  // A group-scoped admin token also unlocks reads for that group.
  const gid = data.groupId || fallbackGroupId;
  if (gid && data.sessionToken) setGroupSession(gid, data.sessionToken);
};

/**
 * Log in as the group admin (or the master admin when the password matches the
 * owner password stored on the server).
 *
 * @param {string} email
 * @param {string} password
 * @param {string} [groupId]
 * @returns {Promise<{status: boolean, message: string, data?: object}>}
 */
export const loginAdminApi = async (email, password, groupId = '') => {
  const trimmedPassword = String(password || '').trim();
  if (!trimmedPassword) {
    return { status: false, message: 'Password tidak boleh kosong.', data: null };
  }

  const res = await apiPost(API.LOGIN, {
    email: String(email || '').trim().toLowerCase(),
    password: trimmedPassword,
    groupId: String(groupId || '').trim()
  });

  if (!res) {
    return { status: false, message: 'Tidak dapat terhubung ke server autentikasi.', data: null };
  }
  if (res.status && res.data?.sessionToken) applySession(res.data, groupId);
  return res;
};

/**
 * Log in as the Super Admin using a Google token (ID token or OAuth2 access token).
 * @param {string} idToken
 * @returns {Promise<{status: boolean, message: string, data?: object}>}
 */
export const loginGoogleSuperAdminApi = async (idToken) => {
  const token = String(idToken || '').trim();
  if (!token) {
    return { status: false, message: 'Token otentikasi Google diperlukan.', data: null };
  }

  const res = await apiPost(API.LOGIN_GOOGLE, {
    action: 'login',
    idToken: token,
    accessToken: token
  });

  if (!res) {
    return { status: false, message: 'Tidak dapat terhubung ke server autentikasi.', data: null };
  }
  if (res.status && res.data?.sessionToken) applySession(res.data);
  return res;
};

/**
 * List the Super Admin emails.
 * @returns {Promise<{status: boolean, data?: Array, message?: string}>}
 */
export const fetchSuperAdminsApi = async () => {
  const res = await apiPost(API.LOGIN_GOOGLE, { action: 'list', sessionToken: getAdminSession() });
  if (!res) return { status: false, message: 'Tidak dapat terhubung ke server.' };
  return res;
};

/**
 * Grant Super Admin access to another Google account.
 * @param {string} emailToAdd
 */
export const addSuperAdminApi = async (emailToAdd) => {
  const res = await apiPost(API.LOGIN_GOOGLE, {
    action: 'add',
    emailToAdd: String(emailToAdd || '').trim().toLowerCase(),
    sessionToken: getAdminSession()
  });
  if (!res) return { status: false, message: 'Tidak dapat terhubung ke server.' };
  return res;
};

/**
 * Revoke Super Admin access.
 * @param {string} emailToRemove
 */
export const removeSuperAdminApi = async (emailToRemove) => {
  const res = await apiPost(API.LOGIN_GOOGLE, {
    action: 'remove',
    emailToRemove: String(emailToRemove || '').trim().toLowerCase(),
    sessionToken: getAdminSession()
  });
  if (!res) return { status: false, message: 'Tidak dapat terhubung ke server.' };
  return res;
};

/**
 * End the admin session.
 *
 * The audit entry is dispatched before the token is cleared, so the request
 * still carries the credential that authorizes it.
 */
export const logoutAdminApi = async () => {
  logAuditEvent('LOGOUT_ADMIN', 'Admin logout');
  clearAdminSession();
  return { status: true, message: 'Logout Sukses', data: null };
};
