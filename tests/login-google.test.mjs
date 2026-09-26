import { test, after } from 'node:test';
import assert from 'node:assert/strict';

// Firestore is stubbed, not contacted. The whitelist below is the only one the
// handler can see, so a session for any other email is provably revoked.
const WHITELIST = ['owner@example.com'];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const target = String(url);
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
