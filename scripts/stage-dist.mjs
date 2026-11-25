#!/usr/bin/env node
/**
 * @file scripts/stage-dist.mjs
 * Stage only allowlisted runtime web assets into `dist/` for Vercel static hosting.
 * Excludes authored sources (`src/svelte/`), sourcemaps (`*.map`), type declarations (`*.d.ts`),
 * tests, scripts, package manifests, API functions, and dotfiles.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');

const RUNTIME_FILES = [
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
];

const RUNTIME_DIRS = ['assets', 'fonts', 'icons'];

const isForbiddenEntry = (name) =>
  name.startsWith('.') || name.endsWith('.map') || name.endsWith('.d.ts');

function copyAllowlistedFile(relPath) {
  const srcPath = path.join(ROOT, relPath);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`[stage-dist] Missing required runtime asset: ${relPath}`);
  }
  const baseName = path.basename(relPath);
  if (isForbiddenEntry(baseName)) {
    throw new Error(`[stage-dist] Refusing to stage forbidden file: ${relPath}`);
  }
  const dstPath = path.join(DIST_DIR, relPath);
  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.copyFileSync(srcPath, dstPath);
  return 1;
}

function copyAllowlistedDir(relDir) {
  const srcDir = path.join(ROOT, relDir);
  if (!fs.existsSync(srcDir)) {
    throw new Error(`[stage-dist] Missing required runtime directory: ${relDir}`);
  }
  let count = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (isForbiddenEntry(entry.name)) continue;
    const relChild = path.posix.join(relDir, entry.name);
    if (entry.isDirectory()) {
      count += copyAllowlistedDir(relChild);
    } else if (entry.isFile()) {
      count += copyAllowlistedFile(relChild);
    }
  }
  return count;
}

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

let stagedCount = 0;
for (const file of RUNTIME_FILES) {
  stagedCount += copyAllowlistedFile(file);
}
for (const dir of RUNTIME_DIRS) {
  stagedCount += copyAllowlistedDir(dir);
}

console.log(`[stage-dist] Staged ${stagedCount} runtime assets into dist/.`);
