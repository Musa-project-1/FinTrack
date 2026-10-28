// Synthetic ledger only. No user storage, sessions, or network.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
const realDate = Date;
globalThis.Date = class extends realDate {
  constructor(...args) { super(...(args.length ? args : ['2026-10-27T12:00:00+07:00'])); }
  static now() { return new realDate('2026-10-27T12:00:00+07:00').getTime(); }
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Network prohibited in isolated test'); };
after(() => { globalThis.Date = realDate; globalThis.fetch = realFetch; });
const { setState, setCurrentRekapYear } = await import('../js/core/state.js');
const { renderTableRekap } = await import('../js/render/rekap.js');
const { createGroupReminderMessage, copyMonthlyRecap, cetakLaporanTahunan } = await import('../js/handlers/export.js');
function element() {
  return { children: [], className: '', innerHTML: '', textContent: '', value: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(child) { this.children.push(child); }, setAttribute() {}, closest() { return null; } };
}
const els = new Map(['ui-table-rekap', 'iuran-cards-mobile', 'modal-export'].map(id => [id, element()]));
globalThis.document = {
  dispatchEvent() {}, createDocumentFragment: element, createElement: element,
  getElementById: id => els.get(id) || null, querySelectorAll: () => []
};
let clipboard = '', printed = '';
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { async writeText(text) { clipboard = text; } } } });
globalThis.window = { dispatchEvent() {}, addEventListener() {}, open: () => ({
  document: { open() {}, write(html) { printed = html; }, close() {} }, focus() {}, addEventListener() {}, print() {}
}) };
const fixture = (amounts) => ({
  anggota: [{ ID_Anggota: 'TEST', Nama_Anggota: 'Anggota Uji', Status_Aktif: 'Aktif', Tanggal_Gabung: '2026-10-01' }],
  kategori: [], kasStart: '10-2026', skippedMonths: [],
  transaksi: amounts.map((n, i) => ({ ID_Transaksi: `TEST-${i}`, ID_Anggota: 'TEST', Tipe_Arus: 'Masuk', Bulan_Iuran: 'Oktober', Tahun_Iuran: '2026', Nominal: n, Timestamp: '2026-10-20T12:00:00+07:00' }))
});
function render(amounts) {
  setCurrentRekapYear('2026'); setState(fixture(amounts));
  els.get('ui-table-rekap').children = []; renderTableRekap();
  return els.get('ui-table-rekap').children[0].children[0].children[10];
}
test('Rp5,000 installment is partial in desktop/mobile/annual print and WA; second installment settles', async () => {
  const october = render([5000]);
  assert.doesNotMatch(october.innerHTML, /status-lunas-dot/, 'Partial payment cannot be LUNAS');
  assert.match(october.innerHTML, /Sebagian/i);
  assert.match(els.get('iuran-cards-mobile').innerHTML, /Sebagian/i);
  await createGroupReminderMessage();
  assert.match(clipboard, /5\.000/);
  await copyMonthlyRecap();
  assert.match(clipboard, /Belum lunas/);
  cetakLaporanTahunan();
  assert.match(printed, /Sebagian/);
  assert.match(render([5000, 5000]).innerHTML, /status-lunas-dot/);
  await copyMonthlyRecap();
  assert.match(clipboard, /Semua anggota sudah lunas/);
});

test('bulk payment form keeps partial member selectable and disables settled or exempt periods', async () => {
  const { renderCheckboxIuran } = await import('../js/ui/modal.js');
  for (const id of ['iuran-bulan', 'iuran-tahun', 'iuran-nominal', 'count-terpilih', 'summary-count', 'summary-nominal', 'summary-total', 'btn-pilih-semua', 'iuran-checkbox-anggota']) els.set(id, element());
  els.get('iuran-bulan').value = 'Oktober';
  els.get('iuran-tahun').value = '2026';
  els.get('iuran-nominal').value = '5.000';
  setState(fixture([5000]));
  renderCheckboxIuran();
  const partial = els.get('iuran-checkbox-anggota').innerHTML;
  assert.doesNotMatch(partial, /disabled/, 'a partial payment must remain selectable');
  assert.match(partial, /Sebagian/i);
  assert.match(partial, /5\.000/);
  setState(fixture([5000, 5000]));
  renderCheckboxIuran();
  assert.match(els.get('iuran-checkbox-anggota').innerHTML, /disabled/);
  setState({ ...fixture([]), skippedMonths: ['10-2026'] });
  renderCheckboxIuran();
  assert.match(els.get('iuran-checkbox-anggota').innerHTML, /Tidak ditagih/);
  assert.match(els.get('iuran-checkbox-anggota').innerHTML, /disabled/);
});
