import { after } from 'node:test';
import { JSDOM } from 'jsdom';

// Svelte's compiled templates retain nodes from the first window.
let dom;
after(() => dom?.window.close());

export function installSvelteDom(t, html) {
  dom ??= new JSDOM('', { url: 'https://example.test' });
  const { window } = dom;
  window.document.open();
  window.document.write(html);
  window.document.close();
  window.localStorage.clear();

  const descriptors = new Map();
  for (const name of ['window', 'document', 'Element', 'HTMLElement', 'HTMLMediaElement', 'Node', 'Text',
    'Comment', 'Event', 'CustomEvent', 'MutationObserver', 'localStorage']) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value: window[name], configurable: true });
  }
  t.after(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return id => window.document.getElementById(id);
}
