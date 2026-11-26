import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  openModal,
  closeModal,
  withBusyButton,
  withLiquidSave,
  flashCopyFeedback,
  setTrxWizardStep,
  setEditWizardStep,
  openEditWizard,
  showToast,
  applyPrivacyMode,
  flashMasterAnggotaSaved,
  flashMasterKategoriSaved,
  masterAnggotaStore,
  masterKategoriStore
} from '../src/ui/svelte-dashboard.js';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

function makeNode(tag = 'div', id = '') {
  const classes = new Set();
  const attrs = new Map();
  const props = new Map();
  const children = [];
  const listeners = new Map();
  const node = {
    tagName: String(tag).toUpperCase(),
    id,
    open: false,
    hidden: false,
    disabled: false,
    offsetWidth: 160,
    offsetHeight: 54,
    value: '',
    textContent: '',
    innerText: '',
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(val) {
      this._innerHTML = String(val);
      if (!val) children.length = 0;
    },
    dataset: {},
    parentNode: null,
    style: {
      setProperty: (k, v) => props.set(k, String(v)),
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
    appendChild(child) {
      child.parentNode = this;
      children.push(child);
      return child;
    },
    append(...items) {
      items.forEach((c) => this.appendChild(c));
    },
    replaceChildren(...items) {
      children.length = 0;
      items.forEach((c) => this.appendChild(c));
    },
    remove() {
      if (this.parentNode?.children) {
        const idx = this.parentNode.children.indexOf(this);
        if (idx !== -1) this.parentNode.children.splice(idx, 1);
      }
      this.parentNode = null;
    },
    hasAttribute: (k) => attrs.has(k),
    getAttribute: (k) => attrs.get(k) ?? null,
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    matches: () => false,
    closest: () => null,
    querySelector(sel) {
      if (sel === '.hold-label') return children.find((c) => c.classList?.contains('hold-label')) || null;
      if (sel === '.hold-fill') return children.find((c) => c.classList?.contains('hold-fill')) || null;
      if (sel === '.keel-label') return children.find((c) => c.classList?.contains('keel-label')) || null;
      return null;
    },
    querySelectorAll: () => [],
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((f) => f !== fn));
    },
    fire(type, event = {}) {
      (listeners.get(type) || []).forEach((fn) => fn({ target: this, stopPropagation() {}, ...event }));
    },
    showModal() { this.open = true; },
    close() {
      this.open = false;
      this.fire('close');
    },
    getAnimations: () => []
  };
  return node;
}

let elements;
let savedDoc;
let savedWin;
let savedCss;
let savedRaf;
let savedSetTimeout;
let savedClearTimeout;
let scheduledTimers;
let nextTimerId;

beforeEach(() => {
  elements = new Map();
  scheduledTimers = [];
  nextTimerId = 1;

  savedDoc = globalThis.document;
  savedWin = globalThis.window;
  savedCss = globalThis.CSS;
  savedRaf = globalThis.requestAnimationFrame;
  savedSetTimeout = globalThis.setTimeout;
  savedClearTimeout = globalThis.clearTimeout;

  globalThis.requestAnimationFrame = (cb) => { cb(); return 1; };
  globalThis.CSS = { supports: () => false };
  globalThis.setTimeout = (fn, ms = 0) => {
    const id = nextTimerId++;
    scheduledTimers.push({ id, fn, ms, active: true });
    return id;
  };
  globalThis.clearTimeout = (id) => {
    const t = scheduledTimers.find((item) => item.id === id);
    if (t) t.active = false;
  };

  const body = makeNode('body', 'body');
  globalThis.document = {
    body,
    getElementById: (id) => elements.get(id) ?? null,
    createElement: (tag) => makeNode(tag),
    querySelectorAll: () => [],
    dispatchEvent: () => true
  };
  globalThis.window = {
    innerWidth: 1024,
    matchMedia: () => ({ matches: false })
  };
});

afterEach(() => {
  globalThis.document = savedDoc;
  globalThis.window = savedWin;
  globalThis.CSS = savedCss;
  if (savedRaf === undefined) delete globalThis.requestAnimationFrame;
  else globalThis.requestAnimationFrame = savedRaf;
  globalThis.setTimeout = savedSetTimeout;
  globalThis.clearTimeout = savedClearTimeout;
});

test('closeModal runs data-dues-closing transition fallback for .hybrid-dialog and immediate handoff from modal-menu', async () => {
  const menu = makeNode('dialog', 'modal-menu');
  menu.classList.add('hybrid-dialog');
  menu.getAnimations = () => [{ transitionProperty: 'opacity', finished: Promise.resolve() }];

  const exp = makeNode('dialog', 'modal-export');
  exp.classList.add('hybrid-dialog');
  let resolveExit;
  exp.getAnimations = () => [{
    transitionProperty: 'opacity',
    finished: new Promise((r) => { resolveExit = r; })
  }];

  elements.set('modal-menu', menu);
  elements.set('modal-export', exp);

  openModal('modal-menu');
  assert.equal(menu.open, true);

  // Opening another modal closes modal-menu immediately (no double-backdrop overlap)
  openModal('modal-export');
  assert.equal(menu.open, false);
  assert.equal(menu.hasAttribute('data-dues-closing'), false);
  assert.equal(exp.open, true);

  // Closing a regular .hybrid-dialog waits for its exit transition via data-dues-closing
  closeModal('modal-export');
  assert.equal(exp.hasAttribute('data-dues-closing'), true);
  assert.equal(exp.open, true);

  resolveExit();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(exp.open, false);
  assert.equal(exp.hasAttribute('data-dues-closing'), false);
});

test('withBusyButton locks width and preserves .hold-fill/.hold-label; withLiquidSave accepts Element + custom copy', async () => {
  const delBtn = makeNode('button', 'btn-hapus');
  delBtn.classList.add('btn-danger-solid');
  const holdFill = makeNode('span');
  holdFill.classList.add('hold-fill');
  const holdLabel = makeNode('span');
  holdLabel.classList.add('hold-label');
  holdLabel.textContent = 'Ya, Hapus';
  delBtn.append(holdFill, holdLabel);
  elements.set('btn-hapus', delBtn);

  let busySnapshot;
  await withBusyButton('btn-hapus', 'Menghapus…', 'Ya, Hapus', async () => {
    busySnapshot = {
      lockW: delBtn.style.getPropertyValue('--btn-lock-w'),
      ariaBusy: delBtn.getAttribute('aria-busy'),
      labelText: holdLabel.textContent,
      labelHtml: holdLabel.innerHTML,
      stillHasHoldFill: Boolean(delBtn.querySelector('.hold-fill'))
    };
  });

  assert.deepEqual(busySnapshot, {
    lockW: '160px',
    ariaBusy: 'true',
    labelText: 'Menghapus…',
    labelHtml: '',
    stillHasHoldFill: true
  });
  assert.equal(holdLabel.textContent, 'Ya, Hapus');
  assert.equal(holdLabel.innerHTML, '');
  assert.equal(delBtn.style.getPropertyValue('--btn-lock-w'), '');
  assert.equal(delBtn.getAttribute('aria-busy'), null);

  const directBtn = makeNode('button', 'direct-master-btn');
  const directLabel = makeNode('span');
  directLabel.classList.add('keel-label');
  directLabel.innerHTML = 'Tambah';
  directBtn.appendChild(directLabel);

  const phases = [];
  const pending = withLiquidSave(
    directBtn,
    async () => ({
      outcome: 'success',
      onSettled: () => phases.push({ done: directBtn.classList.contains('is-done'), text: directLabel.textContent })
    }),
    { savingText: 'Menambah…', doneText: 'Ditambahkan', settleMs: 320 }
  );
  phases.push({ saving: directBtn.classList.contains('is-saving'), text: directLabel.textContent });
  // Flush the fake min-saving / settle timers
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
    scheduledTimers.filter((t) => t.active).forEach((t) => {
      t.active = false;
      t.fn();
    });
  }
  await pending;

  assert.deepEqual(phases, [
    { saving: true, text: 'Menambah…' },
    { done: true, text: 'Ditambahkan' }
  ]);
  assert.equal(directLabel.innerHTML, 'Tambah');
});

test('setTrxWizardStep tags data-step-dir forward, backward, and none when focus is false', () => {
  const modal = makeNode('dialog', 'modal-transaksi');
  elements.set('modal-transaksi', modal);

  setTrxWizardStep(1, { focus: false });
  assert.equal(modal.dataset.stepDir, 'none');

  setTrxWizardStep(2);
  assert.equal(modal.dataset.stepDir, 'forward');

  setTrxWizardStep(3);
  assert.equal(modal.dataset.stepDir, 'forward');

  setTrxWizardStep(2);
  assert.equal(modal.dataset.stepDir, 'backward');

  setTrxWizardStep(1, { focus: false });
  assert.equal(modal.dataset.stepDir, 'none');
});

test('showToast pauses remaining time on mouseenter and adds .is-leaving smooth collapse before removal', () => {
  const container = makeNode('div', 'toast-container');
  elements.set('toast-container', container);

  showToast('Perubahan tersimpan', 'success', { duration: 3000 });
  assert.equal(container.children.length, 1);
  const toast = container.children[0];
  assert.equal(toast.classList.contains('show'), true);

  // Initial dismiss timer scheduled for 3000ms
  const firstTimer = scheduledTimers.find((t) => t.active && t.ms === 3000);
  assert.ok(firstTimer, 'expected initial 3000ms auto-dismiss timer');

  // Hover pauses timer; mouseleave resumes remaining time
  toast.fire('mouseenter');
  assert.equal(firstTimer.active, false);
  toast.fire('mouseleave');
  const resumedTimer = scheduledTimers.find((t) => t.active);
  assert.ok(resumedTimer, 'expected resumed timer after mouseleave');
  assert.ok(resumedTimer.ms <= 3000);

  // Firing resumed timer starts smooth collapse (.is-leaving) with locked maxHeight, then removes
  resumedTimer.active = false;
  resumedTimer.fn();
  assert.equal(toast.classList.contains('show'), false);
  assert.equal(toast.classList.contains('is-leaving'), true);
  assert.equal(toast.style.maxHeight, '54px');
  assert.equal(container.children.length, 1);

  const cleanupTimer = scheduledTimers.find((t) => t.active && t.ms === 240);
  assert.ok(cleanupTimer, 'expected 240ms post-collapse removal timer');
  cleanupTimer.active = false;
  cleanupTimer.fn();
  assert.equal(container.children.length, 0);
});

test('all 6 legacy motion upgrades obey Zero Green, no transition:all, no scale(0), and < 750 LOC contracts', () => {
  const editedFiles = [
    'src/svelte/ui/modal.ts',
    'src/svelte/ui/keel.ts',
    'src/svelte/ui/transaction-form.ts',
    'src/svelte/ui/edit-wizard.ts',
    'src/svelte/ui/gestures.ts',
    'src/svelte/action-router.ts',
    'src/svelte/handlers/transactions.ts',
    'src/svelte/handlers/master.ts',
    'src/svelte/handlers/payment-account.ts',
    'src/svelte/handlers/groups.ts',
    'src/svelte/core/utils.ts',
    'src/svelte/stores/history.svelte.ts',
    'src/svelte/stores/workspace-sync.ts',
    'src/svelte/dashboard/HistoryLedger.svelte',
    'src/svelte/shell/modals/TransactionsModals.svelte',
    'src/svelte/shell/modals/StrukModal.svelte',
    'src/svelte/shell/modals/MasterModals.svelte',
    'src/svelte/forms/StampStylePreview.svelte',
    'src/svelte/forms/IuranReviewChips.svelte',
    'src/styles/app/buttons.css',
    'src/styles/app/toasts.css',
    'src/styles/app/layout.css',
    'src/styles/app/mpick.css',
    'src/styles/app/dpick.css',
    'src/svelte/shell/modals/AuthModals.svelte',
    'src/svelte/shell/modals/GroupPinModal.svelte',
    'src/svelte/modals/ReceiptBody.svelte',
    'src/svelte/modals/SelfPayMonths.svelte',
    'src/svelte/handlers/auth.ts',
    'src/svelte/handlers/self-pay.ts',
    'src/svelte/handlers/export.ts',
    'src/svelte/handlers/receipt.ts',
    'src/svelte/handlers/profile.ts',
    'src/styles/app/forms.css',
    'src/styles/app/modals-base.css',
    'src/styles/app/modals-sheet.css'
  ];

  for (const file of editedFiles) {
    const src = read(file);
    assert.ok(src.split('\n').length - 1 < 750, `${file} exceeds 750 LOC`);
    assert.doesNotMatch(src, /transition\s*:\s*all\b/i, `${file} must not use transition: all`);
    assert.doesNotMatch(src, /#(10b981|008254|f3f7f5)\b/i, `${file} violates Zero Green`);
  }

  const stampCss = read('src/svelte/forms/StampStylePreview.svelte');
  assert.match(stampCss, /dialog:is\(\.hybrid-dialog,\s*\.dues-dialog\)\.modal-overlay/);
  assert.match(stampCss, /:is\(#modal-confirm-action,\s*dialog\.hybrid-alert-dialog\)\.modal-overlay/);
  assert.doesNotMatch(stampCss, /@keyframes\s+(hybrid-dialog-in|hybrid-sheet-in)\b/);

  const wizardCss = read('src/svelte/forms/IuranReviewChips.svelte');
  assert.match(wizardCss, /\[data-step-dir="forward"\]/);
  assert.match(wizardCss, /\[data-step-dir="backward"\]/);
  assert.doesNotMatch(wizardCss, /@keyframes\s+trxStepIn\b/);
  assert.doesNotMatch(wizardCss, /scale\(0\)/);

  const toastsCss = read('src/styles/app/toasts.css');
  assert.match(toastsCss, /\.toast\.is-leaving/);

  const dpickCss = read('src/styles/app/dpick.css');
  assert.doesNotMatch(dpickCss, /@keyframes\s+dpick-in\b/);
  assert.match(dpickCss, /@starting-style/);

  const mpickCss = read('src/styles/app/mpick.css');
  assert.doesNotMatch(mpickCss, /dropdownFadeIn/);
  assert.match(mpickCss, /allow-discrete/);

  const layoutCss = read('src/styles/app/layout.css');
  assert.doesNotMatch(layoutCss, /@keyframes\s+dropdownFadeIn\b/);

  const modalsBaseCss = read('src/styles/app/modals-base.css');
  assert.match(modalsBaseCss, /details\.faq-item::details-content/);
  assert.match(modalsBaseCss, /interpolate-size:\s*allow-keywords/);

  const historyLedger = read('src/svelte/dashboard/HistoryLedger.svelte');
  assert.match(historyLedger, /is-just-updated/);
  assert.match(historyLedger, /\.ledger-row\.is-deleting/);
});

test('delete confirmation button accepts single clicks and uses coral danger polarity flip', () => {
  const gesturesSrc = read('src/svelte/ui/gestures.ts');
  assert.doesNotMatch(gesturesSrc, /closest\S*\([^)]*btn-danger-solid/);
  assert.match(gesturesSrc, /\[data-hold-confirm\]/);

  const modalsSrc = read('src/svelte/shell/modals/TransactionsModals.svelte');
  assert.match(modalsSrc, /class="[^"]*\bbtn-danger-solid\s+btn-liquid\b[^"]*"[^>]*id="btn-hapus"/);

  const buttonsSrc = read('src/styles/app/buttons.css');
  assert.match(buttonsSrc, /\.btn-danger-solid\.btn-liquid\.is-saving/);
  assert.match(buttonsSrc, /\.btn-danger-solid\.btn-liquid\.is-done/);
  assert.match(buttonsSrc, /:is\(#modal-quickpay,\s*#modal-transaksi,\s*#modal-hapus,\s*#modal-edit-transaksi,\s*#modal-login\)\[data-pay-state\]\s+\.pay-verified-stage/);
  assert.match(buttonsSrc, /\[data-pay-tone="danger"\]\s+\.pay-verified-amount/);

  assert.match(modalsSrc, /id="hapus-verified-stage"/);
  assert.match(read('src/styles/app/modals-base.css'), /\.modal-center-dialog\s*\{[^}]*position:\s*relative;/s);
  assert.match(read('src/svelte/dashboard/HistoryLedger.svelte'), /\.ledger-row\.is-deleting\s*\{[^}]*max-height:\s*0\s*!important;/s);

  const routerSrc = read('src/svelte/action-router.ts');
  assert.match(routerSrc, /closeModal\('modal-edit-transaksi',\s*true\)/);

  const trxSrc = read('src/svelte/handlers/transactions.ts');
  assert.match(trxSrc, /withLiquidSave\(\s*"btn-hapus"/);
  assert.match(trxSrc, /minSavingMs:\s*380/);
  assert.match(trxSrc, /settleMs:\s*650/);
});

test('flashCopyFeedback locks width, morphs icon and text, highlights surface, and restores on timer / double click', () => {
  const icon = { className: 'ph ph-copy' };
  const span = { textContent: 'Salin Struk' };
  const classes = new Set();
  const surfaceClasses = new Set();
  const styles = new Map();
  const btn = {
    offsetWidth: 142,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c)
    },
    style: {
      setProperty: (k, v) => styles.set(k, String(v)),
      getPropertyValue: (k) => styles.get(k) || '',
      removeProperty: (k) => styles.delete(k)
    },
    childNodes: [],
    querySelector: (sel) => (sel.includes('span') ? span : icon)
  };
  const surface = {
    classList: {
      add: (c) => surfaceClasses.add(c),
      remove: (c) => surfaceClasses.delete(c),
      contains: (c) => surfaceClasses.has(c)
    }
  };

  flashCopyFeedback(btn, surface);
  assert.equal(styles.get('--btn-lock-w'), '142px');
  assert.equal(icon.className, 'ph-bold ph-check');
  assert.equal(span.textContent, 'Tersalin');
  assert.equal(classes.has('is-copied'), true);
  assert.equal(surfaceClasses.has('is-copied-surface'), true);

  // Rapid second click preserves original baseline rather than capturing 'Tersalin'
  flashCopyFeedback(btn, surface);
  assert.equal(span.textContent, 'Tersalin');
  const activeTimers = scheduledTimers.filter((t) => t.active);
  assert.equal(activeTimers.length, 1);
  assert.equal(activeTimers[0].ms, 1450);

  activeTimers[0].active = false;
  activeTimers[0].fn();
  assert.equal(icon.className, 'ph ph-copy');
  assert.equal(span.textContent, 'Salin Struk');
  assert.equal(classes.has('is-copied'), false);
  assert.equal(surfaceClasses.has('is-copied-surface'), false);
  assert.equal(styles.has('--btn-lock-w'), false);

  // Icon-only & direct text node buttons work cleanly
  const textNode = { nodeType: 3, nodeValue: ' Salin Nominal' };
  const inlineIcon = { className: 'ph ph-copy' };
  const inlineBtn = {
    offsetWidth: 150,
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    style: { setProperty: () => {}, removeProperty: () => {} },
    childNodes: [textNode],
    querySelector: (sel) => (sel.includes('span') ? null : inlineIcon)
  };
  flashCopyFeedback(inlineBtn, null);
  assert.equal(inlineIcon.className, 'ph-bold ph-check');
  assert.equal(textNode.nodeValue, ' Tersalin');
  scheduledTimers.find((t) => t.active).fn();
  assert.equal(inlineIcon.className, 'ph ph-copy');
  assert.equal(textNode.nodeValue, ' Salin Nominal');

  const iconOnly = { className: 'ph ph-copy' };
  const iconBtn = {
    offsetWidth: 34,
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    style: { setProperty: () => {}, removeProperty: () => {} },
    childNodes: [],
    querySelector: (sel) => (sel.includes('span') ? null : iconOnly)
  };
  flashCopyFeedback(iconBtn, null);
  assert.equal(iconOnly.className, 'ph-bold ph-check');
  scheduledTimers.filter((t) => t.active).at(-1).fn();
  assert.equal(iconOnly.className, 'ph ph-copy');
});

test('v317 signature animations (login vault, edit medallion, pin wave, copy morph, receipt seal) satisfy contracts', () => {
  const authModal = read('src/svelte/shell/modals/AuthModals.svelte');
  assert.match(authModal, /id="login-verified-stage"/);
  assert.match(authModal, /#role-switcher\.is-just-unlocked/);
  assert.match(read('src/svelte/handlers/auth.ts'), /settleLoginStage/);

  const trxModals = read('src/svelte/shell/modals/TransactionsModals.svelte');
  assert.match(trxModals, /id="edit-verified-stage"/);
  assert.match(read('src/svelte/handlers/transactions.ts'), /createModalStage/);
  assert.match(read('src/svelte/handlers/transactions.ts'), /editStage\.settle/);

  const pinModal = read('src/svelte/shell/modals/GroupPinModal.svelte');
  assert.match(pinModal, /id="group-pin-badge"/);
  assert.match(pinModal, /id="group-pin-lock-icon"/);
  assert.match(read('src/styles/app/forms.css'), /\.pin-row\.is-unlocked\s+span\.pin-box/);
  assert.doesNotMatch(read('src/styles/app/forms.css'), /scale\(0\)/);

  const receiptBody = read('src/svelte/modals/ReceiptBody.svelte');
  assert.match(receiptBody, /class="receipt-seal-ring"/);
  assert.match(read('src/svelte/handlers/receipt.ts'), /is-stamping/);
  const selfPayCss = read('src/svelte/modals/SelfPayMonths.svelte');
  assert.match(selfPayCss, /#receipt-body\.is-stamping\s+\.receipt-seal\[data-tone="verified"\]\s+\.receipt-seal-ring/);
  assert.doesNotMatch(selfPayCss, /scale\(0\)/);
  assert.doesNotMatch(read('src/styles/app/modals-base.css'), /scale\(0\)/);
});

test('v318 edit wizard (Alur Bayar) and content-fitted voucher receipt satisfy behavior and layout contracts', () => {
  const modal = makeNode('dialog', 'modal-edit-transaksi');
  const form = makeNode('form', 'form-edit-transaksi');
  const p1 = makeNode('section', 'edit-step-1'); p1.dataset.step = '1';
  const p2 = makeNode('section', 'edit-step-2'); p2.dataset.step = '2'; p2.hidden = true;
  const p3 = makeNode('section', 'edit-step-3'); p3.dataset.step = '3'; p3.hidden = true;
  form.querySelectorAll = (sel) => (sel === '.trx-step-panel' ? [p1, p2, p3] : []);

  const tipe = makeNode('select', 'edit-tipe'); tipe.value = 'Masuk';
  const kat = makeNode('select', 'edit-kategori'); kat.value = 'KAT-1';
  const nom = makeNode('input', 'edit-nominal'); nom.value = '50.000';
  const originId = makeNode('span', 'edit-origin-id');
  const revId = makeNode('strong', 'rev-edit-id');
  const footerDelta = makeNode('strong', 'edit-footer-delta');
  const calloutDiff = makeNode('strong', 'edit-callout-diff');

  for (const node of [modal, form, tipe, kat, nom, originId, revId, footerDelta, calloutDiff]) {
    elements.set(node.id, node);
  }

  openEditWizard({ ID_Transaksi: 'TRX-88', Tipe_Arus: 'Masuk', Nominal: 25000 });
  assert.equal(originId.textContent, 'TRX-88');
  assert.equal(modal.dataset.stepDir, 'none');
  assert.equal(p1.hidden, false);
  assert.equal(p2.hidden, true);
  assert.equal(footerDelta.textContent, `+ ${new Intl.NumberFormat('id-ID').format(25000).replace(/^/, 'Rp\u00a0')}`.replace('Rp ', 'Rp\u00a0'));
  assert.match(calloutDiff.textContent, /\+.*25\.000/);

  setEditWizardStep(2);
  assert.equal(modal.dataset.stepDir, 'forward');
  assert.equal(p1.hidden, true);
  assert.equal(p2.hidden, false);

  setEditWizardStep(3);
  assert.equal(modal.dataset.stepDir, 'forward');
  assert.equal(p3.hidden, false);
  assert.equal(revId.textContent, 'TRX-88');

  setEditWizardStep(2);
  assert.equal(modal.dataset.stepDir, 'backward');
  assert.equal(p2.hidden, false);

  const trxModals = read('src/svelte/shell/modals/TransactionsModals.svelte');
  assert.match(trxModals, /id="edit-stepper"/);
  assert.match(trxModals, /name="edit-tipe-radio"/);
  assert.match(trxModals, /id="edit-rev-callout"/);

  const receiptBody = read('src/svelte/modals/ReceiptBody.svelte');
  assert.match(receiptBody, /class="receipt-hero"/);
  assert.match(receiptBody, /class="receipt-perforation"/);
  assert.match(receiptBody, /class="receipt-flow-pill"/);

  const selfPayCss = read('src/svelte/modals/SelfPayMonths.svelte');
  assert.match(selfPayCss, /#modal-struk\s+\.receipt-drawer\s*\{[^}]*height:\s*auto;/s);
  assert.doesNotMatch(selfPayCss, /calc\(100dvh\s*-\s*24px\)/);
  assert.doesNotMatch(selfPayCss, /height:\s*90dvh/);
});

test('v319 edit wizard typography, surface alignment, and unified summary card contracts', () => {
  const trxModals = read('src/svelte/shell/modals/TransactionsModals.svelte');
  assert.match(trxModals, /id="edit-step-label-1">Nominal</);
  assert.match(trxModals, /id="edit-step-label-2">Rincian</);
  assert.match(trxModals, /id="edit-step-label-3">Tinjau</);
  assert.match(trxModals, /class="edit-rev-card"/);
  assert.match(trxModals, /class="trx-rev-callout edit-summary-card"\s+id="edit-rev-callout"/);

  const modalsBaseCss = read('src/styles/app/modals-base.css');
  assert.match(modalsBaseCss, /#modal-edit-transaksi\s+\.edit-origin-banner/);
  assert.match(modalsBaseCss, /#modal-edit-transaksi\s+#trx-attachment-file::file-selector-button/);
  assert.match(modalsBaseCss, /#modal-edit-transaksi\s+\.trx-footer-meta\.edit-footer-pill/);

  const wizardJs = read('src/svelte/ui/edit-wizard.ts');
  assert.match(wizardJs, /STEP_LABELS_ID\s*=\s*\['Nominal',\s*'Rincian',\s*'Tinjau'\]/);
  assert.match(wizardJs, /\[data-edit-preset\]/);
});

test('v320 micro-animations #1-#6 and tactile micro-interactions meet contracts and reduced-motion rules', () => {
  const adminPriorities = read('src/svelte/dashboard/AdminPriorities.svelte');
  assert.match(adminPriorities, /@starting-style\s*\{[\s\S]*\.bulk-dock:not\(\[hidden\]\)/);
  assert.match(adminPriorities, /display\s+200ms\s+allow-discrete/);
  assert.match(adminPriorities, /@keyframes\s+bulkCellPop/);

  const spotlight = read('src/svelte/dashboard/MemberSpotlight.svelte');
  assert.match(spotlight, /#spotlight-card:not\(\[hidden\]\)/);
  assert.match(spotlight, /class="spotlight-detail-inner"/);
  assert.match(spotlight, /@keyframes\s+spotlightDetailIn/);

  const selfPay = read('src/svelte/modals/SelfPayMonths.svelte');
  assert.match(selfPay, /\.self-pay-presets\s+button\[aria-pressed="true"\]/);
  assert.match(selfPay, /@keyframes\s+selfPayTilePick/);
  assert.match(selfPay, /#self-pay-total\.is-updating/);

  const bento = read('src/svelte/dashboard/BentoDashboard.svelte');
  assert.match(bento, /\.bento-drill-label\s+i/);
  assert.match(bento, /@media\s*\(hover:\s*hover\)\s+and\s+\(pointer:\s*fine\)[\s\S]*\.bento-flow:hover\s+\.bento-drill-label\s+i/);
  const hybridMotion = read('src/styles/app/hybrid-motion.css');
  assert.match(hybridMotion, /\.bento-flow\.hybrid-card:active/);

  // Behavior: applyPrivacyMode(true) toggles aria-pressed and pulses .is-toggling on [data-action="toggle-privacy"]
  const prevPrivacy = localStorage.getItem('finkas_privacy_mode');
  const toggleBtn = makeNode('button', 'toggle-privacy');
  const toggleIcon = makeNode('i');
  toggleBtn.appendChild(toggleIcon);
  const prevQs = globalThis.document.querySelector;
  try {
    globalThis.document.querySelector = (sel) => (sel === '[data-action="toggle-privacy"]' ? toggleBtn : null);
    localStorage.setItem('finkas_privacy_mode', 'on');
    applyPrivacyMode(true);
    assert.equal(globalThis.document.body.classList.contains('privacy-mode'), true);
    assert.equal(toggleBtn.getAttribute('aria-pressed'), 'true');
    assert.equal(toggleBtn.classList.contains('is-toggling'), true);
    assert.ok(scheduledTimers.some((t) => t.active && t.ms === 220));
  } finally {
    globalThis.document.querySelector = prevQs;
    if (prevPrivacy === null) localStorage.removeItem('finkas_privacy_mode');
    else localStorage.setItem('finkas_privacy_mode', prevPrivacy);
  }

  // Behavior: flashMasterAnggotaSaved & flashMasterKategoriSaved mark and clear savedId cleanly
  flashMasterAnggotaSaved('ANG-77');
  flashMasterKategoriSaved('KAT-12');
  assert.equal(masterAnggotaStore.savedId, 'ANG-77');
  assert.equal(masterKategoriStore.savedId, 'KAT-12');
  for (const t of scheduledTimers.filter((item) => item.active && item.ms === 1100)) {
    t.fn();
  }
  assert.equal(masterAnggotaStore.savedId, '');
  assert.equal(masterKategoriStore.savedId, '');

  const masterRows = read('src/svelte/modals/MasterAnggotaRows.svelte');
  assert.match(masterRows, /\.master-row\.is-just-saved/);
  assert.match(read('src/svelte/modals/MasterKategoriRows.svelte'), /class:is-just-saved/);

  const workspaceCss = read('src/styles/app/workspace.css');
  assert.match(workspaceCss, /\.workspace-tabs\s+\[aria-selected="true"\]\s+i/);
  assert.match(workspaceCss, /@keyframes\s+privacyEyePop/);

  const modalsBaseCss = read('src/styles/app/modals-base.css');
  assert.match(modalsBaseCss, /\.close-modal-btn:active/);
  assert.match(modalsBaseCss, /\.btn-pwd-peek:active\s+i/);

  const chipsCss = read('src/svelte/forms/IuranReviewChips.svelte');
  assert.match(chipsCss, /\.trx-btn-next:hover:not\(:disabled\)\s+i/);
  assert.doesNotMatch(chipsCss, /transition:\s*all\b/);
  assert.doesNotMatch(chipsCss, /scale\(0\)/);
});
