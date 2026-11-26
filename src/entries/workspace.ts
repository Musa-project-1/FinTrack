import { flushSync, mount } from 'svelte';
import '../styles/app.css';
import App from '../svelte/App.svelte';
import { bootWorkspaceApp } from '../svelte/app';
import * as components from '../svelte/components';
import { registerComponents } from '../svelte/mount';

registerComponents(components);
const target = document.getElementById('app');
if (target) {
  mount(App, { target });
  flushSync();
}
bootWorkspaceApp();
