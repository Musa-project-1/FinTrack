import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { clearAdminSession, setActiveGroupId, setGroups } from '../../src/svelte/core/state';
import { openModal } from '../../src/svelte/ui/modal';
import App from '../../src/svelte/App.svelte';

describe('Phase 3 Batch 3A — Auth & Group Modals (Native Svelte Handlers)', () => {
  let host: HTMLDivElement | null = null;
  let instance: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    localStorage.clear();
    clearAdminSession();
    setGroups([{ id: 'GRP-A', nama: 'RT 05 Melati' }]);
    setActiveGroupId('GRP-A');
    host = document.createElement('div');
    host.id = 'app';
    document.body.appendChild(host);
    instance = mount(App, { target: host });
    flushSync();
  });

  afterEach(() => {
    if (instance) {
      unmount(instance);
      instance = null;
    }
    host?.remove();
    host = null;
  });

  it('reactively binds active group name into modal-login and modal-menu footer', () => {
    expect(document.getElementById('auth-login-group-name')?.textContent).toBe('RT 05 Melati');
    expect(document.getElementById('command-footer-group')?.textContent).toBe('RT 05 Melati');

    setGroups([
      { id: 'GRP-A', nama: 'RT 05 Melati' },
      { id: 'GRP-B', nama: 'Kas Kelas 12' },
    ]);
    setActiveGroupId('GRP-B');
    flushSync();

    expect(document.getElementById('auth-login-group-name')?.textContent).toBe('Kas Kelas 12');
    expect(document.getElementById('command-footer-group')?.textContent).toBe('Kas Kelas 12');
  });

  it('closes modal-login and modal-groups via native Svelte onclick handlers without action-router', () => {
    openModal('modal-login');
    expect(document.getElementById('modal-login')?.classList.contains('active')).toBe(true);
    const closeLogin = document.querySelector('#modal-login .close-modal-btn') as HTMLButtonElement | null;
    closeLogin?.click();
    expect(document.getElementById('modal-login')?.classList.contains('active')).toBe(false);

    openModal('modal-groups');
    expect(document.getElementById('modal-groups')?.classList.contains('active')).toBe(true);
    const closeGroups = document.querySelector('#modal-groups .close-modal-btn') as HTMLButtonElement | null;
    closeGroups?.click();
    expect(document.getElementById('modal-groups')?.classList.contains('active')).toBe(false);
  });

  it('switches GroupAdminModals tabs natively via Svelte onclick', () => {
    openModal('modal-group-admin');
    const superTabBtn = document.getElementById('btn-group-tab-superadmin') as HTMLButtonElement | null;
    superTabBtn?.click();
    expect(superTabBtn?.classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-group-superadmin')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-group-list')?.classList.contains('active')).toBe(false);
  });

  it('opens modal-login from modal-menu natively and closes modal-menu cleanly', () => {
    openModal('modal-menu');
    expect(document.getElementById('modal-menu')?.classList.contains('active')).toBe(true);
    const loginBtn = document.getElementById('btn-login-menu-sheet') as HTMLButtonElement | null;
    loginBtn?.click();
    expect(document.getElementById('modal-menu')?.classList.contains('active')).toBe(false);
    expect(document.getElementById('modal-login')?.classList.contains('active')).toBe(true);
  });
});
