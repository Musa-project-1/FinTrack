/**
 * @module api-auth
 * Login admin pemilik (level aplikasi, tidak scoped grup — dipakai tahap 4
 * untuk membuat grup baru). Dipisah dari api.js agar tiap file <430 baris.
 */

import { getAdminPassword } from './state.js';
import { fromFirestoreFields, hashText } from './utils.js';
import { FIRESTORE_BASE, logAuditEvent } from './api-scope.js';

/**
 * Login admin with hybrid serverless auth and direct fallback.
 * @param {string} pwd
 */
export const loginAdminApi = async (pwd) => {
  try {
    const trimmed = (pwd || '').trim();
    if (!trimmed) return { status: false, message: 'Password tidak boleh kosong.', data: null };

    // 1. Coba serverless authentication endpoint (Vercel)
    try {
      const sRes = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: trimmed })
      });
      if (sRes.status !== 404) {
        const json = await sRes.json();
        logAuditEvent(json.status ? 'LOGIN_ADMIN' : 'LOGIN_GAGAL', json.status ? 'Login via serverless auth' : 'Password salah (serverless)');
        return json;
      }
    } catch (_) {}

    // 2. Fallback direct Firestore (jika di host statis murni / offline)
    const inputHash = await hashText(trimmed);
    const cfgRes = await fetch(`${FIRESTORE_BASE}/settings/app_config`).then((r) => r.json());
    const storedHash = fromFirestoreFields(cfgRes.fields).admin_password_hash || '';

    if (storedHash && inputHash === storedHash) {
      logAuditEvent('LOGIN_ADMIN', 'Login Sukses (fallback)');
      return { status: true, message: 'Login Sukses', data: null };
    }
    logAuditEvent('LOGIN_GAGAL', 'Password salah (fallback)');
    return { status: false, message: 'Password Salah!', data: null };
  } catch (error) {
    console.error('Login error:', error);
    return { status: false, message: 'Gagal terhubung ke server autentikasi.', data: null };
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
