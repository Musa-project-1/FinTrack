import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billingPeriod, createDuesLedger } from '../src/core/dues.js';
import { normalizePaymentAccount } from '../src/core/payment-account.js';
import { calculateSelfPay } from '../src/handlers/self-pay.js';
import { setPaymentAccount } from '../api/_group-write.ts';

const member = { ID_Anggota: 'm1', Nama_Anggota: 'Anggota Uji', Status_Aktif: 'Aktif', Tanggal_Gabung: '2026-11-12T00:00:00+07:00' };

test('self-pay uses unpaid amounts in WIB and skips a holiday across the year boundary', () => {
  const now = new Date('2026-11-30T17:30:00Z');
  const state = {
    anggota: [member], kasStart: '10-2026', skippedMonths: ['01-2027'],
    transaksi: [{ ID_Anggota: 'm1', Tipe_Arus: 'Masuk', Bulan_Iuran: 'Desember', Tahun_Iuran: 2026, Nominal: 3000 }]
  };
  const ledger = createDuesLedger(state, { now });
  const current = billingPeriod(now);
  const payments = (preset, selected) => calculateSelfPay(ledger, member, current, preset, selected)
    .map(({ year, monthIndex, remaining }) => [year, monthIndex, remaining]);
  assert.deepEqual(payments('current'), [[2026, 11, 7000]]);
  assert.deepEqual(payments('due'), [[2026, 10, 10000], [2026, 11, 7000]]);
  assert.deepEqual(payments('advance'), [[2026, 10, 10000], [2026, 11, 7000], [2027, 1, 10000], [2027, 2, 10000]]);
  assert.deepEqual(payments('selected', { year: 2027, monthIndex: 0 }), []);
});

test('group account keeps leading zeros and validates paired bank details before writing', async () => {
  assert.deepEqual(normalizePaymentAccount({ bank: ' BRI ', number: '001 020', holder: ' Bendahara ', whatsapp: '0812-3456-7890' }),
    { bank: 'BRI', number: '001020', holder: 'Bendahara', whatsapp: '6281234567890' });
  const rejected = await setPaymentAccount('group-demo', { paymentAccount: { bank: 'BRI' } }, {});
  assert.equal(rejected.status, false);
});
