/**
 * Server-side session revocation (logout) for Finkas.
 *
 * Persists a per-token revocation marker (`_revoked_sessions/{jti}`) so a
 * logged-out admin or superadmin token is rejected immediately on subsequent
 * API requests rather than remaining valid until its TTL expires.
 */
import { enforceSameOrigin, parseBody, sendJson } from './_http.ts';
import type { ApiRequest, ApiResponse } from '../src/types/finkas.d.ts';
import { requireFirestoreHeaders } from './_sa.ts';
import { isValidGroupId, writeAuditLog } from './_store.ts';
import { ROLES, clientIp, readSession, revokeSession } from './_session.ts';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }
  if (!enforceSameOrigin(req, res)) return;

  try {
    const body = parseBody(req);
    const session = readSession(body);
    if (!session) {
      return sendJson(res, 200, { status: true, message: 'Logout sukses.' });
    }

    const headers = await requireFirestoreHeaders();
    await revokeSession(session, headers);

    const ip = clientIp(req);
    if (session.role === ROLES.SUPERADMIN) {
      await writeAuditLog('utama', 'LOGOUT_ADMIN', `Logout superadmin ${session.email || ''} dari ${ip}`.trim(), headers);
    } else if (session.gid && isValidGroupId(session.gid)) {
      await writeAuditLog(session.gid, 'LOGOUT_ADMIN', `Logout admin dari ${ip}`, headers);
    }

    return sendJson(res, 200, { status: true, message: 'Logout sukses.' });
  } catch (error) {
    console.error('[finkas] logout error:', error?.message);
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan pada server autentikasi.' });
  }
}
