import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Synthetic browser/transport only: never touch user storage or the network.
const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key)
} });

globalThis.window = new EventTarget();
window.navigator = { onLine: true };
globalThis.document = new EventTarget();
document.visibilityState = 'visible';

// Minimal mock DOM node for document.getElementById / container rendering
const createMockElement = (id = '') => {
  const attributes = new Map();
  const classList = new Set();
  return {
    id,
    textContent: '',
    innerHTML: '',
    title: '',
    className: '',
    setAttribute(k, v) { attributes.set(k, String(v)); },
    getAttribute(k) { return attributes.get(k) ?? null; },
    removeAttribute(k) { attributes.delete(k); },
    classList: {
      add(...cls) { cls.forEach((c) => classList.add(c)); },
      remove(...cls) { cls.forEach((c) => classList.delete(c)); },
      contains(c) { return classList.has(c); },
      has(c) { return classList.has(c); }
    }
  };
};

const domElements = new Map();
document.getElementById = (id) => {
  if (!domElements.has(id)) {
    domElements.set(id, createMockElement(id));
  }
  return domElements.get(id);
};

const channels = [];
globalThis.BroadcastChannel = class {
  messages = [];
  closed = false;
  constructor(name) {
    this.name = name;
    channels.push(this);
  }
  postMessage(message) { this.messages.push(message); }
  receive(data) { this.onmessage?.({ data }); }
  close() { this.closed = true; }
};

const { setActiveGroupId, setAdminSession, setGroupSession } = await import('../js/core/state.js');
const { postToBackend } = await import('../js/core/api.js');
const sync = await import('../js/core/sync.js');
const saveStatusModule = await import('../js/ui/save-status.js').catch(() => null);

const READ = '2026-01-01T00:00:00.000Z';
const REMOTE = '2026-01-02T00:00:00.000Z';
const WRITE = '2026-01-03T00:00:00.000Z';
const response = (body) => ({ status: 200, json: async () => body });
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach((t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  setActiveGroupId('DEMO-A');
  setAdminSession('synthetic-admin-token');
  setGroupSession('DEMO-A', 'synthetic-read-token');
  window.navigator.onLine = true;
  document.visibilityState = 'visible';
  domElements.clear();
  globalThis.fetch = async () => { throw new Error('Unexpected request in isolated test'); };
});

afterEach(() => {
  sync.destroySync();
  saveStatusModule?.destroySaveStatus?.();
});

test('postToBackend dispatches finkas:mutation-success with groupId and local-write indicator', async () => {
  const events = [];
  const listener = (e) => events.push(e.detail);
  window.addEventListener('finkas:mutation-success', listener);

  globalThis.fetch = async () => response({ status: true, updatedAt: '2026-01-02T10:00:00.000Z' });

  const result = await postToBackend({ action: 'tambahTransaksi', groupId: 'DEMO-A', nominal: 50000 });
  assert.equal(result.status, true);

  assert.equal(events.length, 1);
  assert.equal(events[0].groupId, 'DEMO-A');
  assert.equal(events[0].updatedAt, '2026-01-02T10:00:00.000Z');
  assert.equal(events[0].isFullRead, false);
  assert.equal(events[0].source, 'local-write');

  window.removeEventListener('finkas:mutation-success', listener);
});

test('own confirmed write preserves unread remote data and the full-read freshness marker', async (t) => {
  const badges = [];
  const checks = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (body.action === 'checkUpdate') {
      checks.push(body);
      return response({ status: true, data: { hasUpdate: true, updatedAt: REMOTE } });
    }
    return response({ status: true, updatedAt: WRITE });
  };

  sync.initSync((hasUpdate) => badges.push(hasUpdate));
  sync.notifySynced(READ);
  assert.equal(badges.at(-1), false);

  // Sibling tab informs of remote mutation on the same group
  const activeChannel = channels.at(-1);
  activeChannel.receive({ type: 'mutation', groupId: 'DEMO-A', updatedAt: REMOTE });
  assert.equal(badges.at(-1), true, 'badge turns red on remote update');

  // Now THIS tab writes a transaction
  await postToBackend({ action: 'tambahTransaksi', groupId: 'DEMO-A', nominal: 1000 });
  assert.equal(badges.at(-1), true, 'a write response is not a full read; unread remote flag stays true');

  // Trigger heartbeat/timer
  t.mock.timers.tick(3000);
  await flush();
  assert.equal(checks[0].since, READ, 'polling must keep comparing with the last full read timestamp');

  // Finally full fetch occurs
  sync.notifySynced(WRITE);
  assert.equal(badges.at(-1), false, 'a full pull clears the unread indicator and updates freshness marker');
});

test('BroadcastChannel and mutation events are group-scoped and do not leak cross-group stale state', async () => {
  const badges = [];
  sync.initSync((hasUpdate) => badges.push(hasUpdate));
  sync.notifySynced(READ);

  const activeChannel = channels.at(-1);
  // Sibling tab writes to a different group (DEMO-B)
  activeChannel.receive({ type: 'mutation', groupId: 'DEMO-B', updatedAt: REMOTE });
  assert.equal(sync.getHasRemoteUpdate ? sync.getHasRemoteUpdate() : badges.at(-1), false, 'mutation from DEMO-B must not mark DEMO-A as stale');

  // Window event for another group must also be ignored
  window.dispatchEvent(new CustomEvent('finkas:mutation-success', {
    detail: { groupId: 'DEMO-B', updatedAt: WRITE, source: 'local-write' }
  }));
  assert.equal(sync.getHasRemoteUpdate ? sync.getHasRemoteUpdate() : badges.at(-1), false);
});

test('race check across group switch discards obsolete update check from previous group', async () => {
  let resolveCheck;
  const checkPromise = new Promise((resolve) => { resolveCheck = resolve; });

  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    if (body.action === 'checkUpdate') {
      return checkPromise;
    }
    return response({ status: true });
  };

  const badges = [];
  sync.initSync((hasUpdate) => badges.push(hasUpdate));
  sync.notifySynced(READ);

  // Start checkForUpdate on DEMO-A
  const checkAction = sync.checkForUpdate();

  // User immediately switches to DEMO-B
  setActiveGroupId('DEMO-B');
  sync.notifySynced(READ); // DEMO-B is clean

  // DEMO-A's server response resolves with hasUpdate: true
  resolveCheck(response({ status: true, data: { hasUpdate: true, updatedAt: REMOTE } }));
  await checkAction;

  assert.equal(sync.getHasRemoteUpdate ? sync.getHasRemoteUpdate() : badges.at(-1), false, 'DEMO-B must not be marked stale by DEMO-A response');
});

test('save-status: computeSaveStatus differentiates storage failure, pending queue, server confirmed, and remote unread without fake certainty', async () => {
  const { computeSaveStatus } = await import('../js/ui/save-status.js');

  // 1. Storage failure: must NEVER claim local persistence
  const failStatus = computeSaveStatus({
    storageState: 'failed',
    pendingCount: 0,
    hasRemoteUpdate: false,
    lastSyncedAt: READ,
    isOnline: true
  });
  assert.equal(failStatus.level, 'danger');
  assert.match(failStatus.text, /penyimpanan.*gagal|gagal.*simpan/i);
  assert.doesNotMatch(failStatus.text, /tersimpan di perangkat/i);

  // 2. Waiting to send: pending queue count must be truthfully stated
  const queueStatus = computeSaveStatus({
    storageState: 'saved',
    pendingCount: 3,
    hasRemoteUpdate: false,
    lastSyncedAt: READ,
    isOnline: true
  });
  assert.equal(queueStatus.level, 'warning');
  assert.match(queueStatus.text, /3.*menunggu|menunggu.*3/i);

  // 3. Remote unread update: notifies user to refresh
  const remoteStatus = computeSaveStatus({
    storageState: 'saved',
    pendingCount: 0,
    hasRemoteUpdate: true,
    lastSyncedAt: READ,
    isOnline: true
  });
  assert.equal(remoteStatus.level, 'info');
  assert.match(remoteStatus.text, /ada data baru/i);

  // 4. Server confirmed write while remote update is unread: preserves remote unread warning
  const mixedStatus = computeSaveStatus({
    storageState: 'saved',
    pendingCount: 0,
    hasRemoteUpdate: true,
    lastConfirmedWriteAt: WRITE,
    lastSyncedAt: READ,
    isOnline: true
  });
  assert.match(mixedStatus.text, /ada data baru/i);

  // 5. Clean server confirmed state
  const cleanStatus = computeSaveStatus({
    storageState: 'saved',
    pendingCount: 0,
    hasRemoteUpdate: false,
    lastSyncedAt: WRITE,
    isOnline: true
  });
  assert.equal(cleanStatus.level, 'success');
  assert.match(cleanStatus.text, /tersimpan di server|sinkron/i);

  // 6. Offline with local cache saved and zero queue
  const offlineStatus = computeSaveStatus({
    storageState: 'saved',
    pendingCount: 0,
    hasRemoteUpdate: false,
    lastSyncedAt: READ,
    isOnline: false
  });
  assert.equal(offlineStatus.level, 'offline');
  assert.match(offlineStatus.text, /offline.*tersimpan di perangkat|tersimpan di perangkat \(offline\)/i);
});

test('save-status: initSaveStatus renders accessible container and updates on CustomEvents', async () => {
  const { initSaveStatus, renderSaveStatus, destroySaveStatus } = await import('../js/ui/save-status.js');

  const container = document.getElementById('ui-save-status');
  initSaveStatus({ container });

  // Initial state rendered with accessible attributes
  assert.equal(container.getAttribute('role'), 'status');
  assert.equal(container.getAttribute('aria-live'), 'polite');

  // Trigger storage-status failure event
  window.dispatchEvent(new CustomEvent('finkas:storage-status', {
    detail: { groupId: 'DEMO-A', state: 'failed', error: 'QuotaExceededError' }
  }));
  assert.match(container.textContent, /gagal/i);
  assert.doesNotMatch(container.textContent, /tersimpan di perangkat/i);

  // Cross-group storage-status event must be ignored
  window.dispatchEvent(new CustomEvent('finkas:storage-status', {
    detail: { groupId: 'DEMO-OTHER', state: 'saved' }
  }));
  assert.match(container.textContent, /gagal/i, 'other group event must not clear DEMO-A failure');

  // Queue changed event for DEMO-A
  window.dispatchEvent(new CustomEvent('finkas:queue-changed', {
    detail: { groupId: 'DEMO-A', pendingCount: 4, state: 'queued' }
  }));
  assert.match(container.textContent, /4/);

  // Cleanup
  destroySaveStatus();
});
