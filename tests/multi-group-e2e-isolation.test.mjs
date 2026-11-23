import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { JSDOM } from 'jsdom';
import { SnapshotFirestore, successful, proofFile } from './helpers/snapshot-firestore.mjs';
import { installMockIndexedDB } from './helpers/mock-indexeddb.mjs';
import { signRawSession } from './helpers/signed-session.mjs';

// The adapter configures the synthetic project before the gateway modules initialize.
const { default: manage } = await import('../api/create-group.ts');
const { default: verifyPin } = await import('../api/verify-group-pin.ts');
const { default: login } = await import('../api/login.ts');
const { default: data } = await import('../api/data.ts');
const { APP_CONFIG_DOC, groupDoc } = await import('../api/_store.ts');
const { ROLES, hashSecret, signSession } = await import('../api/_session.ts');

const A = 'GRP-ALPHA';
const B = 'GRP-BETA';
const start = Date.parse('2026-02-01T05:00:00Z');
const owner = 'owner@example.com';
const tables = ['anggota', 'kategori', 'transaksi', 'transaction_proofs', 'operations', 'audit_log'];

function fixture(t) {
  const db = new SnapshotFirestore();
  t.mock.method(globalThis, 'fetch', db.fetch.bind(db));
  t.mock.timers.enable({ apis: ['Date'], now: start });
  let sequence = 0;
  t.mock.method(crypto, 'randomBytes', size => {
    const bytes = Buffer.alloc(size);
    bytes.writeUInt32BE(++sequence, size - 4);
    return bytes;
  });
  return db;
}

async function invoke(handler, body) {
  const res = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(value) { this.body = value; }
  };
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '192.0.2.1' }, body }, res);
  return res;
}

async function post(handler, body, expected = 200) {
  const res = await invoke(handler, body);
  assert.equal(res.code, expected, [body.action, body.groupId, res.body?.message].join(' '));
  assert.equal(res.body.status, expected === 200);
  return res.body;
}

const access = (groupId, sessionToken, action, status = 200) =>
  post(data, { groupId, sessionToken, action }, status);

function tree(db, gid) {
  const root = groupDoc(gid);
  return structuredClone(new Map([...db.docs].filter(([path]) => path === root || path.startsWith(root + '/'))));
}

function records(db, gid, collection) {
  const prefix = groupDoc(gid) + '/' + collection + '/';
  return [...db.docs].filter(([path]) => path.startsWith(prefix)).map(([, row]) => row);
}

function assertStamps(db, gid) {
  for (const collection of tables) {
    const rows = records(db, gid, collection);
    assert.ok(rows.length, collection);
    for (const row of rows) assert.equal(row.groupId, gid, collection);
  }
}

test('provisioning, audit, credential rotation and deletion stay within the authorized group', async t => {
  const db = fixture(t);
  db.docs.set(APP_CONFIG_DOC, {
    superadmin_emails: [owner], admin_password_hash: hashSecret('owner-secret', 'finkas-master')
  });
  const master = (await post(login, { email: owner, password: 'owner-secret' })).data.sessionToken;
  const configure = body => post(manage, { ...body, sessionToken: master });
  const unlock = async (groupId, pin) => (await post(verifyPin, { groupId, pin })).data.sessionToken;
  const authenticate = async (groupId, email, password) =>
    (await post(login, { groupId, email, password })).data.sessionToken;

  async function provision(name, pin) {
    const nama = 'Group ' + name;
    const email = name.toLowerCase() + '@example.com';
    const password = name + '-secret';
    const { data: { id } } = await configure({ action: 'create', nama, pin, adminEmail: email, adminPassword: password });
    return { id, nama, email, member: await unlock(id, pin), admin: await authenticate(id, email, password) };
  }
  const alpha = await provision('Alpha', '1234');
  const beta = await provision('Beta', '5678');
  const directory = (await post(data, { action: 'groups' })).data.groups;
  assert.deepEqual(directory.sort((x, y) => x.nama.localeCompare(y.nama)),
    [alpha, beta].map(({ id, nama }) => ({ id, nama })));

  for (const [local, foreign] of [[alpha, beta], [beta, alpha]]) {
    for (const token of [local.member, local.admin]) {
      await access(local.id, token, 'read');
      await access(local.id, token, 'audit', 403);
      for (const action of ['read', 'checkUpdate', 'readAttachment', 'tambahTransaksi',
        'uploadAttachment', 'exportSnapshot', 'audit']) {
        await access(foreign.id, token, action, 403);
      }
    }
    const logs = records(db, local.id, 'audit_log');
    assert.deepEqual(logs.map(row => row.Aksi).sort(), ['BUAT_GRUP', 'LOGIN_ADMIN', 'PIN_BENAR']);
    for (const log of logs) assert.equal(log.groupId, local.id);
    assert.deepEqual(new Set((await access(local.id, master, 'audit')).data.log), new Set(logs));
  }
  await post(login, { groupId: 'GRP-GHOST', password: 'incorrect' }, 401);
  const failed = records(db, 'utama', 'audit_log').filter(row => row.Aksi === 'LOGIN_GAGAL');
  assert.equal(failed.length, 1);
  assert.equal(failed[0].groupId, 'utama');
  assert.match(failed[0].Detail, /GRP-GHOST/);
  assert.equal(tree(db, 'GRP-GHOST').size, 0);

  const betaBefore = tree(db, beta.id);
  for (const change of [
    { action: 'set-pin', pin: '4321' },
    { action: 'set-admin-credential', adminEmail: alpha.email, adminPassword: 'new-alpha-secret' }
  ]) {
    const previous = [alpha.member, alpha.admin];
    const legacy = signRawSession(JSON.stringify({ role: ROLES.MEMBER, gid: alpha.id, exp: Date.now() / 1000 + 3600 }));
    t.mock.timers.tick(30_000);
    await configure({ groupId: alpha.id, ...change });
    assert.equal(db.docs.get(groupDoc(alpha.id)).revokedAfter, Date.now() / 1000);
    for (const stale of [...previous, legacy]) await access(alpha.id, stale, 'read', 401);
    alpha.member = await unlock(alpha.id, '4321');
    alpha.admin = await authenticate(alpha.id, alpha.email, change.adminPassword ?? 'Alpha-secret');
    for (const token of [alpha.member, alpha.admin]) await access(alpha.id, token, 'read');
    for (const token of [beta.member, beta.admin]) await access(beta.id, token, 'read');
  }
  await post(verifyPin, { groupId: alpha.id, pin: '1234' }, 401);
  await post(login, { groupId: alpha.id, email: alpha.email, password: 'Alpha-secret' }, 401);
  await configure({ action: 'remove', groupId: alpha.id });
  for (const action of ['read', 'checkUpdate', 'catatAktivitas', 'audit']) await access(alpha.id, master, action, 404);
  await post(verifyPin, { groupId: alpha.id, pin: '4321' }, 404);
  assert.equal(tree(db, alpha.id).size, 0);
  assert.deepEqual(tree(db, beta.id), betaBefore);
  await access(beta.id, beta.member, 'read');
  assert.deepEqual((await post(data, { action: 'groups' })).data.groups, [{ id: beta.id, nama: beta.nama }]);
});

const apply = async (gid, action, fields = {}) => (await successful(gid, { action, ...fields })).data;

async function seedLedger(db, gid, name, nominal, kasStart, skipped, number) {
  db.docs.set(groupDoc(gid), { nama: 'Group ' + name, groupId: gid });
  await apply(gid, 'setKasStart', { kasStart });
  await apply(gid, 'addSkippedMonth', { month: skipped });
  await apply(gid, 'setPaymentAccount', { paymentAccount: { bank: 'BRI', number, holder: name } });
  const member = await apply(gid, 'tambahAnggota', { nama: name + ' Member' });
  const category = await apply(gid, 'tambahKategori', { nama: name + ' Dues', tipe: 'Masuk' });
  return { tipeArus: 'Masuk', idAnggota: member.ID_Anggota, idKategori: category.ID_Kategori,
    bulanIuran: 'Maret', tahunIuran: '2026', nominal, timestamp: '2026-03-01T05:00:00Z', keterangan: name };
}

test('shared operation IDs, proof moves, dues and cross-group restore preserve ledger ownership', async t => {
  const db = fixture(t);
  const { createDuesLedger } = await import('../src/ui/svelte-dashboard.js');
  const alpha = await seedLedger(db, A, 'Alpha', 4000, '01-2026', '02-2026', '001122');
  const beta = await seedLedger(db, B, 'Beta', 6000, '02-2026', '04-2026', '009988');
  const operationId = 'shared-op-id-0001';
  // Distinct one-pixel PNGs make a cross-group proof substitution observable.
  const alphaPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
  const betaPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYPgPAAEDAQAIicLsAAAAAElFTkSuQmCC';
  async function createWithProof(gid, dataForm, base64) {
    const payload = { operationId, dataForm };
    const row = await apply(gid, 'tambahTransaksi', payload);
    const receipt = db.docs.get(groupDoc(gid) + '/operations/' + operationId);
    assert.deepEqual(receipt.responseData, row);
    assert.deepEqual(await apply(gid, 'tambahTransaksi', payload), row);
    assert.equal(records(db, gid, 'transaksi').length, 1);
    await apply(gid, 'uploadAttachment', { idTransaksi: row.ID_Transaksi,
      file: { name: gid + '.png', type: 'image/png', size: Buffer.byteLength(base64, 'base64'), base64 } });
    assertStamps(db, gid);
    return row.ID_Transaksi;
  }
  const alphaId = await createWithProof(A, alpha, alphaPng);
  const betaId = await createWithProof(B, beta, betaPng);
  assert.notEqual(alphaId, betaId);
  assert.equal((await apply(A, 'tambahTransaksi', { operationId, dataForm: alpha })).ID_Transaksi, alphaId);

  async function betaMetrics() {
    const read = await apply(B, 'read');
    const ledger = createDuesLedger({ ...read, ...read.settings }, { now: new Date('2026-05-20T12:00:00Z') });
    return { total: read.transaksi.reduce((sum, row) => sum + row.Nominal, 0),
      arrears: ledger.arrears, unpaidCount: ledger.unpaidCount,
      attachments: (await apply(B, 'exportAttachments')).attachments, receipts: records(db, B, 'operations') };
  }
  const before = await betaMetrics();
  assert.deepEqual([before.total, before.arrears, before.unpaidCount], [6000, 24000, 1]);
  assert.equal(before.attachments[0].idTransaksi, betaId);
  assert.equal(before.attachments[0].base64, betaPng);
  const betaBefore = tree(db, B);
  const periodRow = await apply(A, 'tambahTransaksi', { dataForm: { ...alpha, bulanIuran: 'Mei' } });
  const periodId = periodRow.ID_Transaksi;
  await apply(A, 'uploadAttachment', { idTransaksi: periodId, file: proofFile });
  const moved = await apply(A, 'editTransaksi', { idTransaksi: periodId, dataForm: { ...alpha, bulanIuran: 'April' } });
  assert.notEqual(moved.idTransaksi, periodId);
  assert.equal((await apply(A, 'readAttachment', { idTransaksi: moved.idTransaksi })).base64, proofFile.base64);
  await apply(A, 'hapusTransaksi', { idTransaksi: alphaId, operationId: 'alpha-delete-0001' });
  assert.deepEqual(await betaMetrics(), before);
  assert.deepEqual(tree(db, B), betaBefore);

  const { snapshot } = await apply(A, 'exportSnapshot');
  const backup = snapshot.data;
  assert.deepEqual(backup.transaksi.map(row => [row.ID_Transaksi, row.Bulan_Iuran]), [[moved.idTransaksi, 'April']]);
  assert.deepEqual(backup.attachments.map(file => file.idTransaksi), [moved.idTransaksi]);
  const alphaBefore = tree(db, A);
  const betaAccount = (await apply(B, 'read')).settings.paymentAccount;
  assert.notDeepEqual(backup.paymentAccount, betaAccount);

  // The second request carries just the ledger arrays, without the envelope's source metadata.
  const embedded = Object.fromEntries(['anggota', 'kategori', 'transaksi'].map(key => [key, backup[key]]));
  for (const rows of Object.values(embedded)) assert.ok(rows.length && rows.every(row => row.groupId === A));
  for (const payload of [{ sourceGroupId: snapshot.group.id, data: backup }, { data: embedded }]) {
    const result = await post(data, { groupId: B, sessionToken: signSession({ role: ROLES.GROUP_ADMIN, gid: B }, 3600),
      action: 'restoreSnapshot', ...payload }, 400);
    assert.match(result.message, /Konfirmasi pemulihan lintas grup diperlukan/);
    assert.deepEqual(tree(db, B), betaBefore);
  }
  await apply(B, 'restoreSnapshot', { sourceGroupId: A, confirmCrossGroup: true, data: backup });
  assertStamps(db, B);
  const restored = (await apply(B, 'exportSnapshot')).snapshot.data;
  for (const key of ['anggota', 'kategori', 'transaksi']) {
    assert.deepEqual(restored[key], backup[key].map(row => ({ ...row, groupId: B })));
  }
  for (const key of ['kasStart', 'skippedMonths', 'attachments', 'operations']) assert.deepEqual(restored[key], backup[key]);
  assert.deepEqual(restored.paymentAccount, betaAccount);
  assert.deepEqual(tree(db, A), alphaBefore);
});

function browser(t) {
  const dom = new JSDOM(`
    <span id="app-group-name"></span>
    <span id="group-queue-badge"><span id="group-queue-badge-count"></span></span>
    <dialog id="modal-groups"><div id="group-picker-list"></div><span id="group-picker-count"></span>
      <span id="group-picker-offline-summary"></span><button id="btn-exit-active-group"></button></dialog>
    <dialog id="modal-group-pin"><input id="group-pin"></dialog>
    <div id="offline-queue-list"></div><span id="queue-count-pill"></span><button id="btn-sync-offline-now"></button>
  `, { url: 'https://finkas.test' });
  for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'Element', 'HTMLElement', 'Node', 'Text', 'Comment', 'Event', 'CustomEvent', 'indexedDB', 'BroadcastChannel']) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else delete globalThis[key];
    });
  }
  t.after(() => dom.window.close());
  installMockIndexedDB();
  return id => dom.window.document.getElementById(id);
}

test('switching groups partitions the cached ledger, queue UI and authenticated offline replay', async t => {
  const db = fixture(t);
  const byId = browser(t);
  const state = await import('../src/ui/svelte-dashboard.js');
  const offline = await import('../src/ui/svelte-dashboard.js');
  const sync = await import('../src/ui/svelte-dashboard.js');
  const { CACHE_KEY, API } = await import('../src/ui/svelte-dashboard.js');
  const { enterGroup, requestGroupPin, fetchGroups } = await import('../src/ui/svelte-dashboard.js');
  const { initGroupPickerListeners, renderGroupPicker } = await import('../src/ui/svelte-dashboard.js');
  const { renderOfflineQueueList } = await import('../src/ui/svelte-dashboard.js');

  const alpha = await seedLedger(db, A, 'Alpha', 1000, '01-2026', '02-2026', '001122');
  const beta = await seedLedger(db, B, 'Beta', 2000, '02-2026', '04-2026', '009988');
  const calls = [];
  const pending = [];
  t.mock.method(globalThis, 'fetch', (url, options) => {
    if (url !== API.DATA) return db.fetch(url, options);
    const payload = JSON.parse(options.body);
    calls.push(payload);
    const response = invoke(data, payload).then(res => Response.json(res.body, { status: res.code }));
    pending.push(response); // Offline replay also starts an asynchronous audit request.
    return response;
  });
  await fetchGroups();
  initGroupPickerListeners();
  const token = (gid, role) => signSession({ gid, role }, 3600);
  const memberA = token(A, ROLES.MEMBER);
  const memberB = token(B, ROLES.MEMBER);
  state.setGroupSession(A, memberA);
  state.setGroupSession(B, memberB);
  function becomeAdmin(gid) {
    state.setAdminSession(token(gid, ROLES.GROUP_ADMIN));
    state.setAdminRole(ROLES.GROUP_ADMIN);
  }
  const enqueue = (form, memo) => offline.queueOfflinePayload({
    action: 'tambahTransaksi', operationId: memo, dataForm: { ...form, keterangan: memo }
  });
  const committed = gid => records(db, gid, 'transaksi').map(row => row.Keterangan).sort();
  async function replay(gid, memos) {
    calls.length = 0;
    await offline.syncOfflineTransactions();
    await Promise.all(pending.splice(0));
    assert.deepEqual(calls.map(call => [call.groupId, call.action, call.operationId]), [
      ...memos.map(memo => [gid, 'tambahTransaksi', memo]), [gid, 'catatAktivitas', undefined]
    ]);
    assert.deepEqual(committed(gid), memos);
  }

  enterGroup(A);
  becomeAdmin(A);
  const read = await apply(A, 'read');
  state.setState({ ...read, ...read.settings });
  assert.equal(state.saveCache(), true);
  const cachedAlpha = structuredClone(state.getState());
  await enqueue(alpha, 'alpha-memo-1');
  await enqueue(alpha, 'alpha-memo-2');
  enterGroup(B);
  assert.equal(state.getAdminSession(), '');
  assert.equal(state.getGroupSession(B), memberB);
  assert.equal(byId('app-group-name').textContent, 'Group Beta');
  assert.deepEqual(JSON.parse(localStorage.getItem(CACHE_KEY + ':' + A)), cachedAlpha);
  assert.equal(state.loadCache(), false);
  assert.equal(localStorage.getItem(CACHE_KEY + ':' + B), null);
  assert.deepEqual(state.getState(), { anggota: [], kategori: [], transaksi: [], skippedMonths: [], kasStart: '', paymentAccount: null });

  becomeAdmin(B);
  await enqueue(beta, 'beta-memo-1');
  assert.equal(await offline.countQueuedTransactions(A), 2);
  assert.equal(await offline.countQueuedTransactions(B), 1);
  assert.deepEqual(await offline.countQueuedTransactionsByGroup(), { [A]: 2, [B]: 1 });
  assert.equal(byId('group-queue-badge').hidden, false);
  assert.equal(byId('group-queue-badge-count').textContent, '1');
  renderGroupPicker();
  await new Promise(resolve => setImmediate(resolve)); // Picker refreshes its counts from asynchronous IDB.
  for (const [gid, count] of [[A, '2'], [B, '1']]) {
    assert.equal(byId('group-picker-list').querySelector(`[data-id="${gid}"] .group-queue-badge`).textContent, count);
  }
  assert.equal(byId('group-picker-offline-summary').hidden, false);
  assert.match(byId('group-picker-offline-summary').textContent, /3 transaksi offline menunggu · 2 ada di grup lain/);
  await renderOfflineQueueList();
  const list = byId('offline-queue-list');
  assert.equal(list.querySelectorAll('[data-item-id]').length, 1);
  assert.match(list.textContent, /beta-memo-1/);
  assert.doesNotMatch(list.innerHTML, /alpha-memo|GRP-ALPHA/);

  await replay(B, ['beta-memo-1']);
  assert.deepEqual(committed(A), []);
  assert.deepEqual(await offline.countQueuedTransactionsByGroup(), { [A]: 2 });
  assert.equal(byId('group-queue-badge-count').textContent, '0');
  assert.equal(byId('group-queue-badge').hidden, true);
  assert.equal(sync.getSyncStatus(B).lastConfirmedWriteAt, new Date(start).toISOString());
  assert.equal(sync.getSyncStatus(A).lastConfirmedWriteAt, null);
  const syncedBeta = tree(db, B);

  assert.equal(state.getGroupSession(A), memberA);
  requestGroupPin(A);
  assert.equal(state.getActiveGroupId(), A);
  assert.equal(byId('modal-group-pin').open, false);
  assert.equal(state.loadCache(), true);
  assert.deepEqual(state.getState(), cachedAlpha);
  becomeAdmin(A);
  await replay(A, ['alpha-memo-1', 'alpha-memo-2']);
  assert.equal(sync.getSyncStatus(A).lastConfirmedWriteAt, new Date(start).toISOString());
  assert.deepEqual(await offline.getOfflineTransactions(), []);
  assert.deepEqual(await offline.countQueuedTransactionsByGroup(), {});
  assert.deepEqual(tree(db, B), syncedBeta);
});
