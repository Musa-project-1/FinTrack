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
      container.innerHTML = '<div class="queue-empty"><i class="ph-fill ph-check-circle"></i><div><strong>Semua tersinkron</strong><p>Tidak ada transaksi tertunda.</p></div></div>';
      return;
    }
    const actionLabels = {
      tambahTransaksi: 'Tambah Transaksi',
      tambahIuran: 'Tambah Iuran',
      editTransaksi: 'Edit Transaksi',
      hapusTransaksi: 'Hapus Transaksi',
    };
    queued.reverse().forEach((item) => {
      const card = document.createElement('div');
      card.className = 'pending-item';
      const t = new Date(item.queuedAt).toLocaleString('id-ID');
      const action = item.payload?.action || 'unknown';
      const form = item.payload?.dataForm || {};
      const nominal = Number(form.nominal) || 0;
      const summary = form.keterangan
        || [form.bulanIuran, form.tahunIuran].filter((v) => v && v !== '-').join(' ')
        || '-';
      card.innerHTML = `
        <div class="pending-card-row">
          <div class="flex-1">
            <div class="pending-card-action">${escapeHtml(actionLabels[action] || action)} • ${formatRp(nominal)}</div>
            <div class="pending-card-time">${escapeHtml(t)}</div>
            <div class="pending-card-payload">${escapeHtml(summary)}</div>
          </div>
          <div class="flex-align-gap">
            <button class="btn btn-outline" data-action="delete-offline-item" data-item-id="${item.id}"><i class="ph ph-trash"></i> Hapus</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<div class="queue-error"><i class="ph-fill ph-warning-circle"></i><div><strong>Gagal memuat antrean</strong><p>Coba tekan Refresh.</p></div></div>';
  }
};

export const openOfflineQueueModal = async () => {
  await renderOfflineQueueList();
  openModal('modal-offline-queue');
};

/* ══════════════════════════════════════════════════════════════════
   PRINT RECEIPT / REPORT
   ══════════════════════════════════════════════════════════════════ */

