/**
 * Serverless Group Admin Endpoint for Finkas on Vercel.
 * Hanya admin pemilik (password global app_config) boleh buat/hapus grup
 * dan atur PIN. PIN disimpan sebagai hash di groups/{id}/private/config
 * yang tidak bisa dibaca klien (firestore.rules: read/write false).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

async function getGoogleAccessToken(serviceAccount) {
  if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const signInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(serviceAccount.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signInput}.${signature}`
    })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      try {
        return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
      } catch (_) {}
    }
  }
  const localSaPath = path.resolve(process.cwd(), '.service-account.local.json');
  if (fs.existsSync(localSaPath)) {
    try {
      return JSON.parse(fs.readFileSync(localSaPath, 'utf8'));
    } catch (_) {}
  }
  return null;
}

const GROUP_ID_RE = /^[A-Za-z0-9-]{3,40}$/;
const SUB_COLS = ['anggota', 'transaksi', 'kategori', 'audit_log'];

async function verifyOwnerAdmin(projectId, password, passwordHash) {
  const trimmedPwd = (password || '').trim();
  const trimmedHash = (passwordHash || '').trim();
  if (!trimmedPwd && !trimmedHash) return false;
  const inputHash = trimmedPwd ? crypto.createHash('sha256').update(trimmedPwd).digest('hex') : trimmedHash;
  const cfgRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/app_config`);
  if (!cfgRes.ok) return false;
  const cfg = await cfgRes.json();
  const storedHash = cfg?.fields?.admin_password_hash?.stringValue || '';
  return !!(storedHash && inputHash === storedHash);
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
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || 'finkas-kas';
    const isOwner = await verifyOwnerAdmin(projectId, body?.password, body?.passwordHash);
    if (!isOwner) {
      return res.status(401).json({ status: false, message: 'Hanya admin pemilik yang boleh mengelola grup.' });
    }

    const serviceAccount = getServiceAccount();
    if (!serviceAccount) {
      return res.status(500).json({ status: false, message: 'Service Account belum dikonfigurasi.' });
    }
    const accessToken = await getGoogleAccessToken(serviceAccount);
    if (!accessToken) {
      return res.status(500).json({ status: false, message: 'Gagal mengotentikasi ke Google Cloud.' });
    }

    const headers = { Authorization: `Bearer ${accessToken}` };
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const action = body?.action;

    if (action === 'create') {
      const nama = String(body?.nama || '').trim().slice(0, 60);
      const pin = String(body?.pin || '').replace(/\D/g, '').slice(0, 4);
      if (nama.length < 3) {
        return res.status(400).json({ status: false, message: 'Nama grup minimal 3 huruf.' });
      }
      if (pin.length !== 4) {
        return res.status(400).json({ status: false, message: 'PIN harus 4 angka.' });
      }
      const id = 'GRP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      const pinHash = crypto.createHash('sha256').update(`finkas-pin:${id}:${pin}`).digest('hex');
      const now = new Date().toISOString();
      const put = async (docPath, fields) => fetch(`${base}/${docPath}`, {
        method: 'PATCH', headers, body: JSON.stringify({ fields })
      });
      const gRes = await put(`groups/${id}`, {
        nama: { stringValue: nama },
        dibuat: { stringValue: now }
      });
      if (!gRes.ok) {
        return res.status(502).json({ status: false, message: 'Gagal membuat dokumen grup.' });
      }
      await put(`groups/${id}/private/config`, { pin_hash: { stringValue: pinHash } });
      await put(`groups/${id}/settings/app_config`, {
        skippedMonths: { arrayValue: { values: [] } }
      });
      return res.status(200).json({ status: true, message: `Grup "${nama}" dibuat.`, data: { id, nama } });
    }

    if (action === 'set-pin') {
      const groupId = String(body?.groupId || '').trim();
      const pin = String(body?.pin || '').replace(/\D/g, '').slice(0, 4);
      if (!GROUP_ID_RE.test(groupId)) {
        return res.status(400).json({ status: false, message: 'ID grup tidak valid.' });
      }
      if (pin.length !== 4) {
        return res.status(400).json({ status: false, message: 'PIN harus 4 angka.' });
      }
      const exists = await fetch(`${base}/groups/${groupId}`, { headers });
      if (!exists.ok) {
        return res.status(404).json({ status: false, message: 'Grup tidak ditemukan.' });
      }
      const pinHash = crypto.createHash('sha256').update(`finkas-pin:${groupId}:${pin}`).digest('hex');
      await fetch(`${base}/groups/${groupId}/private/config`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ fields: { pin_hash: { stringValue: pinHash } } })
      });
      return res.status(200).json({ status: true, message: 'PIN grup diperbarui.' });
    }

    if (action === 'remove') {
      const groupId = String(body?.groupId || '').trim();
      if (!GROUP_ID_RE.test(groupId) || groupId === 'utama') {
        return res.status(400).json({ status: false, message: 'Grup ini tidak boleh dihapus.' });
      }
      const exists = await fetch(`${base}/groups/${groupId}`, { headers });
      if (!exists.ok) {
        return res.status(404).json({ status: false, message: 'Grup tidak ditemukan.' });
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
