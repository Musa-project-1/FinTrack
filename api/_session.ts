/**
 * Session tokens, password hashing and server-side rate limiting for Finkas.
 *
 * Sessions are HMAC-signed, carry an explicit expiry and are verified on every
 * request. Password secrets are stored with scrypt (memory-hard) instead of a
 * bare SHA-256 digest.
 */
import type { ApiRequest, FirestoreHeaders, SessionClaims } from '../src/types/finkas.d.ts';
import crypto from 'node:crypto';
import { isIP } from 'node:net';
import {
  constantTimeEqual,
  encodeFields,
  fsCommit,
  fsGet,
  fsGetWithMeta,
  fsPatch,
  getServiceAccount,
  isPreconditionFailure,
  requireFirestoreHeaders,
  resourceName
} from './_sa.ts';

/** Roles granted by a session. */
export const ROLES = {
  MEMBER: 'member',
  GROUP_ADMIN: 'group_admin',
  SUPERADMIN: 'superadmin'
};

export const GROUP_SESSION_TTL = 30 * 24 * 60 * 60; // 30 hari (member PIN session)
export const ADMIN_SESSION_TTL = 12 * 60 * 60; // 12 jam (group admin session)
export const SUPERADMIN_SESSION_TTL = 12 * 60 * 60; // 12 jam (superadmin session)

export type VerifiedSessionClaims = SessionClaims & {
  jti?: string;
  iatMs?: number;
};

/** Thrown when server-side rate-limit storage cannot be read or updated safely. */
export class RateLimitUnavailableError extends Error {
  constructor(message: string = 'Layanan pembatasan percobaan sedang tidak tersedia.') {
    super(message);
    this.name = 'RateLimitUnavailableError';
  }
}

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };
const MAX_SCRYPT_N = 131072;
const MAX_SCRYPT_R = 64;
const MAX_SCRYPT_P = 16;
const RATE_LIMIT_COLLECTION = '_ratelimit';
const REVOKED_SESSIONS_COLLECTION = '_revoked_sessions';
const APP_CONFIG_DOC_PATH = 'settings/app_config';
const JTI_RE = /^[A-Za-z0-9_-]{8,64}$/;
const RATE_LIMIT_CAS_RETRIES = 5;

/* ── Signing secret ──────────────────────────────────────────────── */

let saFallbackSecretCache: string | null = null;
let saFallbackKeySource: string = '';
let warnedSaSecretFallback = false;

/** Resolve the primary HMAC secret used to sign sessions.
 *
 * Only server-held secrets are eligible: an explicit env var, or a SHA-256
 * derivation of the service account private key. Never a project id or a
 * literal constant, both of which are public. */
export function getSessionSecret(): string {
  const fromEnv = process.env.FINKAS_SESSION_SECRET;
  if (fromEnv && fromEnv.trim().length >= 32) {
    return fromEnv;
  }
  if (fromEnv) {
    console.error('[finkas] FINKAS_SESSION_SECRET is shorter than 32 characters; ignoring it.');
  }

  const sa = getServiceAccount();
  if (sa?.private_key) {
    if (!warnedSaSecretFallback) {
      warnedSaSecretFallback = true;
      console.warn('[finkas] FINKAS_SESSION_SECRET is not set; falling back to derived service-account key.');
    }
    if (!saFallbackSecretCache || saFallbackKeySource !== sa.private_key) {
      saFallbackKeySource = sa.private_key;
      saFallbackSecretCache = crypto.createHash('sha256').update(`finkas-session-v1:${sa.private_key}`).digest('hex');
    }
    return saFallbackSecretCache;
  }

  throw new Error('Session secret tidak tersedia. Set FINKAS_SESSION_SECRET atau konfigurasi service account.');
}

function getVerificationSecrets(): string[] {
  const primary = getSessionSecret();
  const previous = process.env.FINKAS_SESSION_SECRET_PREVIOUS;
  if (previous && previous.trim().length >= 32 && previous !== primary) {
    return [primary, previous];
  }
  return [primary];
}

const hmacWithSecret = (input: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(input).digest();

/* ── Session tokens ──────────────────────────────────────────────── */

/** Issue a signed session token. */
export function signSession(claims: {role: string, gid?: string, email?: string}, ttlSeconds: number): string {
  const issuedAtMs = Date.now();
  const issuedAt = Math.floor(issuedAtMs / 1000);
  const payload = {
    role: claims.role,
    gid: claims.gid || '',
    email: claims.email || '',
    jti: crypto.randomBytes(16).toString('hex'),
    iat: issuedAt,
    iatMs: issuedAtMs,
    exp: issuedAt + ttlSeconds
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmacWithSecret(body, getSessionSecret()).toString('base64url')}`;
}

/** Verify a signed session token (supports `FINKAS_SESSION_SECRET_PREVIOUS` during rotation). */
export function verifySession(token: string): VerifiedSessionClaims | null {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  let secrets: string[];
  try {
    secrets = getVerificationSecrets();
  } catch (err) {
    console.error('[finkas] Cannot verify session:', (err instanceof Error ? err.message : String(err)));
    return null;
  }

  let signatureValid = false;
  for (const secret of secrets) {
    const expected = hmacWithSecret(body, secret).toString('base64url');
    if (constantTimeEqual(signature, expected)) {
      signatureValid = true;
    }
  }
  if (!signatureValid) return null;

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  if (!Object.values(ROLES).includes(payload.role)) return null;

  if (payload.iat !== undefined && (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat))) return null;
  if (payload.iatMs !== undefined && (typeof payload.iatMs !== 'number' || !Number.isFinite(payload.iatMs))) return null;
  if (payload.jti !== undefined && (typeof payload.jti !== 'string' || !JTI_RE.test(payload.jti))) return null;

  if ((payload.role === ROLES.MEMBER || payload.role === ROLES.GROUP_ADMIN) &&
      (typeof payload.gid !== 'string' || !payload.gid.trim())) return null;
  if (payload.role === ROLES.SUPERADMIN &&
      (typeof payload.email !== 'string' || !payload.email.trim())) return null;

  return payload as VerifiedSessionClaims;
}

/** Resolve the caller's session from a request body. */
export const readSession = (body: {sessionToken?: string}) => verifySession(String(body?.sessionToken || '').trim());

interface SessionGroup {
  groupId?: string;
  revokedAfter?: number | string;
  revokedAfterMs?: number | string;
}

function isIssuedAtOrAfter(
  session: VerifiedSessionClaims,
  revokedMsRaw: number | string | undefined,
  revokedSecRaw: number | string | undefined
): boolean {
  if (revokedMsRaw != null && revokedMsRaw !== '') {
    const revokedMs = typeof revokedMsRaw === 'number' ? revokedMsRaw : Number(revokedMsRaw);
    if (!Number.isFinite(revokedMs)) return false;
    const sessionMs = typeof session.iatMs === 'number' && Number.isFinite(session.iatMs)
      ? session.iatMs
      : (typeof session.iat === 'number' && Number.isFinite(session.iat) ? session.iat * 1000 : NaN);
    return Number.isFinite(sessionMs) && sessionMs >= revokedMs;
  }

  if (revokedSecRaw == null || revokedSecRaw === '') return true;
  const revokedSec = typeof revokedSecRaw === 'number'
    ? revokedSecRaw
    : Math.floor(new Date(revokedSecRaw).getTime() / 1000);
  if (!Number.isFinite(revokedSec)) return false;
  return typeof session.iat === 'number' && Number.isFinite(session.iat) && session.iat >= revokedSec;
}

function matchesGroupInfo(session: VerifiedSessionClaims, groupId: string, groupInfo: SessionGroup | null) {
  if (groupInfo?.groupId && String(groupInfo.groupId).trim() !== groupId) return false;
  if (session.role === ROLES.SUPERADMIN) return true;
  return isIssuedAtOrAfter(session, groupInfo?.revokedAfterMs, groupInfo?.revokedAfter);
}

/** True when the session may read the given group's data.
 * Supports server-side revocation if groupInfo.revokedAfter/revokedAfterMs is present.
 *
 * When `session.role === ROLES.SUPERADMIN`, `superadminEmails` must be provided
 * (fails closed if null/omitted). */
export const canReadGroup = (
  session: VerifiedSessionClaims | null,
  groupId: string,
  groupInfo: SessionGroup | null = null,
  superadminEmails: string[] | null = []
) => {
  if (!session || !matchesGroupInfo(session, groupId, groupInfo)) return false;
  if (session.role === ROLES.SUPERADMIN) {
    if (!Array.isArray(superadminEmails)) return false;
    const email = String(session.email || '').toLowerCase().trim();
    return Boolean(email) && superadminEmails.includes(email);
  }
  return Boolean(groupId) && session.gid === groupId;
};

/** True when the session may mutate the given group's data.
 * Supports server-side revocation if groupInfo.revokedAfter/revokedAfterMs is present. */
export const canWriteGroup = (
  session: VerifiedSessionClaims | null,
  groupId: string,
  groupInfo: SessionGroup | null = null,
  superadminEmails: string[] | null = []
) => {
  if (!session || !matchesGroupInfo(session, groupId, groupInfo)) return false;
  if (session.role === ROLES.SUPERADMIN) {
    if (!Array.isArray(superadminEmails)) return false;
    const email = String(session.email || '').toLowerCase().trim();
    return Boolean(email) && superadminEmails.includes(email);
  }
  return session.role === ROLES.GROUP_ADMIN && Boolean(groupId) && session.gid === groupId;
};

/** Persist a per-token revocation marker (`_revoked_sessions/{jti}`) on logout. */
export async function revokeSession(session: VerifiedSessionClaims | null, headers?: FirestoreHeaders): Promise<boolean> {
  if (!session) return false;
  const jti = String(session.jti || '').trim();
  if (!JTI_RE.test(jti)) return false;

  const hdrs = headers || await requireFirestoreHeaders();
  const now = Date.now();
  await fsPatch(`${REVOKED_SESSIONS_COLLECTION}/${jti}`, {
    jti,
    role: session.role,
    gid: session.gid || '',
    email: session.email || '',
    exp: session.exp,
    revokedAt: new Date(now).toISOString(),
    expiresAt: new Date(session.exp * 1000).toISOString()
  }, hdrs);
  return true;
}

/** True when the token has been explicitly logged out (`_revoked_sessions/{jti}`)
 * or, for SUPERADMIN tokens, issued before `settings/app_config.superadminRevokedAfter`. */
export async function isSessionRevoked(
  session: VerifiedSessionClaims | null,
  headers?: FirestoreHeaders,
  appConfig?: Record<string, any> | null
): Promise<boolean> {
  if (!session) return true;
  const hdrs = headers || await requireFirestoreHeaders();
  const jti = String(session.jti || '').trim();
  if (jti) {
    if (!JTI_RE.test(jti)) return true;
    const revoked = await fsGet(`${REVOKED_SESSIONS_COLLECTION}/${jti}`, hdrs);
    if (revoked) return true;
  }
  if (session.role === ROLES.SUPERADMIN) {
    const cfg = appConfig !== undefined ? appConfig : await fsGet(APP_CONFIG_DOC_PATH, hdrs);
    if (cfg && !isIssuedAtOrAfter(session, cfg.superadminRevokedAfterMs, cfg.superadminRevokedAfter)) {
      return true;
    }
  }
  return false;
}

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

  const [, nStr, rStr, pStr, saltB64, keyB64] = parts;
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(n) || n < SCRYPT_PARAMS.N || n > MAX_SCRYPT_N || (n & (n - 1)) !== 0) return false;
  if (!Number.isInteger(r) || r < SCRYPT_PARAMS.r || r > MAX_SCRYPT_R) return false;
  if (!Number.isInteger(p) || p < SCRYPT_PARAMS.p || p > MAX_SCRYPT_P) return false;

  try {
    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(keyB64, 'base64url');
    if (salt.length < 16 || expected.length < 32 || expected.length > 128) return false;
    const derived = crypto.scryptSync(`${scope}\u0000${secret}`, salt, expected.length, { N: n, r, p });
    return crypto.timingSafeEqual(derived, expected);
  } catch (err) {
    console.error('[finkas] scrypt verification failed:', (err instanceof Error ? err.message : String(err)));
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

/** Record a failed attempt atomically using Firestore CAS (`updateTime` / `exists: false`)
 * preconditions and fail closed (`RateLimitUnavailableError`) if persistence fails. */
export async function registerFailedAttempt(key: string, maxAttempts: number, windowMs: number): Promise<{locked: boolean, retryAfterSec: number}> {
  try {
    const headers = await requireFirestoreHeaders();
    const path = rateLimitKey(key);

    for (let attempt = 0; attempt < RATE_LIMIT_CAS_RETRIES; attempt += 1) {
      const now = Date.now();
      const existing = await fsGetWithMeta(path, headers);
      const next = nextFailedAttempt(existing?.fields || null, now, maxAttempts, windowMs);
      const docPayload = {
        count: next.count,
        since: next.since,
        until: next.until,
        updatedAt: new Date(now).toISOString()
      };
      const currentDocument = existing
        ? (existing.updateTime ? { updateTime: existing.updateTime } : { exists: true })
        : { exists: false };

      try {
        await fsCommit([{
          update: { name: resourceName(path), fields: encodeFields(docPayload) },
          currentDocument
        }], headers);
        return { locked: next.locked, retryAfterSec: next.locked ? Math.ceil(windowMs / 1000) : 0 };
      } catch (err) {
        if (isPreconditionFailure(err) && attempt + 1 < RATE_LIMIT_CAS_RETRIES) {
          continue;
        }
        throw err;
      }
    }
    throw new RateLimitUnavailableError('Gagal memperbarui batas percobaan akibat konflik bersamaan.');
  } catch (err) {
    if (err instanceof RateLimitUnavailableError) throw err;
    console.error('[finkas] Rate limit write failed:', (err instanceof Error ? err.message : String(err)));
    throw new RateLimitUnavailableError();
  }
}

/** Report whether an identity is currently locked out.
 * Fails closed (`RateLimitUnavailableError`) when rate-limit state cannot be read. */
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
    console.error('[finkas] Rate limit read failed:', (err instanceof Error ? err.message : String(err)));
    throw new RateLimitUnavailableError();
  }
}

/** Clear the attempt counter after a successful authentication. */
export async function clearRateLimit(key: string) {
  try {
    const headers = await requireFirestoreHeaders();
    await fsPatch(rateLimitKey(key), { count: 0, since: 0, until: 0 }, headers);
  } catch (err) {
    console.error('[finkas] Rate limit clear failed:', (err instanceof Error ? err.message : String(err)));
  }
}

/* ── In-memory read rate limiting (per warm instance, zero Firestore cost) ── */

const readCounters: Map<string, {count: number, windowStart: number}> = new Map();
const READ_WINDOW_MS = 60_000;
const READ_MAX_PER_WINDOW = 120; // ~2 reads/sec sustained per identity

/** Best-effort in-memory sliding-window limiter for read traffic. */
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

function validIp(candidate: unknown): string {
  if (typeof candidate !== 'string') return '';
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > 45) return '';
  return isIP(trimmed) !== 0 ? trimmed : '';
}

function rightmostValidIp(headerVal: string | string[] | undefined): string {
  const raw = Array.isArray(headerVal) ? headerVal[headerVal.length - 1] : headerVal;
  if (typeof raw !== 'string' || !raw.length) return '';
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const ip = validIp(parts[i]);
    if (ip) return ip;
  }
  return '';
}

/** Best-effort client IP extraction behind a proxy.
 * Prefers Vercel's `x-vercel-forwarded-for`, validates syntax via `net.isIP()`,
 * falls back to `x-real-ip` -> rightmost valid `x-forwarded-for` -> socket address. */
export const clientIp = (req: ApiRequest | null | undefined) => {
  const headers = req?.headers || {};
  const vercelForwarded = rightmostValidIp(headers['x-vercel-forwarded-for']);
  if (vercelForwarded) return vercelForwarded;

  const realRaw = Array.isArray(headers['x-real-ip']) ? headers['x-real-ip'][0] : headers['x-real-ip'];
  const realIp = validIp(realRaw);
  if (realIp) return realIp;

  const forwarded = rightmostValidIp(headers['x-forwarded-for']);
  if (forwarded) return forwarded;

  return validIp(req?.socket?.remoteAddress) || 'unknown';
};
