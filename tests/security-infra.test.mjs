import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function parseCspDirectives(cspValue) {
  const directives = new Map();
  for (const part of cspValue.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...values] = trimmed.split(/\s+/);
    directives.set(name.toLowerCase(), values);
  }
  return directives;
}

function walkRelativeFiles(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (entry.isDirectory()) {
      out.push(rel + '/');
      walkRelativeFiles(full, base, out);
    } else {
      out.push(rel);
    }
  }
  return out;
}

test('vercel.json stages static output to dist/ with hardened CSP and edge Cache-Control headers', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.equal(vercel.outputDirectory, 'dist');
  assert.equal(vercel.buildCommand, 'npm run build');

  const globalRule = vercel.headers.find((h) => h.source === '/(.*)');
  assert.ok(globalRule, 'expected global /(.*) header rule');
  const byKey = new Map(globalRule.headers.map((h) => [h.key.toLowerCase(), h.value]));

  assert.equal(byKey.get('x-content-type-options'), 'nosniff');
  assert.equal(byKey.get('x-frame-options'), 'DENY');
  assert.equal(byKey.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(byKey.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
  assert.ok(byKey.get('strict-transport-security')?.includes('max-age=63072000'));

  const csp = parseCspDirectives(byKey.get('content-security-policy') || '');
  const scriptSrc = csp.get('script-src') || [];
  const styleSrc = csp.get('style-src') || [];
  const fontSrc = csp.get('font-src') || [];
  const connectSrc = csp.get('connect-src') || [];

  for (const forbidden of ['https://cdn.jsdelivr.net', 'https://www.googletagmanager.com']) {
    assert.ok(!scriptSrc.includes(forbidden), `script-src must not allow ${forbidden}`);
  }
  assert.ok(!scriptSrc.includes("'unsafe-inline'") && !scriptSrc.includes("'unsafe-eval'"));
  assert.ok(!styleSrc.includes('https://cdn.jsdelivr.net'));
  assert.ok(styleSrc.includes("'unsafe-inline'"));
  assert.ok(!fontSrc.includes('https://cdn.jsdelivr.net'));
  assert.ok(!connectSrc.includes('https://cdn.jsdelivr.net'));
  assert.ok(!connectSrc.includes('https://www.google-analytics.com'));

  assert.deepEqual(csp.get('worker-src'), ["'self'"]);
  assert.deepEqual(csp.get('object-src'), ["'none'"]);
  assert.deepEqual(csp.get('base-uri'), ["'self'"]);
  assert.deepEqual(csp.get('form-action'), ["'self'"]);
  assert.deepEqual(csp.get('frame-ancestors'), ["'none'"]);
  assert.ok(csp.has('upgrade-insecure-requests'), 'CSP must include upgrade-insecure-requests');

  const apiRule = vercel.headers.find((h) => h.source === '/api/(.*)');
  assert.ok(apiRule, 'expected /api/(.*) header rule');
  const apiCache = apiRule.headers.find((h) => h.key.toLowerCase() === 'cache-control')?.value || '';
  assert.match(apiCache, /\bno-store\b/);
  assert.match(apiCache, /\bno-cache\b/);
  assert.match(apiCache, /\bmust-revalidate\b/);
  assert.match(apiCache, /\bprivate\b/);

  for (const htmlRoute of [
    '/', '/index.html',
    '/onboarding', '/onboarding.html',
    '/privacy', '/privacy.html',
    '/offline', '/offline.html',
    '/404.html'
  ]) {
    const rule = vercel.headers.find((h) => h.source === htmlRoute);
    assert.ok(rule, `expected HTML cache rule for ${htmlRoute}`);
    const cacheVal = rule.headers.find((h) => h.key.toLowerCase() === 'cache-control')?.value || '';
    assert.equal(cacheVal, 'public, max-age=0, must-revalidate');
  }
});

test('.vercelignore excludes local secrets and non-build artifacts without blocking build inputs', () => {
  const ignoreLines = read('.vercelignore')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  for (const requiredExcluded of [
    '.service-account.local.json',
    '.firebaserc',
    '.env',
    '.env.*',
    '*.pem',
    '*.key',
    '*service-account*.json',
    '.agents/',
    '.hermes/',
    '.scratch/',
    '.impeccable/',
    '.test-localstorage.json',
    'docs/',
    'tests/',
    'tmp/',
    '*.zip',
    'dist/'
  ]) {
    assert.ok(ignoreLines.includes(requiredExcluded), `.vercelignore must exclude ${requiredExcluded}`);
  }

  for (const buildCritical of [
    'src', 'src/', 'scripts', 'scripts/', 'package.json',
    'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'api', 'api/'
  ]) {
    assert.ok(!ignoreLines.includes(buildCritical), `.vercelignore must NOT exclude ${buildCritical}`);
  }
});

test('.gitignore blocks dotenv, keys, service accounts, dist/, and src/ui/*.map', () => {
  const ignoreLines = read('.gitignore')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  for (const entry of [
    '.service-account.local.json',
    '.firebaserc',
    '.env',
    '.env.*',
    '*.pem',
    '*.key',
    '*service-account*.json',
    '/dist/',
    '/src/ui/*.map'
  ]) {
    assert.ok(ignoreLines.includes(entry), `.gitignore must include ${entry}`);
  }
});

test('dist/ contains only allowlisted runtime assets without maps, sources, tests, or secrets', () => {
  const distDir = path.join(ROOT, 'dist');
  assert.ok(fs.existsSync(distDir), 'dist/ must exist after npm run build');

  const staged = walkRelativeFiles(distDir);
  for (const required of [
    'index.html',
    'onboarding.html',
    'privacy.html',
    '404.html',
    'offline.html',
    'style.css',
    'manifest.json',
    'sw.js',
    'css/onboarding-scoped.css',
    'src/app.js',
    'src/sw-register.js',
    'src/workspace-boot-theme.js',
    'src/pages/onboarding.js',
    'src/pages/onboarding-boot-theme.js',
    'src/pages/privacy.js',
    'src/pages/offline.js',
    'src/ui/svelte-dashboard.js',
    'src/ui/svelte-onboarding.js'
  ]) {
    assert.ok(staged.includes(required), `dist/ missing required runtime asset ${required}`);
  }

  for (const entry of staged) {
    const base = path.posix.basename(entry.replace(/\/$/, ''));
    assert.ok(!base.startsWith('.'), `dist/ must not contain dotfiles: ${entry}`);
    assert.ok(!entry.endsWith('.map'), `dist/ must not contain sourcemaps: ${entry}`);
    assert.ok(!entry.endsWith('.d.ts'), `dist/ must not contain declaration files: ${entry}`);
    assert.ok(!entry.startsWith('src/svelte/'), `dist/ must not contain authored source: ${entry}`);
    assert.ok(!entry.startsWith('tests/'), `dist/ must not contain tests: ${entry}`);
    assert.ok(!entry.startsWith('scripts/'), `dist/ must not contain scripts: ${entry}`);
    assert.ok(!entry.startsWith('docs/'), `dist/ must not contain docs: ${entry}`);
    assert.ok(!entry.startsWith('api/'), `dist/ must not contain API functions: ${entry}`);
    assert.ok(!entry.startsWith('package'), `dist/ must not contain package manifests: ${entry}`);
    assert.ok(!entry.includes('.service-account') && !entry.includes('.firebaserc'), `dist/ must not contain credentials: ${entry}`);
  }

  const distIndex = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.doesNotMatch(distIndex, /accounts\.google\.com\/gsi\/client/i);

  const distOnboarding = fs.readFileSync(path.join(distDir, 'onboarding.html'), 'utf8');
  assert.match(distOnboarding, /fonts\.googleapis\.com\/css2[^>]*crossorigin="anonymous"/);

  const distDash = fs.readFileSync(path.join(distDir, 'src/ui/svelte-dashboard.js'), 'utf8');
  const distOnb = fs.readFileSync(path.join(distDir, 'src/ui/svelte-onboarding.js'), 'utf8');
  assert.doesNotMatch(distDash, /sourceMappingURL/i);
  assert.doesNotMatch(distOnb, /sourceMappingURL/i);
});

test('vite.config.ts hides sourcemaps and package.json/bump.mjs enforce safe execution', () => {
  const viteCfg = read('vite.config.ts');
  assert.match(viteCfg, /sourcemap:\s*'hidden'/);
  assert.doesNotMatch(viteCfg, /sourcemap:\s*true\b/);

  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.engines?.node, 'package.json must declare engines.node');
  assert.ok(pkg.scripts.build.endsWith('&& node scripts/stage-dist.mjs'));

  const bump = read('scripts/bump.mjs');
  assert.doesNotMatch(bump, /\bexecSync\b/);
  assert.match(bump, /\bexecFileSync\b/);
  assert.match(bump, /\/\^\\d\+\$\//);
});

// SEC-34 CI workflow hardening (.github/workflows/ci.yml) is documented in the PR for manual application
// because the git push OAuth credential lacks the GitHub `workflow` scope.

test('offline.js binds click handler on .btn-retry without throwing and triggers reload', async () => {
  const offlineHtml = read('src/pages/offline.html');
  const dom = new JSDOM(offlineHtml, { url: 'https://finkas.test/offline.html' });
  let reloaded = 0;
  const origDocument = globalThis.document;
  const origWindow = globalThis.window;

  globalThis.document = dom.window.document;
  globalThis.window = { location: { reload: () => { reloaded += 1; } } };

  try {
    await import(`../src/pages/offline.js?test=${Date.now()}`);
    dom.window.document.querySelector('.btn-retry').click();
    assert.equal(reloaded, 1);
  } finally {
    globalThis.document = origDocument;
    globalThis.window = origWindow;
    dom.window.close();
  }
});
