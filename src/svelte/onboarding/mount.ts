import { flushSync, mount } from 'svelte';
import { updateOnboardingGroupsStore, type OnboardingGroupInput } from './onboarding.svelte';

type OnboardingComponents = typeof import('./components');
const mounted = new WeakSet<Element>();
let registeredComponents: OnboardingComponents | null = null;

export function registerOnboardingComponents(comps: OnboardingComponents) {
  registeredComponents = comps;
}

export function syncOnboardingGroupList(input: OnboardingGroupInput) {
  updateOnboardingGroupsStore(input);
  const target = globalThis.document?.getElementById?.('group-list');
  if (!target?.ownerDocument || typeof Element === 'undefined') return;
  if (!mounted.has(target)) {
    if (!registeredComponents) throw new Error('Onboarding components must be registered via registerOnboardingComponents() before mounting.');
    target.replaceChildren();
    mount(registeredComponents.OnboardingGroupList, { target });
    mounted.add(target);
  }
  flushSync();
}
