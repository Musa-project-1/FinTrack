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
    const rawToken = (idToken || '').trim();

    // 1. Coba serverless function Vercel (hanya jika di lingkungan production/non-localhost)
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (!isLocalDev) {
      try {
        const res = await fetch('/api/login-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', idToken: rawToken, token: rawToken, email: directEmail })
        });
        if (res.status !== 404 && res.ok) {
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
        }
      } catch (_) {}
    }

    // 2. Fallback direct client verification (khusus saat run di Live Server / static host)
    if (rawToken) {
      const isAccessToken = rawToken.startsWith('ya29.');
      const queryParam = isAccessToken
        ? `access_token=${encodeURIComponent(rawToken)}`
        : `id_token=${encodeURIComponent(rawToken)}`;
      const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?${queryParam}`);
      if (!gRes.ok) {
        return { status: false, message: 'Token Google tidak valid atau sudah kedaluwarsa.' };
      }
      const gData = await gRes.json();
      const isVerified = gData.email_verified === 'true' || gData.email_verified === true || gData.verified_email === true;
      if (!isVerified) {
        return { status: false, message: 'Email Google belum diverifikasi.' };
      }
      const verifiedEmail = (gData.email || '').toLowerCase().trim();

      // Cek whitelist: musabakhtiar0@gmail.com adalah pemilik utama absolut
      let isAllowed = verifiedEmail === 'musabakhtiar0@gmail.com';
      if (!isAllowed) {
        try {
          const cfgRes = await fetch(`${FIRESTORE_BASE}/settings/app_config`).then((r) => (r.ok ? r.json() : null));
          const values = cfgRes?.fields?.superadmin_emails?.arrayValue?.values || [];
          const remoteList = values.map((v) => (v.stringValue || '').toLowerCase().trim()).filter(Boolean);
          if (remoteList.includes(verifiedEmail)) isAllowed = true;
        } catch (_) {}
      }

      if (!isAllowed) {
        return {
          status: false,
          message: `Akun Google (${verifiedEmail}) bukan Super Admin pemilik Finkas.`
        };
      }

      setIsAdminSession(true);
      setIsSuperAdmin(true);
      setAdminRole('superadmin');
      setAdminEmail(verifiedEmail);
      setAdminPassword('sa-' + Date.now());
      logAuditEvent('LOGIN_SUPERADMIN_GOOGLE', `Superadmin login (direct): ${verifiedEmail}`);

      return {
        status: true,
        message: 'Login Super Admin Sukses!',
        data: {
          isSuperAdmin: true,
          isAdmin: true,
          role: 'superadmin',
          email: verifiedEmail,
          name: gData.name || ''
        }
      };
    }

    return { status: false, message: 'Token otentikasi Google diperlukan.' };
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
    try {
      const res = await fetch('/api/login-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', callerEmail })
      });
      if (res.status !== 404) {
        return await res.json();
      }
    } catch (_) {}

    // Fallback direct Firestore
    const cfgRes = await fetch(`${FIRESTORE_BASE}/settings/app_config`).then((r) => r.json()).catch(() => null);
    const values = cfgRes?.fields?.superadmin_emails?.arrayValue?.values || [];
    let list = values.map((v) => (v.stringValue || '').toLowerCase().trim()).filter(Boolean);
    if (!list.includes('musabakhtiar0@gmail.com')) list.unshift('musabakhtiar0@gmail.com');
    return { status: true, data: { emails: list, primaryEmail: 'musabakhtiar0@gmail.com' } };
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
