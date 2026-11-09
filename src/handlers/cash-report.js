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

import { getState, getActiveGroupId, getGroupName } from '../core/state.js';
import { formatRp, escapeHtml, showToast } from '../core/utils.js';
import {
  buildMonthlyCashReport,
  formatReportToCSV,
  formatReportToHTML,
  ACCOUNTING_TIMEZONE
} from '../core/cash-report.js';

let listenersAttached = false;
let boundMonthHandler = null;
let boundModalOpenedHandler = null;
let boundStateChangedHandler = null;

/**
 * Get current year-month in Asia/Jakarta timezone ("YYYY-MM").
 * @returns {string}
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

/**
 * Get the currently selected report month from DOM or default to current Jakarta month.
 * @returns {string} YYYY-MM
 */
export const getCurrentReportMonth = () => {
  if (typeof document === 'undefined') return getDefaultJakartaYearMonth();
  const input = document.getElementById('cash-report-month');
  const val = input?.value?.trim();
  if (val && /^\d{4}-(0[1-9]|1[0-2])$/.test(val)) {
    return val;
  }
  const fallback = getDefaultJakartaYearMonth();
  if (input) input.value = fallback;
  return fallback;
};

/**
 * Render monthly cash report into the reports modal.
 * Shows flagged partial values and error banners when transactions are invalid.
 *
 * @param {string} [targetMonth] Optional YYYY-MM override.
 * @returns {object|null} The calculated report object.
 */
export const renderMonthlyCashReport = (targetMonth) => {
  if (typeof document === 'undefined') return null;

  const month = targetMonth || getCurrentReportMonth();
  const state = getState();
  const report = buildMonthlyCashReport(state, month);

  // Synchronize month input
  const monthInput = document.getElementById('cash-report-month');
  if (monthInput && monthInput.value !== month) {
    monthInput.value = month;
  }

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

  // Alert box for invalid transactions
  const alertEl = document.getElementById('cash-report-alert');
  if (alertEl) {
    if (report.hasErrors && report.invalidTransactions?.length > 0) {
      const count = report.invalidTransactions.length;
      const sampleList = report.invalidTransactions
        .slice(0, 5)
        .map((bad) => `<li><b>${escapeHtml(bad.id)}</b>: ${escapeHtml(bad.reason)}</li>`)
        .join('');
      const moreText = count > 5 ? `<li>...dan ${count - 5} data lainnya</li>` : '';

      alertEl.style.display = 'block';
      alertEl.innerHTML = `
        <div class="card p-12" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); border-radius: var(--r-md); color: var(--danger);">
          <div style="font-weight: 600; display: flex; align-items: center; gap: 6px;">
            <i class="ph-bold ph-warning-circle fs-16"></i>
            Perhatian: Ditemukan ${count} transaksi invalid yang dilewati dari buku kas!
          </div>
          <div class="fs-12" style="margin-top: 4px; color: var(--text-main);">
            Periksa data berikut agar uang kas tidak hilang tanpa pencatatan:
          </div>
          <ul style="margin: 6px 0 0 18px; padding: 0; font-size: 11.5px; color: var(--text-muted);">
            ${sampleList}
            ${moreText}
          </ul>
        </div>
      `;
    } else {
      alertEl.style.display = 'none';
      alertEl.innerHTML = '';
    }
  }

  // Detail table rows
  const tbody = document.getElementById('cash-report-details');
  if (tbody) {
    if (report.details.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
            Tidak ada transaksi tercatat pada periode ${escapeHtml(report.month)}.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = report.details
        .map((item, idx) => {
          const masukStr = item.type === 'Masuk' ? `+${formatRp(item.nominal)}` : '-';
          const keluarStr = item.type === 'Keluar' ? `-${formatRp(item.nominal)}` : '-';
          const masukStyle = item.type === 'Masuk' ? 'color: var(--income-strong); font-weight: 600;' : 'color: var(--text-muted);';
          const keluarStyle = item.type === 'Keluar' ? 'color: var(--danger); font-weight: 600;' : 'color: var(--text-muted);';

          const metaParts = [];
          if (item.kategoriNama && item.kategoriNama !== '-') metaParts.push(escapeHtml(item.kategoriNama));
          if (item.anggotaNama && item.anggotaNama !== '-') metaParts.push(escapeHtml(item.anggotaNama));
          const metaHtml = metaParts.length > 0 ? `<div class="text-muted fs-11">${metaParts.join(' • ')}</div>` : '';
          const ketHtml = item.keterangan ? escapeHtml(item.keterangan) : `<span class="text-muted">(${item.type === 'Masuk' ? 'Pemasukan' : 'Pengeluaran'})</span>`;

          return `
            <tr style="border-bottom: 1px solid var(--border);">
              <td style="text-align: center; padding: 8px 6px; color: var(--text-muted); font-size: 11px;">${idx + 1}</td>
              <td style="padding: 8px 6px; white-space: nowrap;">
                <div style="font-weight: 500;">${escapeHtml(item.dateStr)}</div>
                <div class="text-muted fs-11">${escapeHtml(item.timeStr)} WIB</div>
              </td>
              <td style="padding: 8px 6px;">
                <div>${ketHtml}</div>
                ${metaHtml}
              </td>
              <td style="text-align: right; padding: 8px 6px; font-family: monospace; ${masukStyle}">${masukStr}</td>
              <td style="text-align: right; padding: 8px 6px; font-family: monospace; ${keluarStyle}">${keluarStr}</td>
              <td style="text-align: right; padding: 8px 6px; font-family: monospace; font-weight: 600;">${formatRp(item.balance)}</td>
            </tr>
          `;
        })
        .join('');
    }
  }

  return report;
};

/**
 * Open print dialog for the current monthly cash report.
 * Strictly blocks if report has errors to protect accounting integrity.
 *
 * @param {string} [targetMonth]
 * @param {object} [options]
 * @param {boolean} [options.allowIncomplete=false]
 * @returns {{ report: object, html: string, printed: boolean, blocked: boolean, error?: string }}
 */
export const printMonthlyCashReport = (targetMonth, options = {}) => {
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
 *
 * @param {string} [targetMonth]
 * @param {object} [options]
 * @param {boolean} [options.allowIncomplete=false]
 * @returns {{ report: object, csv: string, exported: boolean, blocked: boolean, error?: string }}
 */
export const exportMonthlyCashCSV = (targetMonth, options = {}) => {
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

  const monthInput = document.getElementById('cash-report-month');
  if (monthInput) {
    if (!monthInput.value) {
      monthInput.value = getDefaultJakartaYearMonth();
    }
    boundMonthHandler = () => renderMonthlyCashReport();
    monthInput.addEventListener('change', boundMonthHandler);
    monthInput.addEventListener('input', boundMonthHandler);
  }

  // Window event listeners (CustomEvents dispatch on window)
  const eventTarget = typeof window !== 'undefined' ? window : document;

  boundModalOpenedHandler = (e) => {
    const modalId = e?.detail?.id || e?.detail?.modalId;
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
    const monthInput = document.getElementById('cash-report-month');
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
