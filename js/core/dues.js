/** One amount-based ledger for dues, reminders, filters and printed matrices. */
import { NAMA_BULAN, DEFAULT_MONTHLY_FEE, GROUP_START_YEAR, GROUP_START_MONTH } from './config.js';
import { parseKasStart } from './utils.js';

const keyFor = (id, monthIndex, year) => JSON.stringify([id, monthIndex, Number(year)]);
const ordinal = (monthIndex, year) => Number(year) * 12 + monthIndex;

/** The billing calendar is WIB, independent of the device timezone. */
export const billingPeriod = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).formatToParts(date);
  return { year: Number(parts.find(p => p.type === 'year').value), monthIndex: Number(parts.find(p => p.type === 'month').value) - 1 };
};

/** Index nominal, never transaction presence. Non-dues income does not settle dues. */
export const createDuesLedger = (state, { now = new Date(), year, monthlyFee = DEFAULT_MONTHLY_FEE } = {}) => {
  if (!Number.isSafeInteger(monthlyFee) || monthlyFee <= 0) throw new Error('Tarif iuran tidak valid.');
  const paid = new Map();
  for (const t of state.transaksi || []) {
    const idx = NAMA_BULAN.indexOf(t.Bulan_Iuran);
    const amount = Number(t.Nominal);
    if (t.Tipe_Arus !== 'Masuk' || !t.ID_Anggota || t.ID_Anggota === '-' || idx < 0 || !/^\d{4}$/.test(String(t.Tahun_Iuran))) continue;
    if (!Number.isSafeInteger(amount) || amount <= 0) continue;
    const key = keyFor(t.ID_Anggota, idx, t.Tahun_Iuran);
    paid.set(key, (paid.get(key) || 0) + amount);
  }
  const start = parseKasStart(state.kasStart) || { year: GROUP_START_YEAR, monthIndex: GROUP_START_MONTH - 1 };
  const first = ordinal(start.monthIndex, start.year);
  const current = billingPeriod(now);
  const last = ordinal(current.monthIndex, current.year);
  const skips = new Set(state.skippedMonths || []);
  const getMonth = (member, monthIndex, periodYear) => {
    const total = paid.get(keyFor(member.ID_Anggota, monthIndex, periodYear)) || 0;
    let join = -Infinity;
    if (member.Tanggal_Gabung) {
      const d = new Date(member.Tanggal_Gabung);
      if (!Number.isNaN(d.getTime())) { const p = billingPeriod(d); join = ordinal(p.monthIndex, p.year); }
    }
    const period = ordinal(monthIndex, periodYear);
    const skipped = skips.has(`${String(monthIndex + 1).padStart(2, '0')}-${periodYear}`);
    const owed = period >= first && period >= join && !skipped;
    return {
      monthIndex, year: Number(periodYear), paid: total, owed, skipped,
      due: owed && period <= last,
      remaining: owed ? Math.max(0, monthlyFee - total) : 0,
      credited: owed ? Math.min(monthlyFee, total) : 0,
      status: !owed ? 'exempt' : total >= monthlyFee ? 'paid' : total > 0 ? 'partial' : 'unpaid'
    };
  };
  const summarize = (ang) => {
    const months = [];
    const from = year === undefined ? first : Math.max(first, ordinal(0, year));
    const to = year === undefined ? last : Math.min(last, ordinal(11, year));
    for (let n = from; n <= to; n++) {
      const m = getMonth(ang, n % 12, Math.floor(n / 12));
      if (m.owed) months.push(m);
    }
    return {
      ang, months, expectedTotal: months.length * monthlyFee,
      paidTotal: months.reduce((n, m) => n + m.credited, 0),
      arrears: months.reduce((n, m) => n + m.remaining, 0),
      unpaidMonths: months.filter(m => m.remaining > 0).length,
      partialMonths: months.filter(m => m.status === 'partial').length
    };
  };
  const members = (state.anggota || []).filter(a => a.Status_Aktif === 'Aktif').map(summarize);
  return { getMonth, summarize, members, monthlyFee,
    unpaidCount: members.filter(m => m.arrears > 0).length,
    arrears: members.reduce((n, m) => n + m.arrears, 0)
  };
};

export const duesStatusLabel = (month) => ({
  exempt: 'Tidak ditagih', paid: 'Lunas', partial: 'Sebagian', unpaid: 'Belum bayar'
})[month.status];
