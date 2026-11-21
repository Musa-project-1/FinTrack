import { NAMA_BULAN } from '../core/config.js';
import { billingPeriod } from '../core/dues.js';
import { formatDisplayRp } from '../core/utils.js';

const asOrdinal = ({ year, monthIndex }) => year * 12 + monthIndex;
let series = [];
let points = [];

const selectMonth = (index) => {
  const period = series[index];
  if (!period) return;
  const [x, y] = points[index];
  const fx = x.toFixed(1);
  const fy = y.toFixed(1);
  const marker = document.getElementById('bento-spark-marker');
  marker.setAttribute('cx', fx);
  marker.setAttribute('cy', fy);
  const guide = document.getElementById('bento-spark-guide');
  guide.setAttribute('x1', fx);
  guide.setAttribute('x2', fx);
  const label = `${NAMA_BULAN[period.monthIndex].slice(0, 3)}: ${formatDisplayRp(period.balance)}`;
  document.getElementById('bento-spark-value').textContent = label;
  document.getElementById('bento-spark-month').setAttribute('aria-valuetext', `${NAMA_BULAN[period.monthIndex]} ${period.year}: ${formatDisplayRp(period.balance)}`);
};

export const renderBento = (state, ledger, current, deposits, expenses) => {
  const slider = document.getElementById('bento-spark-month');
  if (!slider) return;
  const last = asOrdinal(current);
  const first = last - 11;
  const changes = Array(12).fill(0);
  let balance = 0;
  for (const trx of state.transaksi) {
    const date = new Date(trx.Timestamp);
    if (!trx.Timestamp || !Number.isFinite(date.getTime())) continue;
    const month = asOrdinal(billingPeriod(date));
    const nominal = Number(trx.Nominal) || 0;
    const delta = trx.Tipe_Arus === 'Masuk' ? nominal : trx.Tipe_Arus === 'Keluar' ? -nominal : 0;
    if (month < first) balance += delta;
    else if (month <= last) changes[month - first] += delta;
  }
  series = changes.map((delta, index) => {
    const month = first + index;
    balance += delta;
    return { year: Math.floor(month / 12), monthIndex: month % 12, balance };
  });
  const values = series.map((p) => p.balance);
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  points = values.map((value, i) => [4 + i * 108 / 11, span ? 36 - (value - min) * 28 / span : 22]);
  const line = 'M' + points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' L');
  document.getElementById('bento-spark-path').setAttribute('d', line);
  document.getElementById('bento-spark-area').setAttribute('d', `${line} L112,42 L4,42 Z`);
  selectMonth(Number(slider.value));

  const target = ledger.members.reduce((sum, member) => sum + member.expectedTotal, 0);
  const paid = ledger.members.reduce((sum, member) => sum + member.paidTotal, 0);
  const percent = target ? Math.round(100 * paid / target) : 0;
  const progress = document.getElementById('bento-compliance');
  progress.setAttribute('aria-valuenow', percent);
  progress.firstElementChild?.style.setProperty('width', `${percent}%`);
  document.getElementById('bento-compliance-label').textContent = target ? `${percent}% Lunas Tahun Ini` : 'Belum ada iuran jatuh tempo';
  document.getElementById('bento-dues-fee').textContent = `Iuran ${formatDisplayRp(ledger.monthlyFee)}/bln`;
  document.getElementById('bento-inflow-detail').textContent = deposits ? `Dari ${deposits} setoran iuran & donasi` : 'Belum ada pemasukan';
  const largest = [...expenses].reduce((maximum, entry) => !maximum || entry[1] > maximum[1] ? entry : maximum, null);
  const category = largest ? state.kategori.find((item) => item.ID_Kategori === largest[0])?.Nama_Kategori : '';
  document.getElementById('bento-outflow-detail').textContent = largest
    ? `Terbesar: ${category || 'Operasional'} (${formatDisplayRp(largest[1])})` : 'Belum ada pengeluaran';
};

export const initBento = () => {
  const slider = document.getElementById('bento-spark-month');
  slider?.addEventListener('input', () => selectMonth(Number(slider.value)));
  const chart = slider?.closest('.bento-spark-plot');
  chart?.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || event.buttons !== 0) return;
    const { left, width } = chart.getBoundingClientRect();
    if (!width) return;
    const idx = Math.max(0, Math.min(11, Math.round(11 * (event.clientX - left) / width)));
    slider.value = String(idx);
    selectMonth(idx);
  });
};
