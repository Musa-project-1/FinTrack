import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installSvelteDom } from './helpers/svelte-dom.mjs';
import { getState, setState, setActiveGroupId, setAdminRole, setAdminSession, setCurrentRekapYear, currentRekapYear } from '../src/core/state.js';
import { filterMasterAnggota, renderAuditLogList, renderMasterAnggotaTable, renderMasterKategoriTable } from '../src/handlers/master.js';
import { populateTahunRekap, renderSkippedMonthsList, renderTableRekap } from '../src/render/rekap.js';
import { renderMonthlyCashReport } from '../src/handlers/cash-report.js';
import { billingPeriod, createDuesLedger } from '../src/core/dues.js';
import { renderDropdowns } from '../src/render/dashboard.js';
import { filterAnggotaIuran, filterKategori, renderCheckboxIuran, pilihSemuaIuran, updateCounterIuran } from '../src/ui/transaction-form.js';
import { renderAdminUI, submitLoginAdmin } from '../src/handlers/auth.js';
import { initAttachmentControls } from '../src/handlers/attachments.js';
import { openQuickPaySheet } from '../src/handlers/quickpay.js';
import { setIndicatorStyle } from '../src/handlers/navigation.js';
import { renderSpotlight, syncAuditLogRows, syncMasterAnggotaRows } from '../src/ui/svelte-dashboard.js';
import { syncOnboardingGroupList } from '../src/ui/svelte-onboarding.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const literal = '<img src=x>';
const member = { ID_Anggota: literal, Nama_Anggota: 'Ana ' + literal, Nomor_WA: '0812-34', Status_Aktif: 'Aktif' };
const category = { ID_Kategori: literal, Nama_Kategori: literal, Tipe: 'Masuk' };

function installDom(t) {
  const previous = { ...getState() };
  t.after(() => setState(previous));
  const byId = installSvelteDom(t, html);
  setState({ anggota: [], kategori: [], transaksi: [], skippedMonths: [] });
  return byId;
}

test('member rows retain literal names and IDs, WhatsApp links, status and live filtering', t => {
  const byId = installDom(t);
  const tbody = byId('master-anggota-tbody');
  renderMasterAnggotaTable();
  assert.equal(tbody.textContent.trim(), 'Belum ada anggota terdaftar.');
  setState({ anggota: [member, { ID_Anggota: 'b', Nama_Anggota: 'Budi', Status_Aktif: 'Nonaktif' }] });
  renderMasterAnggotaTable();
  const [ana, budi] = tbody.rows;
  assert.equal(ana.querySelector('.badge-masuk').textContent.trim(), 'Aktif');
  assert.equal(budi.querySelector('.badge-keluar').textContent.trim(), 'Nonaktif');
  assert.equal(ana.querySelector('a').href, 'https://wa.me/6281234');
  assert.equal(ana.querySelector('.master-name-text').textContent, member.Nama_Anggota);
  assert.equal(ana.querySelector('[data-action="edit-master-anggota"]').dataset.id, literal);
  assert.equal(tbody.querySelector('img'), null);
  byId('search-master-anggota').value = ' BUDI ';
  filterMasterAnggota();
  assert.equal(ana.style.display, 'none');
  assert.equal(budi.style.display, '');
  byId('search-master-anggota').value = '';
  filterMasterAnggota();
  assert.equal(ana.style.display, '');
});

test('category rows preserve both flow icons, badges and literal labels', t => {
  const byId = installDom(t);
  const tbody = byId('master-kategori-tbody');
  renderMasterKategoriTable();
  assert.equal(tbody.textContent.trim(), 'Belum ada kategori.');
  setState({ kategori: [category, { ID_Kategori: 'out', Nama_Kategori: 'Biaya', Tipe: 'Keluar' }] });
  renderMasterKategoriTable();
  const [income, expense] = tbody.rows;
  assert.ok(income.querySelector('.master-kat-icon.is-masuk .ph-arrow-down-left'));
  assert.ok(expense.querySelector('.master-kat-icon.is-keluar .ph-arrow-up-right'));
  assert.equal(income.querySelector('.badge-masuk').textContent.trim(), 'Masuk');
  assert.equal(expense.querySelector('.badge-keluar').textContent.trim(), 'Keluar');
  assert.equal(income.querySelector('.master-name-text').textContent, literal);
  assert.equal(income.querySelector('[data-action="edit-master-kategori"]').dataset.id, literal);
  assert.equal(tbody.querySelector('img'), null);
});

test('audit refresh shows loading, errors, filtered counts and escaped details', async t => {
  const byId = installDom(t);
  setActiveGroupId('stage-three');
  setAdminRole('superadmin');
  setAdminSession('test');
  const tbody = byId('audit-log-tbody');
  const count = byId('audit-log-count');
  let response = { status: false, message: literal };
  t.mock.method(globalThis, 'fetch', async () => Response.json(response));
  const loading = renderAuditLogList();
  assert.equal(tbody.textContent.trim(), 'Memuat...');
  await loading;
  assert.equal(tbody.querySelector('.text-danger').textContent, literal);
  response = { status: true, data: { log: ['LOGIN_ADMIN', 'TAMBAH_ANGGOTA'].map(Aksi => ({
    Aksi, Timestamp: '2026-11-01', Detail: literal
  })) } };
  await renderAuditLogList();
  assert.equal(count.textContent, '2 entri');
  byId('audit-filter-chips').querySelector('[data-audit-cat="master"]').click();
  assert.equal(count.textContent, '1 / 2 entri');
  assert.equal(tbody.querySelector('.audit-action-pill').textContent.trim(), 'Tambah Anggota');
  assert.equal(tbody.querySelector('.td-audit-detail').textContent, literal);
  assert.equal(tbody.querySelector('img'), null);
  byId('search-audit-log').value = 'missing';
  byId('search-audit-log').dispatchEvent(new Event('input'));
  assert.equal(count.textContent, '0 / 2 entri');
  assert.match(tbody.textContent, /Tidak ada aktivitas yang cocok/);

  const pending = renderAuditLogList();
  setActiveGroupId('');
  await pending;
  byId('search-audit-log').value = '';
  byId('search-audit-log').dispatchEvent(new Event('input'));
  assert.equal(count.textContent, '0 entri');
  assert.match(tbody.textContent, /Belum ada aktivitas tercatat/);
  setAdminRole('');
  setAdminSession('');
});

test('skipped month cards follow descending stored keys and sync the count', t => {
  const byId = installDom(t);
  const list = byId('skipped-months-list');
  renderSkippedMonthsList();
  assert.match(list.textContent, /Belum ada bulan libur/);
  assert.equal(byId('master-count-skipped').textContent, '0');
  setState({ skippedMonths: ['02-2026', '11-2026'] });
  renderSkippedMonthsList();
  assert.deepEqual(Array.from(list.querySelectorAll('strong'), el => el.textContent), ['November 2026', 'Februari 2026']);
  assert.deepEqual(Array.from(list.querySelectorAll('button[data-action="remove-skip"]'), el => el.dataset.month), ['11-2026', '02-2026']);
  assert.equal(byId('master-count-skipped').textContent, '2');
});

test('switching groups clears mounted rows, the member query, and cash report warnings', t => {
  const byId = installDom(t);
  setState({
    anggota: [member], kategori: [category], skippedMonths: ['01-2026'],
    transaksi: [
      { ID_Transaksi: 'ok', Timestamp: '2026-10-01', Nominal: 5000, Tipe_Arus: 'Masuk' },
      { ID_Transaksi: 'bad', Timestamp: 'invalid', Nominal: 5000, Tipe_Arus: 'Masuk' }
    ]
  });
  byId('search-master-anggota').value = 'other';
  renderMasterAnggotaTable();
  renderMasterKategoriTable();
  renderSkippedMonthsList();
  syncAuditLogRows({ status: 'ready', totalCount: 1, rows: [
    { key: '1', timestampText: 'yesterday', label: 'Login', tone: 'accent', icon: 'ph-sign-in', detail: 'old' }
  ] });
  renderMonthlyCashReport('2026-10');
  const selectors = ['#master-anggota-tbody .master-row', '#master-kategori-tbody .master-row',
    '#audit-log-tbody .td-audit-detail', '#skipped-months-list button', '#cash-report-details [data-type]', '#cash-report-alert li'];
  for (const selector of selectors) assert.ok(document.querySelector(selector), selector);
  assert.equal(byId('cash-report-alert').style.display, 'block');
  window.dispatchEvent(new CustomEvent('finkas:group-changed'));
  for (const selector of selectors) assert.equal(document.querySelector(selector), null, selector);
  assert.equal(byId('cash-report-alert').style.display, 'none');
  syncMasterAnggotaRows({ rows: [
    { id: 'a', name: 'Ana', initials: 'A', isAktif: true, rawWa: '', waHref: '', searchText: 'Ana' }
  ] });
  assert.equal(byId('master-anggota-tbody').rows[0].style.display, '');
});

const januaryPayment = (id, amount) => ({
  ID_Anggota: id, Tipe_Arus: 'Masuk', Bulan_Iuran: 'Januari', Tahun_Iuran: '2026', Nominal: amount
});

test('dues checklist keeps manual selections through filtering and resets them on render', t => {
  const byId = installDom(t);
  setState({
    kasStart: '01-2026',
    anggota: [member, { ...member, ID_Anggota: 'paid' }, { ...member, ID_Anggota: 'unpaid', Nama_Anggota: 'Budi' },
      { ...member, ID_Anggota: 'exempt', Tanggal_Gabung: '2026-02-01' }],
    transaksi: [januaryPayment(member.ID_Anggota, 5000), januaryPayment('paid', 10000)]
  });
  byId('iuran-bulan').value = 'Januari';
  byId('iuran-tahun').value = '2026';
  renderCheckboxIuran();
  const grid = byId('iuran-checkbox-anggota');
  const [partial, paid, unpaid, exempt] = grid.querySelectorAll('input');
  assert.equal(grid.querySelector('img'), null);
  assert.equal(partial.labels[0].querySelector('.chk-name-pending').textContent, member.Nama_Anggota);
  assert.equal(partial.disabled, false);
  assert.match(partial.labels[0].className, /item-partial/);
  assert.match(partial.labels[0].textContent, /SEBAGIAN.*5\.000/);
  assert.equal(paid.disabled, true);
  assert.equal(paid.checked, true);
  assert.match(paid.labels[0].textContent, /LUNAS/);
  assert.equal(exempt.disabled, true);
  assert.equal(exempt.checked, false);
  assert.match(exempt.labels[0].textContent, /Tidak ditagih/);
  assert.equal(unpaid.disabled, false);
  assert.match(unpaid.labels[0].textContent, /BELUM BAYAR/);
  partial.click();
  for (const query of ['BUDI', 'ana']) {
    byId('search-anggota-iuran').value = query;
    filterAnggotaIuran();
    assert.equal(partial.labels[0].style.display, query === 'BUDI' ? 'none' : 'flex');
    assert.equal(grid.querySelector('input'), partial);
    assert.equal(partial.checked, true);
  }
  renderCheckboxIuran();
  assert.equal(grid.querySelector('input').checked, false);
  assert.equal(byId('rev-iuran-member-count').textContent, '0');
});

test('wizard review shows eight literal names and updates overflow when selection changes', t => {
  const byId = installDom(t);
  const anggota = Array.from({ length: 10 }, (_, i) => ({ ...member, ID_Anggota: String(i) }));
  setState({ anggota, kasStart: '01-2026' });
  renderCheckboxIuran();
  pilihSemuaIuran();
  const review = byId('rev-iuran-chips');
  const chips = review.querySelectorAll('.trx-rev-chip:not(.trx-rev-chip-more)');
  assert.equal(chips.length, 8);
  assert.equal(chips[0].lastElementChild.textContent, member.Nama_Anggota);
  assert.equal(review.querySelector('img'), null);
  assert.equal(review.lastElementChild.textContent, '+2 lainnya');
  byId('iuran-checkbox-anggota').addEventListener('change', updateCounterIuran);
  byId('chk-iuran-0').click();
  assert.equal(review.lastElementChild.textContent, '+1 lainnya');
  pilihSemuaIuran();
  pilihSemuaIuran();
  assert.equal(review.childElementCount, 0);
});

test('quick pay offers full and half presets down to the 2000 threshold', t => {
  const byId = installDom(t);
  setAdminSession('test');
  t.after(() => setAdminSession(''));
  setState({ anggota: [member], kasStart: '01-2026' });
  byId('modal-quickpay').showModal = function () { this.open = true; };
  const chips = () => Array.from(byId('qp-presets').children, btn => [btn.textContent, btn.dataset.qpPreset]);
  openQuickPaySheet(member.ID_Anggota, 'Januari', '2026');
  assert.deepEqual(chips(), [['Lunasi', '10000'], ['50%', '5000']]);
  byId('qp-presets').lastElementChild.click();
  assert.equal(byId('qp-nominal').value, '5.000');
  setState({ transaksi: [januaryPayment(member.ID_Anggota, 8000)] });
  openQuickPaySheet(member.ID_Anggota, 'Januari', '2026');
  assert.deepEqual(chips(), [['Lunasi Sisa', '2000'], ['50%', '1000']]);
  setState({ transaksi: [januaryPayment(member.ID_Anggota, 8001)] });
  openQuickPaySheet(member.ID_Anggota, 'Januari', '2026');
  assert.deepEqual(chips(), [['Lunasi Sisa', '1999']]);
});

test('desktop and mobile year gliders hide and repopulate independently', t => {
  const byId = installDom(t);
  const previousYear = currentRekapYear;
  t.after(() => setCurrentRekapYear(previousYear));
  const { year } = billingPeriod();
  setCurrentRekapYear(year);
  setState({ kasStart: '01-' + (year - 1) });
  const glider = suffix => byId('ui-tahun-rekap-select' + suffix).closest('.year-pill').querySelector('.hybrid-year-glider');
  const desktop = glider(''), mobile = glider('-mobile');
  const check = (group, years, active = year) => {
    assert.equal(group.hidden, !years.length);
    assert.equal(group.querySelectorAll('.year-glider-indicator').length, years.length ? 1 : 0);
    assert.deepEqual(Array.from(group.querySelectorAll('button'), b => Number(b.dataset.year)), years);
    if (years.length) {
      assert.equal(group.style.getPropertyValue('--year-count'), String(years.length));
      assert.equal(group.style.getPropertyValue('--year-index'), String(years.indexOf(active)));
      assert.deepEqual(Array.from(group.querySelectorAll('[aria-pressed="true"]'), b => Number(b.dataset.year)), [active]);
    }
  };
  const twoYears = [year - 1, year];
  populateTahunRekap();
  check(mobile, twoYears);
  setState({ transaksi: [{ Tahun_Iuran: year - 2 }] });
  populateTahunRekap();
  check(desktop, [year - 2, ...twoYears]);
  check(mobile, []);
  setState({ transaksi: [{ Tahun_Iuran: year - 2 }, { Tahun_Iuran: year - 3 }] });
  populateTahunRekap();
  check(desktop, []);
  setState({ transaksi: [] });
  populateTahunRekap();
  check(desktop, twoYears);
  check(mobile, twoYears);
  setCurrentRekapYear(year - 1);
  renderTableRekap();
  check(desktop, twoYears, year - 1);
  setCurrentRekapYear(year);
  populateTahunRekap();
  check(desktop, twoYears);
});

test('indicator changes update both stamp previews and preserve spotlight month buttons', t => {
  const byId = installDom(t);
  setActiveGroupId('stage-four-stamp');
  localStorage.setItem('finkas_spotlight:stage-four-stamp', member.ID_Anggota);
  setState({ kasStart: '01-2026', anggota: [member], transaksi: [januaryPayment(member.ID_Anggota, 10000)] });
  renderSpotlight(createDuesLedger(getState(), { year: 2026 }), { year: 2026, monthIndex: 0 });
  const months = byId('spotlight-months');
  const january = months.querySelector('button');
  assert.ok(january.querySelector('circle.mini-seal-bg'));
  setIndicatorStyle('shield');
  assert.equal(months.querySelector('button'), january);
  assert.ok(january.querySelector('path.mini-seal-bg'));
  const sample = byId('hybrid-stamp-sample');
  const stamp = sample.querySelector('.is-newly-paid[data-stamp="shield"]');
  assert.ok(stamp);
  assert.ok(sample.querySelector('.tampilan-preview-stamp path.seal-halo'));
  setIndicatorStyle('shield');
  assert.notEqual(sample.querySelector('.is-newly-paid'), stamp);
  assert.equal(months.querySelector('button'), january);
});

test('dropdowns preserve default options and treat category and member values as text', t => {
  const byId = installDom(t);
  const options = id => Array.from(byId(id).options, o => [o.value, o.textContent]);
  setState({ anggota: [member, { ...member, Status_Aktif: 'Nonaktif' }] });
  renderDropdowns();
  for (const id of ['edit-anggota', 'ops-anggota']) {
    assert.deepEqual(options(id), [['-', '-- Bukan transaksi anggota --'], [literal, member.Nama_Anggota]]);
  }
  assert.deepEqual(options('iuran-kategori'), [['', '-- Buat Kategori Masuk Dulu --']]);
  setState({ kategori: [category, { ID_Kategori: 'out', Nama_Kategori: 'Biaya', Tipe: 'Keluar' }] });
  renderDropdowns();
  assert.deepEqual(options('iuran-kategori'), [[literal, literal]]);
  byId('ops-tipe').value = 'Masuk';
  filterKategori('ops-tipe', 'ops-kategori');
  assert.deepEqual(options('ops-kategori'), [['', '-- Pilih Kategori --'], [literal, literal]]);
  assert.equal(byId('ops-kategori').querySelector('img'), null);
});

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('the shipped ESM shares core and motion dependencies and is available offline', () => {
  const file = 'src/ui/svelte-dashboard.js';
  const js = read(file);
  const imports = [...js.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map(match => match[1]);
  assert.deepEqual(new Set(imports), new Set(['../core/config.js', '../core/utils.js', '../core/dues.js', '../core/state.js',
    '../core/sync.js', '../core/offline.js', '../render/receipt.js', '../handlers/self-pay.js']));
  assert.match(js, /\/\/# sourceMappingURL=svelte-dashboard\.js\.map\s*$/);
  const map = JSON.parse(read(file + '.map'));
  for (const file of [
    'dashboard/GroupOverview.svelte', 'dashboard/BentoDashboard.svelte', 'dashboard/MemberSpotlight.svelte',
    'dashboard/AdminPriorities.svelte', 'dashboard/HistoryLedger.svelte', 'dashboard/WorkspaceStats.svelte',
    'dashboard/DuesMatrix.svelte', 'dashboard/DuesMobileCards.svelte',
    'modals/GroupPickerList.svelte', 'modals/GroupAdminList.svelte', 'modals/SuperAdminList.svelte',
    'modals/OfflineQueueList.svelte', 'modals/PassbookMonths.svelte', 'modals/ProfileHistoryList.svelte',
    'modals/ReceiptBody.svelte', 'modals/SelfPayMonths.svelte', 'modals/MasterAnggotaRows.svelte',
    'modals/MasterKategoriRows.svelte', 'modals/AuditLogRows.svelte', 'modals/SkippedMonthsList.svelte',
    'modals/CashReportAlert.svelte', 'modals/CashReportRows.svelte',
    'forms/IuranMemberChecklist.svelte', 'forms/IuranReviewChips.svelte', 'forms/QuickPayPresets.svelte',
    'forms/YearGlider.svelte', 'forms/StampStylePreview.svelte',
    'stores/rekap-model.ts', 'stores/rekap.svelte.ts', 'stores/history-model.ts', 'stores/stats-model.ts',
    'stores/history.svelte.ts', 'stores/stats.svelte.ts', 'stores/store.svelte.ts', 'stores/spotlight-model.ts',
    'stores/spotlight.svelte.ts', 'stores/master.svelte.ts', 'stores/cash-report.svelte.ts',
    'stores/transaction-form.svelte.ts', 'stores/year-glider.svelte.ts', 'stores/stamp-preview.svelte.ts',
    'stores/profile.svelte.ts', 'stores/receipt.svelte.ts', 'stores/self-pay.svelte.ts',
    'stores/group-picker.svelte.ts', 'stores/group-admin.svelte.ts', 'stores/offline-queue.svelte.ts',

    'ui/dues-status.ts', 'ui/pagination.ts', 'ui/hybrid-motion.ts', 'ui/bulk-dues.ts',
    'ui/transaction-form.ts', 'ui/modal.ts', 'ui/save-status.ts', 'ui/i18n.ts',
    'ui/theme.ts', 'ui/keel.ts', 'ui/control-a11y.ts', 'ui/cdrop.ts',
    'ui/dpick.ts', 'ui/mpick.ts', 'ui/kasi-effects.ts', 'ui/kasi-stage.ts',
    'ui/kasi-mascot.ts', 'render/dashboard.ts', 'render/profile.ts', 'render/rekap.ts',
    'components.ts', 'mount.ts'
  ]) {
    assert.equal(map.sourcesContent[map.sources.indexOf('../svelte/' + file)], read('src/svelte/' + file));
  }
  assert.ok(read('sw.js').match(/const LOCAL_ASSETS = \[([\s\S]*?)\];/)[1].includes("'" + file + "'"));
});

test('onboarding ships a self-contained precached bundle with current source contents', () => {
  const js = read('src/ui/svelte-onboarding.js');
  assert.equal([...js.matchAll(/\bfrom\s*["']([^"']+)["']/g)].length, 0);
  assert.match(js, /\/\/# sourceMappingURL=svelte-onboarding\.js\.map\s*$/);
  const map = JSON.parse(read('src/ui/svelte-onboarding.js.map'));
  assert.equal(map.version, 3);
  assert.ok(map.mappings.length);
  for (const file of ['OnboardingGroupList.svelte', 'onboarding.svelte.ts', 'components.ts', 'mount.ts']) {
    assert.equal(map.sourcesContent[map.sources.indexOf('../svelte/onboarding/' + file)], read('src/svelte/onboarding/' + file), file);
  }
  const assets = read('sw.js').match(/const LOCAL_ASSETS = \[([\s\S]*?)\];/)[1];
  assert.ok(assets.includes("'src/ui/svelte-onboarding.js'"));
});

test('onboarding list renders all states and passes the literal group ID on selection', t => {
  const onboardingHtml = readFileSync(new URL('../onboarding.html', import.meta.url), 'utf8');
  const byId = installSvelteDom(t, onboardingHtml);
  const list = byId('group-list');
  for (const [status, message] of [
    ['loading', 'Memuat daftar grup...'],
    ['empty', 'Belum ada grup. Minta admin pemilik membuatkan grup.'],
    ['not-found', 'Grup kas tidak ditemukan.'],
    ['error', 'Gagal memuat. Periksa internet lalu muat ulang.']
  ]) {
    syncOnboardingGroupList({ status });
    assert.equal(list.querySelector('.loading-state').textContent, message);
    assert.equal(list.children.length, 1);
  }

  const item = { id: '"><img src=x>', name: 'Kas <script>test</script><img src=x>', initials: '<S' };
  const picked = [];
  syncOnboardingGroupList({ status: 'ready', items: [item], onPick: id => picked.push(id) });
  const button = list.querySelector('button.group-item');
  assert.equal(button.dataset.id, item.id);
  assert.equal(button.querySelector('h3').textContent, item.name);
  assert.equal(button.querySelector('.group-avatar').textContent, item.initials);
  assert.equal(list.querySelector('img, script, .loading-state'), null);
  button.click();
  assert.deepEqual(picked, [item.id]);
});

test('admin login shows a busy label and restores the original nodes after rejection', async t => {
  const byId = installDom(t);
  const login = document.createElement('button');
  login.id = 'btn-login-admin';
  document.body.append(login);
  renderAdminUI();
  assert.equal(login.firstChild.className, 'ph ph-lock-key');
  assert.equal(login.lastChild.nodeValue, ' Login Admin');

  const button = byId('btn-submit-login');
  const original = Array.from(button.childNodes);
  byId('input-admin-pwd').value = 'test-password';
  const response = Promise.withResolvers();
  t.mock.method(globalThis, 'fetch', () => response.promise);
  const pending = submitLoginAdmin({ target: byId('form-login-admin') });
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.querySelector('i.ph-spinner-gap.ph-spin').getAttribute('aria-hidden'), 'true');
  assert.equal(button.querySelector('span').textContent, 'Mengecek...');

  response.resolve(Response.json({ status: false, message: 'PIN salah' }));
  await pending;
  assert.equal(byId('auth-login-error-text').textContent, 'PIN salah');
  assert.equal(button.disabled, false);
  assert.equal(button.hasAttribute('aria-busy'), false);
  assert.equal(button.childNodes.length, original.length);
  original.forEach((node, index) => assert.equal(button.childNodes[index], node));
});

test('attachment upload restores the same children after file validation fails', async t => {
  const byId = installDom(t);
  byId('toast-container').remove();
  initAttachmentControls({ getIdTransaksi: () => 'trx-1' });
  const input = byId('trx-attachment-file');
  Object.defineProperty(input, 'files', { value: [new window.File([], 'empty.pdf', { type: 'application/pdf' })] });
  const button = byId('btn-upload-attachment');
  const original = Array.from(button.childNodes);
  button.click();
  assert.equal(button.disabled, true);
  assert.equal(button.firstChild.className, 'ph ph-spinner-gap ph-spin');
  assert.equal(button.lastChild.nodeValue, ' Mengunggah...');
  await Promise.resolve();
  assert.equal(button.disabled, false);
  assert.equal(button.childNodes.length, original.length);
  original.forEach((node, index) => assert.equal(button.childNodes[index], node));
});
