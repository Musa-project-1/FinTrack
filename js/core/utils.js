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
 * Show a floating toast notification.
 * @param {string} message - Message text.
 * @param {'success'|'error'|'warning'|'info'} [type='success'] - Toast type.
 * @param {object} [options] - Additional options (title, badge, icon, duration).
 */
export const showToast = (message, type = 'success', options = {}) => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const text = String(message || '').trim();
  if (!text) return;

  // Cegah duplikasi notifikasi yang sama menumpuk
  const existingToasts = Array.from(container.querySelectorAll('.toast-label'));
  if (existingToasts.some((t) => t.textContent.trim() === text)) return;

  const toast = document.createElement('div');
  const safeType = ['error', 'warning', 'info'].includes(type) ? type : 'success';
  toast.className = `toast ${safeType}`;

  // Icon badge
  const iconWrap = document.createElement('span');
  iconWrap.className = `toast-icon-wrap ${safeType}`;
  const icon = document.createElement('i');
  
  let defaultIcon = 'ph-fill ph-check-circle';
  if (options?.icon) {
    defaultIcon = options.icon;
  } else if (safeType === 'warning') {
    defaultIcon = 'ph-fill ph-warning';
  } else if (safeType === 'info') {
    defaultIcon = 'ph-fill ph-info';
  } else if (safeType === 'error') {
    defaultIcon = 'ph-fill ph-warning-circle';
  }
  icon.className = defaultIcon;
  iconWrap.appendChild(icon);

  // Body container
  const body = document.createElement('div');
  body.className = 'toast-body';

  const badgeText = options?.badge || (safeType === 'success' ? 'SUKSES' : safeType.toUpperCase());
  const titleText = options?.title || '';

  const headerRow = document.createElement('div');
  headerRow.className = 'toast-header-row';

  const badgeTag = document.createElement('span');
  badgeTag.className = 'toast-badge-tag';
  badgeTag.textContent = `● ${badgeText}`;
  headerRow.appendChild(badgeTag);

  if (titleText) {
    const titleEl = document.createElement('span');
    titleEl.className = 'toast-title';
    titleEl.textContent = titleText;
    headerRow.appendChild(titleEl);
  }
  body.appendChild(headerRow);

  const label = document.createElement('span');
  label.className = 'toast-label';
  label.textContent = text;
  body.appendChild(label);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close-btn';
  closeBtn.setAttribute('aria-label', 'Tutup');
  closeBtn.innerHTML = '<i class="ph ph-x"></i>';

  const duration = options?.duration || 3500;
  const progress = document.createElement('div');
  progress.className = 'toast-progress';
  progress.style.animationDuration = `${duration}ms`;

  toast.append(iconWrap, body, closeBtn, progress);

  let timer = null;
  const hide = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 280);
  };
  const startTimer = () => { timer = setTimeout(hide, duration); };
  const stopTimer = () => { if (timer) clearTimeout(timer); };

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stopTimer();
    hide();
  });
  toast.addEventListener('mouseenter', () => {
    stopTimer();
    progress.style.animationPlayState = 'paused';
  });
  toast.addEventListener('mouseleave', () => {
    startTimer();
    progress.style.animationPlayState = 'running';
  });

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  startTimer();
};

/**
 * Toast peringatan khusus untuk aktivitas admin yang merubah database.
 * @param {string} title - Judul perubahan (misal: "Iuran Kas Disimpan")
 * @param {string} detail - Rincian data yang diubah
 * @param {'success'|'warning'|'error'} [type='success']
 */
export const showDatabaseToast = (title, detail, type = 'success') => {
  showToast(detail || title, type, {
    title,
    badge: 'DATABASE',
    icon: type === 'error' ? 'ph-fill ph-warning-circle' : 'ph-fill ph-database'
  });
};

/**
 * Set the online/offline connection status badges.
 * @param {boolean} isOnline
 */
export const setConnectionStatus = (isOnline) => {
  document.querySelectorAll('.connection-status').forEach((badge) => {
    badge.classList.toggle('offline', !isOnline);
    const statusLabel = isOnline ? 'Online' : 'Offline';
    badge.setAttribute('aria-label', `Finkas: ${statusLabel}`);
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

/** Transform Firestore doc fields to plain JS object */
export const fromFirestoreFields = (fields) => {
  if (!fields) return {};
  const obj = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) obj[key] = val.stringValue;
    else if (val.doubleValue !== undefined || val.integerValue !== undefined) obj[key] = Number(val.doubleValue ?? val.integerValue);
    else if (val.booleanValue !== undefined) obj[key] = Boolean(val.booleanValue);
    else if (val.arrayValue !== undefined) obj[key] = (val.arrayValue.values || []).map((v) => v.stringValue ?? v.integerValue ?? v);
    else if (val.nullValue !== undefined) obj[key] = null;
    else obj[key] = val;
  }
  return obj;
};

/** Transform plain JS object to Firestore typed fields */
export const toFirestoreFields = (obj) => {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) fields[key] = { nullValue: null };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (typeof val === 'number') fields[key] = { doubleValue: val };
    else if (Array.isArray(val)) fields[key] = { arrayValue: { values: val.map((v) => ({ stringValue: String(v) })) } };
    else fields[key] = { stringValue: String(val) };
  }
  return fields;
};
