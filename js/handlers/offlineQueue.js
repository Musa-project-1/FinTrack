import { getOfflineTransactions, deleteOfflineTransaction, syncOfflineTransactions } from "../offline.js";
import { formatRp, showToast, escapeHtml } from "../utils.js";
import { openModal, closeModal } from "../modal.js";

export const renderOfflineQueueList = async () => {
  const container = document.getElementById('offline-queue-list');
  if (!container) return;
  container.innerHTML = '';
  try {
    const queued = await getOfflineTransactions();
    if (!queued || queued.length === 0) {
      container.innerHTML = '<div class="text-muted">Tidak ada transaksi tertunda.</div>';
      return;
    }
    queued.reverse().forEach((item) => {
      const card = document.createElement('div');
      card.className = 'pending-item';
      const t = new Date(item.queuedAt).toLocaleString('id-ID');
      const action = item.payload?.action || 'unknown';
      card.innerHTML = `
        <div class="pending-card-row">
          <div class="flex-1">
            <div class="pending-card-action">${escapeHtml(action)}</div>
            <div class="pending-card-time">${t}</div>
            <div class="pending-card-payload">${JSON.stringify(item.payload.dataForm || item.payload || {})}</div>
          </div>
          <div class="flex-align-gap">
            <button class="btn btn-outline" data-action="delete-offline-item" data-item-id="${item.id}">Hapus</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Gagal memuat daftar.</div>';
  }
};

export const openOfflineQueueModal = async () => {
  await renderOfflineQueueList();
  openModal('modal-offline-queue');
};

/* ══════════════════════════════════════════════════════════════════
   PRINT RECEIPT / REPORT
   ══════════════════════════════════════════════════════════════════ */

