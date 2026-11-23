/**
 * @module api-auth
 * Admin authentication against the Finkas serverless API.
 *
 * The password is sent once, over HTTPS, to be verified server-side with
 * scrypt. What comes back is a signed, expiring session token — never a
 * password hash — and that token is what authorizes later requests.
 */

import { API } from './config';
import { apiPost, logAuditEvent } from './api-client';
import {
  clearAdminSession,
  getAdminSession,
  setAdminEmail,
  setAdminRole,
  setAdminSession,
  setGroupSession
} from './state';

type LoginData = {sessionToken: string, role?: string, email?: string, groupId?: string};
type LoginResponse = import('./api-client').ApiResponse<LoginData>;

/** Store the session returned by a successful login. */
const applySession = (data: LoginData, fallbackGroupId: string = '') => {
  setAdminSession(data.sessionToken);
  setAdminRole(data.role || '');
  setAdminEmail(data.email || '');

  // A group-scoped admin token also unlocks reads for that group.
  const gid = data.groupId || fallbackGroupId;
  if (gid && data.sessionToken) setGroupSession(gid, data.sessionToken);
};

/** Log in as the group admin (or the master admin when the password matches the
 * owner password stored on the server). */
export const loginAdminApi = async (email: string, password: string, groupId: string = ''): Promise<{status: boolean, message?: string, data?: LoginData|null}> => {
  const trimmedPassword = String(password || '').trim();
  if (!trimmedPassword) {
    return { status: false, message: 'Password tidak boleh kosong.', data: null };
  }

  const res: LoginResponse|null = await apiPost(API.LOGIN, {
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

/** Log in as the Super Admin using a Google token (ID token or OAuth2 access token). */
export const loginGoogleSuperAdminApi = async (idToken: string): Promise<{status: boolean, message?: string, data?: LoginData|null}> => {
  const token = String(idToken || '').trim();
  if (!token) {
    return { status: false, message: 'Token otentikasi Google diperlukan.', data: null };
  }

  const res: LoginResponse|null = await apiPost(API.LOGIN_GOOGLE, {
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

/** List the Super Admin emails. */
export const fetchSuperAdminsApi = async (): Promise<{status: boolean, httpStatus?: number, data?: Array<{email: string, isPrimary: boolean}>|null, message?: string}> => {
  const res: import('./api-client').ApiResponse<{email: string, isPrimary: boolean}[]>|null = await apiPost(API.LOGIN_GOOGLE, { action: 'list', sessionToken: getAdminSession() });
  if (!res) return { status: false, message: 'Tidak dapat terhubung ke server.' };
  return res;
};

/** Grant Super Admin access to another Google account. */
export const addSuperAdminApi = async (emailToAdd: string): Promise<{status:boolean, httpStatus?:number, message?:string}> => {
  const res = await apiPost(API.LOGIN_GOOGLE, {
    action: 'add',
    emailToAdd: String(emailToAdd || '').trim().toLowerCase(),
    sessionToken: getAdminSession()
  });
  if (!res) return { status: false, message: 'Tidak dapat terhubung ke server.' };
  return res;
};

/** Revoke Super Admin access. */
export const removeSuperAdminApi = async (emailToRemove: string): Promise<{status:boolean, httpStatus?:number, message?:string}> => {
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
