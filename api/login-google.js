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
import { APP_CONFIG_DOC, readSuperadminEmails, writeAuditLog } from './_store.js';
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
 * Persist the superadmin email list.
 */
async function saveSuperadminList(list, headers) {
  await fsPatch(APP_CONFIG_DOC, { superadmin_emails: list }, headers, ['superadmin_emails']);
}

/* ── Require a valid Super Admin session ─────────────────────────── */

/**
 * Verify a live Super Admin session whose email is STILL on the whitelist.
 *
 * A signature and a role are not enough: `remove` only edits the email list,
 * so a session minted before that removal stays cryptographically valid for
 * its whole TTL (30 days). Re-checking the email here is what makes a
 * revocation take effect. The check runs before any Firestore call, so a
 * removed admin is refused even when the database is unreachable.
 * @returns {Promise<{session: object, emails: string[]}|null>}
 */
const requireSuperAdmin = async (body, headers) => {
  const session = readSession(body);
  if (!session || session.role !== ROLES.SUPERADMIN) return null;

  const email = String(session.email || '').toLowerCase().trim();
  if (!email) return null;

  const emails = await readSuperadminEmails(headers);
  if (!emails.includes(email)) return null;

  return { session, emails };
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

  // Verify the audience for BOTH token types. An id_token carries the client_id
  // in `aud`; an access token minted by our initTokenClient carries it in
  // `aud`/`azp` on tokeninfo. Skipping this for access tokens let a `ya29.`
  // token issued to ANY other Google app (with the email scope) mint a Super
  // Admin session for a whitelisted email — a full auth bypass.
  const tokenAudience = gData.aud || gData.azp || '';
  if (tokenAudience !== expectedClientId) {
    return { code: 401, payload: { status: false, message: 'Audience token Google tidak cocok.' } };
  }

  const isVerified = gData.email_verified === 'true' || gData.email_verified === true || gData.verified_email === true;
  if (!isVerified) {
    return { code: 401, payload: { status: false, message: 'Email Google belum diverifikasi.' } };
  }

  const verifiedEmail = (gData.email || '').toLowerCase().trim();
  if (!verifiedEmail) {
    return { code: 401, payload: { status: false, message: 'Email tidak ditemukan dalam respons Google.' } };
  }

  const allowedEmails = await readSuperadminEmails(headers);
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

async function listSuperAdmins(emails) {
  return {
    code: 200,
    payload: {
      status: true,
      data: emails.map((email) => ({ email, isPrimary: email === PRIMARY_OWNER }))
    }
  };
}

async function addSuperAdmin(body, headers, emails) {
  const newEmail = String(body?.emailToAdd || '').trim().toLowerCase();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { code: 400, payload: { status: false, message: 'Format email tidak valid.' } };
  }

  if (emails.includes(newEmail)) {
    return { code: 400, payload: { status: false, message: 'Email tersebut sudah terdaftar sebagai Super Admin.' } };
  }

  const updated = [...emails, newEmail];
  await saveSuperadminList(updated, headers);
  await writeAuditLog('utama', 'TAMBAH_SUPERADMIN', newEmail, headers);

  return { code: 200, payload: { status: true, message: `Email ${newEmail} berhasil ditambahkan sebagai Super Admin.`, data: updated } };
}

async function removeSuperAdmin(body, headers, emails) {
  const removeEmail = String(body?.emailToRemove || '').trim().toLowerCase();
  if (PRIMARY_OWNER && removeEmail === PRIMARY_OWNER) {
    return { code: 400, payload: { status: false, message: 'Email Pemilik Utama tidak boleh dihapus.' } };
  }

  if (!emails.includes(removeEmail)) {
    return { code: 400, payload: { status: false, message: 'Email tersebut bukan Super Admin.' } };
  }

  const updated = emails.filter((em) => em !== removeEmail);
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

    // Login does not require an existing session.
    if (action === 'login') {
      const headers = await requireFirestoreHeaders();
      const ip = clientIp(req);
      const result = await loginWithGoogle(body, headers, ip);
      return sendJson(res, result.code, result.payload);
    }

    // Reject what can be rejected with no database first: a missing, expired,
    // wrongly-signed, or email-less session is a 403, never a 500, even when
    // Firestore is unreachable. The whitelist check below needs credentials.
    const session = readSession(body);
    if (!session || session.role !== ROLES.SUPERADMIN) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }
    if (!String(session.email || '').trim()) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }

    const headers = await requireFirestoreHeaders();
    const auth = await requireSuperAdmin(body, headers);
    if (!auth) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }

    const guardedHandler = GUARDED_ACTIONS[action];
    if (!guardedHandler) {
      return sendJson(res, 400, { status: false, message: 'Aksi tidak dikenal.' });
    }

    const result = action === 'list'
      ? await guardedHandler(auth.emails)
      : await guardedHandler(body, headers, auth.emails);
    return sendJson(res, result.code, result.payload);
  } catch (error) {
    console.error('[finkas] login-google error:', error?.message);
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan pada server autentikasi.' });
  }
}
