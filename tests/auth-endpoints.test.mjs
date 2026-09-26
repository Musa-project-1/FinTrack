import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';

const loginHandler = (await import('../api/login.js')).default;
const pinHandler = (await import('../api/verify-group-pin.js')).default;

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
