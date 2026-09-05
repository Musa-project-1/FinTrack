import { NAMA_BULAN, CHART_COLORS, DEFAULT_MONTHLY_FEE } from "../config.js";
import { getState, setCashFlowChart, setExpenseChart, getCashFlowChart, getExpenseChart } from "../state.js";
import { formatRp, escapeHtml } from "../utils.js";
import { filterKategori } from "../modal.js";

/* ── Dashboard summary cards ───────────────────────────────────── */

export const renderDashboard = () => {
  let tMasuk = 0, tKeluar = 0;
  getState().transaksi.forEach((trx) => {
    const nom = Number(trx.Nominal) || 0;
    if (trx.Tipe_Arus === 'Masuk') tMasuk += nom;
    if (trx.Tipe_Arus === 'Keluar') tKeluar += nom;
  });
  document.getElementById('ui-masuk').innerText = formatRp(tMasuk);
  document.getElementById('ui-keluar').innerText = formatRp(tKeluar);
  document.getElementById('ui-saldo').innerText = formatRp(tMasuk - tKeluar);
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


/* ── Charts ────────────────────────────────────────────────────── */

export const renderChart = () => {
  const state = getState();
  const chartEl = document.getElementById('cashFlowChart');
  if (!chartEl) return;
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

  const expectedThisMonth = months.map((m) =>
    skipSet.has(`${(m.monthIndex + 1).toString().padStart(2, '0')}-${m.year}`) ? 0 : monthlyFee
  );

  const paidByMonth = months.map((m) =>
    state.transaksi
      .filter((t) => {
        const tgl = new Date(t.Timestamp);
        return tgl.getMonth() === m.monthIndex && tgl.getFullYear() === m.year && t.Tipe_Arus === 'Masuk';
      })
      .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0)
  );

  const totalExpected = expectedThisMonth.reduce((sum, val) => sum + val, 0);
  const totalCollected = paidByMonth.reduce((sum, val) => sum + val, 0);
  const healthPct = totalExpected === 0 ? 100 : Math.min(100, Math.round((totalCollected / totalExpected) * 100));

  document.getElementById('stat-health-pct').innerText = `${healthPct}%`;
  document.getElementById('stat-health-fill').style.width = `${healthPct}%`;
  document.getElementById('stat-health-label').innerText = `Tercapai ${formatRp(totalCollected)} dari target ${formatRp(totalExpected)}.`;
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

  const dataMasuk = months.map((m) =>
    state.transaksi
      .filter((t) => {
        const tgl = new Date(t.Timestamp);
        return tgl.getMonth() === m.monthIndex && tgl.getFullYear() === m.year && t.Tipe_Arus === 'Masuk';
      })
      .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0)
  );

  if (getCashFlowChart()) getCashFlowChart().destroy();

  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const cashFlowChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Masuk',
        data: dataMasuk,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.14)',
        tension: 0.35,
        pointRadius: 4,
        fill: true,
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatRp(ctx.raw)}` } }
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
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const expenses = state.transaksi.filter((t) => {
    const tgl = new Date(t.Timestamp);
    return tgl.getMonth() === currentMonth && tgl.getFullYear() === currentYear && t.Tipe_Arus === 'Keluar';
  });

  const categoryTotals = {};
  expenses.forEach((t) => {
    const cat = state.kategori.find((k) => k.ID_Kategori === t.ID_Kategori);
    const catName = cat ? cat.Nama_Kategori : 'Lainnya';
    categoryTotals[catName] = (categoryTotals[catName] || 0) + (Number(t.Nominal) || 0);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (getExpenseChart()) getExpenseChart().destroy();

  if (labels.length === 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = '14px Inter';
    ctx.clearRect(0, 0, chartEl.width, chartEl.height);
    ctx.fillText('Tidak ada pengeluaran bulan ini', chartEl.width / 2, chartEl.height / 2);
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
        borderColor: isDark ? '#1e293b' : '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobileView ? 'bottom' : 'right',
          labels: { color: textColor, font: { family: 'Inter', size: 11 }, padding: isMobileView ? 12 : 20, boxWidth: isMobileView ? 14 : 40 }
        },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatRp(ctx.raw)}` } }
      },
      cutout: '70%'
    }
  });
  setExpenseChart(expenseChart);
};

