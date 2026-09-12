import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRp, getInitials, escapeHtml, hashText } from '../js/core/utils.js';

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
  const sanitized = escapeHtml(malicious);
  assert.equal(sanitized, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; &#39;');
});

test('hashText generates valid SHA-256 hex string', async () => {
  const hash = await hashText('admin123');
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 64);
  // Known SHA-256 for 'admin123': 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
  assert.equal(hash, '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');
});
