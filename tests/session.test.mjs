import { test } from 'node:test';
import assert from 'node:assert/strict';

// The signing secret must be set before the module resolves it.
process.env.FINKAS_SESSION_SECRET = 'test-session-secret-value-long-enough-1234567890';

const {
  ROLES,
  canReadGroup,
  canWriteGroup,
  hashSecret,
  legacyDigest,
  readSession,
  secretMatches,
  signSession,
  verifySession,
  verifyHashedSecret,
  clientIp,
  nextFailedAttempt
} = await import('../api/_session.js');

const GROUP = 'GRP-AAAA';

/* ── Session tokens ──────────────────────────────────────────────── */

test('a signed session verifies and round-trips its claims', () => {
  const token = signSession({ role: ROLES.GROUP_ADMIN, gid: GROUP, email: 'a@b.c' }, 3600);
  const payload = verifySession(token);

  assert.ok(payload, 'expected the session to verify');
  assert.equal(payload.role, ROLES.GROUP_ADMIN);
  assert.equal(payload.gid, GROUP);
  assert.equal(payload.email, 'a@b.c');
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
});

test('an expired session is rejected', () => {
  const token = signSession({ role: ROLES.MEMBER, gid: GROUP }, -10);
  assert.equal(verifySession(token), null);
});

test('a tampered payload is rejected', () => {
  const token = signSession({ role: ROLES.MEMBER, gid: GROUP }, 3600);
  const [, signature] = token.split('.');

  // Re-encode the payload as a superadmin, keeping the original signature.
  const forged = Buffer.from(JSON.stringify({
    role: ROLES.SUPERADMIN, gid: '', email: '', iat: 0, exp: 9999999999
  })).toString('base64url');

  assert.equal(verifySession(`${forged}.${signature}`), null);
});

test('a tampered signature is rejected', () => {
  const token = signSession({ role: ROLES.MEMBER, gid: GROUP }, 3600);
  const [body] = token.split('.');
  assert.equal(verifySession(`${body}.deadbeef`), null);
});

test('malformed and unknown-role tokens are rejected', () => {
  assert.equal(verifySession(''), null);
  assert.equal(verifySession('not-a-token'), null);
  assert.equal(verifySession('a.b.c'), null);

  const weirdRole = signSession({ role: 'root', gid: GROUP }, 3600);
  assert.equal(verifySession(weirdRole), null);
});

test('readSession reads the token from a request body', () => {
  const token = signSession({ role: ROLES.MEMBER, gid: GROUP }, 3600);
  assert.ok(readSession({ sessionToken: token }));
  assert.equal(readSession({ sessionToken: 'nope' }), null);
  assert.equal(readSession({}), null);
  assert.equal(readSession(undefined), null);
});

/* ── Authorization matrix ────────────────────────────────────────── */

test('a member session may read only its own group', () => {
  const member = { role: ROLES.MEMBER, gid: GROUP };

  assert.equal(canReadGroup(member, GROUP), true);
  assert.equal(canReadGroup(member, 'GRP-BBBB'), false);
  assert.equal(canReadGroup(member, ''), false);
  assert.equal(canReadGroup(null, GROUP), false);
});

test('a member session may never write', () => {
  const member = { role: ROLES.MEMBER, gid: GROUP };
  assert.equal(canWriteGroup(member, GROUP), false);
});

test('a group admin may read and write only its own group', () => {
  const admin = { role: ROLES.GROUP_ADMIN, gid: GROUP };

  assert.equal(canReadGroup(admin, GROUP), true);
  assert.equal(canWriteGroup(admin, GROUP), true);

  assert.equal(canReadGroup(admin, 'GRP-BBBB'), false);
  assert.equal(canWriteGroup(admin, 'GRP-BBBB'), false);
});

test('a superadmin may read and write every group', () => {
  const root = { role: ROLES.SUPERADMIN, gid: '' };

  assert.equal(canReadGroup(root, GROUP), true);
  assert.equal(canWriteGroup(root, GROUP), true);
  assert.equal(canReadGroup(root, 'anything'), true);
});

test('canReadGroup and canWriteGroup enforce superadmin whitelist when provided', () => {
  const allowed = ['sa@finkas.id'];
  const validSa = { role: ROLES.SUPERADMIN, email: 'sa@finkas.id' };
  const revokedSa = { role: ROLES.SUPERADMIN, email: 'ex@finkas.id' };
  const anonymousSa = { role: ROLES.SUPERADMIN, email: '' };

  assert.equal(canReadGroup(validSa, GROUP, null, allowed), true);
  assert.equal(canWriteGroup(validSa, GROUP, null, allowed), true);

  assert.equal(canReadGroup(revokedSa, GROUP, null, allowed), false);
  assert.equal(canWriteGroup(revokedSa, GROUP, null, allowed), false);

  assert.equal(canReadGroup(anonymousSa, GROUP, null, allowed), false);
  assert.equal(canWriteGroup(anonymousSa, GROUP, null, allowed), false);
});

test('canReadGroup and canWriteGroup reject sessions issued before revokedAfter', () => {
  const member = { role: ROLES.MEMBER, gid: GROUP, iat: 1000 };
  const admin = { role: ROLES.GROUP_ADMIN, gid: GROUP, iat: 1000 };

  // Sessions issued before revokedAfter (1000 < 2000) are rejected
  assert.equal(canReadGroup(member, GROUP, { revokedAfter: 2000 }), false);
  assert.equal(canWriteGroup(admin, GROUP, { revokedAfter: 2000 }), false);

  // Sessions issued after revokedAfter (2500 >= 2000) are accepted
  const freshMember = { role: ROLES.MEMBER, gid: GROUP, iat: 2500 };
  const freshAdmin = { role: ROLES.GROUP_ADMIN, gid: GROUP, iat: 2500 };
  assert.equal(canReadGroup(freshMember, GROUP, { revokedAfter: 2000 }), true);
  assert.equal(canWriteGroup(freshAdmin, GROUP, { revokedAfter: 2000 }), true);
});

/* ── Secret hashing ──────────────────────────────────────────────── */

test('scrypt hashes round-trip and reject the wrong secret', () => {
  const stored = hashSecret('correct horse', 'finkas-admin:GRP-A');

  assert.equal(stored.startsWith('scrypt$'), true);
  assert.equal(verifyHashedSecret('correct horse', stored, 'finkas-admin:GRP-A'), true);
  assert.equal(verifyHashedSecret('wrong horse', stored, 'finkas-admin:GRP-A'), false);
  // The scope is bound into the hash, so a different group will not match.
  assert.equal(verifyHashedSecret('correct horse', stored, 'finkas-admin:GRP-B'), false);
});

test('the same secret hashes differently every time (salted)', () => {
  const first = hashSecret('same', 'scope');
  const second = hashSecret('same', 'scope');
  assert.notEqual(first, second);
  assert.equal(verifyHashedSecret('same', first, 'scope'), true);
  assert.equal(verifyHashedSecret('same', second, 'scope'), true);
});

test('secretMatches accepts both scrypt and legacy digests', () => {
  const scope = 'finkas-pin:GRP-A';
  const legacy = legacyDigest('1234', scope);

  assert.equal(secretMatches('1234', legacy, scope, scope), true);
  assert.equal(secretMatches('9999', legacy, scope, scope), false);

  const modern = hashSecret('1234', scope);
  assert.equal(secretMatches('1234', modern, scope, scope), true);
  assert.equal(secretMatches('9999', modern, scope, scope), false);
});

test('secretMatches treats a missing hash as no match', () => {
  assert.equal(secretMatches('1234', '', 'scope', 'scope'), false);
  assert.equal(secretMatches('1234', null, 'scope', 'scope'), false);
  assert.equal(secretMatches('1234', 'scrypt$broken', 'scope', 'scope'), false);
});

/* ── Client IP ───────────────────────────────────────────────────── */

test('clientIp prefers x-real-ip and rightmost forwarded address', () => {
  assert.equal(clientIp({ headers: { 'x-real-ip': '10.0.0.1', 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } }), '10.0.0.1');
  assert.equal(clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } }), '5.6.7.8');
  assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '9.9.9.9' } }), '9.9.9.9');
  assert.equal(clientIp({ headers: {} }), 'unknown');
});

/* ── Failed-attempt window ───────────────────────────────────────── */

test('failed attempts accumulate inside the window and lock on the cap', () => {
  const windowMs = 60_000;
  const start = 1_000_000;
  let state = null;
  for (let i = 1; i <= 4; i += 1) {
    state = nextFailedAttempt(state, start + i * 1000, 5, windowMs);
    assert.equal(state.locked, false);
    assert.equal(state.count, i);
    assert.equal(state.until, 0);
  }
  state = nextFailedAttempt(state, start + 5000, 5, windowMs);
  assert.equal(state.count, 5);
  assert.equal(state.locked, true);
  assert.equal(state.until, start + 5000 + windowMs);
  assert.equal(state.since, start + 1000);
});

test('a failed attempt after the window elapsed starts the count over', () => {
  const windowMs = 60_000;
  const first = nextFailedAttempt(null, 1_000_000, 5, windowMs);
  const later = nextFailedAttempt(first, 1_000_000 + windowMs, 5, windowMs);
  assert.equal(later.count, 1);
  assert.equal(later.locked, false);
  assert.equal(later.since, 1_000_000 + windowMs);
});
