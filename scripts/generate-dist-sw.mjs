/**
 * @file scripts/generate-dist-sw.mjs
 * Generates `dist/sw.js` from the root `sw.js` template by replacing legacy
 * unhashed runtime entries in `LOCAL_ASSETS` with the content-hashed assets
 * emitted by Vite into `dist/assets/`.
 */
import fs from 'node:fs';
import path from 'node:path';

const LEGACY_REPLACED_ASSETS = new Set([
  'style.css',
  'css/onboarding-scoped.css',
  'src/app.js',
  'src/pages/onboarding.js',
  'src/pages/privacy.js',
  'src/ui/svelte-dashboard.js',
  'src/ui/svelte-onboarding.js',
]);

/**
 * Build the `dist/sw.js` precache manifest from the root `sw.js` template
 * and the files actually emitted into `dist/assets/`.
 */
export function generateDistServiceWorker(rootDir, distDir) {
  const templatePath = path.join(rootDir, 'sw.js');
  const swSource = fs.readFileSync(templatePath, 'utf8');
  const match = /const LOCAL_ASSETS = \[([\s\S]*?)\];/.exec(swSource);
  if (!match) {
    throw new Error('[generate-dist-sw] Could not find LOCAL_ASSETS array in sw.js');
  }

  const baseAssets = [...match[1].matchAll(/'([^']+)'/g)]
    .map((m) => m[1])
    .filter((entry) => !LEGACY_REPLACED_ASSETS.has(entry));

  const assetsDir = path.join(distDir, 'assets');
  const emittedAssets = fs.existsSync(assetsDir)
    ? fs.readdirSync(assetsDir)
        .filter((name) => /\.(js|css)$/.test(name) && !name.endsWith('.map'))
        .sort()
        .map((name) => `assets/${name}`)
    : [];

  const merged = [...new Set([...baseAssets, ...emittedAssets])];
  const formatted = `const LOCAL_ASSETS = [\n${merged.map((a) => `  '${a}'`).join(',\n')}\n];`;
  const output = swSource.replace(/const LOCAL_ASSETS = \[[\s\S]*?\];/, formatted);
  fs.writeFileSync(path.join(distDir, 'sw.js'), output, 'utf8');
  return merged;
}
