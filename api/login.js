/**
 * Serverless Authentication Endpoint for Finkas on Vercel.
 * Mendukung login Admin Grup (scoped per grup) dan fallback master key.
 */
import crypto from 'node:crypto';
import { getFirestoreHeaders } from './_sa.js';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'finkas-kas';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }

    const { email, password, groupId } = body || {};
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const trimmedPwd = String(password || '').trim();
    const cleanGroupId = String(groupId || '').trim();

    if (!trimmedPwd) {
      return res.status(400).json({ status: false, message: 'Password tidak boleh kosong.' });
    }

    const headers = await getFirestoreHeaders();

    // ── 1. Verifikasi Admin Grup (jika groupId disertakan) ─────────────
    if (cleanGroupId) {
      // Ambil dokumen grup utama
      const groupRes = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(cleanGroupId)}`, { headers });
      if (groupRes.ok) {
        const gData = await groupRes.json();
        const storedEmail = (gData.fields?.admin_email?.stringValue || '').toLowerCase().trim();
        let storedHash = gData.fields?.admin_password_hash?.stringValue || '';

        // Jika belum ada di dokumen grup, cek sub-dokumen private/config
        if (!storedHash) {
          const privRes = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(cleanGroupId)}/private/config`, { headers });
          if (privRes.ok) {
            const pData = await privRes.json();
            storedHash = pData.fields?.admin_password_hash?.stringValue || '';
          }
        }

        if (storedHash) {
          // Bandingkan hash ber-salt per grup
          const inputGroupHash = crypto.createHash('sha256').update(`finkas-admin:${cleanGroupId}:${trimmedPwd}`).digest('hex');
          const emailMatch = !storedEmail || !trimmedEmail || storedEmail === trimmedEmail;

          if (emailMatch && inputGroupHash === storedHash) {
            const sessionToken = crypto.createHash('sha256').update(`${storedHash}:${Date.now()}`).digest('hex');
            return res.status(200).json({
              status: true,
              message: 'Login Admin Grup Berhasil!',
              data: {
                sessionToken,
                isAdmin: true,
                isSuperAdmin: false,
                role: 'group_admin',
                groupId: cleanGroupId,
                email: storedEmail || trimmedEmail
              }
            });
          }
        }
      }
    }

    // ── 2. Fallback: Verifikasi Master Password Super Admin (settings/app_config)
    const inputMasterHash = crypto.createHash('sha256').update(trimmedPwd).digest('hex');
    const cfgRes = await fetch(`${FIRESTORE_BASE}/settings/app_config`, { headers });
    if (cfgRes.ok) {
      const cfgData = await cfgRes.json();
      const masterHash = cfgData?.fields?.admin_password_hash?.stringValue || '';
      if (masterHash && inputMasterHash === masterHash) {
        const sessionToken = crypto.createHash('sha256').update(`${masterHash}:${Date.now()}`).digest('hex');
        return res.status(200).json({
          status: true,
          message: 'Login Master Admin Sukses!',
          data: {
            sessionToken,
            isAdmin: true,
            isSuperAdmin: true,
            role: 'superadmin'
          }
        });
      }
    }

    await new Promise((r) => setTimeout(r, 600));
    return res.status(401).json({ status: false, message: 'Email atau Password Admin salah!' });
  } catch (error) {
    return res.status(500).json({ status: false, message: error?.message || 'Terjadi kesalahan pada server autentikasi.' });
  }
}
