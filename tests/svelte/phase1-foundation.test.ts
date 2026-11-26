import { describe, expect, it, beforeEach } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import {
  clearAdminSession,
  setActiveGroupId,
  setAdminRole,
  setAdminSession,
  setAdminViewMode,
  setCurrentHistoryFilter,
  setCurrentRekapYear,
  setGroups,
  setState,
} from '../../src/svelte/core/state';
import { appStore } from '../../src/svelte/stores/app.svelte';
import { modalStore } from '../../src/svelte/stores/modal.svelte';
import ModalDialog from '../../src/svelte/components/ModalDialog.svelte';

describe('Phase 1 Reactive Foundation', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAdminSession();
    setGroups([]);
    setActiveGroupId('');
    setState({ anggota: [], kategori: [], transaksi: [], skippedMonths: [], kasStart: '', paymentAccount: null });
    modalStore.closeAll();
  });

  it('appStore reacts to core state, session, view, and group switch resets', () => {
    setGroups([
      { id: 'GRP-A', nama: 'RT 05 Melati' },
      { id: 'GRP-B', nama: 'Kas Kelas 12' },
    ]);
    setActiveGroupId('GRP-A');
    setState({
      anggota: [{ ID_Anggota: 'A1', Nama_Anggota: 'Budi', Status_Aktif: 'Aktif' }],
      transaksi: [{
        ID_Transaksi: 'TX-1',
        Nominal: 50000,
        Tipe_Arus: 'Masuk',
        Timestamp: '2026-09-01T10:00:00+07:00',
      }],
    });

    expect(appStore.activeGroupId).toBe('GRP-A');
    expect(appStore.activeGroupName).toBe('RT 05 Melati');
    expect(appStore.anggota).toHaveLength(1);
    expect(appStore.transaksi).toHaveLength(1);

    setAdminSession('tok-admin');
    setAdminRole('superadmin');
    expect(appStore.isAdminSession).toBe(true);
    expect(appStore.isAdminView).toBe(true);
    expect(appStore.isSuperAdminView).toBe(true);

    setAdminViewMode('anggota');
    expect(appStore.isAdminSession).toBe(true);
    expect(appStore.isAdminView).toBe(false);
    expect(appStore.adminViewMode).toBe('anggota');

    setCurrentRekapYear(2025);
    setCurrentHistoryFilter('masuk');
    expect(appStore.rekapYear).toBe('2025');
    expect(appStore.historyFilter).toBe('masuk');

    // Switching groups resets ledger and view filters automatically.
    setActiveGroupId('GRP-B');
    expect(appStore.activeGroupId).toBe('GRP-B');
    expect(appStore.activeGroupName).toBe('Kas Kelas 12');
    expect(appStore.anggota).toHaveLength(0);
    expect(appStore.transaksi).toHaveLength(0);
    expect(appStore.historyFilter).toBe('semua');
  });

  it('modalStore manages stack order, payloads, and idempotent open/close', () => {
    expect(modalStore.activeModalId).toBeNull();
    expect(modalStore.hasOpenModal).toBe(false);

    modalStore.open('modal-groups');
    modalStore.open('modal-confirm-action', { title: 'Hapus?' });
    expect(modalStore.activeModalId).toBe('modal-confirm-action');
    expect(modalStore.isOpen('modal-groups')).toBe(true);
    expect(modalStore.getPayload<{ title: string }>('modal-confirm-action')?.title).toBe('Hapus?');

    // Re-opening an existing modal promotes it to the top of the stack.
    modalStore.open('modal-groups');
    expect(modalStore.activeModalId).toBe('modal-groups');
    expect(modalStore.stack).toEqual(['modal-confirm-action', 'modal-groups']);

    modalStore.close();
    expect(modalStore.activeModalId).toBe('modal-confirm-action');
    modalStore.close('modal-confirm-action');
    expect(modalStore.hasOpenModal).toBe(false);
    expect(modalStore.getPayload('modal-confirm-action')).toBeUndefined();
  });

  it('ModalDialog preserves canonical id, mounts body only when open, and closes on cancel', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const instance = mount(ModalDialog, {
      target: host,
      props: { id: 'modal-about', ariaLabel: 'Tentang Finkas' },
    });
    flushSync();

    const dialog = document.getElementById('modal-about') as HTMLDialogElement | null;
    expect(dialog).not.toBeNull();
    expect(dialog?.classList.contains('active')).toBe(false);

    modalStore.open('modal-about');
    flushSync();
    expect(dialog?.classList.contains('active')).toBe(true);
    expect(document.body.classList.contains('modal-open')).toBe(true);

    dialog?.dispatchEvent(new Event('cancel', { cancelable: true }));
    flushSync();
    expect(modalStore.isOpen('modal-about')).toBe(false);
    expect(dialog?.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('modal-open')).toBe(false);

    unmount(instance);
    host.remove();
  });
});
