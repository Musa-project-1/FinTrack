/**
 * Authenticated data gateway for Finkas.
 *
 * The client never touches Firestore directly — every read and write for a
 * group goes through this endpoint, which resolves the caller's signed session
 * and enforces per-group read/write authorization before touching the database.
 */
import { requireFirestoreHeaders, fsGet } from './_sa.js';
import { isValidGroupId, listGroups, touchGroupUpdated, groupDoc } from './_store.js';
import { readGroupData, readAuditLog } from './_group-read.js';
import { WRITE_HANDLERS } from './_group-write.js';
import { canReadGroup, canWriteGroup, readSession, checkReadRateLimit, clientIp } from './_session.js';

const PUBLIC_ACTIONS = ['groups'];
const READ_ACTIONS = ['read', 'audit', 'checkUpdate'];

/** Send a JSON response with caching disabled. */
const sendJson = (res, status, payload) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
};

const unauthorized = (res, message) => sendJson(res, 401, { status: false, message });
const badRequest = (res, message) => sendJson(res, 400, { status: false, message });

/** Parse a body that may arrive as an object or a JSON string. */
function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (err) {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }

  try {
    const body = parseBody(req);
    const action = String(body?.action || '').trim();
    if (!action) {
      return badRequest(res, 'Aksi wajib diisi.');
    }

    // ── Public: group directory (names only, never credentials) ────────
    if (PUBLIC_ACTIONS.includes(action)) {
      const headers = await requireFirestoreHeaders();
      return sendJson(res, 200, { status: true, data: { groups: await listGroups(headers) } });
    }

    const groupId = String(body?.groupId || '').trim();
    if (!isValidGroupId(groupId)) {
      return badRequest(res, 'ID grup tidak valid.');
    }

    const session = readSession(body);
    if (!session) {
      return unauthorized(res, 'Sesi tidak valid atau sudah berakhir. Silakan masuk kembali.');
    }

    // ── Reads ──────────────────────────────────────────────────────────
    if (READ_ACTIONS.includes(action)) {
      if (!canReadGroup(session, groupId)) {
        return sendJson(res, 403, { status: false, message: 'Tidak memiliki akses ke grup ini.' });
      }
      // Audit is admin-only — reject non-admins cheaply, before any Firestore hit.
      if (action === 'audit' && !canWriteGroup(session, groupId)) {
        return sendJson(res, 403, { status: false, message: 'Hanya admin yang dapat membaca riwayat audit.' });
      }

      // Cost guard: full pulls list four collections each, so cap them per
      // caller. checkUpdate is a cheap 1-read poll (the 35s heartbeat) and is
      // intentionally exempt so normal freshness checks are never throttled.
      if (action !== 'checkUpdate') {
        const { limited, retryAfterSec } = checkReadRateLimit(`read:${groupId}:${clientIp(req)}`);
        if (limited) {
          res.setHeader('Retry-After', String(retryAfterSec));
          return sendJson(res, 429, { status: false, message: 'Terlalu banyak permintaan data. Coba lagi sebentar.' });
        }
      }

      const headers = await requireFirestoreHeaders();
      const groupInfo = await fsGet(groupDoc(groupId), headers);
      // Session revocation: the caller passed the cheap authz above, so a failure
      // now can only mean the token predates a PIN/credential change (revokedAfter).
      if (!canReadGroup(session, groupId, groupInfo) ||
          (action === 'audit' && !canWriteGroup(session, groupId, groupInfo))) {
        return unauthorized(res, 'Sesi sudah tidak berlaku setelah perubahan kredensial. Silakan masuk kembali.');
      }

      if (action === 'audit') {
        return sendJson(res, 200, { status: true, data: { log: await readAuditLog(groupId, headers) } });
      }

      if (action === 'checkUpdate') {
        // Derive freshness from the group doc we already read for revocation —
        // keeps checkUpdate at exactly one Firestore read.
        const since = String(body?.since || '').trim() || null;
        const updatedAt = groupInfo?.updatedAt || null;
        const hasUpdate = updatedAt ? (since ? updatedAt > since : true) : false;
        return sendJson(res, 200, { status: true, data: { hasUpdate, updatedAt } });
      }

      return sendJson(res, 200, { status: true, data: await readGroupData(groupId, headers) });
    }

    // ── Writes ─────────────────────────────────────────────────────────
    const writeHandler = WRITE_HANDLERS[action];
    if (writeHandler) {
      if (!canWriteGroup(session, groupId)) {
        return sendJson(res, 403, { status: false, message: 'Hanya admin grup yang dapat mengubah data ini.' });
      }
      const headers = await requireFirestoreHeaders();
      const groupInfo = await fsGet(groupDoc(groupId), headers);
      // Revocation: passed the cheap admin check but fails with the live group
      // doc ⇒ the token was issued before a credential change.
      if (!canWriteGroup(session, groupId, groupInfo)) {
        return unauthorized(res, 'Sesi sudah tidak berlaku setelah perubahan kredensial. Silakan masuk kembali.');
      }
      const result = await writeHandler(groupId, body, headers);
      if (result.status) {
        // Stamp group updatedAt so other clients detect the change, and hand the
        // timestamp back so the writing client can advance its own sync marker
        // (prevents its own badge turning red on the next heartbeat).
        const updatedAt = await touchGroupUpdated(groupId, headers);
        if (updatedAt) result.updatedAt = updatedAt;
      }
      return sendJson(res, result.status ? 200 : 400, result);
    }

    return badRequest(res, 'Aksi tidak dikenal.');
  } catch (error) {
    console.error('[finkas] data gateway error:', error?.message);
    return sendJson(res, 500, {
      status: false,
      message: 'Terjadi kesalahan pada server data.'
    });
  }
}
