/**
 * Group PIN verification.
 *
 * The PIN hash lives only in `groups/{gid}/private/config`, which no client can
 * read. Attempts are counted in Firestore (per group and per IP) so the lockout
 * cannot be bypassed by calling the API directly. A successful attempt returns a
 * signed, expiring session token that authorizes reads for that group.
 */
import { requireFirestoreHeaders, fsGet, fsPatch } from './_sa.js';
import { getPrivateConfig, groupDoc, isValidGroupId, setPrivateConfig, writeAuditLog } from './_store.js';
import {
  GROUP_SESSION_TTL,
  ROLES,
  checkRateLimit,
  clearRateLimit,
  clientIp,
  hashSecret,
  registerFailedAttempt,
  secretMatches,
  signSession
} from './_session.js';

const MAX_ATTEMPTS_IP = 5;
const MAX_ATTEMPTS_GROUP = 25;
const LOCK_WINDOW_MS = 5 * 60 * 1000;
const GENERIC_PIN_ERROR = 'PIN salah.';

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

/** PIN scope: bound into both the scrypt hash and the legacy digest. */
const pinScope = (gid) => `finkas-pin:${gid}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }

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
    const config = await getPrivateConfig(groupId, headers);
    const storedPin = config?.pin_hash || '';

    // Legacy groups stored the hash on the group document itself; migrate on use.
    let legacyStored = '';
    if (!storedPin) {
      const group = await fsGet(groupDoc(groupId), headers);
      legacyStored = group?.pin_hash || '';
    }

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

    // Upgrade a legacy hash to scrypt now that we hold the plaintext PIN.
    if (!storedPin && legacyStored) {
      await setPrivateConfig(groupId, { pin_hash: hashSecret(pin, pinScope(groupId)) }, headers);
      await fsPatch(groupDoc(groupId), { pin_hash: null }, headers, ['pin_hash']).catch((err) =>
        console.error('[finkas] Legacy pin_hash cleanup failed:', err?.message));
    }

    await Promise.all([clearRateLimit(ipKey), clearRateLimit(groupKey)]);
    await writeAuditLog(groupId, 'PIN_BENAR', `Masuk grup dari ${ip}`, headers);

    return sendJson(res, 200, {
      status: true,
      message: 'PIN benar.',
      data: { sessionToken: signSession({ role: ROLES.MEMBER, gid: groupId }, GROUP_SESSION_TTL) }
    });
  } catch (error) {
    console.error('[finkas] verify-group-pin error:', error?.message);
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan server.' });
  }
}
