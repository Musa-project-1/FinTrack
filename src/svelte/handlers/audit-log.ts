/**
 * @module handlers/audit-log
 * Super Admin activity audit log modal: fetching, filtering, and row rendering.
 */

import { getIsSuperAdmin } from "finkas/core/state";
import { fetchAuditLogApi } from "finkas/core/api";
import { getInput, htmlElements, closestHtml, showToast } from "finkas/core/utils";
import { openModal, closeModal } from "../ui/modal";
import { syncAuditLogRows } from "../mount";

type AuditEntry = { Aksi: string; Detail?: string; Timestamp: string };

const TONE_COLOR = { accent: 'var(--accent-strong)', warning: 'var(--warning)', danger: 'var(--danger)', neutral: 'var(--text-muted)' };
const AUDIT_SPECS = [
  ['LOGIN_ADMIN', 'Login Admin', 'accent', 'akses', 'ph-sign-in'], ['LOGIN_GAGAL', 'Login Gagal', 'danger', 'akses', 'ph-shield-warning'],
  ['LOGIN_SUPERADMIN_GOOGLE', 'Login Google', 'accent', 'akses', 'ph-google-logo'], ['LOGOUT_ADMIN', 'Logout', 'neutral', 'akses', 'ph-sign-out'],
  ['PIN_BENAR', 'PIN Benar', 'neutral', 'akses', 'ph-lock-open'], ['PIN_SALAH', 'PIN Salah', 'danger', 'akses', 'ph-warning-circle'],
  ['PIN_TIDAK_DISETEL', 'Tanpa PIN', 'warning', 'akses', 'ph-key'], ['TAMBAH_TRANSAKSI', 'Tambah Transaksi', 'accent', 'transaksi', 'ph-plus-circle'],
  ['TAMBAH_IURAN_MASSAL', 'Iuran Massal', 'accent', 'transaksi', 'ph-users-three'], ['EDIT_TRANSAKSI', 'Edit Transaksi', 'warning', 'transaksi', 'ph-pencil-simple'],
  ['HAPUS_TRANSAKSI', 'Hapus Transaksi', 'danger', 'transaksi', 'ph-trash'], ['DUPLIKAT_DITOLAK', 'Duplikat Ditolak', 'danger', 'transaksi', 'ph-copy-simple'],
  ['OFFLINE_SYNC', 'Sinkron Offline', 'neutral', 'transaksi', 'ph-cloud-check'], ['TAMBAH_ANGGOTA', 'Tambah Anggota', 'accent', 'master', 'ph-user-plus'],
  ['HAPUS_ANGGOTA', 'Hapus Anggota', 'danger', 'master', 'ph-user-minus'], ['STATUS_ANGGOTA', 'Status Anggota', 'warning', 'master', 'ph-user-switch'],
  ['TAMBAH_KATEGORI', 'Tambah Kategori', 'accent', 'master', 'ph-tag'], ['HAPUS_KATEGORI', 'Hapus Kategori', 'danger', 'master', 'ph-tag-simple'],
  ['TAMBAH_BULAN_LIBUR', 'Bulan Libur +', 'warning', 'master', 'ph-calendar-x'], ['HAPUS_BULAN_LIBUR', 'Bulan Libur -', 'warning', 'master', 'ph-calendar-check'],
  ['BACKUP_DATABASE', 'Backup', 'neutral', 'grup', 'ph-download-simple'], ['RESTORE_DATABASE', 'Restore', 'warning', 'grup', 'ph-upload-simple'],
  ['BUAT_GRUP', 'Buat Grup', 'accent', 'grup', 'ph-buildings'], ['HAPUS_GRUP', 'Hapus Grup', 'danger', 'grup', 'ph-trash'],
  ['UBAH_NAMA', 'Ubah Nama', 'warning', 'grup', 'ph-pencil'], ['UBAH_PIN', 'Ubah PIN', 'warning', 'akses', 'ph-password'],
  ['UBAH_KREDENSIAL_ADMIN', 'Ubah Admin', 'warning', 'akses', 'ph-user-gear'], ['TAMBAH_SUPERADMIN', 'Super Admin +', 'accent', 'akses', 'ph-crown'],
  ['HAPUS_SUPERADMIN', 'Super Admin -', 'danger', 'akses', 'ph-crown']
] as const;

/** Human-readable labels, semantic tones, and category groups for audit actions. */
export const AUDIT_ACTION_LABELS: Record<string, { label: string; tone: keyof typeof TONE_COLOR; cat: string; icon: string; color: string }> = Object.assign(
  Object.create(null),
  Object.fromEntries(
    AUDIT_SPECS.map(([key, label, tone, cat, icon]) => [key, { label, tone, cat, icon, color: TONE_COLOR[tone] }])
  )
);

const getAuditActionMeta = (aksi: string) =>
  Object.hasOwn(AUDIT_ACTION_LABELS, aksi) ? AUDIT_ACTION_LABELS[aksi] : undefined;

let cachedAuditLog: AuditEntry[] = [];
let auditFilterCat = 'all';
let auditSearchQuery = '';
let auditBound = false;
let auditRequest = 0;

const formatAuditDate = (ts: string) =>
  new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const updateAuditCount = (shown: number, total: number) => {
  const el = document.getElementById('audit-log-count');
  if (el) el.textContent = shown === total ? `${total} entri` : `${shown} / ${total} entri`;
};

const setAuditFilterChip = (cat: string | undefined) => {
  auditFilterCat = cat || 'all';
  htmlElements('#audit-filter-chips [data-audit-cat]').forEach((chip) => {
    const active = chip.dataset.auditCat === auditFilterCat;
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-selected', String(active));
  });
};

const guardAuditSuperAdmin = (shouldClose = false) => {
  if (getIsSuperAdmin()) return true;
  if (shouldClose) closeModal('modal-audit-log');
  showToast('Hanya Super Admin yang dapat mengakses Log Aktivitas.', 'error');
  return false;
};

const paintAuditLogRows = () => {
  const tbody = document.getElementById('audit-log-tbody');
  if (!tbody) return;
  const q = auditSearchQuery.trim().toLowerCase();
  const rows = cachedAuditLog.filter((entry) => {
    const meta = getAuditActionMeta(entry.Aksi) || { label: entry.Aksi, cat: 'grup' };
    if (auditFilterCat !== 'all' && meta.cat !== auditFilterCat) return false;
    if (!q) return true;
    return `${meta.label} ${entry.Aksi || ''} ${entry.Detail || ''} ${formatAuditDate(entry.Timestamp)}`.toLowerCase().includes(q);
  }).map((entry, index) => {
    const meta = getAuditActionMeta(entry.Aksi) || { label: entry.Aksi || 'AKSI', tone: 'neutral', icon: 'ph-activity' };
    return {
      key: `${index}-${entry.Timestamp}`, timestampText: formatAuditDate(entry.Timestamp),
      label: meta.label, tone: meta.tone, icon: meta.icon, detail: String(entry.Detail || '')
    };
  });
  updateAuditCount(rows.length, cachedAuditLog.length);
  syncAuditLogRows({ status: 'ready', totalCount: cachedAuditLog.length, rows });
};

const ensureAuditLogBound = () => {
  if (auditBound) return;
  auditBound = true;
  window.addEventListener('finkas:group-changed', () => {
    auditRequest++;
    cachedAuditLog = [];
    updateAuditCount(0, 0);
    const refreshBtn = (document.getElementById('btn-refresh-audit-log') as HTMLButtonElement | null);
    if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.classList.remove('is-loading'); }
  });
  document.getElementById('search-audit-log')?.addEventListener('input', (e: Event) => {
    auditSearchQuery = (e.currentTarget as HTMLInputElement).value || '';
    paintAuditLogRows();
  });
  document.getElementById('audit-filter-chips')?.addEventListener('click', (e: Event) => {
    const btn = closestHtml(e.target, '[data-audit-cat]');
    if (!btn) return;
    setAuditFilterChip(btn.dataset.auditCat);
    paintAuditLogRows();
  });
};

/** Fetch and render the audit log rows for the active group (Super Admin only). */
export const renderAuditLogList = async () => {
  if (!document.getElementById('audit-log-tbody')) return;
  if (!guardAuditSuperAdmin(true)) return;
  ensureAuditLogBound();
  const request = ++auditRequest;
  syncAuditLogRows({ status: 'loading', totalCount: cachedAuditLog.length, rows: [] });
  const refreshBtn = (document.getElementById('btn-refresh-audit-log') as HTMLButtonElement | null);
  if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.classList.add('is-loading'); }
  try {
    const res = await fetchAuditLogApi();
    if (request !== auditRequest) return;
    if (!res || !res.status) {
      cachedAuditLog = [];
      updateAuditCount(0, 0);
      syncAuditLogRows({ status: 'error', errorMessage: res?.message || 'Gagal memuat log.', totalCount: 0, rows: [] });
      return;
    }
    cachedAuditLog = (res.data?.log || []) as AuditEntry[];
    paintAuditLogRows();
  } finally {
    if (refreshBtn && request === auditRequest) { refreshBtn.disabled = false; refreshBtn.classList.remove('is-loading'); }
  }
};

/** Open the Admin Activity Audit Log modal (Super Admin only). */
export const openAuditLogModal = () => {
  if (!guardAuditSuperAdmin(false)) return;
  auditSearchQuery = '';
  const searchEl = getInput('search-audit-log');
  if (searchEl) searchEl.value = '';
  setAuditFilterChip('all');
  openModal('modal-audit-log');
  renderAuditLogList();
};
