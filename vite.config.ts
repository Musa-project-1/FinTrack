import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { authoredSourcemaps } from './scripts/authored-sourcemaps.mjs';

const paths = {
  'finkas/hybrid-motion': './hybrid-motion.js',
  'finkas/dues-status': './dues-status.js',
  'finkas/pagination': './pagination.js',
  'finkas/bulk-dues': './bulk-dues.js',
  'finkas/receipt': '../render/receipt.js',
  'finkas/self-pay': '../handlers/self-pay.js'
};

export default defineConfig({
  plugins: [svelte(), authoredSourcemaps()],
  build: {
    sourcemap: true,
    lib: { entry: 'src/svelte/mount.ts', formats: ['es'], fileName: () => 'svelte-dashboard.js' },
    outDir: 'src/ui',
    emptyOutDir: false,
    minify: true,
    rolldownOptions: {
      external: id => id.startsWith('../core/') || Object.hasOwn(paths, id),
      output: { paths, minify: true }
    }
  }
});
