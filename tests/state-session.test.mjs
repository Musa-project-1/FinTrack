import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Minimal in-memory Web Storage. `state.js` reads localStorage/sessionStorage
 * while the module is being evaluated, so these must exist before it loads.
 */
const makeStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; }
  };
};

globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();

const { ADMIN_SESSION_KEY, ADMIN_ROLE_KEY, GROUP_SESSIONS_KEY } = await import('../js/core/config.js');
const state = await import('../js/core/state.js');

/* ── Group sessions ──────────────────────────────────────────────── */

test('group session tokens round-trip per group', () => {
  state.setGroupSession('GRP-A', 'token-a');
  state.setGroupSession('GRP-B', 'token-b');

  assert.equal(state.getGroupSession('GRP-A'), 'token-a');
  assert.equal(state.getGroupSession('GRP-B'), 'token-b');
  assert.equal(state.getGroupSession('GRP-C'), '');
});

test('clearing one group session leaves the others alone', () => {
  state.setGroupSession('GRP-A', 'token-a');
  state.setGroupSession('GRP-B', 'token-b');

  state.clearGroupSession('GRP-A');

  assert.equal(state.getGroupSession('GRP-A'), '');
  assert.equal(state.getGroupSession('GRP-B'), 'token-b');
});

test('group sessions are persisted to sessionStorage, not localStorage', () => {
  state.setGroupSession('GRP-P', 'persisted');
  state.setGroupSession('GRP-Q', 'persisted-q');

  const raw = sessionStorage.getItem(GROUP_SESSIONS_KEY);
  assert.ok(raw, 'expected the group sessions to be persisted');
  assert.equal(JSON.parse(raw)['GRP-P'], 'persisted');
  assert.equal(localStorage.getItem(GROUP_SESSIONS_KEY), null);
});

test('a blank group id or token is ignored', () => {
  state.setGroupSession('', 'token');
  state.setGroupSession('GRP-Z', '');
  assert.equal(state.getGroupSession(''), '');
  assert.equal(state.getGroupSession('GRP-Z'), '');
});

/* ── Admin session ───────────────────────────────────────────────── */

test('an admin session toggles the admin and superadmin flags', () => {
  state.clearAdminSession();
  assert.equal(state.getIsAdminSession(), false);
  assert.equal(state.getIsSuperAdmin(), false);

  state.setAdminSession('admin-token');
  state.setAdminRole('group_admin');
  state.setAdminEmail('admin@finkas.id');

  assert.equal(state.getIsAdminSession(), true);
  assert.equal(state.getIsSuperAdmin(), false);
  assert.equal(state.getAdminRole(), 'group_admin');
  assert.equal(state.getAdminEmail(), 'admin@finkas.id');
  assert.equal(sessionStorage.getItem(ADMIN_SESSION_KEY), 'admin-token');
  assert.equal(sessionStorage.getItem(ADMIN_ROLE_KEY), 'group_admin');

  state.setAdminRole('superadmin');
  assert.equal(state.getIsSuperAdmin(), true);
});

test('clearing the admin session clears every field', () => {
  state.setAdminSession('admin-token');
  state.setAdminRole('superadmin');
  state.setAdminEmail('owner@finkas.id');

  state.clearAdminSession();

  assert.equal(state.getAdminSession(), '');
  assert.equal(state.getAdminRole(), '');
  assert.equal(state.getAdminEmail(), '');
  assert.equal(state.getIsAdminSession(), false);
  assert.equal(state.getIsSuperAdmin(), false);
  assert.equal(sessionStorage.getItem(ADMIN_SESSION_KEY), null);
});

test('no bearer token is ever written to localStorage', () => {
  state.setAdminSession('secret-token');
  state.setAdminRole('superadmin');
  state.setGroupSession('GRP-S', 'secret-group-token');

  // localStorage survives a tab close, so a session token must never land there.
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = String(localStorage.key(i));
    assert.ok(!/admin_session|token/i.test(key), `unexpected localStorage key: ${key}`);
    assert.notEqual(localStorage.getItem(key), 'secret-token');
    assert.notEqual(localStorage.getItem(key), 'secret-group-token');
  }
});

/* ── Token resolution ────────────────────────────────────────────── */

test('resolveSessionToken uses the admin token for writes', () => {
  state.clearAdminSession();
  state.setGroupSession('GRP-A', 'member-token');
  state.setAdminSession('admin-token');

  assert.equal(state.resolveSessionToken('GRP-A', true), 'admin-token');
});

test('resolveSessionToken prefers the group token for reads', () => {
  state.clearAdminSession();
  state.setGroupSession('GRP-A', 'member-token');
  state.setAdminSession('admin-token');

  assert.equal(state.resolveSessionToken('GRP-A', false), 'member-token');
});

test('resolveSessionToken falls back to the admin token for an unlocked group', () => {
  state.clearAdminSession();
  state.setAdminSession('admin-token');
  state.clearGroupSession('GRP-UNLOCKED');

  // A superadmin can read any group without entering its PIN.
  assert.equal(state.resolveSessionToken('GRP-UNLOCKED', false), 'admin-token');
});

test('resolveSessionToken returns nothing when there is no session at all', () => {
  state.clearAdminSession();
  state.clearGroupSession('GRP-A');

  assert.equal(state.resolveSessionToken('GRP-A', false), '');
  assert.equal(state.resolveSessionToken('GRP-A', true), '');
});

/* ── Active group ────────────────────────────────────────────────── */

test('the active group id round-trips and persists to localStorage', () => {
  state.setActiveGroupId('GRP-ACTIVE');
  assert.equal(state.getActiveGroupId(), 'GRP-ACTIVE');
  assert.equal(localStorage.getItem('finkas_active_group'), 'GRP-ACTIVE');

  state.setActiveGroupId('');
  assert.equal(state.getActiveGroupId(), '');
  assert.equal(localStorage.getItem('finkas_active_group'), null);
});

test('getGroupName resolves a display name from the group list', () => {
  state.setGroups([{ id: 'GRP-A', nama: 'Kelas A' }]);
  assert.equal(state.getGroupName('GRP-A'), 'Kelas A');
  assert.equal(state.getGroupName('GRP-MISSING'), 'GRP-MISSING');
});

/* ── Cache ───────────────────────────────────────────────────────── */

test('state is cached per group and reloads for the active group', () => {
  state.setActiveGroupId('GRP-CACHE');

  state.setState({
    anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi' }],
    kategori: [],
    transaksi: [],
    skippedMonths: ['06-2026']
  });
  state.saveCache();

  state.setState({ anggota: [], kategori: [], transaksi: [], skippedMonths: [] });
  assert.equal(state.getState().anggota.length, 0);

  assert.equal(state.loadCache(), true);
  assert.equal(state.getState().anggota.length, 1);
  assert.deepEqual(state.getState().skippedMonths, ['06-2026']);
});

test('loading a cache for a group that has none returns false', () => {
  state.setActiveGroupId('GRP-NO-CACHE');
  assert.equal(state.loadCache(), false);
});
