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
 * Format a number into compact currency (e.g., 10K, 1,5 Jt, 2 M).
 * @param {number} angka
 * @returns {string}
 */
export const formatCompactRp = (angka) => {
  const num = Number(angka) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    return `${sign}${val} M`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    return `${sign}${val} Jt`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    return `${sign}${val}K`;
  }
  return formatRp(num);
};

/**
 * Format currency according to user appearance preferences (compact vs full).
 * @param {number} angka
 * @returns {string}
 */
export const formatDisplayRp = (angka) => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('finkas_currency_format') === 'compact') {
      return formatCompactRp(angka);
    }
  } catch (_) {}
  return formatRp(angka);
};

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

/* ── Transaction date helpers ─────────────────────────────────────── */

/**
 * Convert a `<input type="date">` value ("YYYY-MM-DD") into an ISO timestamp
 * pinned to local noon.
 *
 * Noon keeps the calendar day stable when the timestamp is read back in any
 * Indonesian timezone (WIB/WITA/WIT), so a payment dated "22 Sep" never slips
 * to the 21st or 23rd on display.
 *
 * @param {string} dateStr Value from a date input, e.g. "2026-01-22".
 * @returns {string} ISO timestamp, or '' when the input is empty/invalid.
 */
export const dateInputToIso = (dateStr) => {
  if (!dateStr) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!match) return '';
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
};

/**
 * Convert an ISO timestamp into a `<input type="date">` value ("YYYY-MM-DD")
 * using local time, the inverse of {@link dateInputToIso}.
 *
 * @param {string} iso ISO timestamp.
 * @returns {string} "YYYY-MM-DD", or '' when the timestamp is missing/invalid.
 */
export const isoToDateInput = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

let lastToastKey = '';
let lastToastTime = 0;

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

  const safeType = ['error', 'warning', 'info'].includes(type) ? type : 'success';
  const toastKey = `${safeType}:${options?.title || ''}:${text}`;
  const now = Date.now();
  if (toastKey === lastToastKey && now - lastToastTime < 350) return;
  lastToastKey = toastKey;
  lastToastTime = now;

  const toast = document.createElement('div');
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

/* ── Financial & progress calculations ────────────────────────────── */

/**
 * Calculate paid months and progress percentage for a member in a rekap year,
 * accounting for skipped months (not owed).
 *
 * @param {string} memberId
 * @param {object} mapPembayaran Key: `${memberId}_${bulan}` -> true
 * @param {Array<string>} skippedMonths Array of 'MM-YYYY'
 * @param {string|number} rekapYear
 * @param {Array<string>} monthNames Array of 12 month names
 * @returns {{lunasBulan: number, totalOwedMonths: number, progressPercent: number, isFullPaid: boolean}}
 */
export const calculateMemberRekapProgress = (
  memberId,
  mapPembayaran,
  skippedMonths = [],
  rekapYear,
  monthNames,
  joinDateIso
) => {
  const skipSet = new Set(skippedMonths || []);
  const yearStr = String(rekapYear);
  const activeMonths = monthNames.filter((_, idx) => {
    const monthKey = `${(idx + 1).toString().padStart(2, '0')}-${yearStr}`;
    if (skipSet.has(monthKey)) return false;
    // Months before the member joined are not owed, so they must not inflate
    // the denominator (keeps rekap progress consistent with dashboard dues).
    return isMonthOwedByMember(idx, yearStr, joinDateIso);
  });

  const totalOwedMonths = activeMonths.length;
  let lunasBulan = 0;
  activeMonths.forEach((bulan) => {
    if (mapPembayaran[`${memberId}_${bulan}`]) lunasBulan++;
  });

  const progressPercent = totalOwedMonths > 0 ? (lunasBulan / totalOwedMonths) * 100 : 100;
  const isFullPaid = totalOwedMonths === 0 || lunasBulan >= totalOwedMonths;

  return {
    lunasBulan,
    totalOwedMonths,
    progressPercent,
    isFullPaid
  };
};

/**
 * Calculate total income contributions for a member, excluding outgoing rows.
 *
 * @param {Array<object>} transactions
 * @param {string} memberId
 * @returns {number}
 */
export const calculateMemberContribution = (transactions, memberId) => {
  if (!Array.isArray(transactions) || !memberId) return 0;
  return transactions
    .filter((t) => t.ID_Anggota === memberId && t.Tipe_Arus === 'Masuk')
    .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0);
};

/**
 * Calculate compliance metric over an identical population of active members
 * and identical window of months.
 *
 * @param {Array<object>} memberStatus Array of { ang, paidTotal, expectedTotal, arrears }
 * @returns {{totalExpected: number, totalCollected: number, healthPct: number}}
 */
export const calculateCompliance = (memberStatus) => {
  if (!Array.isArray(memberStatus) || memberStatus.length === 0) {
    return { totalExpected: 0, totalCollected: 0, healthPct: 100 };
  }
  const totalExpected = memberStatus.reduce((sum, item) => sum + (item.expectedTotal || 0), 0);
  const totalCollected = memberStatus.reduce((sum, item) => sum + (item.paidTotal || 0), 0);
  const healthPct = totalExpected === 0
    ? 100
    : Math.min(100, Math.round((totalCollected / totalExpected) * 100));

  return { totalExpected, totalCollected, healthPct };
};

/* ── Join-date-aware dues ─────────────────────────────────────────── */

/**
 * First day of the month a member joined, or null when no/invalid join date.
 * Day-of-month is discarded so a mid-month join still owes that whole month.
 * @param {string} joinDateIso
 * @returns {Date|null}
 */
export const memberJoinFirstOfMonth = (joinDateIso) => {
  if (!joinDateIso) return null;
  const d = new Date(joinDateIso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Whether a member owes dues for a given calendar month.
 *
 * A member owes a month only if it is on or after their join month. Members
 * with no recorded join date (legacy records) are treated as having joined at
 * the group's start, so they owe every month — preserving prior behavior.
 *
 * @param {number} monthIndex 0-11
 * @param {number|string} year
 * @param {string} [joinDateIso]
 * @returns {boolean}
 */
export const isMonthOwedByMember = (monthIndex, year, joinDateIso) => {
  const joinFirst = memberJoinFirstOfMonth(joinDateIso);
  if (!joinFirst) return true;
  return new Date(Number(year), monthIndex, 1).getTime() >= joinFirst.getTime();
};

/**
 * Total dues a member is expected to have paid across a window of months,
 * skipping holiday months and any month before the member joined.
 *
 * @param {Array<{monthIndex: number, year: number|string}>} months
 * @param {Set<string>} skipSet Holiday month keys as 'MM-YYYY'.
 * @param {number} monthlyFee
 * @param {string} [joinDateIso]
 * @returns {number}
 */
export const expectedDuesForMember = (months, skipSet, monthlyFee, joinDateIso) => {
  return months.reduce((sum, m) => {
    const key = `${(m.monthIndex + 1).toString().padStart(2, '0')}-${m.year}`;
    if (skipSet.has(key)) return sum;
    if (!isMonthOwedByMember(m.monthIndex, m.year, joinDateIso)) return sum;
    return sum + monthlyFee;
  }, 0);
};
