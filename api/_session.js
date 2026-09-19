/**
 * Session tokens, password hashing and server-side rate limiting for Finkas.
 *
 * Sessions are HMAC-signed, carry an explicit expiry and are verified on every
 * request. Password secrets are stored with scrypt (memory-hard) instead of a
 * bare SHA-256 digest.
 */
import crypto from 'node:crypto';
import { constantTimeEqual, getServiceAccount, fsGet, fsPatch, requireFirestoreHeaders } from './_sa.js';

/** Roles granted by a session. */
export const ROLES = {
  MEMBER: 'member',
  GROUP_ADMIN: 'group_admin',
  SUPERADMIN: 'superadmin'
};

export const GROUP_SESSION_TTL = 30 * 24 * 60 * 60; // 30 hari
export const SUPERADMIN_SESSION_TTL = 8 * 60 * 60;

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };
const RATE_LIMIT_COLLECTION = '_ratelimit';

/* ── Signing secret ──────────────────────────────────────────────── */

let sessionSecretCache = null;

/**
 * Resolve the HMAC secret used to sign sessions.
 *
 * Only server-held secrets are eligible: an explicit env var, or the service
 * account private key. Never a project id or a literal constant, both of which
 * are public.
 * @returns {string}
 */
export function getSessionSecret() {
  if (sessionSecretCache) return sessionSecretCache;

  const fromEnv = process.env.FINKAS_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    sessionSecretCache = fromEnv;
    return sessionSecretCache;
  }
  if (fromEnv) {
    console.error('[finkas] FINKAS_SESSION_SECRET is shorter than 32 characters; ignoring it.');
  }

  const sa = getServiceAccount();
  if (sa?.private_key) {
    sessionSecretCache = crypto.createHash('sha256').update(sa.private_key).digest('hex');
    return sessionSecretCache;
  }

  throw new Error('Session secret tidak tersedia. Set FINKAS_SESSION_SECRET atau konfigurasi service account.');
}

const hmac = (input) =>
  crypto.createHmac('sha256', getSessionSecret()).update(input).digest();

/* ── Session tokens ──────────────────────────────────────────────── */

/**
 * Issue a signed session token.
 * @param {{role: string, gid?: string, email?: string}} claims
 * @param {number} ttlSeconds
 * @returns {string}
 */
export function signSession(claims, ttlSeconds) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    role: claims.role,
    gid: claims.gid || '',
    email: claims.email || '',
    iat: issuedAt,
    exp: issuedAt + ttlSeconds
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body).toString('base64url')}`;
}

/**
 * Verify a signed session token.
 * @param {string} token
 * @returns {{role: string, gid: string, email: string, exp: number}|null}
 */
export function verifySession(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  let expected;
  try {
    expected = hmac(body).toString('base64url');
  } catch (err) {
    console.error('[finkas] Cannot verify session:', err?.message);
    return null;
  }
  if (!constantTimeEqual(signature, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (err) {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number') return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  if (!Object.values(ROLES).includes(payload.role)) return null;

  return payload;
}

/**
 * Resolve the caller's session from a request body.
 * @param {object} body
 */
export const readSession = (body) => verifySession(String(body?.sessionToken || '').trim());

/**
 * True when the session may read the given group's data.
 * @param {object|null} session
 * @param {string} groupId
 */
export const canReadGroup = (session, groupId) => {
  if (!session) return false;
  if (session.role === ROLES.SUPERADMIN) return true;
  return Boolean(groupId) && session.gid === groupId;
};

/**
 * True when the session may mutate the given group's data.
 * @param {object|null} session
 * @param {string} groupId
 */
export const canWriteGroup = (session, groupId) => {
  if (!session) return false;
  if (session.role === ROLES.SUPERADMIN) return true;
  return session.role === ROLES.GROUP_ADMIN && Boolean(groupId) && session.gid === groupId;
};

/* ── Secret hashing (scrypt) ─────────────────────────────────────── */

/**
 * Hash a secret with scrypt under a per-credential scope.
 * @param {string} secret
 * @param {string} scope Extra entropy bound into the hash (e.g. `finkas-admin:GRP-1`).
 * @returns {string} `scrypt$N$r$p$salt$key`
 */
export function hashSecret(secret, scope = '') {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(`${scope}\u0000${secret}`, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });
  return [
    'scrypt',
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString('base64url'),
    derived.toString('base64url')
  ].join('$');
}

/**
 * Verify a secret against a stored scrypt hash.
 * @returns {boolean}
 */
export function verifyHashedSecret(secret, stored, scope = '') {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, n, r, p, saltB64, keyB64] = parts;
  try {
    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(keyB64, 'base64url');
    const derived = crypto.scryptSync(`${scope}\u0000${secret}`, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p)
    });
    return crypto.timingSafeEqual(derived, expected);
  } catch (err) {
    console.error('[finkas] scrypt verification failed:', err?.message);
    return false;
  }
}

/**
 * Legacy digest used by pre-upgrade deployments.
 * @param {string} secret
 * @param {string} prefix e.g. `finkas-admin:GRP-1`
 */
export const legacyDigest = (secret, prefix = '') =>
  crypto.createHash('sha256').update(prefix ? `${prefix}:${secret}` : secret).digest('hex');

/**
 * Verify a secret against a stored hash in either the current (scrypt) or the
 * legacy (single-round SHA-256) format, so pre-upgrade installations keep
 * working while their hashes are upgraded on next successful use.
 * @param {string} secret
 * @param {string} stored
 * @param {string} scope Domain separator bound into the scrypt hash.
 * @param {string} [legacyPrefix] Prefix previously bound into the legacy digest.
 * @returns {boolean}
 */
export function secretMatches(secret, stored, scope, legacyPrefix = '') {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) return verifyHashedSecret(secret, stored, scope);
  return constantTimeEqual(legacyDigest(secret, legacyPrefix), stored);
}

/* ── Server-side rate limiting ───────────────────────────────────── */

const rateLimitKey = (key) =>
  `${RATE_LIMIT_COLLECTION}/${crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)}`;

/**
 * Record a failed attempt and report whether the caller is now locked out.
 * Counter state lives in Firestore so it survives cold starts and cannot be
 * reset from the browser.
 * @param {string} key Stable identity for the attempt (e.g. `pin:GRP-1:1.2.3.4`).
 * @param {number} maxAttempts
 * @param {number} windowMs
 * @returns {Promise<{locked: boolean, retryAfterSec: number}>}
 */
export async function registerFailedAttempt(key, maxAttempts, windowMs) {
  try {
    const headers = await requireFirestoreHeaders();
    const path = rateLimitKey(key);
    const now = Date.now();
    const existing = await fsGet(path, headers);

    const withinWindow = existing && Number(existing.until || 0) > now;
    const count = (withinWindow ? Number(existing.count) || 0 : 0) + 1;
    const locked = count >= maxAttempts;
    const lockUntil = locked ? now + windowMs : (withinWindow ? Number(existing.until) : 0);

    await fsPatch(path, { count, until: lockUntil, updatedAt: new Date().toISOString() }, headers);
    return { locked, retryAfterSec: locked ? Math.ceil(windowMs / 1000) : 0 };
  } catch (err) {
    console.error('[finkas] Rate limit write failed:', err?.message);
    return { locked: false, retryAfterSec: 0 };
  }
}

/**
 * Report whether an identity is currently locked out.
 * @returns {Promise<{locked: boolean, retryAfterSec: number}>}
 */
export async function checkRateLimit(key) {
  try {
    const headers = await requireFirestoreHeaders();
    const existing = await fsGet(rateLimitKey(key), headers);
    const until = Number(existing?.until || 0);
    const now = Date.now();
    if (until > now) {
      return { locked: true, retryAfterSec: Math.ceil((until - now) / 1000) };
    }
    return { locked: false, retryAfterSec: 0 };
  } catch (err) {
    console.error('[finkas] Rate limit read failed:', err?.message);
    return { locked: false, retryAfterSec: 0 };
  }
}

/** Clear the attempt counter after a successful authentication. */
export async function clearRateLimit(key) {
  try {
    const headers = await requireFirestoreHeaders();
    await fsPatch(rateLimitKey(key), { count: 0, until: 0 }, headers);
  } catch (err) {
    console.error('[finkas] Rate limit clear failed:', err?.message);
  }
}

/**
 * Best-effort client IP extraction behind a proxy.
 * Prefers x-real-ip from the edge or the rightmost x-forwarded-for entry to prevent
 * spoofed-header rate-limit bypasses.
 */
export const clientIp = (req) => {
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.trim().length) return real.trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.socket?.remoteAddress || 'unknown';
};
