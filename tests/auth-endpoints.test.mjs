import { test, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';

let rateLimitLocked = false;
let dynamicFetchMock = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const target = String(url);
  if (dynamicFetchMock) {
    const res = await dynamicFetchMock(target, opts);
    if (res !== undefined) return res;
  }
  if (target.startsWith('https://oauth2.googleapis.com/')) return realFetch(url, opts);
  if (target.includes('/documents/_ratelimit') && rateLimitLocked) {
    return new Response(JSON.stringify({
      fields: {
        count: { integerValue: '5' },
        until: { integerValue: String(Date.now() + 60000) }
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (target.includes('/audit_log/')) {
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(url, opts);
};

after(() => { globalThis.fetch = realFetch; });

const loginHandler = (await import('../api/login.js')).default;
const pinHandler = (await import('../api/verify-group-pin.js')).default;
const { legacyDigest } = await import('../api/_session.js');

const mockRes = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  setHeader(k, v) { this.headers[k] = v; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; }
});

/* ── verify-group-pin validation ─────────────────────────────────── */

test('verify-group-pin rejects non-POST requests with 405', async () => {
  const res = mockRes();
  await pinHandler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.status, false);
});

test('verify-group-pin rejects invalid group ID with 400', async () => {
  const res = mockRes();
  await pinHandler({ method: 'POST', body: { groupId: '??invalid??', pin: '1234' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'ID grup tidak valid.');
});

test('verify-group-pin rejects non-4-digit PIN with 400', async () => {
  const badPins = ['', '12', '123', '12345', 'abcd'];
  for (const pin of badPins) {
    const res = mockRes();
    await pinHandler({ method: 'POST', body: { groupId: 'GRP-TEST', pin } }, res);
    assert.equal(res.statusCode, 400, `PIN "${pin}" should be rejected`);
    assert.equal(res.body.message, 'Ketik 4 angka PIN grup.');
  }
});

/* ── login validation ────────────────────────────────────────────── */

test('login rejects non-POST requests with 405', async () => {
  const res = mockRes();
  await loginHandler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.status, false);
});

test('login rejects empty password with 400', async () => {
  const res = mockRes();
  await loginHandler({ method: 'POST', body: { password: '' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Password tidak boleh kosong.');
});

test('login rejects invalid group ID with 400', async () => {
  const res = mockRes();
  await loginHandler({ method: 'POST', body: { groupId: '??invalid??', password: 'secretpassword' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'ID grup tidak valid.');
});

/* ── Rate limit lockout (429) ────────────────────────────────────── */

test('verify-group-pin returns 429 when rate limit is locked', async () => {
  rateLimitLocked = true;
  try {
    const res = mockRes();
    await pinHandler({ method: 'POST', body: { groupId: 'GRP-TEST', pin: '1234' } }, res);
    assert.equal(res.statusCode, 429);
    assert.equal(res.body.status, false);
    assert.match(res.body.message, /Terlalu banyak percobaan/);
    assert.ok(res.body.data.retryAfterSec > 0, 'should include retryAfterSec');
  } finally {
    rateLimitLocked = false;
  }
});

test('login returns 429 when rate limit is locked', async () => {
  rateLimitLocked = true;
  try {
    const res = mockRes();
    await loginHandler({ method: 'POST', body: { groupId: 'GRP-TEST', password: 'secretpassword' } }, res);
    assert.equal(res.statusCode, 429);
    assert.equal(res.body.status, false);
    assert.match(res.body.message, /Terlalu banyak percobaan masuk/);
    assert.ok(res.body.data.retryAfterSec > 0, 'should include retryAfterSec');
  } finally {
    rateLimitLocked = false;
  }
});

/* ── Legacy hash upgrade (SHA-256 -> scrypt) ─────────────────────── */

test('verify-group-pin migrates legacy SHA-256 PIN hash to scrypt private config', async () => {
  const GID = 'GRP-PINMIG';
  const PIN = '4321';
  const legacyHash = legacyDigest(PIN, `finkas-pin:${GID}`);
  const patches = [];

  dynamicFetchMock = async (url, opts) => {
    // 1. Private config read returns 404 (not yet migrated)
    if (url.includes(`/groups/${GID}/private/config`)) {
      if (opts?.method === 'PATCH') {
        patches.push({ url, body: JSON.parse(opts.body) });
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    // 2. Group doc read returns legacy pin_hash
    if (url.includes(`/groups/${GID}`)) {
      if (opts?.method === 'PATCH') {
        patches.push({ url, body: JSON.parse(opts.body) });
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        fields: {
          pin_hash: { stringValue: legacyHash },
          nama: { stringValue: 'Grup Migrasi PIN' }
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  };

  try {
    const res = mockRes();
    await pinHandler({ method: 'POST', body: { groupId: GID, pin: PIN } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, true);
    assert.ok(res.body.data.sessionToken, 'sessionToken should be issued');

    // Verify upgrade write to private config
    const privatePatch = patches.find((p) => p.url.includes(`/groups/${GID}/private/config`));
    assert.ok(privatePatch, 'should patch private config');
    assert.ok(privatePatch.body.fields?.pin_hash?.stringValue?.startsWith('scrypt$'), 'pin_hash should be upgraded to scrypt');

    // Verify legacy cleanup on group document
    const groupPatch = patches.find((p) => p.url.includes(`/groups/${GID}`) && !p.url.includes('/private/'));
    assert.ok(groupPatch, 'should patch group doc to clear legacy hash');
    assert.equal(groupPatch.body.fields?.pin_hash?.nullValue, null);
  } finally {
    dynamicFetchMock = null;
  }
});

test('login migrates legacy SHA-256 group admin password to scrypt private config', async () => {
  const GID = 'GRP-ADMIG';
  const PASSWORD = 'mypassword123';
  const EMAIL = 'admin@example.com';
  const legacyHash = legacyDigest(PASSWORD, `finkas-admin:${GID}`);
  const patches = [];

  dynamicFetchMock = async (url, opts) => {
    if (url.includes(`/groups/${GID}/private/config`)) {
      if (opts?.method === 'PATCH') {
        patches.push({ url, body: JSON.parse(opts.body) });
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes(`/groups/${GID}`)) {
      if (opts?.method === 'PATCH') {
        patches.push({ url, body: JSON.parse(opts.body) });
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        fields: {
          admin_password_hash: { stringValue: legacyHash },
          admin_email: { stringValue: EMAIL }
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  };

  try {
    const res = mockRes();
    await loginHandler({ method: 'POST', body: { groupId: GID, password: PASSWORD, email: EMAIL } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, true);
    assert.equal(res.body.data.role, 'group_admin');

    const privatePatch = patches.find((p) => p.url.includes(`/groups/${GID}/private/config`));
    assert.ok(privatePatch, 'should patch private config');
    assert.ok(privatePatch.body.fields?.admin_password_hash?.stringValue?.startsWith('scrypt$'), 'admin_password_hash should be upgraded to scrypt');

    const groupPatch = patches.find((p) => p.url.includes(`/groups/${GID}`) && !p.url.includes('/private/'));
    assert.ok(groupPatch, 'should patch group doc to clear legacy hash');
    assert.equal(groupPatch.body.fields?.admin_password_hash?.nullValue, null);
  } finally {
    dynamicFetchMock = null;
  }
});

test('login migrates legacy SHA-256 master password on app_config to scrypt', async () => {
  const PASSWORD = 'masterpass123';
  const legacyHash = legacyDigest(PASSWORD, '');
  const patches = [];

  dynamicFetchMock = async (url, opts) => {
    if (url.includes('/documents/settings/app_config')) {
      if (opts?.method === 'PATCH') {
        patches.push({ url, body: JSON.parse(opts.body) });
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        fields: {
          admin_password_hash: { stringValue: legacyHash }
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  };

  try {
    const res = mockRes();
    await loginHandler({ method: 'POST', body: { password: PASSWORD } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, true);
    assert.equal(res.body.data.isSuperAdmin, true);

    const configPatch = patches.find((p) => p.url.includes('/documents/settings/app_config'));
    assert.ok(configPatch, 'should patch app_config');
    assert.ok(configPatch.body.fields?.admin_password_hash?.stringValue?.startsWith('scrypt$'), 'master password hash should be upgraded to scrypt');
  } finally {
    dynamicFetchMock = null;
  }
});
