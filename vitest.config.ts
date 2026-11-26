import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const ROOT = import.meta.dirname;

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser'],
    alias: {
      'finkas/core': resolve(ROOT, 'src/svelte/core'),
      'finkas/self-pay': resolve(ROOT, 'src/svelte/handlers/self-pay.ts'),
      'finkas/receipt': resolve(ROOT, 'src/svelte/handlers/receipt.ts'),
      'finkas/dues-status': resolve(ROOT, 'src/svelte/ui/dues-status.ts'),
      'finkas/pagination': resolve(ROOT, 'src/svelte/ui/pagination.ts'),
      'finkas/hybrid-motion': resolve(ROOT, 'src/svelte/ui/hybrid-motion.ts'),
      'finkas/bulk-dues': resolve(ROOT, 'src/svelte/ui/bulk-dues.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/svelte/**/*.test.ts'],
  },
});
