/**
 * Authenticated data gateway for Finkas.
 *
 * The client never touches Firestore directly — every read and write for a
 * group goes through this endpoint, which resolves the caller's signed session
 * and enforces per-group read/write authorization before touching the database.
 */
import { requireFirestoreHeaders } from './_sa.js';
import { isValidGroupId, listGroups } from './_store.js';
import { readGroupData, readAuditLog } from './_group-read.js';
import { WRITE_HANDLERS } from './_group-write.js';
import { canReadGroup, canWriteGroup, readSession } from './_session.js';

const PUBLIC_ACTIONS = ['groups'];
const READ_ACTIONS = ['read', 'audit'];

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
    const action = String(body?.action || 'read').trim();

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
      const headers = await requireFirestoreHeaders();

      if (action === 'audit') {
        return sendJson(res, 200, { status: true, data: { log: await readAuditLog(groupId, headers) } });
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
      const result = await writeHandler(groupId, body, headers);
      return sendJson(res, result.status ? 200 : 400, result);
    }

    return badRequest(res, 'Aksi tidak dikenal.');
  } catch (error) {
    console.error('[finkas] data gateway error:', error?.message);
    return sendJson(res, 500, {
      status: false,
      message: error?.message || 'Terjadi kesalahan pada server data.'
    });
  }
}
