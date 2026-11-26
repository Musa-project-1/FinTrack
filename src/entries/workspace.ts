import { flushSync, mount } from 'svelte';
import '../styles/app.css';
import App from '../svelte/App.svelte';
import { bootWorkspaceApp } from '../svelte/app';

const target = document.getElementById('app');
if (target) {
  mount(App, { target });
  flushSync();
}
bootWorkspaceApp();
