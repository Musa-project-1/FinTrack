import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRp,
  formatCompactRp,
  formatDisplayRp,
  getInitials,
  escapeHtml,
  calculateMemberRekapProgress,
  calculateMemberContribution,
  calculateCompliance
} from '../js/core/utils.js';

test('formatRp formats numbers to IDR correctly', () => {
  const formatted = formatRp(50000);
  assert.ok(formatted.includes('50.000'), `Expected formatted string to contain 50.000, got: ${formatted}`);
  assert.ok(formatted.includes('Rp'), `Expected formatted string to contain Rp, got: ${formatted}`);
});

test('formatRp safely handles zero, null, and large numbers', () => {
  const zero = formatRp(0);
  assert.ok(zero.includes('0'), `Expected Rp 0, got: ${zero}`);
  const empty = formatRp(null);
  assert.ok(empty.includes('0'), `Expected fallback to 0, got: ${empty}`);
  const large = formatRp(25000000);
  assert.ok(large.includes('25.000.000'), `Expected formatted 25.000.000, got: ${large}`);
});

test('getInitials extracts initials accurately', () => {
  assert.equal(getInitials('Musa Bakhtiar'), 'MB');
  assert.equal(getInitials('Ahmad'), 'AH');
  assert.equal(getInitials(''), '?');
  assert.equal(getInitials(null), '?');
});

test('escapeHtml prevents XSS injection', () => {
  const malicious = '<script>alert("XSS")</script> & \'';
  assert.equal(
    escapeHtml(malicious),
    '\u0026lt;script\u0026gt;alert(\u0026quot;XSS\u0026quot;)\u0026lt;/script\u0026gt; \u0026amp; \u0026#39;'
  );
});

test('escapeHtml neutralises tags and quote-breaking attributes', () => {
  assert.equal(
    escapeHtml('<img src=x onerror=alert(1)>'),
    '\u0026lt;img src=x onerror=alert(1)\u0026gt;'
  );

  // The realistic vector: a value interpolated into a double-quoted attribute.
  assert.equal(
    escapeHtml('x" data-action="evil'),
    'x\u0026quot; data-action=\u0026quot;evil'
  );

  assert.equal(escapeHtml('"quoted"'), '\u0026quot;quoted\u0026quot;');
  assert.equal(escapeHtml('a \u0026 b'), 'a \u0026amp; b');
});

test('escapeHtml renders nullish input as an empty string', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(0), '0');
});

test('formatCompactRp converts values to K, Jt, and M notation correctly', () => {
  assert.equal(formatCompactRp(500), 'Rp\u00a0500');
  assert.equal(formatCompactRp(10000), '10K');
  assert.equal(formatCompactRp(250000), '250K');
  assert.equal(formatCompactRp(1500000), '1,5 Jt');
  assert.equal(formatCompactRp(2000000000), '2 M');
  assert.equal(formatCompactRp(-15000), '-15K');
});

test('formatDisplayRp falls back to formatRp when no compact preference is stored', () => {
  const display = formatDisplayRp(75000);
  assert.ok(display.includes('75.000'), `Expected 75.000, got ${display}`);
});

/* ── Financial & progress calculations ────────────────────────────── */

const MONTHS_12 = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

test('calculateMemberRekapProgress accounts for skipped months in denominator and lunas state', () => {
  // Scenario 1: No skipped months, 12 paid -> 12/12, 100%, isFullPaid = true
  const mapAll = {};
  MONTHS_12.forEach((b) => { mapAll[`ANG-1_${b}`] = true; });
  const resAll = calculateMemberRekapProgress('ANG-1', mapAll, [], '2026', MONTHS_12);
  assert.equal(resAll.totalOwedMonths, 12);
  assert.equal(resAll.lunasBulan, 12);
  assert.equal(resAll.progressPercent, 100);
  assert.equal(resAll.isFullPaid, true);

  // Scenario 2: One skipped month (01-2026), 11 paid (all active) -> 11/11, 100%, isFullPaid = true
  const map11 = { ...mapAll };
  delete map11['ANG-1_Januari'];
  const resSkipped = calculateMemberRekapProgress('ANG-1', map11, ['01-2026'], '2026', MONTHS_12);
  assert.equal(resSkipped.totalOwedMonths, 11);
  assert.equal(resSkipped.lunasBulan, 11);
  assert.equal(resSkipped.progressPercent, 100);
  assert.equal(resSkipped.isFullPaid, true);

  // Scenario 3: One skipped month (01-2026), 10 paid -> 10/11, ~90.9%, isFullPaid = false
  delete map11['ANG-1_Februari'];
  const resPartial = calculateMemberRekapProgress('ANG-1', map11, ['01-2026'], '2026', MONTHS_12);
  assert.equal(resPartial.totalOwedMonths, 11);
  assert.equal(resPartial.lunasBulan, 10);
  assert.equal(resPartial.isFullPaid, false);
});

test('calculateMemberContribution sums only income rows for the specified member', () => {
  const transactions = [
    { ID_Anggota: 'ANG-1', Tipe_Arus: 'Masuk', Nominal: 10000 },
    { ID_Anggota: 'ANG-1', Tipe_Arus: 'Masuk', Nominal: 15000 },
    { ID_Anggota: 'ANG-1', Tipe_Arus: 'Keluar', Nominal: 50000 }, // Ops attribution expense — should NOT increase contribution
    { ID_Anggota: 'ANG-2', Tipe_Arus: 'Masuk', Nominal: 20000 }  // Different member
  ];

  const total = calculateMemberContribution(transactions, 'ANG-1');
  assert.equal(total, 25000); // 10000 + 15000 only
});

test('calculateCompliance compares identical populations and caps at 100%', () => {
  const memberStatus = [
    { paidTotal: 20000, expectedTotal: 20000 },
    { paidTotal: 10000, expectedTotal: 20000 }
  ];

  const res = calculateCompliance(memberStatus);
  assert.equal(res.totalExpected, 40000);
  assert.equal(res.totalCollected, 30000);
  assert.equal(res.healthPct, 75);

  // When collected exceeds expected (e.g. overpayment), cap at 100%
  const overpaid = [
    { paidTotal: 30000, expectedTotal: 20000 }
  ];
  assert.equal(calculateCompliance(overpaid).healthPct, 100);
});
