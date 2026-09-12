/**
 * Shared Google Cloud service-account, Firestore REST and encoding helpers
 * for the Finkas serverless functions.
 *
 * Every privileged data operation goes through this module. The client never
 * talks to Firestore directly (see firestore.rules — all direct access is denied).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'finkas-kas';
export const FIRESTORE_BASE =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** URL-safe base64 encoding without padding. */
export const base64UrlEncode = (input) => Buffer.from(input).toString('base64url');

/* ── Service account ─────────────────────────────────────────────── */

let serviceAccountCache;
let serviceAccountLoaded = false;

/**
 * Resolve the service account from the environment (raw JSON or base64) or,
 * for local development only, from `.service-account.local.json`.
 * @returns {object|null}
 */
export function getServiceAccount() {
  if (serviceAccountLoaded) return serviceAccountCache;
  serviceAccountLoaded = true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      serviceAccountCache = JSON.parse(raw);
      return serviceAccountCache;
    } catch (err) {
      try {
        serviceAccountCache = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        return serviceAccountCache;
      } catch (innerErr) {
        console.error('[finkas] FIREBASE_SERVICE_ACCOUNT is neither valid JSON nor base64 JSON:', innerErr?.message);
      }
    }
  }

  const localPath = path.resolve(process.cwd(), '.service-account.local.json');
  if (fs.existsSync(localPath)) {
    try {
      serviceAccountCache = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      return serviceAccountCache;
    } catch (err) {
      console.error('[finkas] Failed to parse .service-account.local.json:', err?.message);
    }
  }

  console.error('[finkas] No service account configured (FIREBASE_SERVICE_ACCOUNT missing).');
  return null;
}

/** True when a usable service account with a private key is configured. */
export const hasServiceAccount = () => {
  const sa = getServiceAccount();
  return Boolean(sa && sa.client_email && sa.private_key);
};

/* ── OAuth2 access token (cached across warm invocations) ─────────── */

let cachedToken = null;
let cachedTokenExpiresAt = 0;

/**
 * Exchange a signed JWT for a Google OAuth2 access token scoped to Datastore.
 * @param {object} serviceAccount
 * @returns {Promise<string|null>}
 */
export async function getGoogleAccessToken(serviceAccount) {
  if (!serviceAccount?.client_email || !serviceAccount?.private_key) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExpiresAt - 60) return cachedToken;

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const signInput =
    `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;
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
  if (!res.ok) {
    console.error('[finkas] OAuth token exchange failed:', res.status, await res.text().catch(() => ''));
    return null;
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + Number(data.expires_in || 3600);
  return cachedToken;
}

/** Authorization header for Firestore REST, or throws when unconfigured. */
export async function requireFirestoreHeaders() {
  const sa = getServiceAccount();
  const token = await getGoogleAccessToken(sa);
  if (!token) throw new Error('Service account tidak terkonfigurasi atau gagal otentikasi ke Google Cloud.');
  return { Authorization: `Bearer ${token}` };
}

/* ── Constant-time comparison ────────────────────────────────────── */

/**
 * Timing-safe string comparison.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  if (left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(left, right);
  } catch (err) {
    console.error('[finkas] timingSafeEqual failed:', err?.message);
    return false;
  }
}

/* ── Firestore value encoding/decoding ───────────────────────────── */

/**
 * Decode a single Firestore typed value into a plain JS value.
 * Recursive, so nested arrays and maps round-trip correctly.
 */
export function decodeValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('referenceValue' in value) return value.referenceValue;
  return null;
}

/** Decode a Firestore `fields` object into a plain JS object. */
export function decodeFields(fields) {
  const out = {};
  Object.entries(fields || {}).forEach(([key, value]) => {
    out[key] = decodeValue(value);
  });
  return out;
}

/** Encode a plain JS value into a Firestore typed value. */
export function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === 'object') {
    return { mapValue: { fields: encodeFields(value) } };
  }
  return { stringValue: String(value) };
}

/** Encode a plain JS object into a Firestore `fields` object. */
export function encodeFields(obj) {
  const fields = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    fields[key] = encodeValue(value);
  });
  return fields;
}

/* ── Firestore REST document operations ──────────────────────────── */

const docUrl = (docPath, query = '') => `${FIRESTORE_BASE}/${docPath}${query}`;

/**
 * Read a single document.
 * @returns {Promise<object|null>} Decoded fields, or null when absent.
 */
export async function fsGet(docPath, headers) {
  const res = await fetch(docUrl(docPath), { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('[finkas] fsGet failed:', docPath, res.status, await res.text().catch(() => ''));
    throw new Error(`Gagal membaca dokumen (${res.status}).`);
  }
  const json = await res.json();
  return decodeFields(json.fields);
}

/**
 * Create or merge a document.
 * @param {string} docPath
 * @param {object} data
 * @param {string[]} [updateMask] When present, only these fields are written.
 */
export async function fsPatch(docPath, data, headers, updateMask) {
  const query = (updateMask || []).map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const res = await fetch(docUrl(docPath, query ? `?${query}` : ''), {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(data) })
  });
  if (!res.ok) {
    console.error('[finkas] fsPatch failed:', docPath, res.status, await res.text().catch(() => ''));
    throw new Error(`Gagal menyimpan dokumen (${res.status}).`);
  }
  return true;
}

/** Delete a document. Idempotent. */
export async function fsDelete(docPath, headers) {
  const res = await fetch(docUrl(docPath), { method: 'DELETE', headers });
  if (!res.ok && res.status !== 404) {
    console.error('[finkas] fsDelete failed:', docPath, res.status);
    throw new Error(`Gagal menghapus dokumen (${res.status}).`);
  }
  return true;
}

/** Execute an atomic batch of writes. */
export async function fsCommit(writes, headers) {
  const res = await fetch(`${FIRESTORE_BASE}:commit`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes })
  });
  if (!res.ok) {
    console.error('[finkas] fsCommit failed:', res.status, await res.text().catch(() => ''));
    throw new Error(`Gagal menulis batch (${res.status}).`);
  }
  return true;
}

/**
 * List every document name in a collection, following pagination.
 * @returns {Promise<Array<{name: string, fields: object}>>}
 */
export async function fsListAll(colPath, headers, maxPages = 40) {
  const docs = [];
  let pageToken = '';
  for (let page = 0; page < maxPages; page += 1) {
    const query = `?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(docUrl(colPath, query), { headers });
    if (!res.ok) {
      console.error('[finkas] fsListAll failed:', colPath, res.status);
      throw new Error(`Gagal membaca koleksi (${res.status}).`);
    }
    const json = await res.json();
    (json.documents || []).forEach((doc) => docs.push({ name: doc.name, fields: decodeFields(doc.fields) }));
    pageToken = json.nextPageToken || '';
    if (!pageToken) break;
  }
  return docs;
}

/** Build a Firestore document name for a collection path + id. */
export const docName = (colPath, id) =>
  `projects/${PROJECT_ID}/databases/(default)/documents/${colPath}/${id}`;
