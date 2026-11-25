import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { signRawSession } from './helpers/signed-session.mjs';
import { mockServiceAccount } from './helpers/mock-service-account.mjs';

process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';

import handler from '../api/data.ts';
import { ROLES, signSession, GROUP_SESSION_TTL, checkReadRateLimit } from '../api/_session.ts';

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
  assert.equal(res.body.message, 'Hanya Super Admin yang dapat membaca riwayat audit.');
});

test('data gateway rejects group admin reading audit log with 403', async () => {
  const adminToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_A }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'audit',
      groupId: GID_A,
      sessionToken: adminToken
    }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Hanya Super Admin yang dapat membaca riwayat audit.');
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
  assert.equal(res.statusCode, 200);
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

/* ── Read rate limiting (cost guard) ─────────────────────────────── */

test('checkReadRateLimit blocks once the per-window cap is exceeded', () => {
  const key = `test-read:${Math.random()}`;
  // 3 requests allowed, the 4th is limited.
  assert.equal(checkReadRateLimit(key, 3, 60_000).limited, false);
  assert.equal(checkReadRateLimit(key, 3, 60_000).limited, false);
  assert.equal(checkReadRateLimit(key, 3, 60_000).limited, false);
  const fourth = checkReadRateLimit(key, 3, 60_000);
  assert.equal(fourth.limited, true);
  assert.ok(fourth.retryAfterSec > 0);
});

test('checkReadRateLimit starts a fresh window after it elapses', () => {
  const key = `test-read-window:${Math.random()}`;
  // A zero-length window means each call opens a new window → never limited.
  assert.equal(checkReadRateLimit(key, 1, 0).limited, false);
  assert.equal(checkReadRateLimit(key, 1, 0).limited, false);
});

/* ── Superadmin revocation on the data gateway ───────────────────── */

// The whitelist lives in Firestore. Stubbing that one document makes the
// revocation decision deterministic without touching a real database.
const SA_WHITELIST = ['owner@example.com'];
const oauthResponse = mockServiceAccount();
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const target = String(url);
  if (target.startsWith('https://oauth2.googleapis.com/')) return oauthResponse();
  if (target.includes('/documents/settings/app_config')) {
    return new Response(JSON.stringify({
      fields: {
        superadmin_emails: {
          arrayValue: { values: SA_WHITELIST.map((email) => ({ stringValue: email })) }
        }
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  const path = new URL(target).pathname.split('/documents/')[1];
  const method = opts?.method || 'GET';
  if (method === 'PATCH' && (path === `groups/${GID_A}` || path.includes('/audit_log/'))) {
    return Response.json({});
  }
  if (method === 'GET' && path === `groups/${GID_A}`) {
    return Response.json({ fields: { nama: { stringValue: 'Grup Test A' }, groupId: { stringValue: GID_A } } });
  }
  if (method === 'GET' && path?.startsWith('_revoked_sessions/')) {
    return Response.json({}, { status: 404 });
  }
  if (method === 'GET' && path === 'groups/GRP-GHOST') return Response.json({}, { status: 404 });
  if (method === 'GET' && path === 'groups/GRP-REVOKED') {
    return Response.json({ fields: { revokedAfter: { integerValue: String(Math.floor(Date.now() / 1000) + 60) } } });
  }
  if (method === 'GET' && path === 'groups/GRP-MISMATCH') {
    return Response.json({ fields: { groupId: { stringValue: 'GRP-OTHER' } } });
  }
  if (method === 'GET' && path === `groups/${GID_A}/audit_log`) {
    return new Response(JSON.stringify({
      documents: [{
        fields: {
          Timestamp: { stringValue: '2026-11-20T10:00:00.000Z' },
          Aksi: { stringValue: 'LOGIN_ADMIN' },
          Detail: { stringValue: 'Uji akses superadmin' }
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`Unexpected request: ${method} ${path}`);
};
after(() => { globalThis.fetch = realFetch; });

test('data gateway rejects a revoked superadmin writing to a group', async () => {
  const token = signSession(
    { role: ROLES.SUPERADMIN, email: 'revoked@example.com' },
    GROUP_SESSION_TTL
  );
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'catatAktivitas',
      groupId: GID_A,
      sessionToken: token,
      aksi: 'LOGOUT_ADMIN',
      detail: 'uji'
    }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.status, false);
});

test('data gateway rejects a revoked superadmin reading a group', async () => {
  const token = signSession(
    { role: ROLES.SUPERADMIN, email: 'revoked@example.com' },
    GROUP_SESSION_TTL
  );
  const res = mockRes();
  await handler({
    method: 'POST',
    body: { action: 'checkUpdate', groupId: GID_A, sessionToken: token }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.status, false);
});

test('data gateway lets a whitelisted superadmin write to a group', async () => {
  const token = signSession(
    { role: ROLES.SUPERADMIN, email: SA_WHITELIST[0] },
    GROUP_SESSION_TTL
  );
  const res = mockRes();
  await handler({
    method: 'POST',
    body: {
      action: 'catatAktivitas',
      groupId: GID_A,
      sessionToken: token,
      aksi: 'LOGOUT_ADMIN',
      detail: 'uji'
    }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, true);
});

test('data gateway rejects a revoked superadmin reading audit log with 403', async () => {
  const token = signSession(
    { role: ROLES.SUPERADMIN, email: 'revoked@example.com' },
    GROUP_SESSION_TTL
  );
  const res = mockRes();
  await handler({
    method: 'POST',
    body: { action: 'audit', groupId: GID_A, sessionToken: token }
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.status, false);
  assert.equal(res.body.message, 'Tidak memiliki akses ke grup ini.');
});

test('data gateway allows a whitelisted superadmin reading audit log', async () => {
  const token = signSession(
    { role: ROLES.SUPERADMIN, email: SA_WHITELIST[0] },
    GROUP_SESSION_TTL
  );
  const res = mockRes();
  await handler({
    method: 'POST',
    body: { action: 'audit', groupId: GID_A, sessionToken: token }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, true);
  assert.equal(Array.isArray(res.body.data?.log), true);
  assert.equal(res.body.data.log.length, 1);
});

test('whitelisted superadmins cannot read or write a missing or mismatched group', async () => {
  const sessionToken = signSession({ role: ROLES.SUPERADMIN, email: SA_WHITELIST[0] }, GROUP_SESSION_TTL);
  for (const [groupId, expected] of [['GRP-GHOST', 404], ['GRP-MISMATCH', 401]]) {
    for (const action of ['read', 'audit', 'checkUpdate', 'catatAktivitas']) {
      const res = mockRes();
      await handler({ method: 'POST', body: { groupId, sessionToken, action, aksi: 'LOGOUT_ADMIN' } }, res);
      assert.equal(res.statusCode, expected, action);
    }
  }
});

test('revocation rejects stale and undated group sessions for reads and writes', async () => {
  const groupId = 'GRP-REVOKED';
  for (const iat of [Math.floor(Date.now() / 1000), undefined]) {
    const sessionToken = signRawSession(JSON.stringify({ role: ROLES.GROUP_ADMIN, gid: groupId, exp: 9999999999, iat }));
    for (const action of ['checkUpdate', 'catatAktivitas']) {
      const res = mockRes();
      await handler({ method: 'POST', body: { action, groupId, sessionToken } }, res);
      assert.equal(res.statusCode, 401);
    }
  }
});

test('read action strips Nomor_WA and operationId for MEMBER and retains them for GROUP_ADMIN (SEC-19)', async (t) => {
  const prevFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    const path = new URL(String(url)).pathname.split('/documents/')[1];
    if (path === `groups/${GID_A}/anggota`) {
      return Response.json({
        documents: [{
          name: `projects/p/databases/(default)/documents/groups/${GID_A}/anggota/ANG-1`,
          fields: {
            ID_Anggota: { stringValue: 'ANG-1' },
            Nama_Anggota: { stringValue: 'Budi' },
            Nomor_WA: { stringValue: '6281234567890' },
            Status_Aktif: { stringValue: 'Aktif' }
          }
        }]
      });
    }
    if (path === `groups/${GID_A}/kategori`) return Response.json({ documents: [] });
    if (path === `groups/${GID_A}/transaksi`) {
      return Response.json({
        documents: [{
          name: `projects/p/databases/(default)/documents/groups/${GID_A}/transaksi/TRX-1`,
          fields: {
            ID_Transaksi: { stringValue: 'TRX-1' },
            Nominal: { integerValue: '10000' },
            operationId: { stringValue: 'OP-SECRET-ID' }
          }
        }]
      });
    }
    if (path === `groups/${GID_A}/settings/app_config`) return Response.json({}, { status: 404 });
    return prevFetch(url, opts);
  });

  const memberToken = signSession({ role: ROLES.MEMBER, gid: GID_A }, GROUP_SESSION_TTL);
  const memberRes = mockRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '198.51.100.10' }, body: { action: 'read', groupId: GID_A, sessionToken: memberToken } }, memberRes);
  assert.equal(memberRes.statusCode, 200);
  assert.equal(memberRes.body.data.anggota[0].Nama_Anggota, 'Budi');
  assert.equal('Nomor_WA' in memberRes.body.data.anggota[0], false);
  assert.equal('operationId' in memberRes.body.data.transaksi[0], false);

  const adminToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_A }, GROUP_SESSION_TTL);
  const adminRes = mockRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '198.51.100.11' }, body: { action: 'read', groupId: GID_A, sessionToken: adminToken } }, adminRes);
  assert.equal(adminRes.statusCode, 200);
  assert.equal(adminRes.body.data.anggota[0].Nomor_WA, '6281234567890');
  assert.equal(adminRes.body.data.transaksi[0].operationId, 'OP-SECRET-ID');
});

test('data gateway rejects prototype action names and non-string action/groupId with 400 (SEC-22)', async () => {
  const adminToken = signSession({ role: ROLES.GROUP_ADMIN, gid: GID_A }, GROUP_SESSION_TTL);
  for (const action of ['toString', 'constructor', 'valueOf', '__proto__']) {
    const res = mockRes();
    await handler({ method: 'POST', body: { action, groupId: GID_A, sessionToken: adminToken } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Aksi tidak dikenal.');
  }

  const nullProtoAction = Object.assign(Object.create(null), { bad: 1 });
  const nonStrActionRes = mockRes();
  await handler({ method: 'POST', body: { action: nullProtoAction, groupId: GID_A, sessionToken: adminToken } }, nonStrActionRes);
  assert.equal(nonStrActionRes.statusCode, 400);

  const nonStrGidRes = mockRes();
  await handler({ method: 'POST', body: { action: 'read', groupId: nullProtoAction, sessionToken: adminToken } }, nonStrGidRes);
  assert.equal(nonStrGidRes.statusCode, 400);
});

test('data gateway allows superadmin audit on utama even when groups/utama root doc is absent (SEC-45)', async (t) => {
  const prevFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    const path = new URL(String(url)).pathname.split('/documents/')[1];
    if (path === 'groups/utama') return Response.json({}, { status: 404 });
    if (path === 'groups/utama/audit_log') {
      return Response.json({
        documents: [{ fields: { Timestamp: { stringValue: '2026-11-20T10:00:00.000Z' }, Aksi: { stringValue: 'LOGIN_SUPERADMIN_GOOGLE' }, Detail: { stringValue: 'ok' }, groupId: { stringValue: 'utama' } } }]
      });
    }
    return prevFetch(url, opts);
  });

  const token = signSession({ role: ROLES.SUPERADMIN, email: SA_WHITELIST[0] }, GROUP_SESSION_TTL);
  const res = mockRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '198.51.100.12' }, body: { action: 'audit', groupId: 'utama', sessionToken: token } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.log.length, 1);
  assert.equal(res.body.data.log[0].Aksi, 'LOGIN_SUPERADMIN_GOOGLE');
});
