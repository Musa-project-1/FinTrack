#!/usr/bin/env node
/**
 * @file scripts/bump.mjs
 * Unified single-command asset & Service Worker version bumper.
 *
 * Usage:
 *   npm run bump          # Auto-increments current version by 1 (e.g. 124 -> 125)
 *   npm run bump 126      # Explicit target version
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SW_PATH = path.join(ROOT, 'sw.js');
const SW_REGISTER_PATH = path.join(ROOT, 'js', 'sw-register.js');
const TEMPLATE_PATH = path.join(ROOT, 'html', 'index.template.html');
const ONBOARDING_PATH = path.join(ROOT, 'onboarding.html');

// 1. Detect current version from sw.js
const swContent = fs.readFileSync(SW_PATH, 'utf8');
const match = /const CACHE_NAME = 'finkas-v(\d+)';/.exec(swContent);
if (!match) {
  console.error('Error: Could not find CACHE_NAME pattern in sw.js');
  process.exit(1);
}

const currentVersion = parseInt(match[1], 10);
const targetArg = process.argv[2];
const newVersion = targetArg ? parseInt(targetArg, 10) : currentVersion + 1;

if (isNaN(newVersion) || newVersion <= 0) {
  console.error(`Error: Invalid target version "${targetArg}"`);
  process.exit(1);
}

console.log(`Bumping version from v${currentVersion} to v${newVersion}...`);

// 2. Update sw.js
const updatedSw = swContent.replace(
  `const CACHE_NAME = 'finkas-v${currentVersion}';`,
  `const CACHE_NAME = 'finkas-v${newVersion}';`
);
fs.writeFileSync(SW_PATH, updatedSw, 'utf8');

// 3. Update js/sw-register.js
if (fs.existsSync(SW_REGISTER_PATH)) {
  const regContent = fs.readFileSync(SW_REGISTER_PATH, 'utf8');
  const updatedReg = regContent.replace(
    new RegExp(`sw\\.js\\?v=${currentVersion}`, 'g'),
    `sw.js?v=${newVersion}`
  );
  fs.writeFileSync(SW_REGISTER_PATH, updatedReg, 'utf8');
}

// 4. Update html/index.template.html
if (fs.existsSync(TEMPLATE_PATH)) {
  const tplContent = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const updatedTpl = tplContent.replace(
    new RegExp(`\\?v=${currentVersion}`, 'g'),
    `?v=${newVersion}`
  );
  fs.writeFileSync(TEMPLATE_PATH, updatedTpl, 'utf8');
}

// 5. Update onboarding.html
if (fs.existsSync(ONBOARDING_PATH)) {
  const onbContent = fs.readFileSync(ONBOARDING_PATH, 'utf8');
  const updatedOnb = onbContent.replace(
    new RegExp(`\\?v=${currentVersion}`, 'g'),
    `?v=${newVersion}`
  );
  fs.writeFileSync(ONBOARDING_PATH, updatedOnb, 'utf8');
}

// 6. Automatically rebuild index.html
console.log('Rebuilding index.html...');
execSync('npm run build:html', { cwd: ROOT, stdio: 'inherit' });

// 7. Verify parity
console.log('Running verify checks...');
execSync('npm run verify', { cwd: ROOT, stdio: 'inherit' });

console.log(`✓ Version successfully bumped to v${newVersion} across all files.`);
