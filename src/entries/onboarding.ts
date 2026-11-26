import { flushSync, mount } from 'svelte';
import '../styles/onboarding.css';
import OnboardingShell from '../svelte/pages/OnboardingShell.svelte';
import { bootOnboardingPage } from '../svelte/pages/onboarding';
import * as onboardingComponents from '../svelte/onboarding/components';
import { registerOnboardingComponents } from '../svelte/onboarding/mount';

registerOnboardingComponents(onboardingComponents);
const target = document.getElementById('app');
if (target) {
  mount(OnboardingShell, { target });
  flushSync();
}
bootOnboardingPage();
