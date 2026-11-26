import type { Transaksi } from '../../types/finkas';

type AttachmentRequest = { idTransaksi: string; groupId?: string | null };
type AttachmentFile = { base64: string; type: string; name: string; size: number };
/**
 * @module handlers/attachments
 * Transaction attachment client helpers and UI control bindings for Finkas.
 *
 * Handles client-side validation, secure base64 transformation, online-only
 * upload/download/delete requests to the authenticated gateway (/api/data),
 * and accessible UI attachment controls for saved-transaction dialogs.
 *
 * Files are limited to JPEG, PNG, WebP, and PDF up to 512 KiB.
 */
import { buttonIcon, isOnline, showToast } from 'finkas/core/utils';
import { getActiveGroupId, getState } from 'finkas/core/state';
import { dataRequest } from 'finkas/core/api-client';
import { flashDownloadRing } from '../ui/ui-moments';

const toast = (msg: string, type: Parameters<typeof showToast>[1]) => {
  if (typeof document !== 'undefined' && typeof showToast === 'function') {
    showToast(msg, type);
  }
};

export const MAX_ATTACHMENT_SIZE_BYTES = 512 * 1024; // 512 KiB

export const ALLOWED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const ALLOWED_EXTENSIONS = Object.freeze(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

/**
 * Format raw byte size to a human-readable string.
 */
export const formatFileSize = (bytes: number) => {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

/**
 * Validate a File or Blob object on the client side before any network operation.
 */
export function validateClientAttachment(file: { name?: string; size: number; type: string } | null): { valid: true } | { valid: false; error: string } {
  if (!file) {
    return { valid: false, error: 'Pilih berkas bukti terlebih dahulu.' };
  }

  if (typeof file.size !== 'number' || file.size <= 0) {
    return { valid: false, error: 'Berkas bukti kosong atau tidak dapat dibaca.' };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: `Ukuran berkas (${formatFileSize(file.size)}) melebihi batas maksimal 512 KiB.`
    };
  }

  const mime = String(file.type || '').toLowerCase().trim();
  const normalizedMime = mime === 'image/jpg' ? 'image/jpeg' : mime;
  const name = String(('name' in file && file.name) || '').toLowerCase().trim();

  const mimeMatches = ALLOWED_MIME_TYPES.includes(normalizedMime);
  const extMatches = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

  // If browser reports a MIME type, require it to be on the allowlist (reject active types like text/html).
  // Fallback to extension matching only when the browser omits MIME (e.g., certain mobile webviews).
  if (normalizedMime && !mimeMatches) {
    return {
      valid: false,
      error: 'Format berkas tidak didukung. Pilih berkas JPEG, PNG, WebP, atau PDF.'
    };
  }
  if (!normalizedMime && !extMatches) {
    return {
      valid: false,
      error: 'Format berkas tidak didukung. Pilih berkas JPEG, PNG, WebP, atau PDF.'
    };
  }
  if (name && !extMatches) {
    return {
      valid: false,
      error: 'Ekstensi berkas tidak didukung. Pilih berkas JPEG, PNG, WebP, atau PDF.'
    };
  }

  return { valid: true };
}

/**
 * Convert a File/Blob to a clean, unpadded base64 string.
 */
export function fileToBase64(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      return reject(new Error('FileReader API tidak didukung pada lingkungan ini.'));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const commaIdx = result.indexOf(',');
        resolve(commaIdx !== -1 ? result.slice(commaIdx + 1).trim() : result.trim());
      } else {
        reject(new Error('Gagal membaca data berkas sebagai base64 string.'));
      }
    };
    reader.onerror = () => reject(new Error('Terjadi kesalahan saat membaca berkas.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a base64 string to a native Blob object.
 */
export function base64ToBlob(base64: string, mimeType = 'application/octet-stream') {
  const clean = String(base64 || '').replace(/\s+/g, '');
  const binaryString = typeof atob === 'function' ? atob(clean) : Buffer.from(clean, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Sanitize an attachment download filename (remove path separators, control chars, traversal).
 */
export function sanitizeAttachmentFilename(filename?: string | null, fallback = 'bukti-transaksi') {
  const raw = String(filename || '').split(/[\\/]/).pop() || '';
  const cleaned = raw
    .replace(/[\x00-\x1f\x7f"<>:|?*]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120);
  if (!cleaned || cleaned === '.' || cleaned === '..') return fallback;
  return cleaned;
}

/**
 * Enforce client allowlist for downloadable attachment MIME types.
 */
export function resolveSafeDownloadMimeType(mimeType?: string | null) {
  const mime = String(mimeType || '').toLowerCase().trim();
  const normalized = mime === 'image/jpg' ? 'image/jpeg' : mime;
  return ALLOWED_MIME_TYPES.includes(normalized) ? normalized : 'application/octet-stream';
}

/**
 * Trigger a browser file download for a given Blob.
 */
export function triggerBlobDownload(blob: Blob, filename = 'bukti-transaksi') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const safeType = resolveSafeDownloadMimeType(blob.type);
  const safeBlob = blob.type === safeType ? blob : new Blob([blob], { type: safeType });
  const safeName = sanitizeAttachmentFilename(filename);
  const url = URL.createObjectURL(safeBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 250);
}

/**
 * Upload an attachment for an existing saved transaction (Admin only, online only).
 */
export async function uploadAttachmentApi({ idTransaksi, file, groupId = null }: AttachmentRequest & { file: Blob & { name?: string } }) {
  if (!isOnline()) {
    const msg = 'Pengunggahan bukti hanya dapat dilakukan saat online.';
    toast(msg, 'error');
    return { status: false, message: msg };
  }

  const check = validateClientAttachment(file);
  if (!check.valid) {
    toast(check.error, 'error');
    return { status: false, message: check.error };
  }

  let base64;
  try {
    base64 = await fileToBase64(file);
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)) || 'Gagal membaca berkas bukti.';
    toast(msg, 'error');
    return { status: false, message: msg };
  }

  const filename = ('name' in file && file.name) || `bukti_${idTransaksi}`;
  const gid = groupId || getActiveGroupId();
  const res = await dataRequest<{ bukti?: Transaksi['Bukti'] }>({
    action: 'uploadAttachment',
    payload: {
      groupId: gid,
      idTransaksi,
      file: {
        name: filename,
        type: file.type || 'image/jpeg',
        size: file.size,
        base64
      }
    },
    needsWrite: true
  });

  if (!res) {
    const msg = 'Tidak dapat terhubung ke server.';
    toast(msg, 'error');
    return { status: false, message: msg };
  }

  if (res.status) {
    try {
      const state = getState();
      const tx = state?.transaksi?.find((t) => t.ID_Transaksi === idTransaksi);
      if (tx) {
        tx.Bukti = res.data?.bukti || {
          name: filename,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('finkas:state-changed'));
        }
      }
    } catch {}
  } else {
    toast(res.message || 'Gagal mengunggah bukti.', 'error');
  }

  return res;
}

/**
 * Delete an attachment for a saved transaction (Admin only, online only).
 */
export async function deleteAttachmentApi({ idTransaksi, groupId = null }: AttachmentRequest) {
  if (!isOnline()) {
    const msg = 'Penghapusan bukti hanya dapat dilakukan saat online.';
    toast(msg, 'error');
    return { status: false, message: msg };
  }

  const gid = groupId || getActiveGroupId();
  const res = await dataRequest({
    action: 'deleteAttachment',
    payload: {
      groupId: gid,
      idTransaksi
    },
    needsWrite: true
  });

  if (!res) {
    const msg = 'Tidak dapat terhubung ke server.';
    toast(msg, 'error');
    return { status: false, message: msg };
  }

  if (res.status) {
    try {
      const state = getState();
      const tx = state?.transaksi?.find((t) => t.ID_Transaksi === idTransaksi);
      if (tx) {
        tx.Bukti = null;
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('finkas:state-changed'));
        }
      }
    } catch {}
  } else {
    toast(res.message || 'Gagal menghapus bukti.', 'error');
  }

  return res;
}

/**
 * Fetch the proof document and original base64 for a transaction (Group reader).
 */
export async function readAttachmentApi({ idTransaksi, groupId = null }: AttachmentRequest): Promise<{ status: boolean; message?: string; data?: AttachmentFile | null }> {
  const gid = groupId || getActiveGroupId();
  const res = await dataRequest<AttachmentFile>({
    action: 'readAttachment',
    payload: {
      groupId: gid,
      idTransaksi
    },
    needsWrite: false
  });

  if (!res) {
    return { status: false, message: 'Tidak dapat terhubung ke server.' };
  }
  return res;
}

/**
 * Download the exact original attachment Blob for a saved transaction.
 */
export async function downloadAttachmentBlob({ idTransaksi, groupId = null }: AttachmentRequest) {
  const res = await readAttachmentApi({ idTransaksi, groupId });
  if (!res || !res.status || !res.data) {
    const msg = res?.message || 'Bukti transaksi tidak ditemukan.';
    throw new Error(msg);
  }

  const { base64, type, name, size } = res.data;
  const safeType = resolveSafeDownloadMimeType(type);
  const safeName = sanitizeAttachmentFilename(name);
  const blob = base64ToBlob(base64, safeType);
  return { blob, name: safeName, type: safeType, size };
}

/**
 * Export all attachments in the active group (Admin only).
 */
export async function exportAttachmentsApi(groupId: string | null = null) {
  const gid = groupId || getActiveGroupId();
  const res = await dataRequest<{ attachments: Array<AttachmentFile & { idTransaksi: string }> }>({
    action: 'exportAttachments',
    payload: { groupId: gid },
    needsWrite: true
  });

  if (!res || !res.status) return [];
  return res.data?.attachments || [];
}

/* ══════════════════════════════════════════════════════════════════
   UI CONTROLS HELPER
   ══════════════════════════════════════════════════════════════════ */

/**
 * Wire up attachment controls for transaction editing dialogs.
 * Attaches gracefully to DOM containers created by the parent agent,
 * with no-op safety when elements are absent.
 */
export function initAttachmentControls(options: { container?: HTMLElement | string; getIdTransaksi?: () => string; canEdit?: () => boolean } = {}) {
  if (typeof document === 'undefined') return;

  const container = typeof options.container === 'string'
    ? document.querySelector(options.container)
    : (options.container || document.getElementById('transaction-attachment-container'));

  if (!container) return;

  const fileInput = (container.querySelector('input[type="file"]') || document.getElementById('trx-attachment-file')) as HTMLInputElement | null;
  const uploadBtn = (container.querySelector('[data-action="upload-attachment"]') || document.getElementById('btn-upload-attachment')) as HTMLButtonElement | null;
  const deleteBtn = (container.querySelector('[data-action="delete-attachment"]') || document.getElementById('btn-delete-attachment')) as HTMLButtonElement | null;
  const downloadBtn = (container.querySelector('[data-action="download-attachment"]') || document.getElementById('btn-download-attachment')) as HTMLButtonElement | null;
  const statusEl = container.querySelector('[data-attachment-status]') || document.getElementById('trx-attachment-status');

  const getId = () => {
    if (typeof options.getIdTransaksi === 'function') return options.getIdTransaksi();
    const editIdInput = (document.getElementById('edit-id') as HTMLInputElement | null);
    return (editIdInput?.value || '').trim();
  };

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const check = validateClientAttachment(file);
      if (!check.valid) {
        toast(check.error, 'error');
        fileInput.value = '';
        if (statusEl) statusEl.textContent = check.error;
      } else if (statusEl) {
        statusEl.textContent = `${file.name} (${formatFileSize(file.size)})`;
      }
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const idTransaksi = getId();
      if (!idTransaksi) {
        toast('ID transaksi tidak ditemukan.', 'error');
        return;
      }
      const file = fileInput?.files?.[0];
      if (!file) {
        toast('Pilih berkas bukti terlebih dahulu.', 'error');
        return;
      }

      uploadBtn.disabled = true;
      const savedChildren = Array.from(uploadBtn.childNodes);
      uploadBtn.replaceChildren(buttonIcon("ph ph-spinner-gap ph-spin"), document.createTextNode(" Mengunggah..."));

      try {
        const res = await uploadAttachmentApi({ idTransaksi, file });
        if (res.status) {
          toast('Bukti transaksi berhasil diunggah.', 'success');
          if (fileInput) fileInput.value = '';
          if (statusEl) statusEl.textContent = `Tersimpan: ${file.name}`;
        }
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.replaceChildren(...savedChildren);
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const idTransaksi = getId();
      if (!idTransaksi) return;

      downloadBtn.disabled = true;
      try {
        const { blob, name } = await downloadAttachmentBlob({ idTransaksi });
        triggerBlobDownload(blob, name);
        flashDownloadRing(downloadBtn, 'Terunduh');
      } catch (err) {
        toast((err instanceof Error ? err.message : String(err)) || 'Gagal mengunduh bukti.', 'error');
      } finally {
        downloadBtn.disabled = false;
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const idTransaksi = getId();
      if (!idTransaksi) return;

      deleteBtn.disabled = true;
      try {
        const res = await deleteAttachmentApi({ idTransaksi });
        if (res.status) {
          toast('Bukti transaksi berhasil dihapus.', 'success');
          if (fileInput) fileInput.value = '';
          if (statusEl) statusEl.textContent = 'Belum ada bukti.';
        }
      } finally {
        deleteBtn.disabled = false;
      }
    });
  }
}
