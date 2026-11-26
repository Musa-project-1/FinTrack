/**
 * @module stores/app.svelte
 * Unified Svelte 5 reactive mirror of framework-free `src/svelte/core/state.ts`.
 * Subscribes once to `subscribeState()` so Svelte components react automatically
 * to ledger, group, session, view, and storage mutations without `renderAll()`.
 */
import type { Anggota, Kategori, PaymentAccount, Transaksi } from '../../types/finkas';
import {
  currentHistoryFilter,
  currentRekapYear,
  getActiveGroupId,
  getAdminEmail,
  getAdminRole,
  getAdminViewMode,
  getGroupName,
  getGroups,
  getIsAdminSession,
  getIsAdminView,
  getIsSuperAdmin,
  getIsSuperAdminView,
  getState,
  getStorageStatus,
  subscribeState,
} from '../core/state';

export interface GroupSummary {
  id: string;
  nama: string;
  dibuat?: string;
}

export interface StorageStatusSnapshot {
  groupId: string;
  state: string;
  operation: string | null;
  error: string | null;
}

class AppStore {
  anggota = $state<Anggota[]>([]);
  kategori = $state<Kategori[]>([]);
  transaksi = $state<Transaksi[]>([]);
  skippedMonths = $state<string[]>([]);
  kasStart = $state<string>('');
  paymentAccount = $state<PaymentAccount | null>(null);

  activeGroupId = $state<string>('');
  groups = $state<GroupSummary[]>([]);

  isAdminSession = $state<boolean>(false);
  isAdminView = $state<boolean>(false);
  isSuperAdmin = $state<boolean>(false);
  isSuperAdminView = $state<boolean>(false);
  adminRole = $state<string>('');
  adminEmail = $state<string>('');
  adminViewMode = $state<'admin' | 'anggota'>('anggota');

  rekapYear = $state<string>('');
  historyFilter = $state<string>('semua');
  storageStatus = $state<StorageStatusSnapshot>({
    groupId: '',
    state: 'unknown',
    operation: null,
    error: null,
  });
  revision = $state<number>(0);

  activeGroupName = $derived.by(() =>
    this.activeGroupId ? getGroupName(this.activeGroupId) : ''
  );

  constructor() {
    this.syncFromCore();
    subscribeState(() => {
      this.syncFromCore();
    });
  }

  syncFromCore(): void {
    const core = getState();
    this.anggota = [...core.anggota];
    this.kategori = [...core.kategori];
    this.transaksi = [...core.transaksi];
    this.skippedMonths = [...core.skippedMonths];
    this.kasStart = core.kasStart;
    this.paymentAccount = core.paymentAccount ? { ...core.paymentAccount } : null;

    this.activeGroupId = getActiveGroupId();
    this.groups = [...getGroups()];

    this.isAdminSession = getIsAdminSession();
    this.isAdminView = getIsAdminView();
    this.isSuperAdmin = getIsSuperAdmin();
    this.isSuperAdminView = getIsSuperAdminView();
    this.adminRole = getAdminRole();
    this.adminEmail = getAdminEmail();
    this.adminViewMode = getAdminViewMode();

    this.rekapYear = currentRekapYear;
    this.historyFilter = currentHistoryFilter;
    this.storageStatus = getStorageStatus();
    this.revision += 1;
  }
}

export const appStore = new AppStore();
