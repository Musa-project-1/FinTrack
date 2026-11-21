import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { openModal, closeModal, getActiveModalId, showConfirmDialog, executeConfirmAction } from '../src/ui/modal.js';

const saved = {};
let elements;
function element(id) {
  const classes = new Set();
  const attrs = new Set();
  const handlers = new Map();
  return {
    id, open: false, shown: 0,
    classList: {
      add: (name) => classes.add(name), remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name), toggle() {}
    },
    addEventListener(type, handler) { handlers.set(type, handler); },
    fire(type, props = {}) {
      const event = { target: this, preventDefault() { this.defaultPrevented = true; }, ...props };
      handlers.get(type)?.(event);
      return event;
    },
    showModal() { this.open = true; this.shown++; this.onShow?.(); },
    close() { this.open = false; }, // Native close events are queued, not synchronous.
    hasAttribute: (name) => attrs.has(name),
    setAttribute: (name) => attrs.add(name), removeAttribute: (name) => attrs.delete(name),
    querySelector() { return null; }
  };
}
beforeEach(() => {
  for (const key of ['document', 'window']) saved[key] = globalThis[key];
  elements = new Map();
  for (const id of ['modal-menu', 'modal-transaksi', 'modal-confirm-action', 'modal-edit-transaksi']) {
    elements.set(id, element(id));
  }
  globalThis.document = {
    getElementById: (id) => elements.get(id), body: element('body'),
    querySelectorAll: () => [], dispatchEvent() {}
  };
  globalThis.window = { innerWidth: 1024, matchMedia: () => ({ matches: false }) };
});
afterEach(() => {
  elements.forEach((el) => closeModal(el.id));
  Object.assign(globalThis, saved);
});

test('native cancel closes only the top modal and retains the scroll lock below it', () => {
  openModal('modal-transaksi');
  openModal('modal-edit-transaksi');
  const lower = elements.get('modal-transaksi');
  const upper = elements.get('modal-edit-transaksi');
  lower.fire('cancel');
  assert.equal(lower.open, true);
  assert.equal(upper.fire('cancel').defaultPrevented, true);
  assert.equal(upper.open, false);
  assert.equal(getActiveModalId(), lower.id);
  assert.equal(document.body.classList.contains('modal-open'), true);
  lower.fire('cancel');
  assert.equal(document.body.classList.contains('modal-open'), false);
});

test('opening twice and a delayed close event cannot corrupt a reopened dialog', () => {
  const el = elements.get('modal-transaksi');
  openModal(el.id);
  openModal(el.id);
  assert.equal(el.shown, 1);
  closeModal(el.id);
  openModal(el.id);
  el.fire('close');
  assert.equal(getActiveModalId(), el.id);
  assert.equal(el.classList.contains('active'), true);
  el.close();
  el.fire('close');
  assert.equal(getActiveModalId(), undefined);
});

test('backdrop dismissal requires both the press and click outside the content', () => {
  const el = elements.get('modal-transaksi');
  openModal(el.id);
  el.fire('pointerdown', { target: {} });
  el.fire('click');
  assert.equal(el.open, true);
  el.fire('pointerdown');
  el.fire('pointercancel');
  el.fire('click');
  assert.equal(el.open, true);
  el.fire('pointerdown');
  el.fire('click');
  assert.equal(el.open, false);
});

test('coarse-pointer menu chooses a safe focus target before native focusing', () => {
  window.matchMedia = () => ({ matches: true });
  const el = elements.get('modal-menu');
  const close = element('close');
  el.querySelector = () => close;
  el.onShow = () => assert.equal(close.hasAttribute('autofocus'), true);
  openModal(el.id);
  assert.equal(close.hasAttribute('autofocus'), false);
});

test('confirmation executes once and native dismissal clears the pending action', async () => {
  let calls = 0;
  const onConfirm = () => { calls++; };
  showConfirmDialog({ onConfirm });
  await executeConfirmAction();
  await executeConfirmAction();
  assert.equal(calls, 1);
  showConfirmDialog({ onConfirm });
  elements.get('modal-confirm-action').fire('cancel');
  await executeConfirmAction();
  assert.equal(calls, 1);
});
