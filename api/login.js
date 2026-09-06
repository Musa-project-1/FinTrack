/**
 * Serverless Authentication Endpoint for Finkas on Vercel.
 * Verifies admin credentials server-side to prevent exposing password hashes to the client.
 */
import crypto from 'node:crypto';

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

    const { password } = body || {};
    const trimmed = (password || '').trim();
    if (!trimmed) {
      return res.status(400).json({ status: false, message: 'Password tidak boleh kosong.' });
    }

    const inputHash = crypto.createHash('sha256').update(trimmed).digest('hex');
    const projectId = process.env.FIREBASE_PROJECT_ID || 'finkas-kas';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/app_config`;

    const firestoreRes = await fetch(firestoreUrl);
    if (!firestoreRes.ok) {
      return res.status(502).json({ status: false, message: 'Gagal terhubung ke database konfigurasi.' });
    }

    const data = await firestoreRes.json();
    const storedHash = data?.fields?.admin_password_hash?.stringValue || '';

    if (storedHash && inputHash === storedHash) {
      const sessionToken = crypto.createHash('sha256').update(`${storedHash}:${Date.now()}`).digest('hex');
      return res.status(200).json({
        status: true,
        message: 'Login Sukses',
        data: { sessionToken, isAdmin: true }
      });
    }

    return res.status(401).json({ status: false, message: 'Password Salah!' });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Terjadi kesalahan pada server autentikasi.' });
  }
}
