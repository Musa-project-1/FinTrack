/**
 * Serverless Secure Deletion Endpoint for Finkas on Vercel.
 * Verifies admin password and deletes documents using Google Cloud IAM Service Account,
 * bypassing Firestore Security Rules securely on the server side.
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

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(serviceAccount.private_key, 'base64url');
  const jwt = `${signInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
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
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
        return JSON.parse(decoded);
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

    const { password, passwordHash, idTransaksi, targetCollection = 'transaksi' } = body || {};
    const trimmedPwd = (password || '').trim();
    const trimmedHash = (passwordHash || '').trim();
    const trimmedId = (idTransaksi || '').trim();

    if (!trimmedPwd && !trimmedHash) {
      return res.status(400).json({ status: false, message: 'Password admin wajib diisi.' });
    }
    if (!trimmedId) {
      return res.status(400).json({ status: false, message: 'ID dokumen wajib diisi.' });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || 'finkas-kas';

    // 1. Verify Password against Firestore app_config
    const inputHash = trimmedPwd ? crypto.createHash('sha256').update(trimmedPwd).digest('hex') : trimmedHash;
    const cfgUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/app_config`;
    const cfgRes = await fetch(cfgUrl);
    if (!cfgRes.ok) {
      return res.status(502).json({ status: false, message: 'Gagal memverifikasi ke database konfigurasi.' });
    }
    const cfgData = await cfgRes.json();
    const storedHash = cfgData?.fields?.admin_password_hash?.stringValue || '';

    if (!storedHash || inputHash !== storedHash) {
      return res.status(401).json({ status: false, message: 'Password Admin Salah!' });
    }

    // 2. Obtain Google Cloud IAM Access Token
    const serviceAccount = getServiceAccount();
    if (!serviceAccount) {
      return res.status(500).json({
        status: false,
        message: 'Serverless Service Account belum dikonfigurasi di Environment Variable (FIREBASE_SERVICE_ACCOUNT).'
      });
    }

    const accessToken = await getGoogleAccessToken(serviceAccount);
    if (!accessToken) {
      return res.status(500).json({ status: false, message: 'Gagal mengotentikasi ke Google Cloud IAM.' });
    }

    // 3. Execute Delete using IAM Admin Token
    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${targetCollection}/${trimmedId}`;
    const delRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (delRes.ok) {
      return res.status(200).json({
        status: true,
        message: `Data ${trimmedId} berhasil dihapus secara permanen.`
      });
    }

    const errData = await delRes.json().catch(() => ({}));
    return res.status(delRes.status).json({
      status: false,
      message: errData.error?.message || 'Gagal menghapus data dari Firestore.'
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error?.message || 'Terjadi kesalahan pada server.' });
  }
}
