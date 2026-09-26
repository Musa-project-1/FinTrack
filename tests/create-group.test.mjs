import { test, after } from 'node:test';
import assert from 'node:assert/strict';

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
  if (target.includes('/documents/groups')) {
    return new Response(JSON.stringify({ documents: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return realFetch(url, opts);
};

process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';

after(() => { globalThis.fetch = realFetch; });

const handler = (await import('../api/create-group.js')).default;
const { ROLES, signSession, SUPERADMIN_SESSION_TTL } = await import('../api/_session.js');

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

test('create-group rejects a revoked superadmin session', async () => {
  const token = signSession(
    { role: ROLES.SUPERADMIN, email: 'revoked@example.com' },
    SUPERADMIN_SESSION_TTL
  );
  const res = await call({ action: 'list', sessionToken: token });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.status, false);
});

test('create-group rejects an email-less superadmin session', async () => {
  const token = signSession({ role: ROLES.SUPERADMIN }, SUPERADMIN_SESSION_TTL);
  const res = await call({ action: 'list', sessionToken: token });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.status, false);
});

test('create-group allows a whitelisted superadmin session', async () => {
  const token = signSession(
    { role: ROLES.SUPERADMIN, email: WHITELIST[0] },
    SUPERADMIN_SESSION_TTL
  );
  const res = await call({ action: 'list', sessionToken: token });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, true);
});
