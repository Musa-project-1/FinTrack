import { flushSync, mount } from 'svelte';
import '../styles/app.css';
import PrivacyShell from '../svelte/pages/PrivacyShell.svelte';
import { bootPrivacyPage } from '../svelte/pages/privacy';

const target = document.getElementById('app');
if (target) {
  mount(PrivacyShell, { target });
  flushSync();
}
bootPrivacyPage();
