import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';

import handler from '../api/data.js';
import { ROLES, signSession, GROUP_SESSION_TTL } from '../api/_session.js';

const GID_A = 'GRP-TESTA';
const GID_B = 'GRP-TESTB';

const mockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
  return res;
};

test('data gateway rejects non-POST requests with 405', async () => {
  const res = mockRes();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.status, false);
});

test('data gateway rejects missing action with 400', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Aksi wajib diisi.');
});

test('data gateway rejects invalid group ID with 400', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: { action: 'read', groupId: '??invalid??' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'ID grup tidak valid.');
});

test('data gateway rejects unauthenticated request with 401', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: { action: 'read', groupId: GID_A } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.status, false);
});

test('data gateway rejects member trying to write with 403', async () => {
  const memberToken = signSession({ role: ROLES.MEMBER, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'tambahTransaksi',
      groupId: GID_A,
      sessionToken: memberToken,
      dataForm: { nominal: 10000 }
    }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Hanya admin grup yang dapat mengubah data ini.');
});

test('data gateway rejects group admin writing to a different group with 403', async () => {
  const adminAToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'tambahTransaksi',
      groupId: GID_B, // target is GID_B while admin is for GID_A
      sessionToken: adminAToken,
      dataForm: { nominal: 10000 }
    }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Hanya admin grup yang dapat mengubah data ini.');
});

test('data gateway rejects member reading audit log with 403', async () => {
  const memberToken = signSession({ role: ROLES.MEMBER, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'audit',
      groupId: GID_A,
      sessionToken: memberToken
    }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Hanya admin yang dapat membaca riwayat audit.');
});

test('data gateway rejects unknown action with 400', async () => {
  const adminToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'nonExistentAction',
      groupId: GID_A,
      sessionToken: adminToken
    }
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Aksi tidak dikenal.');
});

test('data gateway allows a member to call checkUpdate on its own group', async () => {
  const memberToken = signSession({ role: ROLES.MEMBER, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'checkUpdate',
      groupId: GID_A,
      sessionToken: memberToken,
      since: '2026-01-01T00:00:00.000Z'
    }
  }, res);
  // Passes authorization (a member may read its group). Without a live service
  // account the Firestore read then fails with 500 — but never 401/403, proving
  // checkUpdate is routed as a member-readable action.
  assert.notEqual(res.statusCode, 401);
  assert.notEqual(res.statusCode, 403);
});

test('data gateway rejects checkUpdate from a member of a different group with 403', async () => {
  const memberToken = signSession({ role: ROLES.MEMBER, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'checkUpdate',
      groupId: GID_B,
      sessionToken: memberToken,
      since: '2026-01-01T00:00:00.000Z'
    }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Tidak memiliki akses ke grup ini.');
});
