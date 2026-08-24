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
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML =
    type === 'success'
      ? `<i class="ph-fill ph-check-circle" style="color:var(--primary); font-size:22px;"></i> <span>${message}</span>`
      : `<i class="ph-fill ph-warning-circle" style="color:var(--danger); font-size:22px;"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
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
    let statusTextEl = badge.querySelector('.status-text');
    if (!statusTextEl) {
      statusTextEl = document.createElement('span');
      statusTextEl.className = 'status-text';
      badge.appendChild(statusTextEl);
    }
    statusTextEl.textContent = isOnline ? 'Online' : 'Offline';
    badge.classList.toggle('offline', !isOnline);
  });
};

/**
 * Get initials from a full name (1-2 characters).
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/**
 * Get a deterministic gradient string for a member avatar based on name.
 * @param {string} name
 * @param {string[]} [gradients] - Array of CSS gradient strings.
 * @returns {string} CSS gradient.
 */
export const getAvatarGradient = (name, gradients) => {
  if (!name) return gradients[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
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
const _ESCAPE_MAP = { '&': String.fromCharCode(38), '<': String.fromCharCode(60), '>': String.fromCharCode(62), '"': String.fromCharCode(34), "'": String.fromCharCode(39) };
const _ESCAPE_RE = /[&<"']/g;

export const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str).replace(_ESCAPE_RE, (ch) => _ESCAPE_MAP[ch]);
};
