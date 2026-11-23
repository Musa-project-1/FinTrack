import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { authoredSourcemaps } from './scripts/authored-sourcemaps.mjs';

export default defineConfig(({ mode }) => {
  const isOnboarding = mode === 'onboarding';
  return {
    resolve: {
      alias: {
        'finkas/self-pay': resolve(import.meta.dirname, 'src/svelte/handlers/self-pay.ts'),
        'finkas/receipt': resolve(import.meta.dirname, 'src/svelte/render/receipt.ts'),
        'finkas/dues-status': resolve(import.meta.dirname, 'src/svelte/ui/dues-status.ts'),
        'finkas/pagination': resolve(import.meta.dirname, 'src/svelte/ui/pagination.ts'),
        'finkas/hybrid-motion': resolve(import.meta.dirname, 'src/svelte/ui/hybrid-motion.ts'),
        'finkas/bulk-dues': resolve(import.meta.dirname, 'src/svelte/ui/bulk-dues.ts')
      }
    },
    plugins: [svelte(), authoredSourcemaps()],
    build: {
      sourcemap: true,
      lib: isOnboarding
        ? { entry: 'src/svelte/onboarding/mount.ts', formats: ['es'], fileName: () => 'svelte-onboarding.js' }
        : { entry: 'src/svelte/mount.ts', formats: ['es'], fileName: () => 'svelte-dashboard.js' },
      outDir: 'src/ui',
      emptyOutDir: false,
      minify: true,
      rolldownOptions: isOnboarding
        ? { output: { minify: true } }
        : {
            external: id => /(?:^|\/)(?:src\/)?core\//.test(id),
            output: {
              paths: id => id.replace(/^(?:.*\/)?src\/core\/|^(?:\.\.\/)+core\//, '../core/'),
              minify: true
            }
          }
    }
  };
});
