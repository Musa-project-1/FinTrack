import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRp, getInitials, escapeHtml, hashText } from '../js/utils.js';

test('formatRp formats numbers to IDR correctly', () => {
  const formatted = formatRp(50000);
  assert.ok(formatted.includes('50.000'), `Expected formatted string to contain 50.000, got: ${formatted}`);
  assert.ok(formatted.includes('Rp'), `Expected formatted string to contain Rp, got: ${formatted}`);
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
