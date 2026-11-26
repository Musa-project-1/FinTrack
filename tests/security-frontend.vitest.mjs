/**
 * Frontend Security Remediation Regression Suite
 * Covers SEC-08, SEC-09, SEC-10, SEC-19, SEC-28, SEC-29, SEC-41, SEC-42, SEC-43, SEC-44, SEC-46, SEC-47.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const realStorageDesc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memStorage = (() => {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: (i) => Array.from(map.keys())[i] ?? null,
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => { map.clear(); }
  };
})();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memStorage });
test.after(() => {
  if (realStorageDesc) Object.defineProperty(globalThis, 'localStorage', realStorageDesc);
  else delete globalThis.localStorage;
});

const sdk = await import('../src/svelte/mount.ts');

function readRepo(relPath) {
  return readFileSync(new URL(`../${relPath}`, ("file://" + process.cwd() + "/tests/")), 'utf8');
}

function createMemoryIdb(initialItems = []) {
  let nextId = 1;
  const rows = initialItems.map((item) => ({ ...item, id: item.id ?? nextId++ }));
  const reqOf = (fn) => {
    const req = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
    queueMicrotask(() => {
      try {
        req.result = fn();
        req.onsuccess?.();
      } catch (err) {
        req.error = err;
        req.onerror?.();
      }
    });
    return req;
  };
  return {
    rows,
    indexedDB: {
      open: () => {
        const db = {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => {},
          transaction: () => ({
            objectStore: () => ({
              add: (item) => reqOf(() => {
                const id = nextId++;
                rows.push({ ...structuredClone(item), id });
                return id;
              }),
              getAll: () => reqOf(() => structuredClone(rows)),
              delete: (id) => reqOf(() => {
                const idx = rows.findIndex((r) => r.id === id);
                if (idx !== -1) rows.splice(idx, 1);
                return undefined;
              })
            })
          })
        };
        return reqOf(() => db);
      }
    }
  };
}

function installDom(t, html = '') {
  const dom = new JSDOM(html, { url: 'https://finkas.example.test' });
  t.after(() => dom.window.close());

  const restored = [];
  for (const key of [
    'window', 'document', 'localStorage', 'navigator', 'Element', 'HTMLElement',
    'HTMLButtonElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLDialogElement',
    'HTMLAnchorElement', 'HTMLMediaElement', 'Node', 'NodeFilter', 'Text', 'Comment', 'Event',
    'CustomEvent', 'MutationObserver', 'Option'
  ]) {
    const prev = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
    restored.push([key, prev]);
  }
  t.after(() => {
    for (const [key, prev] of restored) {
      if (prev) Object.defineProperty(globalThis, key, prev);
      else delete globalThis[key];
    }
  });

  dom.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  dom.window.scrollTo = () => {};
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    this.classList.add('active');
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    const wasOpen = Boolean(this.open);
    this.open = false;
    this.classList.remove('active');
    if (wasOpen) this.dispatchEvent(new dom.window.Event('close'));
  };
  dom.window.Element.prototype.scrollIntoView = function () {};
  return (id) => dom.window.document.getElementById(id);
}

function resetRuntimeState() {
  sdk.clearAdminSession();
  sdk.clearAllGroupSessions();
  sdk.setActiveGroupId('');
  sdk.setGroups([]);
  sdk.setState({ anggota: [], kategori: [], transaksi: [], skippedMonths: [], kasStart: '', paymentAccount: null });
}

/* ── SEC-08: Purge caches & ledger on exitGroup / logoutAdminAction ── */

test('SEC-08: exitGroup and logoutAdminAction purge finkas_cache*/finkas_spotlight:* and reset ledger', async (t) => {
  const credDom = `
    <span id="app-group-name">Alpha</span>
    <dialog id="modal-groups"></dialog>
    <dialog id="modal-logout"></dialog>
    <dialog id="modal-group-credentials">
      <span id="cred-disp-nama">Alpha</span>
      <span id="cred-disp-pin">9988</span>
      <span id="cred-disp-email">admin@alpha.id</span>
      <span id="cred-disp-pwd">secret-alpha</span>
    </dialog>
    <dialog id="modal-group-cred-edit">
      <span id="cred-edit-group-label">Alpha</span>
      <input id="edit-group-cred-id" value="grp-a" />
      <input id="edit-group-cred-email" value="admin@alpha.id" />
      <input id="edit-group-cred-pwd" value="secret-alpha" type="password" />
    </dialog>
  `;
  const byId = installDom(t, credDom);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ status: true, data: { groups: [] } }));
  resetRuntimeState();
  t.after(resetRuntimeState);

  const seedState = {
    anggota: [{ ID_Anggota: 'A01', Nama_Anggota: 'Siti', Nomor_WA: '081234', Status_Aktif: 'Aktif' }],
    kategori: [{ ID_Kategori: 'K01', Nama_Kategori: 'Iuran', Tipe: 'Masuk' }],
    transaksi: [{ ID_Transaksi: 'T01', Nominal: 10000 }],
    skippedMonths: ['01-2026'],
    kasStart: '01-2026',
    paymentAccount: { bankName: 'BCA', accountNumber: '12345' }
  };

  sdk.setGroups([{ id: 'grp-a', nama: 'Alpha' }, { id: 'grp-b', nama: 'Beta' }]);
  sdk.setActiveGroupId('grp-a');
  sdk.setGroupSession('grp-a', 'tok-mem-a');
  sdk.setState(structuredClone(seedState));

  localStorage.setItem('finkas_cache', '{"legacy":true}');
  localStorage.setItem('finkas_cache:grp-a', '{"anggota":[{"ID_Anggota":"A01"}]}');
  localStorage.setItem('finkas_spotlight:grp-a', '{"pinned":"A01"}');
  localStorage.setItem('finkas_cache:grp-b', '{"anggota":[{"ID_Anggota":"B01"}]}');
  localStorage.setItem('finkas_theme', 'dark');

  sdk.exitGroup();

  assert.equal(localStorage.getItem('finkas_cache:grp-a'), null);
  assert.equal(localStorage.getItem('finkas_spotlight:grp-a'), null);
  assert.equal(sdk.getActiveGroupId(), '');
  assert.deepEqual(sdk.getState(), {
    anggota: [], kategori: [], transaksi: [], skippedMonths: [], kasStart: '', paymentAccount: null
  });
  assert.equal(byId('cred-disp-pwd').textContent, '-');
  assert.equal(byId('cred-disp-pin').textContent, '-');
  assert.equal(byId('cred-disp-email').textContent, '-');
  assert.equal(localStorage.getItem('finkas_theme'), 'dark', 'theme preference must survive exitGroup');

  // Re-seed across multiple groups and verify logoutAdminAction purges all cached PII/secrets
  sdk.setAdminSession('tok-adm');
  sdk.setAdminRole('group_admin');
  sdk.setActiveGroupId('grp-a');
  sdk.setState(structuredClone(seedState));
  byId('cred-disp-pwd').textContent = 'secret-logout';
  localStorage.setItem('finkas_cache', '{"legacy":true}');
  localStorage.setItem('finkas_cache:default', '{"anggota":[1]}');
  localStorage.setItem('finkas_cache:grp-a', '{"anggota":[1]}');
  localStorage.setItem('finkas_cache:grp-b', '{"anggota":[2]}');
  localStorage.setItem('finkas_spotlight:grp-a', '{"pinned":"A01"}');
  localStorage.setItem('finkas_spotlight:grp-b', '{"pinned":"B01"}');
  localStorage.setItem('finkas_active_group', 'grp-a');
  localStorage.setItem('finkas_active_group_name', 'Alpha');
  localStorage.setItem('finkas_group_open', '1');

  await sdk.logoutAdminAction();

  assert.equal(sdk.getIsAdminSession(), false);
  assert.equal(sdk.getActiveGroupId(), '');
  assert.deepEqual(sdk.getState(), {
    anggota: [], kategori: [], transaksi: [], skippedMonths: [], kasStart: '', paymentAccount: null
  });
  for (const k of [
    'finkas_cache', 'finkas_cache:default', 'finkas_cache:grp-a', 'finkas_cache:grp-b',
    'finkas_spotlight:grp-a', 'finkas_spotlight:grp-b',
    'finkas_active_group', 'finkas_active_group_name', 'finkas_group_open'
  ]) {
    assert.equal(localStorage.getItem(k), null, `${k} must be purged on logoutAdminAction`);
  }
  assert.equal(byId('cred-disp-pwd').textContent, '-');
  assert.equal(localStorage.getItem('finkas_theme'), 'dark');
});

/* ── SEC-10: Clear finkas_group_sessions[prevGid] when ending group_admin session ── */

test('SEC-10: enterGroup clears group_admin group token on switch while preserving distinct or other group tokens', (t) => {
  installDom(t, '<span id="app-group-name"></span><dialog id="modal-groups"></dialog><dialog id="modal-group-pin"></dialog>');
  resetRuntimeState();
  t.after(resetRuntimeState);

  sdk.setGroups([{ id: 'grp-a', nama: 'Alpha' }, { id: 'grp-b', nama: 'Beta' }]);
  sdk.setActiveGroupId('grp-a');
  sdk.setAdminSession('tok-group-admin-a');
  sdk.setAdminRole('group_admin');
  sdk.setGroupSession('grp-a', 'tok-group-admin-a');
  sdk.setGroupSession('grp-b', 'tok-member-b');

  sdk.enterGroup('grp-b');

  assert.equal(sdk.getActiveGroupId(), 'grp-b');
  assert.equal(sdk.getIsAdminSession(), false);
  assert.equal(sdk.getGroupSession('grp-a'), '', 'prevGid group_sessions token matching adminToken must be cleared');
  assert.equal(sdk.getGroupSession('grp-b'), 'tok-member-b', 'target group member session must remain intact');

  const stored = JSON.parse(localStorage.getItem('finkas_group_sessions') || '{}');
  assert.equal(stored['grp-a'], undefined);
  assert.equal(stored['grp-b'], 'tok-member-b');

  // If prevGid had a distinct PIN read token != adminToken, preserve it
  sdk.setAdminSession('tok-group-admin-b');
  sdk.setAdminRole('group_admin');
  sdk.setGroupSession('grp-b', 'tok-member-b');
  sdk.enterGroup('grp-a');
  assert.equal(sdk.getGroupSession('grp-b'), 'tok-member-b');
});

/* ── SEC-19 & SEC-44: Admin refresh trigger + Google GSI referrerPolicy ── */

test('SEC-19 & SEC-44: admin/superadmin logins trigger refresh when group active and Google GSI sets referrerPolicy=no-referrer', async (t) => {
  const loginDom = `
    <span id="app-group-name">Alpha</span>
    <dialog id="modal-login" open>
      <form id="form-login-admin">
        <input id="input-admin-email" value="admin@alpha.id" />
        <input id="input-admin-pwd" type="password" value="pass1234" />
        <button id="btn-submit-login" type="submit">Masuk</button>
      </form>
      <button id="btn-login-google-stealth">Google</button>
      <div id="login-error-banner" hidden><span id="login-error-text"></span></div>
    </dialog>
  `;
  installDom(t, loginDom);
  resetRuntimeState();
  t.after(resetRuntimeState);

  sdk.setActiveGroupId('grp-a');
  let refreshCount = 0;
  window.addEventListener('finkas:request-refresh', () => { refreshCount += 1; });

  t.mock.method(globalThis, 'fetch', async () => Response.json({
    status: true,
    data: { sessionToken: 'tok-adm-1', role: 'group_admin', email: 'admin@alpha.id' }
  }));

  await sdk.submitLoginAdmin({ preventDefault() {}, target: document.getElementById('form-login-admin') });
  assert.equal(refreshCount, 1, 'submitLoginAdmin must dispatch finkas:request-refresh when a group is active');

  // SEC-44 + SEC-19 for Google Super Admin flow
  const origHeadAppend = document.head.appendChild.bind(document.head);
  let injectedScript = null;
  document.head.appendChild = (node) => {
    if (node?.tagName === 'SCRIPT') {
      injectedScript = node;
      window.google = {
        accounts: {
          oauth2: {
            initTokenClient: ({ callback }) => ({
              requestAccessToken: () => { callback({ access_token: 'google-access-tok' }); }
            })
          }
        }
      };
      queueMicrotask(() => node.onload?.());
      return node;
    }
    return origHeadAppend(node);
  };

  t.mock.method(globalThis, 'fetch', async () => Response.json({
    status: true,
    data: { sessionToken: 'tok-sa-1', role: 'superadmin', email: 'owner@alpha.id' }
  }));

  await sdk.loginGoogleSuperAdminAction();
  assert.ok(injectedScript, 'Google GSI script must be inserted');
  assert.equal(injectedScript.src, 'https://accounts.google.com/gsi/client');
  assert.equal(injectedScript.referrerPolicy, 'no-referrer');
  assert.equal(refreshCount, 2, 'loginGoogleSuperAdminAction must dispatch finkas:request-refresh when a group is active');
});

/* ── SEC-28: master.ts admin session + group-isolation + offline cache ── */

test('SEC-28: all 9 async master.ts handlers enforce admin session, pre/post group-switch isolation, and offline saveCache', async (t) => {
  const masterDom = `
    <dialog id="modal-confirm-action">
      <h3 id="confirm-title"></h3><p id="confirm-message"></p>
      <i id="confirm-icon"></i><div id="confirm-badge-icon"></div>
      <button id="btn-confirm-action-submit" data-action="confirm-action-submit">Ya</button>
    </dialog>
    <dialog id="modal-edit-master-anggota" open>
      <input id="edit-master-anggota-id" value="A01" />
      <input id="edit-master-nama-input" value="Budi Baru" />
      <input id="edit-master-wa-input" value="0812999999" />
      <select id="edit-master-status-select"><option value="Aktif" selected>Aktif</option><option value="Nonaktif">Nonaktif</option></select>
      <button id="btn-submit-edit-anggota">Simpan</button>
    </dialog>
    <input id="input-skip-month" value="2026-06" />
    <input id="input-kas-start" value="2026-02" />
    <input id="input-nama-anggota" value="Citra" />
    <input id="input-wa-anggota" value="0813777777" />
    <select id="input-tipe-kategori"><option value="Masuk" selected>Masuk</option><option value="Keluar">Keluar</option></select>
    <input id="input-nama-kategori" value="Sumbangan" />
  `;
  const byId = installDom(t, masterDom);
  const idb = createMemoryIdb();
  const prevIdb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: idb.indexedDB });
  t.after(() => {
    if (prevIdb) Object.defineProperty(globalThis, 'indexedDB', prevIdb);
    else delete globalThis.indexedDB;
  });

  resetRuntimeState();
  t.after(resetRuntimeState);

  const seedInputs = () => {
    byId('edit-master-anggota-id').value = 'A01';
    byId('edit-master-nama-input').value = 'Budi Baru';
    byId('edit-master-wa-input').value = '0812999999';
    byId('edit-master-status-select').value = 'Aktif';
    byId('input-skip-month').value = '2026-06';
    byId('input-kas-start').value = '2026-02';
    byId('input-nama-anggota').value = 'Citra';
    byId('input-wa-anggota').value = '0813777777';
    byId('input-tipe-kategori').value = 'Masuk';
    byId('input-nama-kategori').value = 'Sumbangan';
  };

  const handlers = [
    { name: 'addSkippedMonth', confirm: true, run: () => sdk.addSkippedMonth() },
    { name: 'removeSkippedMonth', confirm: true, run: () => sdk.removeSkippedMonth('05-2026') },
    { name: 'saveKasStart', confirm: true, run: () => sdk.saveKasStart() },
    { name: 'submitEditMasterAnggota', confirm: false, run: () => sdk.submitEditMasterAnggota({ preventDefault() {} }) },
    { name: 'submitTambahAnggota', confirm: true, run: () => sdk.submitTambahAnggota({ preventDefault() {} }) },
    { name: 'toggleStatusAnggotaAction', confirm: true, run: () => sdk.toggleStatusAnggotaAction('A01', 'Nonaktif') },
    { name: 'hapusMasterAnggotaAction', confirm: true, run: () => sdk.hapusMasterAnggotaAction('A01') },
    { name: 'submitTambahKategori', confirm: true, run: () => sdk.submitTambahKategori({ preventDefault() {} }) },
    { name: 'hapusMasterKategoriAction', confirm: true, run: () => sdk.hapusMasterKategoriAction('K01') }
  ];

  let fetchCalls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    fetchCalls += 1;
    return Response.json({ status: true, data: {} });
  });

  // 1) Non-admin must be blocked on entry for all 9 handlers
  sdk.setActiveGroupId('grp-a');
  sdk.setState({
    anggota: [{ ID_Anggota: 'A01', Nama_Anggota: 'Budi', Nomor_WA: '081', Status_Aktif: 'Aktif' }],
    kategori: [{ ID_Kategori: 'K01', Nama_Kategori: 'Iuran', Tipe: 'Masuk' }],
    transaksi: [], skippedMonths: ['05-2026'], kasStart: '01-2026', paymentAccount: null
  });
  for (const h of handlers) {
    seedInputs();
    await h.run();
    assert.equal(byId('modal-confirm-action').open, false, `${h.name} must not open confirm dialog for non-admin`);
  }
  assert.equal(fetchCalls, 0);
  assert.equal(idb.rows.length, 0);

  // 2) Switching group BEFORE confirm runs must abort without network or IDB leak
  sdk.setAdminSession('tok-adm');
  sdk.setAdminRole('group_admin');
  for (const h of handlers.filter((item) => item.confirm)) {
    sdk.setActiveGroupId('grp-a');
    sdk.setState({
      anggota: [{ ID_Anggota: 'A01', Nama_Anggota: 'Budi', Nomor_WA: '081', Status_Aktif: 'Aktif' }],
      kategori: [{ ID_Kategori: 'K01', Nama_Kategori: 'Iuran', Tipe: 'Masuk' }],
      transaksi: [], skippedMonths: ['05-2026'], kasStart: '01-2026', paymentAccount: null
    });
    seedInputs();
    await h.run();
    assert.equal(byId('modal-confirm-action').open, true, `${h.name} should open confirm modal for admin`);
    sdk.setActiveGroupId('grp-b');
    await sdk.executeConfirmAction();
  }
  assert.equal(fetchCalls, 0, 'Pre-confirm group switch must block network calls');
  assert.equal(idb.rows.length, 0, 'Pre-confirm group switch must block offline queue writes');

  // 3) Mid-flight group switch during await deliverMutation sends explicit groupId='grp-a' and does NOT mutate grp-b state
  const sentBodies = [];
  t.mock.method(globalThis, 'fetch', async (_url, opts) => {
    const body = JSON.parse(opts.body);
    sentBodies.push(body);
    // Simulate user switching active group while fetch is in flight
    sdk.setActiveGroupId('grp-b');
    sdk.setState({ anggota: [{ ID_Anggota: 'B01', Nama_Anggota: 'Grup B', Status_Aktif: 'Aktif' }], kategori: [], transaksi: [], skippedMonths: ['12-2026'], kasStart: '12-2026', paymentAccount: null });
    return Response.json({
      status: true,
      data: { skippedMonths: ['05-2026', '06-2026'], kasStart: '02-2026', idAnggota: 'A02', idKategori: 'K02' }
    });
  });

  for (const h of handlers) {
    sdk.setActiveGroupId('grp-a');
    sdk.setState({
      anggota: [{ ID_Anggota: 'A01', Nama_Anggota: 'Budi', Nomor_WA: '081', Status_Aktif: 'Aktif' }],
      kategori: [{ ID_Kategori: 'K01', Nama_Kategori: 'Iuran', Tipe: 'Masuk' }],
      transaksi: [], skippedMonths: ['05-2026'], kasStart: '01-2026', paymentAccount: null
    });
    seedInputs();
    const p = h.run();
    if (h.confirm) {
      await p;
      await sdk.executeConfirmAction();
    } else {
      await p;
    }
    assert.equal(sdk.getActiveGroupId(), 'grp-b');
    assert.deepEqual(sdk.getState().skippedMonths, ['12-2026'], `${h.name} leaked skippedMonths into grp-b`);
    assert.equal(sdk.getState().kasStart, '12-2026', `${h.name} leaked kasStart into grp-b`);
    assert.equal(sdk.getState().anggota.length, 1);
    assert.equal(sdk.getState().anggota[0].ID_Anggota, 'B01');
  }
  assert.equal(sentBodies.length, 9);
  assert.ok(sentBodies.every((b) => b.groupId === 'grp-a'), 'Every master mutation must explicitly stamp captured targetGroupId=grp-a');

  // 4) Offline branch queues payload for grp-a AND persists saveCache('grp-a')
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
  for (const h of handlers) {
    localStorage.removeItem('finkas_cache:grp-a');
    sdk.setActiveGroupId('grp-a');
    sdk.setState({
      anggota: [{ ID_Anggota: 'A01', Nama_Anggota: 'Budi', Nomor_WA: '081', Status_Aktif: 'Aktif' }],
      kategori: [{ ID_Kategori: 'K01', Nama_Kategori: 'Iuran', Tipe: 'Masuk' }],
      transaksi: [], skippedMonths: ['05-2026'], kasStart: '01-2026', paymentAccount: null
    });
    seedInputs();
    const p = h.run();
    if (h.confirm) {
      await p;
      await sdk.executeConfirmAction();
    } else {
      await p;
    }
    assert.ok(localStorage.getItem('finkas_cache:grp-a'), `${h.name} must persist saveCache('grp-a') when offline`);
  }
  assert.equal(idb.rows.length, 9);
  assert.ok(idb.rows.every((r) => r.payload?.groupId === 'grp-a'));
});

/* ── SEC-29: Credentials lifecycle, masked edit modal, confirm-gated clipboard ── */

test('SEC-29: GroupAdminModals masked form, credential scrub on close, and SuperAdmin+confirm clipboard gating', async (t) => {
  const modalSvelte = readRepo('src/svelte/shell/modals/GroupAdminModals.svelte');
  assert.match(modalSvelte, /id="modal-group-cred-edit"/);
  assert.match(modalSvelte, /id="form-edit-group-creds"/);
  const credPwdTag = modalSvelte.match(/<input\b[^>]*id="edit-group-cred-pwd"[^>]*>/)?.[0] || '';
  assert.match(credPwdTag, /type="password"/);
  assert.match(modalSvelte, /id="cred-disp-pin">-<\/code>/);

  const domHtml = `
    <span id="app-group-name">Alpha</span>
    <dialog id="modal-group-credentials">
      <div class="cred-card-box"></div>
      <span id="cred-disp-nama">-</span>
      <span id="cred-disp-pin">-</span>
      <span id="cred-disp-email">-</span>
      <span id="cred-disp-pwd">-</span>
      <button id="btn-copy-wa" data-action="copy-cred-wa">Salin WA</button>
    </dialog>
    <dialog id="modal-group-cred-edit">
      <span id="cred-edit-group-label">-</span>
      <form id="form-edit-group-creds">
        <input id="edit-group-cred-id" />
        <input id="edit-group-cred-email" />
        <input id="edit-group-cred-pwd" type="password" />
        <button id="btn-submit-edit-group-creds" type="submit">Simpan</button>
      </form>
    </dialog>
  `;
  const byId = installDom(t, domHtml);
  resetRuntimeState();
  t.after(resetRuntimeState);

  let copiedText = '';
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (txt) => { copiedText = txt; } }
  });
  window.prompt = () => { throw new Error('window.prompt must not be used for credentials'); };

  sdk.setGroups([{ id: 'grp-a', nama: 'Alpha' }]);
  sdk.showCredentialsModal({ nama: 'Alpha', pin: '4321', email: 'admin@alpha.id', pwd: 'SuperSecretPassword!' });
  assert.equal(byId('cred-disp-nama').textContent, 'Alpha');
  assert.equal(byId('cred-disp-pwd').textContent, 'SuperSecretPassword!');

  // Non-superadmin blocked from copyGroupWhatsAppAction
  sdk.setAdminSession('tok-ga');
  sdk.setAdminRole('group_admin');
  await sdk.copyGroupWhatsAppAction(byId('btn-copy-wa'));
  assert.equal(copiedText, '');

  // Superadmin copy: Cancel confirm -> password redacted
  sdk.setAdminSession('tok-sa');
  sdk.setAdminRole('superadmin');
  window.confirm = () => false;
  await sdk.copyGroupWhatsAppAction(byId('btn-copy-wa'));
  assert.doesNotMatch(copiedText, /SuperSecretPassword!/);
  assert.match(copiedText, /Password Admin: \[tidak disalin/);

  // Superadmin copy: OK confirm -> includes password
  window.confirm = () => true;
  await sdk.copyGroupWhatsAppAction(byId('btn-copy-wa'));
  assert.match(copiedText, /Password Admin: SuperSecretPassword!/);

  // Closing #modal-group-credentials scrubs DOM and clears latestCreds
  byId('modal-group-credentials').close();
  assert.equal(byId('cred-disp-nama').textContent, '-');
  assert.equal(byId('cred-disp-pin').textContent, '-');
  assert.equal(byId('cred-disp-email').textContent, '-');
  assert.equal(byId('cred-disp-pwd').textContent, '-');

  copiedText = '';
  await sdk.copyGroupWhatsAppAction(byId('btn-copy-wa'), { includePassword: true });
  assert.doesNotMatch(copiedText, /SuperSecretPassword!/);
  assert.match(copiedText, /Grup: Grup Kas/);

  // manageGroupCredsAction opens masked modal form instead of window.prompt
  await sdk.manageGroupCredsAction('grp-a');
  assert.equal(byId('modal-group-cred-edit').open, true);
  assert.equal(byId('edit-group-cred-pwd').type, 'password');
  assert.equal(byId('edit-group-cred-id').value, 'grp-a');

  // Submitting form hits /api/create-group and displays credentials modal
  let postedBody = null;
  t.mock.method(globalThis, 'fetch', async (_url, opts) => {
    postedBody = JSON.parse(opts.body);
    if (postedBody.action === 'list') return Response.json({ status: true, data: { groups: [{ id: 'grp-a', nama: 'Alpha' }] } });
    return Response.json({ status: true, data: { adminEmail: 'baru@alpha.id', adminPassword: 'NewMaskedPassword99' } });
  });
  byId('edit-group-cred-email').value = 'baru@alpha.id';
  byId('edit-group-cred-pwd').value = 'NewMaskedPassword99';
  await sdk.submitEditGroupCreds({ preventDefault() {} });

  assert.equal(postedBody.adminEmail, 'baru@alpha.id');
  assert.equal(postedBody.adminPassword, 'NewMaskedPassword99');
  assert.equal(byId('modal-group-credentials').open, true);
  assert.equal(byId('cred-disp-pwd').textContent, 'NewMaskedPassword99');
  assert.equal(byId('edit-group-cred-pwd').value, '', 'modal close must wipe password field');
});

/* ── SEC-41: Multiline CSV formula injection neutralization ── */

test('SEC-41: escapeCsvFormula neutralizes formula triggers after embedded newlines and carriage returns', () => {
  for (const [input, expected] of [
    ['aman\n=cmd', `"aman\n'=cmd"`],
    ['aman\r+1+1', `"aman\r'+1+1"`],
    ['aman\r\n@SUM(A1)', `"aman\r\n'@SUM(A1)"`],
    ['aman\n   -100', `"aman\n'   -100"`],
    ['aman\r\tcmd', `"aman\r'\tcmd"`],
    ['baris1\n=1\r\n+2', `"baris1\n'=1\r\n'+2"`]
  ]) {
    assert.equal(sdk.escapeCsvFormula(input), expected);
  }
});

/* ── SEC-42: Prototype-property lookup hardening ── */

test('SEC-42: AUDIT_ACTION_LABELS and renderPassbookEmblem block prototype keys', () => {
  assert.equal(Object.getPrototypeOf(sdk.AUDIT_ACTION_LABELS), null);
  assert.equal(sdk.AUDIT_ACTION_LABELS.LOGIN_ADMIN.label, 'Login Admin');
  for (const protoKey of ['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__']) {
    assert.equal(sdk.AUDIT_ACTION_LABELS[protoKey], undefined);
    const svg = sdk.renderPassbookEmblem(protoKey);
    assert.match(svg, /^[\s]*<svg\b[^>]*>[\s]*<\/svg>[\s]*$/);
  }
  assert.match(sdk.renderPassbookEmblem('paid', 'toString'), /seal-halo/);
  assert.match(sdk.renderPassbookEmblem('paid', 'shield'), /seal-core/);
});

/* ── SEC-43: External link rel=noopener noreferrer (pw.opener & keel covered in dedicated suites) ── */

test('SEC-43: WhatsApp external links in Master templates enforce rel="noopener noreferrer"', () => {
  for (const file of [
    'src/svelte/modals/MasterAnggotaRows.svelte',
    'src/svelte/shell/modals/MasterModals.svelte'
  ]) {
    const src = readRepo(file);
    const links = src.match(/<a\b[^>]*target="_blank"[^>]*>/gs) || [];
    assert.ok(links.length > 0, `${file} must have external target="_blank" links`);
    for (const tag of links) {
      assert.match(tag, /rel="noopener noreferrer"/, `${file} external link must have rel="noopener noreferrer": ${tag}`);
    }
  }
});

/* ── SEC-46: submitGroupPin single in-flight concurrency guard ── */

test('SEC-46: submitGroupPin blocks concurrent duplicate verification requests while pending', async (t) => {
  const domHtml = `
    <span id="app-group-name"></span>
    <dialog id="modal-groups"></dialog>
    <dialog id="modal-group-pin">
      <span id="group-pin-name"></span>
      <span id="group-pin-badge"></span>
      <i id="group-pin-lock-icon"></i>
      <div class="pin-row"><input id="group-pin" value="1234" /></div>
      <div id="group-pin-msg"></div>
      <button id="btn-submit-pin" data-action="submit-group-pin">Buka</button>
    </dialog>
  `;
  const byId = installDom(t, domHtml);
  resetRuntimeState();
  t.after(resetRuntimeState);

  sdk.setGroups([{ id: 'grp-pin', nama: 'PinGroup' }]);
  sdk.requestGroupPin('grp-pin');
  byId('group-pin').value = '1234';

  let fetchCalls = 0;
  let resolveVerify;
  t.mock.method(globalThis, 'fetch', () => {
    fetchCalls += 1;
    return new Promise((resolve) => { resolveVerify = resolve; });
  });

  const p1 = sdk.submitGroupPin();
  assert.equal(byId('btn-submit-pin').disabled, true, 'submit button must be disabled while request is pending');
  const p2 = sdk.submitGroupPin();
  assert.equal(fetchCalls, 1, 'concurrent submitGroupPin must not dispatch a second request');

  resolveVerify(Response.json({ status: false, message: 'PIN salah.' }));
  await Promise.all([p1, p2]);
  assert.equal(byId('btn-submit-pin').disabled, false, 'submit button must re-enable after settlement');

  // Subsequent retry works cleanly after first settles
  byId('group-pin').value = '9999';
  let resolveSecond;
  t.mock.method(globalThis, 'fetch', () => {
    fetchCalls += 1;
    return new Promise((resolve) => { resolveSecond = resolve; });
  });
  const p3 = sdk.submitGroupPin();
  resolveSecond(Response.json({ status: false, message: 'Masih salah.' }));
  await p3;
  assert.equal(fetchCalls, 2);
  // Wait for requestGroupPin's 120ms focus timeout to finish before JSDOM tears down.
  await new Promise((r) => setTimeout(r, 150));
});

/* ── SEC-47: Attachment upload MIME/extension mismatch + download MIME/filename hardening ── */

test('SEC-47: attachments reject MIME/ext mismatches and sanitize download MIME & filenames', async (t) => {
  // Upload client validation
  const htmlSpoofedJpg = sdk.validateClientAttachment({ name: 'photo.jpg', type: 'text/html', size: 1024 });
  assert.equal(htmlSpoofedJpg.valid, false);

  const jpgSpoofedHtml = sdk.validateClientAttachment({ name: 'evil.html', type: 'image/jpeg', size: 1024 });
  assert.equal(jpgSpoofedHtml.valid, false);

  const svgFile = sdk.validateClientAttachment({ name: 'vector.svg', type: 'image/svg+xml', size: 1024 });
  assert.equal(svgFile.valid, false);

  const noMimeValidExt = sdk.validateClientAttachment({ name: 'photo.jpg', type: '', size: 1024 });
  assert.equal(noMimeValidExt.valid, true);

  // Download sanitization
  assert.equal(sdk.sanitizeAttachmentFilename('../../etc/passwd'), 'passwd');
  assert.equal(sdk.sanitizeAttachmentFilename('...'), 'bukti-transaksi');
  assert.equal(sdk.sanitizeAttachmentFilename('bad"name\x00<>.pdf'), 'bad_name___.pdf');
  assert.equal(sdk.resolveSafeDownloadMimeType('text/html'), 'application/octet-stream');
  assert.equal(sdk.resolveSafeDownloadMimeType('image/svg+xml'), 'application/octet-stream');
  assert.equal(sdk.resolveSafeDownloadMimeType('IMAGE/JPG'), 'image/jpeg');
  assert.equal(sdk.resolveSafeDownloadMimeType('application/pdf'), 'application/pdf');

  // downloadAttachmentBlob forces application/octet-stream + safeName on dangerous server metadata
  resetRuntimeState();
  t.after(resetRuntimeState);
  sdk.setGroupSession('grp-a', 'tok-mem-a');
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    status: true,
    data: {
      base64: Buffer.from('<script>alert(1)</script>').toString('base64'),
      type: 'text/html',
      name: '../..//evil"payload\n.html',
      size: 25
    }
  }));
  const downloaded = await sdk.downloadAttachmentBlob({ idTransaksi: 'TRX-1', groupId: 'grp-a' });
  assert.equal(downloaded.type, 'application/octet-stream');
  assert.equal(downloaded.blob.type, 'application/octet-stream');
  assert.doesNotMatch(downloaded.name, /\.\.|\/|["\n]/);

  // triggerBlobDownload coerces non-allowlisted Blob MIME to application/octet-stream and sanitizes a.download
  installDom(t, '<div></div>');
  const createdBlobs = [];
  const origCreateObjUrl = URL.createObjectURL;
  const origRevokeObjUrl = URL.revokeObjectURL;
  URL.createObjectURL = (blob) => { createdBlobs.push(blob); return 'blob:test-url'; };
  URL.revokeObjectURL = () => {};
  t.after(() => {
    URL.createObjectURL = origCreateObjUrl;
    URL.revokeObjectURL = origRevokeObjUrl;
  });
  let clickedName = '';
  t.mock.method(window.HTMLAnchorElement.prototype, 'click', function () {
    clickedName = this.download;
  });

  sdk.triggerBlobDownload(new Blob(['<svg></svg>'], { type: 'image/svg+xml' }), '..\\evil?.svg');
  assert.equal(createdBlobs.length, 1);
  assert.equal(createdBlobs[0].type, 'application/octet-stream');
  assert.equal(clickedName, 'evil_.svg');
});

/* ── SEC-09 & SEC-29: Svelte template gating + live action-router enforcement ── */

test('SEC-09 & SEC-29: offline-queue/admin markup carries .admin-only and live action-router blocks non-admins', async (t) => {
  const shellSvelte = readRepo('src/svelte/shell/WorkspaceShell.svelte');
  const navSvelte = readRepo('src/svelte/shell/modals/NavigationModals.svelte');

  const queueBadgeTag = shellSvelte.match(/<button\b[^>]*id="group-queue-badge"[^>]*>/)?.[0] || '';
  assert.match(queueBadgeTag, /\badmin-only\b/);
  const queueNavTag = navSvelte.match(/<button\b[^>]*data-action="open-offline-queue"[^>]*>/)?.[0] || '';
  assert.match(queueNavTag, /\badmin-only\b/);

  const routerDom = `
    <span id="app-group-name">Alpha</span>
    <dialog class="modal-overlay" id="modal-login"></dialog>
    <dialog class="modal-overlay" id="modal-offline-queue"><div id="offline-queue-list"></div></dialog>
    <dialog class="modal-overlay" id="modal-group-credentials">
      <div class="cred-card-box"></div>
      <span id="cred-disp-nama">Alpha</span>
      <span id="cred-disp-pin">1234</span>
      <span id="cred-disp-email">admin@alpha.id</span>
      <span id="cred-disp-pwd">TopSecret123</span>
      <button id="btn-close-cred" data-action="close-modal">Tutup</button>
      <button id="btn-copy-cred-wa" data-action="copy-cred-wa">Salin</button>
    </dialog>
    <dialog class="modal-overlay" id="modal-group-cred-edit">
      <span id="cred-edit-group-label">-</span>
      <input id="edit-group-cred-id" />
      <input id="edit-group-cred-email" />
      <input id="edit-group-cred-pwd" type="password" />
    </dialog>
    <button id="btn-open-queue" class="admin-only" data-action="open-offline-queue">Queue</button>
    <button id="btn-sync-now" data-action="sync-now">Sync</button>
    <button id="btn-del-offline" data-action="delete-offline-item" data-item-id="1">Del</button>
    <button id="btn-manage-creds" data-action="manage-group-creds" data-id="grp-a">Creds</button>
  `;
  const byId = installDom(t, routerDom);
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
  const idb = createMemoryIdb([{ id: 1, queuedAt: new Date().toISOString(), payload: { action: 'tambahIuran', groupId: 'grp-a' } }]);
  const prevIdb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: idb.indexedDB });
  t.after(() => {
    if (prevIdb) Object.defineProperty(globalThis, 'indexedDB', prevIdb);
    else delete globalThis.indexedDB;
  });

  resetRuntimeState();
  t.after(resetRuntimeState);

  let fetchCalls = 0;
  let clipboardCalls = 0;
  t.mock.method(globalThis, 'fetch', async () => { fetchCalls += 1; return Response.json({ status: true, data: {} }); });
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async () => { clipboardCalls += 1; } }
  });

  sdk.setGroups([{ id: 'grp-a', nama: 'Alpha' }]);
  sdk.setActiveGroupId('grp-a');
  const win = window;
  const prevReadyDesc = Object.getOwnPropertyDescriptor(win.Document.prototype, 'readyState');
  Object.defineProperty(win.Document.prototype, 'readyState', { configurable: true, get: () => 'loading' });
  const origWinAdd = win.addEventListener.bind(win);
  // Keep bootWorkspaceApp focused on attachAppActionRouter without async DOMContentLoaded startWorkspace side effects.
  win.addEventListener = (type, listener, opts) => {
    if (type === 'DOMContentLoaded') return;
    return origWinAdd(type, listener, opts);
  };
  t.after(() => {
    win.addEventListener = origWinAdd;
    if (prevReadyDesc) Object.defineProperty(win.Document.prototype, 'readyState', prevReadyDesc);
    sdk.destroySync();
  });
  assert.equal(document.readyState, 'loading');
  sdk.bootWorkspaceApp();

  // Non-admin clicks must all be blocked
  byId('btn-open-queue').click();
  assert.equal(byId('modal-offline-queue').open, false, 'non-admin must not open offline queue');
  assert.equal(byId('modal-login').open, true, 'non-admin clicking offline queue prompts login');

  byId('btn-sync-now').click();
  byId('btn-del-offline').click();
  byId('btn-manage-creds').click();
  byId('btn-copy-cred-wa').click();
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(fetchCalls, 0);
  assert.equal(idb.rows.length, 1, 'non-admin must not delete offline queue items');
  assert.equal(byId('modal-group-cred-edit').open, false, 'non-admin must not open group cred edit');
  assert.equal(clipboardCalls, 0, 'non-admin must not copy group WhatsApp credentials');

  // Admin can open offline queue, while group_admin is still blocked from SuperAdmin-only cred actions
  sdk.setAdminSession('tok-ga');
  sdk.setAdminRole('group_admin');
  byId('btn-open-queue').click();
  assert.equal(byId('modal-offline-queue').open, true, 'admin session can open offline queue');

  byId('btn-manage-creds').click();
  byId('btn-copy-cred-wa').click();
  assert.equal(byId('modal-group-cred-edit').open, false, 'group_admin must remain blocked from manage-group-creds');
  assert.equal(clipboardCalls, 0, 'group_admin must remain blocked from copy-cred-wa');

  // close-modal on #modal-group-credentials scrubs credentials
  byId('modal-group-credentials').showModal();
  byId('btn-close-cred').click();
  assert.equal(byId('modal-group-credentials').open, false);
  assert.equal(byId('cred-disp-pwd').textContent, '-');
});
