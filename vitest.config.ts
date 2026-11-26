import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const ROOT = import.meta.dirname;

const sharedAliases = {
  'finkas/core': resolve(ROOT, 'src/svelte/core'),
  'finkas/self-pay': resolve(ROOT, 'src/svelte/handlers/self-pay.ts'),
  'finkas/receipt': resolve(ROOT, 'src/svelte/handlers/receipt.ts'),
  'finkas/dues-status': resolve(ROOT, 'src/svelte/ui/dues-status.ts'),
  'finkas/pagination': resolve(ROOT, 'src/svelte/ui/pagination.ts'),
  'finkas/hybrid-motion': resolve(ROOT, 'src/svelte/ui/hybrid-motion.ts'),
  'finkas/bulk-dues': resolve(ROOT, 'src/svelte/ui/bulk-dues.ts'),
};

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [svelte()],
        resolve: {
          conditions: ['browser'],
          alias: sharedAliases,
        },
        test: {
          name: 'svelte',
          environment: 'jsdom',
          setupFiles: ['tests/svelte/setup.ts'],
          include: ['tests/svelte/**/*.test.ts'],
        },
      },
      {
        plugins: [svelte()],
        resolve: {
          conditions: ['browser'],
          alias: {
            ...sharedAliases,
            'node:test': resolve(ROOT, 'tests/helpers/vitest-node-test.ts'),
          },
        },
        test: {
          name: 'ui',
          environment: 'jsdom',
          testTimeout: 30000,
          hookTimeout: 20000,
          setupFiles: ['tests/helpers/vitest-node-setup.ts'],
          include: ['tests/*.vitest.mjs'],
        },
      },
    ],
  },
});
