/**
 * Admin authentication.
 *
 * Two paths, both scrypt-verified and rate limited server-side:
 *   1. Group admin — password scoped to the group (`finkas-admin:{gid}`).
 *   2. Master admin — the owner password stored in the server-only
 *      `settings/app_config` document.
 *
 * The password is never echoed back, never compared with a bare SHA-256 (except
 * to accept a legacy hash once and immediately upgrade it), and never sent to
 * the client as a credential: the caller receives a signed, expiring session.
 */
import { requireFirestoreHeaders, fsGet, fsPatch } from './_sa.js';
import {
  APP_CONFIG_DOC,
  getPrivateConfig,
  groupDoc,
  isValidGroupId,
  setPrivateConfig,
  writeAuditLog
} from './_store.js';
import {
  GROUP_SESSION_TTL,
  ROLES,
  SUPERADMIN_SESSION_TTL,
  checkRateLimit,
  clearRateLimit,
  clientIp,
  hashSecret,
  registerFailedAttempt,
  secretMatches,
  signSession
} from './_session.js';

const MAX_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const INVALID_CREDENTIALS = 'Email atau Password Admin salah!';

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

/**
 * Whether the supplied email may authenticate against the stored one.
 *
 * A missing stored email means "password-only" credentials: they accept a blank
 * email and nothing else, so the caller's own arbitrary string is never adopted
 * as an identity. A stored email must match exactly — absence of a secret must
 * never widen access.
 */
const emailAllowed = (storedEmail, suppliedEmail) =>
  storedEmail ? storedEmail === suppliedEmail : !suppliedEmail;

/**
 * Verify a group admin password against the private config, falling back to the
 * legacy location on the group document and upgrading it when it matches.
 * @returns {Promise<{matches: boolean, email: string}>}
 */
async function verifyGroupAdmin(groupId, password, email, headers) {
  const config = await getPrivateConfig(groupId, headers);
  let storedHash = config?.admin_password_hash || '';
  let storedEmail = (config?.admin_email || '').toLowerCase().trim();
  let legacy = false;

  if (!storedHash) {
    const group = await fsGet(groupDoc(groupId), headers);
    storedHash = group?.admin_password_hash || '';
    storedEmail = storedEmail || (group?.admin_email || '').toLowerCase().trim();
    legacy = Boolean(storedHash);
  }
  if (!storedHash) return { matches: false, email: '' };

  const matches =
    emailAllowed(storedEmail, email) &&
    secretMatches(password, storedHash, `finkas-admin:${groupId}`, `finkas-admin:${groupId}`);
  if (!matches) return { matches: false, email: storedEmail };

  if (legacy) {
    const upgraded = { admin_password_hash: hashSecret(password, `finkas-admin:${groupId}`) };
    if (storedEmail) upgraded.admin_email = storedEmail;
    await setPrivateConfig(groupId, upgraded, headers);
    await fsPatch(groupDoc(groupId), { admin_password_hash: null, admin_email: null }, headers,
      ['admin_password_hash', 'admin_email']
    ).catch((err) => console.error('[finkas] Legacy admin hash cleanup failed:', err?.message));
  }

  return { matches: true, email: storedEmail };
}

/**
 * Verify the master (owner) password and upgrade a legacy digest when it matches.
 * @returns {Promise<boolean>}
 */
async function verifyMasterPassword(password, headers) {
  const config = await fsGet(APP_CONFIG_DOC, headers);
  const storedHash = config?.admin_password_hash || '';
  if (!storedHash) return false;

  const matches = secretMatches(password, storedHash, 'finkas-master', '');
  if (!matches) return false;

  if (!storedHash.startsWith('scrypt$')) {
    await fsPatch(APP_CONFIG_DOC, { admin_password_hash: hashSecret(password, 'finkas-master') }, headers,
      ['admin_password_hash']
    ).catch((err) => console.error('[finkas] Master hash upgrade failed:', err?.message));
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }

  try {
    const body = parseBody(req);
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();
    const groupId = String(body?.groupId || '').trim();

    if (!password) {
      return sendJson(res, 400, { status: false, message: 'Password tidak boleh kosong.' });
    }
    if (groupId && !isValidGroupId(groupId)) {
      return sendJson(res, 400, { status: false, message: 'ID grup tidak valid.' });
    }

    const ip = clientIp(req);
    const ipKey = `login-ip:${ip}`;
    const idKey = `login-id:${groupId || email || 'master'}`;

    for (const key of [ipKey, idKey]) {
      const lock = await checkRateLimit(key);
      if (lock.locked) {
        return sendJson(res, 429, {
          status: false,
          message: `Terlalu banyak percobaan masuk. Coba lagi dalam ${lock.retryAfterSec} detik.`,
          data: { retryAfterSec: lock.retryAfterSec }
        });
      }
    }

    const headers = await requireFirestoreHeaders();

    // ── 1. Group admin ────────────────────────────────────────────────
    if (groupId) {
      const groupResult = await verifyGroupAdmin(groupId, password, email, headers);
      if (groupResult.matches) {
        await Promise.all([clearRateLimit(ipKey), clearRateLimit(idKey)]);
        await writeAuditLog(groupId, 'LOGIN_ADMIN', `Login admin grup dari ${ip}`, headers);
        return sendJson(res, 200, {
          status: true,
          message: 'Login Admin Grup Berhasil!',
          data: {
            sessionToken: signSession({ role: ROLES.GROUP_ADMIN, gid: groupId }, GROUP_SESSION_TTL),
            isAdmin: true,
            isSuperAdmin: false,
            role: ROLES.GROUP_ADMIN,
            groupId,
            email: groupResult.email
          }
        });
      }
    }

    // ── 2. Master admin (owner) ───────────────────────────────────────
    if (await verifyMasterPassword(password, headers)) {
      await Promise.all([clearRateLimit(ipKey), clearRateLimit(idKey)]);
      await writeAuditLog(groupId || 'utama', 'LOGIN_ADMIN', `Login master admin dari ${ip}`, headers);
      return sendJson(res, 200, {
        status: true,
        message: 'Login Master Admin Sukses!',
        data: {
          sessionToken: signSession({ role: ROLES.SUPERADMIN }, SUPERADMIN_SESSION_TTL),
          isAdmin: true,
          isSuperAdmin: true,
          role: ROLES.SUPERADMIN,
          groupId
        }
      });
    }

    await registerFailedAttempt(ipKey, MAX_ATTEMPTS, LOCK_WINDOW_MS);
    await registerFailedAttempt(idKey, MAX_ATTEMPTS, LOCK_WINDOW_MS);
    const auditGroup = groupId || 'utama';
    await writeAuditLog(auditGroup, 'LOGIN_GAGAL', `Percobaan gagal dari ${ip}`, headers);

    return sendJson(res, 401, { status: false, message: INVALID_CREDENTIALS });
  } catch (error) {
    console.error('[finkas] login error:', error?.message);
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan pada server autentikasi.' });
  }
}
