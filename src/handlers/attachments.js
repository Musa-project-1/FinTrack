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
import { isOnline, showToast } from '../core/utils.js';
import { getActiveGroupId, getState } from '../core/state.js';
import { dataRequest } from '../core/api-client.js';

const toast = (msg, type) => {
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
 * @param {number} bytes
 * @returns {string} E.g. "142 KB"
 */
export const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

/**
 * Validate a File or Blob object on the client side before any network operation.
 *
 * @param {File|Blob|{name?: string, size: number, type: string}} file
 * @returns {{valid: boolean, error?: string}}
 */
export function validateClientAttachment(file) {
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
  const name = String(file.name || '').toLowerCase().trim();

  const mimeMatches = ALLOWED_MIME_TYPES.includes(mime);
  const extMatches = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

  // If mime is missing (some mobile webviews omit type), fallback to extension check
  if (!mimeMatches && !extMatches) {
    return {
      valid: false,
      error: 'Format berkas tidak didukung. Pilih berkas JPEG, PNG, WebP, atau PDF.'
    };
  }

  return { valid: true };
}

/**
 * Convert a File/Blob to a clean, unpadded base64 string.
 *
 * @param {Blob|File} file
 * @returns {Promise<string>} Pure base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
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
 *
 * @param {string} base64
 * @param {string} [mimeType='application/octet-stream']
 * @returns {Blob}
 */
export function base64ToBlob(base64, mimeType = 'application/octet-stream') {
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
 * Trigger a browser file download for a given Blob.
 *
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerBlobDownload(blob, filename = 'bukti-transaksi') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
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
 *
 * @param {{idTransaksi: string, file: File|Blob, groupId?: string}} params
 * @returns {Promise<{status: boolean, message: string, data?: object}>}
 */
export async function uploadAttachmentApi({ idTransaksi, file, groupId = null }) {
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
    const msg = err?.message || 'Gagal membaca berkas bukti.';
    toast(msg, 'error');
    return { status: false, message: msg };
  }

  const gid = groupId || getActiveGroupId();
  const res = await dataRequest({
    action: 'uploadAttachment',
    payload: {
      groupId: gid,
      idTransaksi,
      file: {
        name: file.name || `bukti_${idTransaksi}`,
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
          name: file.name,
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
 *
 * @param {{idTransaksi: string, groupId?: string}} params
 * @returns {Promise<{status: boolean, message: string}>}
 */
export async function deleteAttachmentApi({ idTransaksi, groupId = null }) {
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
 *
 * @param {{idTransaksi: string, groupId?: string}} params
 * @returns {Promise<{status: boolean, message: string, data?: object, notFound?: boolean}>}
 */
export async function readAttachmentApi({ idTransaksi, groupId = null }) {
  const gid = groupId || getActiveGroupId();
  const res = await dataRequest({
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
 *
 * @param {{idTransaksi: string, groupId?: string}} params
 * @returns {Promise<{blob: Blob, name: string, type: string, size: number}>}
 */
export async function downloadAttachmentBlob({ idTransaksi, groupId = null }) {
  const res = await readAttachmentApi({ idTransaksi, groupId });
  if (!res || !res.status || !res.data) {
    const msg = res?.message || 'Bukti transaksi tidak ditemukan.';
    throw new Error(msg);
  }

  const { base64, type, name, size } = res.data;
  const blob = base64ToBlob(base64, type);
  return { blob, name, type, size };
}

/**
 * Export all attachments in the active group (Admin only).
 *
 * @param {string} [groupId=null]
 * @returns {Promise<Array<{idTransaksi: string, name: string, type: string, size: number, base64: string}>>}
 */
export async function exportAttachmentsApi(groupId = null) {
  const gid = groupId || getActiveGroupId();
  const res = await dataRequest({
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
 *
 * @param {object} [options={}]
 * @param {HTMLElement|string} [options.container]
 * @param {() => string} [options.getIdTransaksi]
 * @param {() => boolean} [options.canEdit]
 */
export function initAttachmentControls(options = {}) {
  if (typeof document === 'undefined') return;

  const container = typeof options.container === 'string'
    ? document.querySelector(options.container)
    : (options.container || document.getElementById('transaction-attachment-container'));

  if (!container) return;

  const fileInput = container.querySelector('input[type="file"]') || document.getElementById('trx-attachment-file');
  const uploadBtn = container.querySelector('[data-action="upload-attachment"]') || document.getElementById('btn-upload-attachment');
  const deleteBtn = container.querySelector('[data-action="delete-attachment"]') || document.getElementById('btn-delete-attachment');
  const downloadBtn = container.querySelector('[data-action="download-attachment"]') || document.getElementById('btn-download-attachment');
  const statusEl = container.querySelector('[data-attachment-status]') || document.getElementById('trx-attachment-status');

  const getId = () => {
    if (typeof options.getIdTransaksi === 'function') return options.getIdTransaksi();
    const editIdInput = document.getElementById('edit-id');
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
      const oldHtml = uploadBtn.innerHTML;
      uploadBtn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Mengunggah...';

      try {
        const res = await uploadAttachmentApi({ idTransaksi, file });
        if (res.status) {
          toast('Bukti transaksi berhasil diunggah.', 'success');
          if (fileInput) fileInput.value = '';
          if (statusEl) statusEl.textContent = `Tersimpan: ${file.name}`;
        }
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = oldHtml;
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
      } catch (err) {
        toast(err?.message || 'Gagal mengunduh bukti.', 'error');
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
