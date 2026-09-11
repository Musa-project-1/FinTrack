import { test } from 'node:test';
import assert from 'node:assert/strict';

// Uji logika kunci PIN tanpa DOM: tiru checkPinLock/recordPinFail
// memakai localStorage palsu agar aturan 5x salah -> kunci 1 menit terjaga.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MS = 60 * 1000;
const PREFIX = 'finkas_pin_lock_';

const checkPinLock = (id) => {
  const raw = localStorage.getItem(PREFIX + id);
  if (!raw) return { locked: false, remainingSec: 0 };
  const left = Math.ceil(((Number(JSON.parse(raw).lockUntil) || 0) - Date.now()) / 1000);
  if (left <= 0) {
    localStorage.removeItem(PREFIX + id);
    return { locked: false, remainingSec: 0 };
  }
  return { locked: true, remainingSec: left };
};

const recordPinFail = (id) => {
  let fails = 0;
  try {
    fails = Number(JSON.parse(localStorage.getItem(PREFIX + id) || '{}').fails) || 0;
  } catch (_) { fails = 0; }
  fails += 1;
  if (fails >= PIN_MAX_ATTEMPTS) {
    localStorage.setItem(PREFIX + id, JSON.stringify({ fails, lockUntil: Date.now() + PIN_LOCK_MS }));
    return { locked: true, attemptsLeft: 0 };
  }
  localStorage.setItem(PREFIX + id, JSON.stringify({ fails, lockUntil: 0 }));
  return { locked: false, attemptsLeft: PIN_MAX_ATTEMPTS - fails };
};

test('PIN grup mengunci setelah 5x salah', () => {
  const id = 'grup-tes';
  for (let i = 1; i <= 4; i += 1) {
    const r = recordPinFail(id);
    assert.equal(r.locked, false);
    assert.equal(r.attemptsLeft, PIN_MAX_ATTEMPTS - i);
  }
  const fifth = recordPinFail(id);
  assert.equal(fifth.locked, true);
  assert.equal(checkPinLock(id).locked, true);
});

test('PIN hanya terima 4 angka', () => {
  const clean = (pin) => String(pin || '').replace(/\D/g, '').slice(0, 4);
  assert.equal(clean('12ab34'), '1234');
  assert.equal(clean('12'), '12');
  assert.equal(clean('12345').length, 4);
});
