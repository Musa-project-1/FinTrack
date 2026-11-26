import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { openModal } from '../../src/svelte/ui/modal';
import App from '../../src/svelte/App.svelte';

describe('Phase 3 Batch 3C — Master, Reports & System Modals (Native Svelte Handlers)', () => {
  let host: HTMLDivElement | null = null;
  let instance: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    localStorage.clear();
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

  it('switches tabs natively inside modal-kelola-master, modal-export, and modal-faq', () => {
    openModal('modal-kelola-master');
    const katBtn = document.getElementById('btn-master-tab-kategori') as HTMLButtonElement | null;
    katBtn?.click();
    expect(katBtn?.classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-master-kategori')?.classList.contains('active')).toBe(true);
    (document.querySelector('#modal-kelola-master .close-modal-btn') as HTMLButtonElement | null)?.click();
    expect(document.getElementById('modal-kelola-master')?.classList.contains('active')).toBe(false);

    openModal('modal-export');
    const eksporBtn = document.getElementById('btn-tab-ekspor-lain') as HTMLButtonElement | null;
    eksporBtn?.click();
    expect(eksporBtn?.classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-ekspor-lain')?.classList.contains('active')).toBe(true);
    (document.querySelector('#modal-export .close-modal-btn') as HTMLButtonElement | null)?.click();
    expect(document.getElementById('modal-export')?.classList.contains('active')).toBe(false);

    openModal('modal-faq');
    const faqBtn = document.querySelector('#modal-faq [data-tab="faq-questions"]') as HTMLButtonElement | null;
    faqBtn?.click();
    expect(faqBtn?.classList.contains('active')).toBe(true);
    (document.querySelector('#modal-faq .close-modal-btn') as HTMLButtonElement | null)?.click();
    expect(document.getElementById('modal-faq')?.classList.contains('active')).toBe(false);
  });

  it('applies palette & texture preferences natively from modal-tampilan and closes cleanly', () => {
    openModal('modal-tampilan');
    const indigoBtn = document.querySelector('#palette-picker [data-palette="indigo"]') as HTMLButtonElement | null;
    indigoBtn?.click();
    expect(document.body.dataset.palette).toBe('indigo');

    const paperBtn = document.querySelector('#texture-picker [data-texture="paper"]') as HTMLButtonElement | null;
    paperBtn?.click();
    expect(document.body.dataset.canvas).toBe('paper');

    const closeBtn = document.getElementById('tampilan-close-btn') as HTMLButtonElement | null;
    closeBtn?.click();
    expect(document.getElementById('modal-tampilan')?.classList.contains('active')).toBe(false);
  });

  it('closes modal-audit-log, modal-offline-queue, and modal-profil-anggota natively via Svelte onclick', () => {
    for (const id of ['modal-audit-log', 'modal-offline-queue', 'modal-profil-anggota']) {
      openModal(id);
      expect(document.getElementById(id)?.classList.contains('active')).toBe(true);
      const closeBtn = document.querySelector(`#${id} .close-modal-btn`) as HTMLButtonElement | null;
      closeBtn?.click();
      expect(document.getElementById(id)?.classList.contains('active')).toBe(false);
    }
  });
});
