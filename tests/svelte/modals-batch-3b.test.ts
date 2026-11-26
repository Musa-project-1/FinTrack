import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { openModal, showConfirmDialog } from '../../src/svelte/ui/modal';
import App from '../../src/svelte/App.svelte';

describe('Phase 3 Batch 3B — Cash & Dues Modals (Native Svelte Handlers)', () => {
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

  it('closes modal-quickpay, modal-bayar-anggota, and modal-struk natively via Svelte onclick', () => {
    for (const id of ['modal-quickpay', 'modal-bayar-anggota', 'modal-struk']) {
      openModal(id);
      expect(document.getElementById(id)?.classList.contains('active')).toBe(true);
      const closeBtn = document.querySelector(`#${id} .close-modal-btn`) as HTMLButtonElement | null;
      closeBtn?.click();
      expect(document.getElementById(id)?.classList.contains('active')).toBe(false);
    }
  });

  it('switches modal-transaksi tabs (Iuran <-> Operasional) natively via Svelte onclick', () => {
    openModal('modal-transaksi');
    const opsBtn = document.getElementById('btn-tab-operasional') as HTMLButtonElement | null;
    opsBtn?.click();
    expect(opsBtn?.classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-operasional')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-iuran')?.classList.contains('active')).toBe(false);

    const closeBtn = document.querySelector('#modal-transaksi .close-modal-btn') as HTMLButtonElement | null;
    closeBtn?.click();
    expect(document.getElementById('modal-transaksi')?.classList.contains('active')).toBe(false);
  });

  it('executes and cancels modal-confirm-action natively via Svelte onclick', () => {
    const onConfirm = vi.fn();
    showConfirmDialog({ title: 'Simpan?', message: 'Lanjut?', onConfirm });
    expect(document.getElementById('modal-confirm-action')?.classList.contains('active')).toBe(true);

    const submitBtn = document.getElementById('btn-confirm-action-submit') as HTMLButtonElement | null;
    submitBtn?.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(document.getElementById('modal-confirm-action')?.classList.contains('active')).toBe(false);

    const onCancelTest = vi.fn();
    showConfirmDialog({ title: 'Batal?', message: 'Test', onConfirm: onCancelTest });
    const cancelBtn = document.querySelector('#modal-confirm-action [data-action="cancel-confirm-action"]') as HTMLButtonElement | null;
    cancelBtn?.click();
    expect(onCancelTest).not.toHaveBeenCalled();
    expect(document.getElementById('modal-confirm-action')?.classList.contains('active')).toBe(false);
  });
});
