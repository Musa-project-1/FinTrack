/**
 * @module action-router
 * Delegated `[data-action]` DOM click router for Finkas workspace.
 */

import { getIsAdminView, getState, getActiveGroupId } from "finkas/core/state";
import { getInput, getSelect, closestHtml, showToast } from "finkas/core/utils";
import { syncOfflineTransactions, deleteOfflineTransaction } from "finkas/core/offline";
import { runManualSyncRekap } from "finkas/core/sync";
import { toggleTheme, setTheme, setPalette, setBgTexture, setLanguage } from "./ui/theme";
import {
  openModal, closeModal, switchTab, closeHeaderDropdown,
  closeConfirmDialog, executeConfirmAction
} from "./ui/modal";
import { flashDownloadRing } from "./ui/ui-moments";
import { renderChart, bukaProfilAnggota, toggleIuranCard } from "./render/index";
import {
  setAdminViewModeAction, logoutAdminAction,
  loginGoogleSuperAdminAction, handleStealthBadgeClick
} from "./handlers/auth";
import {
  setBottomNavActive, closeActiveModal, setHistoryFilter, openTampilanModal,
  openDuesLegend, setIndicatorStyle, setPrivacyMode, setCurrencyFormat,
  openCommandHubModal
} from "./handlers/navigation";
import {
  openQuickPaySheet, bukaModalTransaksi, bukaModalEdit,
  konfirmasiHapus, eksekusiHapus
} from "./handlers/transactions";
import {
  openSkippedMonthsModal, renderAuditLogList, openAuditLogModal,
  addSkippedMonth, removeSkippedMonth, saveKasStart, openKelolaMasterModal,
  toggleStatusAnggotaAction, hapusMasterAnggotaAction, hapusMasterKategoriAction,
  bukaModalEditMasterAnggota, bukaModalEditMasterKategori
} from "./handlers/master";
import { renderOfflineQueueList, openOfflineQueueModal } from "./handlers/offlineQueue";
import {
  cetakStruk, cetakLaporanTahunan, copyMonthlyRecap,
  exportToCSV, createGroupReminderMessage
} from "./handlers/export";
import { printMonthlyCashReport, exportMonthlyCashCSV } from "./handlers/cash-report";
import { copyPassbook } from "./render/profile";
import { openSelfPay, selectSelfPayPreset, copySelfPay } from "./handlers/self-pay";
import {
  copyReceipt, openReceipt, openMonthReceipt, downloadReceiptAttachment
} from "./render/receipt";
import { exportJSONBackup } from "./handlers/backup";
import { playKasiAction } from "./ui/kasi-mascot";
import { startGuidedTour, advanceGuidedTour } from "./ui/guided-tour";
import { filterDuesStatus } from "./stores/rekap.svelte";
import {
  showSpotlightDetail, getPinnedMemberId, setMemberPin, toggleMemberPin
} from "./stores/spotlight.svelte";
import { toggleBulkMode, reviewBulkDues } from "./ui/bulk-dues";
import { switchWorkspace, openWorkspaceHistory } from "./ui/workspace";
import {
  openGroupPicker, exitGroup, requestGroupPin, submitGroupPin, openGroupAdmin,
  resetGroupPinAction, removeGroupAction, renameGroupAction, manageGroupCredsAction,
  copyGroupWhatsAppAction, removeSuperAdminAction
} from "./handlers/groups";

export interface AppActionRouterDeps {
  loadWorkspace: (forceRemote?: boolean, isUserInitiated?: boolean) => Promise<boolean>;
  isLoading: () => boolean;
  initApp: (forceRemote?: boolean, isUserInitiated?: boolean) => Promise<void>;
}

/** Attach the global delegated `[data-action]` click listener for the workspace. */
export function attachAppActionRouter(deps: AppActionRouterDeps): void {
  document.addEventListener('click', (e) => {
    const target = closestHtml(e.target, '[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action') || '';

    // Menu sheet: close itself before opening the target modal (no stacking)
    if (target.closest('#modal-menu') && action !== 'close-modal' && !['logout', 'close-dropdown'].includes(action)) {
      closeModal('modal-menu');
    }
    const id = target.getAttribute('data-id') || '';
    const month = target.getAttribute('data-month');
    const anggota = target.getAttribute('data-anggota');
    const bulan = target.getAttribute('data-bulan');

    switch (action) {
      /* ── Multi-grup: pilih + PIN + kelola ─────────────── */
      case 'open-groups':       openGroupPicker(); break;
      case 'exit-group':        exitGroup(); break;
      case 'request-group-pin': requestGroupPin(id); break;
      case 'submit-group-pin':  submitGroupPin(); break;
      case 'open-group-admin':  closeHeaderDropdown(); openGroupAdmin(); break;
      case 'rename-group':      renameGroupAction(id); break;
      case 'reset-group-pin':   resetGroupPinAction(id); break;
      case 'manage-group-creds': manageGroupCredsAction(id); break;
      case 'copy-cred-wa':      copyGroupWhatsAppAction(target); break;
      case 'remove-superadmin-email': removeSuperAdminAction(target.getAttribute('data-email')); break;
      case 'remove-group':      removeGroupAction(id); break;

      /* ── Navigation / menus ───────────────────────── */
      case 'bulk-toggle': toggleBulkMode(switchWorkspace); break;
      case 'bulk-review': reviewBulkDues(bukaModalTransaksi); break;
      case 'bento-history': openWorkspaceHistory(target.dataset.filter); break;
      case 'spotlight-month': showSpotlightDetail(Number(target.dataset.index)); break;
      case 'spotlight-unpin': setMemberPin('', true); break;
      case 'toggle-member-pin': toggleMemberPin(id); break;
      case 'spotlight-pay': showSpotlightDetail('pay'); break;
      case 'select-rekap-year': {
        const select = target.closest('.year-pill')?.querySelector('select');
        if (!select || !target.dataset.year) break;
        select.value = target.dataset.year;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
      case 'filter-dues-status': filterDuesStatus(target.dataset.statusFilter || 'all'); break;
      case 'switch-workspace': switchWorkspace(target.dataset.panel); break;
      case 'select-palette': setPalette(target.dataset.palette, e, target); break;
      case 'select-language': setLanguage(target.dataset.lang === 'en' ? 'en' : 'id'); break;
      case 'set-role-view': setAdminViewModeAction(target.dataset.role); break;
      case 'toggle-privacy': setPrivacyMode(document.body.classList.contains('privacy-mode') ? 'off' : 'on'); break;
      case 'toggle-theme':      toggleTheme(e, target); break;
      case 'open-about':        openModal('modal-about'); break;
      case 'open-dues-legend': openDuesLegend(); break;
      case 'open-faq':          openModal('modal-faq'); break;
      case 'start-guided-tour': startGuidedTour(); break;
      case 'guided-tour-step': advanceGuidedTour(target.dataset.step); break;
      case 'kasi-action': target.dataset.kasi === 'guide' ? startGuidedTour() : playKasiAction(target.dataset.kasi); break;
      case 'open-stamp-settings': openTampilanModal('tampilan-indikator'); break;
      case 'open-tampilan':     openTampilanModal(); break;
      case 'select-indicator-style': setIndicatorStyle(target.getAttribute('data-style')); break;
      case 'select-currency-format': setCurrencyFormat(target.getAttribute('data-format')); break;
      case 'select-theme-mode': {
        const theme = target.dataset.theme;
        if (theme === 'auto' || theme === 'light' || theme === 'dark') setTheme(theme, e, target);
        break;
      }
      case 'select-texture': setBgTexture(target.getAttribute('data-texture')); break;
      case 'toggle-mobile-menu':
      case 'open-menu-modal':
      case 'toggle-dropdown':   openCommandHubModal(); break;
      case 'install-pwa':
        if (window.__pwaPrompt) window.__pwaPrompt.prompt();
        else showToast('Gunakan opsi Add to Home Screen di browser Anda.', 'info');
        break;
      case 'close-dropdown':    closeHeaderDropdown(); break;
      case 'open-login':        closeHeaderDropdown(); openModal('modal-login'); break;
      case 'stealth-badge-click': handleStealthBadgeClick(); break;
      case 'login-google-superadmin': loginGoogleSuperAdminAction(); break;
      case 'open-offline-queue': openOfflineQueueModal(); break;
      case 'open-skipped-months': openSkippedMonthsModal(); break;
      case 'open-audit-log':    closeHeaderDropdown(); openAuditLogModal(); break;
      case 'refresh-audit-log': renderAuditLogList(); break;
      case 'open-kelola-master': closeHeaderDropdown(); openKelolaMasterModal(); break;
      case 'edit-master-anggota': e.stopPropagation(); bukaModalEditMasterAnggota(id); break;
      case 'edit-master-kategori': e.stopPropagation(); bukaModalEditMasterKategori(id); break;
      case 'toggle-status-anggota': toggleStatusAnggotaAction(id, target.getAttribute('data-status')); break;
      case 'hapus-master-anggota': hapusMasterAnggotaAction(id); break;
      case 'hapus-master-kategori': hapusMasterKategoriAction(id); break;
      case 'toggle-status-from-modal': {
        const idAng = getInput('edit-master-anggota-id')?.value;
        const nextSt = getSelect('edit-master-status-select')?.value;
        if (idAng && nextSt) {
          closeModal('modal-edit-master-anggota');
          toggleStatusAnggotaAction(idAng, nextSt);
        }
        break;
      }
      case 'view-profil-from-modal': {
        const idAng = getInput('edit-master-anggota-id')?.value;
        if (idAng) {
          closeModal('modal-edit-master-anggota');
          bukaProfilAnggota(idAng);
        }
        break;
      }
      case 'hapus-anggota-from-modal': {
        const idAng = getInput('edit-master-anggota-id')?.value;
        if (idAng) {
          closeModal('modal-edit-master-anggota');
          hapusMasterAnggotaAction(idAng);
        }
        break;
      }
      case 'hapus-kategori-from-modal': {
        const idKat = getInput('edit-master-kategori-id')?.value;
        if (idKat) {
          closeModal('modal-edit-master-kategori');
          hapusMasterKategoriAction(idKat);
        }
        break;
      }
      case 'open-history':      closeHeaderDropdown(); switchWorkspace('history'); document.getElementById('workspace-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'open-statistik':    closeHeaderDropdown(); switchWorkspace('stats'); document.getElementById('workspace-stats')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'open-export':       closeHeaderDropdown(); openModal('modal-export'); break;
      case 'buka-transaksi':    bukaModalTransaksi(); break;

      /* ── Bottom navigation (mobile) ───────────────── */
      case 'nav-stats':
        closeActiveModal(); switchWorkspace('stats'); document.getElementById('workspace-stats')?.scrollIntoView(); break;
      case 'nav-pay':
        openSelfPay(getPinnedMemberId() || getState().anggota.find((person) => person.Status_Aktif === 'Aktif')?.ID_Anggota);
        break;
      case 'nav-riwayat':       closeActiveModal(); switchWorkspace('history'); setBottomNavActive('nav-riwayat'); document.getElementById('workspace-history')?.scrollIntoView(); break;
      case 'nav-rekap': {
        closeActiveModal();
        switchWorkspace('iuran');
        setBottomNavActive('nav-rekap');
        const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
        document.getElementById('section-rekap')?.scrollIntoView({ behavior });
        break;
      }
      case 'nav-catat':
        setBottomNavActive('nav-catat');
        if (getIsAdminView()) bukaModalTransaksi();
        else openModal('modal-login');
        break;
      case 'nav-menu':
        setBottomNavActive('nav-menu');
        openCommandHubModal();
        break;

      /* ── Modals ───────────────────────────────────── */
      case 'close-modal': {
        const modalEl = target.closest('.modal-overlay');
        if (modalEl?.id) closeModal(modalEl.id);
        break;
      }
      case 'switch-tab': {
        const modal = target.closest('.modal-content')?.closest('.modal-overlay');
        if (modal && target.dataset.tab) switchTab(target.dataset.tab, modal.id);
        break;
      }

      /* ── Member profile ───────────────────────────── */
      case 'open-self-pay': openSelfPay(id, month === null ? undefined : Number(month), Number(target.dataset.year)); break;
      case 'self-pay-preset': selectSelfPayPreset(target.dataset.preset); break;
      case 'self-pay-copy': copySelfPay(target.dataset.copy, target); break;
      case 'passbook-copy': copyPassbook(target); break;
      case 'open-month-receipt': openMonthReceipt(id, Number(month), Number(target.dataset.year)); break;
      case 'open-receipt': openReceipt(id); break;
      case 'copy-receipt': copyReceipt(target); break;
      case 'receipt-attachment': if (target instanceof HTMLButtonElement) downloadReceiptAttachment(target); break;
      case 'profil':            e.stopPropagation(); bukaProfilAnggota(id); break;

      /* ── Transaction actions ──────────────────────── */
      case 'cetak':             e.stopPropagation(); cetakStruk(id); break;
      case 'edit':              e.stopPropagation(); closeModal('modal-struk', true); bukaModalEdit(id); break;
      case 'hapus':             e.stopPropagation(); konfirmasiHapus(id); break;
      case 'cetak-dari-edit': {
        const idTrx = getInput('edit-id')?.value;
        if (idTrx) cetakStruk(idTrx);
        break;
      }
      case 'hapus-dari-edit': {
        const idTrx = getInput('edit-id')?.value;
        if (idTrx) {
          closeModal('modal-edit-transaksi', true);
          konfirmasiHapus(idTrx);
        }
        break;
      }

      /* ── Quick pay ────────────────────────────────── */
      case 'quickpay':
      case 'quickpay-card':     e.stopPropagation(); if (anggota && bulan) openQuickPaySheet(anggota, bulan, target.dataset.year); break;

      /* ── Mobile card accordion ────────────────────── */
      case 'toggle-card':       toggleIuranCard(target.closest('.iuran-member-card')); break;

      /* ── Skipped months ───────────────────────────── */
      case 'add-skip':          addSkippedMonth(); break;
      case 'remove-skip':       removeSkippedMonth(month); break;
      case 'save-kas-start':    saveKasStart(); break;

      /* ── Transaction attachments ───────────────────── */
      case 'upload-attachment':
      case 'download-attachment':
      case 'delete-attachment':
        /* Handled by dedicated event listeners in initAttachmentControls */
        break;

      /* ── History ──────────────────────────────────── */
      case 'set-history-filter': setHistoryFilter(target.dataset.filter); break;

      /* ── Export / Print ───────────────────────────── */
      case 'copy-monthly-recap': copyMonthlyRecap(target); break;
      case 'export-csv':        exportToCSV(target); break;
      case 'export-json-backup': exportJSONBackup(target); break;
      case 'print-annual':      cetakLaporanTahunan(); break;
      case 'print-reminder':
      case 'action-salin-tagihan-wa': createGroupReminderMessage(target); break;
      case 'print-monthly-report': printMonthlyCashReport(); break;
      case 'export-monthly-csv': {
        const res = exportMonthlyCashCSV();
        if (res?.exported) flashDownloadRing(target, 'Terunduh');
        break;
      }

      /* ── Login/Logout ─────────────────────────────── */
      case 'logout':            closeHeaderDropdown(); closeModal('modal-menu'); openModal('modal-logout'); break;
      case 'confirm-logout':    logoutAdminAction(); break;
      case 'cancel-logout':     closeModal('modal-logout'); break;

      /* ── Delete confirmation ──────────────────────── */
      case 'confirm-delete':    eksekusiHapus(); break;
      case 'cancel-delete':     closeModal('modal-hapus'); break;
      case 'confirm-action-submit': executeConfirmAction(); break;
      case 'cancel-confirm-action': closeConfirmDialog(); break;

      /* ── Sync rekap badge ─────────────────────────── */
      case 'sync-rekap-data':
        runManualSyncRekap(deps.loadWorkspace, deps.isLoading);
        break;

      /* ── Offline sync ─────────────────────────────── */
      case 'sync-now':          syncOfflineTransactions(() => { deps.initApp(); renderChart(); }); break;
      case 'refresh-offline':   renderOfflineQueueList(); break;
      case 'delete-offline-item': {
        const itemId = parseInt(target.dataset.itemId || '', 10);
        const groupId = getActiveGroupId();
        if (!groupId?.trim()) break;
        deleteOfflineTransaction(itemId, groupId).then(() => { renderOfflineQueueList(); });
        break;
      }
    }
  });
}
