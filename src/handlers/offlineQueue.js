import { getGroupOfflineTransactions } from "../core/offline.js";
import { getActiveGroupId } from "../core/state.js";
import { formatRp, escapeHtml } from "../core/utils.js";
import { openModal } from "../ui/modal.js";

const QUEUE_SPECS = {
  tambahTransaksi: ['Tambah Transaksi', 'accent', 'ph-plus-circle'],
  tambahTransaksiMassal: ['Iuran Massal', 'accent', 'ph-users-three'],
  editTransaksi: ['Edit Transaksi', 'warning', 'ph-pencil-simple'],
  hapusTransaksi: ['Hapus Transaksi', 'danger', 'ph-trash'],
  tambahAnggota: ['Tambah Anggota', 'accent', 'ph-user-plus'],
  hapusAnggota: ['Hapus Anggota', 'danger', 'ph-user-minus'],
  updateStatusAnggota: ['Status Anggota', 'warning', 'ph-user-switch'],
  tambahKategori: ['Tambah Kategori', 'accent', 'ph-tag'],
  hapusKategori: ['Hapus Kategori', 'danger', 'ph-tag-simple'],
  addSkippedMonth: ['Bulan Libur +', 'warning', 'ph-calendar-x'],
  removeSkippedMonth: ['Bulan Libur -', 'warning', 'ph-calendar-check'],
  catatAktivitas: ['Catat Aktivitas', 'neutral', 'ph-activity']
};

const syncQueueStatusUI = (count) => {
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const dot = document.getElementById('queue-conn-dot');
  const txt = document.getElementById('queue-conn-text');
  const pill = document.getElementById('queue-count-pill');
  const syncBtn = document.getElementById('btn-sync-offline-now');

  if (dot) {
    dot.classList.toggle('is-online', online);
    dot.classList.toggle('is-offline', !online);
  }
  if (txt) txt.textContent = online ? 'Online — siap sinkron' : 'Offline — tersimpan lokal';
  if (pill) pill.textContent = `${count} tertunda`;
  if (syncBtn) syncBtn.disabled = count === 0;
};

let latestRender = 0;

/** Render pending offline mutations inside #offline-queue-list. */
export const renderOfflineQueueList = async () => {
  const container = document.getElementById('offline-queue-list');
  if (!container) return;

  const renderId = ++latestRender;
  const refreshBtn = document.getElementById('btn-refresh-offline');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('is-loading');
  }

  container.replaceChildren();
  syncQueueStatusUI(0);
  try {
    const { groupId, items, otherGroupCount, unscopedCount } = await getGroupOfflineTransactions(getActiveGroupId());
    if (renderId !== latestRender || groupId !== getActiveGroupId().trim()) return;
    syncQueueStatusUI(items.length);

    if (!items.length) {
      container.innerHTML = `
        <div class="queue-empty">
          <span class="queue-empty-ico"><i class="ph-fill ph-check-circle" aria-hidden="true"></i></span>
          <div><strong>Semua tersinkron</strong><p>Tidak ada transaksi tertunda.</p></div>
        </div>
      `;
    }

    items.reverse().forEach((item) => {
      const card = document.createElement('div');
      card.className = 'pending-item';
      const t = new Date(item.queuedAt).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      const action = item.payload?.action || 'unknown';
      const [label, tone, icon] = QUEUE_SPECS[action] || [action, 'neutral', 'ph-clock'];
      const form = item.payload?.dataForm || {};
      const nominal = Number(form.nominal) || 0;
      const summary = form.keterangan
        || [form.bulanIuran, form.tahunIuran].filter((v) => v && v !== '-').join(' ')
        || item.payload?.nama
        || item.payload?.month
        || '-';
      const amountBadge = nominal > 0
        ? `<span class="pending-card-amount">${formatRp(nominal)}</span>`
        : '';

      card.innerHTML = `
        <div class="pending-card-row">
          <div class="flex-1">
            <div class="pending-card-top">
              <span class="queue-action-pill is-${tone}"><i class="ph ${icon}" aria-hidden="true"></i> ${escapeHtml(label)}</span>
              ${amountBadge}
            </div>
            <div class="pending-card-time">${escapeHtml(t)} · <span class="queue-gid-tag">${escapeHtml(groupId)}</span></div>
            <div class="pending-card-payload">${escapeHtml(summary)}</div>
          </div>
          <div class="flex-align-gap">
            <button type="button" class="btn btn-outline queue-del-btn" data-action="delete-offline-item" data-item-id="${item.id}" aria-label="Hapus">
              <i class="ph ph-trash" aria-hidden="true"></i> <span>Hapus</span>
            </button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
    if (otherGroupCount || unscopedCount) {
      const notice = document.createElement('div');
      notice.className = 'queue-empty';
      if (otherGroupCount) {
        const message = document.createElement('p');
        message.textContent = `${otherGroupCount} antrean milik grup lain menunggu — pindah ke grup tersebut untuk mengirim.`;
        notice.append(message);
      }
      if (unscopedCount) {
        const message = document.createElement('p');
        message.textContent = `${unscopedCount} antrean lama tanpa ID grup dilewati demi isolasi data.`;
        notice.append(message);
      }
      container.append(notice);
    }
  } catch (err) {
    if (renderId !== latestRender) return;
    syncQueueStatusUI(0);
    container.innerHTML = `
      <div class="queue-error">
        <span class="queue-error-ico"><i class="ph-fill ph-warning-circle" aria-hidden="true"></i></span>
        <div><strong>Gagal memuat antrean</strong><p>Coba tekan Refresh.</p></div>
      </div>
    `;
  } finally {
    if (refreshBtn && renderId === latestRender) {
      refreshBtn.disabled = false;
      refreshBtn.classList.remove('is-loading');
    }
  }
};

/** Open the Offline Transaction Queue modal and load pending entries. */
export const openOfflineQueueModal = async () => {
  const rendered = renderOfflineQueueList();
  openModal('modal-offline-queue');
  await rendered;
};
