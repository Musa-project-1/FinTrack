/**
 * Monthly cash report test suite.
 * Seams: pure core calculations, synthetic ledgers, DOM event integration, no browser storage or network.
 */
import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Install isolated environment before state imports
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const realFetch = globalThis.fetch;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: () => null, setItem() {}, removeItem() {}
} });
globalThis.fetch = async () => { throw new Error('Network prohibited in report tests'); };
after(() => {
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
  else delete globalThis.localStorage;
  globalThis.fetch = realFetch;
});

const cashReport = await import('../js/core/cash-report.js');
const cashReportHandler = await import('../js/handlers/cash-report.js');
const { setState, getState } = await import('../js/core/state.js');

const row = (id, timestamp, amount, flow = 'Masuk', extra = {}) => ({
  ID_Transaksi: id,
  Timestamp: timestamp,
  Nominal: amount,
  Tipe_Arus: flow,
  ID_Anggota: '-',
  ID_Kategori: 'operasional',
  Keterangan: '',
  ...extra
});

const boundaryLedger = [
  row('next', '2026-10-31T17:00:00.000Z', 9000),
  row('last', '2026-10-31T16:59:59.999Z', 4000),
  row('prior-out', '2026-09-30T16:59:59.999Z', 5000, 'Keluar'),
  row('first', '2026-09-30T17:00:00.000Z', 3000, 'Masuk', {
    Bulan_Iuran: 'Agustus', Tahun_Iuran: '2025'
  }),
  row('prior-in', '2026-09-01T00:00:00.000Z', 20000),
  row('expense', '2026-10-15T00:00:00.000Z', 1000, 'Keluar')
];

test('monthly cash uses Jakarta transaction dates, carries opening cash, and excludes dues periods', () => {
  const input = structuredClone(boundaryLedger);
  const report = cashReport.buildMonthlyCashReport({ transaksi: input }, '2026-10');
  assert.equal(report.month, '2026-10');
  assert.equal(report.timeZone, 'Asia/Jakarta');
  assert.equal(report.openingBalance, 15000);
  assert.equal(report.income, 7000);
  assert.equal(report.expense, 1000);
  assert.equal(report.closingBalance, 21000);
  assert.deepEqual(report.details.map((d) => [d.id, d.balance]), [
    ['first', 18000], ['expense', 17000], ['last', 21000]
  ]);
  assert.deepEqual(input, boundaryLedger, 'reports must not mutate the shared ledger');
});

test('transactions with identical timestamps are ordered deterministically by ID', () => {
  const tieLedger = [
    row('trx-b', '2026-10-10T10:00:00.000Z', 1000, 'Masuk'),
    row('trx-a', '2026-10-10T10:00:00.000Z', 2000, 'Masuk'),
    row('trx-c', '2026-10-10T10:00:00.000Z', 3000, 'Masuk')
  ];
  const report = cashReport.buildMonthlyCashReport({ transaksi: tieLedger }, '2026-10');
  assert.deepEqual(report.details.map((d) => d.id), ['trx-a', 'trx-b', 'trx-c']);
});

test('stable integer money validation rejects fractional money and non-numeric inputs', () => {
  assert.equal(cashReport.validateTransaction(row('t1', '2026-10-05T00:00:00.000Z', 10000)).valid, true);
  assert.equal(cashReport.validateTransaction(row('t2', '2026-10-05T00:00:00.000Z', '25000')).valid, true);

  // Fractional amounts must be rejected without rounding
  const frac1 = cashReport.validateTransaction(row('t3', '2026-10-05T00:00:00.000Z', 1000.5));
  assert.equal(frac1.valid, false);
  assert.match(frac1.reason, /pecahan/i);

  const frac2 = cashReport.validateTransaction(row('t4', '2026-10-05T00:00:00.000Z', '5000.75'));
  assert.equal(frac2.valid, false);
  assert.match(frac2.reason, /pecahan/i);

  // Non-positive and NaN values
  assert.equal(cashReport.validateTransaction(row('t5', '2026-10-05T00:00:00.000Z', 0)).valid, false);
  assert.equal(cashReport.validateTransaction(row('t6', '2026-10-05T00:00:00.000Z', -100)).valid, false);
  assert.equal(cashReport.validateTransaction(row('t7', '2026-10-05T00:00:00.000Z', 'abc')).valid, false);
  assert.equal(cashReport.validateTransaction(row('t8', '2026-10-05T00:00:00.000Z', null)).valid, false);
});

test('unambiguous timestamp parsing rejects timezone-ambiguous strings and accepts standard formats', () => {
  // Valid unambiguous formats
  assert.ok(cashReport.parseJakartaTimestamp('2026-10-05T00:00:00.000Z'));
  assert.ok(cashReport.parseJakartaTimestamp('2026-10-05T07:00:00+07:00'));
  assert.ok(cashReport.parseJakartaTimestamp('2026-10-05')); // Date-only YYYY-MM-DD
  assert.ok(cashReport.parseJakartaTimestamp(1761652800000)); // Epoch ms
  assert.ok(cashReport.parseJakartaTimestamp(new Date('2026-10-05T00:00:00.000Z')));

  // Ambiguous strings without timezone offset must be rejected to prevent machine-local drift
  assert.equal(cashReport.parseJakartaTimestamp('2026-10-05 14:00'), null);
  assert.equal(cashReport.parseJakartaTimestamp('2026-10-05T14:00:00'), null);
  assert.equal(cashReport.parseJakartaTimestamp('10/05/2026'), null);
  assert.equal(cashReport.parseJakartaTimestamp('05-10-2026'), null);
  assert.equal(cashReport.parseJakartaTimestamp('2026/10/05'), null);
  assert.equal(cashReport.parseJakartaTimestamp('not-a-date'), null);
  assert.equal(cashReport.parseJakartaTimestamp(''), null);
});

test('invalid timestamps and invalid amounts are flagged and reported without silent dropped money', () => {
  const messyLedger = [
    row('valid-1', '2026-10-05T00:00:00.000Z', 10000, 'Masuk'),
    row('bad-date', 'not-a-date', 5000, 'Masuk'),
    row('bad-date-ambig', '2026-10-06 14:00', 4000, 'Masuk'),
    row('bad-amount-nan', '2026-10-06T00:00:00.000Z', 'NaN', 'Masuk'),
    row('bad-amount-frac', '2026-10-06T00:00:00.000Z', 1000.5, 'Masuk'),
    row('bad-amount-neg', '2026-10-07T00:00:00.000Z', -2000, 'Masuk'),
    row('bad-amount-zero', '2026-10-08T00:00:00.000Z', 0, 'Keluar'),
    row('bad-flow', '2026-10-09T00:00:00.000Z', 3000, 'Unknown')
  ];

  // In lenient mode (default), report surfaces invalid entries in invalidTransactions
  const report = cashReport.buildMonthlyCashReport({ transaksi: messyLedger }, '2026-10');
  assert.equal(report.hasErrors, true);
  assert.equal(report.invalidTransactions.length, 7);
  const badIds = report.invalidTransactions.map((e) => e.id);
  assert.ok(badIds.includes('bad-date'));
  assert.ok(badIds.includes('bad-date-ambig'));
  assert.ok(badIds.includes('bad-amount-nan'));
  assert.ok(badIds.includes('bad-amount-frac'));
  assert.ok(badIds.includes('bad-amount-neg'));
  assert.ok(badIds.includes('bad-amount-zero'));
  assert.ok(badIds.includes('bad-flow'));
  assert.equal(report.income, 10000);
  assert.equal(report.closingBalance, 10000);

  // In strict mode, buildMonthlyCashReport rejects with Error
  assert.throws(() => {
    cashReport.buildMonthlyCashReport({ transaksi: messyLedger }, '2026-10', { strict: true });
  }, /Invalid transaction/);
});

test('invalid yearMonth string is rejected', () => {
  assert.throws(() => {
    cashReport.buildMonthlyCashReport({ transaksi: [] }, '2026-13');
  }, /Invalid yearMonth/);
  assert.throws(() => {
    cashReport.buildMonthlyCashReport({ transaksi: [] }, 'invalid');
  }, /Invalid yearMonth/);
  assert.throws(() => {
    cashReport.buildMonthlyCashReport({ transaksi: [] }, '');
  }, /Invalid yearMonth/);
});

test('CSV formula injection characters are neutralized', () => {
  assert.equal(cashReport.escapeCsvFormula('=SUM(A1:A10)'), `"'=SUM(A1:A10)"`);
  assert.equal(cashReport.escapeCsvFormula('+12345'), ` "'+12345"`.trim());
  assert.equal(cashReport.escapeCsvFormula('-12345'), ` "'-12345"`.trim());
  assert.equal(cashReport.escapeCsvFormula('@cmd'), `"'@cmd"`);
  assert.equal(cashReport.escapeCsvFormula('\tcmd'), `"'\tcmd"`);
  assert.equal(cashReport.escapeCsvFormula('\rcmd'), `"'\rcmd"`);
  assert.equal(cashReport.escapeCsvFormula('Normal Text'), `"Normal Text"`);
  assert.equal(cashReport.escapeCsvFormula('Text with "quotes"'), `"Text with ""quotes"""`);
  assert.equal(cashReport.escapeCsvFormula(15000, true), '15000');
});

test('CSV export contains accounting header, metadata, escaped rows, and UTF-8 BOM', () => {
  const ledger = [
    row('trx-1', '2026-10-02T03:00:00.000Z', 50000, 'Masuk', {
      Keterangan: '=cmd|/C calc',
      ID_Anggota: 'A01'
    }),
    row('trx-2', '2026-10-03T04:00:00.000Z', 15000, 'Keluar', {
      Keterangan: 'Beli ATK "Buku"'
    })
  ];
  const state = {
    transaksi: ledger,
    anggota: [{ ID_Anggota: 'A01', Nama_Anggota: 'Budi Santoso' }],
    kategori: [{ ID_Kategori: 'operasional', Nama_Kategori: 'Operasional Kas' }]
  };
  const report = cashReport.buildMonthlyCashReport(state, '2026-10');
  const csv = cashReport.formatReportToCSV(report);

  assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
  assert.ok(csv.includes('Laporan Kas Bulanan'), 'CSV must include title');
  assert.ok(csv.includes('2026-10'), 'CSV must include period');
  assert.ok(csv.includes('Asia/Jakarta'), 'CSV must include timezone');
  assert.ok(csv.includes('Budi Santoso'), 'CSV must include member name');
  assert.ok(csv.includes(`"'=cmd|/C calc"`), 'Formula in keterangan must be neutralized with apostrophe');
  assert.ok(csv.includes(`"Beli ATK ""Buku"""`), 'Quotes in keterangan must be doubled');
});

test('HTML print output escapes text safely against XSS', () => {
  const ledger = [
    row('trx-xss', '2026-10-04T05:00:00.000Z', 20000, 'Masuk', {
      Keterangan: '<script>alert("xss")</script>'
    })
  ];
  const state = {
    transaksi: ledger,
    anggota: [{ ID_Anggota: '-', Nama_Anggota: '<img src=x onerror=alert(1)>' }],
    kategori: [{ ID_Kategori: 'operasional', Nama_Kategori: '<b>Operasional</b>' }]
  };
  const report = cashReport.buildMonthlyCashReport(state, '2026-10');
  const html = cashReport.formatReportToHTML(report);

  assert.ok(!html.includes('<script>'), 'Raw script tags must not appear in HTML');
  assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'), 'Keterangan must be HTML-escaped');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'Member name must be HTML-escaped');
  assert.ok(html.includes('&lt;b&gt;Operasional&lt;/b&gt;'), 'Category name must be HTML-escaped');
  assert.ok(html.includes('Asia/Jakarta (WIB)'), 'HTML must declare Asia/Jakarta accounting timezone');
});

test('getAvailableReportMonths discovers all distinct YYYY-MM periods present in ledger', () => {
  const ledger = [
    row('t1', '2026-08-15T00:00:00.000Z', 1000),
    row('t2', '2026-09-20T00:00:00.000Z', 2000),
    row('t3', '2026-10-01T00:00:00.000Z', 3000),
    row('t4', '2026-10-15T00:00:00.000Z', 4000)
  ];
  const months = cashReport.getAvailableReportMonths({ transaksi: ledger });
  assert.deepEqual(months, ['2026-10', '2026-09', '2026-08']);
});

test('handles empty transactions ledger gracefully', () => {
  const report = cashReport.buildMonthlyCashReport({ transaksi: [] }, '2026-10');
  assert.equal(report.openingBalance, 0);
  assert.equal(report.income, 0);
  assert.equal(report.expense, 0);
  assert.equal(report.closingBalance, 0);
  assert.equal(report.details.length, 0);
  assert.equal(report.hasErrors, false);
});

// Helper for synthetic DOM mock
function createMockDOM(initialMonth = '2026-10') {
  const elements = new Map();
  const listeners = new Map();

  function makeEl(tag = 'div') {
    const el = {
      tagName: tag.toUpperCase(),
      value: '',
      textContent: '',
      innerHTML: '',
      style: { display: '' },
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      },
      attributes: new Map(),
      setAttribute(k, v) { this.attributes.set(k, String(v)); },
      removeAttribute(k) { this.attributes.delete(k); },
      getAttribute(k) { return this.attributes.get(k) || null; },
      _events: new Map(),
      addEventListener(type, fn) {
        if (!this._events.has(type)) this._events.set(type, []);
        this._events.get(type).push(fn);
      },
      removeEventListener(type, fn) {
        const arr = this._events.get(type) || [];
        this._events.set(type, arr.filter((f) => f !== fn));
      },
      dispatchEvent(event) {
        const arr = this._events.get(event.type) || [];
        arr.forEach((fn) => fn(event));
      }
    };
    return el;
  }

  // Pre-populate standard reports modal elements
  const ids = [
    'cash-report-month',
    'cash-report-saldo-awal',
    'cash-report-pemasukan',
    'cash-report-pengeluaran',
    'cash-report-saldo-akhir',
    'cash-report-details',
    'cash-report-alert',
    'btn-print-monthly-report',
    'btn-export-monthly-csv',
    'modal-export'
  ];
  ids.forEach((id) => elements.set(id, makeEl()));
  elements.get('cash-report-month').value = initialMonth;

  const windowEvents = new Map();

  const mockWindow = {
    addEventListener(type, fn) {
      if (!windowEvents.has(type)) windowEvents.set(type, []);
      windowEvents.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = windowEvents.get(type) || [];
      windowEvents.set(type, arr.filter((f) => f !== fn));
    },
    dispatchEvent(event) {
      const arr = windowEvents.get(event.type) || [];
      arr.forEach((fn) => fn(event));
    },
    open: () => ({
      document: { open() {}, write() {}, close() {} },
      focus() {},
      addEventListener() {},
      print() {}
    })
  };

  const mockDocument = {
    getElementById: (id) => elements.get(id) || null,
    createElement: (tag) => {
      const el = makeEl(tag);
      el.parentNode = mockDocument.body;
      el.click = () => {};
      return el;
    },
    body: {
      appendChild: (el) => { el.parentNode = mockDocument.body; },
      removeChild: (el) => { el.parentNode = null; }
    },
    addEventListener: (type, fn) => mockWindow.addEventListener(type, fn),
    removeEventListener: (type, fn) => mockWindow.removeEventListener(type, fn),
    dispatchEvent: (event) => mockWindow.dispatchEvent(event)
  };

  return { elements, mockDocument, mockWindow, windowEvents };
}

test('cash report handler renders monthly report and populates DOM elements', () => {
  const { elements, mockDocument, mockWindow } = createMockDOM('2026-10');
  const oldDoc = globalThis.document;
  const oldWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  try {
    const prevState = getState();
    setState({
      transaksi: structuredClone(boundaryLedger),
      anggota: [],
      kategori: []
    });

    const report = cashReportHandler.renderMonthlyCashReport('2026-10');
    assert.equal(report.month, '2026-10');
    assert.equal(elements.get('cash-report-saldo-awal').textContent, 'Rp\u00A015.000');
    assert.equal(elements.get('cash-report-pemasukan').textContent, '+Rp\u00A07.000');
    assert.equal(elements.get('cash-report-pengeluaran').textContent, '-Rp\u00A01.000');
    assert.equal(elements.get('cash-report-saldo-akhir').textContent, 'Rp\u00A021.000');
    assert.ok(elements.get('cash-report-details').innerHTML.includes('Rp\u00A021.000'));
    assert.equal(elements.get('cash-report-alert').style.display, 'none');

    // Export buttons should be enabled
    assert.equal(elements.get('btn-print-monthly-report').classList.contains('disabled'), false);
    assert.equal(elements.get('btn-export-monthly-csv').classList.contains('disabled'), false);

    setState(prevState);
  } finally {
    globalThis.document = oldDoc;
    globalThis.window = oldWin;
  }
});

test('cash report handler surfaces alert box and flags export buttons when invalid transactions are present', () => {
  const { elements, mockDocument, mockWindow } = createMockDOM('2026-10');
  const oldDoc = globalThis.document;
  const oldWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  try {
    const prevState = getState();
    setState({
      transaksi: [
        row('good', '2026-10-05T00:00:00.000Z', 10000, 'Masuk'),
        row('bad-1', 'invalid-timestamp', 5000, 'Masuk'),
        row('bad-2', '2026-10-06T00:00:00.000Z', 100.5, 'Masuk')
      ],
      anggota: [],
      kategori: []
    });

    cashReportHandler.renderMonthlyCashReport('2026-10');
    assert.equal(elements.get('cash-report-alert').style.display, 'block');
    assert.ok(elements.get('cash-report-alert').innerHTML.includes('bad-1'));
    assert.ok(elements.get('cash-report-alert').innerHTML.includes('bad-2'));
    assert.ok(elements.get('cash-report-alert').innerHTML.includes('dilewati'));

    // Export buttons should reflect disabled/warning state
    assert.equal(elements.get('btn-print-monthly-report').classList.contains('disabled'), true);
    assert.equal(elements.get('btn-export-monthly-csv').classList.contains('disabled'), true);

    setState(prevState);
  } finally {
    globalThis.document = oldDoc;
    globalThis.window = oldWin;
  }
});

test('strict exports block: print and CSV are rejected when ledger has invalid transactions', () => {
  const { mockDocument, mockWindow } = createMockDOM('2026-10');
  const oldDoc = globalThis.document;
  const oldWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  try {
    const prevState = getState();
    setState({
      transaksi: [
        row('good', '2026-10-05T00:00:00.000Z', 10000, 'Masuk'),
        row('bad-date', 'not-a-date', 5000, 'Masuk')
      ],
      anggota: [],
      kategori: []
    });

    // Print should block
    const printRes = cashReportHandler.printMonthlyCashReport('2026-10');
    assert.equal(printRes.blocked, true);
    assert.equal(printRes.printed, false);
    assert.equal(printRes.error, 'has_errors');

    // CSV export should block
    const csvRes = cashReportHandler.exportMonthlyCashCSV('2026-10');
    assert.equal(csvRes.blocked, true);
    assert.equal(csvRes.exported, false);
    assert.equal(csvRes.error, 'has_errors');

    setState(prevState);
  } finally {
    globalThis.document = oldDoc;
    globalThis.window = oldWin;
  }
});

test('printMonthlyCashReport and exportMonthlyCashCSV succeed when ledger is valid', () => {
  const { mockDocument, mockWindow } = createMockDOM('2026-10');
  const oldDoc = globalThis.document;
  const oldWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  const prevState = getState();
  setState({
    transaksi: structuredClone(boundaryLedger),
    anggota: [{ ID_Anggota: '-', Nama_Anggota: 'Kas Umum' }],
    kategori: [{ ID_Kategori: 'operasional', Nama_Kategori: 'Operasional' }]
  });

  try {
    const printRes = cashReportHandler.printMonthlyCashReport('2026-10');
    assert.equal(printRes.blocked, false);
    assert.equal(printRes.printed, true);
    assert.equal(printRes.report.month, '2026-10');
    assert.ok(printRes.html.includes('Laporan Kas Bulanan'));
    assert.ok(printRes.html.includes('Rp&nbsp;21.000') || printRes.html.includes('Rp 21.000') || printRes.html.includes('21.000'));

    const csvRes = cashReportHandler.exportMonthlyCashCSV('2026-10');
    assert.equal(csvRes.blocked, false);
    assert.equal(csvRes.exported, true);
    assert.equal(csvRes.report.month, '2026-10');
    assert.ok(csvRes.csv.startsWith('\uFEFF'));
    assert.ok(csvRes.csv.includes('21000'));
  } finally {
    setState(prevState);
    globalThis.document = oldDoc;
    globalThis.window = oldWin;
  }
});

test('controller integration: month input changes and window events trigger report updates', () => {
  const { elements, mockDocument, mockWindow } = createMockDOM('2026-10');
  const oldDoc = globalThis.document;
  const oldWin = globalThis.window;
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  try {
    const prevState = getState();
    setState({
      transaksi: [
        row('sep-1', '2026-09-10T10:00:00.000Z', 5000, 'Masuk'),
        row('oct-1', '2026-10-10T10:00:00.000Z', 12000, 'Masuk')
      ],
      anggota: [],
      kategori: []
    });

    cashReportHandler.destroyCashReportListeners();
    // Initialize controller idempotently
    cashReportHandler.initMonthlyCashReport();
    cashReportHandler.initMonthlyCashReport(); // Idempotency check: 2nd call must not duplicate listeners

    // Verify initial render for October
    assert.equal(elements.get('cash-report-saldo-akhir').textContent, 'Rp\u00A017.000');

    // 1. User changes month in input element
    const monthInput = elements.get('cash-report-month');
    monthInput.value = '2026-09';
    monthInput.dispatchEvent({ type: 'change' });

    // Should re-render for September (Saldo Akhir = 5000)
    assert.equal(elements.get('cash-report-saldo-akhir').textContent, 'Rp\u00A05.000');

    // 2. Window event finkas:modal-opened for modal-export
    monthInput.value = '2026-10';
    mockWindow.dispatchEvent({ type: 'finkas:modal-opened', detail: { id: 'modal-export' } });
    assert.equal(elements.get('cash-report-saldo-akhir').textContent, 'Rp\u00A017.000');

    // 3. Window event finkas:state-changed when modal-export is open
    const modalExport = elements.get('modal-export');
    modalExport.classList.add('active');

    // Add a new transaction to state
    setState({
      transaksi: [
        row('sep-1', '2026-09-10T10:00:00.000Z', 5000, 'Masuk'),
        row('oct-1', '2026-10-10T10:00:00.000Z', 12000, 'Masuk'),
        row('oct-2', '2026-10-15T12:00:00.000Z', 3000, 'Masuk')
      ],
      anggota: [],
      kategori: []
    });
    mockWindow.dispatchEvent({ type: 'finkas:state-changed' });

    // October ending balance should now be 5000 + 12000 + 3000 = 20000
    assert.equal(elements.get('cash-report-saldo-akhir').textContent, 'Rp\u00A020.000');

    // 4. When modal-export is inactive, state-changed does not update DOM
    modalExport.classList.remove('active');
    setState({
      transaksi: [
        row('sep-1', '2026-09-10T10:00:00.000Z', 5000, 'Masuk'),
        row('oct-1', '2026-10-10T10:00:00.000Z', 12000, 'Masuk'),
        row('oct-2', '2026-10-15T12:00:00.000Z', 3000, 'Masuk'),
        row('oct-3', '2026-10-20T12:00:00.000Z', 10000, 'Masuk')
      ],
      anggota: [],
      kategori: []
    });
    mockWindow.dispatchEvent({ type: 'finkas:state-changed' });
    // Still 20000 because modal is closed
    assert.equal(elements.get('cash-report-saldo-akhir').textContent, 'Rp\u00A020.000');

    setState(prevState);
    cashReportHandler.destroyCashReportListeners();
  } finally {
    globalThis.document = oldDoc;
    globalThis.window = oldWin;
  }
});
