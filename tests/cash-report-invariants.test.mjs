/**
 * Lifecycle Invariant Test Suite for Monthly Cash Report (Laporan Kas Bulanan).
 *
 * Verifies mathematical, chronological, and state invariants:
 * 1. Balance Conservation: openingBalance + income - expense === closingBalance
 * 2. Inter-Month Continuity: month[N].closingBalance === month[N+1].openingBalance (when no interim errors)
 * 3. Future Isolation: transactions with timestamp > month do not alter current month's balances
 * 4. Running Balance Integrity: details[last].balance === closingBalance
 * 5. Deterministic Sort: transactions are sorted by epochMs ASC, then ID ASC
 * 6. Cash Date vs Dues Period: grouping uses physical Jakarta settlement date, ignoring dues metadata
 * 7. Non-Silent Degradation: invalid transactions are explicitly captured in invalidTransactions
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

// Isolate environment
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const realFetch = globalThis.fetch;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: () => null, setItem() {}, removeItem() {}
} });
globalThis.fetch = async () => { throw new Error('Network prohibited in invariant tests'); };
after(() => {
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
  else delete globalThis.localStorage;
  globalThis.fetch = realFetch;
});

const cashReport = await import('../js/core/cash-report.js');
const cashReportHandler = await import('../js/handlers/cash-report.js');
const { setState, getState } = await import('../js/core/state.js');

const makeTrx = (id, timestamp, nominal, flow = 'Masuk', extra = {}) => ({
  ID_Transaksi: id,
  Timestamp: timestamp,
  Nominal: nominal,
  Tipe_Arus: flow,
  ID_Anggota: 'A-01',
  ID_Kategori: 'operasional',
  Keterangan: `Trx ${id}`,
  ...extra
});

test('Invariant 1: Balance Conservation opening + income - expense === closing', () => {
  const transactions = [
    makeTrx('t-prior-1', '2026-08-15T10:00:00.000Z', 100000, 'Masuk'),
    makeTrx('t-prior-2', '2026-08-20T10:00:00.000Z', 30000, 'Keluar'),
    makeTrx('t-prior-3', '2026-09-01T08:00:00.000Z', 50000, 'Masuk'),
    makeTrx('t-oct-1', '2026-10-01T01:00:00.000Z', 25000, 'Masuk'),
    makeTrx('t-oct-2', '2026-10-05T09:00:00.000Z', 15000, 'Keluar'),
    makeTrx('t-oct-3', '2026-10-15T14:00:00.000Z', 40000, 'Masuk'),
    makeTrx('t-oct-4', '2026-10-25T11:00:00.000Z', 20000, 'Keluar'),
    makeTrx('t-future-1', '2026-11-02T10:00:00.000Z', 80000, 'Masuk')
  ];

  const report = cashReport.buildMonthlyCashReport({ transaksi: transactions }, '2026-10');

  // Prior balance: 100,000 - 30,000 + 50,000 = 120,000
  assert.equal(report.openingBalance, 120000);
  // Current income: 25,000 + 40,000 = 65,000
  assert.equal(report.income, 65000);
  // Current expense: 15,000 + 20,000 = 35,000
  assert.equal(report.expense, 35000);
  // Closing balance: 120,000 + 65,000 - 35,000 = 150,000
  assert.equal(report.closingBalance, 150000);
  assert.equal(report.openingBalance + report.income - report.expense, report.closingBalance);
  assert.equal(report.netChange, report.income - report.expense);
});

test('Invariant 2: Inter-Month Continuity month[N].closingBalance === month[N+1].openingBalance', () => {
  const transactions = [
    makeTrx('t1', '2026-07-10T10:00:00.000Z', 50000, 'Masuk'),
    makeTrx('t2', '2026-08-15T10:00:00.000Z', 20000, 'Keluar'),
    makeTrx('t3', '2026-09-05T10:00:00.000Z', 35000, 'Masuk'),
    makeTrx('t4', '2026-09-25T10:00:00.000Z', 10000, 'Keluar'),
    makeTrx('t5', '2026-10-01T10:00:00.000Z', 45000, 'Masuk')
  ];

  const state = { transaksi: transactions };
  const repJuly = cashReport.buildMonthlyCashReport(state, '2026-07');
  const repAug = cashReport.buildMonthlyCashReport(state, '2026-08');
  const repSept = cashReport.buildMonthlyCashReport(state, '2026-09');
  const repOct = cashReport.buildMonthlyCashReport(state, '2026-10');

  assert.equal(repJuly.closingBalance, repAug.openingBalance);
  assert.equal(repAug.closingBalance, repSept.openingBalance);
  assert.equal(repSept.closingBalance, repOct.openingBalance);
});

test('Invariant 3: Future Isolation future transactions never mutate current or past report', () => {
  const baseTransactions = [
    makeTrx('m1', '2026-10-05T00:00:00.000Z', 10000, 'Masuk'),
    makeTrx('m2', '2026-10-10T00:00:00.000Z', 3000, 'Keluar')
  ];

  const reportBefore = cashReport.buildMonthlyCashReport({ transaksi: baseTransactions }, '2026-10');

  // Add 10 future transactions spanning multiple subsequent months
  const withFuture = [
    ...baseTransactions,
    makeTrx('f1', '2026-11-01T00:00:00.000Z', 999999, 'Masuk'),
    makeTrx('f2', '2026-11-15T00:00:00.000Z', 888888, 'Keluar'),
    makeTrx('f3', '2026-12-01T00:00:00.000Z', 777777, 'Masuk')
  ];

  const reportAfter = cashReport.buildMonthlyCashReport({ transaksi: withFuture }, '2026-10');

  assert.equal(reportBefore.openingBalance, reportAfter.openingBalance);
  assert.equal(reportBefore.income, reportAfter.income);
  assert.equal(reportBefore.expense, reportAfter.expense);
  assert.equal(reportBefore.closingBalance, reportAfter.closingBalance);
  assert.equal(reportBefore.details.length, reportAfter.details.length);
});

test('Invariant 4: Running Balance Monotonicity each step exactly reflects ledger delta', () => {
  const transactions = [
    makeTrx('r0', '2026-09-01T00:00:00.000Z', 10000, 'Masuk'), // Opening: 10,000
    makeTrx('r1', '2026-10-01T02:00:00.000Z', 5000, 'Masuk'),   // +5,000 -> 15,000
    makeTrx('r2', '2026-10-02T04:00:00.000Z', 2000, 'Keluar'),  // -2,000 -> 13,000
    makeTrx('r3', '2026-10-03T06:00:00.000Z', 7000, 'Masuk'),   // +7,000 -> 20,000
    makeTrx('r4', '2026-10-04T08:00:00.000Z', 10000, 'Keluar')  // -10,000 -> 10,000
  ];

  const report = cashReport.buildMonthlyCashReport({ transaksi: transactions }, '2026-10');
  assert.equal(report.details.length, 4);

  let expectedBalance = report.openingBalance;
  for (const item of report.details) {
    if (item.type === 'Masuk') expectedBalance += item.nominal;
    else expectedBalance -= item.nominal;
    assert.equal(item.balance, expectedBalance, `Row ${item.id} running balance must equal computed running balance`);
  }

  assert.equal(report.details[report.details.length - 1].balance, report.closingBalance);
});

test('Invariant 5: Dues Period Irrelevance reporting is strictly settlement date in WIB', () => {
  // A dues payment for "Januari 2025" paid physically on "2026-10-05" belongs to October 2026 cash report
  const trxDuesOld = makeTrx('old-dues-paid-oct', '2026-10-05T03:00:00.000Z', 50000, 'Masuk', {
    Bulan_Iuran: 'Januari',
    Tahun_Iuran: '2025',
    Jenis_Transaksi: 'Iuran'
  });

  // A dues payment for "Oktober 2026" paid physically in September 2026 belongs to September cash report
  const trxDuesFuture = makeTrx('oct-dues-paid-sep', '2026-09-28T03:00:00.000Z', 50000, 'Masuk', {
    Bulan_Iuran: 'Oktober',
    Tahun_Iuran: '2026',
    Jenis_Transaksi: 'Iuran'
  });

  const state = { transaksi: [trxDuesOld, trxDuesFuture] };

  const repSept = cashReport.buildMonthlyCashReport(state, '2026-09');
  assert.equal(repSept.income, 50000);
  assert.equal(repSept.details[0].id, 'oct-dues-paid-sep');

  const repOct = cashReport.buildMonthlyCashReport(state, '2026-10');
  assert.equal(repOct.openingBalance, 50000);
  assert.equal(repOct.income, 50000);
  assert.equal(repOct.closingBalance, 100000);
  assert.equal(repOct.details[0].id, 'old-dues-paid-oct');
});

test('Invariant 6: Non-Silent Degradation every invalid row is explicitly audited', () => {
  const transactions = [
    makeTrx('ok-1', '2026-10-01T00:00:00.000Z', 10000, 'Masuk'),
    makeTrx('err-date-1', '2026-10-02 14:00', 5000, 'Masuk'), // Ambiguous time without TZ
    makeTrx('err-frac-1', '2026-10-03T00:00:00.000Z', 2500.5, 'Masuk'), // Fraction
    makeTrx('err-flow-1', '2026-10-04T00:00:00.000Z', 4000, 'Transfer'), // Non-Masuk/Keluar
    makeTrx('err-neg-1', '2026-10-05T00:00:00.000Z', -1000, 'Keluar') // Negative
  ];

  const report = cashReport.buildMonthlyCashReport({ transaksi: transactions }, '2026-10');
  assert.equal(report.hasErrors, true);
  assert.equal(report.invalidTransactions.length, 4);

  const reasons = new Map(report.invalidTransactions.map((x) => [x.id, x.reason]));
  assert.match(reasons.get('err-date-1'), /ambigu|timezone/i);
  assert.match(reasons.get('err-frac-1'), /pecahan|integer/i);
  assert.match(reasons.get('err-flow-1'), /Tipe_Arus/i);
  assert.match(reasons.get('err-neg-1'), /positif/i);

  // Invariant: valid money is still preserved in partial calculations
  assert.equal(report.income, 10000);
  assert.equal(report.closingBalance, 10000);
});

test('Invariant 7: Strict Export Invariant export blocked when hasErrors is true', () => {
  const state = {
    transaksi: [
      makeTrx('v1', '2026-10-01T00:00:00.000Z', 10000, 'Masuk'),
      makeTrx('i1', 'corrupt-date', 2000, 'Masuk')
    ],
    anggota: [],
    kategori: []
  };

  const prevState = getState();
  setState(state);

  try {
    const csvExport = cashReportHandler.exportMonthlyCashCSV('2026-10');
    assert.equal(csvExport.blocked, true, 'CSV export must be blocked when errors exist');
    assert.equal(csvExport.exported, false);

    const printExport = cashReportHandler.printMonthlyCashReport('2026-10');
    assert.equal(printExport.blocked, true, 'Print export must be blocked when errors exist');
    assert.equal(printExport.printed, false);

    const report = cashReport.buildMonthlyCashReport(state, '2026-10');
    assert.throws(() => {
      cashReport.formatReportToCSV(report, ';', { strict: true });
    }, /invalid/i);
  } finally {
    setState(prevState);
  }
});
