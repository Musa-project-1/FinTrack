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
import { enforceSameOrigin, parseBody, sendJson, type JsonBody } from './_http.ts';
import type { ApiHandlerResult, ApiRequest, ApiResponse, FirestoreHeaders } from '../src/types/finkas.d.ts';
import { fsPatch, requireFirestoreHeaders } from './_sa.ts';
import { APP_CONFIG_DOC, readSuperadminEmails, writeAuditLog } from './_store.ts';
import {
  ROLES,
  RateLimitUnavailableError,
  SUPERADMIN_SESSION_TTL,
  type VerifiedSessionClaims,
  checkRateLimit,
  clearRateLimit,
  clientIp,
  isSessionRevoked,
  readSession,
  registerFailedAttempt,
  signSession
} from './_session.ts';

const DEFAULT_GOOGLE_CLIENT_ID = '837369279315-f8s1pp1c16gtoili3104bn5qv9nd0385.apps.googleusercontent.com';
const GOOGLE_TOKENINFO_TIMEOUT_MS = 8000;
const MAX_GOOGLE_ATTEMPTS_IP = 10;
const GOOGLE_LOCK_WINDOW_MS = 15 * 60 * 1000;
const GOOGLE_TOKEN_RE = /^[A-Za-z0-9._-]{1,4096}$/;
const VALID_GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

let warnedDefaultClientId = false;

const getPrimaryOwner = () => (process.env.FINKAS_PRIMARY_OWNER || '').toLowerCase().trim();

function getExpectedGoogleClientId(): string {
  const configured = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (configured) return configured;
  if (!warnedDefaultClientId) {
    warnedDefaultClientId = true;
    console.warn('[finkas] GOOGLE_CLIENT_ID is not set; falling back to default public OAuth client ID.');
  }
  return DEFAULT_GOOGLE_CLIENT_ID;
}

/* ── Superadmin whitelist helpers ─────────────────────────────────── */

/** Persist the superadmin email list. */
async function saveSuperadminList(list: string[], headers: FirestoreHeaders) {
  await fsPatch(APP_CONFIG_DOC, { superadmin_emails: list }, headers, ['superadmin_emails']);
}

/* ── Require a valid Super Admin session ─────────────────────────── */

/** Verify a live Super Admin session whose email is STILL on the whitelist
 * and whose token has not been revoked. */
const requireSuperAdmin = async (
  session: VerifiedSessionClaims,
  headers: FirestoreHeaders
): Promise<{session: VerifiedSessionClaims, emails: string[]}|null> => {
  if (session.role !== ROLES.SUPERADMIN) return null;

  const email = String(session.email || '').toLowerCase().trim();
  if (!email) return null;

  if (await isSessionRevoked(session, headers)) return null;

  const emails = await readSuperadminEmails(headers);
  if (!emails.includes(email)) return null;

  return { session, emails };
};

/* ── Actions ─────────────────────────────────────────────────────── */

async function recordGoogleFailure(ipKey: string, code: number, message: string): Promise<ApiHandlerResult> {
  const attempt = await registerFailedAttempt(ipKey, MAX_GOOGLE_ATTEMPTS_IP, GOOGLE_LOCK_WINDOW_MS);
  if (attempt.locked) {
    return {
      code: 429,
      payload: {
        status: false,
        message: `Terlalu banyak percobaan login Google. Coba lagi dalam ${attempt.retryAfterSec} detik.`,
        data: { retryAfterSec: attempt.retryAfterSec }
      }
    };
  }
  return { code, payload: { status: false, message } };
}

async function loginWithGoogle(rawToken: string, headers: FirestoreHeaders, ip: string, ipKey: string) {
  // Verify the token with Google's tokeninfo endpoint.
  const isAccessToken = rawToken.startsWith('ya29.');
  const query = isAccessToken
    ? `access_token=${encodeURIComponent(rawToken)}`
    : `id_token=${encodeURIComponent(rawToken)}`;

  const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?${query}`, {
    signal: AbortSignal.timeout(GOOGLE_TOKENINFO_TIMEOUT_MS)
  });
  if (!googleRes.ok) {
    return recordGoogleFailure(ipKey, 401, 'Token Google tidak valid atau sudah kedaluwarsa.');
  }

  const gData = await googleRes.json();
  const expectedClientId = getExpectedGoogleClientId();

  // Verify the audience for BOTH token types. An id_token carries the client_id
  // in `aud`; an access token minted by our initTokenClient carries it in
  // `aud`/`azp` on tokeninfo.
  const tokenAudience = gData?.aud || gData?.azp || '';
  if (typeof tokenAudience !== 'string' || tokenAudience !== expectedClientId) {
    return recordGoogleFailure(ipKey, 401, 'Audience token Google tidak cocok.');
  }

  if (!isAccessToken && gData?.iss !== undefined && !VALID_GOOGLE_ISSUERS.has(String(gData.iss))) {
    return recordGoogleFailure(ipKey, 401, 'Issuer token Google tidak valid.');
  }

  const isVerified = gData?.email_verified === 'true' || gData?.email_verified === true || gData?.verified_email === true;
  if (!isVerified) {
    return recordGoogleFailure(ipKey, 401, 'Email Google belum diverifikasi.');
  }

  const verifiedEmail = String(gData?.email || '').toLowerCase().trim();
  if (!verifiedEmail) {
    return recordGoogleFailure(ipKey, 401, 'Email tidak ditemukan dalam respons Google.');
  }

  const allowedEmails = await readSuperadminEmails(headers);
  if (!allowedEmails.includes(verifiedEmail)) {
    await writeAuditLog('utama', 'LOGIN_GOOGLE_DITOLAK', `${verifiedEmail} dari ${ip}`, headers);
    return recordGoogleFailure(ipKey, 403, `Akun Google (${verifiedEmail}) bukan Super Admin pemilik Finkas.`);
  }

  await clearRateLimit(ipKey);
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

async function listSuperAdmins(emails: string[]) {
  const primaryOwner = getPrimaryOwner();
  return {
    code: 200,
    payload: {
      status: true,
      data: emails.map((email) => ({ email, isPrimary: Boolean(primaryOwner) && email === primaryOwner }))
    }
  };
}

async function addSuperAdmin(body: JsonBody, headers: FirestoreHeaders, emails: string[]) {
  const newEmail = String(body?.emailToAdd || '').trim().toLowerCase();
  if (!newEmail || newEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
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

async function removeSuperAdmin(body: JsonBody, headers: FirestoreHeaders, emails: string[]) {
  const removeEmail = String(body?.emailToRemove || '').trim().toLowerCase();
  const primaryOwner = getPrimaryOwner();
  if (primaryOwner && removeEmail === primaryOwner) {
    return { code: 400, payload: { status: false, message: 'Email Pemilik Utama tidak boleh dihapus.' } };
  }

  if (!emails.includes(removeEmail)) {
    return { code: 400, payload: { status: false, message: 'Email tersebut bukan Super Admin.' } };
  }

  const updated = emails.filter((em) => em !== removeEmail);
  if (updated.length === 0) {
    return { code: 400, payload: { status: false, message: 'Minimal satu email Super Admin harus tetap terdaftar.' } };
  }

  await saveSuperadminList(updated, headers);
  await writeAuditLog('utama', 'HAPUS_SUPERADMIN', removeEmail, headers);

  return { code: 200, payload: { status: true, message: `Akses Super Admin untuk ${removeEmail} telah dicabut.`, data: updated } };
}

const GUARDED_ACTIONS: Record<string, (body: JsonBody, headers: FirestoreHeaders, emails: string[]) => Promise<ApiHandlerResult>> = {
  list: (_body, _headers, emails) => listSuperAdmins(emails),
  add: addSuperAdmin,
  remove: removeSuperAdmin
};

/* ── Handler ─────────────────────────────────────────────────────── */

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }
  if (!enforceSameOrigin(req, res)) return;

  try {
    const body = parseBody(req);
    const action = String(body?.action || 'login').trim();

    // Login does not require an existing session.
    if (action === 'login') {
      const rawToken = String(body?.idToken || body?.accessToken || body?.token || '').trim();
      if (!rawToken) {
        return sendJson(res, 400, { status: false, message: 'Token otentikasi Google diperlukan.' });
      }
      if (!GOOGLE_TOKEN_RE.test(rawToken)) {
        return sendJson(res, 400, { status: false, message: 'Format token Google tidak valid.' });
      }

      const ip = clientIp(req);
      const ipKey = `google-login-ip:${ip}`;
      const lock = await checkRateLimit(ipKey);
      if (lock.locked) {
        return sendJson(res, 429, {
          status: false,
          message: `Terlalu banyak percobaan login Google. Coba lagi dalam ${lock.retryAfterSec} detik.`,
          data: { retryAfterSec: lock.retryAfterSec }
        });
      }

      const headers = await requireFirestoreHeaders();
      const result = await loginWithGoogle(rawToken, headers, ip, ipKey);
      return sendJson(res, result.code, result.payload);
    }

    // Reject what can be rejected with no database first: a missing, expired,
    // wrongly-signed, or email-less session is a 403, never a 500, even when
    // Firestore is unreachable. The revocation and whitelist checks below need credentials.
    const session = readSession(body);
    if (!session || session.role !== ROLES.SUPERADMIN) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }
    if (!String(session.email || '').trim()) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }

    const headers = await requireFirestoreHeaders();
    const auth = await requireSuperAdmin(session, headers);
    if (!auth) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }

    if (!Object.hasOwn(GUARDED_ACTIONS, action)) {
      return sendJson(res, 400, { status: false, message: 'Aksi tidak dikenal.' });
    }

    const result = await GUARDED_ACTIONS[action](body, headers, auth.emails);
    return sendJson(res, result.code, result.payload);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return sendJson(res, 503, { status: false, message: error.message });
    }
    console.error('[finkas] login-google error:', (error instanceof Error ? error.message : String(error)));
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan pada server autentikasi.' });
  }
}
