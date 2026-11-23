import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installSvelteDom } from './helpers/svelte-dom.mjs';
import { getState, setState, setActiveGroupId, setAdminRole, setAdminSession } from '../src/core/state.js';
import { filterMasterAnggota, renderAuditLogList, renderMasterAnggotaTable, renderMasterKategoriTable } from '../src/handlers/master.js';
import { renderSkippedMonthsList } from '../src/render/rekap.js';
import { renderMonthlyCashReport } from '../src/handlers/cash-report.js';
import { syncAuditLogRows, syncMasterAnggotaRows } from '../src/ui/svelte-dashboard.js';

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
