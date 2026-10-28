import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { exportJSONBackup, restoreJSONBackup } from '../js/handlers/backup.js';
import {
  getState,
  setState,
  setAdminSession,
  setActiveGroupId,
  setGroups
} from '../js/core/state.js';

let oldDoc;
let oldWindow;
let oldNavDesc;

beforeEach(() => {
  oldDoc = globalThis.document;
  oldWindow = globalThis.window;
  oldNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  globalThis.document = {
    getElementById: () => null,
    createElement: () => ({
      href: '',
      download: '',
      click: () => {}
    }),
    body: {
      appendChild: () => {},
      removeChild: () => {}
    }
  };

  globalThis.window = {
    confirm: () => true,
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    navigator: { onLine: true }
  };

  globalThis.URL = globalThis.URL || {};
  globalThis.URL.createObjectURL = () => 'blob:mock-url';
  globalThis.URL.revokeObjectURL = () => {};
});

afterEach(() => {
  globalThis.document = oldDoc;
  globalThis.window = oldWindow;
  if (oldNavDesc) {
    Object.defineProperty(globalThis, 'navigator', oldNavDesc);
  }
});

test('exportJSONBackup rejects non-admin callers', async () => {
  setAdminSession('');
  const res = await exportJSONBackup();
  assert.equal(res, undefined);
});

test('exportJSONBackup rejects when offline', async () => {
  setAdminSession('mock-admin-token');
  setActiveGroupId('GRP-TEST');

  globalThis.window.navigator.onLine = false;

  const res = await exportJSONBackup();
  assert.equal(res, undefined);
});

test('restoreJSONBackup rejects when offline or non-admin', () => {
  setAdminSession('');
  let called = false;
  const mockFile = {
    name: 'backup.json'
  };
  restoreJSONBackup(mockFile);

  assert.equal(getState().transaksi.length, 0);
});
