/**
 * Serverless Group PIN Verify Endpoint for Finkas on Vercel.
 * Membandingkan PIN di sisi server agar hash tidak perlu dibaca klien.
 * Fallback klien (baca hash langsung) hanya untuk hosting statis murni.
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

    const groupId = String(body?.groupId || '').trim();
    const pin = String(body?.pin || '').replace(/\D/g, '').slice(0, 4);
    if (!GROUP_ID_RE.test(groupId)) {
      return res.status(400).json({ status: false, message: 'ID grup tidak valid.' });
    }
    if (pin.length !== 4) {
      return res.status(400).json({ status: false, message: 'Ketik 4 angka PIN grup.' });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || 'finkas-kas';
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

    // 1. Baca hash PIN dari sub-koleksi privat (tak bisa dibaca klien).
    const cfgRes = await fetch(`${base}/groups/${groupId}/private/config`, { headers });
    if (!cfgRes.ok) {
      // Grup lama tanpa PIN (pra tahap 4): izinkan masuk sekali.
      return res.status(200).json({ status: true, message: 'Grup ini belum punya PIN — masuk langsung.', data: { legacy: true } });
    }
    const cfg = await cfgRes.json();
    const storedHash = cfg?.fields?.pin_hash?.stringValue || '';
    if (!storedHash) {
      return res.status(200).json({ status: true, message: 'Grup ini belum punya PIN — masuk langsung.', data: { legacy: true } });
    }

    // 2. Bandingkan hash salt-per-grup.
    const inputHash = crypto.createHash('sha256').update(`finkas-pin:${groupId}:${pin}`).digest('hex');
    if (inputHash !== storedHash) {
      // Perlambat brute-force: jeda sebelum menjawab salah.
      await new Promise((r) => setTimeout(r, 700));
      return res.status(401).json({ status: false, message: 'PIN salah.' });
    }
    const sessionToken = crypto.createHash('sha256').update(`${storedHash}:${Date.now()}`).digest('hex');
    return res.status(200).json({ status: true, message: 'PIN benar.', data: { sessionToken } });
  } catch (error) {
    return res.status(500).json({ status: false, message: error?.message || 'Terjadi kesalahan server.' });
  }
}
