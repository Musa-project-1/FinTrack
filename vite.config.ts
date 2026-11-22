import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: { entry: 'src/svelte/mount.ts', formats: ['es'], fileName: () => 'svelte-dashboard.js' },
    outDir: 'src/ui',
    emptyOutDir: false,
    minify: true,
    rolldownOptions: {
      external: id => id.startsWith('../core/') || id === 'finkas/hybrid-motion',
      output: { paths: { 'finkas/hybrid-motion': './hybrid-motion.js' }, minify: true }
    }
  }
});
