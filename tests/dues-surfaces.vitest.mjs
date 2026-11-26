import { readWorkspaceFixtureHtml } from './helpers/workspace-fixture.mjs';
// Synthetic ledger only. No user storage, sessions, or network.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
const realDate = Date;
globalThis.Date = class extends realDate {
  constructor(...args) { super(...(args.length ? args : ['2026-10-27T12:00:00+07:00'])); }
  static now() { return new realDate('2026-10-27T12:00:00+07:00').getTime(); }
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Network prohibited in isolated test'); };
after(() => { globalThis.Date = realDate; globalThis.fetch = realFetch; });
const { setState, setCurrentRekapYear } = await import('../src/svelte/mount.ts');
const { renderTableRekap } = await import('../src/svelte/mount.ts');
const { createGroupReminderMessage, copyMonthlyRecap, cetakLaporanTahunan } = await import('../src/svelte/mount.ts');
const html = readWorkspaceFixtureHtml();
const { window } = new JSDOM(html, { url: 'https://example.test', pretendToBeVisual: true });
for (const name of ['window', 'document', 'Element', 'HTMLElement', 'HTMLMediaElement', 'Node', 'Text',
  'Comment', 'Event', 'CustomEvent', 'Option', 'MutationObserver', 'navigator', 'requestAnimationFrame']) {
  Object.defineProperty(globalThis, name, { value: window[name], configurable: true });
}
after(() => window.close());
const byId = id => document.getElementById(id);
let clipboard = '', printed = '';
window.navigator.clipboard = { async writeText(text) { clipboard = text; } };
window.open = () => ({
  document: { open() {}, write(html) { printed = html; }, close() {} }, focus() {}, addEventListener() {}, print() {}
});
const fixture = (amounts) => ({
  anggota: [{ ID_Anggota: 'TEST', Nama_Anggota: 'Anggota Uji', Status_Aktif: 'Aktif', Tanggal_Gabung: '2026-10-01' }],
  kategori: [], kasStart: '10-2026', skippedMonths: [],
  transaksi: amounts.map((n, i) => ({ ID_Transaksi: `TEST-${i}`, ID_Anggota: 'TEST', Tipe_Arus: 'Masuk', Bulan_Iuran: 'Oktober', Tahun_Iuran: '2026', Nominal: n, Timestamp: '2026-10-20T12:00:00+07:00' }))
});
function render(amounts) {
  setCurrentRekapYear('2026'); setState(fixture(amounts));
  renderTableRekap();
  return byId('ui-table-rekap').rows[0].cells[10];
}
test('Rp5,000 installment is partial in desktop/mobile/annual print and WA; second installment settles', async () => {
  const october = render([5000]);
  assert.doesNotMatch(october.innerHTML, /class="dues-seal\b/, 'Partial payment cannot be LUNAS');
  assert.match(october.innerHTML, /Sebagian/i);
  assert.match(october.innerHTML, /5\.000/, 'The settled amount stays visible for partial payment');
  assert.match(byId('iuran-cards-mobile').innerHTML, /Sebagian/i);
  await createGroupReminderMessage();
  assert.match(clipboard, /5\.000/);
  await copyMonthlyRecap();
  assert.match(clipboard, /Belum lunas/);
  cetakLaporanTahunan();
  assert.match(printed, /Sebagian/);
  assert.match(render([5000, 5000]).innerHTML, /class="dues-seal\b/);
  await copyMonthlyRecap();
  assert.match(clipboard, /Semua anggota sudah lunas/);
});

test('matrix and mobile strips distinguish overdue, future, skipped and pre-start months', () => {
  setCurrentRekapYear('2026');
  setState({
    ...fixture([]),
    anggota: [{ ID_Anggota: 'TEST', Nama_Anggota: 'Anggota Uji', Status_Aktif: 'Aktif', Tanggal_Gabung: '2026-01-01' }],
    kasStart: '08-2026',
    skippedMonths: ['09-2026']
  });
  renderTableRekap();
  const row = byId('ui-table-rekap').rows[0].cells;
  assert.match(row[7].innerHTML, /data-status="Libur"/, 'July predates the cash ledger');
  assert.match(row[9].innerHTML, /data-status="Libur"/, 'September was skipped');
  assert.match(row[10].innerHTML, /data-status="Belum"/, 'October is due in WIB');
  assert.match(row[11].innerHTML, /data-status="Nanti"/, 'November is in the future');
  const strip = byId('iuran-cards-mobile').innerHTML.match(/class="dues-mini-strip"[^>]*>(.*?)<\/div>/s)[1];
  assert.equal((strip.match(/data-status=/g) || []).length, 12);
});

test('bulk payment form keeps partial member selectable and disables settled or exempt periods', async () => {
  const { renderCheckboxIuran } = await import('../src/svelte/mount.ts');
  byId('iuran-bulan').value = 'Oktober';
  byId('iuran-tahun').value = '2026';
  byId('iuran-nominal').value = '5.000';
  setState(fixture([5000]));
  renderCheckboxIuran();
  const partial = byId('iuran-checkbox-anggota').innerHTML;
  assert.doesNotMatch(partial, /disabled/, 'a partial payment must remain selectable');
  assert.match(partial, /Sebagian/i);
  assert.match(partial, /5\.000/);
  setState(fixture([5000, 5000]));
  renderCheckboxIuran();
  assert.match(byId('iuran-checkbox-anggota').innerHTML, /disabled/);
  setState({ ...fixture([]), skippedMonths: ['10-2026'] });
  renderCheckboxIuran();
  assert.match(byId('iuran-checkbox-anggota').innerHTML, /Tidak ditagih/);
  assert.match(byId('iuran-checkbox-anggota').innerHTML, /disabled/);
});
