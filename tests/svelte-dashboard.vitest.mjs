import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { bukaProfilAnggota } from '../src/svelte/mount.ts';
import { openReceipt } from '../src/svelte/mount.ts';
import { initSelfPay, openSelfPay } from '../src/svelte/mount.ts';
import { billingPeriod, createDuesLedger } from '../src/svelte/mount.ts';
import { NAMA_BULAN } from '../src/svelte/mount.ts';
import { setActiveGroupId, setCurrentHistoryFilter, setCurrentRekapYear, setAdminSession, setAdminViewMode, setState } from '../src/svelte/mount.ts';
import * as rekap from '../src/svelte/mount.ts';
import * as history from '../src/svelte/mount.ts';
import * as stats from '../src/svelte/mount.ts';
import * as adapter from '../src/svelte/mount.ts';
import * as bundle from '../src/svelte/mount.ts';
import { formatRp } from '../src/svelte/mount.ts';
import {
  computeDashboardViewModel, updateDashboardStore, setSelectedSparkMonth,
  mountSvelteDashboard, syncSvelteDashboard
} from '../src/svelte/mount.ts';

const read = path => readFileSync(new URL('../' + path, ("file://" + process.cwd() + "/tests/")), 'utf8');
const trx = (Timestamp, Nominal, Tipe_Arus) => ({ Timestamp, Nominal, Tipe_Arus });
const input = {
  state: {
    transaksi: [
      trx('2024-10-01', 100, 'Masuk'), // opening balance
      trx('2024-11-30T17:00:00Z', 25, 'Keluar'), // December in Jakarta
      trx('2025-10-03', 90, 'Masuk'),
      trx('2025-12-01', 10, 'Keluar'), // outside the chart, still in the cash totals
      trx('invalid', 5, 'Masuk')
    ],
    kategori: [{ ID_Kategori: 'supplies', Nama_Kategori: 'Alat' }],
    kasStart: '03-2024'
  },
  ledger: {
    monthlyFee: 10000,
    members: [{ expectedTotal: 100, paidTotal: 25 }, { expectedTotal: 50, paidTotal: 25 }]
  },
  current: { year: 2025, monthIndex: 10 }, deposits: 3,
  expenses: new Map([['other', 10], ['supplies', 25]]), groupName: 'RT 05', firstRender: false
};

test('WIB rolling balances, all-time cash totals and amount-based dues', () => {
  const { state, ledger, current, deposits, expenses, groupName, firstRender } = input;
  const vm = computeDashboardViewModel(state, ledger, current, deposits, expenses, groupName, firstRender);
  const balances = [...Array(10).fill(75), 165, 165];
  assert.deepEqual(vm.sparkSeries, balances.map((balance, i) => ({
    year: i === 0 ? 2024 : 2025, monthIndex: (i + 11) % 12, balance
  })));
  assert.deepEqual(vm.sparkPoints[0], [4, 36]);
  assert.deepEqual(vm.sparkPoints[11], [112, 8]);
  assert.equal(vm.sparkLinePath, 'M' + vm.sparkPoints.map(p => p.map(n => n.toFixed(1)).join(',')).join(' L'));
  assert.equal(vm.sparkAreaPath, vm.sparkLinePath + ' L112,42 L4,42 Z');
  assert.deepEqual([vm.totalMasuk, vm.totalKeluar, vm.saldo, vm.saldoLength], [195, 35, 160, formatRp(160).length]);
  assert.deepEqual([vm.hasDueTarget, vm.compliancePercent, vm.activeMembersCount, vm.monthlyFee], [true, 33, 2, 10000]);
  assert.deepEqual([vm.depositsCount, vm.largestExpenseCategory, vm.largestExpenseAmount], [3, 'Alat', 25]);
  assert.equal(vm.kasStartLabel, 'Maret 2024');
  assert.equal(vm.selectedMonthIndex, 11);
});

test('empty ledger, unknown category, flat chart and persistent bounded selection', () => {
  const empty = { ...input, groupName: '', deposits: 0, expenses: new Map(),
    state: { transaksi: [], kategori: [], kasStart: '' }, ledger: { monthlyFee: 0, members: [] } };
  const vm = updateDashboardStore(empty);
  assert.deepEqual([vm.hasDueTarget, vm.compliancePercent, vm.visible], [false, 0, false]);
  assert.equal(vm.kasStartLabel, 'November 2025');
  assert.equal(vm.largestExpenseCategory, '');
  assert.ok(vm.sparkPoints.every(([, y]) => y === 22));
  for (const [index, expected] of [[-4, 0], [5, 5], [15, 11]]) {
    setSelectedSparkMonth(index);
    assert.equal(updateDashboardStore(empty).selectedMonthIndex, expected);
  }
  updateDashboardStore({ ...empty, expenses: new Map([['unknown', 9]]) });
  assert.equal(vm.largestExpenseCategory, 'Operasional');
  assert.doesNotThrow(() => syncSvelteDashboard(empty));
});

import { readWorkspaceFixtureHtml } from './helpers/workspace-fixture.mjs';

// Svelte caches DOM templates and their realm's node constructors.
let dom;
after(() => dom?.window.close());
function installDom(t, file = 'index.html') {
  dom ??= new JSDOM('', { url: 'https://example.test' });
  const { window } = dom;
  window.document.open();
  window.document.write(file === 'index.html' ? readWorkspaceFixtureHtml() : read(file));
  window.document.close();
  window.localStorage.clear();
  if (!('inert' in window.HTMLElement.prototype)) {
    Object.defineProperty(window.HTMLElement.prototype, 'inert', {
      get() { return this.hasAttribute('inert'); },
      set(value) { this.toggleAttribute('inert', value); }
    });
  }
  for (const name of ['window', 'document', 'Element', 'HTMLElement', 'HTMLMediaElement', 'Node', 'Text', 'Comment', 'Event', 'CustomEvent',
    'Option', 'MutationObserver', 'localStorage']) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value: window[name], configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }
  window.matchMedia = () => ({ matches: true });
  return id => document.getElementById(id);
}

test('mounted cards preserve the template contract and synchronously follow store updates', async t => {
  const byId = installDom(t);
  const contract = () => Array.from(document.querySelectorAll('#group-overview *, .bento-dashboard *'), el => [
    el.tagName, el.parentElement.tagName,
    ...Array.from(el.attributes).filter(a =>
      /^(id|class|viewBox|for|focusable|data-.*|aria-(?!valuenow|valuetext).*)$/.test(a.name)
    ).map(a => [a.name, a.value]).sort()
  ]);
  const original = contract();
  syncSvelteDashboard(input);
  assert.deepEqual(contract(), original);
  const slider = byId('bento-spark-month');
  mountSvelteDashboard();
  assert.equal(slider, byId('bento-spark-month'));
  assert.equal(byId('ui-saldo').textContent, formatRp(160));
  assert.equal(byId('ui-masuk').textContent, '+' + formatRp(195));
  assert.equal(byId('ui-keluar').textContent, '−' + formatRp(35));
  assert.equal(byId('bento-compliance').getAttribute('aria-valuenow'), '33');
  assert.equal(byId('bento-compliance').firstElementChild.style.width, '33%');
  assert.match(byId('bento-inflow-detail').textContent, /3 setoran/);
  assert.match(byId('bento-outflow-detail').textContent, /Alat/);
  slider.value = '0';
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  await Promise.resolve();
  assert.equal(slider.getAttribute('aria-valuetext'), 'Desember 2024: ' + formatRp(75));
  assert.equal(byId('bento-spark-marker').getAttribute('cx'), '4.0');
  syncSvelteDashboard({ ...input, groupName: 'RT 06', totalMasuk: 1000, totalKeluar: 10 });
  assert.equal(byId('ui-saldo').textContent, formatRp(990));
  assert.equal(byId('group-overview-name').textContent, 'RT 06');
  assert.equal(byId('group-overview').hidden, false);
  assert.equal(byId('bento-spark-month'), slider);
  assert.equal(slider.value, '0');
  syncSvelteDashboard({ ...input, groupName: '' });
  assert.equal(byId('group-overview').hidden, true);
});

const current = { monthIndex: 4, year: 2025 };
const payment = (id, i, amount) => ({
  ID_Transaksi: id + i, ID_Anggota: id, Tipe_Arus: 'Masuk', Bulan_Iuran: NAMA_BULAN[i],
  Tahun_Iuran: current.year, Nominal: amount, Timestamp: '2025-05-10'
});
const state = {
  anggota: ['Zara', 'Yuni', 'Budi', 'Dewi', 'Cici', 'Ana', 'Inactive'].map((name, i) => ({
    ID_Anggota: 'A' + (i + 1), Nama_Anggota: name, Status_Aktif: i === 6 ? 'Nonaktif' : 'Aktif'
  })),
  kasStart: '01-2025', skippedMonths: ['02-2025'],
  transaksi: [payment('A1', 0, 10000), payment('A1', 4, 4000),
    ...NAMA_BULAN.map((_, i) => payment('A2', i, 10000))]
};
const ledger = createDuesLedger(state, { year: current.year, now: new Date('2025-05-12') });

test('spotlight view model resolves pins, skipped periods and partial dues', () => {
  const opts = { groupId: 'test', pinnedId: 'A1', isAdmin: false, selectedMonth: 4 };
  const vm = bundle.computeSpotlightViewModel(ledger, current, opts);
  assert.deepEqual(vm.members.map(m => m.name), ['Ana', 'Budi', 'Cici', 'Dewi', 'Yuni', 'Zara']);
  assert.deepEqual([vm.hasPinned, vm.percent, vm.settled, vm.total, vm.arrearsCount], [true, 25, 1, 4, 3]);
  assert.deepEqual(vm.months.slice(0, 6).map(m => m.status), ['Lunas', 'Libur', 'Belum', 'Belum', 'Sebagian', 'Nanti']);
  assert.deepEqual(vm.detail, {
    monthIndex: 4, head: 'Mei 2025 · Sebagian', paid: formatRp(4000), remaining: formatRp(6000),
    cta: { kind: 'pay', label: 'Bayar Bulan Ini →', memberId: 'A1', monthIndex: 4, year: 2025 }
  });
  assert.equal(bundle.computeSpotlightViewModel(ledger, current, { ...opts, pinnedId: 'A7' }).pinnedId, '');
  const hidden = bundle.computeSpotlightViewModel(ledger, current, { ...opts, groupId: null });
  assert.ok(hidden.memberHidden && hidden.adminHidden);
});

test('spotlight adapter re-exports the bundle API', () => {
  const names = ['getPinnedMemberId', 'initSpotlight', 'renderSpotlight', 'setMemberPin', 'showSpotlightDetail', 'toggleMemberPin'];
  for (const name of names) {
    assert.equal(typeof bundle[name], 'function', name);
    assert.equal(adapter[name], bundle[name]);
  }
});

test('pin controls, monthly details, keyboard focus and admin arrears update synchronously', t => {
  const byId = installDom(t, 'index.html');
  const group = 'spotlight-test';
  setActiveGroupId(group);
  setAdminSession('');
  setState(state);
  const render = () => adapter.renderSpotlight(ledger, current);
  render();
  const picker = byId('spotlight-picker');
  const swap = byId('spotlight-swap-select');
  adapter.initSpotlight();
  assert.equal(byId('spotlight-picker'), picker);
  assert.equal(byId('member-spotlight').hidden, false);
  assert.equal(byId('admin-priorities').hidden, true);
  assert.equal(byId('quick-cek-bar').hidden, false);
  assert.equal(byId('spotlight-card').hidden, true);
  const pins = [];
  document.addEventListener('finkas:member-pin-changed', () => pins.push(adapter.getPinnedMemberId()));
  const choose = (select, value) => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    render(); // Display the fixed fixture period after the picker syncs the live billing period.
  };
  choose(picker, 'A1');
  assert.equal(document.activeElement, swap);
  assert.equal(swap.value, 'A1');
  assert.equal(localStorage.getItem('finkas_spotlight:' + group), 'A1');
  assert.equal(byId('quick-cek-bar').hidden, true);
  assert.equal(byId('spotlight-card').hidden, false);
  assert.equal(byId('spotlight-progress').getAttribute('aria-valuenow'), '25');
  assert.equal(byId('spotlight-ring-arc').getAttribute('stroke-dashoffset'), '75');
  assert.equal(byId('spotlight-member-code').textContent, 'A1');
  assert.equal(byId('spotlight-arrears-chip').textContent, '3 Bulan Belum Lunas (' + formatRp(26000) + ')');
  assert.equal(byId('spotlight-paid-chip').hidden, true);
  assert.equal(byId('spotlight-pay-label').textContent, 'Bayar Iuran');
  const pills = [...document.querySelectorAll('.mini-month-pill')];
  assert.equal(pills.length, 12);
  assert.equal(pills[1].disabled, true);
  const arrow = (from, key, to) => {
    pills[from].focus();
    const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    pills[from].dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(document.activeElement, pills[to]);
  };
  arrow(0, 'ArrowRight', 2);
  arrow(0, 'ArrowLeft', 11);
  arrow(11, 'ArrowRight', 0);

  const opened = [];
  for (const id of ['modal-struk', 'modal-bayar-anggota']) byId(id).showModal = () => opened.push(id);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action="spotlight-month"]');
    if (button) adapter.showSpotlightDetail(Number(button.dataset.index), ledger, current);
  });
  const detail = byId('spotlight-detail');
  const cta = () => detail.querySelector('.spotlight-detail-cta');
  pills[0].click();
  assert.equal(pills[0].getAttribute('aria-pressed'), 'true');
  assert.equal(detail.hidden, false);
  assert.equal(detail.querySelector('.nominal-val').textContent, formatRp(10000));
  assert.equal(cta().textContent, 'Lihat Struk →');
  assert.equal(cta().hasAttribute('data-action'), false);
  assert.deepEqual(opened, []);
  cta().click();
  pills[0].click();
  pills[4].click();
  assert.equal(pills[0].getAttribute('aria-pressed'), 'false');
  assert.deepEqual([...detail.querySelectorAll('.nominal-val')].map(s => s.textContent), [formatRp(4000), formatRp(6000)]);
  assert.equal(cta().textContent, 'Bayar Bulan Ini →');
  cta().click();
  adapter.showSpotlightDetail('pay', ledger, current);
  assert.deepEqual(opened, ['modal-struk', 'modal-struk', 'modal-bayar-anggota', 'modal-bayar-anggota']);
  const stamp = pills[0].querySelector('.mini-stamp-ico');
  assert.equal(stamp.parentElement.style.display, 'contents');
  stamp.outerHTML = stamp.outerHTML;
  localStorage.setItem('finkas_indicator_style', 'shield');
  render();
  assert.equal(pills[0].querySelectorAll('.mini-stamp-ico').length, 1);
  assert.ok(pills[0].querySelector('path.mini-seal-bg'));
  choose(swap, 'A2');
  assert.equal(byId('spotlight-paid-chip').hidden, false);
  assert.equal(byId('spotlight-arrears-chip').hidden, true);
  assert.equal(byId('spotlight-pay-label').textContent, 'Buku Iuran');
  let bookClicks = 0;
  byId('spotlight-book').addEventListener('click', () => bookClicks++);
  adapter.showSpotlightDetail('pay', ledger, current);
  assert.equal(bookClicks, 1);
  assert.equal(detail.hidden, true);
  adapter.toggleMemberPin('A2');
  assert.equal(localStorage.getItem('finkas_spotlight:' + group), null);
  assert.deepEqual(pins, ['A1', 'A2', '']);

  setAdminSession('test-session');
  setAdminViewMode('admin');
  render();
  assert.equal(byId('member-spotlight').hidden, true);
  assert.equal(byId('admin-priorities').hidden, false);
  assert.equal(byId('priority-title').textContent, 'Tunggakan Prioritas (Mei 2025)');
  assert.equal(byId('priority-period').textContent, '5 anggota belum lunas Mei');
  assert.deepEqual([...document.querySelectorAll('#priority-members li > span')].map(s => s.textContent),
    ['Ana', 'Budi', 'Cici', 'Dewi']);
  const first = document.querySelector('#priority-members button[data-action="quickpay-card"]');
  assert.deepEqual({ ...first.dataset }, { action: 'quickpay-card', anggota: 'A6', bulan: 'Mei', year: '2025' });
  assert.equal(first.getAttribute('aria-label'), 'Lunasi iuran Mei untuk Ana');
  assert.equal(first.previousElementSibling.title, 'Sisa ' + formatRp(10000));
});

const stage3 = {
  anggota: [state.anggota[0]], kasStart: '01-2025', skippedMonths: [],
  kategori: [{ ID_Kategori: 'sup', Nama_Kategori: 'Alat' }],
  transaksi: [
    ...NAMA_BULAN.map((_, i) => payment('A1', i, 10000)),
    { ...trx('2025-05-31T17:00Z', 3000, 'Keluar'), ID_Transaksi: 'X1', ID_Kategori: 'sup', Keterangan: '  Kertas  ' },
    { ...trx('2025-06-02', 1000, 'Keluar'), ID_Transaksi: 'X2', ID_Anggota: '-', ID_Kategori: 'unknown' },
    { ...trx('2024-01-01', 500, 'Masuk'), ID_Transaksi: 'opening' }
  ]
};

test('history searches all ledger fields before counting flows and applying chips', () => {
  const view = (filter, searchQuery = '') => bundle.computeHistoryViewModel(stage3, { filter, searchQuery, isAdmin: true });
  const all = view('semua');
  assert.deepEqual(all.flowCounts, { semua: 15, masuk: 13, keluar: 2 });
  assert.deepEqual(all.filteredTrx.slice(0, 2).map(t => t.ID_Transaksi), ['X2', 'X1']);
  for (const [filter, count] of [['masuk', 13], ['keluar', 2], ['iuran', 12], ['operasional', 3]]) {
    assert.equal(view(filter).filteredTrx.length, count);
  }
  for (const [term, count] of [['ZARA', 12], ['KERTAS', 1], ['aLAt', 1], ['MEI', 1], ['2025', 12], ['x2', 1]]) {
    assert.equal(view('semua', term).filteredTrx.length, count);
  }
  assert.deepEqual(view('masuk', 'kertas').flowCounts, { semua: 1, masuk: 0, keluar: 1 });
  assert.equal(all.hint, 'Koreksi / Struk');
  assert.equal(history.renderTableTransaksi, bundle.renderTableTransaksi);
  assert.equal(history.initHistoryPagination, bundle.initHistoryPagination);
});

test('history mounts into the ledger list and shares page, search, and role updates', t => {
  const byId = installDom(t);
  setState(stage3);
  setAdminSession('');
  setCurrentHistoryFilter('semua');
  const panel = byId('workspace-history');
  const list = byId('hybrid-ledger-list');
  const search = byId('workspace-search-history');
  const pager = byId('history-pagination');
  history.initHistoryPagination();
  history.renderTableTransaksi();
  assert.equal(list.querySelector('.ledger-row'), null);
  panel.hidden = false;
  history.renderTableTransaksi();
  assert.deepEqual([...document.querySelectorAll('.workspace-history-tools [data-filter]')].map(b => b.textContent),
    ['Semua (15)', 'Masuk (13)', 'Keluar (2)']);
  assert.equal(byId('hybrid-ledger-count').textContent, 'Menampilkan 15 transaksi');
  assert.equal(list.querySelectorAll('.ledger-row[data-action="open-receipt"]').length, 10);
  assert.equal(list.querySelector('[data-id="X1"] .ledger-title').title, 'Kertas');
  assert.equal(list.querySelector('[data-id="X2"] .ledger-title').title, 'Operasional');
  assert.equal(list.querySelector('[data-id="X1"] .ledger-amt').textContent, '−' + formatRp(3000));
  pager.querySelector('[data-page-step="1"]').click();
  assert.equal(list.querySelectorAll('.ledger-row').length, 5);
  search.value = 'ZaRa';
  history.renderTableTransaksi();
  assert.equal(list.querySelectorAll('.ledger-row').length, 10);
  assert.equal(list.querySelector('.ledger-title').textContent, 'Iuran Januari · Zara');
  assert.equal(list.querySelector('.ledger-action-hint').textContent, 'Lihat Struk');
  setAdminSession('history-session');
  setAdminViewMode('admin');
  history.renderTableTransaksi();
  assert.equal(list.querySelector('.ledger-action-hint').textContent, 'Koreksi / Struk');
  setCurrentHistoryFilter('keluar');
  history.renderTableTransaksi();
  assert.equal(list.querySelector('.hybrid-ledger-empty').textContent, 'Belum ada transaksi yang sesuai filter.');
  assert.equal(pager.hidden, true);
  assert.equal(document.querySelector('.workspace-history-tools [data-filter="masuk"]').textContent, 'Masuk (12)');
});

test('stats model includes WIB monthly totals, opening balance, compliance and expense shares', () => {
  const vm = bundle.computeStatsViewModel(stage3, { activeYear: 2025, selectedMonth: 4 });
  assert.deepEqual(vm.gridLines.map(g => g.y), [18, 84, 150, 216]);
  assert.equal(vm.months.length, 12);
  assert.equal(vm.months[0].runText, formatRp(500));
  assert.equal(vm.months[4].inText, formatRp(120000));
  assert.equal(vm.months[5].outText, formatRp(4000));
  assert.equal(vm.months[11].runText, formatRp(116500));
  assert.equal(vm.curvePath.match(/ C /g).length, 11);
  assert.deepEqual(vm.breakdownRows.map(r => [r.label, r.width, r.metricText]), [
    ['Kepatuhan Iuran Grup', 100, '100%'], ['Alat', 75, '−' + formatRp(3000) + ' (75%)'],
    ['unknown', 25, '−' + formatRp(1000) + ' (25%)']
  ]);
  assert.equal(stats.renderHybridChart, bundle.renderHybridChart);
});

test('stats preserves both cards and updates readout, focus and selection synchronously', t => {
  const byId = installDom(t);
  const panel = byId('workspace-stats');
  const contract = () => [...panel.querySelectorAll('*')].map(el => [
    el.tagName, el.parentElement.tagName, [...el.attributes].map(a => [a.name, a.value]).sort()
  ]);
  const original = contract();
  mountSvelteDashboard();
  assert.deepEqual(contract(), original);
  setCurrentRekapYear(2025);
  stats.renderHybridChart(stage3); // JSDOM has no getTotalLength().
  const svg = byId('hybrid-cashflow');
  for (const cls of ['chart-bar-in', 'chart-bar-out', 'chart-dot', 'chart-hit-rect']) {
    assert.equal(svg.querySelectorAll('.' + cls).length, 12);
  }
  const hits = [...svg.querySelectorAll('.chart-hit-rect')];
  const path = svg.querySelector('path');
  assert.match(path.getAttribute('d'), /^M .* C /);
  const check = index => {
    assert.equal(byId('hybrid-chart-readout').querySelector('strong').textContent, NAMA_BULAN[index] + ' 2025');
    assert.equal(svg.querySelector('[aria-pressed="true"]'), hits[index]);
    assert.equal(svg.querySelector('.chart-dot.is-selected').getAttribute('r'), '5.5');
  };
  check(11);
  hits[5].dispatchEvent(new Event('click', { bubbles: true }));
  check(5);
  for (const [from, key, to] of [[5, 'Home', 0], [0, 'ArrowLeft', 11], [11, 'ArrowRight', 0], [0, 'End', 11]]) {
    hits[from].dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
    check(to);
    assert.equal(document.activeElement, hits[to]);
  }
  assert.equal(svg.querySelector('path'), path);
  assert.deepEqual([...panel.querySelectorAll('.breakdown-fill')].map(el => el.style.width), ['100%', '75%', '25%']);
  assert.equal(panel.querySelector('.breakdown-fill.paid').style.width, '100%');
  const proto = Object.getPrototypeOf(path);
  const measured = new WeakSet();
  proto.getTotalLength = function () { measured.add(this); return 42; };
  t.after(() => { delete proto.getTotalLength; });
  let reduceMotion = false;
  const originalMedia = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: reduceMotion }) });
  t.after(() => {
    if (originalMedia) Object.defineProperty(globalThis, 'matchMedia', originalMedia);
    else delete globalThis.matchMedia;
  });

  stats.renderHybridChart(stage3);
  const animated = svg.querySelector('path');
  assert.notEqual(animated, path);
  assert.ok(measured.has(animated) && animated.classList.contains('draw-anim'));
  measured.delete(animated);
  bundle.selectStatsMonth(5);
  assert.equal(measured.has(animated), false);
  reduceMotion = true;
  stats.renderHybridChart(stage3);
  const stationary = svg.querySelector('path');
  assert.equal(measured.has(stationary), false);
  assert.equal(stationary.classList.contains('draw-anim'), false);
  check(5);
});

function installRekap(t) {
  const byId = installDom(t);
  setActiveGroupId('rekap-test');
  setCurrentRekapYear('2025');
  setAdminSession('');
  setState(state);
  bundle.resetRekapFilter();
  return { byId, matrix: byId('ui-table-rekap'), cards: byId('iuran-cards-mobile') };
}

test('rekap adapter filters, counts and resets both mounted views', t => {
  for (const name of ['initDuesPagination', 'filterDuesStatus', 'markNewlyPaidCells',
    'renderTableRekap', 'renderIuranMobileCards', 'toggleIuranCard']) assert.equal(rekap[name], bundle[name]);
  const { byId, matrix, cards } = installRekap(t);
  const names = () => [...matrix.querySelectorAll('.dues-member-name')].map(el => el.textContent);
  const filter = key => document.querySelector(`[data-status-filter="${key}"]`);
  assert.deepEqual(names(), ['Ana', 'Budi', 'Cici', 'Dewi', 'Yuni', 'Zara']);
  assert.deepEqual(['all', 'unpaid', 'paid'].map(key => filter(key).textContent),
    ['Semua (6)', 'Nunggak (5)', 'Lunas (1)']);
  rekap.filterDuesStatus('paid');
  assert.deepEqual(names(), ['Yuni']);
  assert.equal(filter('paid').getAttribute('aria-pressed'), 'true');
  rekap.filterDuesStatus('unpaid');
  assert.equal(matrix.rows.length, 5);
  assert.equal(cards.children.length, 5);
  byId('search-member-rekap-mobile').value = '  zAr ';
  rekap.renderTableRekap();
  assert.deepEqual(names(), ['Zara']);
  assert.equal(filter('all').textContent, 'Semua (1)');
  byId('search-member-rekap').value = 'missing';
  rekap.renderTableRekap();
  assert.equal(matrix.rows[0].cells[0].colSpan, 13);
  assert.match(cards.textContent, /Tidak ada anggota ditemukan/);
  cards.querySelector('.btn-reset-rekap-filter').click();
  assert.equal(filter('all').getAttribute('aria-pressed'), 'true');
  assert.equal(matrix.rows.length, 6);
  for (const suffix of ['', '-mobile']) assert.equal(byId('search-member-rekap' + suffix).value, '');
});

test('matrix and cards share payment attributes and dispatch one settlement after rendering', t => {
  const { matrix, cards } = installRekap(t);
  const buttons = (surface, action) => surface.querySelectorAll(`[data-action="${action}"]`);
  for (const surface of [matrix, cards]) {
    const pay = surface.querySelector('[data-id="A1"][data-month="4"]');
    assert.equal(pay.dataset.action, 'open-self-pay');
    assert.equal(pay.dataset.year, '2025');
    assert.equal(pay.hasAttribute('data-bulk-month'), false);
    assert.match(pay.getAttribute('aria-label'), /Zara, Mei 2025: Sebagian/);
    assert.equal(surface.querySelector('[data-id="A1"][data-month="0"]').dataset.action, 'open-month-receipt');
  }
  setAdminSession('rekap-session');
  setAdminViewMode('admin');
  let settled = 0;
  document.addEventListener('finkas:dues-settled', () => {
    settled++;
    assert.ok(matrix.querySelector('[data-id="A1"][data-month="0"] .is-newly-paid'));
  });
  rekap.markNewlyPaidCells(['A1'], 'Januari', '2025');
  rekap.renderTableRekap();
  for (const [surface, action] of [[matrix, 'quickpay'], [cards, 'quickpay-card']]) {
    const pay = surface.querySelector('[data-anggota="A1"][data-bulk-month="4"]');
    assert.deepEqual({ ...pay.dataset }, {
      ...(surface === cards ? { status: 'Sebagian' } : {}), action, anggota: 'A1', bulan: 'Mei',
      bulkMonth: '4', bulkYear: '2025', bulkRemaining: '6000'
    });
    assert.equal(buttons(surface, 'open-self-pay').length, 0);
    assert.equal(buttons(surface, 'toggle-member-pin').length, 0);
  }
  rekap.renderTableRekap();
  assert.equal(settled, 1);
  assert.equal(matrix.querySelector('.is-newly-paid'), null);
  rekap.renderIuranMobileCards([state.anggota[0]], ledger, 'shield', 'A1', false);
  assert.equal(cards.children.length, 1);
  assert.ok(cards.querySelector('.is-pinned .self-pin-badge'));
  assert.ok(cards.querySelector('[data-action="open-self-pay"]'));
  assert.ok(matrix.querySelector('[data-action="quickpay"]'));
});

test('matrix arrow keys skip exempt cells and hover highlights a mouse column', t => {
  const { matrix } = installRekap(t);
  const cell = (row, month) => matrix.rows[row].querySelector(`[data-col-month="${month}"] button`);
  const table = matrix.closest('table');
  const move = (from, key, to) => {
    from.focus();
    from.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    assert.equal(document.activeElement, to);
  };
  move(cell(0, 0), 'ArrowRight', cell(0, 2));
  move(cell(0, 2), 'ArrowDown', cell(1, 2));
  move(cell(1, 2), 'ArrowLeft', cell(1, 0));
  move(cell(1, 0), 'ArrowUp', cell(0, 0));
  const over = pointerType => cell(0, 2).dispatchEvent(Object.assign(new Event('pointerover', { bubbles: true }), { pointerType }));
  over('touch');
  assert.equal(table.querySelector('.is-col-hover'), null);
  over('mouse');
  assert.equal(table.querySelectorAll('.is-col-hover').length, matrix.rows.length + 1);
  table.dispatchEvent(new Event('pointerleave'));
  assert.equal(table.querySelector('.is-col-hover'), null);
});

test('mobile accordion preserves expansion on refresh and allows multiple cards during bulk selection', t => {
  const { byId, cards } = installRekap(t);
  const [first, second] = cards.children;
  const check = (card, open) => {
    const details = card.querySelector('.iuran-card-details');
    const button = card.querySelector('[data-action="toggle-card"]');
    assert.equal(card.classList.contains('expanded'), open);
    assert.equal(details.hasAttribute('inert'), !open);
    assert.equal(button.getAttribute('aria-expanded'), String(open));
    assert.equal(button.getAttribute('aria-controls'), details.id);
  };
  check(first, false);
  rekap.toggleIuranCard(first);
  check(first, true);
  rekap.toggleIuranCard(second);
  check(first, false);
  check(second, true);
  rekap.renderTableRekap();
  check(second, true);
  byId('workspace-iuran').classList.add('bulk-selecting');
  rekap.toggleIuranCard(first);
  check(first, true);
  check(second, true);
  rekap.toggleIuranCard(second);
  check(second, false);
  check(first, true);
});

test('dues pagination moves both views together and searching resets the page', t => {
  const { byId, matrix, cards } = installRekap(t);
  const anggota = Array.from({ length: 13 }, (_, i) => {
    const name = 'Member ' + String(i + 1).padStart(2, '0');
    return { ID_Anggota: String(i), Nama_Anggota: name, Status_Aktif: 'Aktif' };
  });
  setState({ ...state, anggota, transaksi: [] });
  rekap.renderTableRekap();
  rekap.initDuesPagination();
  assert.equal(matrix.rows.length, 10);
  const pager = byId('dues-pagination');
  pager.querySelector('[data-page-step="1"]').click();
  assert.equal(matrix.rows.length, 3);
  assert.equal(cards.children.length, 3);
  assert.equal(matrix.querySelector('.dues-member-name').textContent, 'Member 11');
  byId('search-member-rekap').value = 'Member 01';
  rekap.renderTableRekap();
  assert.equal(cards.querySelector('.iuran-card-name').textContent, 'Member 01');
  assert.equal(pager.hidden, true);
});

test('group admin renders empty states and preserves literal names and action IDs', t => {
  const list = installDom(t, 'index.html')('group-admin-list');
  for (const [emptyReason, message] of [
    ['none', 'Belum ada grup terdaftar. Buat grup pertama di atas.'],
    ['search', 'Tidak ada grup yang cocok dengan pencarian.']
  ]) {
    bundle.syncGroupAdminList({ emptyReason, rows: [] });
    assert.equal(list.querySelector('.group-empty-state p').textContent, message);
  }
  const id = 'grp-"A"', nama = '<img src=x> & Kas';
  bundle.syncGroupAdminList({ emptyReason: '', rows: [{ id, nama, initial: '<', isActive: true, colorIndex: 2 }] });
  const card = list.querySelector('.group-card-item.is-active');
  assert.equal(card.dataset.id, id);
  assert.equal(card.querySelector('.group-card-title').textContent, nama);
  assert.equal(card.querySelector('img'), null);
  assert.equal(card.querySelector('.group-card-avatar').dataset.index, '2');
  assert.equal(card.querySelector('.group-badge-active').textContent, 'Aktif');
  const buttons = [...card.querySelectorAll('.btn-group-chip')];
  assert.deepEqual(buttons.map(b => b.dataset.action), ['manage-group-creds', 'rename-group', 'reset-group-pin', 'remove-group']);
  assert.ok(buttons.every(b => b.dataset.id === id));
  assert.equal(buttons.at(-1).getAttribute('aria-label'), 'Hapus ' + nama);
});

test('superadmin loading and error states give way to owner and removable rows', t => {
  const list = installDom(t, 'index.html')('superadmin-emails-list');
  for (const [status, message] of [
    ['loading', 'Memuat daftar superadmin...'], ['error', 'Tidak dapat memuat daftar superadmin.']
  ]) {
    bundle.syncSuperAdminList({ status, items: [] });
    assert.equal(list.querySelector('.superadmin-empty-text').textContent, message);
  }
  const items = [{ email: 'owner@example.com', isPrimary: true }, { email: 'admin@example.com', isPrimary: false }];
  bundle.syncSuperAdminList({ status: 'ready', items });
  const [owner, admin] = list.querySelectorAll('.superadmin-email-item');
  assert.ok(owner.querySelector('.ph-crown'));
  assert.equal(owner.querySelector('strong').textContent, items[0].email);
  assert.equal(owner.querySelector('.superadmin-email-tag').textContent, 'Pemilik Utama');
  assert.equal(owner.querySelector('button'), null);
  assert.ok(admin.querySelector('.ph-shield-check'));
  assert.equal(admin.querySelector('[data-action="remove-superadmin-email"]').dataset.email, items[1].email);
});

test('offline queue shows active items and count-only notices and clears on group switch', t => {
  const list = installDom(t, 'index.html')('offline-queue-list');
  const empty = { groupId: 'GRP-A', items: [], otherGroupCount: 0, unscopedCount: 0 };
  bundle.syncOfflineQueueList({ ...empty, status: 'error' });
  assert.equal(list.querySelector('.queue-error strong').textContent, 'Gagal memuat antrean');
  bundle.syncOfflineQueueList({ ...empty, status: 'ready' });
  assert.equal(list.querySelector('.queue-empty strong').textContent, 'Semua tersinkron');
  const item = { id: 42, label: 'Edit Transaksi', tone: 'warning', icon: 'ph-pencil-simple',
    nominal: 1234, formattedTime: '13:10', summary: '<b>Kas</b>' };
  bundle.syncOfflineQueueList({ ...empty, status: 'ready', items: [item], otherGroupCount: 2, unscopedCount: 3 });
  const card = list.querySelector('.pending-item');
  assert.ok(card.querySelector('.queue-action-pill.is-warning .ph-pencil-simple'));
  assert.equal(card.querySelector('.pending-card-amount').textContent, formatRp(1234));
  assert.equal(card.querySelector('.pending-card-time').textContent, '13:10 · GRP-A');
  assert.equal(card.querySelector('.pending-card-payload').textContent, item.summary);
  assert.equal(card.querySelector('[data-action="delete-offline-item"]').dataset.itemId, '42');
  assert.deepEqual([...list.querySelectorAll('.queue-empty p')].map(p => p.textContent), [
    '2 antrean milik grup lain menunggu — pindah ke grup tersebut untuk mengirim.',
    '3 antrean lama tanpa ID grup dilewati demi isolasi data.'
  ]);
  window.dispatchEvent(new CustomEvent('finkas:group-changed'));
  assert.equal(list.textContent.trim(), '');
});

function installModal(t, id) {
  const byId = installDom(t, 'index.html');
  byId(id).showModal = () => {};
  setActiveGroupId('modal-test');
  setAdminSession('');
  setCurrentRekapYear(String(current.year));
  setState({ ...state, kategori: [] });
  return byId;
}

test('opening a profile renders keyed stamps, delegated actions and deposit history', t => {
  const byId = installModal(t, 'modal-profil-anggota');
  bukaProfilAnggota('A1');
  const months = byId('passbook-months').children;
  const history = byId('p-list-transaksi');
  assert.equal(months.length, 12);
  assert.deepEqual({ ...months[0].dataset }, { action: 'open-month-receipt', id: 'A1', month: '0', year: '2025' });
  assert.ok(months[1].disabled && !months[1].hasAttribute('data-action'));
  assert.deepEqual({ ...months[4].dataset }, { action: 'open-self-pay', id: 'A1', month: '4', year: '2025' });
  const paid = months[0];
  assert.ok(paid.querySelector('circle.seal-halo'));
  bundle.refreshProfileStampStyle('shield');
  assert.equal(months[0], paid);
  assert.ok(paid.querySelector('path.seal-halo'));
  assert.equal(history.children.length, 2);
  const deposit = history.querySelector('[data-action="open-receipt"][data-id="A10"]');
  assert.equal(deposit.querySelector('.ledger-title').textContent, 'Iuran Januari 2025');
  assert.equal(deposit.querySelector('.ledger-amt').textContent, '+' + formatRp(10000));
  setAdminSession('admin-token');
  setAdminViewMode('admin');
  bukaProfilAnggota('A3');
  assert.deepEqual({ ...months[4].dataset }, { action: 'quickpay-card', anggota: 'A3', bulan: 'Mei', year: '2025' });
  assert.equal(history.querySelector('.profile-history-empty').textContent, 'Belum ada riwayat setoran.');
  window.dispatchEvent(new Event('finkas:group-changed'));
  assert.equal(months.length, 0);
});

test('opening verified, pending and outflow receipts updates the same body', t => {
  const byId = installModal(t, 'modal-struk');
  const body = byId('receipt-body');
  const base = { ...payment('A1', 0, 10000), Keterangan: '<b>Cash</b>' };
  setState({ transaksi: [base, { ...base, ID_Transaksi: 'A-TEMP-1' },
    { ...base, ID_Transaksi: 'out', Tipe_Arus: 'Keluar' }] });
  for (const [id, pending, incoming, footer] of [
    ['A10', false, true, 'TERVERIFIKASI · KAS SAH'],
    ['A-TEMP-1', true, true, 'MENUNGGU SINKRON'],
    ['out', false, false, 'TERCATAT · ARSIP KAS']
  ]) {
    openReceipt(id);
    assert.equal(body.querySelector('.meta-chip').textContent.trim(), pending ? 'Menunggu sinkron' : 'Tercatat Sah');
    assert.equal(body.querySelector('.meta-chip').classList.contains('paid'), !pending);
    assert.ok(body.querySelector(pending ? '.ph-clock' : '.ph-check-circle'));
    const amount = body.querySelector('.receipt-amount');
    assert.equal(amount.dataset.flow, incoming ? 'in' : 'out');
    assert.equal(amount.textContent, (incoming ? '+' : '−') + formatRp(10000));
    assert.equal(body.querySelector('dd').textContent, '<b>Cash</b>');
    assert.equal(body.querySelector('dd b'), null);
    assert.equal(body.querySelector('.receipt-seal').dataset.tone, incoming && !pending ? 'verified' : 'neutral');
    assert.equal(Boolean(body.querySelector('.seal-svg')), !pending);
    assert.equal(body.querySelector('strong').textContent, footer);
    assert.equal(body.querySelector('.receipt-seal-year').textContent, '2025');
  }
  localStorage.setItem('finkas_indicator_style', 'shield');
  openReceipt('A10');
  assert.ok(body.querySelector('path.seal-halo'));
  window.dispatchEvent(new Event('finkas:group-changed'));
  assert.equal(body.querySelectorAll('dd').length, 0);
  assert.equal(body.querySelector('.receipt-seal-year').textContent, '');
});

test('self-pay preserves the selected tile and updates the transfer preview through delegated clicks', t => {
  const byId = installModal(t, 'modal-bayar-anggota');
  const year = billingPeriod().year + 2;
  initSelfPay();
  openSelfPay('A1', 0, year);
  const grid = byId('self-pay-months');
  assert.ok(grid.querySelectorAll('.self-pay-year').length >= 2);
  const tile = () => grid.querySelector(`[data-payment-period="${year}:0"]`);
  const jan = tile();
  assert.equal(jan.closest('.self-pay-month-grid').previousElementSibling.textContent, String(year));
  assert.equal(jan.getAttribute('aria-pressed'), 'true');
  assert.equal(jan.querySelector('small').textContent, 'PILIH');
  jan.querySelector('span').click();
  assert.equal(tile(), jan);
  assert.equal(jan.getAttribute('aria-pressed'), 'false');
  assert.equal(jan.querySelector('small').textContent, jan.dataset.status.toUpperCase());
  assert.equal(byId('self-pay-whatsapp').hasAttribute('href'), false);
  jan.click();
  assert.equal(jan.querySelector('small').textContent, 'PILIH');
  assert.ok(byId('self-pay-preview').value.includes('Januari ' + year));
  assert.equal(byId('self-pay-whatsapp').getAttribute('aria-disabled'), 'false');
  window.dispatchEvent(new Event('finkas:group-changed'));
  assert.equal(grid.children.length, 0);
});
