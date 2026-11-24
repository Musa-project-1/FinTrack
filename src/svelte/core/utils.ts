import type { Transaksi } from '../../types/finkas';
/**
 * @module utils
 * Pure utility functions: formatting, DOM helpers, toast notifications.
 */

/** Format a number as Indonesian Rupiah currency. */
export const formatRp = (angka: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

/** Format a number into compact currency (e.g., 10K, 1,5 Jt, 2 M). */
export const formatCompactRp = (angka: number): string => {
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

/** Select the saved formatter once for a dashboard render. */
export const getDisplayRpFormatter = () => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('finkas_currency_format') === 'compact') {
      return formatCompactRp;
    }
  } catch (_) {}
  return formatRp;
};

export const formatDisplayRp = (angka: number) => getDisplayRpFormatter()(angka);

/** Format live currency input: strips non-digits, formats with thousand separators. */
export const handleNominalInput = (el: HTMLInputElement) => {
  let value = el.value.replace(/[^0-9]/g, '');
  if (value === '') {
    el.value = '';
    return;
  }
  el.value = new Intl.NumberFormat('id-ID').format(parseInt(value));
};

/** Get the raw numeric value from a formatted currency input. */
export const getRawNominal = (id: string): number => {
  const input = (document.getElementById(id) as HTMLInputElement|null);
  const val = input?.value || '';
  return parseInt(val.replace(/[^0-9]/g, '')) || 0;
};

/* ── Transaction date helpers ─────────────────────────────────────── */

/** Convert a `<input type="date">` value ("YYYY-MM-DD") into an ISO timestamp
 * pinned to local noon.
 *
 * Noon keeps the calendar day stable when the timestamp is read back in any
 * Indonesian timezone (WIB/WITA/WIT), so a payment dated "22 Sep" never slips
 * to the 21st or 23rd on display. */
export const dateInputToIso = (dateStr: string|undefined): string => {
  if (!dateStr) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!match) return '';
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
};

/** Convert an ISO timestamp into a `<input type="date">` value ("YYYY-MM-DD")
 * using local time, the inverse of {@link dateInputToIso}. */
export const isoToDateInput = (iso: string): string => {
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

/** Promote active #toast-container above modal dialogs in the browser top layer. */
export const promoteToastLayer = (container: HTMLElement|null = document.getElementById('toast-container')) => {
  if (!container?.children?.length) return;
  try {
    if (container.matches?.(':popover-open')) container.hidePopover?.();
    container.showPopover?.();
  } catch (_) {}
};

const syncToastPopoverState = (container: HTMLElement | null) => {
  if (!container) return;
  if (container.children.length > 0) {
    promoteToastLayer(container);
    return;
  }
  try { container.hidePopover?.(); } catch (_) {}
};

/** Show a floating toast notification. */
export const showToast = (message: string|undefined, type: 'success'|'error'|'warning'|'info' = 'success', options: {title?: string, badge?: string, icon?: string, duration?: number} = {}) => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const text = String(message || '').trim();
  if (!text) return;

  const safeType = ['error', 'warning', 'info'].includes(type) ? type : 'success';
  const toastKey = `${safeType}:${options?.title || ''}:${text}`;
  const now = Date.now();
  if (toastKey === lastToastKey && now - lastToastTime < 1000) return;
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

  const TOAST_BADGE_MAP = {
    success: 'SUKSES',
    error: 'GALAT',
    warning: 'PERINGATAN',
    info: 'INFO'
  };
  const badgeText = options?.badge || TOAST_BADGE_MAP[safeType] || safeType.toUpperCase();
  const titleText = String(options?.title || '').trim();
  if (titleText) toast.classList.add('has-title');

  const headerRow = document.createElement('div');
  headerRow.className = 'toast-header-row';

  const badgeTag = document.createElement('span');
  badgeTag.className = 'toast-badge-tag';
  badgeTag.textContent = badgeText;
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

  let timer: ReturnType<typeof setTimeout>|null = null;
  let remaining = duration;
  let startedAt = Date.now();
  let hiding = false;
  let removed = false;
  const removeToast = () => {
    if (removed) return;
    removed = true;
    toast.remove();
    syncToastPopoverState(container);
  };
  const hide = () => {
    if (hiding || removed) return;
    hiding = true;
    if (toast.offsetHeight > 0) {
      toast.style.maxHeight = `${toast.offsetHeight}px`;
      void toast.offsetHeight;
    }
    toast.classList.remove('show');
    toast.classList.add('is-leaving');
    setTimeout(removeToast, 240);
  };
  const startTimer = () => {
    if (hiding || removed) return;
    if (timer) clearTimeout(timer);
    startedAt = Date.now();
    timer = setTimeout(hide, Math.max(0, remaining));
  };
  const pauseTimer = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(120, remaining - (Date.now() - startedAt));
  };

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (timer) { clearTimeout(timer); timer = null; }
    hide();
  });
  toast.addEventListener('mouseenter', () => {
    pauseTimer();
    progress.style.animationPlayState = 'paused';
  });
  toast.addEventListener('mouseleave', () => {
    startTimer();
    progress.style.animationPlayState = 'running';
  });

  // Swipe-to-dismiss direct manipulation
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let startTime = 0;
  let isSwiping = false;

  toast.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target instanceof Element && e.target.closest('.toast-close-btn, a, button')) return;
    startX = e.clientX;
    startY = e.clientY;
    currentX = e.clientX;
    startTime = Date.now();
    isSwiping = false;
  });

  toast.addEventListener('pointermove', (e) => {
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (!isSwiping) {
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwiping = true;
        pauseTimer();
        progress.style.animationPlayState = 'paused';
        try { toast.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }

    if (isSwiping) {
      currentX = e.clientX;
      toast.style.transition = 'none';
      toast.style.transform = `translateX(${deltaX}px)`;
      const opacity = Math.max(0, 1 - Math.abs(deltaX) / (toast.offsetWidth * 0.85));
      toast.style.opacity = String(opacity);
    }
  });

  const onPointerEnd = (e: PointerEvent) => {
    if (!isSwiping) return;
    isSwiping = false;
    try { toast.releasePointerCapture(e.pointerId); } catch (_) {}

    const deltaX = currentX - startX;
    const elapsed = Date.now() - startTime;
    const velocity = Math.abs(deltaX) / (elapsed || 1);
    const threshold = (toast.offsetWidth || 280) * 0.32;
    const isFlick = Math.abs(deltaX) > 30 && velocity > 0.35;

    if (Math.abs(deltaX) > threshold || isFlick) {
      const dir = deltaX > 0 ? 1 : -1;
      hiding = true;
      toast.style.transition = 'transform 0.18s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.18s ease-out';
      toast.style.transform = `translateX(${dir * (toast.offsetWidth + 60)}px)`;
      toast.style.opacity = '0';
      if (timer) { clearTimeout(timer); timer = null; }
      setTimeout(removeToast, 190);
    } else {
      toast.style.transition = 'transform 0.2s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s ease-out';
      toast.style.transform = '';
      toast.style.opacity = '';
      startTimer();
      progress.style.animationPlayState = 'running';
    }
  };

  toast.addEventListener('pointerup', onPointerEnd);
  toast.addEventListener('pointercancel', onPointerEnd);

  container.appendChild(toast);
  promoteToastLayer(container);
  requestAnimationFrame(() => toast.classList.add('show'));
  startTimer();
};

/** Toast peringatan khusus untuk aktivitas admin yang merubah database. */
export const showDatabaseToast = (title: string, detail: string, type: 'success'|'warning'|'error' = 'success') => {
  showToast(detail || title, type, {
    title,
    badge: 'DATABASE',
    icon: type === 'error' ? 'ph-fill ph-warning-circle' : 'ph-fill ph-database'
  });
};

/** Set the online/offline connection status badges. */
export const setConnectionStatus = (isOnline: boolean) => {
  document.querySelectorAll('.connection-status').forEach((badge) => {
    badge.classList.toggle('offline', !isOnline);
    const statusLabel = isOnline ? 'Online' : 'Offline';
    badge.setAttribute('aria-label', `Finkas: ${statusLabel}`);
  });
};

const toGraphemes = (str: string) => (
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter().segment(str), (s) => s.segment)
    : Array.from(str)
);

/** Get initials from a full name (1-2 grapheme characters). */
export const getInitials = (name: string): string => {
  if (!name || typeof name !== 'string') return '?';
  const clean = name.replace(/['"“”‘’]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return toGraphemes(parts[0]).slice(0, 2).join('').toUpperCase();
  const first = toGraphemes(parts[0])[0] || '';
  const second = toGraphemes(parts[1])[0] || '';
  return (first + second).toUpperCase() || '?';
};

/** Check if the browser is currently online. */
export const isOnline = (): boolean => window.navigator.onLine;

/** @private entity map for escapeHtml */
const _ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};
const _ESCAPE_RE = /[&<>"']/g;

export const escapeHtml = (str: unknown) => {
  if (str == null) return '';
  return String(str).replace(_ESCAPE_RE, (ch) => _ESCAPE_MAP[ch]);
};

/** Tagged-template helper that auto-escapes every interpolated value, so dynamic
 * data can never inject markup. Use it in place of hand-writing
 * `` `...${escapeHtml(x)}...` `` for innerHTML strings:
 *
 *   el.innerHTML = safeHtml`<span>${userName}</span>`;
 *
 * Static parts of the template are trusted verbatim; only the `${...}` slots are
 * escaped. Arrays are joined with '' first so `.map(...)` fragments work too. */
export const safeHtml = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce((out, chunk, i) => {
    if (i === 0) return chunk;
    const v = values[i - 1];
    const escaped = Array.isArray(v)
      ? v.map((x) => escapeHtml(x)).join('')
      : escapeHtml(v);
    return out + escaped + chunk;
  }, '');

/* ── Financial & progress calculations ────────────────────────────── */

/** Calculate paid months and progress percentage for a member in a rekap year,
 * accounting for skipped months (not owed). */
export const calculateMemberRekapProgress = (
  memberId: string,
  mapPembayaran: Record<string, unknown>,
  skippedMonths: Array<string> = [],
  rekapYear: string|number,
  monthNames: Array<string>,
  joinDateIso?: string,
  kasStart: string = '',
  fallbackYear?: number,
  fallbackMonth?: number
): {lunasBulan: number, totalOwedMonths: number, progressPercent: number, isFullPaid: boolean} => {
  const skipSet = new Set(skippedMonths || []);
  const yearStr = String(rekapYear);
  const activeMonths = monthNames.filter((_, idx) => {
    const monthKey = `${(idx + 1).toString().padStart(2, '0')}-${yearStr}`;
    if (skipSet.has(monthKey)) return false;
    // Months before the member joined are not owed, so they must not inflate
    // the denominator (keeps rekap progress consistent with dashboard dues).
    if (!isMonthOwedByMember(idx, yearStr, joinDateIso)) return false;
    // Months before the group started billing are likewise not owed. When the
    // fallback is omitted (legacy callers), an empty kasStart makes this a no-op.
    if (fallbackYear !== undefined && fallbackMonth !== undefined &&
        !isMonthOwedByGroup(idx, yearStr, kasStart, fallbackYear, fallbackMonth)) {
      return false;
    }
    return true;
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

/** Calculate total income contributions for a member, excluding outgoing rows. */
export const calculateMemberContribution = (transactions: Array<Transaksi>, memberId: string): number => {
  if (!Array.isArray(transactions) || !memberId) return 0;
  return transactions
    .filter((t) => t.ID_Anggota === memberId && t.Tipe_Arus === 'Masuk')
    .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0);
};

/** Calculate compliance metric over an identical population of active members
 * and identical window of months. */
export const calculateCompliance = (memberStatus: Array<{expectedTotal: number, paidTotal: number}>): {totalExpected: number, totalCollected: number, healthPct: number} => {
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

/** Parse a stored kas-start value (MM-YYYY) into { monthIndex, year }, or null
 * when absent/invalid. Empty means "no override — use the legacy fallback". */
export const parseKasStart = (kasStart: string): {monthIndex: number, year: number}|null => {
  if (!kasStart || typeof kasStart !== 'string') return null;
  const m = /^(0[1-9]|1[0-2])-(\d{4})$/.exec(kasStart.trim());
  if (!m) return null;
  return { monthIndex: Number(m[1]) - 1, year: Number(m[2]) };
};

/** First day of the month a group starts billing dues.
 *
 * Uses the stored `kasStart` override when present; otherwise falls back to the
 * legacy GROUP_START constants so existing groups keep their current window
 * (zero migration). The fallback is passed in to keep this module free of a
 * config import cycle. */
export const kasStartFirstOfMonth = (kasStart: string, fallbackYear: number, fallbackMonth: number): Date => {
  const parsed = parseKasStart(kasStart);
  if (parsed) return new Date(parsed.year, parsed.monthIndex, 1);
  return new Date(fallbackYear, fallbackMonth - 1, 1);
};

/** Whether a calendar month is on or after the group's kas-start month, i.e. a
 * month the group actually bills dues for. Months before the start are not a
 * debt for anyone. */
export const isMonthOwedByGroup = (monthIndex: number, year: number|string, kasStart: string, fallbackYear: number, fallbackMonth: number): boolean => {
  const start = kasStartFirstOfMonth(kasStart, fallbackYear, fallbackMonth).getTime();
  return new Date(Number(year), monthIndex, 1).getTime() >= start;
};

/** First day of the month a member joined, or null when no/invalid join date.
 * Day-of-month is discarded so a mid-month join still owes that whole month. */
export const memberJoinFirstOfMonth = (joinDateIso?: string): Date|null => {
  if (!joinDateIso) return null;
  const d = new Date(joinDateIso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/** Whether a member owes dues for a given calendar month.
 *
 * A member owes a month only if it is on or after their join month. Members
 * with no recorded join date (legacy records) are treated as having joined at
 * the group's start, so they owe every month — preserving prior behavior. */
export const isMonthOwedByMember = (monthIndex: number, year: number|string, joinDateIso?: string): boolean => {
  const joinFirst = memberJoinFirstOfMonth(joinDateIso);
  if (!joinFirst) return true;
  return new Date(Number(year), monthIndex, 1).getTime() >= joinFirst.getTime();
};

/** Total dues a member is expected to have paid across a window of months,
 * skipping holiday months and any month before the member joined. */
export const expectedDuesForMember = (months: Array<{monthIndex: number, year: number|string}>, skipSet: Set<string>, monthlyFee: number, joinDateIso?: string): number => {
  return months.reduce((sum, m) => {
    const key = `${(m.monthIndex + 1).toString().padStart(2, '0')}-${m.year}`;
    if (skipSet.has(key)) return sum;
    if (!isMonthOwedByMember(m.monthIndex, m.year, joinDateIso)) return sum;
    return sum + monthlyFee;
  }, 0);
};

export const getInput = (id: string) => (document.getElementById(id) as HTMLInputElement | null);

export const getSelect = (id: string) => (document.getElementById(id) as HTMLSelectElement | null);

/** Look up a required form control in a mounted transaction or member form. */
export function requiredField(id: string) {
  const field = document.getElementById(id);
  if (!field) throw new Error(`Missing form control #${id}`);
  return (field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement);
}

export function buttonIcon(classes: string) {
  const icon = document.createElement('i');
  icon.className = classes;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

export function closestHtml(target: EventTarget|null, selector: string) {
  const element = (target as Element|null);
  return element?.closest?.<HTMLElement>(selector) ?? null;
}

export function htmlElements(selector: string, root: ParentNode = document) {
  return (root.querySelectorAll(selector) as NodeListOf<HTMLElement>);
}
