import { NAMA_BULAN } from '../core/config.js';
import { currentRekapYear } from '../core/state.js';
import { billingPeriod, createDuesLedger } from '../core/dues.js';
import { formatDisplayRp, escapeHtml } from '../core/utils.js';

const svgNamespace = 'http://www.w3.org/2000/svg';
const node = (name, attributes, text) => {
  const element = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined && text !== null) element.textContent = text;
  return element;
};

const formatAxisTick = (val) => {
  if (val === 0) return '0';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',')}jt`;
  return `${Math.round(val / 1000)}rb`;
};

const niceAxisCeiling = (rawMax, ticks = 3) => {
  const safeMax = Math.max(ticks, Number(rawMax) || 0);
  const rawStep = safeMax / ticks;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const mult = [1, 2, 2.5, 5, 10].find((m) => m >= norm - 1e-9) ?? 10;
  return mult * mag * ticks;
};

let selectedMonth = null;
let selectedYear = null;

const metrics = (state, activeYear) => {
  const inAmounts = Array(12).fill(0);
  const outAmounts = Array(12).fill(0);
  const outCategories = new Map();
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

export const renderHybridChart = (state) => {
  const svg = document.getElementById('hybrid-cashflow');
  if (!svg) return;
  const readout = document.getElementById('hybrid-chart-readout');
  const titleEl = document.getElementById('hybrid-chart-title');
  const current = billingPeriod();
  const activeYear = Number(currentRekapYear) || current.year;
  if (titleEl) titleEl.textContent = `Arus Kas Bulanan & Tren Saldo ${activeYear}`;
  if (selectedYear !== activeYear || selectedMonth === null) {
    selectedYear = activeYear;
    selectedMonth = activeYear === current.year ? current.monthIndex : 11;
  }

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
  const fragment = document.createDocumentFragment();

  for (let gLine = 0; gLine <= 3; gLine++) {
    const y = padT + (plotH * gLine) / 3;
    const val = (maxBar * (3 - gLine)) / 3;
    fragment.append(
      node('line', {
        x1: padL, y1: y, x2: width - padR, y2: y,
        stroke: 'var(--border)',
        'stroke-dasharray': gLine === 3 ? '' : '3 4',
        'stroke-width': 1
      }),
      node('text', {
        x: padL - 8, y: y + 4,
        'text-anchor': 'end', fill: 'var(--text-muted)',
        'font-size': 10, 'font-family': 'var(--font-mono)'
      }, formatAxisTick(val))
    );
  }

  const curve = [];
  const targets = [];
  const xLabels = [];
  let dots = [];

  const select = (index) => {
    selectedMonth = index;
    targets.forEach((target, idx) => {
      const isSelected = idx === index;
      target.setAttribute('aria-pressed', String(isSelected));
      target.classList.toggle('is-selected', isSelected);
    });
    dots.forEach((dot, idx) => {
      const isSelected = idx === index;
      dot.classList.toggle('is-selected', isSelected);
      dot.setAttribute('r', isSelected ? '5.5' : '4');
    });
    xLabels.forEach((label, idx) => {
      label.classList.toggle('is-selected', idx === index);
    });
    if (!readout) return;
    readout.innerHTML = `<strong>${escapeHtml(labels[index])}</strong>
      <span class="tt-inflow sensitive-amt">Masuk: +${escapeHtml(formatDisplayRp(inAmounts[index]))}</span>
      <span class="tt-outflow sensitive-amt">Keluar: −${escapeHtml(formatDisplayRp(outAmounts[index]))}</span>
      <span class="tt-saldo sensitive-amt">Saldo Kumulatif: ${escapeHtml(formatDisplayRp(running[index]))}</span>`;
  };

  for (let i = 0; i < 12; i++) {
    const cx = padL + slotW * i + slotW / 2;
    const hIn = Math.max(2, (inAmounts[i] / maxBar) * plotH);
    const hOut = Math.max(2, (outAmounts[i] / maxBar) * plotH);

    const barIn = node('rect', {
      x: (cx - 12).toFixed(1),
      y: (padT + plotH - hIn).toFixed(1),
      width: 11,
      height: hIn.toFixed(1),
      rx: 4,
      fill: 'var(--hybrid-paid)',
      class: 'chart-bar-in'
    });
    barIn.style.setProperty('--bar-i', i);

    const barOut = node('rect', {
      x: (cx + 1).toFixed(1),
      y: (padT + plotH - hOut).toFixed(1),
      width: 11,
      height: hOut.toFixed(1),
      rx: 4,
      fill: 'var(--hybrid-outflow, #64748B)',
      opacity: '0.78',
      class: 'chart-bar-out'
    });
    barOut.style.setProperty('--bar-i', i);

    const xLabel = node('text', {
      x: cx.toFixed(1), y: height - 10,
      'text-anchor': 'middle', fill: 'var(--text-muted)',
      'font-size': 11, 'font-weight': 700,
      class: 'chart-axis-x'
    }, NAMA_BULAN[i].slice(0, 3));
    xLabels.push(xLabel);

    fragment.append(barIn, barOut, xLabel);

    const cy = padT + plotH - ((running[i] - minRun) / runSpan) * (plotH * 0.9);
    curve.push([cx, cy]);

    const hit = node('rect', {
      x: (padL + slotW * i).toFixed(1),
      y: padT,
      width: slotW.toFixed(1),
      height: plotH,
      rx: 8,
      tabindex: '0',
      role: 'button',
      'aria-pressed': 'false',
      'aria-label': `Detail bulan ${labels[i]}`,
      class: 'chart-hit-rect'
    });
    for (const event of ['mouseenter', 'focus', 'click']) hit.addEventListener(event, () => select(i));
    hit.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(i);
        return;
      }
      const next = {
        ArrowLeft: (i + 11) % 12,
        ArrowRight: (i + 1) % 12,
        Home: 0,
        End: 11
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      targets[next]?.focus();
      select(next);
    });
    targets.push(hit);
  }

  const d = curve.reduce((path, [x, y], index) => {
    if (!index) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    const prev = curve[index - 1];
    const midX = ((prev[0] + x) / 2).toFixed(1);
    return `${path} C ${midX} ${prev[1].toFixed(1)}, ${midX} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');
  const line = node('path', { d, class: 'chart-curve-path' });
  dots = curve.map(([cx, cy]) => node('circle', {
    cx: cx.toFixed(1), cy: cy.toFixed(1), r: 4,
    fill: 'var(--surface)', stroke: 'var(--hybrid-paid)', 'stroke-width': 2,
    class: 'chart-dot'
  }));
  fragment.append(line, ...dots, ...targets);
  svg.replaceChildren(fragment);

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const length = line.getTotalLength();
    if (length > 0) {
      line.style.strokeDasharray = length.toFixed(1);
      line.style.strokeDashoffset = length.toFixed(1);
      line.classList.add('draw-anim');
    }
  }
  select(selectedMonth);

  const breakdown = document.getElementById('hybrid-analytics-breakdown');
  if (!breakdown) return;
  const total = outAmounts.reduce((sum, amount) => sum + amount, 0);
  const names = new Map(state.kategori.map((cat) => [cat.ID_Kategori, cat.Nama_Kategori]));
  const rows = [['Kepatuhan Iuran Grup', model.compliance, true], ...[...model.outCategories].sort((a, b) => b[1] - a[1])
    .map(([id, amount]) => [names.get(id) || id || 'Operasional', total ? Math.round(100 * amount / total) : 0, false, amount])];
  breakdown.innerHTML = rows.map(([label, percent, paid, amount]) => `<div class="breakdown-row">
    <div class="breakdown-meta"><span>${escapeHtml(label)}</span><span class="mono tnum ${paid ? 'bd-pct-paid' : 'sensitive-amt'}">${paid ? `${percent}%` : `−${escapeHtml(formatDisplayRp(amount))} (${percent}%)`}</span></div>
    <div class="breakdown-track"><div class="breakdown-fill${paid ? ' paid' : ''}" style="width:${Math.max(0, Math.min(100, percent))}%"></div></div>
  </div>`).join('');
};
