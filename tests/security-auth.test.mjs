import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mockServiceAccount } from './helpers/mock-service-account.mjs';
import { signRawSession } from './helpers/signed-session.mjs';

const SECRET_PRIMARY = 'primary-session-secret-value-at-least-32-chars';
const SECRET_PREVIOUS = 'previous-session-secret-value-at-least-32-chars';
process.env.FINKAS_SESSION_SECRET = SECRET_PRIMARY;

const mockRes = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  setHeader(k, v) { this.headers[k] = v; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
  end(chunk) { this.body = chunk ? JSON.parse(String(chunk)) : null; }
});

/**
 * Stateful in-memory Firestore mock supporting GET updateTime metadata,
 * PATCH, and atomic `:commit` with `exists` & `updateTime` CAS preconditions.
 */
function createStatefulFirestoreMock({
  appConfig = {},
  groups = {},
  privateConfigs = {},
  googleTokeninfo = null,
  commitDelayMs = 0,
  failGroupDocCommit = false,
  failRateLimit = false
} = {}) {
  const docs = new Map();
  let seq = 0;
  const setDoc = (path, fields) => {
    docs.set(path, {
      fields: structuredClone(fields),
      updateTime: `2026-11-25T12:00:${String(++seq).padStart(2, '0')}.000000Z`
    });
  };
  setDoc('settings/app_config', appConfig);
  for (const [gid, data] of Object.entries(groups)) {
    setDoc(`groups/${gid}`, data);
  }
  for (const [gid, data] of Object.entries(privateConfigs)) {
    setDoc(`groups/${gid}/private/config`, data);
  }

  let oauthFetchCalls = 0;
  let tokeninfoCalls = 0;
  let lastTokeninfoSignal = null;

  const toFirestore = (obj) => {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
      if (v === null || v === undefined) out[k] = { nullValue: null };
      else if (typeof v === 'boolean') out[k] = { booleanValue: v };
      else if (typeof v === 'number') out[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
      else if (Array.isArray(v)) out[k] = { arrayValue: { values: v.map((item) => ({ stringValue: String(item) })) } };
      else out[k] = { stringValue: String(v) };
    }
    return out;
  };
  const fromFirestore = (fields) => {
    const out = {};
    for (const [k, v] of Object.entries(fields || {})) {
      if ('stringValue' in v) out[k] = v.stringValue;
      else if ('integerValue' in v) out[k] = Number(v.integerValue);
      else if ('doubleValue' in v) out[k] = Number(v.doubleValue);
      else if ('booleanValue' in v) out[k] = Boolean(v.booleanValue);
      else if ('nullValue' in v) out[k] = null;
      else if ('arrayValue' in v) out[k] = (v.arrayValue.values || []).map((x) => x.stringValue);
    }
    return out;
  };

  const fetchImpl = async (url, opts = {}) => {
    const target = String(url);
    if (target === 'https://oauth2.googleapis.com/token') {
      oauthFetchCalls += 1;
      return Response.json({ access_token: 'mock-access-token', expires_in: 3600 });
    }
    if (target.includes('/tokeninfo')) {
      tokeninfoCalls += 1;
      lastTokeninfoSignal = opts?.signal || null;
      if (googleTokeninfo) return googleTokeninfo(target, opts);
      return Response.json({}, { status: 401 });
    }

    const parsed = new URL(target);
    const method = opts?.method || 'GET';

    if (parsed.pathname.endsWith(':commit') && method === 'POST') {
      if (commitDelayMs) await new Promise((r) => setTimeout(r, commitDelayMs));
      const { writes = [] } = JSON.parse(opts.body || '{}');
      if (failRateLimit && writes.some((w) => String(w.update?.name || '').includes('/_ratelimit/'))) {
        return Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 });
      }
      if (failGroupDocCommit && writes.some((w) => /\/documents\/groups\/[^/]+$/.test(String(w.update?.name || '')))) {
        return Response.json({ error: { status: 'ABORTED' } }, { status: 503 });
      }
      for (const w of writes) {
        const docPath = String(w.update?.name || w.delete).split('/documents/')[1];
        const existing = docs.get(docPath);
        if (w.currentDocument?.exists === false && existing) {
          return Response.json({ error: { status: 'ALREADY_EXISTS' } }, { status: 409 });
        }
        if (w.currentDocument?.exists === true && !existing) {
          return Response.json({ error: { status: 'FAILED_PRECONDITION' } }, { status: 409 });
        }
        if (w.currentDocument?.updateTime && existing?.updateTime !== w.currentDocument.updateTime) {
          return Response.json({ error: { status: 'FAILED_PRECONDITION' } }, { status: 409 });
        }
      }
      for (const w of writes) {
        const docPath = String(w.update?.name || w.delete).split('/documents/')[1];
        if (w.delete) {
          docs.delete(docPath);
          continue;
        }
        const incoming = fromFirestore(w.update.fields);
        if (w.updateMask?.fieldPaths) {
          const merged = structuredClone(docs.get(docPath)?.fields || {});
          for (const f of w.updateMask.fieldPaths) {
            if (Object.hasOwn(incoming, f)) merged[f] = incoming[f];
            else delete merged[f];
          }
          setDoc(docPath, merged);
        } else {
          setDoc(docPath, incoming);
        }
      }
      return Response.json({ writeResults: writes.map(() => ({})) });
    }

    const docPath = decodeURIComponent(parsed.pathname.split('/documents/')[1]);
    if (failRateLimit && docPath.startsWith('_ratelimit/')) {
      return Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 });
    }

    if (method === 'PATCH') {
      const body = JSON.parse(opts.body || '{}');
      const incoming = fromFirestore(body.fields);
      const mask = parsed.searchParams.getAll('updateMask.fieldPaths');
      if (mask.length) {
        const merged = structuredClone(docs.get(docPath)?.fields || {});
        for (const f of mask) {
          if (Object.hasOwn(incoming, f)) merged[f] = incoming[f];
          else delete merged[f];
        }
        setDoc(docPath, merged);
      } else {
        setDoc(docPath, incoming);
      }
      const saved = docs.get(docPath);
      return Response.json({ fields: toFirestore(saved.fields), updateTime: saved.updateTime });
    }

    if (method === 'GET') {
      if (parsed.searchParams.has('pageSize')) {
        const prefix = `${docPath}/`;
        const list = [...docs.entries()]
          .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
          .map(([p, entry]) => ({
            name: `projects/finkas-kas/databases/(default)/documents/${p}`,
            fields: toFirestore(entry.fields)
          }));
        return Response.json({ documents: list });
      }
      const existing = docs.get(docPath);
      if (!existing) return Response.json({}, { status: 404 });
      return Response.json({
        name: `projects/finkas-kas/databases/(default)/documents/${docPath}`,
        fields: toFirestore(existing.fields),
        updateTime: existing.updateTime
      });
    }

    throw new Error(`Unexpected mock request: ${method} ${target}`);
  };

  return {
    docs,
    fetchImpl,
    stats: () => ({ oauthFetchCalls, tokeninfoCalls, lastTokeninfoSignal }),
    setFailRateLimit: (v) => { failRateLimit = v; },
    setFailGroupDocCommit: (v) => { failGroupDocCommit = v; },
    setCommitDelayMs: (v) => { commitDelayMs = v; }
  };
}

mockServiceAccount();
const realFetch = globalThis.fetch;
after(() => { globalThis.fetch = realFetch; });

const { parseBody, enforceSameOrigin } = await import('../api/_http.ts');
const sessionMod = await import('../api/_session.ts');
const { fsCommit, isPreconditionFailure } = await import('../api/_sa.ts');
const loginHandler = (await import('../api/login.ts')).default;
const logoutHandler = (await import('../api/logout.ts')).default;
const pinHandler = (await import('../api/verify-group-pin.ts')).default;
const googleHandler = (await import('../api/login-google.ts')).default;
const createGroupHandler = (await import('../api/create-group.ts')).default;

/* ── SEC-16: parseBody & enforceSameOrigin ────────────────────────── */

test('SEC-16: parseBody rejects arrays/non-plain objects and strips dangerous prototype keys', () => {
  assert.deepEqual(parseBody({ body: [1, 2, 3] }), {});
  assert.deepEqual(parseBody({ body: '["a"]' }), {});
  assert.deepEqual(parseBody({ body: '"scalar"' }), {});
  assert.deepEqual(parseBody({ body: new Date() }), {});

  const parsed = parseBody({
    body: '{"__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}},"nested":{"prototype":{"y":2},"ok":42},"action":"login"}'
  });
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.hasOwn(parsed, '__proto__'), false);
  assert.equal(Object.hasOwn(parsed, 'constructor'), false);
  assert.equal(Object.hasOwn(parsed.nested, 'prototype'), false);
  assert.equal(parsed.nested.ok, 42);
  assert.equal(parsed.action, 'login');
});

test('SEC-16: enforceSameOrigin blocks non-JSON Content-Type (415) and cross-origin requests (403) across auth endpoints', async () => {
  const endpoints = [loginHandler, logoutHandler, pinHandler, googleHandler, createGroupHandler];
  for (const handler of endpoints) {
    const badCt = mockRes();
    await handler({ method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }, badCt);
    assert.equal(badCt.statusCode, 415);

    const crossSite = mockRes();
    await handler({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
      body: {}
    }, crossSite);
    assert.equal(crossSite.statusCode, 403);

    const badOrigin = mockRes();
    await handler({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
        host: 'finkas.example',
        'sec-fetch-site': 'same-origin'
      },
      body: {}
    }, badOrigin);
    assert.equal(badOrigin.statusCode, 403);

    const nullOrigin = mockRes();
    await handler({
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'null', host: 'finkas.example' },
      body: {}
    }, nullOrigin);
    assert.equal(nullOrigin.statusCode, 403);
  }

  const okRes = mockRes();
  assert.equal(
    enforceSameOrigin({
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        origin: 'https://finkas.example',
        host: 'finkas.example',
        'x-forwarded-proto': 'https',
        'sec-fetch-site': 'same-origin'
      }
    }, okRes),
    true
  );
});

/* ── SEC-01: Scoped IP/Master rate limits & no cross-group reset ──── */

test('SEC-01: logging into own group does not reset IP rate limit for master or another group, and varying groupId/email hits master limit (429)', async () => {
  const ownPwd = 'own-group-secret';
  const db = createStatefulFirestoreMock({
    appConfig: {
      superadmin_emails: ['owner@example.com'],
      admin_password_hash: sessionMod.hashSecret('real-master-secret', 'finkas-master')
    },
    groups: {
      'GRP-OWN': { nama: 'Own', groupId: 'GRP-OWN' },
      'GRP-VICTIM': { nama: 'Victim', groupId: 'GRP-VICTIM' }
    },
    privateConfigs: {
      'GRP-OWN': {
        admin_email: 'own@example.com',
        admin_password_hash: sessionMod.hashSecret(ownPwd, 'finkas-admin:GRP-OWN')
      },
      'GRP-VICTIM': {
        admin_email: 'victim@example.com',
        admin_password_hash: sessionMod.hashSecret('victim-secret', 'finkas-admin:GRP-VICTIM')
      }
    }
  });
  globalThis.fetch = db.fetchImpl;

  const ipHeaders = { 'x-vercel-forwarded-for': '203.0.113.10' };

  // 4 failed master guesses with varying dummy groupIds & emails
  for (let i = 0; i < 4; i += 1) {
    const r = mockRes();
    await loginHandler({
      method: 'POST',
      headers: ipHeaders,
      body: { groupId: `GRP-FAKE-${i}`, email: `guess${i}@evil.test`, password: 'wrong' }
    }, r);
    assert.equal(r.statusCode, 401);
  }

  // Successful login to attacker's own group from the same IP must NOT clear master's IP counter
  const ownOk = mockRes();
  await loginHandler({
    method: 'POST',
    headers: ipHeaders,
    body: { groupId: 'GRP-OWN', email: 'own@example.com', password: ownPwd }
  }, ownOk);
  assert.equal(ownOk.statusCode, 200);

  // 5th master guess (different dummy groupId) must lock master IP with 429
  const fifth = mockRes();
  await loginHandler({
    method: 'POST',
    headers: ipHeaders,
    body: { groupId: 'GRP-FAKE-4', email: 'guess4@evil.test', password: 'wrong' }
  }, fifth);
  assert.equal(fifth.statusCode, 429);
  assert.ok(fifth.body.data.retryAfterSec > 0);

  // Legitimate GRP-OWN login still works despite master IP lockout
  const ownAfterLock = mockRes();
  await loginHandler({
    method: 'POST',
    headers: ipHeaders,
    body: { groupId: 'GRP-OWN', email: 'own@example.com', password: ownPwd }
  }, ownAfterLock);
  assert.equal(ownAfterLock.statusCode, 200);
});

/* ── SEC-02: Atomic CAS rate limit & fail-closed 503 ─────────────── */

test('SEC-02: concurrent registerFailedAttempt calls never lose updates and fail closed (503) on Firestore failure', async () => {
  const db = createStatefulFirestoreMock({
    groups: { 'GRP-CONC': { nama: 'Concurrent', groupId: 'GRP-CONC' } },
    privateConfigs: {
      'GRP-CONC': { pin_hash: sessionMod.hashSecret('9876', 'finkas-pin:GRP-CONC') }
    },
    commitDelayMs: 5
  });
  globalThis.fetch = db.fetchImpl;

  // 5 concurrent failures must reach count = 5 and lock, with zero lost updates
  const key = 'pin:GRP-CONC:198.51.100.7';
  const results = await Promise.all(
    Array.from({ length: 5 }, () => sessionMod.registerFailedAttempt(key, 5, 60_000))
  );
  assert.equal(results.filter((r) => r.locked).length, 1);
  const lockState = await sessionMod.checkRateLimit(key);
  assert.equal(lockState.locked, true);

  // Fail-closed: _ratelimit outage returns HTTP 503 on login, verify-group-pin, and login-google
  db.setFailRateLimit(true);
  await assert.rejects(() => sessionMod.checkRateLimit(key), sessionMod.RateLimitUnavailableError);

  const pin503 = mockRes();
  await pinHandler({ method: 'POST', body: { groupId: 'GRP-CONC', pin: '0000' } }, pin503);
  assert.equal(pin503.statusCode, 503);

  const login503 = mockRes();
  await loginHandler({ method: 'POST', body: { groupId: 'GRP-CONC', password: 'wrong' } }, login503);
  assert.equal(login503.statusCode, 503);

  const google503 = mockRes();
  await googleHandler({ method: 'POST', body: { idToken: 'valid.looking.token' } }, google503);
  assert.equal(google503.statusCode, 503);
});

/* ── SEC-03: 12h Admin/SuperAdmin TTL, jti, /api/logout & superadminRevokedAfter ── */

test('SEC-03: admin/superadmin tokens expire in 12h, carry jti, and are revoked by /api/logout & legacy master upgrade', async () => {
  assert.equal(sessionMod.ADMIN_SESSION_TTL, 12 * 60 * 60);
  assert.equal(sessionMod.SUPERADMIN_SESSION_TTL, 12 * 60 * 60);
  assert.equal(sessionMod.GROUP_SESSION_TTL, 30 * 24 * 60 * 60);

  const masterPass = 'legacy-master-secret';
  const db = createStatefulFirestoreMock({
    appConfig: {
      superadmin_emails: ['owner@example.com'],
      admin_password_hash: sessionMod.legacyDigest(masterPass, '')
    },
    groups: { 'GRP-TTL': { nama: 'TTL', groupId: 'GRP-TTL' } },
    privateConfigs: {
      'GRP-TTL': {
        admin_email: 'admin@example.com',
        admin_password_hash: sessionMod.hashSecret('group-secret', 'finkas-admin:GRP-TTL')
      }
    }
  });
  globalThis.fetch = db.fetchImpl;

  // Group admin login gets 12h TTL + jti
  const adminRes = mockRes();
  await loginHandler({
    method: 'POST',
    body: { groupId: 'GRP-TTL', email: 'admin@example.com', password: 'group-secret' }
  }, adminRes);
  assert.equal(adminRes.statusCode, 200);
  const adminClaims = sessionMod.verifySession(adminRes.body.data.sessionToken);
  assert.ok(adminClaims?.jti && adminClaims.jti.length >= 16);
  assert.equal(adminClaims.exp - adminClaims.iat, 12 * 60 * 60);

  // Pre-upgrade superadmin token minted before master password upgrade
  const oldSuperToken = sessionMod.signSession({ role: sessionMod.ROLES.SUPERADMIN, email: 'owner@example.com' }, sessionMod.SUPERADMIN_SESSION_TTL);
  await new Promise((r) => setTimeout(r, 15));

  // Master password login upgrades legacy digest and stamps superadminRevokedAfterMs
  const masterRes = mockRes();
  await loginHandler({ method: 'POST', body: { email: 'owner@example.com', password: masterPass } }, masterRes);
  assert.equal(masterRes.statusCode, 200);
  const newSuperToken = masterRes.body.data.sessionToken;

  // Old superadmin token is rejected on create-group and login-google
  const staleCg = mockRes();
  await createGroupHandler({ method: 'POST', body: { action: 'list', sessionToken: oldSuperToken } }, staleCg);
  assert.equal(staleCg.statusCode, 403);

  const staleGg = mockRes();
  await googleHandler({ method: 'POST', body: { action: 'list', sessionToken: oldSuperToken } }, staleGg);
  assert.equal(staleGg.statusCode, 403);

  // New superadmin token works until /api/logout revokes its jti
  const validCg = mockRes();
  await createGroupHandler({ method: 'POST', body: { action: 'list', sessionToken: newSuperToken } }, validCg);
  assert.equal(validCg.statusCode, 200);

  const logoutRes = mockRes();
  await logoutHandler({ method: 'POST', body: { sessionToken: newSuperToken } }, logoutRes);
  assert.equal(logoutRes.statusCode, 200);
  assert.equal(logoutRes.body.message, 'Logout sukses.');

  const postLogoutCg = mockRes();
  await createGroupHandler({ method: 'POST', body: { action: 'list', sessionToken: newSuperToken } }, postLogoutCg);
  assert.equal(postLogoutCg.statusCode, 403);

  const postLogoutGg = mockRes();
  await googleHandler({ method: 'POST', body: { action: 'list', sessionToken: newSuperToken } }, postLogoutGg);
  assert.equal(postLogoutGg.statusCode, 403);
});

/* ── SEC-13: Atomic rotation commit, same-second ms revocation & fail-closed parse ── */

test('SEC-13: rotation commits atomically, fails loudly on error, revokes sub-second tokens, and fails closed on malformed revokedAfter', async () => {
  const db = createStatefulFirestoreMock({
    appConfig: { superadmin_emails: ['owner@example.com'] },
    groups: { 'GRP-ROT': { nama: 'Rotate', groupId: 'GRP-ROT' } },
    privateConfigs: {
      'GRP-ROT': { pin_hash: sessionMod.hashSecret('1111', 'finkas-pin:GRP-ROT') }
    }
  });
  globalThis.fetch = db.fetchImpl;

  const saToken = sessionMod.signSession({ role: sessionMod.ROLES.SUPERADMIN, email: 'owner@example.com' }, 3600);
  const preToken = sessionMod.signSession({ role: sessionMod.ROLES.MEMBER, gid: 'GRP-ROT' }, 3600);
  const preClaims = sessionMod.verifySession(preToken);

  await new Promise((r) => setTimeout(r, 15));

  // Rotate PIN within the same second (or next ms)
  const rotRes = mockRes();
  await createGroupHandler({
    method: 'POST',
    body: { action: 'set-pin', groupId: 'GRP-ROT', pin: '2222', sessionToken: saToken }
  }, rotRes);
  assert.equal(rotRes.statusCode, 200);

  const groupInfo = db.docs.get('groups/GRP-ROT').fields;
  assert.ok(groupInfo.revokedAfterMs > preClaims.iatMs);
  assert.equal(sessionMod.canReadGroup(preClaims, 'GRP-ROT', groupInfo), false);

  // Unparseable revokedAfter fails closed
  assert.equal(sessionMod.canReadGroup(preClaims, 'GRP-ROT', { revokedAfter: 'not-a-timestamp' }), false);
  assert.equal(sessionMod.canWriteGroup({ role: sessionMod.ROLES.GROUP_ADMIN, gid: 'GRP-ROT', iat: 9999999999 }, 'GRP-ROT', { revokedAfterMs: 'NaN' }), false);

  // Commit failure during set-admin-credential must NOT return 200
  db.setFailGroupDocCommit(true);
  const failRot = mockRes();
  await createGroupHandler({
    method: 'POST',
    body: {
      action: 'set-admin-credential',
      groupId: 'GRP-ROT',
      adminEmail: 'a@b.c',
      adminPassword: 'newpassword1',
      sessionToken: saToken
    }
  }, failRot);
  assert.equal(failRot.statusCode, 500);
});

/* ── SEC-14: Constant-work verifyGroupAdmin prevents email timing oracle ── */

test('SEC-14: verifyGroupAdmin always runs scryptSync even when supplied email mismatches storedEmail', async (t) => {
  const db = createStatefulFirestoreMock({
    appConfig: {
      superadmin_emails: ['owner@example.com'],
      admin_password_hash: sessionMod.hashSecret('master-secret', 'finkas-master')
    },
    groups: { 'GRP-TIME': { nama: 'Timing', groupId: 'GRP-TIME' } },
    privateConfigs: {
      'GRP-TIME': {
        admin_email: 'real@example.com',
        admin_password_hash: sessionMod.hashSecret('group-secret', 'finkas-admin:GRP-TIME')
      }
    }
  });
  globalThis.fetch = db.fetchImpl;

  let scryptCalls = 0;
  const origScryptSync = crypto.scryptSync;
  t.mock.method(crypto, 'scryptSync', (...args) => {
    scryptCalls += 1;
    return origScryptSync(...args);
  });

  const mismatchRes = mockRes();
  await loginHandler({
    method: 'POST',
    body: { groupId: 'GRP-TIME', email: 'wrong@example.com', password: 'wrong' }
  }, mismatchRes);
  assert.equal(mismatchRes.statusCode, 401);
  // 1 call for group admin + 1 call for master password fallback = 2 calls (no short-circuit)
  assert.equal(scryptCalls, 2);
});

/* ── SEC-15: Hardened clientIp extraction ─────────────────────────── */

test('SEC-15: clientIp prioritizes x-vercel-forwarded-for and rejects non-IP spoofing payloads', () => {
  assert.equal(
    sessionMod.clientIp({
      headers: {
        'x-vercel-forwarded-for': '198.51.100.42',
        'x-real-ip': '10.0.0.1',
        'x-forwarded-for': '1.2.3.4'
      }
    }),
    '198.51.100.42'
  );
  assert.equal(
    sessionMod.clientIp({
      headers: {
        'x-real-ip': 'evil\ninjection <script>',
        'x-forwarded-for': '1.2.3.4, not-an-ip'
      },
      socket: { remoteAddress: '::1' }
    }),
    '1.2.3.4'
  );
  assert.equal(
    sessionMod.clientIp({
      headers: { 'x-real-ip': '999.999.999.999', 'x-forwarded-for': 'bogus' }
    }),
    'unknown'
  );
});

/* ── SEC-17, SEC-36, SEC-37, SEC-38, SEC-48 ───────────────────────── */

test('SEC-17 & SEC-48: login-google validates token before DB calls, attaches AbortSignal, blocks last-admin removal, and ignores VITE_GOOGLE_CLIENT_ID', async () => {
  const db = createStatefulFirestoreMock({
    appConfig: { superadmin_emails: ['only@example.com'] },
    googleTokeninfo: async () => Response.json({
      aud: '837369279315-f8s1pp1c16gtoili3104bn5qv9nd0385.apps.googleusercontent.com',
      iss: 'https://evil-issuer.invalid',
      email: 'only@example.com',
      email_verified: true
    })
  });
  globalThis.fetch = db.fetchImpl;

  // Empty or malformed token fails before oauth/Firestore hit
  const emptyRes = mockRes();
  await googleHandler({ method: 'POST', body: { idToken: '' } }, emptyRes);
  assert.equal(emptyRes.statusCode, 400);
  const badFmtRes = mockRes();
  await googleHandler({ method: 'POST', body: { idToken: 'bad token with spaces!' } }, badFmtRes);
  assert.equal(badFmtRes.statusCode, 400);
  assert.equal(db.stats().tokeninfoCalls, 0);

  // VITE_GOOGLE_CLIENT_ID is ignored on server; invalid issuer is rejected with AbortSignal attached
  process.env.VITE_GOOGLE_CLIENT_ID = 'vite-only-client-id';
  const badIssRes = mockRes();
  await googleHandler({ method: 'POST', body: { idToken: 'hdr.payload.sig' } }, badIssRes);
  delete process.env.VITE_GOOGLE_CLIENT_ID;
  assert.equal(badIssRes.statusCode, 401);
  assert.ok(db.stats().lastTokeninfoSignal instanceof AbortSignal);

  // Removing the last remaining superadmin when FINKAS_PRIMARY_OWNER is unset is blocked
  delete process.env.FINKAS_PRIMARY_OWNER;
  const saToken = sessionMod.signSession({ role: sessionMod.ROLES.SUPERADMIN, email: 'only@example.com' }, 3600);
  const removeLast = mockRes();
  await googleHandler({
    method: 'POST',
    body: { action: 'remove', emailToRemove: 'only@example.com', sessionToken: saToken }
  }, removeLast);
  assert.equal(removeLast.statusCode, 400);
  assert.match(removeLast.body.message, /Minimal satu email Super Admin/);
});

test('SEC-36 & SEC-37 & SEC-38: strict token segments, email-less SUPERADMIN rejection, password bounds/whitespace preservation, weak scrypt rejection, and secret rotation', async () => {
  // 3-segment token malleability rejected
  const validToken = sessionMod.signSession({ role: sessionMod.ROLES.MEMBER, gid: 'GRP-1' }, 3600);
  assert.ok(sessionMod.verifySession(validToken));
  assert.equal(sessionMod.verifySession(`${validToken}.extra`), null);

  // Email-less SUPERADMIN token rejected by verifySession
  const emaillessSuper = signRawSession(JSON.stringify({ role: sessionMod.ROLES.SUPERADMIN, gid: '', email: '', exp: 9999999999 }));
  assert.equal(sessionMod.verifySession(emaillessSuper), null);

  // Key rotation via FINKAS_SESSION_SECRET_PREVIOUS
  process.env.FINKAS_SESSION_SECRET = SECRET_PREVIOUS;
  const oldSigned = sessionMod.signSession({ role: sessionMod.ROLES.MEMBER, gid: 'GRP-ROTKEY' }, 3600);
  process.env.FINKAS_SESSION_SECRET = SECRET_PRIMARY;
  process.env.FINKAS_SESSION_SECRET_PREVIOUS = SECRET_PREVIOUS;
  assert.equal(sessionMod.verifySession(oldSigned)?.gid, 'GRP-ROTKEY');
  delete process.env.FINKAS_SESSION_SECRET_PREVIOUS;
  assert.equal(sessionMod.verifySession(oldSigned), null);

  // verifyHashedSecret rejects weak work factors / short salt or key
  const weakHash = `scrypt$2$1$1$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(32).toString('base64url')}`;
  assert.equal(sessionMod.verifyHashedSecret('pass', weakHash, 'scope'), false);

  // Whitespace-preserving password (>6, <=128) & >128 rejection + strict set-pin + master login with empty superadmin list
  const db = createStatefulFirestoreMock({
    appConfig: { admin_password_hash: sessionMod.hashSecret('master-pass', 'finkas-master') },
    groups: { 'GRP-PWD': { nama: 'PwdGroup', groupId: 'GRP-PWD' } },
    privateConfigs: {
      'GRP-PWD': {
        pin_hash: sessionMod.legacyDigest('4321', 'finkas-pin:GRP-PWD')
      }
    }
  });
  globalThis.fetch = db.fetchImpl;

  // Legacy PIN stored inside private/config is upgraded to scrypt on verification
  const pinRes = mockRes();
  await pinHandler({ method: 'POST', body: { groupId: 'GRP-PWD', pin: '4321' } }, pinRes);
  assert.equal(pinRes.statusCode, 200);
  assert.ok(db.docs.get('groups/GRP-PWD/private/config').fields.pin_hash.startsWith('scrypt$'));

  // Over-length password rejected with 400
  const longRes = mockRes();
  await loginHandler({ method: 'POST', body: { password: 'a'.repeat(129) } }, longRes);
  assert.equal(longRes.statusCode, 400);

  // Master login with empty superadmin_emails & unset FINKAS_PRIMARY_OWNER fails with 403
  delete process.env.FINKAS_PRIMARY_OWNER;
  const noEmailMaster = mockRes();
  await loginHandler({ method: 'POST', body: { password: 'master-pass' } }, noEmailMaster);
  assert.equal(noEmailMaster.statusCode, 403);

  // Add superadmin email to config, then test whitespace-preserving group password and strict set-pin
  db.docs.get('settings/app_config').fields.superadmin_emails = ['owner@example.com'];
  const saToken = sessionMod.signSession({ role: sessionMod.ROLES.SUPERADMIN, email: 'owner@example.com' }, 3600);

  // Non-whitelisted explicit email on master login is rejected (401)
  const wrongEmailMaster = mockRes();
  await loginHandler({ method: 'POST', body: { email: 'intruder@example.com', password: 'master-pass' } }, wrongEmailMaster);
  assert.equal(wrongEmailMaster.statusCode, 401);

  // set-pin rejects non-digits instead of stripping
  const badPin = mockRes();
  await createGroupHandler({
    method: 'POST',
    body: { action: 'set-pin', groupId: 'GRP-PWD', pin: '12ab34', sessionToken: saToken }
  }, badPin);
  assert.equal(badPin.statusCode, 400);

  // Password with leading/trailing spaces is preserved verbatim
  const spacedPwd = ' spaced-secret ';
  const setCred = mockRes();
  await createGroupHandler({
    method: 'POST',
    body: {
      action: 'set-admin-credential',
      groupId: 'GRP-PWD',
      adminEmail: 'spaced@example.com',
      adminPassword: spacedPwd,
      sessionToken: saToken
    }
  }, setCred);
  assert.equal(setCred.statusCode, 200);

  const trimmedAttempt = mockRes();
  await loginHandler({
    method: 'POST',
    body: { groupId: 'GRP-PWD', email: 'spaced@example.com', password: spacedPwd.trim() }
  }, trimmedAttempt);
  assert.equal(trimmedAttempt.statusCode, 401);

  const exactAttempt = mockRes();
  await loginHandler({
    method: 'POST',
    body: { groupId: 'GRP-PWD', email: 'spaced@example.com', password: spacedPwd }
  }, exactAttempt);
  assert.equal(exactAttempt.statusCode, 200);
});

test('SEC-38: firestoreError hides raw response body from error.message while preserving isPreconditionFailure', async () => {
  globalThis.fetch = async () => new Response('{"error":{"status":"FAILED_PRECONDITION","message":"projects/secret-proj/databases/(default)/documents/groups/X"}}', { status: 409 });
  let caught = null;
  try {
    await fsCommit([{ delete: 'projects/finkas-kas/databases/(default)/documents/groups/X' }], { Authorization: 'Bearer x' });
  } catch (err) {
    caught = err;
  }
  assert.ok(caught);
  assert.equal(caught.message.includes('secret-proj'), false);
  assert.equal(isPreconditionFailure(caught), true);
});
