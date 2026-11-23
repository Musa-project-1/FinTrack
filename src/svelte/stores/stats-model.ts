import type { AppState } from '../../types/finkas';
import { NAMA_BULAN } from '../../core/config.js';
import { billingPeriod, createDuesLedger } from '../../core/dues.js';
import { formatDisplayRp } from '../../core/utils.js';

const formatAxisTick = (val: number) => {
  if (val === 0) return '0';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',')}jt`;
  return `${Math.round(val / 1000)}rb`;
};

const niceAxisCeiling = (rawMax: number, ticks = 3) => {
  const safeMax = Math.max(ticks, Number(rawMax) || 0);
  const rawStep = safeMax / ticks;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const mult = [1, 2, 2.5, 5, 10].find((m) => m >= norm - 1e-9) ?? 10;
  return mult * mag * ticks;
};

const metrics = (state: AppState, activeYear: number) => {
  const inAmounts = Array<number>(12).fill(0);
  const outAmounts = Array<number>(12).fill(0);
  const outCategories = new Map<string, number>();
  let opening = 0;
  for (const row of state.transaksi) {
    const date = new Date(row.Timestamp);
    if (!row.Timestamp || !Number.isFinite(date.valueOf())) continue;
    const period = billingPeriod(date);
    const amount = Number(row.Nominal) || 0;
    if (row.Tipe_Arus !== 'Masuk' && row.Tipe_Arus !== 'Keluar') continue;
    const incoming = row.Tipe_Arus === 'Masuk';
    if (period.year < activeYear) {
      opening += incoming ? amount : -amount;
      continue;
    }
    if (period.year !== activeYear) continue;
    const index = period.monthIndex;
    if (incoming) inAmounts[index] += amount;
    else {
      outAmounts[index] += amount;
      outCategories.set(row.ID_Kategori, (outCategories.get(row.ID_Kategori) || 0) + amount);
    }
  }
  const running = inAmounts.map((amount, index) => (opening += amount - outAmounts[index]));
  const labels = NAMA_BULAN.map((name) => `${name} ${activeYear}`);
  const ledger = createDuesLedger(state, { year: activeYear });
  const expected = ledger.members.reduce((sum, row) => sum + row.expectedTotal, 0);
  const paid = ledger.members.reduce((sum, row) => sum + row.paidTotal, 0);
  return { inAmounts, outAmounts, outCategories, running, labels, compliance: expected ? Math.round(100 * paid / expected) : 0 };
};

export function computeStatsViewModel(state: AppState, { activeYear, selectedMonth }: { activeYear: number; selectedMonth: number }) {
  const model = metrics(state, activeYear);
  const { inAmounts, outAmounts, running, labels } = model;
  const width = 720;
  const height = 250;
  const padL = 44;
  const padR = 16;
  const padT = 18;
  const padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const slotW = plotW / 12;

  const maxBar = niceAxisCeiling(Math.max(100000, ...inAmounts, ...outAmounts), 3);
  const minRun = Math.min(0, ...running);
  const maxRun = Math.max(100000, ...running);
  const runSpan = Math.max(1, maxRun - minRun);
  const gridLines = Array.from({ length: 4 }, (_, i) => ({
    y: padT + plotH * i / 3, tickLabel: formatAxisTick(maxBar * (3 - i) / 3), dashed: i < 3
  }));
  const months = labels.map((label, index) => {
    const hitX = padL + slotW * index;
    const cx = hitX + slotW / 2;
    const hIn = Math.max(2, inAmounts[index] / maxBar * plotH);
    const hOut = Math.max(2, outAmounts[index] / maxBar * plotH);
    const cy = padT + plotH - (running[index] - minRun) / runSpan * (plotH * 0.9);
    return {
      index, shortName: NAMA_BULAN[index].slice(0, 3), label, cx,
      barInX: cx - 12, barInY: (padT + plotH - hIn).toFixed(1), barInH: hIn.toFixed(1),
      barOutX: cx + 1, barOutY: (padT + plotH - hOut).toFixed(1), barOutH: hOut.toFixed(1),
      dotX: cx.toFixed(1), dotY: cy.toFixed(1), hitX, hitY: padT, hitW: slotW, hitH: plotH,
      inText: formatDisplayRp(inAmounts[index]), outText: formatDisplayRp(outAmounts[index]),
      runText: formatDisplayRp(running[index])
    };
  });
  const curvePath = months.reduce((path, m, i) => {
    if (!i) return `M ${m.dotX} ${m.dotY}`;
    const prev = months[i - 1];
    const midX = ((prev.cx + m.cx) / 2).toFixed(1);
    return `${path} C ${midX} ${prev.dotY}, ${midX} ${m.dotY}, ${m.dotX} ${m.dotY}`;
  }, '');
  const clampWidth = (percent: number) => Math.max(0, Math.min(100, percent));
  const { compliance } = model;
  const breakdownRows = [{ label: 'Kepatuhan Iuran Grup', percent: compliance, paid: true,
    metricText: `${compliance}%`, width: clampWidth(compliance) }];
  const total = outAmounts.reduce((sum, amount) => sum + amount, 0);
  const names = new Map(state.kategori.map(cat => [cat.ID_Kategori, cat.Nama_Kategori]));
  for (const [id, amount] of [...model.outCategories].sort((a, b) => b[1] - a[1])) {
    const percent = total ? Math.round(100 * amount / total) : 0;
    breakdownRows.push({ label: names.get(id) || id || 'Operasional', percent, paid: false,
      metricText: `−${formatDisplayRp(amount)} (${percent}%)`, width: clampWidth(percent) });
  }
  return { activeYear, selectedMonth, gridLines, months, curvePath, breakdownRows };
}
