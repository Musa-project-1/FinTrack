import { flushSync, mount } from 'svelte';
import { updateOnboardingGroupsStore, type OnboardingGroupInput } from './onboarding.svelte';

const mounted = new WeakSet<Element>();

export function syncOnboardingGroupList(input: OnboardingGroupInput) {
  updateOnboardingGroupsStore(input);
  const target = globalThis.document?.getElementById?.('group-list');
  if (!target?.ownerDocument || typeof Element === 'undefined') return;
  if (!mounted.has(target)) {
    const components: typeof import('./onboarding-components') = require('./onboarding-components');
    target.replaceChildren();
    mount(components.OnboardingGroupList, { target });
    mounted.add(target);
  }
  flushSync();
}
