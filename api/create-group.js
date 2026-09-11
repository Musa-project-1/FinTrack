/**
 * Serverless Group Admin Endpoint for Finkas on Vercel.
 * Hanya Super Admin (Google Whitelist atau Master Key) yang boleh mengelola grup.
 * Mendukung auto-kredensial admin grup (admin_email & admin_password_hash).
 */
import crypto from 'node:crypto';
import { getServiceAccount, getGoogleAccessToken, getFirestoreHeaders, verifySuperAdminToken } from './_sa.js';

const GROUP_ID_RE = /^[A-Za-z0-9-]{3,40}$/;
const SUB_COLS = ['anggota', 'transaksi', 'kategori', 'audit_log'];
const FALLBACK_SUPERADMIN = 'musabakhtiar0@gmail.com';

async function verifyOwnerAdmin(projectId, body, headers) {
  const superAdminEmail = String(body?.superAdminEmail || '').trim().toLowerCase();
  const sessionToken = String(body?.superAdminToken || body?.sessionToken || body?.passwordHash || '').trim();
  const trimmedPwd = String(body?.password || '').trim();
  const trimmedHash = String(body?.passwordHash || '').trim();

  // 1. Verifikasi Super Admin via Email Google Whitelist + Token
  if (superAdminEmail) {
    const isTokenValid = verifySuperAdminToken(superAdminEmail, sessionToken);
    if (isTokenValid || process.env.NODE_ENV !== 'production') {
      if (superAdminEmail === FALLBACK_SUPERADMIN) return true;
      try {
        const cfgRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/app_config`, { headers });
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          const values = cfg?.fields?.superadmin_emails?.arrayValue?.values || [];
          const emails = values.map((v) => (v.stringValue || '').toLowerCase().trim());
          if (emails.includes(superAdminEmail)) return true;
        }
      } catch (_) {}
    }
  }

  // 2. Verifikasi Master Password fallback
  if (trimmedPwd || trimmedHash) {
    const inputHash = trimmedPwd ? crypto.createHash('sha256').update(trimmedPwd).digest('hex') : trimmedHash;
    try {
      const cfgRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/app_config`, { headers });
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        const storedHash = cfg?.fields?.admin_password_hash?.stringValue || '';
        if (storedHash && inputHash === storedHash) return true;
      }
    } catch (_) {}
  }

  // Izinkan jika dipanggil dari internal / dev lokal
  if (process.env.NODE_ENV !== 'production' && body?.isSuperAdmin) {
    return true;
  }

  return false;
}

async function listDocNames(base, headers, colPath) {
  const names = [];
  let pageToken = '';
  for (let page = 0; page < 20; page += 1) {
    const url = `${base}/${colPath}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) break;
    const json = await res.json();
    (json.documents || []).forEach((d) => { if (d.name) names.push(d.name); });
    pageToken = json.nextPageToken || '';
    if (!pageToken) break;
  }
  return names;
}

async function commitDeletes(base, headers, names) {
  for (let i = 0; i < names.length; i += 400) {
    const chunk = names.slice(i, i + 400).map((name) => ({ delete: name }));
    await fetch(`${base}:commit`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: chunk })
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || 'finkas-kas';
    const headers = await getFirestoreHeaders();
    const isOwner = await verifyOwnerAdmin(projectId, body, headers);

    if (!isOwner) {
      return res.status(401).json({ status: false, message: 'Hanya Super Admin yang berwenang mengelola grup.' });
    }

    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const action = body?.action;

    // ── AKSI: Buat Grup Baru ─────────────────────────────────────────────
    if (action === 'create') {
      const nama = String(body?.nama || '').trim().slice(0, 60);
      const pin = String(body?.pin || '').replace(/\D/g, '').slice(0, 4);
      const skipAdmin = !!body?.skipAdmin;
      const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
      const adminPassword = String(body?.adminPassword || '').trim();

      if (nama.length < 3) {
        return res.status(400).json({ status: false, message: 'Nama grup minimal 3 huruf.' });
      }
      if (pin.length !== 4) {
        return res.status(400).json({ status: false, message: 'PIN warga harus 4 angka.' });
      }

      const id = 'GRP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      const pinHash = crypto.createHash('sha256').update(`finkas-pin:${id}:${pin}`).digest('hex');
      const now = new Date().toISOString();

      const groupFields = {
        nama: { stringValue: nama },
        dibuat: { stringValue: now },
        pin_hash: { stringValue: pinHash }
      };

      let adminPasswordHash = '';
      if (!skipAdmin && adminPassword) {
        adminPasswordHash = crypto.createHash('sha256').update(`finkas-admin:${id}:${adminPassword}`).digest('hex');
        groupFields.admin_email = { stringValue: adminEmail };
        groupFields.admin_password_hash = { stringValue: adminPasswordHash };
      }

      const put = async (docPath, fields) => fetch(`${base}/${docPath}`, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields })
      });

      const gRes = await put(`groups/${id}`, groupFields);
      if (!gRes.ok) {
        return res.status(502).json({ status: false, message: 'Gagal membuat dokumen grup.' });
      }

      // Simpan juga ke subkoleksi private untuk keamanan ekstra
      const privFields = { pin_hash: { stringValue: pinHash } };
      if (adminPasswordHash) {
        privFields.admin_email = { stringValue: adminEmail };
        privFields.admin_password_hash = { stringValue: adminPasswordHash };
      }
      await put(`groups/${id}/private/config`, privFields);
      await put(`groups/${id}/settings/app_config`, {
        skippedMonths: { arrayValue: { values: [] } }
      });

      return res.status(200).json({
        status: true,
        message: `Grup "${nama}" berhasil dibuat.`,
        data: {
          id,
          nama,
          pin,
          adminEmail: skipAdmin ? '' : adminEmail,
          adminPassword: skipAdmin ? '' : adminPassword
        }
      });
    }

    // ── AKSI: Set / Reset Kredensial Admin Grup ──────────────────────────
    if (action === 'set-admin-credential') {
      const groupId = String(body?.groupId || '').trim();
      const adminEmail = String(body?.adminEmail || '').trim().toLowerCase();
      const adminPassword = String(body?.adminPassword || '').trim();

      if (!GROUP_ID_RE.test(groupId)) {
        return res.status(400).json({ status: false, message: 'ID grup tidak valid.' });
      }
      if (!adminPassword || adminPassword.length < 6) {
        return res.status(400).json({ status: false, message: 'Password admin minimal 6 karakter.' });
      }

      const adminPasswordHash = crypto.createHash('sha256').update(`finkas-admin:${groupId}:${adminPassword}`).digest('hex');
      const patchFields = {
        admin_email: { stringValue: adminEmail },
        admin_password_hash: { stringValue: adminPasswordHash }
      };

      const put = async (docPath, fields) => fetch(`${base}/${docPath}`, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields })
      });

      await put(`groups/${groupId}?updateMask.fieldPaths=admin_email&updateMask.fieldPaths=admin_password_hash`, patchFields);
      await put(`groups/${groupId}/private/config`, patchFields);

      return res.status(200).json({
        status: true,
        message: 'Kredensial Admin Grup berhasil diperbarui!',
        data: { groupId, adminEmail, adminPassword }
      });
    }

    // ── AKSI: Ubah PIN Warga Grup ─────────────────────────────────────────
    if (action === 'set-pin') {
      const groupId = String(body?.groupId || '').trim();
      const pin = String(body?.pin || '').replace(/\D/g, '').slice(0, 4);
      if (!GROUP_ID_RE.test(groupId)) {
        return res.status(400).json({ status: false, message: 'ID grup tidak valid.' });
      }
      if (pin.length !== 4) {
        return res.status(400).json({ status: false, message: 'PIN harus 4 angka.' });
      }

      const pinHash = crypto.createHash('sha256').update(`finkas-pin:${groupId}:${pin}`).digest('hex');
      const put = async (docPath, fields) => fetch(`${base}/${docPath}`, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields })
      });

      await put(`groups/${groupId}?updateMask.fieldPaths=pin_hash`, { pin_hash: { stringValue: pinHash } });
      await put(`groups/${groupId}/private/config`, { pin_hash: { stringValue: pinHash } });

      return res.status(200).json({ status: true, message: 'PIN grup diperbarui.' });
    }

    // ── AKSI: Ubah Nama Grup ─────────────────────────────────────────────
    if (action === 'rename') {
      const groupId = String(body?.groupId || '').trim();
      const nama = String(body?.nama || '').trim().slice(0, 60);
      if (!GROUP_ID_RE.test(groupId) || nama.length < 3) {
        return res.status(400).json({ status: false, message: 'Nama grup minimal 3 huruf.' });
      }

      const resRename = await fetch(`${base}/groups/${groupId}?updateMask.fieldPaths=nama`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { nama: { stringValue: nama } } })
      });

      if (!resRename.ok) {
        return res.status(502).json({ status: false, message: 'Gagal mengubah nama grup.' });
      }

      return res.status(200).json({ status: true, message: `Nama grup diubah menjadi "${nama}".` });
    }

    // ── AKSI: Hapus Grup Beserta Isinya ──────────────────────────────────
    if (action === 'remove') {
      const groupId = String(body?.groupId || '').trim();
      if (!GROUP_ID_RE.test(groupId) || groupId === 'utama') {
        return res.status(400).json({ status: false, message: 'Grup ini tidak boleh dihapus.' });
      }

      for (const col of SUB_COLS) {
        const names = await listDocNames(base, headers, `groups/${groupId}/${col}`);
        if (names.length) await commitDeletes(base, headers, names);
      }
      const privNames = await listDocNames(base, headers, `groups/${groupId}/private`);
      if (privNames.length) await commitDeletes(base, headers, privNames);
      const setNames = await listDocNames(base, headers, `groups/${groupId}/settings`);
      if (setNames.length) await commitDeletes(base, headers, setNames);

      await fetch(`${base}/groups/${groupId}`, { method: 'DELETE', headers });
      return res.status(200).json({ status: true, message: 'Grup dihapus beserta isinya.' });
    }

    return res.status(400).json({ status: false, message: 'Aksi tidak dikenal.' });
  } catch (error) {
    return res.status(500).json({ status: false, message: error?.message || 'Terjadi kesalahan server.' });
  }
}
