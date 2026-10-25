import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { withLiquidSave, withBusyButton } from '../js/ui/keel.js';

// Minimal DOM boundary double; actual markup/CSS is exercised by browser probes.
function makeButton() {
  const classes = new Set(['btn', 'btn-primary', 'btn-liquid']);
  const attributes = new Map();
  const properties = new Map();
  const label = { innerHTML: 'SIMPAN IURAN', textContent: 'SIMPAN IURAN' };
  return {
    disabled: false, label,
    classList: {
      add: (...names) => names.forEach(n => classes.add(n)),
      remove: (...names) => names.forEach(n => classes.delete(n)),
      contains: name => classes.has(name),
    },
    style: { setProperty: (name, value) => properties.set(name, value), getPropertyValue: name => properties.get(name) || '' },
    querySelector: selector => selector === '.keel-label' ? label : null,
    getAttribute: name => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: name => attributes.delete(name),
  };
}

let btn;
let savedDocument;
let savedWindow;
beforeEach(() => {
  savedDocument = globalThis.document;
  savedWindow = globalThis.window;
  btn = makeButton();
  globalThis.document = { getElementById: id => id === 'save' ? btn : null };
  globalThis.window = { matchMedia: () => ({ matches: true }) };
});
afterEach(() => {
  if (savedDocument === undefined) delete globalThis.document;
  else globalThis.document = savedDocument;
  if (savedWindow === undefined) delete globalThis.window;
  else globalThis.window = savedWindow;
});

test('a rejected completion callback restores the Iuran save button for retry', async () => {
  await assert.rejects(withLiquidSave('save', async () => ({
    outcome: 'success',
    done: async () => { throw new Error('completion failed'); },
  })), /completion failed/);
  assert.equal(btn.disabled, false);
  assert.equal(btn.classList.contains('is-saving'), false);
  assert.equal(btn.classList.contains('is-done'), false);
  assert.equal(btn.style.getPropertyValue('--p'), '0');
});

test('Iuran save exposes busy and success text and restores its original label', async () => {
  let resolveTask;
  let completion;
  const pending = withLiquidSave('save', () => new Promise(r => { resolveTask = r; }));
  const busy = { disabled: btn.disabled, text: btn.label.textContent, aria: btn.getAttribute('aria-busy') };
  resolveTask({ outcome: 'success', done: () => {
    completion = { text: btn.label.textContent, aria: btn.getAttribute('aria-busy'), disabled: btn.disabled };
  } });
  await pending;
  assert.deepEqual(busy, { disabled: true, text: 'Menyimpan…', aria: 'true' });
  assert.deepEqual(completion, { text: 'Tersimpan', aria: 'false', disabled: true });
  assert.equal(btn.label.innerHTML, 'SIMPAN IURAN');
  assert.equal(btn.getAttribute('aria-busy'), null);
});

test('duplicate withLiquidSave call is ignored while save is active', async () => {
  let calls = 0;
  let resolveTask;
  const first = withLiquidSave('save', () => new Promise(r => {
    calls++;
    resolveTask = r;
  }));
  const second = withLiquidSave('save', async () => {
    calls++;
    return { outcome: 'success' };
  });
  await second;
  assert.equal(calls, 1);
  resolveTask({ outcome: 'success' });
  await first;
  assert.equal(calls, 1);
});

test('withBusyButton sets and clears aria-busy and disabled', async () => {
  const busySnapshots = [];
  const fakeBtn = {
    disabled: false,
    innerHTML: 'Kirim',
    getAttribute: name => name === 'aria-busy' ? (fakeBtn._busy ? 'true' : null) : null,
    setAttribute: (name, val) => { if (name === 'aria-busy') fakeBtn._busy = val; },
    removeAttribute: name => { if (name === 'aria-busy') fakeBtn._busy = null; },
  };
  globalThis.document.getElementById = id => id === 'busy-btn' ? fakeBtn : null;

  await withBusyButton('busy-btn', 'Memuat...', 'Kirim', async () => {
    busySnapshots.push({ disabled: fakeBtn.disabled, html: fakeBtn.innerHTML, aria: fakeBtn.getAttribute('aria-busy') });
  });

  assert.deepEqual(busySnapshots, [{ disabled: true, html: 'Memuat...', aria: 'true' }]);
  assert.equal(fakeBtn.disabled, false);
  assert.equal(fakeBtn.innerHTML, 'Kirim');
  assert.equal(fakeBtn.getAttribute('aria-busy'), null);
});
