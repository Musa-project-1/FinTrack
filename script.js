// URL Web App GAS
const GAS_URL = "https://script.google.com/macros/s/AKfycbw9MdExL8gCSI9LXFbHS0GKTPBjYx6jZn_xah5_v5yO7G_sjJQvKMQrs4fD4ZopjdfT/exec"; 

let state = { anggota: [], kategori: [], transaksi: [] };
let cashFlowChart = null;
let expenseChart = null;
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let currentRekapYear = new Date().getFullYear().toString();
let currentHistoryFilter = 'semua';

const OFFLINE_DB_NAME = 'demokas-offline-db';
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE_NAME = 'offline-transactions';

const openOfflineDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const addOfflineTransaction = async (transaction) => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.add(transaction);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getOfflineTransactions = async () => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const deleteOfflineTransaction = async (id) => {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const queueOfflinePayload = async (payload) => {
  const queuedPayload = {
    payload,
    queuedAt: new Date().toISOString()
  };
  await addOfflineTransaction(queuedPayload);
  await updateOfflineQueueBadge();
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await registration.sync.register('demokas-sync-offline');
    } catch (syncError) {
      console.warn('Background sync unavailable:', syncError);
    }
  }
};

const syncOfflineTransactions = async () => {
  try {
    const queued = await getOfflineTransactions();
    if (!queued.length) return;

    let successCount = 0;

    for (const item of queued) {
      const payloadToSend = { ...item.payload };
      delete payloadToSend.queuedAt;

      const resJSON = await sendAdminPayload(payloadToSend);
      if (!resJSON) {
        showToast('Tidak dapat menyinkronkan transaksi tertunda saat ini.', 'error');
        return;
      }

      if (resJSON.status) {
        await deleteOfflineTransaction(item.id);
        await updateOfflineQueueBadge();
        successCount += 1;
      } else {
        showToast(`Sinkronisasi gagal: ${resJSON.message}`, 'error');
        return;
      }
    }

    if (successCount > 0) {
      showToast(`Terkirim ${successCount} transaksi tertunda.`, 'success');
      initApp();
      renderChart();
    }
    await updateOfflineQueueBadge();
  } catch (error) {
    console.error('Sync offline transactions failed', error);
    showToast('Gagal menyinkronkan transaksi tertunda.', 'error');
  }
};

window.addEventListener('online', () => {
  showToast('Koneksi kembali. Menyinkronkan transaksi offline...', 'success');
  syncOfflineTransactions();
  updateOfflineQueueBadge();
});

window.addEventListener('offline', () => {
  showToast('Anda sedang offline. Transaksi akan disimpan lokal.', 'error');
  updateOfflineQueueBadge();
});

// ==========================================
// FITUR LOGIN ADMIN
// ==========================================
const hashText = async (text) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

let adminPassword = localStorage.getItem('demokas_admin_pwd') || "";

const toggleAdminLogin = () => {
  if (adminPassword) {
    adminPassword = "";
    localStorage.removeItem('demokas_admin_pwd');
    renderAdminUI();
    showToast("Berhasil keluar dari Mode Admin.", "success");
  } else {
    openModal('modal-login');
  }
};

const submitLoginAdmin = async (e) => {
  e.preventDefault();

  const btn = e.target.querySelector('button');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Mengecek...';
  btn.disabled = true;

  const pwd = document.getElementById('input-admin-pwd').value;
  const hashedPwd = await hashText(pwd);

  const payload = {
    action: "cekLoginAdmin",
    adminPassword: hashedPwd
  };

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: JSON.stringify(payload) })
    });
    const resJSON = await response.json();

    if (resJSON.status) {
      adminPassword = hashedPwd;
      localStorage.setItem('demokas_admin_pwd', hashedPwd);
      closeModal('modal-login');
      document.getElementById('input-admin-pwd').value = "";
      renderAdminUI();
      showToast("Berhasil Login sebagai Admin!", "success");
    } else {
      showToast(resJSON.message, "error");
      document.getElementById('input-admin-pwd').value = "";
      document.getElementById('input-admin-pwd').focus();
    }
  } catch (error) {
    showToast("Gagal terhubung ke server.", "error");
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};

const renderAdminUI = () => {
  const btn = document.getElementById('btn-login-admin');
  if (btn) {
    if (adminPassword) {
      btn.innerHTML = '<i class="ph-fill ph-lock-key-open" style="color: var(--primary);"></i> Admin Aktif';
    } else {
      btn.innerHTML = '<i class="ph ph-lock-key"></i> Login Admin';
    }
  }
};

// === MOBILE MENU ===
const toggleMobileMenu = () => {
  const headerActions = document.getElementById('header-actions');
  if (headerActions) {
    headerActions.classList.toggle('mobile-menu-open');
  }
};

// Close mobile menu when a button is clicked
const closeMobileMenu = () => {
  const headerActions = document.getElementById('header-actions');
  if (headerActions) {
    headerActions.classList.remove('mobile-menu-open');
  }
};

// Close mobile menu on window resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeMobileMenu();
  }
});

// === THEME LOGIC ===
const applyTheme = () => {
  const isDark = localStorage.getItem('theme') === 'dark';
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const themeIcons = document.querySelectorAll('.theme-icon');
  
  if (isDark) {
    document.body.classList.add('dark-mode');
    themeIcons.forEach(icon => icon.classList.replace('ph-moon', 'ph-sun'));
    if(metaTheme) metaTheme.setAttribute('content', '#0f172a');
  } else {
    document.body.classList.remove('dark-mode');
    themeIcons.forEach(icon => icon.classList.replace('ph-sun', 'ph-moon'));
    if(metaTheme) metaTheme.setAttribute('content', '#f1f5f9');
  }
  if (cashFlowChart || expenseChart) renderChart();
};

const toggleTheme = () => {
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
  applyTheme();
};

// === UTILS ===
const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

const setConnectionStatus = (isOnline) => {
  const badges = document.querySelectorAll('.connection-status');
  if (!badges || badges.length === 0) return;
  badges.forEach(badge => {
    // ensure icon and status-text exist
    let icon = badge.querySelector('i');
    if (!icon) {
      icon = document.createElement('i');
      icon.className = 'ph-fill ph-circle';
      badge.prepend(icon);
    }
    let statusTextEl = badge.querySelector('.status-text');
    if (!statusTextEl) {
      statusTextEl = document.createElement('span');
      statusTextEl.className = 'status-text';
      badge.appendChild(statusTextEl);
    }
    statusTextEl.textContent = isOnline ? 'Online' : 'Offline';
    if (isOnline) badge.classList.remove('offline'); else badge.classList.add('offline');
  });
};

// Update offline queue count indicator inside the connection badge
const updateOfflineQueueBadge = async () => {
  const badges = document.querySelectorAll('.connection-status');
  if (!badges || badges.length === 0) return;
  try {
    const queued = await getOfflineTransactions();
    const count = (queued && queued.length) || 0;
    badges.forEach(badge => {
      let span = badge.querySelector('.queue-count');
      if (count > 0) {
        if (!span) {
          span = document.createElement('span');
          span.className = 'queue-count';
          badge.appendChild(span);
        }
        span.textContent = ` • ${count} pending`;
      } else if (span) {
        span.remove();
      }
      // update tooltip/title with connectivity and pending count
      const online = navigator.onLine;
      const statusText = online ? 'Online' : 'Offline';
      const title = count > 0 ? `${statusText} — ${count} transaksi tertunda. Klik untuk lihat.` : `${statusText} — Tidak ada transaksi tertunda.`;
      badge.setAttribute('title', title);
    });
  } catch (err) {
    console.warn('updateOfflineQueueBadge error', err);
  }
};

// Open modal and render offline queue items
const renderOfflineQueueList = async () => {
  const container = document.getElementById('offline-queue-list');
  if (!container) return;
  container.innerHTML = '';
  try {
    const queued = await getOfflineTransactions();
    if (!queued || queued.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);">Tidak ada transaksi tertunda.</div>';
      return;
    }

    queued.reverse().forEach(item => {
      const card = document.createElement('div');
      card.className = 'pending-item';
      const t = new Date(item.queuedAt).toLocaleString('id-ID');
      const action = item.payload && item.payload.action ? item.payload.action : 'unknown';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:700; color:var(--text-main);">${action}</div>
            <div style="font-size:12px; color:var(--text-muted);">${t}</div>
            <div style="margin-top:6px; font-size:12px; color:var(--text-muted);">${JSON.stringify(item.payload.dataForm || item.payload || {})}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline" onclick="(async ()=>{ await deleteOfflineTransaction(${item.id}); await renderOfflineQueueList(); await updateOfflineQueueBadge(); })()">Hapus</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger);">Gagal memuat daftar.</div>';
  }
};

const updateOfflineQueueList = async () => {
  await renderOfflineQueueList();
};

const openOfflineQueueModal = async () => {
  await renderOfflineQueueList();
  openModal('modal-offline-queue');
};

// Attach click handler to all connection-status badges (and keyboard enter)
const attachConnectionBadgeHandlers = () => {
  document.querySelectorAll('.connection-status').forEach(el => {
    el.setAttribute('title', 'Klik untuk melihat transaksi tertunda dan sinkronisasi.');
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => { openOfflineQueueModal(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openOfflineQueueModal(); });
  });
};


// === CHART LOGIC ===
const renderChart = () => {
  const chartEl = document.getElementById('cashFlowChart');
  if (!chartEl) return;
  const ctx = chartEl.getContext('2d');
  
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ 
      label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      monthIndex: d.getMonth(),
      year: d.getFullYear()
    });
  }

  const dataMasuk = months.map(m => {
    return state.transaksi
      .filter(t => {
        const tgl = new Date(t.Timestamp);
        return tgl.getMonth() === m.monthIndex && tgl.getFullYear() === m.year && t.Tipe_Arus === 'Masuk';
      })
      .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0);
  });

  const dataKeluar = months.map(m => {
    return state.transaksi
      .filter(t => {
        const tgl = new Date(t.Timestamp);
        return tgl.getMonth() === m.monthIndex && tgl.getFullYear() === m.year && t.Tipe_Arus === 'Keluar';
      })
      .reduce((sum, t) => sum + (Number(t.Nominal) || 0), 0);
  });

  if (cashFlowChart) cashFlowChart.destroy();

  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  cashFlowChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: 'Masuk',
          data: dataMasuk,
          backgroundColor: '#10b981',
          borderRadius: 6,
        },
        {
          label: 'Keluar',
          data: dataKeluar,
          backgroundColor: '#f43f5e',
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Inter', size: 11 } } },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatRp(ctx.raw)}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, callback: (val) => val >= 1000000 ? (val/1000000).toFixed(1) + 'jt' : (val >= 1000 ? (val/1000).toFixed(0) + 'rb' : val) } }
      }
    }
  });
  
  const updateEl = document.getElementById('last-update');
  if (updateEl) updateEl.innerText = new Date().toLocaleTimeString('id-ID');

  renderExpenseChart(isDark, textColor);
};

const renderExpenseChart = (isDark, textColor) => {
  const chartEl = document.getElementById('expenseChart');
  if (!chartEl) return;
  const ctx = chartEl.getContext('2d');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter expenses for current month
  const expenses = state.transaksi.filter(t => {
    const tgl = new Date(t.Timestamp);
    return tgl.getMonth() === currentMonth && tgl.getFullYear() === currentYear && t.Tipe_Arus === 'Keluar';
  });

  // Group by category
  const categoryTotals = {};
  expenses.forEach(t => {
    const cat = state.kategori.find(k => k.ID_Kategori === t.ID_Kategori);
    const catName = cat ? cat.Nama_Kategori : 'Lainnya';
    categoryTotals[catName] = (categoryTotals[catName] || 0) + (Number(t.Nominal) || 0);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (expenseChart) expenseChart.destroy();

  if (labels.length === 0) {
    // If no data, show a simple message in the canvas
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = '14px Inter';
    ctx.clearRect(0, 0, chartEl.width, chartEl.height);
    ctx.fillText('Tidak ada pengeluaran bulan ini', chartEl.width / 2, chartEl.height / 2);
    return;
  }

  const colors = [
    '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#3b82f6'
  ];

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#1e293b' : '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, font: { family: 'Inter', size: 11 }, padding: 20 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatRp(ctx.raw)}`
          }
        }
      },
      cutout: '70%'
    }
  });
};

// === LIVE CURRENCY FORMATTING ===
const handleNominalInput = (el) => {
  let value = el.value.replace(/[^0-9]/g, '');
  if (value === "") {
    el.value = "";
    return;
  }
  el.value = new Intl.NumberFormat('id-ID').format(parseInt(value));
};

const getRawNominal = (id) => {
  const val = document.getElementById(id).value;
  return parseInt(val.replace(/[^0-9]/g, '')) || 0;
};

const validateNominal = (nominal) => {
  if (nominal <= 0) {
    showToast("Nominal harus lebih dari 0!", "error");
    return false;
  }
  return true;
};

const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = type === 'success' 
    ? `<i class="ph-fill ph-check-circle" style="color:var(--primary); font-size:22px;"></i> <span>${message}</span>` 
    : `<i class="ph-fill ph-warning-circle" style="color:var(--danger); font-size:22px;"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
};

const postToBackend = async (payload) => {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: JSON.stringify(payload) })
    });
    return await response.json();
  } catch (e) {
    return null;
  }
};

const sendAdminPayload = async (payload) => {
  return await postToBackend(payload);
};

const isOnline = () => window.navigator.onLine;

const bukaProfilAnggota = (idAnggota) => {
  const ang = state.anggota.find(a => a.ID_Anggota === idAnggota);
  if (!ang) return;

  // Set Profile Basic Info
  document.getElementById('p-nama-anggota').innerText = ang.Nama_Anggota;
  document.getElementById('p-id-anggota').innerText = `ID: ${ang.ID_Anggota}`;
  const statusBadge = document.getElementById('p-status-anggota');
  statusBadge.innerText = ang.Status_Aktif;
  statusBadge.className = ang.Status_Aktif === "Aktif" ? "badge badge-masuk" : "badge badge-keluar";

  // Filter Transactions
  const userTrx = state.transaksi.filter(t => t.ID_Anggota === idAnggota).reverse();
  
  // Calculate Stats
  let totalKontribusi = 0;
  const bulanCount = {};
  const tahunSet = new Set();

  userTrx.forEach(t => {
    totalKontribusi += (Number(t.Nominal) || 0);
    if (t.Bulan_Iuran && t.Bulan_Iuran !== "-") {
      bulanCount[t.Bulan_Iuran] = (bulanCount[t.Bulan_Iuran] || 0) + 1;
    }
    const year = new Date(t.Timestamp).getFullYear();
    tahunSet.add(year);
  });

  // Find Favorite Month
  let bulanTerajin = "-";
  let maxCount = 0;
  for (const bln in bulanCount) {
    if (bulanCount[bln] > maxCount) {
      maxCount = bulanCount[bln];
      bulanTerajin = bln;
    }
  }

  // Set UI Stats
  document.getElementById('p-total-kontribusi').innerText = formatRp(totalKontribusi);
  document.getElementById('p-bulan-terajin').innerText = bulanTerajin;
  document.getElementById('p-tahun-aktif').innerText = Array.from(tahunSet).sort((a,b)=>b-a).join(", ") || "-";

  // Render Member History Table
  const tbody = document.getElementById('p-table-transaksi');
  tbody.innerHTML = "";
  
  if (userTrx.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-muted);">Belum ada riwayat transaksi.</td></tr>';
  } else {
    userTrx.forEach(t => {
      const tgl = new Date(t.Timestamp).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
      const tr = document.createElement('tr');
      const cat = state.kategori.find(k => k.ID_Kategori === t.ID_Kategori);
      const namaKat = cat ? cat.Nama_Kategori : "-";
      const ket = t.Bulan_Iuran !== "-" ? `Iuran ${t.Bulan_Iuran} ${t.Tahun_Iuran}` : namaKat;

      tr.innerHTML = `
        <td style="font-size: 12px; color: var(--text-muted);">${tgl}</td>
        <td style="font-size: 13px; font-weight: 600;">${ket}</td>
        <td style="font-size: 13px; font-weight: 700; color: var(--primary); text-align: right;">${formatRp(t.Nominal)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  openModal('modal-profil-anggota');
};

const openModal = (id) => {
  closeMobileMenu();
  if (id === 'modal-riwayat') {
    itemsToShow = 20;
    renderTableTransaksi();
  }
  document.getElementById(id).classList.add('active');
  document.body.classList.add('modal-open');
};

const closeModal = (id) => {
  document.getElementById(id).classList.remove('active');
  // Hanya hapus modal-open jika tidak ada modal lain yang sedang aktif
  if (!document.querySelector('.modal-overlay.active')) {
    document.body.classList.remove('modal-open');
  }
};

// Close modal on Escape key or clicking outside
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) closeModal(activeModal.id);
  }
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
});

const switchTab = (tabName, modalId) => {
  const modal = document.getElementById(modalId);
  modal.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById(`btn-tab-${tabName}`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
};

// === PERFORMANCE & CACHE LOGIC ===
const saveCache = () => localStorage.setItem('demokas_cache', JSON.stringify(state));
const loadCache = () => {
  const cached = localStorage.getItem('demokas_cache');
  if (cached) {
    try {
      state = JSON.parse(cached);
      return true;
    } catch(e) { return false; }
  }
  return false;
};

const renderAll = () => {
  populateTahunRekap();
  populateFilterTahunHistory();
  renderDashboard(); 
  renderDropdowns(); 
  renderTableTransaksi(); 
  renderTableRekap();
  renderChart();
};

// === INIT APP OPTIMIZED ===
let isLoading = false;
const initApp = async () => {
  if(isLoading) return; 
  
  // 1. Instant Load from Cache
  const hasCache = loadCache();
  if (hasCache) {
    renderAll();
  } else {
    const trxList = document.getElementById('ui-table-trx');
    if(trxList) trxList.innerHTML = `<tr><td colspan="5"><div style="padding: 10px;"><div class="skeleton skeleton-text"></div></div></td></tr>`;
  }
  
  isLoading = true;
  try {
    const response = await fetch(`${GAS_URL}?action=getDataAwal`);
    const resJSON = await response.json();
    
    if (resJSON.status) {
      state.anggota = resJSON.data.anggota || [];
      state.kategori = resJSON.data.kategori || [];
      state.transaksi = resJSON.data.transaksi || [];
      
      saveCache(); 
      renderAll();
      setConnectionStatus(true);
    } else {
      showToast(resJSON.message, 'error');
      setConnectionStatus(false);
    }
  } catch (error) { 
    setConnectionStatus(false);
    if (!hasCache) showToast("Mode Offline: Menampilkan data simulasi.", 'warning');
  } finally { 
    isLoading = false;
  }
};

// === FITUR FILTER PENCARIAN RIWAYAT ===
const setHistoryFilter = (filter, btn) => {
  currentHistoryFilter = filter;
  document.querySelectorAll('#history-filter-chips .chip-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  itemsToShow = 20; // Reset pagination
  renderTableTransaksi();
};

const filterRiwayat = () => {
  itemsToShow = 20; // Reset pagination
  renderTableTransaksi();
};

const populateFilterTahunHistory = () => {
  const select = document.getElementById('filter-tahun');
  if (!select) return;
  
  let yearsSet = new Set();
  state.transaksi.forEach(t => {
    const year = new Date(t.Timestamp).getFullYear().toString();
    yearsSet.add(year);
  });
  
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Semua Tahun</option>';
  Array.from(yearsSet).sort((a,b)=>b-a).forEach(y => {
    let option = document.createElement('option');
    option.value = y;
    option.text = y;
    if (y === currentVal) option.selected = true;
    select.appendChild(option);
  });
};

// === SMART CHECKLIST: Live Search & Counter ===
const filterAnggotaIuran = () => {
  const input = document.getElementById('search-anggota-iuran').value.toLowerCase();
  const items = document.querySelectorAll('#iuran-checkbox-anggota .checkbox-item');
  items.forEach(item => {
    const text = item.innerText.toLowerCase();
    if(text.includes(input)) item.style.display = 'flex';
    else item.style.display = 'none';
  });
};

const updateCounterOps = () => {
  const nominal = getRawNominal('ops-nominal');
  const tipe = document.getElementById('ops-tipe').value;
  
  const summaryTipe = document.getElementById('summary-ops-tipe');
  const summaryLabel = document.getElementById('summary-ops-label');
  const summaryTotal = document.getElementById('summary-ops-total');
  
  document.getElementById('summary-ops-nominal').innerText = formatRp(nominal);
  summaryTotal.innerText = formatRp(nominal);

  if (tipe === 'Masuk') {
    summaryTipe.innerText = 'PEMASUKAN';
    summaryTipe.style.color = 'var(--primary)';
    summaryLabel.innerText = 'SALDO BERTAMBAH:';
    summaryTotal.style.color = 'var(--primary)';
  } else {
    summaryTipe.innerText = 'PENGELUARAN';
    summaryTipe.style.color = 'var(--danger)';
    summaryLabel.innerText = 'SALDO BERKURANG:';
    summaryTotal.style.color = 'var(--danger)';
  }
};

const updateCounterIuran = () => {
  const nominal = getRawNominal('iuran-nominal');
  const totalElements = document.querySelectorAll('.chk-iuran:not(:disabled)');
  const totalChecked = document.querySelectorAll('.chk-iuran:not(:disabled):checked').length;
  
  // Update Counters
  document.getElementById('count-terpilih').innerText = `${totalChecked} dari ${totalElements.length}`;
  document.getElementById('summary-count').innerText = `${totalChecked} Orang`;
  document.getElementById('summary-nominal').innerText = formatRp(nominal);
  document.getElementById('summary-total').innerText = formatRp(totalChecked * nominal);
  
  const btnPilihSemua = document.getElementById('btn-pilih-semua');
  if (totalElements.length === 0) {
     btnPilihSemua.innerText = "Lunas Semua!";
     btnPilihSemua.disabled = true;
  } else if (totalChecked === totalElements.length) {
    btnPilihSemua.innerText = "Kosongkan";
    btnPilihSemua.disabled = false;
  } else {
    btnPilihSemua.innerText = "Pilih Semua";
    btnPilihSemua.disabled = false;
  }
};

const pilihSemuaIuran = () => { 
  const checkboxes = document.querySelectorAll('.chk-iuran:not(:disabled)');
  if(checkboxes.length === 0) return showToast("Semua anggota sudah lunas bulan ini!", "success");

  const isAllChecked = Array.from(checkboxes).every(chk => chk.checked);
  checkboxes.forEach(chk => chk.checked = !isAllChecked); 
  updateCounterIuran();
};

// === FITUR BARU: SMART DETECTION LUNAS ===
const renderCheckboxIuran = () => {
  const bln = document.getElementById('iuran-bulan').value;
  const thn = document.getElementById('iuran-tahun').value;
  
  const mapLunas = {};
  state.transaksi.forEach(t => {
    if (t.Bulan_Iuran === bln && t.Tahun_Iuran == thn && t.Tipe_Arus === 'Masuk' && t.ID_Anggota !== "-") {
      mapLunas[t.ID_Anggota] = true;
    }
  });
  const container = document.getElementById('iuran-checkbox-anggota'); 
  container.innerHTML = '';
  
  state.anggota.forEach(ang => { 
    if(ang.Status_Aktif === "Aktif") { 
      const isLunas = mapLunas[ang.ID_Anggota];
      if(isLunas) {
        container.innerHTML += `
          <label class="checkbox-item" style="background: var(--bg-color); border-color: var(--border); cursor: not-allowed; opacity: 0.6; box-shadow: none;">
            <input type="checkbox" class="chk-iuran" value="${ang.ID_Anggota}" disabled checked>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="color: var(--text-muted); text-decoration: line-through; font-size: 13px; font-weight: 500;">${ang.Nama_Anggota}</span>
              <div style="font-size: 10px; color: var(--primary); font-weight: 700; display: flex; align-items: center; gap: 4px;"><i class="ph-fill ph-check-circle"></i> LUNAS</div>
            </div>
          </label>`; 
      } else {
        container.innerHTML += `
          <label class="checkbox-item">
            <input type="checkbox" class="chk-iuran" value="${ang.ID_Anggota}" onchange="updateCounterIuran()">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-size: 14px; font-weight: 600; color: var(--text-main);">${ang.Nama_Anggota}</span>
              <div style="font-size: 10px; color: var(--text-muted); font-weight: 500;">BELUM BAYAR</div>
            </div>
          </label>`; 
      }
    } 
  });

  updateCounterIuran();
  filterAnggotaIuran();
};

// === RENDERING DASHBOARD ===
const renderDashboard = () => {
  let tMasuk = 0, tKeluar = 0;
  
  state.transaksi.forEach(trx => {
    const nom = Number(trx.Nominal) || 0;
    if (trx.Tipe_Arus === "Masuk") tMasuk += nom;
    if (trx.Tipe_Arus === "Keluar") tKeluar += nom;
  });
  document.getElementById('ui-masuk').innerText = formatRp(tMasuk);
  document.getElementById('ui-keluar').innerText = formatRp(tKeluar);
  document.getElementById('ui-saldo').innerText = formatRp(tMasuk - tKeluar);
};

const renderDropdowns = () => {
  let optAnggota = '<option value="-">-- Bukan transaksi anggota --</option>';
  state.anggota.forEach(ang => { if(ang.Status_Aktif === "Aktif") optAnggota += `<option value="${ang.ID_Anggota}">${ang.Nama_Anggota}</option>`; });
  document.getElementById('edit-anggota').innerHTML = optAnggota;
  document.getElementById('ops-anggota').innerHTML = optAnggota;

  let optKatMasuk = '';
  state.kategori.forEach(kat => { if (kat.Tipe === 'Masuk') optKatMasuk += `<option value="${kat.ID_Kategori}">${kat.Nama_Kategori}</option>`; });
  if(optKatMasuk === '') optKatMasuk = '<option value="">-- Buat Kategori Masuk Dulu --</option>';
  document.getElementById('iuran-kategori').innerHTML = optKatMasuk;

  filterKategori('ops-tipe', 'ops-kategori');
  const now = new Date();
  document.getElementById('iuran-tahun').value = now.getFullYear();
  document.getElementById('iuran-bulan').value = namaBulan[now.getMonth()];
};

const filterKategori = (idTipe, idKat) => {
  const tipe = document.getElementById(idTipe).value;
  const elKategori = document.getElementById(idKat);
  elKategori.innerHTML = '<option value="">-- Pilih Kategori --</option>';
  state.kategori.forEach(kat => { if (kat.Tipe === tipe) elKategori.innerHTML += `<option value="${kat.ID_Kategori}">${kat.Nama_Kategori}</option>`; });
};

// === LOGIKA CHIPS NOMINAL CEPAT ===
const pilihNominalCepat = (nilai, btnElement) => {
  const el = document.getElementById('iuran-nominal');
  el.value = new Intl.NumberFormat('id-ID').format(nilai);
  document.querySelectorAll('#chip-group-iuran .chip-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');
  updateCounterIuran();
};

const resetChipAktif = () => {
  document.querySelectorAll('#chip-group-iuran .chip-btn').forEach(btn => btn.classList.remove('active'));
};

// === RENDER TABLES (TRANSAKSI & REKAP) ===
let itemsToShow = 20;

const loadMoreHistory = () => {
  itemsToShow += 20;
  renderTableTransaksi();
};

const renderTableTransaksi = () => {
  const tbody = document.getElementById('ui-table-trx');
  if(!tbody) return;
  
  const searchQuery = document.getElementById("search-trx").value.toLowerCase();
  const filterBulan = document.getElementById("filter-bulan").value;
  const filterTahun = document.getElementById("filter-tahun").value;
  const loadMoreBtn = document.getElementById("load-more-container");

  // Filter Data first
  const filteredTrx = [...state.transaksi].reverse().filter(trx => {
    const tglObj = new Date(trx.Timestamp);
    const rowTipe = (trx.Tipe_Arus || "").toLowerCase();
    const rowIsIuran = trx.ID_Anggota !== "-";
    
    // Chips Filter
    const matchesChip = (currentHistoryFilter === 'semua') ||
                        (currentHistoryFilter === 'masuk' && rowTipe === 'masuk') ||
                        (currentHistoryFilter === 'keluar' && rowTipe === 'keluar') ||
                        (currentHistoryFilter === 'iuran' && rowIsIuran) ||
                        (currentHistoryFilter === 'operasional' && !rowIsIuran);
    
    // Search Filter
    const objKat = state.kategori.find(k => k.ID_Kategori === trx.ID_Kategori);
    const namaKat = objKat ? objKat.Nama_Kategori.toLowerCase() : "";
    const ket = (trx.Keterangan || "").toLowerCase();
    const matchesSearch = searchQuery === "" || ket.includes(searchQuery) || namaKat.includes(searchQuery);

    // Month/Year Filter
    const matchesMonth = filterBulan === "all" || tglObj.getMonth().toString() === filterBulan;
    const matchesYear = filterTahun === "all" || tglObj.getFullYear().toString() === filterTahun;

    return matchesChip && matchesSearch && matchesMonth && matchesYear;
  });

  if (filteredTrx.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada transaksi ditemukan.</td></tr>';
    loadMoreBtn.style.display = "none";
    return;
  }

  // Handle Lazy Loading Slice
  const visibleTrx = filteredTrx.slice(0, itemsToShow);
  loadMoreBtn.style.display = filteredTrx.length > itemsToShow ? "block" : "none";

  // Batch Rendering with DocumentFragment
  const fragment = document.createDocumentFragment();
  let lastDateStr = "";

  visibleTrx.forEach(trx => {
    const tglObj = new Date(trx.Timestamp);
    
    // Visual Date Grouping
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    
    let dateHeader = "";
    const dateStr = tglObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    if (dateStr !== lastDateStr) {
      if (dateStr === today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })) {
        dateHeader = "Hari Ini";
      } else if (dateStr === yesterday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })) {
        dateHeader = "Kemarin";
      } else {
        dateHeader = dateStr;
      }
      
      const headerRow = document.createElement('tr');
      headerRow.className = 'date-group-header';
      headerRow.innerHTML = `<td colspan="5" style="background: var(--bg-color); padding: 12px 20px; font-weight: 700; color: var(--primary); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border);">${dateHeader}</td>`;
      fragment.appendChild(headerRow);
      lastDateStr = dateStr;
    }

    const tglTime = tglObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const objKategori = state.kategori.find(k => k.ID_Kategori === trx.ID_Kategori);
    const namaKat = objKategori ? objKategori.Nama_Kategori : "-";
    
    let ketExtra = trx.Keterangan || "";
    if(trx.ID_Anggota !== "-") {
       const objAng = state.anggota.find(a => a.ID_Anggota === trx.ID_Anggota);
       const namaAnggota = objAng ? objAng.Nama_Anggota : "Anggota";
       ketExtra = `<strong class="clickable-name" onclick="bukaProfilAnggota('${trx.ID_Anggota}')">${namaAnggota}</strong> (Iuran ${trx.Bulan_Iuran} ${trx.Tahun_Iuran}) <br> <span style="font-size:12px; color:var(--text-muted); margin-top: 4px; display: inline-block;">${ketExtra}</span>`;
    } else {
       ketExtra = `<strong style="color: var(--text-main); font-weight: 600;">${namaKat}</strong> <br> <span style="font-size:12px; color:var(--text-muted); margin-top: 4px; display: inline-block;">${ketExtra}</span>`;
    }

    const isMasuk = (trx.Tipe_Arus || "").toLowerCase() === 'masuk';
    const badgeClass = isMasuk ? 'badge-masuk' : 'badge-keluar';
    const iconPh = isMasuk ? 'ph-arrow-down-left' : 'ph-arrow-up-right';
    const nominalColor = isMasuk ? 'var(--primary)' : 'var(--danger)';

    const tr = document.createElement('tr');
    tr.className = isMasuk ? 'row-masuk' : 'row-keluar';
    tr.setAttribute('data-tipe', isMasuk ? 'Masuk' : 'Keluar');
    tr.setAttribute('data-nominal', trx.Nominal);
    tr.setAttribute('data-is-iuran', trx.ID_Anggota !== "-" ? 'true' : 'false');
    
    tr.innerHTML = `
        <td data-label="Waktu" style="white-space: nowrap; font-size: 13px; color: var(--text-muted); vertical-align: middle;">
          ${tglTime}
        </td>
        <td data-label="Keterangan">${ketExtra}</td>
        <td data-label="Nominal" style="font-weight: 700; color: ${nominalColor}; font-size: 15px; vertical-align: middle;">${formatRp(trx.Nominal)}</td>
        <td data-label="Tipe Arus" style="vertical-align: middle;"><span class="badge ${badgeClass}"><i class="ph-bold ${iconPh}"></i> ${trx.Tipe_Arus}</span></td>
        <td data-label="Aksi" style="text-align: center; white-space: nowrap; vertical-align: middle;">
          <button class="btn-icon" style="color: #64748b;" onclick="cetakStruk('${trx.ID_Transaksi}')" title="Cetak Struk"><i class="ph-bold ph-printer" style="font-size: 16px;"></i></button>
          <button class="btn-icon" style="color: var(--warning);" onclick="bukaModalEdit('${trx.ID_Transaksi}')" title="Edit Data"><i class="ph-bold ph-pencil-simple" style="font-size: 16px;"></i></button>
          <button class="btn-icon" style="color: var(--danger);" onclick="konfirmasiHapus('${trx.ID_Transaksi}')" title="Hapus Data"><i class="ph-bold ph-trash" style="font-size: 16px;"></i></button>
        </td>
    `;
    fragment.appendChild(tr);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
};

const populateTahunRekap = () => {
  const select = document.getElementById('ui-tahun-rekap-select');
  let yearsSet = new Set(); yearsSet.add(new Date().getFullYear().toString());
  state.transaksi.forEach(t => { if (t.Tahun_Iuran && t.Tahun_Iuran !== "-") yearsSet.add(t.Tahun_Iuran.toString()); });
  select.innerHTML = "";
  Array.from(yearsSet).sort((a,b)=>b-a).forEach(y => {
    let option = document.createElement('option'); option.value = y; option.text = y;
    if (y === currentRekapYear) option.selected = true;
    select.appendChild(option);
  });
};

const gantiTahunRekap = (tahunBaru) => { currentRekapYear = tahunBaru.toString(); renderTableRekap(); };

const renderTableRekap = () => {
  const tbody = document.getElementById('ui-table-rekap');
  if(!tbody) return;
  
  const fragment = document.createDocumentFragment();
  
  const mapPembayaran = {};
  state.transaksi.forEach(t => {
    if (t.Tahun_Iuran && t.Tahun_Iuran.toString() === currentRekapYear) {
      mapPembayaran[`${t.ID_Anggota}_${t.Bulan_Iuran}`] = true;
    }
  });
  
  // Filter & Sort Anggota Alphabetically
  const filteredAnggota = state.anggota
    .filter(ang => ang.Status_Aktif === "Aktif")
    .sort((a, b) => a.Nama_Anggota.localeCompare(b.Nama_Anggota));

  if (!filteredAnggota || filteredAnggota.length === 0) {
    tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:40px; color:var(--text-muted);">Tidak ada anggota ditemukan.</td></tr>`;
    return;
  }

  filteredAnggota.forEach(ang => {
    let tr = document.createElement('tr');
    let tdNama = document.createElement('td'); 
    tdNama.innerHTML = `<span class="clickable-name" onclick="bukaProfilAnggota('${ang.ID_Anggota}')">${ang.Nama_Anggota}</span>`;
    tr.appendChild(tdNama);
    
    namaBulan.forEach((bulan, idx) => {
      let tdBulan = document.createElement('td'); 
      tdBulan.className = "text-center td-clickable";
      
      const isLunas = mapPembayaran[`${ang.ID_Anggota}_${bulan}`];
      
      if (isLunas) {
        tdBulan.innerHTML = `<div class="status-lunas-dot" title="Lunas"><i class="ph-bold ph-check"></i></div>`;
      } else {
        tdBulan.title = `Klik untuk bayar ${bulan}`;
        tdBulan.onclick = () => quickPay(ang.ID_Anggota, bulan);
      }
      tr.appendChild(tdBulan);
    });

    fragment.appendChild(tr);
  });
  
  tbody.innerHTML = "";
  tbody.appendChild(fragment);
  
  // Render mobile card view
  renderIuranMobileCards(filteredAnggota, mapPembayaran);
};

// === RENDER MOBILE CARD VIEW ===
const renderIuranMobileCards = (filteredAnggota, mapPembayaran) => {
  const container = document.getElementById('iuran-cards-mobile');
  if (!container) return;
  
  if (!filteredAnggota || filteredAnggota.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada anggota ditemukan.</div>`;
    return;
  }
  
  const cardsHTML = filteredAnggota.map(ang => {
    // Hitung berapa bulan sudah lunas
    let lunasBulan = 0;
    namaBulan.forEach(bulan => {
      if (mapPembayaran[`${ang.ID_Anggota}_${bulan}`]) {
        lunasBulan++;
      }
    });
    const progressPercent = (lunasBulan / 12) * 100;
    
    // Generate month grid
    const monthGridHTML = namaBulan.map(bulan => {
      const isLunas = mapPembayaran[`${ang.ID_Anggota}_${bulan}`];
      return `
        <div class="iuran-month-item ${isLunas ? 'lunas' : 'belum'}" 
             onclick="quickPayFromCard('${ang.ID_Anggota}', '${bulan}', event)"
             title="Klik untuk ${isLunas ? 'lihat detail' : 'bayar'} ${bulan}">
          <div class="iuran-month-name">${bulan.substring(0, 3)}</div>
          <div class="iuran-month-icon"></div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="iuran-member-card" onclick="toggleIuranCard(this)">
        <div class="iuran-card-header">
          <div class="iuran-card-name" onclick="bukaProfilAnggota('${ang.ID_Anggota}'); event.stopPropagation();">
            ${ang.Nama_Anggota}
          </div>
          <div class="iuran-card-status">
            <span class="iuran-card-badge ${lunasBulan < 12 ? 'pending' : ''}">
              ${lunasBulan}/12
            </span>
            <div class="iuran-card-toggle">
              <i class="ph-bold ph-caret-down"></i>
            </div>
          </div>
        </div>
        
        <div class="iuran-progress-bar">
          <div class="iuran-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="iuran-progress-text">${lunasBulan}/12 bulan sudah dibayar</div>
        
        <div class="iuran-card-details">
          <div class="iuran-month-grid">
            ${monthGridHTML}
          </div>
          <div class="iuran-action-buttons">
            <button class="iuran-btn-pay" onclick="quickPay('${ang.ID_Anggota}', '${namaBulan[new Date().getMonth()]}'); event.stopPropagation();">
              <i class="ph-bold ph-check-circle"></i> Bayar
            </button>
            <button class="iuran-btn-detail" onclick="bukaProfilAnggota('${ang.ID_Anggota}'); event.stopPropagation();">
              <i class="ph-bold ph-info"></i> Detail
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = cardsHTML;
};

// Toggle card expand/collapse
const toggleIuranCard = (cardElement) => {
  cardElement.classList.toggle('expanded');
};

// Quick pay from card view
const quickPayFromCard = (idAnggota, bulan, event) => {
  event.stopPropagation();
  const isAlreadyLunas = !!document.querySelector(`[onclick*="bukaProfilAnggota('${idAnggota}')"]`)?.closest('.iuran-member-card')?.querySelector(`.iuran-month-item.lunas`);
  if (isAlreadyLunas) return;
  quickPay(idAnggota, bulan);
};

// === QUICK PAY LOGIC ===
const quickPay = (idAnggota, bulan) => {
  bukaModalTransaksi();
  
  // Set the specific member and month
  setTimeout(() => {
    document.getElementById('iuran-bulan').value = bulan;
    document.getElementById('iuran-tahun').value = currentRekapYear;
    
    // Trigger the checkbox render
    renderCheckboxIuran();
    
    // Auto-check the specific member
    setTimeout(() => {
      const checkboxes = document.querySelectorAll('.chk-iuran');
      checkboxes.forEach(chk => {
        if (chk.value === idAnggota && !chk.disabled) {
          chk.checked = true;
          updateCounterIuran();
        }
      });
    }, 50);
  }, 100);
};

// === [FITUR EXPORT: CSV & CETAK LAPORAN] ===
const exportToCSV = () => {
  if(state.transaksi.length === 0) return showToast("Tidak ada data untuk diunduh", "error");
  closeModal('modal-export');
  let csvContent = "data:text/csv;charset=utf-8,ID Transaksi,Tanggal,Tipe Arus,Kategori,ID Anggota,Bulan Iuran,Tahun Iuran,Nominal,Keterangan\n";
  state.transaksi.forEach(row => { const ket = (row.Keterangan || "").replace(/,/g, " "); const tgl = new Date(row.Timestamp).toLocaleDateString('id-ID'); csvContent += `${row.ID_Transaksi},${tgl},${row.Tipe_Arus},${row.ID_Kategori},${row.ID_Anggota},${row.Bulan_Iuran},${row.Tahun_Iuran},${row.Nominal},${ket}\n`; });
  const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Laporan_Kas_${new Date().getTime()}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); showToast("File Excel diunduh!");
};

const cetakLaporanTahunan = () => {
  if(state.anggota.length === 0) return showToast("Tidak ada data anggota untuk dicetak.", "error");
  closeModal('modal-export');

  const mapPembayaran = {};
  state.transaksi.forEach(t => {
    if (t.Tahun_Iuran && t.Tahun_Iuran.toString() === currentRekapYear) {
      mapPembayaran[`${t.ID_Anggota}_${t.Bulan_Iuran}`] = true;
    }
  });
  
  let tbodyHTML = "";
  let index = 1;
  state.anggota.forEach((ang) => {
    if(ang.Status_Aktif === "Aktif") {
      let tr = `<tr><td style="text-align:center;">${index++}</td><td style="text-align:left; padding-left: 8px;">${ang.Nama_Anggota}</td>`;
      namaBulan.forEach(bulan => {
        const lunas = mapPembayaran[`${ang.ID_Anggota}_${bulan}`];
        tr += `<td style="text-align:center;">${lunas ? '&#10003;' : ''}</td>`;
      });
      tr += `</tr>`;
      tbodyHTML += tr;
    }
  });
  
  const printContents = `
    <html>
    <head>
      <title>Laporan Rekap Iuran ${currentRekapYear} - KasKita</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #111; }
        h2 { text-align: center; margin-bottom: 5px; }
        p { text-align: center; margin-top: 0; color: #555; font-size: 14px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #aaa; padding: 8px 4px; }
        th { background-color: #eee; text-transform: uppercase; font-size: 11px; text-align: center;}
        @media print {
          @page { size: landscape; margin: 15mm; }
        }
      </style>
    </head>
    <body>
      <h2>Laporan Rekap Iuran Anggota</h2>
      <p>Tahun: <b>${currentRekapYear}</b> | Dicetak pada: ${new Date().toLocaleDateString('id-ID')}</p>
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th style="text-align: left; padding-left: 8px; width: 180px;">Nama Anggota</th>
            <th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>Mei</th><th>Jun</th>
            <th>Jul</th><th>Agu</th><th>Sep</th><th>Okt</th><th>Nov</th><th>Des</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHTML}
        </tbody>
      </table>
      <div style="margin-top: 50px; text-align: right; padding-right: 60px;">
        <p style="text-align: right; color:#111;">Mengetahui,</p>
        <br><br><br>
        <p style="text-align: right; color:#111;"><b>Pengurus Kas</b></p>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContents);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};

// === [FITUR 4] EDIT TRANSAKSI ===
const bukaModalEdit = (idTrx) => {
  const trx = state.transaksi.find(t => t.ID_Transaksi === idTrx);
  if(!trx) return;

  document.getElementById('edit-id').value = trx.ID_Transaksi;
  document.getElementById('edit-tipe').value = trx.Tipe_Arus;
  
  filterKategori('edit-tipe', 'edit-kategori');
  setTimeout(() => { document.getElementById('edit-kategori').value = trx.ID_Kategori; }, 50);
  
  document.getElementById('edit-nominal').value = trx.Nominal;
  document.getElementById('edit-anggota').value = trx.ID_Anggota || "-";
  document.getElementById('edit-bulan').value = trx.Bulan_Iuran || "-";
  document.getElementById('edit-tahun').value = trx.Tahun_Iuran || "";
  document.getElementById('edit-keterangan').value = trx.Keterangan || "";

  document.getElementById('modal-riwayat').classList.remove('active');
  openModal('modal-edit-transaksi');
};

const submitEditTransaksi = async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-edit');
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Updating...'; btn.disabled = true;
  
  const payload = {
    action: "editTransaksi", 
    adminPassword: adminPassword,
    dataForm: {
      idTransaksi: document.getElementById('edit-id').value,
      tipeArus: document.getElementById('edit-tipe').value,
      idKategori: document.getElementById('edit-kategori').value,
      idAnggota: document.getElementById('edit-anggota').value,
      bulanIuran: document.getElementById('edit-bulan').value,
      tahunIuran: document.getElementById('edit-tahun').value,
      nominal: document.getElementById('edit-nominal').value,
      keterangan: document.getElementById('edit-keterangan').value
    }
  };
  try {
    const resJSON = await sendAdminPayload(payload);
    if (!resJSON) return;
    if (resJSON.status) { showToast("Data berhasil diperbarui!"); closeModal('modal-edit-transaksi'); initApp(); } 
    else showToast(resJSON.message, 'error');
  } catch (error) { showToast("Sistem (Backend) belum mendukung fitur Edit.", 'error'); } 
  finally { btn.innerHTML = 'UPDATE DATA'; btn.disabled = false; }
};

// === CETAK STRUK PDF/PRINT (SINGLE TRX) ===
const cetakStruk = (idTrx) => {
  const trx = state.transaksi.find(t => t.ID_Transaksi === idTrx);
  if(!trx) return;

  const tglObj = new Date(trx.Timestamp);
  const tglStr = tglObj.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const objKategori = state.kategori.find(k => k.ID_Kategori === trx.ID_Kategori);
  const namaKat = objKategori ? objKategori.Nama_Kategori : "-";
  const objAng = state.anggota.find(a => a.ID_Anggota === trx.ID_Anggota);
  const namaAnggota = objAng ? objAng.Nama_Anggota : "-";
  
  const printContents = `
    <html>
    <head>
      <title>Struk Transaksi - KasKita</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 14px; color: #000; padding: 20px; width: 300px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .footer { text-align: center; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; font-size: 12px; }
        h2 { margin: 0; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>KAS KITA PRO</h2>
        <div>Bukti Transaksi</div>
        <div style="font-size: 11px; margin-top:4px;">ID: ${trx.ID_Transaksi}</div>
      </div>
      
      <div style="margin-bottom: 15px; font-size: 12px;">Waktu: ${tglStr}</div>
      
      <div class="row"><span>Tipe Arus:</span> <span><b>${trx.Tipe_Arus.toUpperCase()}</b></span></div>
      <div class="row"><span>Kategori:</span> <span>${namaKat}</span></div>
      <div class="row"><span>Anggota:</span> <span>${namaAnggota !== "-" ? namaAnggota : "-"}</span></div>
      <div class="row" style="margin-top:10px; padding-top:10px; border-top: 1px dashed #ccc;">
        <span><b>NOMINAL:</b></span> 
        <span style="font-size: 16px;"><b>${formatRp(trx.Nominal)}</b></span>
      </div>
      
      <div style="margin-top: 15px;">Catatan: <br><i>${trx.Keterangan || "-"}</i></div>
      
      <div class="footer">
        Dicetak oleh Sistem<br>
        <i>Terima kasih</i>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  printWindow.document.write(printContents);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};

// === LOGIKA SIMPAN TRANSAKSI (SIMPLIFIED 2 TABS) ===

// 1. Submit Iuran Anggota
const submitIuran = async (e) => {
  e.preventDefault();
  const checkboxes = document.querySelectorAll('.chk-iuran:not(:disabled):checked');
  if(checkboxes.length === 0) return showToast("Pilih minimal 1 anggota!", "error");
  
  const btn = document.getElementById('btn-submit-iuran');
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Menyimpan...';
  btn.disabled = true;

  const arrIdAnggota = Array.from(checkboxes).map(chk => chk.value);
  const formNominal = getRawNominal('iuran-nominal');
  const formKategori = document.getElementById('iuran-kategori').value;
  const formBulan = document.getElementById('iuran-bulan').value;
  const formTahun = document.getElementById('iuran-tahun').value;
  
  const payload = { 
    action: "tambahTransaksiMassal", 
    adminPassword: adminPassword,
    dataForm: { 
      tipeArus: "Masuk", idKategori: formKategori, arrIdAnggota: arrIdAnggota, 
      bulanIuran: formBulan, tahunIuran: formTahun, nominal: formNominal, keterangan: "Iuran Anggota" 
    } 
  };

  if (!isOnline()) {
    await queueOfflinePayload(payload);
    showToast('Offline: transaksi iuran disimpan lokal untuk sinkronisasi nanti.', 'success');
    closeModal('modal-transaksi');

    const timestamp = new Date().toISOString();
    arrIdAnggota.forEach(idAng => {
      state.transaksi.push({ ID_Transaksi: "TRX-TEMP-" + Math.floor(Math.random() * 100000), Timestamp: timestamp, Tipe_Arus: "Masuk", ID_Kategori: formKategori, ID_Anggota: idAng, Bulan_Iuran: formBulan, Tahun_Iuran: formTahun, Nominal: formNominal, Keterangan: "Iuran Anggota" });
    });

    populateTahunRekap(); renderDashboard(); renderTableTransaksi(); renderTableRekap(); renderChart();
    renderCheckboxIuran();
    const elIuranNominal = document.getElementById('iuran-nominal');
    elIuranNominal.value = new Intl.NumberFormat('id-ID').format(10000);
    resetChipAktif();
    if(document.querySelector('#chip-group-iuran .chip-btn:first-child')) {
       document.querySelector('#chip-group-iuran .chip-btn:first-child').classList.add('active');
    }

    btn.innerHTML = 'SIMPAN IURAN'; btn.disabled = false;
    return;
  }

  try { 
    const resJSON = await sendAdminPayload(payload);
    if (!resJSON) {
      await queueOfflinePayload(payload);
      showToast('Offline atau server tidak tersedia. Transaksi disimpan lokal.', 'success');
      closeModal('modal-transaksi');
      btn.innerHTML = 'SIMPAN IURAN'; btn.disabled = false;
      return;
    }
    
    if (resJSON.status) { 
      showToast("Iuran berhasil dicatat!");
      closeModal('modal-transaksi'); 
      
      // Optimistic UI Update
      const timestamp = new Date().toISOString();
      arrIdAnggota.forEach(idAng => {
        state.transaksi.push({ ID_Transaksi: "TRX-TEMP-" + Math.floor(Math.random() * 100000), Timestamp: timestamp, Tipe_Arus: "Masuk", ID_Kategori: formKategori, ID_Anggota: idAng, Bulan_Iuran: formBulan, Tahun_Iuran: formTahun, Nominal: formNominal, Keterangan: "Iuran Anggota" });
      });
      
      populateTahunRekap(); renderDashboard(); renderTableTransaksi(); renderTableRekap(); renderChart();
      renderCheckboxIuran();
      
      const elIuranNominal = document.getElementById('iuran-nominal');
      elIuranNominal.value = new Intl.NumberFormat('id-ID').format(10000);
      resetChipAktif();
      if(document.querySelector('#chip-group-iuran .chip-btn:first-child')) {
         document.querySelector('#chip-group-iuran .chip-btn:first-child').classList.add('active');
      }
    } else {
      showToast(resJSON.message, 'error');
    }
  } catch (error) { 
    if (!isOnline()) {
      await queueOfflinePayload(payload);
      showToast('Offline: transaksi iuran disimpan lokal untuk sinkronisasi nanti.', 'success');
      closeModal('modal-transaksi');
    } else {
      showToast("Gagal menyimpan data.", 'error');
    }
  } finally { 
    btn.innerHTML = 'SIMPAN IURAN'; btn.disabled = false;
  }
};

// 2. Submit Kas Operasional
const submitOperasional = async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-ops');
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Menyimpan...';
  btn.disabled = true;

  const formTipe = document.getElementById('ops-tipe').value;
  const formKategori = document.getElementById('ops-kategori').value;
  const formNominal = getRawNominal('ops-nominal');
  const formAnggota = document.getElementById('ops-anggota').value;
  const formKeterangan = document.getElementById('ops-keterangan').value;
  
  const payload = { 
    action: "tambahTransaksi", 
    adminPassword: adminPassword,
    dataForm: { 
      tipeArus: formTipe, idKategori: formKategori, idAnggota: formAnggota, 
      bulanIuran: "-", tahunIuran: "-", nominal: formNominal, keterangan: formKeterangan 
    } 
  };

  if (!isOnline()) {
    await queueOfflinePayload(payload);
    showToast('Offline: transaksi operasional disimpan lokal untuk sinkronisasi nanti.', 'success');
    closeModal('modal-transaksi');
    state.transaksi.push({ ID_Transaksi: "TRX-TEMP-" + Math.floor(Math.random() * 100000), Timestamp: new Date().toISOString(), Tipe_Arus: formTipe, ID_Kategori: formKategori, ID_Anggota: formAnggota, Bulan_Iuran: "-", Tahun_Iuran: "-", Nominal: formNominal, Keterangan: formKeterangan });
    populateTahunRekap(); renderDashboard(); renderTableTransaksi(); renderTableRekap(); renderChart();
    document.getElementById('tab-operasional').querySelector('form').reset();
    document.getElementById('ops-anggota').value = "-";
    document.getElementById('ops-tipe').value = "Keluar";
    filterKategori('ops-tipe', 'ops-kategori');
    btn.innerHTML = 'SIMPAN OPERASIONAL'; btn.disabled = false;
    return;
  }

  try { 
    const resJSON = await sendAdminPayload(payload);
    if (!resJSON) {
      await queueOfflinePayload(payload);
      showToast('Offline atau server tidak tersedia. Transaksi disimpan lokal.', 'success');
      closeModal('modal-transaksi');
      btn.innerHTML = 'SIMPAN OPERASIONAL'; btn.disabled = false;
      return;
    }
    
    if (resJSON.status) { 
      showToast("Transaksi Operasional dicatat!");
      closeModal('modal-transaksi'); 
      state.transaksi.push({ ID_Transaksi: "TRX-TEMP-" + Math.floor(Math.random() * 100000), Timestamp: new Date().toISOString(), Tipe_Arus: formTipe, ID_Kategori: formKategori, ID_Anggota: formAnggota, Bulan_Iuran: "-", Tahun_Iuran: "-", Nominal: formNominal, Keterangan: formKeterangan });
      populateTahunRekap(); renderDashboard(); renderTableTransaksi(); renderTableRekap(); renderChart();
      document.getElementById('tab-operasional').querySelector('form').reset();
      document.getElementById('ops-anggota').value = "-";
      document.getElementById('ops-tipe').value = "Keluar";
      filterKategori('ops-tipe', 'ops-kategori');
    } else {
      showToast(resJSON.message, 'error');
    }
  } catch (error) { 
    if (!isOnline()) {
      await queueOfflinePayload(payload);
      showToast('Offline: transaksi operasional disimpan lokal untuk sinkronisasi nanti.', 'success');
      closeModal('modal-transaksi');
    } else {
      showToast("Gagal menyimpan data.", 'error');
    }
  } finally { 
    btn.innerHTML = 'SIMPAN OPERASIONAL'; btn.disabled = false;
  }
};

// Fungsi Hapus Standar
const konfirmasiHapus = (idTrx) => { document.getElementById('hapus-id-target').value = idTrx; document.getElementById('modal-hapus').style.zIndex = "110"; openModal('modal-hapus'); };
const eksekusiHapus = async () => {
  const idTarget = document.getElementById('hapus-id-target').value;
  const btn = document.getElementById('btn-hapus'); btn.innerHTML = '...'; btn.disabled = true;
  const payload = { action: "hapusTransaksi", idTransaksi: idTarget };
  const payloadWithAuth = { action: "hapusTransaksi", idTransaksi: idTarget, adminPassword: adminPassword };
  try { 
    const resJSON = await sendAdminPayload(payloadWithAuth);
    if (!resJSON) return;
    if (resJSON.status) { showToast("Data dihapus!"); closeModal('modal-hapus'); initApp(); renderChart(); } else showToast(resJSON.message, 'error');
  } catch (error) { 
    showToast("Gagal menghapus.", 'error'); 
  } finally { 
    btn.innerHTML = 'Ya, Hapus'; btn.disabled = false;
  }
};

// Fungsi Buka Modal & Reset View
const bukaModalTransaksi = () => {
  // Buka tab Iuran sebagai default
  switchTab('iuran', 'modal-transaksi');
  
  // Reset Pencarian
  document.getElementById('search-anggota-iuran').value = "";
  
  // Set Default Waktu untuk form Iuran (Memicu renderCheckboxIuran secara otomatis)
  document.getElementById('iuran-tahun').value = new Date().getFullYear();
  document.getElementById('iuran-bulan').value = namaBulan[new Date().getMonth()];
  
  // Panggil Smart Detection pertama kali
  renderCheckboxIuran();
  
  // Pastikan Operasional Form ke-reset
  document.getElementById('tab-operasional').querySelector('form').reset();
  document.getElementById('ops-anggota').value = "-";
  document.getElementById('ops-tipe').value = "Keluar";
  filterKategori('ops-tipe', 'ops-kategori');
  
  // Reset Chip Iuran ke 10.000
  const elIuranNominalInit = document.getElementById('iuran-nominal');
  elIuranNominalInit.value = new Intl.NumberFormat('id-ID').format(10000);
  resetChipAktif();
  if(document.querySelector('#chip-group-iuran .chip-btn')) {
     document.querySelector('#chip-group-iuran .chip-btn').classList.add('active');
  }

  openModal('modal-transaksi');
};

window.addEventListener('DOMContentLoaded', async () => { applyTheme(); initApp(); renderAdminUI(); await updateOfflineQueueBadge(); attachConnectionBadgeHandlers(); if (isOnline()) syncOfflineTransactions(); });
