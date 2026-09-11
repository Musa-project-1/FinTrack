/**
 * Serverless Secure Deletion Endpoint for Finkas on Vercel.
 * Memverifikasi hak admin (Super Admin atau Admin Grup terkait)
 * sebelum menghapus dokumen menggunakan Google Cloud IAM Service Account.
 */
import crypto from 'node:crypto';
import { getServiceAccount, getGoogleAccessToken, getFirestoreHeaders, verifySuperAdminToken } from './_sa.js';

const ALLOWED_COLS = ['transaksi', 'anggota', 'kategori'];
const FALLBACK_SUPERADMIN = 'musabakhtiar0@gmail.com';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'finkas-kas';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function isAuthorizedToDelete(body, targetGroupId, headers) {
  const superAdminEmail = String(body?.superAdminEmail || '').trim().toLowerCase();
  const sessionToken = String(body?.superAdminToken || body?.sessionToken || body?.passwordHash || '').trim();
  const trimmedPwd = String(body?.password || '').trim();
  const trimmedHash = String(body?.passwordHash || '').trim();

  // 1. Otorisasi via Google Super Admin + Token
  if (superAdminEmail) {
    const isTokenValid = verifySuperAdminToken(superAdminEmail, sessionToken);
    if (isTokenValid || process.env.NODE_ENV !== 'production') {
      if (superAdminEmail === FALLBACK_SUPERADMIN) return true;
      try {
        const cfgRes = await fetch(`${FIRESTORE_BASE}/settings/app_config`, { headers });
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          const emails = (cfg?.fields?.superadmin_emails?.arrayValue?.values || []).map((v) => (v.stringValue || '').toLowerCase().trim());
          if (emails.includes(superAdminEmail)) return true;
        }
      } catch (_) {}
    }
  }

  // 2. Otorisasi via Admin Grup Scoped
  if (targetGroupId && (trimmedPwd || trimmedHash)) {
    try {
      const gRes = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(targetGroupId)}`, { headers });
      if (gRes.ok) {
        const gData = await gRes.json();
        let storedHash = gData?.fields?.admin_password_hash?.stringValue || '';
        if (!storedHash) {
          const privRes = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(targetGroupId)}/private/config`, { headers });
          if (privRes.ok) {
            const pData = await privRes.json();
            storedHash = pData?.fields?.admin_password_hash?.stringValue || '';
          }
        }
        if (storedHash) {
          const inputGroupHash = trimmedPwd ? crypto.createHash('sha256').update(`finkas-admin:${targetGroupId}:${trimmedPwd}`).digest('hex') : trimmedHash;
          if (inputGroupHash === storedHash) return true;
        }
      }
    } catch (_) {}
  }

  // 3. Fallback: Master Password Super Admin
  if (trimmedPwd || trimmedHash) {
    const inputHash = trimmedPwd ? crypto.createHash('sha256').update(trimmedPwd).digest('hex') : trimmedHash;
    try {
      const cfgRes = await fetch(`${FIRESTORE_BASE}/settings/app_config`, { headers });
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        const masterHash = cfg?.fields?.admin_password_hash?.stringValue || '';
        if (masterHash && inputHash === masterHash) return true;
      }
    } catch (_) {}
  }

  return false;
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

    const { idTransaksi, targetCollection = 'transaksi', targetPath, groupId } = body || {};
    const trimmedId = String(idTransaksi || '').trim();
    if (!trimmedId) {
      return res.status(400).json({ status: false, message: 'ID dokumen wajib diisi.' });
    }

    const rawPath = (targetPath || targetCollection || 'transaksi').replace(/^\/+|\/+$/g, '');
    const segs = rawPath.split('/');
    const isScoped = segs.length === 3 && segs[0] === 'groups' && ALLOWED_COLS.includes(segs[2]) && /^[A-Za-z0-9-]+$/.test(segs[1]);
    const isTop = segs.length === 1 && ALLOWED_COLS.includes(segs[0]);

    if (!isScoped && !isTop) {
      return res.status(400).json({ status: false, message: 'Jalur koleksi tidak diizinkan.' });
    }
    if (!/^[A-Za-z0-9-]+$/.test(trimmedId)) {
      return res.status(400).json({ status: false, message: 'ID dokumen tidak valid.' });
    }

    const targetGroupId = groupId || (isScoped ? segs[1] : '');
    const headers = await getFirestoreHeaders();
    const authorized = await isAuthorizedToDelete(body, targetGroupId, headers);

    if (!authorized) {
      return res.status(401).json({ status: false, message: 'Tidak memiliki izin untuk menghapus data di grup ini.' });
    }

    const serviceAccount = getServiceAccount();
    if (!serviceAccount) {
      return res.status(500).json({
        status: false,
        message: 'Serverless Service Account belum dikonfigurasi.'
      });
    }

    const accessToken = await getGoogleAccessToken(serviceAccount);
    if (!accessToken) {
      return res.status(500).json({ status: false, message: 'Gagal mengotentikasi ke Google Cloud IAM.' });
    }

    const deleteUrl = `${FIRESTORE_BASE}/${rawPath}/${trimmedId}`;
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
