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
import { enforceSameOrigin, parseBody, sendJson } from './_http.ts';
import type { ApiRequest, ApiResponse, FirestoreHeaders } from '../src/types/finkas.d.ts';
import crypto from 'node:crypto';
import { requireFirestoreHeaders, fsGet, fsPatch } from './_sa.ts';
import {
  APP_CONFIG_DOC,
  getPrivateConfig,
  groupDoc,
  isValidGroupId,
  readSuperadminEmails,
  setPrivateConfig,
  writeAuditLog
} from './_store.ts';
import {
  ADMIN_SESSION_TTL,
  ROLES,
  RateLimitUnavailableError,
  SUPERADMIN_SESSION_TTL,
  checkRateLimit,
  clearRateLimit,
  clientIp,
  hashSecret,
  registerFailedAttempt,
  secretMatches,
  signSession
} from './_session.ts';

const MAX_ATTEMPTS_IP = 5;      // per-IP: strict, short window
const MAX_ATTEMPTS_ID = 25;     // per-identity: generous so an attacker cannot easily lock the real admin out
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;
const INVALID_CREDENTIALS = 'Email atau Password Admin salah!';

const sha256Digest = (value: string) => crypto.createHash('sha256').update(value).digest();

/** Constant-time equality for normalized emails (length-blind via SHA-256).
 *
 * A missing stored email means "password-only" credentials: they accept a blank
 * email and nothing else, so the caller's own arbitrary string is never adopted
 * as an identity. */
const emailAllowed = (storedEmail: string, suppliedEmail: string): boolean =>
  crypto.timingSafeEqual(sha256Digest(storedEmail || ''), sha256Digest(suppliedEmail));

/** Verify a group admin password against the private config, falling back to the
 * legacy location on the group document and upgrading it when it matches. */
async function verifyGroupAdmin(groupId: string, password: string, email: string, headers: FirestoreHeaders, existingGroup: Record<string, any>|null = null): Promise<{matches: boolean, email: string}> {
  const config = await getPrivateConfig(groupId, headers);
  let storedHash = config?.admin_password_hash || '';
  let storedEmail = (config?.admin_email || '').toLowerCase().trim();
  let legacy = false;

  if (!storedHash) {
    const group = existingGroup && typeof existingGroup === 'object'
      ? existingGroup
      : await fsGet(groupDoc(groupId), headers);
    storedHash = group?.admin_password_hash || '';
    storedEmail = storedEmail || (group?.admin_email || '').toLowerCase().trim();
    legacy = Boolean(storedHash);
  }
  if (!storedHash) return { matches: false, email: '' };

  // Always compute secretMatches even if emailAllowed fails so timing does not
  // expose whether a group uses email auth or leak the stored admin_email.
  const emailOk = emailAllowed(storedEmail, email);
  const secretOk = secretMatches(password, storedHash, `finkas-admin:${groupId}`, `finkas-admin:${groupId}`);
  const matches = emailOk && secretOk;
  if (!matches) return { matches: false, email: storedEmail };

  if (legacy || !storedHash.startsWith('scrypt$')) {
    const upgraded: Record<string, unknown> = { admin_password_hash: hashSecret(password, `finkas-admin:${groupId}`) };
    if (storedEmail) upgraded.admin_email = storedEmail;
    await setPrivateConfig(groupId, upgraded, headers);
    if (legacy) {
      await fsPatch(groupDoc(groupId), { admin_password_hash: null, admin_email: null }, headers,
        ['admin_password_hash', 'admin_email']
      ).catch((err) => console.error('[finkas] Legacy admin hash cleanup failed:', err?.message));
    }
  }

  return { matches: true, email: storedEmail };
}

/** Verify the master (owner) password and upgrade a legacy digest when it matches. */
async function verifyMasterPassword(password: string, headers: FirestoreHeaders): Promise<boolean> {
  const config = await fsGet(APP_CONFIG_DOC, headers);
  const storedHash = config?.admin_password_hash || '';
  if (!storedHash) return false;

  const matches = secretMatches(password, storedHash, 'finkas-master', '');
  if (!matches) return false;

  if (!storedHash.startsWith('scrypt$')) {
    const nowMs = Date.now();
    await fsPatch(
      APP_CONFIG_DOC,
      {
        admin_password_hash: hashSecret(password, 'finkas-master'),
        superadminRevokedAfter: Math.floor(nowMs / 1000),
        superadminRevokedAfterMs: nowMs
      },
      headers,
      ['admin_password_hash', 'superadminRevokedAfter', 'superadminRevokedAfterMs']
    ).catch((err) => console.error('[finkas] Master hash upgrade failed:', err?.message));
  }
  return true;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }
  if (!enforceSameOrigin(req, res)) return;

  try {
    const body = parseBody(req);
    const email = String(body?.email || '').trim().toLowerCase();
    const rawPassword = body?.password;
    const password = typeof rawPassword === 'string' ? rawPassword : String(rawPassword ?? '');
    const groupId = String(body?.groupId || '').trim();

    if (!password) {
      return sendJson(res, 400, { status: false, message: 'Password tidak boleh kosong.' });
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return sendJson(res, 400, { status: false, message: `Password maksimal ${MAX_PASSWORD_LENGTH} karakter.` });
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      return sendJson(res, 400, { status: false, message: 'Format email tidak valid.' });
    }
    if (groupId && !isValidGroupId(groupId)) {
      return sendJson(res, 400, { status: false, message: 'ID grup tidak valid.' });
    }

    const ip = clientIp(req);
    const targetScope = groupId || 'master';
    const ipKey = `login-ip:${targetScope}:${ip}`;
    const idKey = `login-id:${targetScope}`;
    const masterIpKey = `login-ip:master:${ip}`;
    const masterIdKey = 'login-id:master';

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

    const group = groupId ? await fsGet(groupDoc(groupId), headers) : null;
    const groupExists = Boolean(group);
    const auditGroup = (groupId && groupExists) ? groupId : 'utama';

    // ── 1. Group admin ────────────────────────────────────────────────
    if (groupExists) {
      const groupResult = await verifyGroupAdmin(groupId, password, email, headers, group);
      if (groupResult.matches) {
        await Promise.all([clearRateLimit(idKey), clearRateLimit(ipKey)]);
        await writeAuditLog(groupId, 'LOGIN_ADMIN', `Login admin grup dari ${ip}`, headers);
        return sendJson(res, 200, {
          status: true,
          message: 'Login Admin Grup Berhasil!',
          data: {
            sessionToken: signSession({ role: ROLES.GROUP_ADMIN, gid: groupId }, ADMIN_SESSION_TTL),
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
    if (targetScope !== 'master') {
      for (const key of [masterIpKey, masterIdKey]) {
        const lock = await checkRateLimit(key);
        if (lock.locked) {
          return sendJson(res, 429, {
            status: false,
            message: `Terlalu banyak percobaan masuk. Coba lagi dalam ${lock.retryAfterSec} detik.`,
            data: { retryAfterSec: lock.retryAfterSec }
          });
        }
      }
    }

    if (await verifyMasterPassword(password, headers)) {
      const superadminEmails = await readSuperadminEmails(headers);
      if (email && !superadminEmails.includes(email)) {
        // Treat non-whitelisted supplied email identically to bad credentials.
      } else {
        const matchedEmail = email || (process.env.FINKAS_PRIMARY_OWNER || superadminEmails[0] || '').toLowerCase().trim();
        if (!matchedEmail) {
          return sendJson(res, 403, {
            status: false,
            message: 'Konfigurasi Super Admin belum memiliki email terdaftar.'
          });
        }

        const keysToClear = Array.from(new Set([masterIdKey, masterIpKey, idKey, ipKey]));
        await Promise.all(keysToClear.map((k) => clearRateLimit(k)));
        await writeAuditLog(auditGroup, 'LOGIN_ADMIN', `Login master admin dari ${ip}`, headers);

        return sendJson(res, 200, {
          status: true,
          message: 'Login Master Admin Sukses!',
          data: {
            sessionToken: signSession(
              { role: ROLES.SUPERADMIN, email: matchedEmail },
              SUPERADMIN_SESSION_TTL
            ),
            isAdmin: true,
            isSuperAdmin: true,
            role: ROLES.SUPERADMIN,
            groupId: groupExists ? groupId : '',
            email: matchedEmail
          }
        });
      }
    }

    const keysToPenalize = Array.from(new Set([ipKey, idKey, masterIpKey, masterIdKey]));
    const penaltyResults = await Promise.all(
      keysToPenalize.map((k) =>
        registerFailedAttempt(k, k.startsWith('login-ip:') ? MAX_ATTEMPTS_IP : MAX_ATTEMPTS_ID, LOCK_WINDOW_MS)
      )
    );
    const detail = groupId && !groupExists
      ? `Percobaan gagal dari ${ip} (grup tidak ditemukan: ${groupId})`
      : `Percobaan gagal dari ${ip}`;
    await writeAuditLog(auditGroup, 'LOGIN_GAGAL', detail, headers);

    const maxRetryAfterSec = penaltyResults.reduce(
      (max, r) => (r.locked ? Math.max(max, r.retryAfterSec || 0) : max),
      0
    );
    if (maxRetryAfterSec > 0) {
      return sendJson(res, 429, {
        status: false,
        message: `Terlalu banyak percobaan masuk. Coba lagi dalam ${maxRetryAfterSec} detik.`,
        data: { retryAfterSec: maxRetryAfterSec }
      });
    }

    return sendJson(res, 401, { status: false, message: INVALID_CREDENTIALS });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return sendJson(res, 503, { status: false, message: error.message });
    }
    console.error('[finkas] login error:', error?.message);
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan pada server autentikasi.' });
  }
}
