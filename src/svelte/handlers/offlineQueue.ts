import { getGroupOfflineTransactions } from "finkas/core/offline";
import { getActiveGroupId, getIsAdminSession } from "finkas/core/state";
import { showToast } from "finkas/core/utils";
import { syncOfflineQueueList } from "../mount";
import { openModal } from "../ui/modal";

const QUEUE_SPECS: Record<string, [label: string, tone: string, icon: string]> = {
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
  setKasStart: ['Mulai Kas', 'warning', 'ph-calendar'],
  catatAktivitas: ['Catat Aktivitas', 'neutral', 'ph-activity']
};

const syncQueueStatusUI = (count: number) => {
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const dot = document.getElementById('queue-conn-dot');
  const txt = document.getElementById('queue-conn-text');
  const pill = document.getElementById('queue-count-pill');
  const syncBtn = (document.getElementById('btn-sync-offline-now') as HTMLButtonElement | null);

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
  const empty = { groupId: getActiveGroupId().trim(), items: [], otherGroupCount: 0, unscopedCount: 0 };
  if (!getIsAdminSession()) {
    syncQueueStatusUI(0);
    syncOfflineQueueList({ ...empty, status: "ready" });
    return;
  }

  const container = document.getElementById('offline-queue-list');
  if (!container) return;

  const renderId = ++latestRender;
  const refreshBtn = (document.getElementById('btn-refresh-offline') as HTMLButtonElement | null);
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('is-loading');
  }

  syncOfflineQueueList({ ...empty, status: "loading" });
  syncQueueStatusUI(0);
  try {
    const { groupId, items, otherGroupCount, unscopedCount } = await getGroupOfflineTransactions(getActiveGroupId());
    if (renderId !== latestRender || groupId !== getActiveGroupId().trim()) return;
    syncQueueStatusUI(items.length);

    const rows = items.reverse().map((item) => {
      const formattedTime = new Date(item.queuedAt).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      const action = item.payload?.action || 'unknown';
      const [label, tone, icon] = Object.hasOwn(QUEUE_SPECS, action)
        ? QUEUE_SPECS[action]
        : [action, 'neutral', 'ph-clock'];
      const form = item.payload?.dataForm || {};
      const nominal = Number(form.nominal) || 0;
      const summary = form.keterangan
        || [form.bulanIuran, form.tahunIuran].filter((v) => v && v !== '-').join(' ')
        || item.payload?.nama
        || item.payload?.month
        || '-';
      return { id: item.id, label, tone, icon, nominal, formattedTime, summary };
    });
    syncOfflineQueueList({ status: "ready", groupId, items: rows, otherGroupCount, unscopedCount });
  } catch (err) {
    if (renderId !== latestRender) return;
    syncQueueStatusUI(0);
    syncOfflineQueueList({ ...empty, status: "error" });
  } finally {
    if (refreshBtn && renderId === latestRender) {
      refreshBtn.disabled = false;
      refreshBtn.classList.remove('is-loading');
    }
  }
};

/** Open the Offline Transaction Queue modal and load pending entries. */
export const openOfflineQueueModal = async () => {
  if (!getIsAdminSession()) {
    showToast('Hanya admin yang dapat melihat antrean offline.', 'error');
    return;
  }
  const rendered = renderOfflineQueueList();
  openModal('modal-offline-queue');
  await rendered;
};
