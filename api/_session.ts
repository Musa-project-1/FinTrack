/**
 * Session tokens, password hashing and server-side rate limiting for Finkas.
 *
 * Sessions are HMAC-signed, carry an explicit expiry and are verified on every
 * request. Password secrets are stored with scrypt (memory-hard) instead of a
 * bare SHA-256 digest.
 */
import type { ApiRequest, SessionClaims } from '../src/types/finkas.d.ts';
import crypto from 'node:crypto';
import { constantTimeEqual, getServiceAccount, fsGet, fsPatch, requireFirestoreHeaders } from './_sa.ts';

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

let sessionSecretCache: string|null = null;

/** Resolve the HMAC secret used to sign sessions.
 *
 * Only server-held secrets are eligible: an explicit env var, or the service
 * account private key. Never a project id or a literal constant, both of which
 * are public. */
export function getSessionSecret(): string {
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

const hmac = (input: string) =>
  crypto.createHmac('sha256', getSessionSecret()).update(input).digest();

/* ── Session tokens ──────────────────────────────────────────────── */

/** Issue a signed session token. */
export function signSession(claims: {role: string, gid?: string, email?: string}, ttlSeconds: number): string {
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

/** Verify a signed session token. */
export function verifySession(token: string): SessionClaims | null {
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
  if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  if (!Object.values(ROLES).includes(payload.role)) return null;

  if (payload.iat !== undefined && (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat))) return null;
  if ((payload.role === ROLES.MEMBER || payload.role === ROLES.GROUP_ADMIN) &&
      (typeof payload.gid !== 'string' || !payload.gid.trim())) return null;

  return payload;
}

/** Resolve the caller's session from a request body. */
export const readSession = (body: {sessionToken?: string}) => verifySession(String(body?.sessionToken || '').trim());

interface SessionGroup {
  groupId?: string;
  revokedAfter?: number | string;
}

function matchesGroupInfo(session: SessionClaims, groupId: string, groupInfo: SessionGroup | null) {
  if (groupInfo?.groupId && String(groupInfo.groupId).trim() !== groupId) return false;
  const revokedAfter = groupInfo?.revokedAfter;
  if (session.role === ROLES.SUPERADMIN || revokedAfter == null || revokedAfter === '') return true;
  const revokedSec = typeof revokedAfter === 'number'
    ? revokedAfter
    : Math.floor(new Date(revokedAfter).getTime() / 1000);
  return !Number.isFinite(revokedSec) ||
    (typeof session.iat === 'number' && Number.isFinite(session.iat) && session.iat >= revokedSec);
}

/** True when the session may read the given group's data.
 * Supports server-side revocation if groupInfo.revokedAfter is present.
 *
 * When `superadminEmails` is given, a superadmin session is trusted only while
 * its email is still on that list. Omitting it keeps the role-only check, for
 * callers that have not loaded the whitelist yet. */
export const canReadGroup = (
  session: SessionClaims | null,
  groupId: string,
  groupInfo: SessionGroup | null = null,
  superadminEmails: string[] | null = null
) => {
  if (!session || !matchesGroupInfo(session, groupId, groupInfo)) return false;
  if (session.role === ROLES.SUPERADMIN) {
    if (!superadminEmails) return true;
    const email = String(session.email || '').toLowerCase().trim();
    return Boolean(email) && superadminEmails.includes(email);
  }
  return Boolean(groupId) && session.gid === groupId;
};

/** True when the session may mutate the given group's data.
 * Supports server-side revocation if groupInfo.revokedAfter is present. */
export const canWriteGroup = (
  session: SessionClaims | null,
  groupId: string,
  groupInfo: SessionGroup | null = null,
  superadminEmails: string[] | null = null
) => {
  if (!session || !matchesGroupInfo(session, groupId, groupInfo)) return false;
  if (session.role === ROLES.SUPERADMIN) {
    if (!superadminEmails) return true;
    const email = String(session.email || '').toLowerCase().trim();
    return Boolean(email) && superadminEmails.includes(email);
  }
  return session.role === ROLES.GROUP_ADMIN && Boolean(groupId) && session.gid === groupId;
};

/* ── Secret hashing (scrypt) ─────────────────────────────────────── */

/** Hash a secret with scrypt under a per-credential scope. */
export function hashSecret(secret: string, scope: string = ''): string {
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

/** Verify a secret against a stored scrypt hash. */
export function verifyHashedSecret(secret: string, stored: string, scope: string = ''): boolean {
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

/** Legacy digest used by pre-upgrade deployments. */
export const legacyDigest = (secret: string, prefix: string = '') =>
  crypto.createHash('sha256').update(prefix ? `${prefix}:${secret}` : secret).digest('hex');

/** Verify a secret against a stored hash in either the current (scrypt) or the
 * legacy (single-round SHA-256) format, so pre-upgrade installations keep
 * working while their hashes are upgraded on next successful use. */
export function secretMatches(secret: string, stored: string, scope: string, legacyPrefix: string = ''): boolean {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) return verifyHashedSecret(secret, stored, scope);
  return constantTimeEqual(legacyDigest(secret, legacyPrefix), stored);
}

/* ── Server-side rate limiting ───────────────────────────────────── */

const rateLimitKey = (key: string) =>
  `${RATE_LIMIT_COLLECTION}/${crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)}`;

/** Next counter state after one failed attempt.
 *
 * The window opens on the first failure (`since`), not on the lock. Judging
 * the window by `until` resets the count forever, because `until` stays 0
 * until the attempt that finally locks. */
export function nextFailedAttempt(existing: {count?: number, since?: number}|null, now: number, maxAttempts: number, windowMs: number): {count: number, since: number, until: number, locked: boolean} {
  const since = Number(existing?.since) || 0;
  const open = since > 0 && now < since + windowMs;
  const count = (open ? Number(existing?.count) || 0 : 0) + 1;
  const locked = count >= maxAttempts;
  return {
    count,
    since: open ? since : now,
    until: locked ? now + windowMs : 0,
    locked
  };
}

/** Record a failed attempt and report whether the caller is now locked out.
 * Counter state lives in Firestore so it survives cold starts and cannot be
 * reset from the browser. */
export async function registerFailedAttempt(key: string, maxAttempts: number, windowMs: number): Promise<{locked: boolean, retryAfterSec: number}> {
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

/** Report whether an identity is currently locked out. */
export async function checkRateLimit(key: string): Promise<{locked: boolean, retryAfterSec: number}> {
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
export async function clearRateLimit(key: string) {
  try {
    const headers = await requireFirestoreHeaders();
    await fsPatch(rateLimitKey(key), { count: 0, until: 0 }, headers);
  } catch (err) {
    console.error('[finkas] Rate limit clear failed:', err?.message);
  }
}

/* ── In-memory read rate limiting (per warm instance, zero Firestore cost) ── */

const readCounters: Map<string, {count: number, windowStart: number}> = new Map();
const READ_WINDOW_MS = 60_000;
const READ_MAX_PER_WINDOW = 120; // ~2 reads/sec sustained per identity

/** Best-effort in-memory sliding-window limiter for read traffic.
 *
 * Keyed by a stable per-caller identity so one client cannot hammer expensive
 * reads (a full group pull lists four collections) to run up Firestore read
 * costs. Deliberately memory-only: it adds NO Firestore writes, so reads stay
 * cheap, and it resets on cold start — acceptable for a cost guard rather than a
 * security boundary. A single abusive client mostly reuses one warm instance,
 * where this cap bites. */
export function checkReadRateLimit(key: string, maxPerWindow: number = READ_MAX_PER_WINDOW, windowMs: number = READ_WINDOW_MS): {limited: boolean, retryAfterSec: number} {
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

/** Best-effort client IP extraction behind a proxy.
 * Prefers x-real-ip from the edge or the rightmost x-forwarded-for entry to prevent
 * spoofed-header rate-limit bypasses. */
export const clientIp = (req: ApiRequest | null | undefined) => {
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
