import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const cacheName = /const CACHE_NAME = '([^']+)'/.exec(source)[1];
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function worker(overrides = {}) {
  const listeners = {};
  const calls = { deleted: [], batches: [], optional: [], puts: [], claimed: false, skipped: false };
  const cache = {
    addAll: async (assets) => { calls.batches.push(Array.from(assets)); },
    add: async (asset) => { calls.optional.push(asset); },
    put: async (...args) => { calls.puts.push(args); },
    ...overrides.cache
  };
  const caches = {
    open: async () => cache,
    match: async () => undefined,
    keys: async () => ['unrelated-cache', 'finkas-v1', cacheName],
    delete: async (key) => { calls.deleted.push(key); },
    ...overrides.caches
  };
  const timers = [];
  vm.runInNewContext(source, {
    URL, Response, location: { origin: 'https://finkas.test' }, caches,
    fetch: overrides.fetch || (async () => new Response('new')),
    setTimeout: (callback, ms) => { timers.push({ callback, ms }); return timers.length; },
    clearTimeout: () => {},
    self: {
      addEventListener: (name, listener) => { listeners[name] = listener; },
      skipWaiting: async () => { calls.skipped = true; },
      clients: { claim: overrides.claim || (async () => { calls.claimed = true; }) }
    }
  });
  function dispatch(type, request) {
    const pending = [];
    let response;
    listeners[type]({ request, waitUntil: (task) => pending.push(task),
      respondWith: (task) => { response = task; } });
    return { pending, response, done: () => Promise.all(pending) };
  }
  return { calls, dispatch, timers };
}
const request = (path, mode = 'cors') => ({ url: `https://finkas.test/${path}`, method: 'GET', mode });

test('install atomically caches all core assets before skipping waiting', async () => {
  const gate = deferred();
  const w = worker({ cache: { addAll: async (assets) => {
    assert.ok(assets.includes('index.html'));
    assert.ok(assets.includes('src/app.js'));
    assert.ok(assets.includes('fonts/phosphor/regular/Phosphor.woff2'));
    assert.ok(!assets.includes('assets/hero-atmosphere.png'));
    await gate.promise;
  }, add: async () => { throw new Error('optional 404'); } } });
  const event = w.dispatch('install');
  await Promise.resolve();
  assert.equal(w.calls.skipped, false);
  gate.resolve();
  await event.done();
  assert.equal(w.calls.skipped, true);
});

test('a missing core file rejects installation without promoting the worker', async () => {
  const w = worker({ cache: { addAll: async () => { throw new Error('core 404'); } } });
  await assert.rejects(w.dispatch('install').done(), /core 404/);
  assert.equal(w.calls.skipped, false);
  assert.deepEqual(w.calls.optional, []);
});

test('activation evicts only old Finkas caches and waits for claim', async () => {
  const deletion = deferred();
  const claim = deferred();
  let claimed = false;
  const w = worker({ caches: { delete: async (key) => {
    assert.equal(key, 'finkas-v1');
    await deletion.promise;
  } }, claim: () => { claimed = true; return claim.promise; } });
  const event = w.dispatch('activate');
  await Promise.resolve();
  assert.equal(claimed, false);
  deletion.resolve();
  await new Promise(setImmediate);
  assert.equal(claimed, true);
  let finished = false;
  const done = event.done().then(() => { finished = true; });
  await Promise.resolve();
  assert.equal(finished, false);
  claim.resolve();
  await done;
});

test('warm local assets respond before stalled fetch and keep cache writes alive', async () => {
  const network = deferred();
  const write = deferred();
  const cached = new Response('cached');
  const w = worker({ fetch: () => network.promise,
    caches: { match: async (_request, options) => {
      assert.equal(options.cacheName, cacheName);
      return cached;
    } }, cache: { put: async () => write.promise } });
  const event = w.dispatch('fetch', request('src/app.js'));
  assert.equal(await event.response, cached);
  assert.equal(w.timers.length, 0);
  assert.equal(event.pending.length, 1);
  network.resolve(new Response('updated'));
  let finished = false;
  const done = event.done().then(() => { finished = true; });
  await new Promise(setImmediate);
  assert.equal(finished, false);
  write.resolve();
  await done;
});

test('cold local requests return the network response and cache it', async () => {
  const w = worker();
  const event = w.dispatch('fetch', request('style.css'));
  assert.equal(await (await event.response).text(), 'new');
  await event.done();
  assert.equal(w.calls.puts.length, 1);
});

test('navigation times out after 1.5s and falls back to offline.html', async () => {
  const network = deferred();
  const offline = new Response('offline page');
  const w = worker({ fetch: () => network.promise,
    caches: { match: async (key) => key === 'offline.html' ? offline : undefined } });
  const event = w.dispatch('fetch', request('dashboard', 'navigate'));
  assert.equal(w.timers[0].ms, 1500);
  w.timers[0].callback();
  assert.equal(await event.response, offline);
  network.resolve(new Response('late'));
  await event.done();
});

test('failed navigation uses the app shell; API requests bypass interception', async () => {
  const shell = new Response('shell');
  const w = worker({ fetch: async () => { throw new Error('offline'); },
    caches: { match: async (key) => key === 'index.html' ? shell : undefined } });
  const event = w.dispatch('fetch', request('dashboard', 'navigate'));
  assert.equal(await event.response, shell);
  await event.done();
  const api = w.dispatch('fetch', request('api/data'));
  assert.equal(api.response, undefined);
  assert.equal(api.pending.length, 0);
});

test('offline navigation serves exact precached standalone pages before falling back to index.html', async () => {
  const shell = new Response('shell');
  const onboarding = new Response('onboarding');
  const w = worker({
    fetch: async () => { throw new Error('offline'); },
    caches: {
      match: async (key, options) => {
        if (typeof key === 'object' && new URL(key.url).pathname === '/onboarding.html') {
          assert.equal(options?.cacheName, cacheName);
          assert.equal(options?.ignoreSearch, true);
          return onboarding;
        }
        return key === 'index.html' ? shell : undefined;
      }
    }
  });
  const event = w.dispatch('fetch', request('onboarding.html?utm_source=pwa', 'navigate'));
  assert.equal(await event.response, onboarding);
  await event.done();
});

test('CDN misses cache opaque responses under waitUntil; hits avoid fetch', async () => {
  const opaque = { ok: false, type: 'opaque', clone() { return this; } };
  const w = worker({ fetch: async () => opaque });
  const event = w.dispatch('fetch', { url: 'https://fonts.gstatic.com/font.woff2', method: 'GET' });
  assert.equal(await event.response, opaque);
  await event.done();
  assert.equal(w.calls.puts.length, 1);
  const hit = worker({ caches: { match: async () => opaque },
    fetch: () => { assert.fail('cache hit must not fetch'); } });
  const cached = hit.dispatch('fetch', { url: 'https://fonts.gstatic.com/font.woff2', method: 'GET' });
  assert.equal(await cached.response, opaque);
  await cached.done();
  assert.equal(hit.calls.puts.length, 0);
});
