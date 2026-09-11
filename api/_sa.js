/**
 * Shared Service Account & IAM helper for Vercel serverless functions.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

export function getServiceAccount() {
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

export async function getGoogleAccessToken(serviceAccount) {
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

export async function getFirestoreHeaders() {
  const sa = getServiceAccount();
  if (!sa) return {};
  const token = await getGoogleAccessToken(sa);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function generateSuperAdminToken(email) {
  const clean = String(email || '').trim().toLowerCase();
  const sa = getServiceAccount();
  const secret = sa?.private_key_id || process.env.FIREBASE_PROJECT_ID || 'finkas-token-salt';
  return crypto.createHash('sha256').update(`finkas-sa:${clean}:${secret}`).digest('hex');
}

export function verifySuperAdminToken(email, token) {
  if (!email || !token) return false;
  const clean = String(email || '').trim().toLowerCase();
  const expected = generateSuperAdminToken(clean);
  if (typeof token !== 'string' || token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch (_) {
    return false;
  }
}

