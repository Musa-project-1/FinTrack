/**
 * Serverless Google Sign-In & Super Admin Endpoint for Finkas on Vercel.
 * Memverifikasi ID Token Google dan mencocokkan email dengan whitelist superadmin.
 */
import crypto from 'node:crypto';
import { getFirestoreHeaders, generateSuperAdminToken, verifySuperAdminToken } from './_sa.js';

const FALLBACK_SUPERADMIN = 'musabakhtiar0@gmail.com';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'finkas-kas';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getSuperadminList(headers) {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/settings/app_config`, { headers });
    if (!res.ok) return [FALLBACK_SUPERADMIN];
    const data = await res.json();
    const values = data?.fields?.superadmin_emails?.arrayValue?.values || [];
    const list = values.map((v) => (v.stringValue || '').toLowerCase().trim()).filter(Boolean);
    if (!list.includes(FALLBACK_SUPERADMIN)) {
      list.unshift(FALLBACK_SUPERADMIN);
    }
    return list;
  } catch (_) {
    return [FALLBACK_SUPERADMIN];
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

    const headers = await getFirestoreHeaders();
    const action = body?.action || 'login';

    // ── AKSI 1: Login via Google ID Token / Access Token ────────────────
    if (action === 'login') {
      const rawToken = String(body?.idToken || body?.accessToken || body?.token || '').trim();
      const directEmail = String(body?.email || '').trim().toLowerCase();

      let verifiedEmail = '';
      let userName = '';

      if (rawToken) {
        // Cek apakah berupa OAuth2 access_token (biasanya diawali 'ya29.') atau ID token JWT
        const isAccessToken = rawToken.startsWith('ya29.');
        const tokenQuery = isAccessToken
          ? `access_token=${encodeURIComponent(rawToken)}`
          : `id_token=${encodeURIComponent(rawToken)}`;
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?${tokenQuery}`);
        if (!googleRes.ok) {
          return res.status(401).json({ status: false, message: 'Token Google tidak valid atau sudah kedaluwarsa.' });
        }
        const gData = await googleRes.json();
        const isVerified = gData.email_verified === 'true' || gData.email_verified === true || gData.verified_email === true;
        if (!isVerified) {
          return res.status(401).json({ status: false, message: 'Email Google belum diverifikasi.' });
        }
        verifiedEmail = (gData.email || '').toLowerCase().trim();
        userName = gData.name || '';
      } else if (process.env.NODE_ENV !== 'production' && directEmail) {
        // Fallback pengujian dev lokal
        verifiedEmail = directEmail;
        userName = 'Dev Super Admin';
      } else {
        return res.status(400).json({ status: false, message: 'Token otentikasi Google diperlukan.' });
      }

      const allowedEmails = await getSuperadminList(headers);
      if (!allowedEmails.includes(verifiedEmail)) {
        await new Promise((r) => setTimeout(r, 600));
        return res.status(403).json({
          status: false,
          message: `Akun Google (${verifiedEmail}) bukan Super Admin pemilik Finkas.`
        });
      }

      const sessionToken = generateSuperAdminToken(verifiedEmail);
      return res.status(200).json({
        status: true,
        message: 'Login Super Admin Sukses!',
        data: {
          isSuperAdmin: true,
          isAdmin: true,
          role: 'superadmin',
          email: verifiedEmail,
          name: userName,
          sessionToken
        }
      });
    }

    // ── AKSI 2: Ambil Daftar Super Admin (khusus Super Admin aktif) ───────
    if (action === 'list') {
      const callerEmail = String(body?.callerEmail || '').trim().toLowerCase();
      const sessionToken = String(body?.sessionToken || '').trim();
      const allowedEmails = await getSuperadminList(headers);

      if (!verifySuperAdminToken(callerEmail, sessionToken) && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ status: false, message: 'Otorisasi sesi Super Admin tidak valid.' });
      }
      if (!allowedEmails.includes(callerEmail)) {
        return res.status(403).json({ status: false, message: 'Hanya Super Admin yang dapat melihat daftar ini.' });
      }
      return res.status(200).json({
        status: true,
        data: allowedEmails.map((email) => ({
          email,
          isPrimary: email === FALLBACK_SUPERADMIN
        }))
      });
    }

    // ── AKSI 3: Tambah Email Super Admin Baru ─────────────────────────────
    if (action === 'add') {
      const callerEmail = String(body?.callerEmail || '').trim().toLowerCase();
      const sessionToken = String(body?.sessionToken || '').trim();
      const newEmail = String(body?.emailToAdd || '').trim().toLowerCase();

      if (!verifySuperAdminToken(callerEmail, sessionToken) && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ status: false, message: 'Otorisasi sesi Super Admin tidak valid.' });
      }
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return res.status(400).json({ status: false, message: 'Format email tidak valid.' });
      }

      const allowedEmails = await getSuperadminList(headers);
      if (!allowedEmails.includes(callerEmail)) {
        return res.status(403).json({ status: false, message: 'Hanya Super Admin yang berwenang menambah admin.' });
      }
      if (allowedEmails.includes(newEmail)) {
        return res.status(400).json({ status: false, message: 'Email tersebut sudah terdaftar sebagai Super Admin.' });
      }

      const updatedList = [...allowedEmails, newEmail];
      const patchBody = {
        fields: {
          superadmin_emails: {
            arrayValue: {
              values: updatedList.map((em) => ({ stringValue: em }))
            }
          }
        }
      };

      const patchRes = await fetch(`${FIRESTORE_BASE}/settings/app_config?updateMask.fieldPaths=superadmin_emails`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });

      if (!patchRes.ok) {
        return res.status(502).json({ status: false, message: 'Gagal memperbarui database konfigurasi.' });
      }

      return res.status(200).json({
        status: true,
        message: `Email ${newEmail} berhasil ditambahkan sebagai Super Admin.`,
        data: updatedList
      });
    }

    // ── AKSI 4: Hapus Email Super Admin ──────────────────────────────────
    if (action === 'remove') {
      const callerEmail = String(body?.callerEmail || '').trim().toLowerCase();
      const sessionToken = String(body?.sessionToken || '').trim();
      const removeEmail = String(body?.emailToRemove || '').trim().toLowerCase();

      if (!verifySuperAdminToken(callerEmail, sessionToken) && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ status: false, message: 'Otorisasi sesi Super Admin tidak valid.' });
      }
      if (removeEmail === FALLBACK_SUPERADMIN) {
        return res.status(400).json({ status: false, message: 'Email Pemilik Utama tidak boleh dihapus.' });
      }

      const allowedEmails = await getSuperadminList(headers);
      if (!allowedEmails.includes(callerEmail)) {
        return res.status(403).json({ status: false, message: 'Hanya Super Admin yang berwenang menghapus admin.' });
      }

      const updatedList = allowedEmails.filter((em) => em !== removeEmail);
      const patchBody = {
        fields: {
          superadmin_emails: {
            arrayValue: {
              values: updatedList.map((em) => ({ stringValue: em }))
            }
          }
        }
      };

      const patchRes = await fetch(`${FIRESTORE_BASE}/settings/app_config?updateMask.fieldPaths=superadmin_emails`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });

      if (!patchRes.ok) {
        return res.status(502).json({ status: false, message: 'Gagal memperbarui database konfigurasi.' });
      }

      return res.status(200).json({
        status: true,
        message: `Akses Super Admin untuk ${removeEmail} telah dicabut.`,
        data: updatedList
      });
    }

    return res.status(400).json({ status: false, message: 'Aksi tidak dikenal.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err?.message || 'Terjadi kesalahan server.' });
  }
}
