import test, { after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { installMockIndexedDB } from './helpers/mock-indexeddb.mjs';
import * as state from '../src/ui/svelte-dashboard.js';
import { addOfflineTransaction, countQueuedTransactionsByGroup } from '../src/ui/svelte-dashboard.js';
import {
  enterGroup, exitGroup, initGroupPickerListeners, renderGroupPicker, requestGroupPin
} from '../src/ui/svelte-dashboard.js';
import { openModal, closeModal } from '../src/ui/svelte-dashboard.js';

const groups = ['A', 'B', 'C'].map(letter => ({ id: 'GRP-' + letter, nama: 'Grup ' + letter }));
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const byId = id => document.getElementById(id);
const settle = () => new Promise(resolve => setImmediate(resolve));
const originals = new Map();
let dom;
after(() => dom?.window.close());

beforeEach(() => {
  dom ??= new JSDOM('', { url: 'https://example.test' });
  dom.window.document.open();
  dom.window.document.write(html);
  dom.window.document.close();
  dom.window.localStorage.clear();
  dom.window.sessionStorage.clear();
  for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'Element', 'HTMLElement', 'Node', 'Text', 'Comment', 'Event', 'CustomEvent', 'indexedDB']) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
  }
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  installMockIndexedDB();
  state.clearAdminSession();
  state.setGroups(groups);
  state.setActiveGroupId('GRP-A');
  state.setGroupSession('GRP-A', 'member-a');
});

afterEach(() => {
  closeModal('modal-group-pin');
  closeModal('modal-groups');
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

async function seedQueue() {
  for (const groupId of ['GRP-A', ' GRP-A ', 'GRP-B', ' ', undefined]) {
    await addOfflineTransaction({ payload: { groupId, description: 'private memo' } });
  }
}

test('queue totals normalize group IDs, ignore unscoped rows and tolerate unavailable storage', async () => {
  await seedQueue();
  assert.deepEqual(await countQueuedTransactionsByGroup(), { 'GRP-A': 2, 'GRP-B': 1 });
  indexedDB.open = () => { throw new Error('Storage blocked'); };
  assert.deepEqual(await countQueuedTransactionsByGroup(), {});
  delete globalThis.indexedDB;
  assert.deepEqual(await countQueuedTransactionsByGroup(), {});
});

test('picker shows access status and pending counts without transaction details', async () => {
  state.setGroupSession('GRP-B', 'member-b');
  await seedQueue();
  renderGroupPicker();
  await settle();
  const list = byId('group-picker-list');
  for (const [id, status] of [['GRP-A', 'Aktif'], ['GRP-B', 'Terbuka'], ['GRP-C', 'PIN']]) {
    const row = list.querySelector(`[data-id="${id}"]`);
    assert.equal(row.querySelector('.group-status-pill, .group-pin-badge').textContent, status);
  }
  assert.deepEqual([...list.querySelectorAll('.group-queue-badge')].map(el =>
    [el.dataset.queueGroup, el.textContent]), [['GRP-A', '2'], ['GRP-B', '1']]);
  const summary = byId('group-picker-offline-summary');
  assert.equal(summary.hidden, false);
  assert.match(summary.textContent, /3 transaksi offline menunggu · 1 ada di grup lain/);
  assert.doesNotMatch(byId('modal-groups').innerHTML, /private memo/);
  const focused = list.querySelector('[data-id="GRP-B"]');
  focused.focus();
  renderGroupPicker({ queueCounts: { 'GRP-A': 2 } });
  assert.equal(document.activeElement, focused);
  assert.match(summary.textContent, /2 transaksi offline menunggu sinkronisasi di grup aktif/);
  renderGroupPicker({ queueCounts: {} });
  assert.equal(summary.hidden, true);
  assert.equal(summary.childNodes.length, 0);
});

for (const mode of ['member', 'group_admin']) {
  test(`switching from ${mode} preserves the destination member token`, () => {
    if (mode === 'group_admin') {
      state.setAdminSession('admin-a');
      state.setAdminRole(mode);
    }
    state.setGroupSession('GRP-B', 'member-b');
    enterGroup('GRP-B');
    assert.equal(state.getActiveGroupId(), 'GRP-B');
    assert.equal(state.getGroupSession('GRP-B'), 'member-b');
    assert.equal(state.getAdminSession(), '');
  });
}

test('PIN selection reuses stored sessions and exit locks only the exited group', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ status: true, data: { groups } }));
  t.mock.method(globalThis, 'setTimeout', () => 0);
  const changed = t.mock.fn();
  window.addEventListener('finkas:group-changed', changed);
  t.after(() => dom.window.removeEventListener('finkas:group-changed', changed));
  openModal('modal-groups');
  requestGroupPin('GRP-A');
  assert.equal(changed.mock.callCount(), 0);
  assert.equal(byId('modal-groups').open, false);
  assert.equal(byId('modal-group-pin').open, false);

  state.setGroupSession('GRP-B', 'member-b');
  requestGroupPin('GRP-B');
  assert.equal(state.getActiveGroupId(), 'GRP-B');
  assert.equal(byId('modal-group-pin').open, false);
  requestGroupPin('GRP-C');
  assert.equal(byId('modal-group-pin').open, true);
  closeModal('modal-group-pin');

  state.setAdminSession('admin-b');
  state.setAdminRole('group_admin');
  exitGroup();
  await settle();
  assert.equal(state.getGroupSession('GRP-A'), 'member-a');
  assert.equal(state.getAdminSession(), '');
  requestGroupPin('GRP-B');
  assert.equal(byId('modal-group-pin').open, true);
  assert.equal(byId('group-pin-name').textContent, 'Grup B');
});

test('topbar follows the active group, ignores other queue events and keeps its name plain', async t => {
  await seedQueue();
  initGroupPickerListeners();
  initGroupPickerListeners();
  const badge = byId('group-queue-badge');
  const label = byId('group-queue-badge-count');
  const queueChanged = (groupId, pendingCount) => window.dispatchEvent(new CustomEvent('finkas:queue-changed', {
    detail: { groupId, pendingCount }
  }));
  const writes = t.mock.method(badge, 'setAttribute');
  enterGroup('GRP-A');
  queueChanged('GRP-A', 3);
  queueChanged('GRP-B', 7);
  await settle();
  assert.equal(writes.mock.calls.filter(call => call.arguments[0] === 'aria-label').length, 1);
  assert.equal(label.textContent, '3');
  assert.equal(badge.hidden, false);
  assert.equal(byId('app-group-name').textContent, 'Grup A');

  enterGroup('GRP-B');
  await settle();
  assert.equal(label.textContent, '1');
  assert.equal(badge.getAttribute('aria-label'), '1 transaksi offline menunggu sinkronisasi');
  assert.equal(byId('app-group-name').textContent, 'Grup B');
  queueChanged('GRP-B', 0);
  assert.equal(badge.hidden, true);
});
