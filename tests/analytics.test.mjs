import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackEvent, initAnalytics } from '../js/core/analytics.js';

test('trackEvent safely runs without window or gtag environment (no-op)', () => {
  assert.doesNotThrow(() => {
    trackEvent('test_event', { status: 'ok' });
  });
});

test('initAnalytics safely handles missing window or undefined ID', () => {
  assert.doesNotThrow(() => {
    initAnalytics(undefined);
    initAnalytics('');
  });
});
