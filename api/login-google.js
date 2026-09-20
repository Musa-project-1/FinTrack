/**
 * Google Sign-In and Super Admin management for Finkas.
 *
 * Authorization flows:
 *   login  — verify a Google ID/access token, check the email against the
 *            superadmin whitelist, and return a signed session.
 *   list   — return the superadmin email list (requires an active SA session).
 *   add    — grant SA access to another Google account (requires SA session).
 *   remove — revoke SA access (requires SA session; the primary owner cannot
 *            be removed).
 *
 * Every mutating action requires a valid, non-expired Super Admin session.
 * There is no `NODE_ENV` bypass and no body-supplied `isSuperAdmin` shortcut.
 */
import { fsGet, fsPatch, requireFirestoreHeaders } from './_sa.js';
import { APP_CONFIG_DOC, writeAuditLog } from './_store.js';
import {
  ROLES,
  SUPERADMIN_SESSION_TTL,
  clientIp,
  readSession,
  signSession
} from './_session.js';

const PRIMARY_OWNER = (process.env.FINKAS_PRIMARY_OWNER || '').toLowerCase().trim();

const sendJson = (res, status, payload) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
};

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (err) {
      return {};
    }
  }
  return {};
};

/* ── Superadmin whitelist helpers ─────────────────────────────────── */

/**
 * Read the superadmin email list from the server-only config document.
 * The primary owner is always included.
 * @returns {Promise<string[]>}
 */
async function getSuperadminList(headers) {
  try {
    const config = await fsGet(APP_CONFIG_DOC, headers);
    const raw = config?.superadmin_emails;
    const list = (Array.isArray(raw) ? raw : [])
      .map((v) => String(v || '').toLowerCase().trim())
      .filter(Boolean);
    if (PRIMARY_OWNER && !list.includes(PRIMARY_OWNER)) list.unshift(PRIMARY_OWNER);
    return list.length ? list : [];
  } catch (err) {
    console.error('[finkas] Failed to read superadmin list:', err?.message);
    return PRIMARY_OWNER ? [PRIMARY_OWNER] : [];
  }
}

/**
 * Persist the superadmin email list.
 */
async function saveSuperadminList(list, headers) {
  await fsPatch(APP_CONFIG_DOC, { superadmin_emails: list }, headers, ['superadmin_emails']);
}

/* ── Require a valid Super Admin session ─────────────────────────── */

/**
 * Verify that the request carries a valid, non-expired Super Admin session.
 * @returns {object|null} The session payload, or null.
 */
const requireSuperAdmin = (body) => {
  const session = readSession(body);
  if (!session || session.role !== ROLES.SUPERADMIN) return null;
  return session;
};

/* ── Actions ─────────────────────────────────────────────────────── */

async function loginWithGoogle(body, headers, ip) {
  const rawToken = String(body?.idToken || body?.accessToken || body?.token || '').trim();
  if (!rawToken) {
    return { code: 400, payload: { status: false, message: 'Token otentikasi Google diperlukan.' } };
  }

  // Verify the token with Google's tokeninfo endpoint.
  const isAccessToken = rawToken.startsWith('ya29.');
  const query = isAccessToken
    ? `access_token=${encodeURIComponent(rawToken)}`
    : `id_token=${encodeURIComponent(rawToken)}`;

  const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?${query}`);
  if (!googleRes.ok) {
    return { code: 401, payload: { status: false, message: 'Token Google tidak valid atau sudah kedaluwarsa.' } };
  }

  const gData = await googleRes.json();

  const DEFAULT_GOOGLE_CLIENT_ID = '837369279315-f8s1pp1c16gtoili3104bn5qv9nd0385.apps.googleusercontent.com';
  const expectedClientId = (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    DEFAULT_GOOGLE_CLIENT_ID
  ).trim();

  if (!isAccessToken) {
    if (!gData.aud || gData.aud !== expectedClientId) {
      return { code: 401, payload: { status: false, message: 'Audience token Google tidak cocok.' } };
    }
  }

  const isVerified = gData.email_verified === 'true' || gData.email_verified === true || gData.verified_email === true;
  if (!isVerified) {
    return { code: 401, payload: { status: false, message: 'Email Google belum diverifikasi.' } };
  }

  const verifiedEmail = (gData.email || '').toLowerCase().trim();
  if (!verifiedEmail) {
    return { code: 401, payload: { status: false, message: 'Email tidak ditemukan dalam respons Google.' } };
  }

  const allowedEmails = await getSuperadminList(headers);
  if (!allowedEmails.includes(verifiedEmail)) {
    await writeAuditLog('utama', 'LOGIN_GOOGLE_DITOLAK', `${verifiedEmail} dari ${ip}`, headers);
    return {
      code: 403,
      payload: { status: false, message: `Akun Google (${verifiedEmail}) bukan Super Admin pemilik Finkas.` }
    };
  }

  const sessionToken = signSession({ role: ROLES.SUPERADMIN, email: verifiedEmail }, SUPERADMIN_SESSION_TTL);
  await writeAuditLog('utama', 'LOGIN_SUPERADMIN_GOOGLE', `${verifiedEmail} dari ${ip}`, headers);

  return {
    code: 200,
    payload: {
      status: true,
      message: 'Login Super Admin Sukses!',
      data: {
        isSuperAdmin: true,
        isAdmin: true,
        role: ROLES.SUPERADMIN,
        email: verifiedEmail,
        name: gData.name || '',
        sessionToken
      }
    }
  };
}

async function listSuperAdmins(headers) {
  const emails = await getSuperadminList(headers);
  return {
    code: 200,
    payload: {
      status: true,
      data: emails.map((email) => ({ email, isPrimary: email === PRIMARY_OWNER }))
    }
  };
}

async function addSuperAdmin(body, headers) {
  const newEmail = String(body?.emailToAdd || '').trim().toLowerCase();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { code: 400, payload: { status: false, message: 'Format email tidak valid.' } };
  }

  const current = await getSuperadminList(headers);
  if (current.includes(newEmail)) {
    return { code: 400, payload: { status: false, message: 'Email tersebut sudah terdaftar sebagai Super Admin.' } };
  }

  const updated = [...current, newEmail];
  await saveSuperadminList(updated, headers);
  await writeAuditLog('utama', 'TAMBAH_SUPERADMIN', newEmail, headers);

  return { code: 200, payload: { status: true, message: `Email ${newEmail} berhasil ditambahkan sebagai Super Admin.`, data: updated } };
}

async function removeSuperAdmin(body, headers) {
  const removeEmail = String(body?.emailToRemove || '').trim().toLowerCase();
  if (PRIMARY_OWNER && removeEmail === PRIMARY_OWNER) {
    return { code: 400, payload: { status: false, message: 'Email Pemilik Utama tidak boleh dihapus.' } };
  }

  const current = await getSuperadminList(headers);
  if (!current.includes(removeEmail)) {
    return { code: 400, payload: { status: false, message: 'Email tersebut bukan Super Admin.' } };
  }

  const updated = current.filter((em) => em !== removeEmail);
  await saveSuperadminList(updated, headers);
  await writeAuditLog('utama', 'HAPUS_SUPERADMIN', removeEmail, headers);

  return { code: 200, payload: { status: true, message: `Akses Super Admin untuk ${removeEmail} telah dicabut.`, data: updated } };
}

const GUARDED_ACTIONS = {
  list: listSuperAdmins,
  add: addSuperAdmin,
  remove: removeSuperAdmin
};

/* ── Handler ─────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }

  try {
    const body = parseBody(req);
    const action = String(body?.action || 'login').trim();
    const headers = await requireFirestoreHeaders();
    const ip = clientIp(req);

    // Login does not require an existing session.
    if (action === 'login') {
      const result = await loginWithGoogle(body, headers, ip);
      return sendJson(res, result.code, result.payload);
    }

    // Every other action requires a valid Super Admin session.
    const guardedHandler = GUARDED_ACTIONS[action];
    if (!guardedHandler) {
      return sendJson(res, 400, { status: false, message: 'Aksi tidak dikenal.' });
    }

    if (!requireSuperAdmin(body)) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }

    const result = await guardedHandler(body, headers);
    return sendJson(res, result.code, result.payload);
  } catch (error) {
    console.error('[finkas] login-google error:', error?.message);
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan pada server autentikasi.' });
  }
}
