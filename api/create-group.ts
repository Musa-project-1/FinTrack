/**
 * Group management — reserved for the Finkas owner (Super Admin).
 *
 * Authorization comes from a signed Super Admin session on every request. There
 * is no environment-based bypass and no credential accepted from the body.
 * Generated credentials are returned exactly once so the operator can hand them
 * to the new group admin; they are never stored in the clear.
 */
import { enforceSameOrigin, parseBody, sendJson, type JsonBody } from './_http.ts';
import type { ApiRequest, ApiResponse, FirestoreHeaders } from '../src/types/finkas.d.ts';
import { encodeFields, fsCommit, fsGet, fsPatch, requireFirestoreHeaders, resourceName } from './_sa.ts';
import {
  deleteGroupTree,
  groupDoc,
  isValidGroupId,
  listGroups,
  newId,
  nowIso,
  privateDoc,
  readSuperadminEmails,
  setPrivateConfig,
  settingsDoc,
  writeAuditLog
} from './_store.ts';
import { ROLES, hashSecret, isSessionRevoked, readSession } from './_session.ts';

const MAX_GROUP_NAME = 60;
const MIN_ADMIN_PASSWORD = 6;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;
const RESERVED_GROUP_IDS = new Set(['utama']);

const cleanName = (value: unknown) => String(value ?? '').trim().slice(0, MAX_GROUP_NAME);
const strictPin = (value: unknown) => {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return /^\d{4}$/.test(raw) ? raw : '';
};
const rawPasswordString = (value: unknown) =>
  typeof value === 'string' ? value : String(value ?? '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email: unknown) => {
  const s = String(email || '').trim();
  return s.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(s);
};

/* ── Actions ─────────────────────────────────────────────────────── */

async function createGroup(body: JsonBody, headers: FirestoreHeaders) {
  const nama = cleanName(body?.nama);
  const pin = strictPin(body?.pin);
  const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
  const adminPassword = rawPasswordString(body?.adminPassword);
  const skipAdmin = Boolean(body?.skipAdmin);

  if (nama.length < 3) return { status: false, message: 'Nama grup minimal 3 huruf.' };
  if (!pin) return { status: false, message: 'PIN warga harus 4 angka.' };
  if (!skipAdmin && adminEmail && !isValidEmail(adminEmail)) {
    return { status: false, message: 'Format email admin tidak valid.' };
  }
  if (!skipAdmin && adminPassword.length < MIN_ADMIN_PASSWORD) {
    return { status: false, message: `Password admin minimal ${MIN_ADMIN_PASSWORD} karakter.` };
  }
  if (!skipAdmin && adminPassword.length > MAX_PASSWORD_LENGTH) {
    return { status: false, message: `Password admin maksimal ${MAX_PASSWORD_LENGTH} karakter.` };
  }

  const id = newId('GRP');
  await fsPatch(groupDoc(id), { nama, dibuat: nowIso(), groupId: id }, headers);
  await setPrivateConfig(id, { pin_hash: hashSecret(pin, `finkas-pin:${id}`) }, headers);
  // Seed the dues window origin to the creation month (MM-YYYY) so a brand-new
  // group bills from when it was created, not the legacy hardcoded start.
  const created = new Date();
  const kasStart = `${String(created.getMonth() + 1).padStart(2, '0')}-${created.getFullYear()}`;
  await fsPatch(settingsDoc(id), { skippedMonths: [], kasStart }, headers, ['skippedMonths', 'kasStart']);

  const issuedPassword = skipAdmin ? '' : adminPassword;
  if (!skipAdmin) {
    await setPrivateConfig(id, {
      admin_email: adminEmail,
      admin_password_hash: hashSecret(issuedPassword, `finkas-admin:${id}`)
    }, headers);
  }

  await writeAuditLog(id, 'BUAT_GRUP', `${nama} (${id})`, headers);
  return {
    status: true,
    message: `Grup "${nama}" berhasil dibuat.`,
    data: { id, nama, pin, adminEmail: skipAdmin ? '' : adminEmail, adminPassword: issuedPassword }
  };
}

async function setAdminCredential(body: JsonBody, headers: FirestoreHeaders) {
  const groupId = String(body?.groupId || '').trim();
  const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
  const adminPassword = rawPasswordString(body?.adminPassword);

  if (!isValidGroupId(groupId)) return { status: false, message: 'ID grup tidak valid.' };
  const existing = await fsGet(groupDoc(groupId), headers);
  if (!existing) return { status: false, message: 'Grup tidak ditemukan.' };

  if (adminEmail && !isValidEmail(adminEmail)) {
    return { status: false, message: 'Format email admin tidak valid.' };
  }
  if (adminPassword.length < MIN_ADMIN_PASSWORD) {
    return { status: false, message: `Password admin minimal ${MIN_ADMIN_PASSWORD} karakter.` };
  }
  if (adminPassword.length > MAX_PASSWORD_LENGTH) {
    return { status: false, message: `Password admin maksimal ${MAX_PASSWORD_LENGTH} karakter.` };
  }

  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const updatedAt = new Date(nowMs).toISOString();

  // Commit credential update and revocation timestamp atomically so a transient
  // failure never leaves pre-rotation sessions active.
  await fsCommit([
    {
      update: {
        name: resourceName(privateDoc(groupId)),
        fields: encodeFields({
          admin_email: adminEmail,
          admin_password_hash: hashSecret(adminPassword, `finkas-admin:${groupId}`),
          updatedAt
        })
      },
      updateMask: { fieldPaths: ['admin_email', 'admin_password_hash', 'updatedAt'] }
    },
    {
      update: {
        name: resourceName(groupDoc(groupId)),
        fields: encodeFields({
          admin_email: null,
          admin_password_hash: null,
          revokedAfter: nowSec,
          revokedAfterMs: nowMs
        })
      },
      updateMask: { fieldPaths: ['admin_email', 'admin_password_hash', 'revokedAfter', 'revokedAfterMs'] },
      currentDocument: { exists: true }
    }
  ], headers);

  await writeAuditLog(groupId, 'UBAH_KREDENSIAL_ADMIN', adminEmail || '(tanpa email)', headers);
  return { status: true, message: 'Kredensial Admin Grup berhasil diperbarui!' };
}

async function setGroupPin(body: JsonBody, headers: FirestoreHeaders) {
  const groupId = String(body?.groupId || '').trim();
  const pin = strictPin(body?.pin);
  if (!isValidGroupId(groupId)) return { status: false, message: 'ID grup tidak valid.' };
  const existing = await fsGet(groupDoc(groupId), headers);
  if (!existing) return { status: false, message: 'Grup tidak ditemukan.' };

  if (!pin) return { status: false, message: 'PIN harus 4 angka.' };

  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const updatedAt = new Date(nowMs).toISOString();

  // Commit PIN hash update and revocation timestamp atomically.
  await fsCommit([
    {
      update: {
        name: resourceName(privateDoc(groupId)),
        fields: encodeFields({
          pin_hash: hashSecret(pin, `finkas-pin:${groupId}`),
          updatedAt
        })
      },
      updateMask: { fieldPaths: ['pin_hash', 'updatedAt'] }
    },
    {
      update: {
        name: resourceName(groupDoc(groupId)),
        fields: encodeFields({
          pin_hash: null,
          revokedAfter: nowSec,
          revokedAfterMs: nowMs
        })
      },
      updateMask: { fieldPaths: ['pin_hash', 'revokedAfter', 'revokedAfterMs'] },
      currentDocument: { exists: true }
    }
  ], headers);

  await writeAuditLog(groupId, 'UBAH_PIN', 'PIN grup diperbarui', headers);
  return { status: true, message: 'PIN grup diperbarui.' };
}

async function renameGroup(body: JsonBody, headers: FirestoreHeaders) {
  const groupId = String(body?.groupId || '').trim();
  const nama = cleanName(body?.nama);
  if (!isValidGroupId(groupId)) return { status: false, message: 'ID grup tidak valid.' };
  const existing = await fsGet(groupDoc(groupId), headers);
  if (!existing) return { status: false, message: 'Grup tidak ditemukan.' };

  if (nama.length < 3) return { status: false, message: 'Nama grup minimal 3 huruf.' };

  await fsPatch(groupDoc(groupId), { nama }, headers, ['nama']);
  await writeAuditLog(groupId, 'UBAH_NAMA', nama, headers);
  return { status: true, message: `Nama grup diubah menjadi "${nama}".` };
}

async function removeGroup(body: JsonBody, headers: FirestoreHeaders) {
  const groupId = String(body?.groupId || '').trim();
  if (!isValidGroupId(groupId) || RESERVED_GROUP_IDS.has(groupId)) {
    return { status: false, message: 'Grup ini tidak boleh dihapus.' };
  }

  const existing = await fsGet(groupDoc(groupId), headers);
  if (!existing) return { status: false, message: 'Grup tidak ditemukan.' };
  const nama = existing?.nama || 'Grup';

  try {
    const deleted = await deleteGroupTree(groupId, headers);
    await writeAuditLog('utama', 'HAPUS_GRUP', `${nama} (${groupId}) — ${deleted} dokumen`, headers);
    return { status: true, message: `Grup dihapus beserta ${deleted} dokumen isinya.` };
  } catch (err) {
    console.error('[finkas] Delete group tree failed:', groupId, (err instanceof Error ? err.message : String(err)));
    return { status: false, message: 'Penghapusan grup belum selesai sempurna. Silakan ulangi lagi.' };
  }
}

const ACTIONS: Record<string, (body: JsonBody, headers: FirestoreHeaders) => Promise<{status: boolean, message: string, data?: unknown}>> = {
  create: createGroup,
  'set-admin-credential': setAdminCredential,
  'set-pin': setGroupPin,
  rename: renameGroup,
  remove: removeGroup
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }
  if (!enforceSameOrigin(req, res)) return;

  try {
    const body = parseBody(req);
    const session = readSession(body);
    if (!session || session.role !== ROLES.SUPERADMIN) {
      return sendJson(res, 403, { status: false, message: 'Hanya Super Admin yang berwenang mengelola grup.' });
    }
    const email = String(session.email || '').toLowerCase().trim();
    if (!email) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }

    const headers = await requireFirestoreHeaders();
    if (await isSessionRevoked(session, headers)) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }
    const superadminEmails = await readSuperadminEmails(headers);
    if (!superadminEmails.includes(email)) {
      return sendJson(res, 403, { status: false, message: 'Sesi Super Admin tidak valid atau sudah berakhir.' });
    }

    const action = String(body?.action || '').trim();

    if (action === 'list') {
      return sendJson(res, 200, { status: true, data: { groups: await listGroups(headers) } });
    }

    if (!Object.hasOwn(ACTIONS, action)) {
      return sendJson(res, 400, { status: false, message: 'Aksi tidak dikenal.' });
    }

    const result = await ACTIONS[action](body, headers);
    return sendJson(res, result.status ? 200 : 400, result);
  } catch (error) {
    console.error('[finkas] create-group error:', (error instanceof Error ? error.message : String(error)));
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan server.' });
  }
}
