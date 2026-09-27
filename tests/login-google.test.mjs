import { test, after } from 'node:test';
import assert from 'node:assert/strict';

// Firestore is stubbed, not contacted. The whitelist below is the only one the
// handler can see, so a session for any other email is provably revoked.
const WHITELIST = ['owner@example.com'];
let googleTokeninfoMock = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const target = String(url);
  if (target.includes('/tokeninfo') && googleTokeninfoMock) {
    return googleTokeninfoMock(target, opts);
  }
  if (target.startsWith('https://oauth2.googleapis.com/')) return realFetch(url, opts);
  if (target.includes('/documents/settings/app_config')) {
    return new Response(JSON.stringify({
      fields: {
        superadmin_emails: {
          arrayValue: { values: WHITELIST.map((email) => ({ stringValue: email })) }
        }
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (target.includes('/documents/groups/utama/audit_log')) {
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(url);
};

process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';

after(() => { globalThis.fetch = realFetch; });

const handler = (await import('../api/login-google.js')).default;
const { ROLES, signSession, SUPERADMIN_SESSION_TTL } = await import('../api/_session.js');

const REVOKED = 'revoked@example.com';

const mockRes = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  setHeader(k, v) { this.headers[k] = v; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; }
});

const call = async (body) => {
  const res = mockRes();
  await handler({ method: 'POST', body }, res);
  return res;
};

/**
 * A session minted while an email was whitelisted must stop working the moment
 * that email leaves the list. The stubbed whitelist is the only one the
 * handler sees, so this email is refused on every guarded action.
 */
test('a revoked superadmin session is rejected on whitelist actions', async () => {
  const token = signSession(
    { role: ROLES.SUPERADMIN, email: REVOKED },
    SUPERADMIN_SESSION_TTL
  );

  for (const body of [
    { action: 'list', sessionToken: token },
    { action: 'add', emailToAdd: 'new@example.com', sessionToken: token },
    { action: 'remove', emailToRemove: 'other@example.com', sessionToken: token }
  ]) {
    const res = await call(body);
    assert.equal(res.statusCode, 403, `${body.action} should reject a revoked session`);
    assert.equal(res.body.status, false);
  }
});

/**
 * The password login mints a superadmin session with no email. That token can
 * no longer pass the whitelist gate, so it is refused rather than trusted.
 */
test('a superadmin session without an email is rejected', async () => {
  const token = signSession({ role: ROLES.SUPERADMIN }, SUPERADMIN_SESSION_TTL);
  const res = await call({ action: 'list', sessionToken: token });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.status, false);
});

/** The email still on the whitelist keeps its access. */
test('a whitelisted superadmin session can list the whitelist', async () => {
  const token = signSession(
    { role: ROLES.SUPERADMIN, email: WHITELIST[0] },
    SUPERADMIN_SESSION_TTL
  );
  const res = await call({ action: 'list', sessionToken: token });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, true);
  assert.deepEqual(res.body.data.map((row) => row.email), WHITELIST);
});

/* ── Google token exchange ───────────────────────────────────────── */

const CLIENT_ID = '837369279315-f8s1pp1c16gtoili3104bn5qv9nd0385.apps.googleusercontent.com';

test('login-google rejects tokens with mismatched audience (401)', async () => {
  googleTokeninfoMock = async () => new Response(JSON.stringify({
    aud: 'unauthorized-app-client-id.apps.googleusercontent.com',
    email: WHITELIST[0],
    email_verified: true
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const res = await call({ idToken: 'mock-token-mismatched-aud' });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.status, false);
    assert.match(res.body.message, /Audience token Google tidak cocok/);
  } finally {
    googleTokeninfoMock = null;
  }
});

test('login-google rejects tokens with unverified email (401)', async () => {
  googleTokeninfoMock = async () => new Response(JSON.stringify({
    aud: CLIENT_ID,
    email: WHITELIST[0],
    email_verified: false
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const res = await call({ idToken: 'mock-token-unverified-email' });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.status, false);
    assert.match(res.body.message, /Email Google belum diverifikasi/);
  } finally {
    googleTokeninfoMock = null;
  }
});

test('login-google rejects valid verified Google accounts not on whitelist (403)', async () => {
  googleTokeninfoMock = async () => new Response(JSON.stringify({
    aud: CLIENT_ID,
    email: 'stranger@example.com',
    email_verified: true
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const res = await call({ idToken: 'mock-token-stranger' });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.status, false);
    assert.match(res.body.message, /bukan Super Admin pemilik Finkas/);
  } finally {
    googleTokeninfoMock = null;
  }
});

test('login-google mints signed superadmin session for whitelisted Google account (200)', async () => {
  googleTokeninfoMock = async () => new Response(JSON.stringify({
    aud: CLIENT_ID,
    email: WHITELIST[0],
    name: 'Primary Owner',
    email_verified: true
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const res = await call({ idToken: 'mock-token-owner' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, true);
    assert.equal(res.body.data.isSuperAdmin, true);
    assert.equal(res.body.data.email, WHITELIST[0]);
    assert.ok(res.body.data.sessionToken, 'sessionToken should be issued');
  } finally {
    googleTokeninfoMock = null;
  }
});
