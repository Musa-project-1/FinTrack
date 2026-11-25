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

const { CACHE_KEY, ADMIN_SESSION_KEY, ADMIN_ROLE_KEY, ADMIN_VIEW_MODE_KEY, GROUP_SESSIONS_KEY } = await import('../src/ui/svelte-dashboard.js');
const state = await import('../src/ui/svelte-dashboard.js');

const { resolveGroupId, dataRequest } = await import('../src/ui/svelte-dashboard.js');

test('resolving an unscoped payload with no active group returns an empty id', () => {
  state.setActiveGroupId('');
  assert.equal(resolveGroupId({}), '');
});

test('an authenticated request without a group fails before fetch', async (t) => {
  state.setActiveGroupId('');
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('unexpected request'); });
  assert.deepEqual(await dataRequest({ action: 'read' }), {
    status: false, httpStatus: 400, unauthorized: true, message: 'ID grup wajib diisi.'
  });
  assert.equal(fetch.mock.callCount(), 0);
});

test('explicit cache operations use the requested group while another is active', () => {
  state.setActiveGroupId('GRP-OTHER');
  state.setState({ kasStart: '03-2026' });
  assert.equal(state.saveCache('GRP-EXPLICIT'), true);
  assert.equal(state.getStorageStatus().groupId, 'GRP-EXPLICIT');
  assert.equal(JSON.parse(localStorage.getItem(`${CACHE_KEY}:GRP-EXPLICIT`)).kasStart, '03-2026');
  assert.equal(localStorage.getItem(`${CACHE_KEY}:GRP-OTHER`), null);
  state.setState({ kasStart: '' });
  assert.equal(state.loadCache('GRP-EXPLICIT'), true);
  assert.equal(state.getStorageStatus().groupId, 'GRP-EXPLICIT');
  assert.equal(state.getState().kasStart, '03-2026');
  assert.equal(state.getActiveGroupId(), 'GRP-OTHER');
  assert.equal(state.saveCache(''), false);
  assert.equal(state.getStorageStatus().state, 'failed');
  assert.equal(state.loadCache(''), false);
  assert.equal(state.getStorageStatus().state, 'unknown');
  assert.equal(localStorage.getItem(`${CACHE_KEY}:`), null);
});

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

test('group sessions are persisted to localStorage', () => {
  state.setGroupSession('GRP-P', 'persisted');
  state.setGroupSession('GRP-Q', 'persisted-q');

  const raw = localStorage.getItem(GROUP_SESSIONS_KEY);
  assert.ok(raw, 'expected the group sessions to be persisted');
  assert.equal(JSON.parse(raw)['GRP-P'], 'persisted');
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
  assert.equal(localStorage.getItem(ADMIN_SESSION_KEY), 'admin-token');
  assert.equal(localStorage.getItem(ADMIN_ROLE_KEY), 'group_admin');

  state.setAdminRole('superadmin');
  assert.equal(state.getIsSuperAdmin(), true);

  state.clearAdminSession();
  state.setAdminRole('superadmin');
  assert.equal(state.getIsSuperAdmin(), false, 'stale superadmin role without adminSessionToken must not bypass PIN');
  state.setAdminSession('fresh-sa-token');
  assert.equal(state.getIsSuperAdmin(), true);
});

test('clearing the admin session clears every field and group sessions', () => {
  state.setAdminSession('admin-token');
  state.setAdminRole('superadmin');
  state.setAdminEmail('owner@finkas.id');
  state.setGroupSession('GRP-TO-CLEAR', 'token-to-clear');

  state.clearAdminSession();

  assert.equal(state.getAdminSession(), '');
  assert.equal(state.getAdminRole(), '');
  assert.equal(state.getAdminEmail(), '');
  assert.equal(state.getIsAdminSession(), false);
  assert.equal(state.getIsSuperAdmin(), false);
  assert.equal(state.getGroupSession('GRP-TO-CLEAR'), '');
  assert.equal(localStorage.getItem(ADMIN_SESSION_KEY), null);
});

test('session tokens are persisted in localStorage', () => {
  state.setAdminSession('secret-token');
  state.setAdminRole('superadmin');
  state.setGroupSession('GRP-S', 'secret-group-token');

  // Tokens should persist in localStorage so they survive tab close
  assert.equal(localStorage.getItem(ADMIN_SESSION_KEY), 'secret-token');
  const groups = JSON.parse(localStorage.getItem(GROUP_SESSIONS_KEY));
  assert.equal(groups['GRP-S'], 'secret-group-token');
});

test('admin view mode toggles member preview while keeping admin and superadmin sessions intact', () => {
  state.clearAdminSession();
  assert.equal(state.getAdminViewMode(), 'anggota');
  assert.equal(state.getIsAdminView(), false);
  assert.equal(state.getIsSuperAdminView(), false);

  state.setAdminSession('admin-token');
  state.setAdminRole('group_admin');
  assert.equal(state.getAdminViewMode(), 'admin');
  assert.equal(state.getIsAdminView(), true);
  assert.equal(state.getIsSuperAdminView(), false);
  assert.equal(localStorage.getItem(ADMIN_VIEW_MODE_KEY), null);

  state.setAdminViewMode('anggota');
  assert.equal(state.getIsAdminSession(), true);
  assert.equal(state.getIsSuperAdmin(), false);
  assert.equal(state.getAdminViewMode(), 'anggota');
  assert.equal(state.getIsAdminView(), false);
  assert.equal(state.getIsSuperAdminView(), false);
  assert.equal(localStorage.getItem(ADMIN_VIEW_MODE_KEY), 'anggota');

  state.setAdminViewMode('admin');
  assert.equal(state.getAdminViewMode(), 'admin');
  assert.equal(state.getIsAdminView(), true);
  assert.equal(localStorage.getItem(ADMIN_VIEW_MODE_KEY), null);

  state.setAdminRole('superadmin');
  assert.equal(state.getIsSuperAdminView(), true);
  state.setAdminViewMode('anggota');
  assert.equal(state.getIsAdminSession(), true);
  assert.equal(state.getIsSuperAdmin(), true);
  assert.equal(state.getIsAdminView(), false);
  assert.equal(state.getIsSuperAdminView(), false);
  assert.equal(localStorage.getItem(ADMIN_VIEW_MODE_KEY), 'anggota');

  state.setAdminSession('fresh-token');
  assert.equal(state.getAdminViewMode(), 'admin');
  assert.equal(state.getIsAdminView(), true);
  assert.equal(localStorage.getItem(ADMIN_VIEW_MODE_KEY), null);

  state.setAdminViewMode('anggota');
  state.clearAdminSession();
  assert.equal(state.getIsAdminSession(), false);
  assert.equal(state.getIsAdminView(), false);
  assert.equal(state.getIsSuperAdminView(), false);
  assert.equal(localStorage.getItem(ADMIN_VIEW_MODE_KEY), null);
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

/* ── Reactive State Events ───────────────────────────────────────── */

test('setState and addTransaction dispatch finkas:state-changed event when document exists', () => {
  let eventDispatched = 0;
  globalThis.document = {
    dispatchEvent: (e) => {
      if (e?.type === 'finkas:state-changed') eventDispatched++;
    }
  };

  state.setState({ anggota: [{ ID_Anggota: 'ANG-TEST', Nama_Anggota: 'Tester' }] });
  assert.equal(eventDispatched, 1);

  state.addTransaction({ ID_Transaksi: 'TRX-TEST', Nominal: 10000 });
  assert.equal(eventDispatched, 2);

  delete globalThis.document;
});
