/**
 * Group management — reserved for the Finkas owner (Super Admin).
 *
 * Authorization comes from a signed Super Admin session on every request. There
 * is no environment-based bypass and no credential accepted from the body.
 * Generated credentials are returned exactly once so the operator can hand them
 * to the new group admin; they are never stored in the clear.
 */
import crypto from 'node:crypto';
import { fsGet, fsPatch, requireFirestoreHeaders } from './_sa.js';
import {
  deleteGroupTree,
  groupDoc,
  isValidGroupId,
  listGroups,
  newId,
  nowIso,
  setPrivateConfig,
  settingsDoc,
  writeAuditLog
} from './_store.js';
import { ROLES, hashSecret, readSession } from './_session.js';

const MAX_GROUP_NAME = 60;
const MIN_ADMIN_PASSWORD = 6;
const GENERATED_PASSWORD_LENGTH = 10;
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!';
const RESERVED_GROUP_IDS = new Set(['utama']);

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

/** Cryptographically random admin password for a new group (unbiased). */
const generatePassword = (length = GENERATED_PASSWORD_LENGTH) => {
  let res = '';
  for (let i = 0; i < length; i++) {
    res += PASSWORD_ALPHABET[crypto.randomInt(0, PASSWORD_ALPHABET.length)];
  }
  return res;
};

const cleanName = (value) => String(value ?? '').trim().slice(0, MAX_GROUP_NAME);
const cleanPin = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 4);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email) => EMAIL_RE.test(String(email || '').trim());

/* ── Actions ─────────────────────────────────────────────────────── */

async function createGroup(body, headers) {
  const nama = cleanName(body?.nama);
  const pin = cleanPin(body?.pin);
  const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
  const adminPassword = String(body?.adminPassword || '').trim();
  const skipAdmin = Boolean(body?.skipAdmin);

  if (nama.length < 3) return { status: false, message: 'Nama grup minimal 3 huruf.' };
  if (pin.length !== 4) return { status: false, message: 'PIN warga harus 4 angka.' };
  if (!skipAdmin && adminEmail && !isValidEmail(adminEmail)) {
    return { status: false, message: 'Format email admin tidak valid.' };
  }
  if (!skipAdmin && adminPassword.length < MIN_ADMIN_PASSWORD) {
    return { status: false, message: `Password admin minimal ${MIN_ADMIN_PASSWORD} karakter.` };
  }

  const id = newId('GRP');
  await fsPatch(groupDoc(id), { nama, dibuat: nowIso(), groupId: id }, headers);
  await setPrivateConfig(id, { pin_hash: hashSecret(pin, `finkas-pin:${id}`) }, headers);
  await fsPatch(settingsDoc(id), { skippedMonths: [] }, headers, ['skippedMonths']);

  let issuedPassword = '';
  if (!skipAdmin) {
    issuedPassword = adminPassword || generatePassword();
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

async function setAdminCredential(body, headers) {
  const groupId = String(body?.groupId || '').trim();
  const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
  const adminPassword = String(body?.adminPassword || '').trim();

  if (!isValidGroupId(groupId)) return { status: false, message: 'ID grup tidak valid.' };
  const existing = await fsGet(groupDoc(groupId), headers);
  if (!existing) return { status: false, message: 'Grup tidak ditemukan.' };

  if (adminEmail && !isValidEmail(adminEmail)) {
    return { status: false, message: 'Format email admin tidak valid.' };
  }
  if (adminPassword.length < MIN_ADMIN_PASSWORD) {
    return { status: false, message: `Password admin minimal ${MIN_ADMIN_PASSWORD} karakter.` };
  }

  await setPrivateConfig(groupId, {
    admin_email: adminEmail,
    admin_password_hash: hashSecret(adminPassword, `finkas-admin:${groupId}`)
  }, headers);
  // Credentials live only in the private document from here on. Stamp
  // revokedAfter so any session issued before this credential change is
  // rejected on its next request (see canReadGroup/canWriteGroup).
  await fsPatch(groupDoc(groupId), {
    admin_email: null,
    admin_password_hash: null,
    revokedAfter: Math.floor(Date.now() / 1000)
  }, headers, ['admin_email', 'admin_password_hash', 'revokedAfter'])
    .catch((err) => console.error('[finkas] Group credential cleanup failed:', err?.message));

  await writeAuditLog(groupId, 'UBAH_KREDENSIAL_ADMIN', adminEmail || '(tanpa email)', headers);
  return { status: true, message: 'Kredensial Admin Grup berhasil diperbarui!' };
}

async function setGroupPin(body, headers) {
  const groupId = String(body?.groupId || '').trim();
  const pin = cleanPin(body?.pin);
  if (!isValidGroupId(groupId)) return { status: false, message: 'ID grup tidak valid.' };
  const existing = await fsGet(groupDoc(groupId), headers);
  if (!existing) return { status: false, message: 'Grup tidak ditemukan.' };

  if (pin.length !== 4) return { status: false, message: 'PIN harus 4 angka.' };

  await setPrivateConfig(groupId, { pin_hash: hashSecret(pin, `finkas-pin:${groupId}`) }, headers);
  // Stamp revokedAfter so member sessions issued under the old PIN are rejected
  // on their next request (see canReadGroup/canWriteGroup).
  await fsPatch(groupDoc(groupId), {
    pin_hash: null,
    revokedAfter: Math.floor(Date.now() / 1000)
  }, headers, ['pin_hash', 'revokedAfter'])
    .catch((err) => console.error('[finkas] Group pin cleanup failed:', err?.message));

  await writeAuditLog(groupId, 'UBAH_PIN', 'PIN grup diperbarui', headers);
  return { status: true, message: 'PIN grup diperbarui.' };
}

async function renameGroup(body, headers) {
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

async function removeGroup(body, headers) {
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
    console.error('[finkas] Delete group tree failed:', groupId, err?.message);
    return { status: false, message: 'Penghapusan grup belum selesai sempurna. Silakan ulangi lagi.' };
  }
}

const ACTIONS = {
  create: createGroup,
  'set-admin-credential': setAdminCredential,
  'set-pin': setGroupPin,
  rename: renameGroup,
  remove: removeGroup
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { status: false, message: 'Method Not Allowed' });
  }

  try {
    const body = parseBody(req);
    const session = readSession(body);
    if (!session || session.role !== ROLES.SUPERADMIN) {
      return sendJson(res, 403, { status: false, message: 'Hanya Super Admin yang berwenang mengelola grup.' });
    }

    const headers = await requireFirestoreHeaders();
    const action = String(body?.action || '').trim();

    if (action === 'list') {
      return sendJson(res, 200, { status: true, data: { groups: await listGroups(headers) } });
    }

    const run = ACTIONS[action];
    if (!run) {
      return sendJson(res, 400, { status: false, message: 'Aksi tidak dikenal.' });
    }

    const result = await run(body, headers);
    return sendJson(res, result.status ? 200 : 400, result);
  } catch (error) {
    console.error('[finkas] create-group error:', error?.message);
    return sendJson(res, 500, { status: false, message: 'Terjadi kesalahan server.' });
  }
}
