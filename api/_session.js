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
export const SUPERADMIN_SESSION_TTL = 30 * 24 * 60 * 60; // 30 hari

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
 * Supports server-side revocation if groupInfo.revokedAfter is present.
 *
 * When `superadminEmails` is given, a superadmin session is trusted only while
 * its email is still on that list. Omitting it keeps the role-only check, for
 * callers that have not loaded the whitelist yet.
 * @param {object|null} session
 * @param {string} groupId
 * @param {object|null} [groupInfo]
 * @param {string[]|null} [superadminEmails]
 */
export const canReadGroup = (session, groupId, groupInfo = null, superadminEmails = null) => {
  if (!session) return false;
  if (session.role === ROLES.SUPERADMIN) {
    if (!superadminEmails) return true;
    const email = String(session.email || '').toLowerCase().trim();
    return Boolean(email) && superadminEmails.includes(email);
  }
  if (!groupId || session.gid !== groupId) return false;
  if (groupInfo?.revokedAfter && typeof session.iat === 'number') {
    const revokedSec = typeof groupInfo.revokedAfter === 'number'
      ? groupInfo.revokedAfter
      : Math.floor(new Date(groupInfo.revokedAfter).getTime() / 1000);
    if (session.iat < revokedSec) return false;
  }
  return true;
};

/**
 * True when the session may mutate the given group's data.
 * Supports server-side revocation if groupInfo.revokedAfter is present.
 * @param {object|null} session
 * @param {string} groupId
 * @param {object|null} [groupInfo]
 * @param {string[]|null} [superadminEmails] See canReadGroup.
 */
export const canWriteGroup = (session, groupId, groupInfo = null, superadminEmails = null) => {
  if (!session) return false;
  if (session.role === ROLES.SUPERADMIN) {
    if (!superadminEmails) return true;
    const email = String(session.email || '').toLowerCase().trim();
    return Boolean(email) && superadminEmails.includes(email);
  }
  if (session.role !== ROLES.GROUP_ADMIN || !groupId || session.gid !== groupId) return false;
  if (groupInfo?.revokedAfter && typeof session.iat === 'number') {
    const revokedSec = typeof groupInfo.revokedAfter === 'number'
      ? groupInfo.revokedAfter
      : Math.floor(new Date(groupInfo.revokedAfter).getTime() / 1000);
    if (session.iat < revokedSec) return false;
  }
  return true;
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
 * Next counter state after one failed attempt.
 *
 * The window opens on the first failure (`since`), not on the lock. Judging
 * the window by `until` resets the count forever, because `until` stays 0
 * until the attempt that finally locks.
 *
 * @param {{count?: number, since?: number}|null} existing
 * @param {number} now
 * @param {number} maxAttempts
 * @param {number} windowMs
 * @returns {{count: number, since: number, until: number, locked: boolean}}
 */
export function nextFailedAttempt(existing, now, maxAttempts, windowMs) {
  const since = Number(existing?.since) || 0;
  const open = since > 0 && now < since + windowMs;
  const count = (open ? Number(existing.count) || 0 : 0) + 1;
  const locked = count >= maxAttempts;
  return {
    count,
    since: open ? since : now,
    until: locked ? now + windowMs : 0,
    locked
  };
}

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
    const next = nextFailedAttempt(existing, now, maxAttempts, windowMs);

    await fsPatch(path, {
      count: next.count,
      since: next.since,
      until: next.until,
      updatedAt: new Date(now).toISOString()
    }, headers);
    return { locked: next.locked, retryAfterSec: next.locked ? Math.ceil(windowMs / 1000) : 0 };
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

/* ── In-memory read rate limiting (per warm instance, zero Firestore cost) ── */

/** @type {Map<string, {count: number, windowStart: number}>} */
const readCounters = new Map();
const READ_WINDOW_MS = 60_000;
const READ_MAX_PER_WINDOW = 120; // ~2 reads/sec sustained per identity

/**
 * Best-effort in-memory sliding-window limiter for read traffic.
 *
 * Keyed by a stable per-caller identity so one client cannot hammer expensive
 * reads (a full group pull lists four collections) to run up Firestore read
 * costs. Deliberately memory-only: it adds NO Firestore writes, so reads stay
 * cheap, and it resets on cold start — acceptable for a cost guard rather than a
 * security boundary. A single abusive client mostly reuses one warm instance,
 * where this cap bites.
 *
 * @param {string} key Stable identity, e.g. `read:GRP-1:1.2.3.4`.
 * @param {number} [maxPerWindow]
 * @param {number} [windowMs]
 * @returns {{limited: boolean, retryAfterSec: number}}
 */
export function checkReadRateLimit(key, maxPerWindow = READ_MAX_PER_WINDOW, windowMs = READ_WINDOW_MS) {
  const now = Date.now();
  const entry = readCounters.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    readCounters.set(key, { count: 1, windowStart: now });
    // Opportunistic cleanup so the map cannot grow without bound.
    if (readCounters.size > 5000) {
      for (const [k, v] of readCounters) {
        if (now - v.windowStart >= windowMs) readCounters.delete(k);
      }
    }
    return { limited: false, retryAfterSec: 0 };
  }

  entry.count += 1;
  if (entry.count > maxPerWindow) {
    return { limited: true, retryAfterSec: Math.ceil((entry.windowStart + windowMs - now) / 1000) };
  }
  return { limited: false, retryAfterSec: 0 };
}

/**
 * Best-effort client IP extraction behind a proxy.
 * Prefers x-real-ip from the edge or the rightmost x-forwarded-for entry to prevent
 * spoofed-header rate-limit bypasses.
 */
export const clientIp = (req) => {
  const headers = req?.headers || {};
  const real = headers['x-real-ip'];
  if (typeof real === 'string' && real.trim().length) return real.trim();

  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req?.socket?.remoteAddress || 'unknown';
};
