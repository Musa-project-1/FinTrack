import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Minimal in-memory Web Storage for isolated Node test workers.
 */
const makeStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; }
  };
};

if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage) {
  globalThis.localStorage = makeStorage();
}
if (typeof globalThis.sessionStorage === 'undefined' || !globalThis.sessionStorage) {
  globalThis.sessionStorage = makeStorage();
}

const { generateTempId } = await import('../js/core/mutation.js');

test('generateTempId generates IDs matching the prefix-TEMP-pattern', () => {
  const id1 = generateTempId('TRX');
  assert.match(id1, /^TRX-TEMP-[0-9A-F]{8}$/);

  const id2 = generateTempId('ANGGOTA');
  assert.match(id2, /^ANGGOTA-TEMP-[0-9A-F]{8}$/);

  const id3 = generateTempId('KAT');
  assert.match(id3, /^KAT-TEMP-[0-9A-F]{8}$/);
});

test('generateTempId generates distinct IDs across consecutive calls', () => {
  const ids = new Set();
  for (let i = 0; i < 50; i++) {
    ids.add(generateTempId('TRX'));
  }
  assert.equal(ids.size, 50, 'All generated temporary IDs must be unique');
});
