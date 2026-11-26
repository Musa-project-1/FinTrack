/**
 * @file tests/helpers/vitest-node-setup.ts
 * Keeps Node's native URL class (so `fs.readFileSync(new URL(..., import.meta.url))`
 * works under JSDOM), ensures writable localStorage, and registers Svelte island
 * components so mount.ts never falls back to CJS require().
 */
import { Blob as NodeBlob } from 'node:buffer';
import { URL as NodeURL } from 'node:url';
import { registerComponents } from '../../src/svelte/mount';
import * as dashboardComponents from '../../src/svelte/components';
import { registerOnboardingComponents } from '../../src/svelte/onboarding/mount';
import * as onboardingComponents from '../../src/svelte/onboarding/components';

Object.defineProperty(globalThis, 'URL', {
  configurable: true,
  writable: true,
  value: NodeURL,
});
Object.defineProperty(globalThis, 'Blob', {
  configurable: true,
  writable: true,
  value: NodeBlob,
});

registerComponents(dashboardComponents);
registerOnboardingComponents(onboardingComponents);

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: {
    get length() { return store.size; },
    clear() { store.clear(); },
    getItem(k: string) { return store.has(k) ? store.get(k)! : null; },
    key(i: number) { return [...store.keys()][i] ?? null; },
    removeItem(k: string) { store.delete(k); },
    setItem(k: string, v: string) { store.set(String(k), String(v)); },
  },
});
