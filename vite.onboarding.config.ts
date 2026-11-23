import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { authoredSourcemaps } from './scripts/authored-sourcemaps.mjs';

export default defineConfig({
  plugins: [svelte(), authoredSourcemaps()],
  build: {
    sourcemap: true,
    lib: { entry: 'src/svelte/onboarding-mount.ts', formats: ['es'], fileName: () => 'svelte-onboarding.js' },
    outDir: 'src/ui',
    emptyOutDir: false,
    minify: true,
    rolldownOptions: { output: { minify: true } }
  }
});
