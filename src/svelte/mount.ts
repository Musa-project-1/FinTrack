import { flushSync, mount } from 'svelte';
import { initHybridMotion } from 'finkas/hybrid-motion';
import { updateDashboardStore, type DashboardInput } from './store.svelte';

export { computeDashboardViewModel, updateDashboardStore, setSelectedSparkMonth } from './store.svelte';

const mounted = new WeakSet<Element>();

export function mountSvelteDashboard() {
  if (typeof document === 'undefined' || typeof Element === 'undefined' || typeof document.createElementNS !== 'function') return;
  const group = document.getElementById?.('group-overview');
  const bento = document.querySelector?.('.bento-dashboard');
  if (!group?.ownerDocument && !bento?.ownerDocument) return;
  // Rolldown defers component initialization until the browser DOM exists.
  const { GroupOverview, BentoDashboard }: typeof import('./components') = require('./components');
  for (const [target, component] of [[group, GroupOverview], [bento, BentoDashboard]] as const) {
    if (!target?.ownerDocument || mounted.has(target)) continue;
    target.replaceChildren();
    mount(component, { target });
    mounted.add(target);
    if (target === bento) initHybridMotion();
  }
}

export function syncSvelteDashboard(input: DashboardInput) {
  const model = updateDashboardStore(input);
  mountSvelteDashboard();
  flushSync();
  const group = globalThis.document?.getElementById?.('group-overview');
  if (group) group.hidden = !model.visible;
}
