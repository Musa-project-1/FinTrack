import { describe, expect, it, afterEach } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import App from '../../src/svelte/App.svelte';

const MODAL_IDS = [
  'modal-transaksi', 'modal-edit-transaksi', 'modal-quickpay', 'modal-bayar-anggota',
  'modal-struk', 'modal-hapus', 'modal-confirm-action',
  'modal-kelola-master', 'modal-edit-master-anggota', 'modal-edit-master-kategori',
  'modal-export', 'modal-profil-anggota',
  'modal-menu', 'modal-login', 'modal-logout', 'modal-group-pin',
  'modal-groups', 'modal-group-admin', 'modal-group-credentials',
  'modal-audit-log', 'modal-offline-queue', 'modal-tampilan', 'modal-about', 'modal-faq',
];

describe('Phase 2 Live App.svelte Workspace Shell', () => {
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

  it('mounts live WorkspaceShell, critical smoke selectors, and all 24 canonical dialogs', () => {
    host = document.createElement('div');
    host.id = 'app';
    document.body.appendChild(host);

    instance = mount(App, { target: host });
    flushSync();

    for (const id of [
      'app-group-name', 'group-overview', 'group-overview-name', 'ui-saldo',
      'bento-compliance', 'ui-table-rekap', 'iuran-cards-mobile',
      'btn-header-menu', 'bottom-nav', 'toast-container',
    ]) {
      expect(document.getElementById(id), `missing #${id}`).not.toBeNull();
    }

    for (const modalId of MODAL_IDS) {
      const el = document.getElementById(modalId);
      expect(el, `missing canonical dialog #${modalId}`).not.toBeNull();
      expect(el?.tagName).toBe('DIALOG');
    }
  });
});
