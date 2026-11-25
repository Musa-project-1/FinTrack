/**
 * Authenticated data gateway for Finkas.
 *
 * The client never touches Firestore directly — every read and write for a
 * group goes through this endpoint, which resolves the caller's signed session
 * and enforces per-group read/write authorization before touching the database.
 */
import { parseBody, sendJson } from './_http.ts';
import type { ApiRequest, ApiResponse } from '../src/types/finkas.d.ts';
import type { GroupWriteHandler } from './_group-write.ts';
import { requireFirestoreHeaders, fsGet } from './_sa.ts';
import { isValidGroupId, listGroups, touchGroupUpdated, groupDoc, readSuperadminEmails } from './_store.ts';
import { readGroupData, readAuditLog } from './_group-read.ts';
import { WRITE_HANDLERS } from './_group-write.ts';
import { exportSnapshot } from './_write-snapshot.ts';
import { readAttachment, exportAttachments, ATTACHMENT_WRITE_HANDLERS } from './_attachments.ts';
import { canReadGroup, canWriteGroup, readSession, checkReadRateLimit, clientIp, ROLES } from './_session.ts';

const PUBLIC_ACTIONS = new Set(['groups']);
const READ_ACTIONS = new Set(['read', 'audit', 'checkUpdate', 'readAttachment', 'exportAttachments', 'exportSnapshot']);
const SUPERADMIN_READ_ACTIONS = new Set(['audit']);
const ADMIN_READ_ACTIONS = new Set(['exportAttachments', 'exportSnapshot']);

const unauthorized = (res: ApiResponse, message: string) => sendJson(res, 401, { status: false, message });
const badRequest = (res: ApiResponse, message: string) => sendJson(res, 400, { status: false, message });

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }

  try {
    const body = parseBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest(res, 'Format permintaan tidak valid.');
    }
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    if (!action) {
      return badRequest(res, 'Aksi wajib diisi.');
    }

    // ── Public: group directory (names only, never credentials) ────────
    if (PUBLIC_ACTIONS.has(action)) {
      const { limited, retryAfterSec } = checkReadRateLimit(`groups:${clientIp(req)}`);
      if (limited) {
        res.setHeader('Retry-After', String(retryAfterSec));
        return sendJson(res, 429, { status: false, message: 'Terlalu banyak permintaan data. Coba lagi sebentar.' });
      }
      const headers = await requireFirestoreHeaders();
      return sendJson(res, 200, { status: true, data: { groups: await listGroups(headers) } });
    }

    const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : '';
    if (!isValidGroupId(groupId)) {
      return badRequest(res, 'ID grup tidak valid.');
    }

    const session = readSession(body);
    if (!session) {
      return unauthorized(res, 'Sesi tidak valid atau sudah berakhir. Silakan masuk kembali.');
    }

    // A superadmin's access is the whitelist, re-read per request, so removing
    // an email takes effect before the session's 30-day TTL. Loaded once here
    // and reused by every check below. Other roles never need it.
    const superadminEmails = session.role === ROLES.SUPERADMIN
      ? await readSuperadminEmails(await requireFirestoreHeaders())
      : null;

    // ── Reads ──────────────────────────────────────────────────────────
    if (READ_ACTIONS.has(action)) {
      if (!canReadGroup(session, groupId, null, superadminEmails)) {
        return sendJson(res, 403, { status: false, message: 'Tidak memiliki akses ke grup ini.' });
      }
      // Audit log is exclusively Super Admin — reject members, group admins, and revoked superadmins cheaply.
      if (SUPERADMIN_READ_ACTIONS.has(action) &&
          (session.role !== ROLES.SUPERADMIN || !canWriteGroup(session, groupId, null, superadminEmails))) {
        return sendJson(res, 403, {
          status: false,
          message: 'Hanya Super Admin yang dapat membaca riwayat audit.'
        });
      }
      // Attachment and snapshot export are admin-only — reject non-admins cheaply, before any Firestore hit.
      if (ADMIN_READ_ACTIONS.has(action) && !canWriteGroup(session, groupId, null, superadminEmails)) {
        return sendJson(res, 403, {
          status: false,
          message: 'Hanya admin yang dapat mengekspor backup atau berkas bukti.'
        });
      }

      // Cost guard: full pulls list four collections each, so cap them per
      // caller. checkUpdate is a cheap 1-read poll (the 35s heartbeat) and is
      // intentionally exempt so normal freshness checks are never throttled.
      // readAttachment gets a higher ceiling for proof fetching.
      if (action === 'readAttachment') {
        const { limited, retryAfterSec } = checkReadRateLimit(`attach:${groupId}:${clientIp(req)}`, 240);
        if (limited) {
          res.setHeader('Retry-After', String(retryAfterSec));
          return sendJson(res, 429, { status: false, message: 'Terlalu banyak permintaan berkas bukti. Coba lagi sebentar.' });
        }
      } else if (action !== 'checkUpdate') {
        const { limited, retryAfterSec } = checkReadRateLimit(`read:${groupId}:${clientIp(req)}`);
        if (limited) {
          res.setHeader('Retry-After', String(retryAfterSec));
          return sendJson(res, 429, { status: false, message: 'Terlalu banyak permintaan data. Coba lagi sebentar.' });
        }
      }

      const headers = await requireFirestoreHeaders();
      const groupInfo = await fsGet(groupDoc(groupId), headers);
      const allowMissingUtamaAudit = action === 'audit' && groupId === 'utama' && session.role === ROLES.SUPERADMIN;
      if (!groupInfo && !allowMissingUtamaAudit) {
        return sendJson(res, 404, { status: false, message: 'Grup tidak ditemukan.' });
      }
      if (!canReadGroup(session, groupId, groupInfo, superadminEmails) ||
          (SUPERADMIN_READ_ACTIONS.has(action) &&
            (session.role !== ROLES.SUPERADMIN || !canWriteGroup(session, groupId, groupInfo, superadminEmails))) ||
          (ADMIN_READ_ACTIONS.has(action) && !canWriteGroup(session, groupId, groupInfo, superadminEmails))) {
        return unauthorized(res, 'Sesi sudah tidak berlaku setelah perubahan kredensial. Silakan masuk kembali.');
      }

      if (action === 'audit') {
        return sendJson(res, 200, { status: true, data: { log: await readAuditLog(groupId, headers) } });
      }

      if (action === 'readAttachment') {
        const result = await readAttachment(groupId, body, headers);
        return sendJson(res, result.status ? 200 : (result.notFound ? 404 : 400), result);
      }

      if (action === 'exportSnapshot') {
        const result = await exportSnapshot(groupId, body, headers);
        return sendJson(res, result.status ? 200 : (result.payloadTooLarge ? 413 : 400), result);
      }

      if (action === 'exportAttachments') {
        const result = await exportAttachments(groupId, headers, body);
        return sendJson(res, result.status ? 200 : (result.payloadTooLarge ? 413 : 400), result);
      }

      if (action === 'checkUpdate') {
        // Derive freshness from the group doc we already read for revocation —
        // keeps checkUpdate at exactly one Firestore read.
        const since = typeof body.since === 'string' ? body.since.trim() || null : null;
        const updatedAt = groupInfo?.updatedAt || null;
        const hasUpdate = updatedAt ? (since ? updatedAt > since : true) : false;
        return sendJson(res, 200, { status: true, data: { hasUpdate, updatedAt } });
      }

      const includePrivate = canWriteGroup(session, groupId, groupInfo, superadminEmails);
      const groupData = await readGroupData(groupId, headers, { includePrivate });
      if (groupInfo?.updatedAt) groupData.updatedAt = groupInfo.updatedAt;
      return sendJson(res, 200, { status: true, data: groupData });
    }

    // ── Writes ─────────────────────────────────────────────────────────
    const writeHandler: GroupWriteHandler | undefined = Object.hasOwn(WRITE_HANDLERS, action)
      ? WRITE_HANDLERS[action]
      : (Object.hasOwn(ATTACHMENT_WRITE_HANDLERS, action) ? ATTACHMENT_WRITE_HANDLERS[action] : undefined);
    if (writeHandler) {
      if (!canWriteGroup(session, groupId, null, superadminEmails)) {
        return sendJson(res, 403, { status: false, message: 'Hanya admin grup yang dapat mengubah data ini.' });
      }
      const { limited, retryAfterSec } = checkReadRateLimit(`write:${groupId}:${clientIp(req)}`, 120);
      if (limited) {
        res.setHeader('Retry-After', String(retryAfterSec));
        return sendJson(res, 429, { status: false, message: 'Terlalu banyak permintaan perubahan data. Coba lagi sebentar.' });
      }
      const headers = await requireFirestoreHeaders();
      const groupInfo = await fsGet(groupDoc(groupId), headers);
      if (!groupInfo) {
        return sendJson(res, 404, { status: false, message: 'Grup tidak ditemukan.' });
      }
      if (!canWriteGroup(session, groupId, groupInfo, superadminEmails)) {
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
