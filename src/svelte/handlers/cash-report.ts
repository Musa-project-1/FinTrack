/**
 * @module handlers/cash-report
 * UI controller for monthly cash report (Laporan Kas Bulanan).
 *
 * Responsibilities:
 * - Reads and synchronizes selected YYYY-MM period in Asia/Jakarta timezone.
 * - Renders opening balance, income, expense, closing balance, and deterministic ledger details.
 * - Alerts on invalid transactions without silently dropping money.
 * - Blocks authoritative exports (print/CSV) when data has errors to prevent incomplete financial reporting.
 * - Triggers formatted print document (PDF) and spreadsheet CSV download.
 * - Idempotent listener management on window events (finkas:modal-opened, finkas:state-changed).
 */

import { syncCashReport } from '../mount';
import { getState, getActiveGroupId, getGroupName } from '../../core/state.js';
import { getInput, formatRp, showToast } from '../../core/utils.js';
import {
  buildMonthlyCashReport,
  formatReportToCSV,
  formatReportToHTML,
  ACCOUNTING_TIMEZONE
} from '../../core/cash-report.js';

let listenersAttached = false;
let boundMonthHandler: EventListener | null = null;
let boundModalOpenedHandler: EventListener | null = null;
let boundStateChangedHandler: EventListener | null = null;

/**
 * Get current year-month in Asia/Jakarta timezone ("YYYY-MM").
 */
export const getDefaultJakartaYearMonth = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCOUNTING_TIMEZONE,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date());

  let year = '';
  let month = '';
  for (const p of parts) {
    if (p.type === 'year') year = p.value;
    if (p.type === 'month') month = p.value;
  }
  return `${year}-${month}`;
};

const syncMonthValue = (input: HTMLInputElement | null, month: string) => {
  if (!input || !month) return;
  if (input.value !== month) input.value = month;
  if (typeof input.setAttribute === 'function' && input.getAttribute?.('value') !== month) {
    input.setAttribute('value', month);
  }
};

/**
 * Get the currently selected report month from DOM or default to current Jakarta month.
 */
export const getCurrentReportMonth = () => {
  if (typeof document === 'undefined') return getDefaultJakartaYearMonth();
  const input = getInput('cash-report-month');
  const val = input?.value?.trim();
  if (val && /^\d{4}-(0[1-9]|1[0-2])$/.test(val)) {
    return val;
  }
  const fallback = getDefaultJakartaYearMonth();
  syncMonthValue(input, fallback);
  return fallback;
};

/**
 * Render monthly cash report into the reports modal.
 * Shows flagged partial values and error banners when transactions are invalid.
 */
export const renderMonthlyCashReport = (targetMonth?: string) => {
  if (typeof document === 'undefined') return null;

  const month = targetMonth || getCurrentReportMonth();
  const state = getState();
  const report = buildMonthlyCashReport(state, month);

  // Synchronize month input & .mpick label
  syncMonthValue(getInput('cash-report-month'), month);

  // Summary metric cards
  const elSaldoAwal = document.getElementById('cash-report-saldo-awal');
  const elPemasukan = document.getElementById('cash-report-pemasukan');
  const elPengeluaran = document.getElementById('cash-report-pengeluaran');
  const elSaldoAkhir = document.getElementById('cash-report-saldo-akhir');

  if (elSaldoAwal) elSaldoAwal.textContent = formatRp(report.openingBalance);
  if (elPemasukan) elPemasukan.textContent = `+${formatRp(report.income)}`;
  if (elPengeluaran) elPengeluaran.textContent = `-${formatRp(report.expense)}`;
  if (elSaldoAkhir) elSaldoAkhir.textContent = formatRp(report.closingBalance);

  // Update export button indicators based on error state
  const printBtn = document.getElementById('btn-print-monthly-report');
  const csvBtn = document.getElementById('btn-export-monthly-csv');
  if (report.hasErrors) {
    if (printBtn) {
      printBtn.setAttribute('title', 'Perbaiki transaksi invalid sebelum mencetak laporan');
      printBtn.classList.add('disabled');
      printBtn.setAttribute('aria-disabled', 'true');
    }
    if (csvBtn) {
      csvBtn.setAttribute('title', 'Perbaiki transaksi invalid sebelum mengunduh CSV');
      csvBtn.classList.add('disabled');
      csvBtn.setAttribute('aria-disabled', 'true');
    }
  } else {
    if (printBtn) {
      printBtn.removeAttribute('title');
      printBtn.classList.remove('disabled');
      printBtn.removeAttribute('aria-disabled');
    }
    if (csvBtn) {
      csvBtn.removeAttribute('title');
      csvBtn.classList.remove('disabled');
      csvBtn.removeAttribute('aria-disabled');
    }
  }

  const invalid = report.invalidTransactions || [];
  const hasAlert = report.hasErrors && invalid.length > 0;
  const alertEl = document.getElementById('cash-report-alert');
  if (alertEl) alertEl.style.display = hasAlert ? 'block' : 'none';

  const details = report.details.map((item, idx) => ({
    key: `${idx}-${item.id ?? ''}`,
    isIn: item.type === 'Masuk',
    dateStr: String(item.dateStr || ''),
    timeStr: String(item.timeStr || ''),
    keterangan: String(item.keterangan || ''),
    metaText: [item.kategoriNama, item.anggotaNama].filter(name => name && name !== '-').join(' • '),
    nominalFormatted: formatRp(item.nominal),
    balanceFormatted: formatRp(item.balance)
  }));
  syncCashReport({
    month: report.month, hasErrors: Boolean(report.hasErrors), invalidCount: invalid.length,
    invalidSample: invalid.slice(0, 5).map(bad => ({ id: String(bad.id || ''), reason: String(bad.reason || '') })),
    moreCount: Math.max(0, invalid.length - 5), details
  });

  return report;
};

/**
 * Open print dialog for the current monthly cash report.
 * Strictly blocks if report has errors to protect accounting integrity.
 */
export const printMonthlyCashReport = (targetMonth?: string, options: { allowIncomplete?: boolean } = {}) => {
  const month = targetMonth || getCurrentReportMonth();
  const state = getState();
  const report = buildMonthlyCashReport(state, month);

  // Strict export blocking when ledger has invalid transactions
  if (report.hasErrors && !options.allowIncomplete) {
    if (typeof document !== 'undefined') {
      showToast('Laporan kas memiliki transaksi invalid. Cetak laporan dibatalkan demi integritas pembukuan.', 'error');
    }
    return { report, html: '', printed: false, blocked: true, error: 'has_errors' };
  }

  const groupId = getActiveGroupId();
  const groupName = getGroupName(groupId) || 'Finkas';
  const html = formatReportToHTML(report, { groupName });

  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    const pw = window.open('', '_blank');
    if (!pw) {
      showToast('Izinkan pop-up untuk mencetak laporan kas.', 'warning');
      return { report, html, printed: false, blocked: false };
    }
    pw.document.open();
    pw.document.write(html);
    pw.document.close();
    pw.focus();

    try {
      pw.addEventListener('afterprint', () => {
        try { pw.close(); } catch (_) {}
      });
    } catch (_) {}

    setTimeout(() => {
      try { pw.print(); } catch (_) {}
    }, 250);

    showToast('Membuka pratinjau cetak laporan kas...', 'info');
    return { report, html, printed: true, blocked: false };
  }

  return { report, html, printed: false, blocked: false };
};

/**
 * Export current monthly cash report as CSV file download.
 * Strictly blocks if report has errors to protect accounting integrity.
 */
export const exportMonthlyCashCSV = (targetMonth?: string, options: { allowIncomplete?: boolean } = {}) => {
  const month = targetMonth || getCurrentReportMonth();
  const state = getState();
  const report = buildMonthlyCashReport(state, month);

  // Strict export blocking when ledger has invalid transactions
  if (report.hasErrors && !options.allowIncomplete) {
    if (typeof document !== 'undefined') {
      showToast('Laporan kas memiliki transaksi invalid. Ekspor CSV dibatalkan demi integritas pembukuan.', 'error');
    }
    return { report, csv: '', exported: false, blocked: true, error: 'has_errors' };
  }

  const csv = formatReportToCSV(report);

  if (typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof Blob !== 'undefined' && typeof URL?.createObjectURL === 'function') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Kas_${report.month}.csv`);
    if (document.body) {
      document.body.appendChild(link);
    }
    if (typeof link.click === 'function') {
      link.click();
    }
    if (document.body && link.parentNode) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
    showToast(`Laporan kas ${report.month} (CSV) berhasil diunduh!`, 'success');
  }

  return { report, csv, exported: true, blocked: false };
};

/**
 * Attach DOM listeners for monthly cash report controls idempotently.
 * Listens on window for state and modal events (matching parent architecture).
 */
export const attachCashReportListeners = () => {
  if (typeof document === 'undefined') return;
  if (listenersAttached) return;

  const monthInput = getInput('cash-report-month');
  if (monthInput) {
    if (!monthInput.value) {
      syncMonthValue(monthInput, getDefaultJakartaYearMonth());
    }
    boundMonthHandler = () => renderMonthlyCashReport();
    monthInput.addEventListener('change', boundMonthHandler);
    monthInput.addEventListener('input', boundMonthHandler);
  }

  // Window event listeners (CustomEvents dispatch on window)
  const eventTarget = typeof window !== 'undefined' ? window : document;

  boundModalOpenedHandler = (e) => {
    const { detail } = (e as CustomEvent<{id?:string, modalId?:string}>);
    const modalId = detail?.id || detail?.modalId;
    if (modalId === 'modal-export') {
      renderMonthlyCashReport();
    }
  };
  eventTarget.addEventListener('finkas:modal-opened', boundModalOpenedHandler);

  boundStateChangedHandler = () => {
    const modal = document.getElementById('modal-export');
    if (modal && modal.classList?.contains('active')) {
      renderMonthlyCashReport();
    }
  };
  eventTarget.addEventListener('finkas:state-changed', boundStateChangedHandler);

  listenersAttached = true;
};

/**
 * Tear down listeners (useful for test isolation and SPA resets).
 */
export const destroyCashReportListeners = () => {
  if (typeof document !== 'undefined') {
    const monthInput = getInput('cash-report-month');
    if (monthInput && boundMonthHandler) {
      monthInput.removeEventListener('change', boundMonthHandler);
      monthInput.removeEventListener('input', boundMonthHandler);
    }
  }

  const eventTarget = typeof window !== 'undefined' ? window : (typeof document !== 'undefined' ? document : null);
  if (eventTarget) {
    if (boundModalOpenedHandler) {
      eventTarget.removeEventListener('finkas:modal-opened', boundModalOpenedHandler);
    }
    if (boundStateChangedHandler) {
      eventTarget.removeEventListener('finkas:state-changed', boundStateChangedHandler);
    }
  }

  boundMonthHandler = null;
  boundModalOpenedHandler = null;
  boundStateChangedHandler = null;
  listenersAttached = false;
};

/**
 * Initialize monthly cash report UI idempotently.
 */
export const initMonthlyCashReport = () => {
  attachCashReportListeners();
  renderMonthlyCashReport();
};
