import { readWorkspaceFixtureHtml } from './helpers/workspace-fixture.mjs';
// Adversarial worst-case stress suite for MemberSpotlight & WorkspaceStats (no network/storage leaks).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const realDate = Date;
globalThis.Date = class extends realDate {
  constructor(...args) { super(...(args.length ? args : ['2026-11-24T12:00:00+07:00'])); }
  static now() { return new realDate('2026-11-24T12:00:00+07:00').getTime(); }
};
const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Network prohibited in isolated test'); };
after(() => { globalThis.Date = realDate; globalThis.fetch = realFetch; });

const bundle = await import('../src/ui/svelte-dashboard.js');
const {
  NAMA_BULAN, createDuesLedger, formatRp, mountSvelteDashboard, renderHybridChart,
  renderSpotlight, selectStatsMonth, setActiveGroupId, setAdminSession, setAdminViewMode,
  setCurrentRekapYear, setState, showSpotlightDetail
} = bundle;

const read = (relPath) => readFileSync(new URL('../' + relPath, import.meta.url), 'utf8');
const YEAR = 2026;
const tx = (id, { anggota = '-', kategori = 'KAT-K1', tipe = 'Keluar', monthIndex = 0, nominal = 10000, ket = '' } = {}) => ({
  ID_Transaksi: id,
  Timestamp: `${YEAR}-${String(monthIndex + 1).padStart(2, '0')}-15T12:00:00+07:00`,
  Tipe_Arus: tipe,
  ID_Kategori: kategori,
  ID_Anggota: anggota,
  Bulan_Iuran: tipe === 'Masuk' && anggota !== '-' ? NAMA_BULAN[monthIndex] : '-',
  Tahun_Iuran: tipe === 'Masuk' && anggota !== '-' ? String(YEAR) : '-',
  Nominal: nominal,
  Keterangan: ket
});

let dom;
after(() => dom?.window.close());

function installDom(t) {
  dom ??= new JSDOM('', { url: 'https://example.test' });
  const { window } = dom;
  window.document.open();
  window.document.write(readWorkspaceFixtureHtml());
  window.document.close();
  window.localStorage.clear();
  for (const name of ['window', 'document', 'Element', 'HTMLElement', 'HTMLMediaElement', 'Node', 'Text',
    'Comment', 'Event', 'CustomEvent', 'Option', 'MutationObserver', 'localStorage']) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value: window[name], configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }
  const prevMatchMedia = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  window.matchMedia = () => ({ matches: true });
  Object.defineProperty(globalThis, 'matchMedia', { value: window.matchMedia, configurable: true });
  t.after(() => {
    if (prevMatchMedia) Object.defineProperty(globalThis, 'matchMedia', prevMatchMedia);
    else delete globalThis.matchMedia;
  });
  return id => document.getElementById(id);
}

function assertValidSvgGeometry(svg) {
  const vb = svg.getAttribute('viewBox');
  assert.ok(vb, `${svg.id}: viewBox must exist`);
  const nums = vb.trim().split(/\s+/).map(Number);
  assert.equal(nums.length, 4, `${svg.id}: viewBox must have 4 numbers`);
  assert.ok(nums.every(Number.isFinite), `${svg.id}: viewBox has non-finite coordinate: ${vb}`);
  for (const el of svg.querySelectorAll('path, rect, circle, line')) {
    for (const attr of ['d', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'width', 'height', 'stroke-dashoffset']) {
      if (!el.hasAttribute(attr)) continue;
      const val = el.getAttribute(attr);
      assert.doesNotMatch(val, /NaN|Infinity|undefined|null/i, `${svg.id} <${el.tagName} ${attr}="${val}">`);
      if (attr !== 'd') assert.ok(Number.isFinite(Number(val)), `${svg.id} <${el.tagName} ${attr}="${val}"> not finite`);
    }
  }
}

const WORST_XSS_NAME = '<img src=x onerror=alert(1)> <script>alert(1)</script> & **bold**';
const WORST_XSS_CAT = '<script>alert(1)</script> & <b>Biaya</b>';
const WORST_STATE = {
  anggota: [
    { ID_Anggota: 'ANG-RT04-RW09-BENDAHARA-2026-MAX40CHAR01', Nama_Anggota: 'Prof. Dr. Ir. Raden Mas Suryaningrat Kusumawardhana-Wijaya, S.T., M.Kom.', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` },
    { ID_Anggota: 'ANG-85', Nama_Anggota: 'Prof. Dr. Ir. K.R.M.T. Suryaningrat Kusumawardhana-Wijaya Ningrat, S.T., M.Kom., Ph.D', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` },
    { ID_Anggota: 'ANG-EMAIL', Nama_Anggota: 'bendahara.rt04.rw09.kelurahan-sukamaju-selatan@komunitas-warga-harmoni.example.id', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` },
    { ID_Anggota: 'ANG-JO', Nama_Anggota: 'Jo', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` },
    { ID_Anggota: 'ANG-EMOJI', Nama_Anggota: '🏴‍☠️ Nguyễn Văn Phúc', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` },
    { ID_Anggota: 'ANG-RTL', Nama_Anggota: 'نور الهدى عبد الرحمن', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` },
    { ID_Anggota: 'ANG-XSS', Nama_Anggota: WORST_XSS_NAME, Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` },
    { ID_Anggota: 'ANG-WS', Nama_Anggota: '   ', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` }
  ],
  kategori: [
    { ID_Kategori: 'KAT-INFRA', Nama_Kategori: 'Pemeliharaan Infrastruktur Saluran Air & Penerangan Jalan Lingkungan RT 04/RW 09', Tipe: 'Keluar' },
    { ID_Kategori: 'KAT-UNBREAK', Nama_Kategori: 'Pengadaan-Perlengkapan-Keamanan-Lingkungan-Tanpa-Spasi-RT04-RW09-Sukamaju', Tipe: 'Keluar' },
    { ID_Kategori: 'KAT-XSS', Nama_Kategori: WORST_XSS_CAT, Tipe: 'Keluar' }
  ],
  transaksi: [
    ...Array.from({ length: 12 }, (_, m) => tx(`W-P-${m}`, { anggota: 'ANG-RT04-RW09-BENDAHARA-2026-MAX40CHAR01', tipe: 'Masuk', monthIndex: m, nominal: 5000 })),
    tx('W-IN-HUGE', { tipe: 'Masuk', monthIndex: 2, nominal: 999999999999 }),
    tx('W-OUT-HUGE-1', { kategori: 'KAT-INFRA', tipe: 'Keluar', monthIndex: 4, nominal: 999999999999 }),
    tx('W-OUT-HUGE-2', { kategori: 'KAT-UNBREAK', tipe: 'Keluar', monthIndex: 5, nominal: 999999999999 }),
    tx('W-OUT-XSS', { kategori: 'KAT-XSS', tipe: 'Keluar', monthIndex: 6, nominal: 12500000 })
  ],
  skippedMonths: [],
  kasStart: `01-${YEAR}`,
  paymentAccount: null
};

const DATASETS = {
  demo: {
    pinnedId: 'ANG-1',
    now: new Date(`${YEAR}-07-20T12:00:00+07:00`),
    current: { year: YEAR, monthIndex: 6 },
    state: {
      anggota: [
        { ID_Anggota: 'ANG-1', Nama_Anggota: 'Budi Santoso', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` },
        { ID_Anggota: 'ANG-2', Nama_Anggota: 'Ana Lestari', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` }
      ],
      kategori: [{ ID_Kategori: 'KAT-1', Nama_Kategori: 'Kebersihan', Tipe: 'Keluar' }],
      transaksi: [
        tx('D-1', { anggota: 'ANG-1', tipe: 'Masuk', monthIndex: 0, nominal: 10000 }),
        tx('D-2', { kategori: 'KAT-1', tipe: 'Keluar', monthIndex: 1, nominal: 25000 })
      ],
      skippedMonths: [],
      kasStart: `01-${YEAR}`,
      paymentAccount: null
    }
  },
  worst: {
    pinnedId: 'ANG-RT04-RW09-BENDAHARA-2026-MAX40CHAR01',
    now: new Date(`${YEAR}-12-20T12:00:00+07:00`),
    current: { year: YEAR, monthIndex: 11 },
    state: WORST_STATE
  },
  empty: {
    pinnedId: '',
    now: new Date(`${YEAR}-12-20T12:00:00+07:00`),
    current: { year: YEAR, monthIndex: 11 },
    state: { anggota: [], kategori: [], transaksi: [], skippedMonths: [], kasStart: `01-${YEAR}`, paymentAccount: null }
  },
  one: {
    pinnedId: 'ANG-1',
    now: new Date(`${YEAR}-01-20T12:00:00+07:00`),
    current: { year: YEAR, monthIndex: 0 },
    state: {
      anggota: [{ ID_Anggota: 'ANG-1', Nama_Anggota: 'Jo', Status_Aktif: 'Aktif', Tanggal_Gabung: `${YEAR}-01-01` }],
      kategori: [{ ID_Kategori: 'KAT-1', Nama_Kategori: 'Alat Tulis', Tipe: 'Keluar' }],
      transaksi: [
        tx('O-1', { anggota: 'ANG-1', tipe: 'Masuk', monthIndex: 0, nominal: 10000 }),
        tx('O-2', { kategori: 'KAT-1', tipe: 'Keluar', monthIndex: 0, nominal: 5000 })
      ],
      skippedMonths: [],
      kasStart: `01-${YEAR}`,
      paymentAccount: null
    }
  },
  huge: {
    pinnedId: 'ANG-0001',
    now: new Date(`${YEAR}-12-20T12:00:00+07:00`),
    current: { year: YEAR, monthIndex: 11 },
    state: {
      anggota: Array.from({ length: 1000 }, (_, i) => ({
        ID_Anggota: `ANG-${String(i + 1).padStart(4, '0')}`,
        Nama_Anggota: `Warga ${String(i + 1).padStart(4, '0')} Kusumawardhana`,
        Status_Aktif: 'Aktif',
        Tanggal_Gabung: `${YEAR}-01-01`
      })),
      kategori: Array.from({ length: 12 }, (_, i) => ({
        ID_Kategori: `KAT-H${i + 1}`,
        Nama_Kategori: `Pos Pengeluaran Lingkungan Sektor ${i + 1}`,
        Tipe: 'Keluar'
      })),
      transaksi: Array.from({ length: 1000 }, (_, i) =>
        tx(`H-${i}`, {
          anggota: `ANG-${String(i + 1).padStart(4, '0')}`,
          tipe: i % 10 === 0 ? 'Keluar' : 'Masuk',
          kategori: i % 10 === 0 ? `KAT-H${((i / 10) % 12) + 1}` : 'KAT-M1',
          monthIndex: i % 12,
          nominal: i % 2 === 0 ? 10000 : 5000
        })
      ),
      skippedMonths: [],
      kasStart: `01-${YEAR}`,
      paymentAccount: null
    }
  }
};

test('mounts MemberSpotlight and WorkspaceStats across all 5 stress datasets with zero errors and valid SVG geometry', t => {
  const byId = installDom(t);
  setAdminSession('');
  setAdminViewMode('anggota');
  setCurrentRekapYear(String(YEAR));

  for (const [key, ds] of Object.entries(DATASETS)) {
    const groupId = `stress-${key}`;
    setActiveGroupId(groupId);
    if (ds.pinnedId) localStorage.setItem(`finkas_spotlight:${groupId}`, ds.pinnedId);
    else localStorage.removeItem(`finkas_spotlight:${groupId}`);
    setState(ds.state);
    mountSvelteDashboard();

    const ledger = createDuesLedger(ds.state, { year: YEAR, now: ds.now });
    assert.doesNotThrow(() => {
      renderSpotlight(ledger, ds.current);
      renderHybridChart(ds.state);
    }, `${key} dataset must render without exceptions`);

    for (const id of ['quick-cek-bar', 'spotlight-card', 'spotlight-progress', 'spotlight-ring-arc',
      'spotlight-pct', 'spotlight-frac', 'spotlight-member-code', 'spotlight-arrears-chip',
      'spotlight-paid-chip', 'spotlight-book', 'spotlight-name', 'spotlight-summary',
      'spotlight-picker', 'spotlight-swap-select', 'btn-unpin-member', 'spotlight-pay-btn',
      'spotlight-months', 'spotlight-detail', 'hybrid-chart-title', 'hybrid-cashflow',
      'hybrid-chart-readout', 'hybrid-analytics-breakdown']) {
      assert.ok(byId(id), `${key}: missing #${id}`);
    }

    assertValidSvgGeometry(byId('hybrid-cashflow'));
    assertValidSvgGeometry(byId('spotlight-progress').querySelector('svg'));

    for (let m = 0; m < 12; m++) {
      assert.doesNotThrow(() => selectStatsMonth(m));
      if (ds.pinnedId) {
        assert.doesNotThrow(() => showSpotlightDetail(m, ledger, ds.current, false));
      }
    }
  }
});

test('worst-case data preserves full title accessibility, escapes XSS, handles negative balance, and adapts SVG viewBox for wide ticks', t => {
  const byId = installDom(t);
  setAdminSession('');
  setAdminViewMode('anggota');
  setCurrentRekapYear(String(YEAR));
  const groupId = 'stress-worst-checks';
  setActiveGroupId(groupId);
  localStorage.setItem(`finkas_spotlight:${groupId}`, 'ANG-RT04-RW09-BENDAHARA-2026-MAX40CHAR01');
  setState(WORST_STATE);
  mountSvelteDashboard();
  const ledger = createDuesLedger(WORST_STATE, { year: YEAR, now: new Date(`${YEAR}-12-20T12:00:00+07:00`) });
  const current = { year: YEAR, monthIndex: 11 };
  renderSpotlight(ledger, current);
  renderHybridChart(WORST_STATE);

  // Full name preserved in title attribute + dir="auto" + 12 partial installment arrears
  const nameEl = byId('spotlight-name');
  assert.equal(nameEl.getAttribute('title'), 'Prof. Dr. Ir. Raden Mas Suryaningrat Kusumawardhana-Wijaya, S.T., M.Kom.');
  assert.equal(nameEl.getAttribute('dir'), 'auto');
  assert.match(byId('spotlight-arrears-chip').textContent, /^12 Bulan Belum Lunas/);
  assert.equal(byId('spotlight-frac').textContent, '0/12');

  // SVG Y-axis tick font-size is 11 and wide tick labels expand viewBox leftwards to avoid clipping
  const svg = byId('hybrid-cashflow');
  const tickTexts = [...svg.querySelectorAll('text:not(.chart-axis-x)')];
  assert.equal(tickTexts.length, 4);
  for (const textEl of tickTexts) {
    assert.equal(textEl.getAttribute('font-size'), '11');
  }
  const vbLeft = Number(svg.getAttribute('viewBox').split(/\s+/)[0]);
  assert.ok(vbLeft < 0, `Expected negative left viewBox shift for wide tick "${tickTexts[0].textContent}", got ${svg.getAttribute('viewBox')}`);

  // Negative cumulative balance renders cleanly in readout
  selectStatsMonth(5);
  assert.match(byId('hybrid-chart-readout').textContent, /Saldo Kumulatif: -Rp/);

  // XSS payloads in member name & expense category render as literal text, never live HTML
  const breakdown = byId('hybrid-analytics-breakdown');
  assert.equal(breakdown.querySelector('script'), null);
  assert.equal(breakdown.querySelector('b'), null);
  assert.ok([...breakdown.querySelectorAll('.breakdown-meta > span:first-child')].some(el => el.textContent === WORST_XSS_CAT));

  localStorage.setItem(`finkas_spotlight:${groupId}`, 'ANG-XSS');
  setActiveGroupId(groupId + '-xss');
  localStorage.setItem(`finkas_spotlight:${groupId}-xss`, 'ANG-XSS');
  setState(WORST_STATE);
  renderSpotlight(ledger, current);
  assert.equal(byId('spotlight-name').textContent, WORST_XSS_NAME);
  assert.equal(byId('spotlight-name').querySelector('img'), null);
  assert.equal(byId('spotlight-name').querySelector('script'), null);

  // Whitespace-only name falls back to memberCode instead of collapsing empty
  setActiveGroupId(groupId + '-ws');
  localStorage.setItem(`finkas_spotlight:${groupId}-ws`, 'ANG-WS');
  setState(WORST_STATE);
  renderSpotlight(ledger, current);
  assert.equal(byId('spotlight-name').textContent, 'ANG-WS');
});

test('empty, single-member, and 1,000-member edge datasets behave cleanly', t => {
  const byId = installDom(t);
  setAdminSession('');
  setAdminViewMode('anggota');
  setCurrentRekapYear(String(YEAR));

  // Empty (0)
  setActiveGroupId('edge-empty');
  setState(DATASETS.empty.state);
  mountSvelteDashboard();
  renderSpotlight(createDuesLedger(DATASETS.empty.state, { year: YEAR, now: DATASETS.empty.now }), DATASETS.empty.current);
  renderHybridChart(DATASETS.empty.state);
  assert.equal(byId('member-spotlight').hidden, true);
  assert.equal(byId('hybrid-analytics-breakdown').querySelectorAll('.breakdown-row').length, 1);
  assert.match(byId('hybrid-analytics-breakdown').textContent, /0%/);

  // One (1)
  setActiveGroupId('edge-one');
  localStorage.setItem('finkas_spotlight:edge-one', 'ANG-1');
  setState(DATASETS.one.state);
  renderSpotlight(createDuesLedger(DATASETS.one.state, { year: YEAR, now: DATASETS.one.now }), DATASETS.one.current);
  renderHybridChart(DATASETS.one.state);
  assert.equal(byId('spotlight-name').textContent, 'Jo');
  assert.equal(byId('spotlight-pct').textContent, '100%');
  assert.equal(byId('spotlight-frac').textContent, '1/1');
  assert.equal(byId('spotlight-paid-chip').hidden, false);

  // 1,000 members
  setActiveGroupId('edge-huge');
  localStorage.setItem('finkas_spotlight:edge-huge', 'ANG-0001');
  setState(DATASETS.huge.state);
  renderSpotlight(createDuesLedger(DATASETS.huge.state, { year: YEAR, now: DATASETS.huge.now }), DATASETS.huge.current);
  renderHybridChart(DATASETS.huge.state);
  assert.equal(byId('spotlight-picker').options.length, 1001);
  assert.equal(byId('spotlight-swap-select').options.length, 1000);
  assert.equal(byId('hybrid-analytics-breakdown').querySelectorAll('.breakdown-row').length, 13);
});

test('CSS layout guards, font-size floor, Zero Green, LOC limits, and QA harness contract hold', () => {
  const spotlightSrc = read('src/svelte/dashboard/MemberSpotlight.svelte');
  const statsSrc = read('src/svelte/dashboard/WorkspaceStats.svelte');
  const qaHtml = read('tests/qa/_qa-break-ui.html');

  for (const [name, src] of [['MemberSpotlight.svelte', spotlightSrc], ['WorkspaceStats.svelte', statsSrc]]) {
    assert.ok(src.split('\n').length - 1 < 750, `${name} must stay < 750 LOC`);
    assert.doesNotMatch(src, /#10b981|#008254|#f3f7f5/i, `${name} violates Zero Green`);
    assert.doesNotMatch(src, /transition\s*:\s*all\b/i, `${name} uses forbidden transition: all`);
    assert.doesNotMatch(src, /font-size="10"/, `${name} has SVG font-size < 11`);
    for (const m of src.matchAll(/font-size\s*:\s*([0-9.]+)px/g)) {
      assert.ok(Number(m[1]) >= 11, `${name} has CSS font-size ${m[1]}px < 11px`);
    }
    assert.match(src, /min-width:\s*0/);
    assert.match(src, /flex-shrink:\s*0/);
    assert.match(src, /overflow-wrap:\s*anywhere/);
  }

  assert.match(spotlightSrc, /title=\{vm\.memberName/);
  assert.match(spotlightSrc, /\.ring-center\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(statsSrc, /font-size="11"/);
  assert.match(statsSrc, /\.breakdown-meta\s*\{[^}]*min-width:\s*0/s);
  assert.match(statsSrc, /\.chart-tooltip-box\s*\{[^}]*overflow-wrap:\s*anywhere/s);

  for (const token of ["params.get('data')", "next.set('data'", 'data-dataset="demo"', 'data-dataset="worst"', 'data-dataset="empty"', 'data-dataset="one"', 'data-dataset="huge"']) {
    assert.ok(qaHtml.includes(token), `_qa-break-ui.html missing ${token}`);
  }
});
