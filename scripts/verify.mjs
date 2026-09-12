/**
 * Pre-flight verification for Finkas.
 *
 * Three checks that have all silently broken in the past:
 *   1. Every .js/.mjs file under js/ and api/ parses.
 *   2. The service worker's precache list matches the modules that actually
 *      exist (a missing entry works online and 404s offline).
 *   3. index.html is not older than the html/ fragments it is assembled from.
 *
 * Run with: npm run verify
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const MODULE_DIRS = ['js', 'api'];
const SW_PATH = path.join(ROOT, 'sw.js');
const INDEX_PATH = path.join(ROOT, 'index.html');
const HTML_DIR = path.join(ROOT, 'html');

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
const scriptsFiles = collectFiles(path.join(ROOT, 'scripts'), /\.(mjs|js)$/);
const filesToCheck = [...moduleFiles, ...scriptsFiles];

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

const clientModules = collectFiles(path.join(ROOT, 'js'), /\.js$/).map(rel);
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

/* ── 3. index.html freshness ─────────────────────────────────────── */

/** Newest modification time among the template and every modal fragment. */
function newestFragmentMtime() {
  const candidates = [path.join(HTML_DIR, 'index.template.html')];
  candidates.push(...collectFiles(path.join(HTML_DIR, 'modals'), /\.html$/));

  let newest = 0;
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    newest = Math.max(newest, fs.statSync(file).mtimeMs);
  }
  return newest;
}

if (!fs.existsSync(INDEX_PATH)) {
  failures.push('index.html is missing — run `npm run build:html`.');
} else {
  const indexMtime = fs.statSync(INDEX_PATH).mtimeMs;
  const fragmentMtime = newestFragmentMtime();
  if (fragmentMtime > indexMtime) {
    failures.push('index.html is older than its html/ fragments — run `npm run build:html`.');
  }

  // Belt and braces: the modal injection marker must have been replaced.
  const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  if (indexHtml.includes('@@INJECT_MODALS@@')) {
    failures.push('index.html still contains the @@INJECT_MODALS@@ placeholder.');
  }
}

/* ── Report ──────────────────────────────────────────────────────── */

if (failures.length) {
  console.error(`✗ verify failed (${failures.length}):\n`);
  failures.forEach((message) => console.error(`  • ${message}\n`));
  process.exit(1);
}

console.log(`✓ verify passed — ${filesToCheck.length} files parsed, ${clientModules.length} client modules precached, index.html is current.`);
