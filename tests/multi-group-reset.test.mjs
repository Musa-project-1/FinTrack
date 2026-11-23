import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import * as state from '../src/ui/svelte-dashboard.js';
import { ACTIVE_GROUP_NAME_KEY, GROUP_OPEN_KEY } from '../src/ui/svelte-dashboard.js';
import { billingPeriod, createDuesLedger } from '../src/ui/svelte-dashboard.js';
import { enterGroup, exitGroup, initGroupsUI } from '../src/ui/svelte-dashboard.js';
import { openModal, closeModal, showConfirmDialog, executeConfirmAction, closeGroupScopedModals } from '../src/ui/svelte-dashboard.js';
import { setupRekapSearchListener, initAppFormAndInputListeners, resetGroupScopedUI } from '../src/ui/svelte-dashboard.js';
import * as dashboard from '../src/ui/svelte-dashboard.js';

const member = { ID_Anggota: 'A1', Nama_Anggota: 'From A', Status_Aktif: 'Aktif' };
const ledger = {
  anggota: [member], kategori: [{ ID_Kategori: 'K1', Nama_Kategori: 'A' }],
  transaksi: [{ ID_Transaksi: 'T1', ID_Anggota: 'A1', Nominal: 500, Tipe_Arus: 'Masuk', Timestamp: '2025-01-02' }],
  skippedMonths: ['02-2025'], kasStart: '01-2025', paymentAccount: { bankName: 'A' }
};
const emptyLedger = { anggota: [], kategori: [], transaksi: [], skippedMonths: [], kasStart: '', paymentAccount: null };
const byId = id => document.getElementById(id);
function installDom(t, html = '') {
  const dom = new JSDOM(html, { url: 'https://example.test' });
  t.after(() => dom.window.close());
  for (const key of ['window', 'document', 'localStorage', 'Element', 'HTMLElement', 'HTMLMediaElement',
    'Node', 'Text', 'Comment', 'Event', 'CustomEvent', 'MutationObserver', 'Option']) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  window.matchMedia = () => ({ matches: true });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
}

test('a different group clears the ledger, rekap year and history filter before notification', t => {
  installDom(t);
  state.setActiveGroupId('GRP-A');
  state.setState(ledger);
  state.setCurrentRekapYear(2000);
  state.setCurrentHistoryFilter('masuk');
  state.setActiveGroupId('GRP-A');
  assert.deepEqual(state.getState(), ledger);
  let snapshot;
  window.addEventListener('finkas:group-changed', () => {
    snapshot = [structuredClone(state.getState()), state.currentRekapYear, state.currentHistoryFilter];
  });
  state.setActiveGroupId('GRP-B');
  assert.deepEqual(snapshot, [emptyLedger, String(billingPeriod().year), 'semua']);
});

test('boot, switch, reentry and exit publish the header and canonical event once each', async t => {
  installDom(t, '<span id="app-group-name"></span><dialog id="modal-groups"></dialog>');
  t.mock.method(globalThis, 'fetch', async () => Response.json({ status: true, data: { groups: [] } }));
  state.setActiveGroupId('GRP-A');
  state.setAdminRole('superadmin');
  state.setGroups([{ id: 'GRP-B', nama: 'New group' }]);
  localStorage.setItem(ACTIVE_GROUP_NAME_KEY, 'Old group');
  const events = [];
  window.addEventListener('finkas:group-changed', e => events.push([
    e.detail, byId('app-group-name').textContent, localStorage.getItem(ACTIVE_GROUP_NAME_KEY),
    localStorage.getItem(GROUP_OPEN_KEY), byId('modal-groups').open
  ]));
  initGroupsUI();
  openModal('modal-groups');
  enterGroup('GRP-B');
  enterGroup('GRP-B');
  exitGroup();
  assert.deepEqual(events, [
    [{ groupId: 'GRP-A', previousGroupId: '' }, 'Old group', 'Old group', null, false],
    [{ groupId: 'GRP-B', previousGroupId: 'GRP-A' }, 'New group', 'New group', '1', false],
    [{ groupId: 'GRP-B', previousGroupId: 'GRP-B' }, 'New group', 'New group', '1', false],
    [{ groupId: '', previousGroupId: 'GRP-B' }, 'Finkas', null, null, false]
  ]);
  assert.equal(state.getActiveGroupId(), '');
  closeModal('modal-groups');
  state.setAdminRole('');
  await new Promise(resolve => setImmediate(resolve));
});

test('group cleanup closes scoped dialogs synchronously and discards pending confirmation', async t => {
  const scoped = ['modal-profil-anggota', 'modal-transaksi', 'modal-quickpay', 'modal-confirm-action', 'modal-struk'];
  const global = ['modal-groups', 'modal-tampilan'];
  installDom(t, [...scoped, ...global].map(id => '<dialog id="' + id + '"></dialog>').join(''));
  for (const id of [...global, ...scoped]) openModal(id);
  byId('modal-struk').classList.add('dues-dialog');
  byId('modal-struk').getAnimations = () => [{ transitionProperty: 'opacity', finished: new Promise(() => {}) }];
  closeModal('modal-struk');
  assert.ok(byId('modal-struk').open);
  const confirm = t.mock.fn();
  showConfirmDialog({ onConfirm: confirm });
  closeGroupScopedModals();
  assert.ok(scoped.every(id => !byId(id).open));
  assert.ok(global.every(id => byId(id).open));
  await executeConfirmAction();
  assert.equal(confirm.mock.callCount(), 0);
  global.forEach(id => closeModal(id));
});

test('direct and event-driven cleanup cancel both searches and reset every input and chip', t => {
  const ids = ['search-member-rekap', 'search-member-rekap-mobile', 'workspace-search-history',
    'search-anggota-iuran', 'master-search-anggota', 'audit-search-input'];
  installDom(t, ids.map(id => '<input id="' + id + '">').join('') +
    ['semua', 'masuk', 'keluar'].map(key => '<button data-action="set-history-filter" data-filter="' + key + '"></button>').join('') +
    ['all', 'unpaid', 'paid'].map(key => '<button data-status-filter="' + key + '"></button>').join(''));
  const schedule = t.mock.method(globalThis, 'setTimeout', () => Symbol('timer'));
  const cancel = t.mock.method(globalThis, 'clearTimeout', () => {});
  setupRekapSearchListener();
  const reads = [];
  initAppFormAndInputListeners({
    renderMasterAnggotaTable: () => reads.push(byId('master-search-anggota').value),
    renderMasterKategoriTable: () => reads.push(byId('workspace-search-history').value)
  });
  for (const reset of [resetGroupScopedUI, () => window.dispatchEvent(new Event('finkas:group-changed'))]) {
    for (const id of ids) byId(id).value = 'old';
    for (const button of document.querySelectorAll('button')) {
      const selected = ['paid', 'masuk'].includes(button.dataset.statusFilter || button.dataset.filter);
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    byId(ids[0]).dispatchEvent(new Event('input'));
    byId(ids[2]).dispatchEvent(new Event('input'));
    const timers = schedule.mock.calls.slice(-2).map(call => call.result);
    assert.equal(new Set(timers).size, 2);
    reset();
    assert.deepEqual(cancel.mock.calls.slice(-2).map(call => call.arguments[0]), timers);
    assert.ok(ids.every(id => byId(id).value === ''));
    for (const button of document.querySelectorAll('button')) {
      const selected = ['semua', 'all'].includes(button.dataset.statusFilter || button.dataset.filter);
      assert.equal(button.getAttribute('aria-pressed'), String(selected));
      if (button.dataset.filter) assert.equal(button.classList.contains('active'), selected);
    }
  }
  assert.deepEqual(reads, ['', '']);
});

test('a mounted dashboard clears all five views in the group-change dispatch', t => {
  installDom(t, readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
  state.setAdminSession('');
  state.setAdminRole('');
  state.setActiveGroupId('GRP-A');
  state.setState(ledger);
  state.setCurrentRekapYear(2025);
  const current = billingPeriod();
  const dues = createDuesLedger(ledger, { year: current.year });
  localStorage.setItem('finkas_spotlight:GRP-A', 'A1');
  dashboard.syncSvelteDashboard({ state: ledger, ledger: dues, current, deposits: 1,
    expenses: new Map(), groupName: 'Old group', firstRender: false });
  dashboard.setSelectedSparkMonth(1);
  dashboard.renderSpotlight(dues, current);
  dashboard.renderHybridChart();
  dashboard.selectStatsMonth(3);
  byId('workspace-history').hidden = false;
  dashboard.renderTableTransaksi();
  dashboard.filterDuesStatus('unpaid');
  const card = document.querySelector('.iuran-member-card');
  dashboard.toggleIuranCard(card);
  assert.ok(card.classList.contains('expanded'));
  assert.equal(byId('spotlight-name').textContent, 'From A');
  assert.equal(byId('group-overview-name').textContent, 'Old group');
  assert.ok(document.querySelector('.ledger-row'));
  assert.equal(document.querySelectorAll('.chart-hit-rect').length, 12);

  state.setActiveGroupId('GRP-B');
  assert.equal(byId('group-overview-name').textContent, '');
  assert.equal(byId('group-overview').hidden, true);
  assert.equal(byId('bento-spark-month').value, '11');
  assert.equal(byId('spotlight-name').textContent, '');
  assert.equal(dashboard.getPinnedMemberId(), null);
  assert.equal(byId('member-spotlight').hidden, true);
  assert.equal(byId('hybrid-ledger-count').textContent, 'Menampilkan 0 transaksi');
  assert.equal(document.querySelectorAll('.ledger-row, .chart-hit-rect, .iuran-member-card, .dues-name').length, 0);
  assert.equal(byId('hybrid-chart-readout').textContent.trim(), '');
  state.setState(ledger);
  dashboard.renderTableRekap();
  assert.equal(document.querySelector('[data-status-filter="all"]').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('.iuran-member-card').classList.contains('expanded'), false);
});
