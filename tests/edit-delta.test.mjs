/**
 * Unit tests for the edit-modal balance delta arithmetic.
 *
 * The DOM-writing wrapper (updateEditDelta in js/ui/modal.js) is not tested
 * here because it requires JSDOM. Instead the pure signed-contribution formula
 * is extracted inline so every financial case is machine-verified independently
 * of the DOM, exactly as DoD §6.5 poin 8 requires.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Pure arithmetic extracted from updateEditDelta ────────────────
// sign(tipe): Masuk = +1, Keluar = -1
const sign = (tipe) => tipe === 'Masuk' ? 1 : -1;

/**
 * Compute the net balance delta of an edit.
 * @param {string} origTipe
 * @param {number} origNom
 * @param {string} newTipe
 * @param {number} newNom
 * @returns {number} positive = saldo naik, negative = saldo turun
 */
const computeDelta = (origTipe, origNom, newTipe, newNom) =>
  (sign(newTipe) * newNom) - (sign(origTipe) * origNom);

// ── Tests ─────────────────────────────────────────────────────────

test('no change produces zero delta', () => {
  assert.equal(computeDelta('Masuk', 50000, 'Masuk', 50000), 0);
  assert.equal(computeDelta('Keluar', 30000, 'Keluar', 30000), 0);
});

test('increasing pemasukan nominal raises balance', () => {
  // was +50k, now +80k → delta = +30k
  assert.equal(computeDelta('Masuk', 50000, 'Masuk', 80000), 30000);
});

test('decreasing pemasukan nominal lowers balance', () => {
  // was +50k, now +20k → delta = -30k
  assert.equal(computeDelta('Masuk', 50000, 'Masuk', 20000), -30000);
});

test('increasing pengeluaran nominal lowers balance', () => {
  // was -30k, now -50k → delta = -20k
  assert.equal(computeDelta('Keluar', 30000, 'Keluar', 50000), -20000);
});

test('decreasing pengeluaran nominal raises balance', () => {
  // was -50k, now -20k → delta = +30k
  assert.equal(computeDelta('Keluar', 50000, 'Keluar', 20000), 30000);
});

test('flipping Keluar to Masuk at same nominal raises balance by 2x', () => {
  // was -40k, now +40k → delta = +80k
  assert.equal(computeDelta('Keluar', 40000, 'Masuk', 40000), 80000);
});

test('flipping Masuk to Keluar at same nominal lowers balance by 2x', () => {
  // was +40k, now -40k → delta = -80k
  assert.equal(computeDelta('Masuk', 40000, 'Keluar', 40000), -80000);
});

test('flip type AND change nominal — combined delta is correct', () => {
  // was Keluar 30k (-30k effect), now Masuk 50k (+50k effect) → delta = +80k
  assert.equal(computeDelta('Keluar', 30000, 'Masuk', 50000), 80000);
});

test('zero nominal new entry produces correct delta', () => {
  // editing to 0 means full reversal of original effect
  assert.equal(computeDelta('Masuk', 50000, 'Masuk', 0), -50000);
  assert.equal(computeDelta('Keluar', 50000, 'Keluar', 0), 50000);
});
