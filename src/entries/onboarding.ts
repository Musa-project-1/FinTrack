import { flushSync, mount } from 'svelte';
import '../styles/onboarding.css';
import OnboardingShell from '../svelte/pages/OnboardingShell.svelte';
import { bootOnboardingPage } from '../svelte/pages/onboarding';

const target = document.getElementById('app');
if (target) {
  mount(OnboardingShell, { target });
  flushSync();
}
bootOnboardingPage();
