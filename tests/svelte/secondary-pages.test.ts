import { describe, expect, it, afterEach } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import OnboardingShell from '../../src/svelte/pages/OnboardingShell.svelte';
import PrivacyShell from '../../src/svelte/pages/PrivacyShell.svelte';

describe('Phase 4 Live Secondary MPA Pages (Onboarding & Privacy)', () => {
  let host: HTMLDivElement | null = null;
  let instance: ReturnType<typeof mount> | null = null;

  afterEach(() => {
    if (instance) {
      unmount(instance);
      instance = null;
    }
    host?.remove();
    host = null;
  });

  it('mounts OnboardingShell live with all critical smoke selectors', () => {
    host = document.createElement('div');
    host.id = 'app';
    document.body.appendChild(host);

    instance = mount(OnboardingShell, { target: host });
    flushSync();

    for (const id of ['btn-to-list', 'state-list', 'group-search-input', 'group-list', 'state-pin', 'group-pin']) {
      expect(document.getElementById(id), `missing #${id}`).not.toBeNull();
    }
  });

  it('mounts PrivacyShell live with bilingual EN/ID language toggles', () => {
    host = document.createElement('div');
    host.id = 'app';
    document.body.appendChild(host);

    instance = mount(PrivacyShell, { target: host });
    flushSync();

    expect(document.querySelector('[data-privacy-lang="id"]')).not.toBeNull();
    expect(document.querySelector('[data-privacy-lang="en"]')).not.toBeNull();
  });
});
