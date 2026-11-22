import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { formatRp } from '../src/core/utils.js';
import {
  computeDashboardViewModel, updateDashboardStore, setSelectedSparkMonth,
  mountSvelteDashboard, syncSvelteDashboard
} from '../src/ui/svelte-dashboard.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
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

test('the shipped ESM shares core and motion dependencies and is available offline', () => {
  const file = 'src/ui/svelte-dashboard.js';
  const js = read(file);
  const imports = [...js.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map(match => match[1]);
  assert.deepEqual(new Set(imports), new Set(['../core/config.js', '../core/utils.js', '../core/dues.js', './hybrid-motion.js']));
  assert.ok(read('sw.js').match(/const LOCAL_ASSETS = \[([\s\S]*?)\];/)[1].includes("'" + file + "'"));
});

test('mounted cards preserve the template contract and synchronously follow store updates', async t => {
  const { window } = new JSDOM(read('html/index.template.html'));
  t.after(() => window.close());
  for (const name of ['window', 'document', 'Element', 'HTMLElement', 'Node', 'Text', 'Comment', 'Event']) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value: window[name], configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }
  window.matchMedia = () => ({ matches: true });
  const byId = id => document.getElementById(id);
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
