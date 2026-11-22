import { flushSync, mount } from 'svelte';
import { initHybridMotion } from 'finkas/hybrid-motion';
import { updateDashboardStore, type DashboardInput } from './store.svelte';
import { registerSpotlightMount } from './spotlight.svelte';

export { computeDashboardViewModel, updateDashboardStore, setSelectedSparkMonth } from './store.svelte';

export {
  initSpotlight, renderSpotlight, showSpotlightDetail, getPinnedMemberId, setMemberPin, toggleMemberPin,
  computeSpotlightViewModel
} from './spotlight.svelte';

registerSpotlightMount(mountSvelteDashboard);
const mounted = new WeakSet<Element>();

export function mountSvelteDashboard() {
  if (typeof document === 'undefined' || typeof Element === 'undefined' || typeof document.createElementNS !== 'function') return;
  const group = document.getElementById?.('group-overview');
  const bento = document.querySelector?.('.bento-dashboard');
  const member = document.getElementById?.('member-spotlight');
  const admin = document.getElementById?.('admin-priorities');
  if (![group, bento, member, admin].some(el => el?.ownerDocument && !mounted.has(el))) return;
  // Rolldown defers component initialization until the browser DOM exists.
  const { GroupOverview, BentoDashboard, MemberSpotlight, AdminPriorities }: typeof import('./components') = require('./components');
  for (const [target, component] of [[group, GroupOverview], [bento, BentoDashboard], [member, MemberSpotlight], [admin, AdminPriorities]] as const) {
    if (!target?.ownerDocument || mounted.has(target)) continue;
    target.replaceChildren();
    mount(component, { target });
    mounted.add(target);
  }
  initHybridMotion();
}

export function syncSvelteDashboard(input: DashboardInput) {
  const model = updateDashboardStore(input);
  mountSvelteDashboard();
  flushSync();
  const group = globalThis.document?.getElementById?.('group-overview');
  if (group) group.hidden = !model.visible;
}
