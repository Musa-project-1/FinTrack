/**
 * Group PIN verification.
 *
 * The PIN hash lives only in `groups/{gid}/private/config`, which no client can
 * read. Attempts are counted in Firestore (per group and per IP) so the lockout
 * cannot be bypassed by calling the API directly. A successful attempt returns a
 * signed, expiring session token that authorizes reads for that group.
 */
import { enforceSameOrigin, parseBody, sendJson } from './_http.ts';
import type { ApiRequest, ApiResponse } from '../src/types/finkas.d.ts';
import { requireFirestoreHeaders, fsGet, fsPatch } from './_sa.ts';
import { getPrivateConfig, groupDoc, isValidGroupId, setPrivateConfig, writeAuditLog } from './_store.ts';
import {
  GROUP_SESSION_TTL,
  ROLES,
  RateLimitUnavailableError,
  checkRateLimit,
  clearRateLimit,
  clientIp,
  hashSecret,
  registerFailedAttempt,
  secretMatches,
  signSession
} from './_session.ts';

const MAX_ATTEMPTS_IP = 5;
const MAX_ATTEMPTS_GROUP = 25;
const LOCK_WINDOW_MS = 5 * 60 * 1000;
const GENERIC_PIN_ERROR = 'PIN salah.';

/** PIN scope: bound into both the scrypt hash and the legacy digest. */
const pinScope = (gid: string) => `finkas-pin:${gid}`;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }
  if (!enforceSameOrigin(req, res)) return;

  try {
    const body = parseBody(req);
    const groupId = String(body?.groupId || '').trim();
    const pin = String(body?.pin || '').trim();

    if (!isValidGroupId(groupId)) {
      return sendJson(res, 400, { status: false, message: 'ID grup tidak valid.' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return sendJson(res, 400, { status: false, message: 'Ketik 4 angka PIN grup.' });
    }

    const ip = clientIp(req);
    const ipKey = `pin:${groupId}:${ip}`;
    const groupKey = `pin:${groupId}`;

    for (const key of [ipKey, groupKey]) {
      const lock = await checkRateLimit(key);
      if (lock.locked) {
        return sendJson(res, 429, {
          status: false,
          message: `Terlalu banyak percobaan. Coba lagi dalam ${lock.retryAfterSec} detik.`,
          data: { retryAfterSec: lock.retryAfterSec }
        });
      }
    }

    const headers = await requireFirestoreHeaders();
    const [group, config] = await Promise.all([
      fsGet(groupDoc(groupId), headers),
      getPrivateConfig(groupId, headers)
    ]);
    if (!group) {
      return sendJson(res, 404, { status: false, message: 'Grup tidak ditemukan.' });
    }
    const storedPin = config?.pin_hash || '';

    // Legacy groups stored the hash on the group document itself; migrate on use.
    const legacyStored = !storedPin ? (group?.pin_hash || '') : '';

    const candidate = storedPin || legacyStored;

    if (!candidate) {
      return sendJson(res, 409, {
        status: false,
        message: 'Grup belum memiliki PIN. Minta Super Admin menyetelnya lewat konsol grup.'
      });
    }

    if (!secretMatches(pin, candidate, pinScope(groupId), pinScope(groupId))) {
      const [attemptIp, attemptGroup] = await Promise.all([
        registerFailedAttempt(ipKey, MAX_ATTEMPTS_IP, LOCK_WINDOW_MS),
        registerFailedAttempt(groupKey, MAX_ATTEMPTS_GROUP, LOCK_WINDOW_MS)
      ]);
      await writeAuditLog(groupId, 'PIN_SALAH', `Percobaan gagal dari ${ip}`, headers);
      const isLocked = attemptIp.locked || attemptGroup.locked;
      if (isLocked) {
        const retryAfterSec = Math.max(attemptIp.retryAfterSec || 0, attemptGroup.retryAfterSec || 0);
        return sendJson(res, 429, {
          status: false,
          message: `Terlalu banyak percobaan salah. Terkunci ${retryAfterSec} detik.`,
          data: { retryAfterSec }
        });
      }
      return sendJson(res, 401, { status: false, message: GENERIC_PIN_ERROR });
    }

    // Upgrade any legacy (non-scrypt) hash to scrypt now that we hold the plaintext PIN.
    if (!storedPin || !candidate.startsWith('scrypt$')) {
      await setPrivateConfig(groupId, { pin_hash: hashSecret(pin, pinScope(groupId)) }, headers);
      if (!storedPin && legacyStored) {
        await fsPatch(groupDoc(groupId), { pin_hash: null }, headers, ['pin_hash']).catch((err) =>
          console.error('[finkas] Legacy pin_hash cleanup failed:', err?.message));
      }
    }

    await Promise.all([clearRateLimit(ipKey), clearRateLimit(groupKey)]);
    await writeAuditLog(groupId, 'PIN_BENAR', `Masuk grup dari ${ip}`, headers);

    return sendJson(res, 200, {
      status: true,
      message: 'PIN benar.',
      data: { sessionToken: signSession({ role: ROLES.MEMBER, gid: groupId }, GROUP_SESSION_TTL) }
    });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return sendJson(res, 503, { status: false, message: error.message });
    }
    console.error('[finkas] verify-group-pin error:', error?.message);
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan server.' });
  }
}
