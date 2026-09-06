/**
 * @module utils
 * Pure utility functions: formatting, DOM helpers, toast notifications.
 */

/**
 * Format a number as Indonesian Rupiah currency.
 * @param {number} angka - Amount to format.
 * @returns {string} Formatted string like "Rp 10.000".
 */
export const formatRp = (angka) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

/**
 * Format live currency input: strips non-digits, formats with thousand separators.
 * @param {HTMLInputElement} el - Input element.
 */
export const handleNominalInput = (el) => {
  let value = el.value.replace(/[^0-9]/g, '');
  if (value === '') {
    el.value = '';
    return;
  }
  el.value = new Intl.NumberFormat('id-ID').format(parseInt(value));
};

/**
 * Get the raw numeric value from a formatted currency input.
 * @param {string} id - DOM element ID.
 * @returns {number} The raw numeric value.
 */
export const getRawNominal = (id) => {
  const val = document.getElementById(id).value;
  return parseInt(val.replace(/[^0-9]/g, '')) || 0;
};

/**
 * Show a toast notification.
 * @param {string} message - Message to display.
 * @param {'success'|'error'|'warning'} [type='success'] - Toast type.
 */
export const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Prevent duplicate spam: if the exact same message is currently showing, don't stack another one
  const existingToasts = Array.from(container.querySelectorAll('.toast'));
  const isDuplicate = existingToasts.some((t) => t.textContent.trim().includes(message.trim()));
  if (isDuplicate) return;

  const toast = document.createElement('div');
  const iconClass =
    type === 'success'
      ? 'ph-fill ph-check-circle toast-icon-success'
      : type === 'warning'
      ? 'ph-fill ph-warning toast-icon-warning text-warning'
      : 'ph-fill ph-warning-circle toast-icon-danger';

  toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
  toast.innerHTML = `<i class="${iconClass}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 30);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
};

/**
 * Set the online/offline connection status badges.
 * @param {boolean} isOnline
 */
export const setConnectionStatus = (isOnline) => {
  document.querySelectorAll('.connection-status').forEach((badge) => {
    let icon = badge.querySelector('i');
    if (!icon) {
      icon = document.createElement('i');
      icon.className = 'ph-fill ph-circle';
      badge.prepend(icon);
    }
    badge.classList.toggle('offline', !isOnline);
    badge.title = isOnline ? 'Status: Online' : 'Status: Offline (klik untuk melihat antrean offline)';
  });
};

/**
 * Get initials from a full name (1-2 characters).
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const clean = name.replace(/['"“”‘’]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/**
 * Check if the browser is currently online.
 * @returns {boolean}
 */
export const isOnline = () => window.navigator.onLine;

/**
 * Hash text using SHA-256.
 * @param {string} text
 * @returns {Promise<string>} Hex-encoded hash.
 */
export const hashText = async (text) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** @private entity map for escapeHtml */
const _ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};
const _ESCAPE_RE = /[&<>"']/g;

export const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str).replace(_ESCAPE_RE, (ch) => _ESCAPE_MAP[ch]);
};
