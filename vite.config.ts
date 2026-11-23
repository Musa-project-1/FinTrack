import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { authoredSourcemaps } from './scripts/authored-sourcemaps.mjs';

const paths: Record<string, string> = {
  'finkas/hybrid-motion': './hybrid-motion.js',
  'finkas/dues-status': './dues-status.js',
  'finkas/pagination': './pagination.js',
  'finkas/bulk-dues': './bulk-dues.js',
  'finkas/receipt': '../render/receipt.js',
  'finkas/self-pay': '../handlers/self-pay.js'
};

export default defineConfig(({ mode }) => {
  const isOnboarding = mode === 'onboarding';
  return {
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
            external: id => /(?:^|\/)(?:src\/)?core\//.test(id) || Object.hasOwn(paths, id),
            output: {
              paths: id => paths[id] ?? id.replace(/^(?:.*\/)?src\/core\/|^(?:\.\.\/)+core\//, '../core/'),
              minify: true
            }
          }
    }
  };
});
