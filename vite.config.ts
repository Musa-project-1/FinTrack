import fs from 'node:fs';
import path from 'node:path';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { authoredSourcemaps } from './scripts/authored-sourcemaps.mjs';
import { generateDistServiceWorker } from './scripts/generate-dist-sw.mjs';

const ROOT = import.meta.dirname;
const STATIC_FILES = [
  'manifest.json',
  'src/workspace-boot-theme.js',
  'src/sw-register.js',
  'src/pages/onboarding-boot-theme.js',
  'src/pages/offline.js',
];
const STATIC_DIRS = ['assets', 'fonts', 'icons'];

const isForbidden = (name: string) =>
  name.startsWith('.') || name.endsWith('.map') || name.endsWith('.d.ts');

function copyDir(srcDir: string, dstDir: string) {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (isForbidden(entry.name)) continue;
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }
  }
}

function stripMaps(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) stripMaps(full);
    else if (entry.name.endsWith('.map')) fs.unlinkSync(full);
  }
}

function finkasDistPlugin(): Plugin {
  return {
    name: 'finkas-dist-finalize',
    closeBundle() {
      const distDir = path.join(ROOT, 'dist');
      if (!fs.existsSync(distDir)) return;
      stripMaps(distDir);
      for (const rel of STATIC_FILES) {
        const src = path.join(ROOT, rel);
        const dst = path.join(distDir, rel);
        if (!fs.existsSync(src)) continue;
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
      }
      for (const dir of STATIC_DIRS) {
        copyDir(path.join(ROOT, dir), path.join(distDir, dir));
      }
      const precached = generateDistServiceWorker(ROOT, distDir);
      console.log(`[finkas-dist] Finalized dist/ and generated dist/sw.js (${precached.length} precached assets).`);
    },
  };
}

const aliases = {
  'finkas/core': resolve(ROOT, 'src/svelte/core'),
  'finkas/self-pay': resolve(ROOT, 'src/svelte/handlers/self-pay.ts'),
  'finkas/receipt': resolve(ROOT, 'src/svelte/handlers/receipt.ts'),
  'finkas/dues-status': resolve(ROOT, 'src/svelte/ui/dues-status.ts'),
  'finkas/pagination': resolve(ROOT, 'src/svelte/ui/pagination.ts'),
  'finkas/hybrid-motion': resolve(ROOT, 'src/svelte/ui/hybrid-motion.ts'),
  'finkas/bulk-dues': resolve(ROOT, 'src/svelte/ui/bulk-dues.ts'),
};

export default defineConfig(({ mode }) => {
  if (mode === 'lib-dashboard' || mode === 'lib-onboarding') {
    const isOnboarding = mode === 'lib-onboarding';
    return {
      resolve: { alias: aliases },
      plugins: [svelte(), authoredSourcemaps()],
      build: {
        sourcemap: 'hidden',
        lib: isOnboarding
          ? { entry: 'src/svelte/onboarding/mount.ts', formats: ['es'], fileName: () => 'svelte-onboarding.js' }
          : { entry: 'src/svelte/mount.ts', formats: ['es'], fileName: () => 'svelte-dashboard.js' },
        outDir: 'src/ui',
        emptyOutDir: false,
        minify: true,
        rolldownOptions: { output: { minify: true } },
      },
    };
  }

  return {
    resolve: { alias: aliases },
    plugins: [tailwindcss(), svelte(), finkasDistPlugin()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: 'hidden',
      minify: true,
      rolldownOptions: {
        input: {
          index: resolve(ROOT, 'index.html'),
          onboarding: resolve(ROOT, 'onboarding.html'),
          privacy: resolve(ROOT, 'privacy.html'),
          offline: resolve(ROOT, 'offline.html'),
          notfound: resolve(ROOT, '404.html'),
        },
        output: { minify: true },
      },
    },
  };
});
