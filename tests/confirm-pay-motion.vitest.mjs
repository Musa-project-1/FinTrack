import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  withLiquidSave,
  openQuickPaySheet,
  submitQuickPay,
  executeConfirmAction,
  formatRp,
  setState,
  setActiveGroupId,
  setAdminSession,
  setCurrentRekapYear
} from '../src/svelte/mount.ts';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, ("file://" + process.cwd() + "/tests/")), 'utf8');

function makeElement(id = '') {
  const classes = new Set();
  const attrs = new Map();
  const props = new Map();
  const children = [];
  const listeners = new Map();
  const label = { innerHTML: 'Simpan Pembayaran', textContent: 'Simpan Pembayaran' };
  const log = [];
  return {
    id,
    open: false,
    value: '',
    innerText: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    offsetWidth: 168,
    dataset: {},
    label,
    log,
    style: {
      setProperty: (k, v) => props.set(k, v),
      getPropertyValue: (k) => props.get(k) || '',
      removeProperty: (k) => props.delete(k)
    },
    classList: {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      contains: (n) => classes.has(n),
      toggle: (n, force) => {
        if (force === undefined) {
          if (classes.has(n)) classes.delete(n);
          else classes.add(n);
        } else if (force) classes.add(n);
        else classes.delete(n);
      }
    },
    children,
    replaceChildren: (...items) => children.splice(0, children.length, ...items),
    appendChild: (c) => children.push(c),
    append: (...items) => children.push(...items),
    remove: () => {},
    showModal() { this.open = true; },
    close() { this.open = false; this.dispatchEvent({ type: 'close' }); },
    querySelector: (sel) => (sel === '.keel-label' ? label : null),
    querySelectorAll: () => [],
    closest: () => null,
    getAttribute: (k) => attrs.get(k) ?? null,
    setAttribute: (k, v) => {
      attrs.set(k, String(v));
      log.push({ op: 'set', k, v: String(v) });
    },
    removeAttribute: (k) => {
      attrs.delete(k);
      log.push({ op: 'remove', k });
    },
    hasAttribute: (k) => attrs.has(k),
    addEventListener: (event, fn) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    removeEventListener: (event, fn) => {
      const list = listeners.get(event) || [];
      listeners.set(event, list.filter((f) => f !== fn));
    },
    dispatchEvent: (event) => {
      (listeners.get(event.type) || []).forEach((fn) => fn(event));
      return true;
    }
  };
}

let elements;
let savedDoc;
let savedWin;
let savedStorage;
let savedFetch;
let savedNavDesc;
let savedRaf;
let vibrateCalls;
let reducedMotion;

beforeEach(() => {
  elements = new Map();
  vibrateCalls = [];
  reducedMotion = true;

  savedDoc = globalThis.document;
  savedWin = globalThis.window;
  savedStorage = globalThis.localStorage;
  savedFetch = globalThis.fetch;
  savedRaf = globalThis.requestAnimationFrame;
  savedNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  const storageMap = new Map();
  globalThis.localStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear()
  };

  const getOrCreate = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };

  const body = makeElement('body');
  globalThis.document = {
    body,
    getElementById: (id) => getOrCreate(id),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => makeElement(tag),
    createDocumentFragment: () => makeElement('fragment'),
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: {
      onLine: true,
      vibrate: (ms) => { vibrateCalls.push(ms); return true; }
    }
  });

  globalThis.window = {
    innerWidth: 1024,
    navigator: globalThis.navigator,
    matchMedia: () => ({ matches: reducedMotion }),
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
});

afterEach(() => {
  globalThis.document = savedDoc;
  globalThis.window = savedWin;
  globalThis.localStorage = savedStorage;
  globalThis.fetch = savedFetch;
  if (savedRaf === undefined) delete globalThis.requestAnimationFrame;
  else globalThis.requestAnimationFrame = savedRaf;
  if (savedNavDesc) Object.defineProperty(globalThis, 'navigator', savedNavDesc);
  else delete globalThis.navigator;
});

test('withLiquidSave invokes onSaving, onSettled, and onCleanup on both success and error paths', async () => {
  reducedMotion = false;
  const btn = document.getElementById('btn-liquid-test');
  const events = [];

  await withLiquidSave('btn-liquid-test', async () => ({
    outcome: 'success',
    onSettled: () => {
      events.push({
        phase: 'settled',
        p: btn.style.getPropertyValue('--p'),
        lockW: btn.style.getPropertyValue('--btn-lock-w'),
        isDone: btn.classList.contains('is-done'),
        isSaving: btn.classList.contains('is-saving'),
        label: btn.label.textContent
      });
    },
    done: () => {
      events.push({
        phase: 'done',
        isDone: btn.classList.contains('is-done'),
        lockW: btn.style.getPropertyValue('--btn-lock-w'),
        label: btn.label.textContent
      });
    }
  }), {
    onSaving: () => events.push({
      phase: 'saving',
      isSaving: btn.classList.contains('is-saving'),
      lockW: btn.style.getPropertyValue('--btn-lock-w'),
      label: btn.label.textContent
    }),
    onCleanup: () => events.push({ phase: 'cleanup' })
  });

  assert.equal(events.length, 4);
  assert.deepEqual(events[0], {
    phase: 'saving',
    isSaving: true,
    lockW: '168px',
    label: 'Menyimpan…'
  });
  assert.deepEqual(events[1], {
    phase: 'settled',
    p: '1',
    lockW: '168px',
    isDone: true,
    isSaving: false,
    label: 'Tersimpan'
  });
  assert.deepEqual(events[2], {
    phase: 'done',
    isDone: true,
    lockW: '168px',
    label: 'Tersimpan'
  });
  assert.deepEqual(events[3], { phase: 'cleanup' });
  assert.deepEqual(vibrateCalls, [18]);
  assert.equal(btn.style.getPropertyValue('--p'), '0');
  assert.equal(btn.style.getPropertyValue('--btn-lock-w'), '');
  assert.equal(btn.classList.contains('is-done'), false);

  reducedMotion = true;
  const errEvents = [];
  await withLiquidSave('btn-liquid-test', async () => ({
    outcome: 'error',
    done: () => errEvents.push('done')
  }), {
    onSaving: () => errEvents.push('saving'),
    onCleanup: () => errEvents.push('cleanup')
  });
  assert.deepEqual(errEvents, ['saving', 'cleanup', 'done', 'cleanup']);
});

test('submitQuickPay confirmation sequences payment badge, in-sheet LUNAS morph, and cleanup', async () => {
  setActiveGroupId('GRP-PAY');
  setAdminSession('admin-tok');
  setCurrentRekapYear('2026');
  setState({
    anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Siti Aminah', Status_Aktif: 'Aktif' }],
    kategori: [{ ID_Kategori: 'KAT-1', Nama_Kategori: 'Iuran Wajib', Tipe: 'Masuk' }],
    transaksi: [],
    kasStart: '01-2026',
    skippedMonths: []
  });

  openQuickPaySheet('ANG-1', 'Januari', '2026');
  const confirmBadge = document.getElementById('confirm-badge-icon');
  const qpModal = document.getElementById('modal-quickpay');
  const qpStatus = document.getElementById('qp-status-badge');
  const qpImpactStatus = document.getElementById('qp-impact-status');
  const qpVerifiedTitle = document.getElementById('qp-verified-title');
  const qpVerifiedAmount = document.getElementById('qp-verified-amount');
  const qpVerifiedSub = document.getElementById('qp-verified-sub');

  // Simulate pre-existing partial class before full settlement
  qpStatus.classList.add('is-partial');

  let settledSnapshot;
  const origCloseModal = qpModal.close.bind(qpModal);
  qpModal.close = () => {
    settledSnapshot = {
      payState: qpModal.getAttribute('data-pay-state'),
      badgeText: qpStatus.textContent,
      hasSettledClass: qpStatus.classList.contains('is-settled'),
      hasPartialClass: qpStatus.classList.contains('is-partial'),
      impactText: qpImpactStatus.innerText || qpImpactStatus.textContent,
      verifiedTitle: qpVerifiedTitle.textContent,
      verifiedAmount: qpVerifiedAmount.textContent,
      verifiedSub: qpVerifiedSub.textContent
    };
    origCloseModal();
  };

  let savingSnapshot;
  globalThis.fetch = async () => {
    savingSnapshot = {
      payState: qpModal.getAttribute('data-pay-state'),
      verifiedTitle: qpVerifiedTitle.textContent,
      verifiedAmount: qpVerifiedAmount.textContent,
      verifiedSub: qpVerifiedSub.textContent
    };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        message: 'Tersimpan',
        data: {
          transaction: {
            ID_Transaksi: 'TRX-FULL-1',
            Timestamp: '2026-01-05T10:00:00Z',
            Tipe_Arus: 'Masuk',
            ID_Kategori: 'KAT-1',
            ID_Anggota: 'ANG-1',
            Bulan_Iuran: 'Januari',
            Tahun_Iuran: '2026',
            Nominal: 10000,
            Keterangan: 'Iuran Anggota'
          }
        }
      })
    };
  };

  await submitQuickPay({ preventDefault: () => {} });
  assert.ok(confirmBadge.className.includes('is-payment'));

  await executeConfirmAction();

  assert.deepEqual(savingSnapshot, {
    payState: 'saving',
    verifiedTitle: 'Mencatat Pembayaran…',
    verifiedAmount: `+ ${formatRp(10000)}`,
    verifiedSub: 'Siti Aminah · Januari 2026'
  });
  assert.deepEqual(settledSnapshot, {
    payState: 'settled',
    badgeText: 'LUNAS',
    hasSettledClass: true,
    hasPartialClass: false,
    impactText: 'Lunas Tercatat',
    verifiedTitle: 'Iuran Lunas Tercatat',
    verifiedAmount: `+ ${formatRp(10000)}`,
    verifiedSub: 'Siti Aminah · Januari 2026'
  });
  assert.equal(qpModal.getAttribute('data-pay-state'), null);
  assert.equal(qpStatus.classList.contains('is-settled'), false);
});

test('partial QuickPay shows CICILAN TERCATAT without marking badge as LUNAS', async () => {
  setActiveGroupId('GRP-PART');
  setAdminSession('admin-tok');
  setCurrentRekapYear('2026');
  setState({
    anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi Santoso', Status_Aktif: 'Aktif' }],
    kategori: [{ ID_Kategori: 'KAT-1', Nama_Kategori: 'Iuran Wajib', Tipe: 'Masuk' }],
    transaksi: [],
    kasStart: '01-2026',
    skippedMonths: []
  });

  openQuickPaySheet('ANG-1', 'Januari', '2026');
  document.getElementById('qp-nominal').value = '5.000';

  const qpModal = document.getElementById('modal-quickpay');
  const qpStatus = document.getElementById('qp-status-badge');
  const qpImpactStatus = document.getElementById('qp-impact-status');

  let settledSnapshot;
  const origCloseModal = qpModal.close.bind(qpModal);
  qpModal.close = () => {
    settledSnapshot = {
      payState: qpModal.getAttribute('data-pay-state'),
      badgeText: qpStatus.textContent,
      hasSettledClass: qpStatus.classList.contains('is-settled'),
      impactText: qpImpactStatus.innerText || qpImpactStatus.textContent
    };
    origCloseModal();
  };

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: true,
      data: {
        transaction: {
          ID_Transaksi: 'TRX-PART-1',
          Timestamp: '2026-01-05T10:00:00Z',
          Tipe_Arus: 'Masuk',
          ID_Kategori: 'KAT-1',
          ID_Anggota: 'ANG-1',
          Bulan_Iuran: 'Januari',
          Tahun_Iuran: '2026',
          Nominal: 5000,
          Keterangan: 'Cicilan'
        }
      }
    })
  });

  await submitQuickPay({ preventDefault: () => {} });
  await executeConfirmAction();

  assert.deepEqual(settledSnapshot, {
    payState: 'settled',
    badgeText: 'CICILAN TERCATAT',
    hasSettledClass: false,
    impactText: 'Cicilan Tercatat'
  });
});

test('confirm-pay choreography CSS & Svelte contracts enforce contrast, sequencing, zero green, and LOC limits', () => {
  const files = [
    'src/svelte/ui/keel.ts',
    'src/svelte/ui/modal.ts',
    'src/svelte/handlers/quickpay.ts',
    'src/svelte/handlers/transactions.ts',
    'src/svelte/shell/modals/QuickPayModal.svelte',
    'src/svelte/shell/modals/TransactionsModals.svelte',
    'src/styles/app/buttons.css',
    'src/styles/app/hybrid-motion.css',
    'src/svelte/forms/IuranReviewChips.svelte',
    'src/svelte/forms/StampStylePreview.svelte',
    'src/svelte/dashboard/DuesMatrix.svelte',
    'src/svelte/dashboard/DuesMobileCards.svelte'
  ];

  for (const file of files) {
    const src = read(file);
    assert.ok(src.split('\n').length - 1 < 750, `${file} must stay under 750 LOC`);
    assert.doesNotMatch(src, /transition\s*:\s*all\b/i, `${file} must not use transition: all`);
    assert.doesNotMatch(src, /#(10b981|008254|f3f7f5)\b/i, `${file} must obey Zero Green`);
  }

  const modalsHtml = read('src/svelte/shell/modals/TransactionsModals.svelte');
  assert.match(modalsHtml, /<dialog[^>]*class="[^"]*\bdues-dialog\b[^"]*"[^>]*id="modal-confirm-action"/);
  assert.match(modalsHtml, /<dialog[^>]*class="[^"]*\bdues-dialog\b[^"]*"[^>]*id="modal-transaksi"/);
  assert.match(modalsHtml, /id="trx-verified-stage"/);
  assert.match(read('src/svelte/shell/modals/QuickPayModal.svelte'), /id="qp-verified-stage"/);

  const buttonsCss = read('src/styles/app/buttons.css');
  assert.doesNotMatch(buttonsCss, /\.btn-liquid\.is-done\s+\.keel-label\s*\{[^}]*opacity:\s*0\b/);
  assert.doesNotMatch(buttonsCss, /border-radius:\s*44%/);
  assert.match(buttonsCss, /\.btn-liquid\s+\.keel-fill\s*\{\s*display:\s*none;\s*\}/);
  assert.match(buttonsCss, /min-width:\s*var\(--btn-lock-w/);
  assert.match(buttonsCss, /\.btn-liquid\s+\.keel-check\s*\{[^}]*order:\s*-1/);
  assert.match(buttonsCss, /\.pay-verified-stage\s*\{/);
  assert.match(buttonsCss, /\.pay-verified-medallion\s*\{/);

  const matrix = read('src/svelte/dashboard/DuesMatrix.svelte');
  assert.match(matrix, /class:is-newly-paid-cell=\{cell\.isNewlyPaid\}/);

  const mobileCards = read('src/svelte/dashboard/DuesMobileCards.svelte');
  assert.match(mobileCards, /class:is-settled=\{row\.settledAny\}/);
  assert.match(mobileCards, /class:is-newly-paid=\{cell\.isNewlyPaid\}/);

  const hybridMotion = read('src/styles/app/hybrid-motion.css');
  assert.match(hybridMotion, /\.dues-seal\.is-newly-paid\s+svg\s*\{[^}]*rubber-stamp\s+360ms[^}]*140ms/);
  assert.match(hybridMotion, /\.dues-seal\s+\.stamp-ring\s*\{[^}]*shockwave-ring\s+440ms[^}]*240ms/);

  const compiledCss = read('style.css');
  assert.match(compiledCss, /#confirm-badge-icon\.is-payment/);
  assert.match(compiledCss, /#modal-quickpay\[data-pay-state="?settled"?\]/);
  assert.match(compiledCss, /td\.is-newly-paid-cell/);
});
