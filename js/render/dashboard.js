import { NAMA_BULAN, CHART_COLORS, DEFAULT_MONTHLY_FEE } from "../core/config.js";
import { getState, setCashFlowChart, setExpenseChart, getCashFlowChart, getExpenseChart } from "../core/state.js";
import { formatRp, formatDisplayRp, escapeHtml } from "../core/utils.js";
import { filterKategori } from "../ui/modal.js";

/* ── Dashboard summary cards ───────────────────────────────────── */

export const renderDashboard = () => {
  let tMasuk = 0, tKeluar = 0;
  getState().transaksi.forEach((trx) => {
    const nom = Number(trx.Nominal) || 0;
    if (trx.Tipe_Arus === 'Masuk') tMasuk += nom;
    if (trx.Tipe_Arus === 'Keluar') tKeluar += nom;
  });
  const saldo = tMasuk - tKeluar;
  const saldoFormatted = formatDisplayRp(saldo);
  const masukFormatted = formatDisplayRp(tMasuk);
  const keluarFormatted = formatDisplayRp(tKeluar);

  const elMasuk = document.getElementById('ui-masuk');
  const elKeluar = document.getElementById('ui-keluar');
  const elSaldo = document.getElementById('ui-saldo');
  if (elMasuk) elMasuk.innerText = masukFormatted;
  if (elKeluar) elKeluar.innerText = keluarFormatted;
  if (elSaldo) elSaldo.innerText = saldoFormatted;

  // Header compact pills (when enabled)
  const elHdrSaldo = document.getElementById('hdr-saldo-val');
  const elHdrMasuk = document.getElementById('hdr-masuk-val');
  const elHdrKeluar = document.getElementById('hdr-keluar-val');
  if (elHdrSaldo) elHdrSaldo.innerText = saldoFormatted;
  if (elHdrMasuk) elHdrMasuk.innerText = masukFormatted;
  if (elHdrKeluar) elHdrKeluar.innerText = keluarFormatted;
};

/* ── Dropdown population ───────────────────────────────────────── */

export const renderDropdowns = () => {
  const { anggota, kategori } = getState();

  let optAnggota = '<option value="-">-- Bukan transaksi anggota --</option>';
  anggota.forEach((ang) => {
    if (ang.Status_Aktif === 'Aktif') optAnggota += `<option value="${escapeHtml(ang.ID_Anggota)}">${escapeHtml(ang.Nama_Anggota)}</option>`;
  });
  document.getElementById('edit-anggota').innerHTML = optAnggota;
  document.getElementById('ops-anggota').innerHTML = optAnggota;

  let optKatMasuk = '';
  kategori.forEach((kat) => {
    if (kat.Tipe === 'Masuk') optKatMasuk += `<option value="${escapeHtml(kat.ID_Kategori)}">${escapeHtml(kat.Nama_Kategori)}</option>`;
  });
  if (optKatMasuk === '') optKatMasuk = '<option value="">-- Buat Kategori Masuk Dulu --</option>';
  document.getElementById('iuran-kategori').innerHTML = optKatMasuk;

  filterKategori('ops-tipe', 'ops-kategori');
  const now = new Date();
  document.getElementById('iuran-tahun').value = now.getFullYear();
  document.getElementById('iuran-bulan').value = NAMA_BULAN[now.getMonth()];
};


/* ── Lazy load Chart.js on demand ─────────────────────────────── */
let chartJsPromise = null;
const ensureChartJs = () => {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!chartJsPromise) {
    chartJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => resolve(window.Chart);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return chartJsPromise;
};

/* ── Charts ────────────────────────────────────────────────────── */

export const renderChart = async () => {
  const state = getState();
  const chartEl = document.getElementById('cashFlowChart');
  if (!chartEl) return;

  try {
    await ensureChartJs();
  } catch (err) {
    console.warn('Gagal memuat pustaka Chart.js:', err);
    return;
  }

  const ctx = chartEl.getContext('2d');

  const now = new Date();
  const startDate = new Date(2025, 10, 1);
  const months = [];
  const monthLabels = [];
  let cursor = new Date(startDate);
  while (cursor <= now) {
    months.push({
      label: cursor.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      monthIndex: cursor.getMonth(),
      year: cursor.getFullYear()
    });
    monthLabels.push(cursor.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const skipSet = new Set(state.skippedMonths || []);
  const activeMembers = state.anggota.filter((a) => a.Status_Aktif === 'Aktif');
  const monthlyFee = DEFAULT_MONTHLY_FEE;
  const numActive = activeMembers.length || 1;

  // Target iuran bulanan riil (jumlah anggota aktif x nominal iuran per bulan wajib)
  const expectedThisMonth = months.map((m) => {
    const key = `${(m.monthIndex + 1).toString().padStart(2, '0')}-${m.year}`;
    return skipSet.has(key) ? 0 : monthlyFee * numActive;
  });

  const totalExpected = expectedThisMonth.reduce((sum, val) => sum + val, 0);

  // Total iuran yang terkumpul dari seluruh anggota aktif
  const totalCollected = state.transaksi
    .filter((t) => t.Tipe_Arus === 'Masuk' && t.Bulan_Iuran && t.Bulan_Iuran !== '-')
    .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0);

  const healthPct = totalExpected === 0 ? 100 : Math.min(100, Math.round((totalCollected / totalExpected) * 100));

  document.getElementById('stat-health-pct').innerText = `${healthPct}%`;
  document.getElementById('stat-health-fill').style.width = `${healthPct}%`;
  document.getElementById('stat-health-label').innerText = `Tercapai ${formatRp(totalCollected)} dari target iuran ${formatRp(totalExpected)} (${healthPct}% kepatuhan).`;
  const noteEl = document.getElementById('stat-health-note');
  if (noteEl) noteEl.innerText = '';

  const memberStatus = activeMembers.map((ang) => {
    const paidTotal = state.transaksi
      .filter((t) => t.ID_Anggota === ang.ID_Anggota && t.Tipe_Arus === 'Masuk' && t.Bulan_Iuran && t.Bulan_Iuran !== '-')
      .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0);
    const expectedTotal = months.reduce((sum, m) => {
      const key = `${(m.monthIndex + 1).toString().padStart(2, '0')}-${m.year}`;
      return sum + (skipSet.has(key) ? 0 : monthlyFee);
    }, 0);
    return { ang, paidTotal, expectedTotal, arrears: Math.max(0, expectedTotal - paidTotal) };
  });

  const fullyPaidCount = memberStatus.filter((item) => item.arrears === 0).length;
  const withArrearsCount = memberStatus.filter((item) => item.arrears > 0).length;
  const potentialUncollected = memberStatus.reduce((sum, item) => sum + item.arrears, 0);

  document.getElementById('stat-fully-paid').innerText = fullyPaidCount.toString();
  document.getElementById('stat-with-arrears').innerText = withArrearsCount.toString();
  document.getElementById('stat-uncollected').innerText = formatRp(potentialUncollected);

  // Data Pemasukan (Iuran + Operasional Masuk)
  const dataMasuk = months.map((m) =>
    state.transaksi
      .filter((t) => {
        const tgl = new Date(t.Timestamp);
        return tgl.getMonth() === m.monthIndex && tgl.getFullYear() === m.year && t.Tipe_Arus === 'Masuk';
      })
      .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0)
  );

  // Data Pengeluaran Kas
  const dataKeluar = months.map((m) =>
    state.transaksi
      .filter((t) => {
        const tgl = new Date(t.Timestamp);
        return tgl.getMonth() === m.monthIndex && tgl.getFullYear() === m.year && t.Tipe_Arus === 'Keluar';
      })
      .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0)
  );

  if (getCashFlowChart()) getCashFlowChart().destroy();

  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#93b4c7' : '#3b5e78';
  const gridColor = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(14, 36, 55, 0.08)';

  const cashFlowChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: 'Pemasukan',
          data: dataMasuk,
          borderColor: isDark ? '#2dd4bf' : '#0d9488',
          backgroundColor: isDark ? 'rgba(45, 212, 191, 0.14)' : 'rgba(13, 148, 136, 0.12)',
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          borderWidth: 2.5,
          pointBackgroundColor: isDark ? '#2dd4bf' : '#0d9488',
          pointBorderColor: isDark ? '#112334' : '#fff',
        },
        {
          label: 'Pengeluaran',
          data: dataKeluar,
          borderColor: isDark ? '#fb7185' : '#e11d48',
          backgroundColor: isDark ? 'rgba(251, 113, 133, 0.14)' : 'rgba(225, 29, 72, 0.12)',
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          borderWidth: 2.5,
          pointBackgroundColor: isDark ? '#fb7185' : '#e11d48',
          pointBorderColor: isDark ? '#112334' : '#fff',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            color: textColor,
            font: { family: 'Inter', size: 11, weight: 600 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatRp(ctx.raw)}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'jt' : val >= 1000 ? (val / 1000).toFixed(0) + 'rb' : val
          }
        }
      }
    }
  });
  setCashFlowChart(cashFlowChart);

  const updateEl = document.getElementById('last-update');
  if (updateEl) updateEl.innerText = new Date().toLocaleTimeString('id-ID');

  renderExpenseChart(isDark, textColor);
};

const renderExpenseChart = (isDark, textColor) => {
  const chartEl = document.getElementById('expenseChart');
  if (!chartEl) return;
  const ctx = chartEl.getContext('2d');
  const state = getState();
  const now = new Date();
  const currentYear = now.getFullYear();

  // Ambil seluruh pengeluaran tahun berjalan (atau sepanjang masa jika tahun ini kosong)
  let expenses = state.transaksi.filter((t) => {
    const tgl = new Date(t.Timestamp);
    return tgl.getFullYear() === currentYear && t.Tipe_Arus === 'Keluar';
  });
  let periodLabel = `Tahun ${currentYear}`;
  if (expenses.length === 0) {
    expenses = state.transaksi.filter((t) => t.Tipe_Arus === 'Keluar');
    periodLabel = 'Seluruh Transaksi';
  }

  const titleEl = document.getElementById('expense-chart-title');
  if (titleEl) {
    titleEl.textContent = `Distribusi Pengeluaran (${periodLabel})`;
  }

  const categoryTotals = {};
  let grandTotalExpense = 0;
  expenses.forEach((t) => {
    const cat = state.kategori.find((k) => k.ID_Kategori === t.ID_Kategori);
    const catName = cat ? cat.Nama_Kategori : 'Lainnya';
    const nom = Number(t.Nominal) || 0;
    categoryTotals[catName] = (categoryTotals[catName] || 0) + nom;
    grandTotalExpense += nom;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (getExpenseChart()) getExpenseChart().destroy();

  if (labels.length === 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = '13px Inter';
    ctx.clearRect(0, 0, chartEl.width, chartEl.height);
    ctx.fillText('Belum ada data pengeluaran kas', chartEl.width / 2, chartEl.height / 2);
    return;
  }

  const isMobileView = window.innerWidth < 768;
  const expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#112334' : '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobileView ? 'bottom' : 'right',
          labels: {
            color: textColor,
            font: { family: 'Inter', size: 11, weight: 500 },
            padding: isMobileView ? 10 : 16,
            boxWidth: 12,
            boxHeight: 12,
            generateLabels: (chart) => {
              const orig = Chart.overrides.doughnut.plugins.legend.labels.generateLabels(chart);
              return orig.map((item) => {
                const val = data[item.index] || 0;
                const pct = grandTotalExpense ? Math.round((val / grandTotalExpense) * 100) : 0;
                item.text = `${item.text} (${pct}%)`;
                return item;
              });
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw || 0;
              const pct = grandTotalExpense ? Math.round((val / grandTotalExpense) * 100) : 0;
              return ` ${ctx.label}: ${formatRp(val)} (${pct}%)`;
            }
          }
        }
      },
      cutout: '68%'
    }
  });
  setExpenseChart(expenseChart);
};

