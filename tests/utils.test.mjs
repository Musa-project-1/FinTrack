import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRp, formatCompactRp, formatDisplayRp, getInitials, escapeHtml } from '../js/core/utils.js';

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
