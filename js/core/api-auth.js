/**
 * @module api-auth
 * Login admin pemilik & admin grup unik, verifikasi Google Super Admin,
 * serta kelola email superadmin.
 */

import {
  getAdminPassword,
  getActiveGroupId,
  setIsAdminSession,
  setIsSuperAdmin,
  setAdminRole,
  setAdminEmail,
  setAdminPassword
} from './state.js';
import { fromFirestoreFields, hashText } from './utils.js';
import { FIRESTORE_BASE, logAuditEvent } from './api-scope.js';

/**
 * Login admin grup dengan email + password (scoped ke activeGroupId).
 * @param {string} email
 * @param {string} pwd
 * @param {string} [groupId]
 */
export const loginAdminApi = async (email, pwd, groupId) => {
  try {
    // Normalisasi parameter jika user hanya passing 1 argumen password
    let cleanEmail = email;
    let cleanPwd = pwd;
    if (pwd === undefined && email) {
      cleanPwd = email;
      cleanEmail = '';
    }

    const trimmedEmail = (cleanEmail || '').trim().toLowerCase();
    const trimmedPwd = (cleanPwd || '').trim();
    const targetGroupId = groupId || getActiveGroupId();

    if (!trimmedPwd) {
      return { status: false, message: 'Password tidak boleh kosong.', data: null };
    }

    // 1. Coba serverless authentication endpoint (Vercel)
    try {
      const sRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPwd, groupId: targetGroupId })
      });
      if (sRes.status !== 404) {
        const json = await sRes.json();
        logAuditEvent(json.status ? 'LOGIN_ADMIN' : 'LOGIN_GAGAL', json.status ? `Login sukses (${json.data?.role || 'admin'})` : 'Password salah (serverless)');
        return json;
      }
    } catch (_) {}

    // 2. Fallback direct Firestore (jika di host statis murni / offline)
    if (targetGroupId) {
      const gRes = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(targetGroupId)}`).then((r) => r.json()).catch(() => null);
      if (gRes && gRes.fields) {
        const fields = fromFirestoreFields(gRes.fields);
        const storedHash = fields.admin_password_hash || '';
        const storedEmail = (fields.admin_email || '').toLowerCase().trim();
        const inputGroupHash = await hashText(`finkas-admin:${targetGroupId}:${trimmedPwd}`);

        const emailMatch = !storedEmail || !trimmedEmail || storedEmail === trimmedEmail;
        if (storedHash && emailMatch && inputGroupHash === storedHash) {
          logAuditEvent('LOGIN_ADMIN', `Login admin grup ${targetGroupId} sukses (fallback)`);
          return {
            status: true,
            message: 'Login Admin Grup Berhasil!',
            data: { isAdmin: true, isSuperAdmin: false, role: 'group_admin', groupId: targetGroupId }
          };
        }
      }
    }

    // Fallback master password
    const inputMasterHash = await hashText(trimmedPwd);
    const cfgRes = await fetch(`${FIRESTORE_BASE}/settings/app_config`).then((r) => r.json()).catch(() => null);
    if (cfgRes && cfgRes.fields) {
      const storedMasterHash = fromFirestoreFields(cfgRes.fields).admin_password_hash || '';
      if (storedMasterHash && inputMasterHash === storedMasterHash) {
        logAuditEvent('LOGIN_ADMIN', 'Login Master Super Admin Sukses (fallback)');
        return {
          status: true,
          message: 'Login Master Admin Sukses!',
          data: { isAdmin: true, isSuperAdmin: true, role: 'superadmin' }
        };
      }
    }

    logAuditEvent('LOGIN_GAGAL', 'Email atau password salah (fallback)');
    return { status: false, message: 'Email atau Password salah!', data: null };
  } catch (error) {
    console.error('Login error:', error);
    return { status: false, message: 'Gagal terhubung ke server autentikasi.', data: null };
  }
};

/**
 * Login Google untuk Super Admin.
 * @param {string} idToken
 * @param {string} [directEmail]
 */
export const loginGoogleSuperAdminApi = async (idToken, directEmail) => {
  try {
    const res = await fetch('/api/login-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', idToken, email: directEmail })
    });
    const json = await res.json();
    if (json.status && json.data) {
      setIsAdminSession(true);
      setIsSuperAdmin(true);
      setAdminRole('superadmin');
      setAdminEmail(json.data.email || '');
      setAdminPassword(json.data.sessionToken || 'sa-session');
      logAuditEvent('LOGIN_SUPERADMIN_GOOGLE', `Superadmin login: ${json.data.email}`);
    }
    return json;
  } catch (err) {
    return { status: false, message: err?.message || 'Gagal login via Google.' };
  }
};

/**
 * Ambil daftar email Super Admin.
 * @param {string} callerEmail
 */
export const fetchSuperAdminsApi = async (callerEmail) => {
  try {
    const res = await fetch('/api/login-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', callerEmail })
    });
    return await res.json();
  } catch (err) {
    return { status: false, message: 'Gagal memuat daftar superadmin.' };
  }
};

/**
 * Tambah email Super Admin baru.
 * @param {string} callerEmail
 * @param {string} emailToAdd
 */
export const addSuperAdminApi = async (callerEmail, emailToAdd) => {
  try {
    const res = await fetch('/api/login-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', callerEmail, emailToAdd })
    });
    return await res.json();
  } catch (err) {
    return { status: false, message: 'Gagal menambah superadmin.' };
  }
};

/**
 * Hapus email Super Admin.
 * @param {string} callerEmail
 * @param {string} emailToRemove
 */
export const removeSuperAdminApi = async (callerEmail, emailToRemove) => {
  try {
    const res = await fetch('/api/login-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', callerEmail, emailToRemove })
    });
    return await res.json();
  } catch (err) {
    return { status: false, message: 'Gagal menghapus superadmin.' };
  }
};

/**
 * Check if admin session is active.
 */
export const checkAdminSessionApi = async () => {
  const pwd = getAdminPassword();
  return { status: true, data: { isAdmin: !!pwd } };
};

/**
 * Logout admin session.
 */
export const logoutAdminApi = async () => {
  logAuditEvent('LOGOUT_ADMIN', 'Admin logout');
  return { status: true, message: 'Logout Sukses', data: null };
};
