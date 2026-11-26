/**
 * @module action-router
 * Delegated `[data-action]` DOM click router for dynamically rendered Svelte islands,
 * sync actions, and SuperAdmin/Admin security guards. Static shell and modal buttons
 * use native Svelte `onclick` handlers directly.
 */

import { getIsAdminSession, getIsSuperAdmin, getActiveGroupId } from "finkas/core/state";
import { closestHtml, showToast } from "finkas/core/utils";
import { syncOfflineTransactions, deleteOfflineTransaction } from "finkas/core/offline";
import { runManualSyncRekap } from "finkas/core/sync";
import { openModal, closeModal, closeHeaderDropdown } from "./ui/modal";
import { renderChart, toggleIuranCard } from "./stores/workspace-sync";
import { openQuickPaySheet, bukaModalTransaksi } from "./handlers/transactions";
import {
  removeSkippedMonth, openKelolaMasterModal,
  bukaModalEditMasterAnggota, bukaModalEditMasterKategori
} from "./handlers/master";
import { renderOfflineQueueList, openOfflineQueueModal } from "./handlers/offlineQueue";
import { exportToCSV, createGroupReminderMessage } from "./handlers/export";
import { bukaProfilAnggota } from "./handlers/profile";
import { openSelfPay } from "./handlers/self-pay";
import { openReceipt, openMonthReceipt } from "./handlers/receipt";
import { showSpotlightDetail, setMemberPin, toggleMemberPin } from "./stores/spotlight.svelte";
import { toggleBulkMode } from "./ui/bulk-dues";
import { switchWorkspace, openWorkspaceHistory } from "./ui/workspace";
import {
  requestGroupPin, resetGroupPinAction, removeGroupAction, renameGroupAction,
  manageGroupCredsAction, copyGroupWhatsAppAction, removeSuperAdminAction, clearLatestCreds
} from "./handlers/groups";

export interface AppActionRouterDeps {
  loadWorkspace: (forceRemote?: boolean, isUserInitiated?: boolean) => Promise<boolean>;
  isLoading: () => boolean;
  initApp: (forceRemote?: boolean, isUserInitiated?: boolean) => Promise<void>;
}

/** Attach the delegated `[data-action]` click listener for dynamic islands and security guards. */
export function attachAppActionRouter(deps: AppActionRouterDeps): void {
  document.addEventListener('click', (e) => {
    const target = closestHtml(e.target, '[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action') || '';
    const id = target.getAttribute('data-id') || '';
    const month = target.getAttribute('data-month');
    const anggota = target.getAttribute('data-anggota');
    const bulan = target.getAttribute('data-bulan');

    switch (action) {
      /* ── Dynamic group list & SuperAdmin guards ────── */
      case 'request-group-pin': requestGroupPin(id); break;
      case 'rename-group':      renameGroupAction(id); break;
      case 'reset-group-pin':   resetGroupPinAction(id); break;
      case 'manage-group-creds':
        if (!getIsSuperAdmin()) { showToast('Hanya Super Admin yang dapat mengelola akun admin grup.', 'error'); break; }
        manageGroupCredsAction(id);
        break;
      case 'copy-cred-wa':
        if (!getIsSuperAdmin()) { showToast('Hanya Super Admin yang dapat menyalin kredensial grup.', 'error'); break; }
        copyGroupWhatsAppAction(target);
        break;
      case 'remove-superadmin-email': removeSuperAdminAction(target.getAttribute('data-email')); break;
      case 'remove-group':      removeGroupAction(id); break;

      /* ── Dynamic dashboard islands ─────────────────── */
      case 'bulk-toggle':       toggleBulkMode(switchWorkspace); break;
      case 'bento-history':     openWorkspaceHistory(target.dataset.filter); break;
      case 'spotlight-month':   showSpotlightDetail(Number(target.dataset.index)); break;
      case 'spotlight-unpin':   setMemberPin('', true); break;
      case 'toggle-member-pin': toggleMemberPin(id); break;
      case 'spotlight-pay':     showSpotlightDetail('pay'); break;
      case 'select-rekap-year': {
        const select = target.closest('.year-pill')?.querySelector('select');
        if (!select || !target.dataset.year) break;
        select.value = target.dataset.year;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
      case 'open-kelola-master': closeHeaderDropdown(); openKelolaMasterModal(); break;
      case 'edit-master-anggota': e.stopPropagation(); bukaModalEditMasterAnggota(id); break;
      case 'edit-master-kategori': e.stopPropagation(); bukaModalEditMasterKategori(id); break;
      case 'buka-transaksi':    bukaModalTransaksi(); break;
      case 'export-csv':        exportToCSV(target); break;
      case 'print-reminder':    createGroupReminderMessage(target); break;

      /* ── Dynamic dues cells, passbook & receipts ───── */
      case 'open-self-pay':     openSelfPay(id, month === null ? undefined : Number(month), Number(target.dataset.year)); break;
      case 'open-month-receipt': openMonthReceipt(id, Number(month), Number(target.dataset.year)); break;
      case 'open-receipt':      openReceipt(id); break;
      case 'profil':            e.stopPropagation(); bukaProfilAnggota(id); break;
      case 'quickpay':
      case 'quickpay-card':     e.stopPropagation(); if (anggota && bulan) openQuickPaySheet(anggota, bulan, target.dataset.year); break;
      case 'toggle-card':       toggleIuranCard(target.closest('.iuran-member-card')); break;
      case 'remove-skip':       removeSkippedMonth(month); break;

      /* ── Attachments (dedicated listeners) ─────────── */
      case 'upload-attachment':
      case 'download-attachment':
      case 'delete-attachment':
        break;

      /* ── Modal close & credential scrub fallback ───── */
      case 'close-modal': {
        const modalEl = target.closest('.modal-overlay');
        if (modalEl?.id) {
          closeModal(modalEl.id);
          if (modalEl.id === 'modal-group-credentials') clearLatestCreds();
        }
        break;
      }

      /* ── Sync & Admin-guarded offline queue ────────── */
      case 'sync-rekap-data':
        runManualSyncRekap(deps.loadWorkspace, deps.isLoading);
        break;
      case 'open-offline-queue':
        if (!getIsAdminSession()) { showToast('Hanya pengurus yang dapat melihat antrean offline.', 'error'); openModal('modal-login'); break; }
        openOfflineQueueModal();
        break;
      case 'sync-now':
        if (!getIsAdminSession()) { showToast('Hanya pengurus yang dapat menyinkronkan antrean offline.', 'error'); break; }
        syncOfflineTransactions(() => { deps.initApp(); renderChart(); });
        break;
      case 'delete-offline-item': {
        if (!getIsAdminSession()) { showToast('Hanya pengurus yang dapat menghapus antrean offline.', 'error'); break; }
        const itemId = parseInt(target.dataset.itemId || '', 10);
        const groupId = getActiveGroupId();
        if (!groupId?.trim()) break;
        deleteOfflineTransaction(itemId, groupId).then(() => { renderOfflineQueueList(); });
        break;
      }
    }
  });
}
