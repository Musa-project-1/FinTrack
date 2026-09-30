/**
 * Ledger display order.
 *
 * History used to reverse() the array. The API already returns newest-first,
 * so that put 22 Sep above 23 Sep and the 20-row page hid everything newer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byNewestTimestamp } from '../js/core/config.js';

const row = (id, timestamp) => ({ ID_Transaksi: id, Timestamp: timestamp });

test('23 Sep sorts above 22 Sep even when the source list is oldest-first', () => {
  const source = [
    row('a', '2026-09-22T10:00:00.000Z'),
    row('b', '2026-09-23T10:00:00.000Z')
  ];
  const shown = [...source].sort(byNewestTimestamp).map((t) => t.ID_Transaksi);
  assert.deepEqual(shown, ['b', 'a']);
});

test('an optimistic row appended at the end still surfaces first', () => {
  const source = [
    row('old', '2026-09-22T10:00:00.000Z'),
    row('fresh', '2026-09-23T15:21:00.000Z')
  ];
  const shown = [...source].sort(byNewestTimestamp);
  assert.equal(shown[0].ID_Transaksi, 'fresh');
});

test('a missing timestamp never jumps above a dated row', () => {
  const source = [
    row('blank', ''),
    row('dated', '2026-09-23T10:00:00.000Z')
  ];
  const shown = [...source].sort(byNewestTimestamp);
  assert.equal(shown[0].ID_Transaksi, 'dated');
});
