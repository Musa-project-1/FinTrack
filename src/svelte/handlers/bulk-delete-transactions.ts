/**
 * @module handlers/bulk-delete-transactions
 * Admin-only multi-select bulk deletion for Riwayat Arus Kas transactions.
 * Reuses the audited, idempotent `hapusTransaksi` endpoint per transaction.
 */
import {
  getState, setState, saveCache, getIsAdminSession, getActiveGroupId
} from "finkas/core/state";
import { showToast, showDatabaseToast } from "finkas/core/utils";
import { deliverMutation, generateOperationId } from "finkas/core/mutation";
import { showConfirmDialog } from "../ui/modal";
import { historyStore, clearHistorySelection } from "../stores/history.svelte";
import { rerenderAfterLedgerChange } from "./transaction-shared";

export function confirmBulkDeleteTransactions(rawIds: string[]): void {
  if (!getIsAdminSession()) {
    showToast("Hanya admin grup yang berwenang menghapus transaksi.", "error");
    return;
  }
  const ids = [...new Set(rawIds.filter(Boolean))];
  if (!ids.length) return;

  const targetGroupId = getActiveGroupId();
  const count = ids.length;

  showConfirmDialog({
    title: `Hapus ${count} Transaksi?`,
    message: `Tindakan ini akan menghapus permanen ${count} transaksi terpilih dari buku kas. Tidak dapat dibatalkan.`,
    icon: "ph-fill ph-trash",
    badgeClass: "is-danger",
    confirmText: `Ya, Hapus ${count} Transaksi`,
    onConfirm: async () => {
      if (getActiveGroupId() !== targetGroupId) {
        showToast("Grup kas telah berganti. Operasi dibatalkan.", "warning");
        return;
      }
      historyStore.isDeleting = true;
      const deletedIds = new Set<string>();
      let offlineCount = 0;
      let failedCount = 0;

      try {
        for (const id of ids) {
          if (getActiveGroupId() !== targetGroupId) break;
          const operationId = generateOperationId();
          const { delivered, result } = await deliverMutation({
            action: "hapusTransaksi",
            operationId,
            idTransaksi: id,
            targetCollection: "Transaksi"
          });
          if (!delivered) {
            offlineCount += 1;
            deletedIds.add(id);
          } else if (result?.status) {
            deletedIds.add(id);
          } else {
            failedCount += 1;
          }
        }

        if (getActiveGroupId() !== targetGroupId) return;

        if (deletedIds.size > 0) {
          const remaining = (getState().transaksi || []).filter((t) => !deletedIds.has(t.ID_Transaksi));
          setState({ transaksi: remaining });
          saveCache();
          clearHistorySelection(true);
          rerenderAfterLedgerChange();
        }

        if (failedCount > 0 && deletedIds.size > 0) {
          showToast(`${deletedIds.size} transaksi dihapus, ${failedCount} gagal.`, "warning");
        } else if (failedCount > 0) {
          showToast(`Gagal menghapus ${failedCount} transaksi.`, "error");
        } else if (offlineCount > 0) {
          showDatabaseToast("Hapus Massal (Offline)", `${deletedIds.size} transaksi masuk antrean hapus lokal.`);
        } else {
          showDatabaseToast("Transaksi Dihapus", `${deletedIds.size} transaksi berhasil dihapus secara permanen.`);
        }
      } finally {
        historyStore.isDeleting = false;
      }
    }
  });
}
