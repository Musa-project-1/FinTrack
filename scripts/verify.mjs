/**
 * Pre-flight verification for Finkas.
 *
 * Five checks that have all silently broken in the past:
 *   1. JavaScript under src/ and scripts/ and TypeScript under api/ parse.
 *   2. The service worker's precache list matches the modules that actually
 *      exist (a missing entry works online and 404s offline).
 *   3. index.html is not older than the Svelte shell components it is rendered from.
 *   4. style.css is not older than the css/ modules it is built from.
 *   5. TypeScript checks the core and API modules.
 *
 * Run with: npm run check (or node scripts/verify.mjs)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const MODULE_DIRS = ['src', 'scripts'];
const SW_PATH = path.join(ROOT, 'sw.js');
const INDEX_PATH = path.join(ROOT, 'index.html');
const SHELL_PATH = path.join(ROOT, 'src', 'svelte', 'shell', 'WorkspaceShell.svelte');
const SHELL_MODALS_DIR = path.join(ROOT, 'src', 'svelte', 'shell', 'modals');
const STYLE_PATH = path.join(ROOT, 'style.css');
const CSS_ENTRY = path.join(ROOT, 'css', 'input.css');
const CSS_MODULE_DIR = path.join(ROOT, 'css', 'modules');

const failures = [];

/* ── File helpers ────────────────────────────────────────────────── */

/**
 * Recursively collect files with the given extensions.
 * @param {string} dir
 * @param {RegExp} pattern
 * @returns {string[]} Absolute paths.
 */
function collectFiles(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, pattern));
    else if (pattern.test(entry.name)) out.push(full);
  }
  return out;
}

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

/* ── 1. Syntax ───────────────────────────────────────────────────── */

const moduleFiles = MODULE_DIRS.flatMap((dir) =>
  collectFiles(path.join(ROOT, dir), /\.(js|mjs)$/)
);
const apiFiles = collectFiles(path.join(ROOT, 'api'), /\.ts$/);
const filesToCheck = [...moduleFiles, ...apiFiles];

for (const file of filesToCheck) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    const detail = String(err.stderr || err.message || '').trim().split('\n').slice(0, 6).join('\n');
    failures.push(`syntax: ${rel(file)}\n${detail}`);
  }
}

/* ── 2. Service-worker precache list ─────────────────────────────── */

/** Parse the `LOCAL_ASSETS = [...]` array literal out of sw.js. */
function readPrecacheList() {
  const source = fs.readFileSync(SW_PATH, 'utf8');
  const match = /const LOCAL_ASSETS = \[([\s\S]*?)\];/.exec(source);
  if (!match) {
    failures.push('sw.js: could not find the LOCAL_ASSETS array.');
    return [];
  }
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const precache = readPrecacheList();
const precacheSet = new Set(precache);

const clientModules = collectFiles(path.join(ROOT, 'src'), /\.js$/).map(rel);
for (const modulePath of clientModules) {
  if (!precacheSet.has(modulePath)) {
    failures.push(`sw.js: '${modulePath}' is not in LOCAL_ASSETS (works online, 404s offline).`);
  }
}

for (const entry of precache) {
  // Only local paths are checkable; '/' resolves to index.html.
  if (entry === '/') continue;
  if (/^[a-z]+:/i.test(entry)) continue;
  if (!fs.existsSync(path.join(ROOT, entry))) {
    failures.push(`sw.js: LOCAL_ASSETS lists '${entry}', which does not exist.`);
  }
}

// Ensure sw.js cache name and src/sw-register.js query version match.
const swSource = fs.readFileSync(SW_PATH, 'utf8');
const swRegisterPath = path.join(ROOT, 'src', 'sw-register.js');
let swVer = '';
if (fs.existsSync(swRegisterPath)) {
  const regSource = fs.readFileSync(swRegisterPath, 'utf8');
  swVer = (/const CACHE_NAME = 'finkas-v([^']+)';/.exec(swSource) || [])[1] || '';
  const regVer = (/sw\.js\?v=([^'&]+)/.exec(regSource) || [])[1];
  if (!swVer || !regVer) {
    failures.push('verify: could not read the service-worker version from sw.js and/or src/sw-register.js.');
  } else if (swVer !== regVer) {
    failures.push(`sw.js CACHE_NAME version ('${swVer}') does not match src/sw-register.js ('${regVer}').`);
  }
}

if (swVer) {
  const versionedPages = [
    { label: 'index.html', filePath: INDEX_PATH },
    { label: 'onboarding.html', filePath: path.join(ROOT, 'onboarding.html') },
    { label: 'privacy.html', filePath: path.join(ROOT, 'privacy.html') }
  ];
  for (const page of versionedPages) {
    if (!fs.existsSync(page.filePath)) continue;
    const htmlSource = fs.readFileSync(page.filePath, 'utf8');
    const matches = [...htmlSource.matchAll(/\?v=(\d+)/g)];
    if (matches.length === 0) {
      failures.push(`verify: ${page.label} has no ?v= asset query versions.`);
      continue;
    }
    const stale = [...new Set(matches.map((m) => m[1]).filter((v) => v !== swVer))];
    if (stale.length > 0) {
      failures.push(`${page.label} has stale ?v=${stale.join(', ?v=')} (expected ?v=${swVer}).`);
    }
  }
}

/* ── 3. index.html freshness ─────────────────────────────────────── */

/** Newest modification time among WorkspaceShell.svelte and every modal shell. */
function newestFragmentMtime() {
  const candidates = [SHELL_PATH, ...collectFiles(SHELL_MODALS_DIR, /\.svelte$/)];

  let newest = 0;
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    newest = Math.max(newest, fs.statSync(file).mtimeMs);
  }
  return newest;
}

if (!fs.existsSync(INDEX_PATH)) {
  failures.push('index.html is missing — run `npm run build`.');
} else {
  const indexMtime = fs.statSync(INDEX_PATH).mtimeMs;
  const fragmentMtime = newestFragmentMtime();
  if (fragmentMtime > indexMtime) {
    failures.push('index.html is older than its Svelte shell components — run `npm run build`.');
  }

  // Belt and braces: the modal injection marker must have been replaced.
  const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  if (indexHtml.includes('@@INJECT_MODALS@@')) {
    failures.push('index.html still contains the @@INJECT_MODALS@@ placeholder.');
  }
}

for (const [htmlFile, shellFile] of [
  ['onboarding.html', 'src/svelte/pages/OnboardingShell.svelte'],
  ['privacy.html', 'src/svelte/pages/PrivacyShell.svelte']
]) {
  const htmlAbs = path.join(ROOT, htmlFile);
  const shellAbs = path.join(ROOT, shellFile);
  if (!fs.existsSync(htmlAbs)) {
    failures.push(`${htmlFile} is missing — run \`npm run build\`.`);
  } else if (fs.existsSync(shellAbs) && fs.statSync(shellAbs).mtimeMs > fs.statSync(htmlAbs).mtimeMs) {
    failures.push(`${htmlFile} is older than ${shellFile} — run \`npm run build\`.`);
  }
}

/* ── 4. style.css freshness ──────────────────────────────────────── */

/**
 * Newest modification time among the Tailwind entrypoint and the module files
 * it imports.
 *
 * Only `css/input.css` and `css/modules/**` are considered: the onboarding
 * stylesheets are linked directly by `onboarding.html` and are not part of the
 * generated bundle, so touching them must not demand a rebuild.
 */
function newestCssMtime() {
  const candidates = [
    CSS_ENTRY,
    path.join(ROOT, 'css', 'svelte-scoped.css'),
    ...collectFiles(CSS_MODULE_DIR, /\.css$/)
  ];

  let newest = 0;
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    newest = Math.max(newest, fs.statSync(file).mtimeMs);
  }
  return newest;
}

if (!fs.existsSync(STYLE_PATH)) {
  failures.push('style.css is missing — run `npm run build`.');
} else if (newestCssMtime() > fs.statSync(STYLE_PATH).mtimeMs) {
  failures.push(
    'style.css is older than the css/ modules it is built from — run `npm run build`.'
  );
}

const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
for (const args of [['--noEmit'], ['--noEmit', '-p', 'tsconfig.strict.json']]) {
  try {
    execFileSync(process.execPath, [tscBin, ...args], {
      cwd: ROOT,
      stdio: 'pipe'
    });
  } catch (err) {
    const detail = String(err.stdout || err.stderr || err.message || '').trim().split('\n').slice(0, 12).join('\n');
    failures.push(`typecheck: tsc ${args.join(' ')}\n${detail}`);
  }
}

/* ── Report ──────────────────────────────────────────────────────── */

if (failures.length) {
  console.error(`✗ verify failed (${failures.length}):\n`);
  failures.forEach((message) => console.error(`  • ${message}\n`));
  process.exit(1);
}

console.log(`✓ verify passed — ${filesToCheck.length} files parsed, ${clientModules.length} client modules precached, index.html and style.css are current, TypeScript + strict passed.`);
