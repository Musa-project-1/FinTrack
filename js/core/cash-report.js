/**
 * @module cash-report
 * Monthly cash accounting reports (Buku Kas Bulanan).
 *
 * Guarantees:
 * 1. Transactions are bound by calendar transaction Timestamp (Asia/Jakarta, UTC+7),
 *    NOT dues periods (Bulan_Iuran / Tahun_Iuran).
 * 2. Opening balance carries all prior transactions up to 23:59:59.999 (Jakarta time)
 *    of the prior month:
 *    openingBalance + income - expense = closingBalance.
 * 3. Deterministic detail ordering: chronological by timestamp ascending,
 *    tie-broken by ID_Transaksi ascending.
 * 4. Invalid timestamps, non-numeric or non-positive amounts, and corrupt flows
 *    are explicitly flagged and reported without silent dropped money.
 * 5. Strict escaping of HTML and spreadsheet formula injection characters in CSV.
 */

import { formatRp, escapeHtml } from './utils.js';

export const ACCOUNTING_TIMEZONE = 'Asia/Jakarta';

/**
 * Regex for unambiguous ISO-8601 strings with timezone:
 * - Ending with Z (UTC), e.g. 2026-10-31T17:00:00.000Z or 2026-10-31T17:00:00Z
 * - Ending with explicit offset [+-]HH:MM or [+-]HHMM or [+-]HH, e.g. 2026-10-20T12:00:00+07:00
 */
const ISO_WITH_TZ_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

/**
 * Regex for date-only format (YYYY-MM-DD), compatible with HTML5 <input type="date">.
 * Interpreted as calendar date pinned to UTC midnight to avoid local-machine drift.
 */
const DATE_ONLY_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validate a YYYY-MM string.
 * @param {string} yearMonth
 * @returns {{ year: number, month: number, yearMonth: string }}
 */
export const validateYearMonth = (yearMonth) => {
  if (typeof yearMonth !== 'string') {
    throw new Error(`Invalid yearMonth: expected string, got ${typeof yearMonth}`);
  }
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(yearMonth.trim());
  if (!match) {
    throw new Error(`Invalid yearMonth format: "${yearMonth}". Expected "YYYY-MM" (e.g. "2026-10")`);
  }
  const year = Number(match[1]);
  if (year < 2000 || year > 2100) {
    throw new Error(`Invalid yearMonth: year ${year} is outside valid accounting range (2000-2100)`);
  }
  return {
    year,
    month: Number(match[2]),
    yearMonth: `${match[1]}-${match[2]}`
  };
};

/**
 * Parse an unambiguous transaction timestamp into epoch ms and Jakarta calendar components.
 * Rejects ambiguous strings (missing timezone, localized slashes) that cause machine-dependent drift.
 *
 * Accepted unambiguous formats:
 * 1. ISO-8601 with explicit Z or timezone offset (e.g. "2026-10-31T17:00:00.000Z", "2026-10-20T12:00:00+07:00")
 * 2. Date-only "YYYY-MM-DD" (pinned deterministically to UTC midnight, e.g. "2026-10-15")
 * 3. Date instances with valid epoch ms
 * 4. Numeric timestamps (epoch ms > 0)
 *
 * @param {string|number|Date} timestamp
 * @returns {{ epochMs: number, year: number, month: number, day: number, yearMonth: string, dateStr: string, timeStr: string, fullStr: string } | null}
 */
export const parseJakartaTimestamp = (timestamp) => {
  if (timestamp === undefined || timestamp === null || timestamp === '') return null;

  let d = null;

  if (timestamp instanceof Date) {
    if (Number.isNaN(timestamp.getTime())) return null;
    d = timestamp;
  } else if (typeof timestamp === 'number') {
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
    d = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim();
    if (!trimmed) return null;

    if (ISO_WITH_TZ_RE.test(trimmed)) {
      d = new Date(trimmed);
    } else if (DATE_ONLY_RE.test(trimmed)) {
      // Deterministically pin date-only strings to UTC midnight to avoid client timezone offset drift
      d = new Date(`${trimmed}T00:00:00.000Z`);
    } else if (/^\d{10,13}$/.test(trimmed)) {
      // Numeric string epoch ms / seconds
      const num = Number(trimmed);
      const ms = trimmed.length === 10 ? num * 1000 : num;
      d = new Date(ms);
    } else {
      // Ambiguous date string (missing timezone offset, localized slashes, etc.)
      return null;
    }
  } else {
    return null;
  }

  const epochMs = d.getTime();
  if (Number.isNaN(epochMs)) return null;

  // Sanity check year range (2000 - 2100)
  const utcYear = d.getUTCFullYear();
  if (utcYear < 2000 || utcYear > 2100) return null;

  try {
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ACCOUNTING_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);

    let y = 0, m = 0, day = 0;
    for (const part of dateParts) {
      if (part.type === 'year') y = Number(part.value);
      if (part.type === 'month') m = Number(part.value);
      if (part.type === 'day') day = Number(part.value);
    }

    const mm = String(m).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const yearMonth = `${y}-${mm}`;
    const dateStr = `${y}-${mm}-${dd}`;

    const timeStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: ACCOUNTING_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d);

    const fullStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: ACCOUNTING_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);

    return { epochMs, year: y, month: m, day, yearMonth, dateStr, timeStr, fullStr };
  } catch (err) {
    return null;
  }
};

/** Alias for parseJakartaTimestamp */
export const parseTimestamp = parseJakartaTimestamp;

/**
 * Validate a transaction record for financial ledger accounting.
 * Enforces stable integer money (no fractions) and unambiguous dates.
 * Returns { valid: true, nominal, flow, parsed, id } or { valid: false, reason, id }.
 *
 * @param {object} t
 * @returns {{ valid: boolean, nominal?: number, flow?: 'Masuk'|'Keluar', parsed?: object, reason?: string, id: string }}
 */
export const validateTransaction = (t) => {
  const id = t?.ID_Transaksi || '(tanpa-id)';
  if (!t || typeof t !== 'object') {
    return { valid: false, reason: 'Transaksi bukan objek valid', id };
  }

  const parsed = parseJakartaTimestamp(t.Timestamp);
  if (!parsed) {
    return { valid: false, reason: `Timestamp invalid atau ambigu (harus ISO-8601 dengan timezone UTC/WIB atau YYYY-MM-DD): "${t.Timestamp}"`, id };
  }

  const rawNominal = t.Nominal;
  if (rawNominal === null || rawNominal === undefined || rawNominal === '') {
    return { valid: false, reason: 'Nominal tidak boleh kosong', id };
  }
  const nominal = typeof rawNominal === 'number' ? rawNominal : Number(String(rawNominal).trim());
  if (Number.isNaN(nominal) || !Number.isFinite(nominal)) {
    return { valid: false, reason: `Nominal bukan angka valid: "${rawNominal}"`, id };
  }
  if (!Number.isInteger(nominal)) {
    return { valid: false, reason: `Nominal harus berupa bilangan bulat tanpa pecahan (integer): "${rawNominal}"`, id };
  }
  if (nominal <= 0) {
    return { valid: false, reason: `Nominal harus bernilai positif (> 0): ${nominal}`, id };
  }
  if (nominal > 1_000_000_000_000) {
    return { valid: false, reason: `Nominal melebihi batas wajar: ${nominal}`, id };
  }

  const flow = t.Tipe_Arus;
  if (flow !== 'Masuk' && flow !== 'Keluar') {
    return { valid: false, reason: `Tipe_Arus tidak valid: "${flow}". Harus 'Masuk' atau 'Keluar'`, id };
  }

  return { valid: true, nominal, flow, parsed, id };
};

/**
 * Build monthly cash report for a given group state and YYYY-MM period.
 *
 * @param {object} state
 * @param {Array<object>} state.transaksi
 * @param {Array<object>} [state.anggota]
 * @param {Array<object>} [state.kategori]
 * @param {string} yearMonth Target month in "YYYY-MM" format.
 * @param {object} [options]
 * @param {boolean} [options.strict=false] Throw Error if invalid transaction encountered.
 * @returns {object} Monthly cash report.
 */
export const buildMonthlyCashReport = (state, yearMonth, options = {}) => {
  const { year, month, yearMonth: targetYearMonth } = validateYearMonth(yearMonth);
  const strict = Boolean(options.strict);

  const transactions = Array.isArray(state?.transaksi) ? state.transaksi : [];
  const members = Array.isArray(state?.anggota) ? state.anggota : [];
  const categories = Array.isArray(state?.kategori) ? state.kategori : [];

  const memberMap = new Map(members.map((m) => [m.ID_Anggota, m.Nama_Anggota]));
  const categoryMap = new Map(categories.map((c) => [c.ID_Kategori, c.Nama_Kategori]));

  let openingBalance = 0;
  let income = 0;
  let expense = 0;

  const currentDetails = [];
  const invalidTransactions = [];

  for (const t of transactions) {
    const val = validateTransaction(t);
    if (!val.valid) {
      if (strict) {
        throw new Error(`Invalid transaction ${val.id}: ${val.reason}`);
      }
      invalidTransactions.push({
        id: val.id,
        reason: val.reason,
        rawTimestamp: t?.Timestamp,
        rawNominal: t?.Nominal,
        rawFlow: t?.Tipe_Arus,
        transaction: t
      });
      continue;
    }

    const { nominal, flow, parsed } = val;

    if (parsed.yearMonth < targetYearMonth) {
      // Prior transactions contribute to opening balance
      if (flow === 'Masuk') {
        openingBalance += nominal;
      } else {
        openingBalance -= nominal;
      }
    } else if (parsed.yearMonth === targetYearMonth) {
      // Current month transaction
      if (flow === 'Masuk') {
        income += nominal;
      } else {
        expense += nominal;
      }

      currentDetails.push({
        id: t.ID_Transaksi,
        timestamp: t.Timestamp,
        epochMs: parsed.epochMs,
        dateStr: parsed.dateStr,
        timeStr: parsed.timeStr,
        fullDateStr: parsed.fullStr,
        type: flow,
        nominal,
        kategoriId: t.ID_Kategori || '',
        kategoriNama: categoryMap.get(t.ID_Kategori) || (t.ID_Kategori && t.ID_Kategori !== '-' ? t.ID_Kategori : '-'),
        anggotaId: t.ID_Anggota || '',
        anggotaNama: memberMap.get(t.ID_Anggota) || (t.ID_Anggota && t.ID_Anggota !== '-' ? t.ID_Anggota : '-'),
        keterangan: t.Keterangan || '',
        bulanIuran: t.Bulan_Iuran || '',
        tahunIuran: t.Tahun_Iuran || '',
        raw: t
      });
    }
    // Future transactions (> targetYearMonth) are deliberately ignored
  }

  // Deterministic sorting: chronological by epochMs ascending, then ID_Transaksi ascending
  currentDetails.sort((a, b) => {
    if (a.epochMs !== b.epochMs) {
      return a.epochMs - b.epochMs;
    }
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  // Calculate cumulative running balance for each detail item
  let runningBalance = openingBalance;
  for (const item of currentDetails) {
    if (item.type === 'Masuk') {
      runningBalance += item.nominal;
    } else {
      runningBalance -= item.nominal;
    }
    item.balance = runningBalance;
  }

  const closingBalance = openingBalance + income - expense;

  return {
    month: targetYearMonth,
    year,
    monthNumber: month,
    timeZone: ACCOUNTING_TIMEZONE,
    openingBalance,
    income,
    expense,
    netChange: income - expense,
    closingBalance,
    details: currentDetails,
    invalidTransactions,
    hasErrors: invalidTransactions.length > 0,
    generatedAt: new Date().toISOString()
  };
};

/**
 * Neutralize formula injection in CSV exports and escape double quotes.
 *
 * @param {*} value
 * @param {boolean} [isNumeric=false]
 * @returns {string}
 */
export const escapeCsvFormula = (value, isNumeric = false) => {
  if (value === null || value === undefined) return '""';
  if (isNumeric) {
    const num = Number(value);
    return Number.isFinite(num) ? String(num) : '""';
  }
  let str = String(value);
  // Neutralize spreadsheet formula triggers (=, +, -, @, tab, cr, lf)
  if (/^\s*[=+\-@\t\r\n]/.test(str)) {
    str = "'" + str;
  }
  return '"' + str.replace(/"/g, '""') + '"';
};

/**
 * Format a monthly cash report into CSV format (with UTF-8 BOM).
 * Compatible with Indonesian Excel locale (; separator).
 *
 * @param {object} report
 * @param {string} [separator=';']
 * @param {object} [options]
 * @param {boolean} [options.strict=false] Throw error if report.hasErrors
 * @returns {string} CSV text.
 */
export const formatReportToCSV = (report, separator = ';', options = {}) => {
  if (options.strict && report.hasErrors) {
    throw new Error('Laporan kas memiliki data transaksi invalid. Ekspor CSV dibatalkan demi integritas data.');
  }

  const lines = [];

  const row = (...cells) => lines.push(cells.join(separator));

  // Metadata headers
  row(escapeCsvFormula('Laporan Kas Bulanan Finkas'), escapeCsvFormula(''));
  row(escapeCsvFormula('Periode'), escapeCsvFormula(report.month));
  row(escapeCsvFormula('Zona Waktu'), escapeCsvFormula(`${report.timeZone} (WIB)`));
  row(escapeCsvFormula('Waktu Dibuat'), escapeCsvFormula(report.generatedAt));
  row(escapeCsvFormula('Saldo Awal'), escapeCsvFormula(report.openingBalance, true));
  row(escapeCsvFormula('Total Pemasukan'), escapeCsvFormula(report.income, true));
  row(escapeCsvFormula('Total Pengeluaran'), escapeCsvFormula(report.expense, true));
  row(escapeCsvFormula('Saldo Akhir'), escapeCsvFormula(report.closingBalance, true));
  row(escapeCsvFormula(''));

  // Table header
  row(
    escapeCsvFormula('No'),
    escapeCsvFormula('Tanggal'),
    escapeCsvFormula('Waktu (WIB)'),
    escapeCsvFormula('ID Transaksi'),
    escapeCsvFormula('Tipe Arus'),
    escapeCsvFormula('Kategori'),
    escapeCsvFormula('Anggota'),
    escapeCsvFormula('Keterangan'),
    escapeCsvFormula('Masuk'),
    escapeCsvFormula('Keluar'),
    escapeCsvFormula('Saldo Kas')
  );

  // Detail rows
  report.details.forEach((item, index) => {
    const masuk = item.type === 'Masuk' ? item.nominal : 0;
    const keluar = item.type === 'Keluar' ? item.nominal : 0;
    row(
      escapeCsvFormula(index + 1, true),
      escapeCsvFormula(item.dateStr),
      escapeCsvFormula(item.timeStr),
      escapeCsvFormula(item.id),
      escapeCsvFormula(item.type),
      escapeCsvFormula(item.kategoriNama),
      escapeCsvFormula(item.anggotaNama),
      escapeCsvFormula(item.keterangan),
      escapeCsvFormula(masuk, true),
      escapeCsvFormula(keluar, true),
      escapeCsvFormula(item.balance, true)
    );
  });

  // Invalid transactions section if any exist
  if (report.invalidTransactions && report.invalidTransactions.length > 0) {
    row(escapeCsvFormula(''));
    row(escapeCsvFormula('PERINGATAN: DATA INVALID DITEMUKAN (TIDAK MASUK BUKU KAS)'));
    row(escapeCsvFormula('ID'), escapeCsvFormula('Timestamp'), escapeCsvFormula('Nominal'), escapeCsvFormula('Alasan'));
    report.invalidTransactions.forEach((bad) => {
      row(
        escapeCsvFormula(bad.id),
        escapeCsvFormula(bad.rawTimestamp),
        escapeCsvFormula(bad.rawNominal),
        escapeCsvFormula(bad.reason)
      );
    });
  }

  return '\uFEFF' + lines.join('\r\n');
};

/**
 * Format a monthly cash report into a clean, printable HTML document.
 *
 * @param {object} report
 * @param {object} [options]
 * @param {string} [options.groupName='']
 * @returns {string} HTML string.
 */
export const formatReportToHTML = (report, options = {}) => {
  const safeMonth = escapeHtml(report.month);
  const groupTitle = options.groupName ? escapeHtml(options.groupName) : 'FINKAS';

  let detailRowsHtml = '';
  if (report.details.length === 0) {
    detailRowsHtml = `<tr><td colspan="9" style="text-align:center;color:#64748b;padding:24px;">Tidak ada transaksi tercatat pada bulan ini.</td></tr>`;
  } else {
    detailRowsHtml = report.details.map((item, idx) => {
      const masukStr = item.type === 'Masuk' ? formatRp(item.nominal) : '-';
      const keluarStr = item.type === 'Keluar' ? formatRp(item.nominal) : '-';
      const masukClass = item.type === 'Masuk' ? 'color:#059669;font-weight:600;' : 'color:#94a3b8;';
      const keluarClass = item.type === 'Keluar' ? 'color:#e11d48;font-weight:600;' : 'color:#94a3b8;';

      return `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(item.dateStr)} <span style="color:#64748b;font-size:11px;">${escapeHtml(item.timeStr)}</span></td>
        <td style="font-family:monospace;font-size:11px;">${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.kategoriNama)}</td>
        <td>${escapeHtml(item.anggotaNama)}</td>
        <td>${escapeHtml(item.keterangan || '-')}</td>
        <td style="text-align:right;${masukClass}">${masukStr}</td>
        <td style="text-align:right;${keluarClass}">${keluarStr}</td>
        <td style="text-align:right;font-weight:600;">${formatRp(item.balance)}</td>
      </tr>`;
    }).join('');
  }

  let warningBox = '';
  if (report.invalidTransactions && report.invalidTransactions.length > 0) {
    const badRows = report.invalidTransactions.map((bad) =>
      `<li><b>${escapeHtml(bad.id)}</b>: ${escapeHtml(bad.reason)} (Raw: Timestamp="${escapeHtml(bad.rawTimestamp)}", Nominal="${escapeHtml(bad.rawNominal)}")</li>`
    ).join('');
    warningBox = `<div style="margin-top:20px;padding:12px 16px;background:#fef2f2;border:1px solid #f87171;border-radius:6px;color:#991b1b;font-size:12px;">
      <b>Perhatian: Ditemukan ${report.invalidTransactions.length} transaksi invalid yang tidak dihitung ke buku kas:</b>
      <ul style="margin:6px 0 0 16px;padding:0;">${badRows}</ul>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Laporan Kas Bulanan - ${safeMonth}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 0 0 8px 0; font-size: 16px; font-weight: 500; color: #475569; }
    .header p { margin: 0; font-size: 12px; color: #64748b; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #f8fafc; }
    .stat-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .stat-val { font-size: 16px; font-weight: 700; color: #0f172a; font-family: monospace; }
    .stat-val.income { color: #059669; }
    .stat-val.expense { color: #e11d48; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
    th { background: #f1f5f9; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px; text-align: left; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
    .signature { text-align: center; width: 200px; }
    @media print {
      @page { size: portrait; margin: 12mm; }
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${groupTitle}</h1>
    <h2>Laporan Kas Bulanan (Buku Kas)</h2>
    <p>Periode: <b>${safeMonth}</b> | Zona Waktu: <b>${ACCOUNTING_TIMEZONE} (WIB)</b> | Dicetak: ${escapeHtml(new Date().toLocaleString('id-ID', { timeZone: ACCOUNTING_TIMEZONE }))}</p>
  </div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-title">Saldo Awal</div>
      <div class="stat-val">${formatRp(report.openingBalance)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Pemasukan (+)</div>
      <div class="stat-val income">+${formatRp(report.income)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Pengeluaran (-)</div>
      <div class="stat-val expense">-${formatRp(report.expense)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Saldo Akhir</div>
      <div class="stat-val">${formatRp(report.closingBalance)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px;text-align:center;">No</th>
        <th style="width:110px;">Waktu (WIB)</th>
        <th style="width:90px;">ID Transaksi</th>
        <th>Kategori</th>
        <th>Anggota</th>
        <th>Keterangan</th>
        <th style="text-align:right;width:90px;">Masuk</th>
        <th style="text-align:right;width:90px;">Keluar</th>
        <th style="text-align:right;width:95px;">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${detailRowsHtml}
    </tbody>
  </table>

  ${warningBox}

  <div class="footer">
    <div>
      <p style="color:#64748b;font-size:11px;">Dicetak otomatis melalui sistem Finkas.<br>Kebenaran data sesuai dengan transaksi tercatat.</p>
    </div>
    <div class="signature">
      <p>Mengetahui,</p>
      <div style="height:50px;"></div>
      <p><b>Pengurus Kas</b></p>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Scan all transactions to discover all distinct YYYY-MM periods present,
 * sorted descending (newest first).
 *
 * @param {object} state
 * @returns {string[]}
 */
export const getAvailableReportMonths = (state) => {
  const transactions = Array.isArray(state?.transaksi) ? state.transaksi : [];
  const set = new Set();
  for (const t of transactions) {
    const parsed = parseJakartaTimestamp(t.Timestamp);
    if (parsed?.yearMonth) {
      set.add(parsed.yearMonth);
    }
  }
  return Array.from(set).sort().reverse();
};
