/**
 * Script migrasi: Menambahkan field groupId ke seluruh dokumen di dalam subkoleksi groups/utama
 * dan opsi membersihkan koleksi legacy di root.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PROJECT_ID = 'finkas-kas';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

async function getAccessToken() {
  const saPath = path.resolve(process.cwd(), '.service-account.local.json');
  if (!fs.existsSync(saPath)) throw new Error('.service-account.local.json tidak ditemukan.');
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const signInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(sa.private_key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signInput}.${signature}`
    })
  });
  const data = await res.json();
  return data.access_token;
}

async function tagSubcollectionDocs(token, colName, gid = 'utama') {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const url = `${BASE}/groups/${gid}/${colName}?pageSize=300`;
  const res = await fetch(url, { headers });
  const json = await res.json();
  const docs = json.documents || [];

  let updated = 0;
  for (const doc of docs) {
    const fields = doc.fields || {};
    if (!fields.groupId) {
      const docPath = doc.name.replace(`projects/${PROJECT_ID}/databases/(default)/documents/`, '');
      await fetch(`${BASE}/${docPath}?updateMask.fieldPaths=groupId`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: { groupId: { stringValue: gid } } })
      });
      updated += 1;
    }
  }
  console.log(`[Tag groupId] ${colName}: ${updated} dokumen diperbarui dari total ${docs.length}.`);
}

async function run() {
  const token = await getAccessToken();
  console.log('Menghubungkan ke Firestore dengan Service Account...');
  await tagSubcollectionDocs(token, 'anggota', 'utama');
  await tagSubcollectionDocs(token, 'kategori', 'utama');
  await tagSubcollectionDocs(token, 'transaksi', 'utama');
  console.log('Selesai tagging groupId pada seluruh data groups/utama.');
}

run().catch(console.error);
