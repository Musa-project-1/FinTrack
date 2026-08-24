/**
 * @module render
 * All rendering functions: dashboard, tables, charts, mobile cards, member profile.
 */

import { NAMA_BULAN, DEFAULT_MONTHLY_FEE, AVATAR_GRADIENTS, CHART_COLORS } from './config.js';
import { getState, currentRekapYear, currentHistoryFilter, itemsToShow, setItemsToShow, incrementItemsToShow, setCashFlowChart, setExpenseChart, getCashFlowChart, getExpenseChart, getAdminPassword } from './state.js';
import { formatRp, getInitials, getAvatarGradient, escapeHtml } from './utils.js';
import { openModal, closeModal, switchTab, resetChipAktif, filterKategori } from './modal.js';

/* ── Render All ────────────────────────────────────────────────── */

/**
 * Re-render every major UI section.
 */
export const renderAll = () => {
  populateTahunRekap();
  populateFilterTahunHistory();
  renderDashboard();
  renderDropdowns();
  renderTableTransaksi();
  renderTableRekap();
  window.__renderChart && window.__renderChart();
};

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

/* ── Transaction history table ─────────────────────────────────── */

export const renderTableTransaksi = () => {
  const tbody = document.getElementById('ui-table-trx');
  if (!tbody) return;
  const state = getState();

  const searchQuery = document.getElementById('search-trx').value.toLowerCase();
  const filterBulan = document.getElementById('filter-bulan').value;
  const filterTahun = document.getElementById('filter-tahun').value;
  const loadMoreBtn = document.getElementById('load-more-container');

  const filteredTrx = [...state.transaksi].reverse().filter((trx) => {
    const tglObj = new Date(trx.Timestamp);
    const rowTipe = (trx.Tipe_Arus || '').toLowerCase();
    const rowIsIuran = trx.ID_Anggota !== '-';

    const matchesChip =
      currentHistoryFilter === 'semua' ||
      (currentHistoryFilter === 'masuk' && rowTipe === 'masuk') ||
      (currentHistoryFilter === 'keluar' && rowTipe === 'keluar') ||
      (currentHistoryFilter === 'iuran' && rowIsIuran) ||
      (currentHistoryFilter === 'operasional' && !rowIsIuran);

    const objKat = state.kategori.find((k) => k.ID_Kategori === trx.ID_Kategori);
    const namaKat = objKat ? objKat.Nama_Kategori.toLowerCase() : '';
    const ket = (trx.Keterangan || '').toLowerCase();
    const matchesSearch = searchQuery === '' || ket.includes(searchQuery) || namaKat.includes(searchQuery);

    // Iuran rows are matched by their iuran period (Bulan_Iuran/Tahun_Iuran),
    // not by the date they were recorded. Operasional rows use the timestamp.
    const isIuranRow = trx.ID_Anggota !== '-' && trx.Bulan_Iuran && trx.Bulan_Iuran !== '-';
    const iuranMonthIdx = isIuranRow ? NAMA_BULAN.indexOf(trx.Bulan_Iuran) : -1;
    const trxMonth = iuranMonthIdx !== -1 ? iuranMonthIdx : tglObj.getMonth();
    const trxYear = isIuranRow && trx.Tahun_Iuran && trx.Tahun_Iuran !== '-' ? String(trx.Tahun_Iuran) : String(tglObj.getFullYear());
    const matchesMonth = filterBulan === 'all' || String(trxMonth) === filterBulan;
    const matchesYear = filterTahun === 'all' || trxYear === filterTahun;

    return matchesChip && matchesSearch && matchesMonth && matchesYear;
  });

  if (filteredTrx.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada transaksi ditemukan.</td></tr>';
    loadMoreBtn.style.display = 'none';
    return;
  }

  const visibleTrx = filteredTrx.slice(0, itemsToShow);
  loadMoreBtn.style.display = filteredTrx.length > itemsToShow ? 'block' : 'none';

  const fragment = document.createDocumentFragment();
  let lastDateStr = '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  visibleTrx.forEach((trx) => {
    const tglObj = new Date(trx.Timestamp);

    const dateStr = tglObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    if (dateStr !== lastDateStr) {
      let dateHeader = '';
      const todayStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const yesterdayStr = yesterday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      if (dateStr === todayStr) dateHeader = 'Hari Ini';
      else if (dateStr === yesterdayStr) dateHeader = 'Kemarin';
      else dateHeader = dateStr;

      const headerRow = document.createElement('tr');
      headerRow.className = 'date-group-header';
      headerRow.innerHTML = `<td colspan="5" style="background: var(--bg-color); padding: 12px 20px; font-weight: 700; color: var(--primary); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border);">${dateHeader}</td>`;
      fragment.appendChild(headerRow);
      lastDateStr = dateStr;
    }

    const tglTime = tglObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const objKategori = state.kategori.find((k) => k.ID_Kategori === trx.ID_Kategori);
    const namaKat = objKategori ? objKategori.Nama_Kategori : '-';

    let ketExtra = trx.Keterangan || '';
    if (trx.ID_Anggota !== '-') {
      const objAng = state.anggota.find((a) => a.ID_Anggota === trx.ID_Anggota);
      const namaAnggota = objAng ? objAng.Nama_Anggota : 'Anggota';
      ketExtra = `<strong class="clickable-name" data-action="profil" data-id="${escapeHtml(trx.ID_Anggota)}">${escapeHtml(namaAnggota)}</strong> (Iuran ${escapeHtml(trx.Bulan_Iuran)} ${escapeHtml(trx.Tahun_Iuran)}) <br> <span style="font-size:12px; color:var(--text-muted); margin-top: 4px; display: inline-block;">${escapeHtml(ketExtra)}</span>`;
    } else {
      ketExtra = `<strong style="color: var(--text-main); font-weight: 600;">${escapeHtml(namaKat)}</strong> <br> <span style="font-size:12px; color:var(--text-muted); margin-top: 4px; display: inline-block;">${escapeHtml(ketExtra)}</span>`;
    }

    const isMasuk = (trx.Tipe_Arus || '').toLowerCase() === 'masuk';
    const badgeClass = isMasuk ? 'badge-masuk' : 'badge-keluar';
    const iconPh = isMasuk ? 'ph-arrow-down-left' : 'ph-arrow-up-right';
    const nominalColor = isMasuk ? 'var(--primary)' : 'var(--danger)';

    const tr = document.createElement('tr');
    tr.className = isMasuk ? 'row-masuk' : 'row-keluar';
    tr.setAttribute('data-tipe', isMasuk ? 'Masuk' : 'Keluar');
    tr.setAttribute('data-nominal', trx.Nominal);
    tr.setAttribute('data-is-iuran', trx.ID_Anggota !== '-' ? 'true' : 'false');

    tr.innerHTML = `
        <td data-label="Waktu" style="white-space: nowrap; font-size: 13px; color: var(--text-muted); vertical-align: middle;">
          ${tglTime}
        </td>
        <td data-label="Keterangan">${ketExtra}</td>
        <td data-label="Nominal" style="font-weight: 700; color: ${nominalColor}; font-size: 15px; vertical-align: middle;">${formatRp(trx.Nominal)}</td>
        <td data-label="Tipe Arus" style="vertical-align: middle;"><span class="badge ${badgeClass}"><i class="ph-bold ${iconPh}"></i> ${trx.Tipe_Arus}</span></td>
        <td data-label="Aksi" style="text-align: center; white-space: nowrap; vertical-align: middle;">
          <button class="btn-icon admin-only" style="color: #64748b;" data-action="cetak" data-id="${trx.ID_Transaksi}" title="Cetak Struk"><i class="ph-bold ph-printer" style="font-size: 16px;"></i></button>
          <button class="btn-icon admin-only" style="color: var(--warning);" data-action="edit" data-id="${trx.ID_Transaksi}" title="Edit Data"><i class="ph-bold ph-pencil-simple" style="font-size: 16px;"></i></button>
          <button class="btn-icon admin-only" style="color: var(--danger);" data-action="hapus" data-id="${trx.ID_Transaksi}" title="Hapus Data"><i class="ph-bold ph-trash" style="font-size: 16px;"></i></button>
        </td>
    `;
    fragment.appendChild(tr);
  });

  tbody.innerHTML = '';
  tbody.appendChild(fragment);
};

/* ── Load more history ─────────────────────────────────────────── */

export const loadMoreHistory = () => {
  incrementItemsToShow(20);
  renderTableTransaksi();
};

/* ── Year selectors ────────────────────────────────────────────── */

export const populateFilterTahunHistory = () => {
  const select = document.getElementById('filter-tahun');
  if (!select) return;
  const yearsSet = new Set();
  getState().transaksi.forEach((t) => {
    yearsSet.add(new Date(t.Timestamp).getFullYear().toString());
    if (t.Tahun_Iuran && t.Tahun_Iuran !== '-') yearsSet.add(t.Tahun_Iuran.toString());
  });
  const currentVal = select.value;
  select.innerHTML = '<option value="all">Semua Tahun</option>';
  Array.from(yearsSet).sort((a, b) => b - a).forEach((y) => {
    const option = document.createElement('option');
    option.value = y;
    option.text = y;
    if (y === currentVal) option.selected = true;
    select.appendChild(option);
  });
};

export const populateTahunRekap = () => {
  const select = document.getElementById('ui-tahun-rekap-select');
  const yearsSet = new Set();
  yearsSet.add(new Date().getFullYear().toString());
  getState().transaksi.forEach((t) => {
    if (t.Tahun_Iuran && t.Tahun_Iuran !== '-') yearsSet.add(t.Tahun_Iuran.toString());
  });
  select.innerHTML = '';
  Array.from(yearsSet).sort((a, b) => b - a).forEach((y) => {
    const option = document.createElement('option');
    option.value = y;
    option.text = y;
    if (y === currentRekapYear) option.selected = true;
    select.appendChild(option);
  });
};

/* ── Rekap matrix table ────────────────────────────────────────── */

export const renderTableRekap = () => {
  const tbody = document.getElementById('ui-table-rekap');
  if (!tbody) return;
  const state = getState();
  const fragment = document.createDocumentFragment();

  const mapPembayaran = {};
  state.transaksi.forEach((t) => {
    if (t.Tahun_Iuran && t.Tahun_Iuran.toString() === currentRekapYear) {
      mapPembayaran[`${t.ID_Anggota}_${t.Bulan_Iuran}`] = true;
    }
  });

  const searchVal = (document.getElementById('search-member-rekap')?.value || '').trim().toLowerCase();
  const filteredAnggota = state.anggota
    .filter((ang) => ang.Status_Aktif === 'Aktif')
    .filter((ang) => !searchVal || ang.Nama_Anggota.toLowerCase().includes(searchVal))
    .sort((a, b) => a.Nama_Anggota.localeCompare(b.Nama_Anggota));

  if (!filteredAnggota || filteredAnggota.length === 0) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center; padding:40px; color:var(--text-muted);">Tidak ada anggota ditemukan.</td></tr>';
  } else {
    filteredAnggota.forEach((ang) => {
      const tr = document.createElement('tr');
      const tdNama = document.createElement('td');
      tdNama.innerHTML = `<span class="clickable-name" data-action="profil" data-id="${escapeHtml(ang.ID_Anggota)}">${escapeHtml(ang.Nama_Anggota)}</span>`;
      tr.appendChild(tdNama);

      NAMA_BULAN.forEach((bulan, idx) => {
        const tdBulan = document.createElement('td');
        const monthKey = `${(idx + 1).toString().padStart(2, '0')}-${currentRekapYear}`;
        const isSkipped = (state.skippedMonths || []).indexOf(monthKey) !== -1;
        const isLunas = mapPembayaran[`${ang.ID_Anggota}_${bulan}`];

        if (isSkipped) {
          tdBulan.className = 'text-center td-skipped';
          tdBulan.innerHTML = '<span class="skipped-month-label">-</span>';
          tdBulan.title = 'Bulan Libur — tidak dihitung sebagai tunggakan';
        } else {
          tdBulan.className = 'text-center td-clickable';
          if (isLunas) {
            tdBulan.innerHTML = '<div class="status-lunas-dot" title="Lunas"><i class="ph-bold ph-check"></i></div>';
          } else {
            tdBulan.title = `Klik untuk bayar ${bulan}`;
            if (getAdminPassword()) {
              tdBulan.setAttribute('data-action', 'quickpay');
              tdBulan.setAttribute('data-anggota', ang.ID_Anggota);
              tdBulan.setAttribute('data-bulan', bulan);
            }
          }
        }
        tr.appendChild(tdBulan);
      });
      fragment.appendChild(tr);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }

  // Highlight skipped-month headers
  const headerRow = tbody.closest('table')?.querySelector('thead tr');
  if (headerRow) {
    const headerCells = headerRow.querySelectorAll('th');
    const skippedSet = new Set(state.skippedMonths || []);
    NAMA_BULAN.forEach((bulan, idx) => {
      const th = headerCells[idx + 1];
      if (!th) return;
      const monthKey = `${(idx + 1).toString().padStart(2, '0')}-${currentRekapYear}`;
      th.classList.toggle('th-skipped', skippedSet.has(monthKey));
    });
  }

  // Render mobile card view
  renderIuranMobileCards(filteredAnggota, mapPembayaran);
};

/* ── Mobile iuran cards ────────────────────────────────────────── */

export const renderIuranMobileCards = (filteredAnggota, mapPembayaran) => {
  const container = document.getElementById('iuran-cards-mobile');
  if (!container) return;

  if (!filteredAnggota || filteredAnggota.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 13px;">Tidak ada anggota ditemukan.</div>';
    return;
  }

  const state = getState();
  const cardsHTML = filteredAnggota.map((ang) => {
    let lunasBulan = 0;
    NAMA_BULAN.forEach((bulan) => {
      if (mapPembayaran[`${ang.ID_Anggota}_${bulan}`]) lunasBulan++;
    });
    const progressPercent = (lunasBulan / 12) * 100;
    const initials = getInitials(ang.Nama_Anggota);
    const avatarGradient = getAvatarGradient(ang.Nama_Anggota, AVATAR_GRADIENTS);
    const isFullPaid = lunasBulan === 12;

    const monthGridHTML = NAMA_BULAN.map((bulan, idx) => {
      const isLunas = mapPembayaran[`${ang.ID_Anggota}_${bulan}`];
      const monthKey = `${(idx + 1).toString().padStart(2, '0')}-${currentRekapYear}`;
      const isSkipped = (state.skippedMonths || []).indexOf(monthKey) !== -1;
      const classes = isSkipped ? 'skipped' : isLunas ? 'lunas' : 'belum';
      const title = isSkipped ? 'Bulan Libur — tidak dihitung' : isLunas ? 'Lunas' : 'Klik untuk bayar';
      const allowAction = !!getAdminPassword() && !isSkipped && !isLunas;
      const onclick = allowAction ? `data-action="quickpay-card" data-anggota="${ang.ID_Anggota}" data-bulan="${bulan}"` : '';
      return `
        <div class="iuran-month-item ${classes}" ${onclick} title="${title} ${bulan}">
          <div class="iuran-month-name">${bulan.substring(0, 3)}</div>
          <div class="iuran-month-icon"></div>
        </div>
      `;
    }).join('');

    return `
      <div class="iuran-member-card" data-action="toggle-card" tabindex="0" role="button" aria-expanded="false">
        <div class="iuran-card-header">
          <div class="iuran-card-avatar" style="background: ${avatarGradient};">${initials}</div>
          <div class="iuran-card-main-info">
            <div class="iuran-card-name" data-action="profil" data-id="${escapeHtml(ang.ID_Anggota)}">${escapeHtml(ang.Nama_Anggota)}</div>
            <div class="iuran-progress-subtext">${lunasBulan}/12 Bulan Lunas</div>
          </div>
          <div class="iuran-card-status">
            <span class="iuran-card-badge ${isFullPaid ? 'lunas' : 'pending'}">${isFullPaid ? 'LUNAS' : `${lunasBulan}/12`}</span>
            <div class="iuran-card-toggle"><i class="ph-bold ph-caret-down"></i></div>
          </div>
        </div>
        <div class="iuran-progress-bar">
          <div class="iuran-progress-fill ${isFullPaid ? 'fill-lunas' : ''}" style="width: ${progressPercent}%"></div>
        </div>
        <div class="iuran-card-details">
          <div class="iuran-month-grid">${monthGridHTML}</div>
          <div class="iuran-action-buttons">
            <button class="iuran-btn-pay admin-only" data-action="quickpay-card" data-anggota="${ang.ID_Anggota}" data-bulan="${NAMA_BULAN[new Date().getMonth()]}"><i class="ph-bold ph-check-circle"></i> Bayar</button>
            <button class="iuran-btn-detail" data-action="profil" data-id="${ang.ID_Anggota}"><i class="ph-bold ph-info"></i> Detail</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;
};

/* ── Toggle mobile card accordion ──────────────────────────────── */

export const toggleIuranCard = (cardElement) => {
  const isExpanded = cardElement.classList.contains('expanded');
  document.querySelectorAll('.iuran-member-card.expanded').forEach((card) => {
    if (card !== cardElement) {
      card.classList.remove('expanded');
      card.setAttribute('aria-expanded', 'false');
    }
  });
  cardElement.classList.toggle('expanded');
  cardElement.setAttribute('aria-expanded', (!isExpanded).toString());
};

/* ── Member profile modal ──────────────────────────────────────── */

export const bukaProfilAnggota = (idAnggota) => {
  const state = getState();
  const ang = state.anggota.find((a) => a.ID_Anggota === idAnggota);
  if (!ang) return;

  document.getElementById('p-nama-anggota').innerText = ang.Nama_Anggota;
  document.getElementById('p-id-anggota').innerText = `ID: ${ang.ID_Anggota}`;
  const statusBadge = document.getElementById('p-status-anggota');
  statusBadge.innerText = ang.Status_Aktif;
  statusBadge.className = ang.Status_Aktif === 'Aktif' ? 'badge badge-masuk' : 'badge badge-keluar';

  const userTrx = state.transaksi.filter((t) => t.ID_Anggota === idAnggota).reverse();
  let totalKontribusi = 0;
  const bulanCount = {};
  const tahunSet = new Set();

  userTrx.forEach((t) => {
    totalKontribusi += Number(t.Nominal) || 0;
    if (t.Bulan_Iuran && t.Bulan_Iuran !== '-') {
      bulanCount[t.Bulan_Iuran] = (bulanCount[t.Bulan_Iuran] || 0) + 1;
    }
    const year = new Date(t.Timestamp).getFullYear();
    tahunSet.add(year);
  });

  let bulanTerajin = '-';
  let maxCount = 0;
  for (const bln in bulanCount) {
    if (bulanCount[bln] > maxCount) {
      maxCount = bulanCount[bln];
      bulanTerajin = bln;
    }
  }

  document.getElementById('p-total-kontribusi').innerText = formatRp(totalKontribusi);
  document.getElementById('p-bulan-terajin').innerText = bulanTerajin;
  document.getElementById('p-tahun-aktif').innerText = Array.from(tahunSet).sort((a, b) => b - a).join(', ') || '-';

  const tbody = document.getElementById('p-table-transaksi');
  tbody.innerHTML = '';

  if (userTrx.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-muted);">Belum ada riwayat transaksi.</td></tr>';
  } else {
    userTrx.forEach((t) => {
      const tgl = new Date(t.Timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const tr = document.createElement('tr');
      const cat = state.kategori.find((k) => k.ID_Kategori === t.ID_Kategori);
      const namaKat = cat ? cat.Nama_Kategori : '-';
      const ket = t.Bulan_Iuran !== '-' ? `Iuran ${t.Bulan_Iuran} ${t.Tahun_Iuran}` : namaKat;
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
  document.getElementById('stat-health-label').innerText = `Tercapai ${formatRp(totalCollected)} dari ${formatRp(totalExpected)} expected.`;
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
          position: 'right',
          labels: { color: textColor, font: { family: 'Inter', size: 11 }, padding: 20 }
        },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatRp(ctx.raw)}` } }
      },
      cutout: '70%'
    }
  });
  setExpenseChart(expenseChart);
};

/* ── Skipped months modal rendering ────────────────────────────── */

export const renderSkippedMonthsList = () => {
  const container = document.getElementById('skipped-months-list');
  if (!container) return;
  container.innerHTML = '';
  const { skippedMonths } = getState();

  if (!skippedMonths || skippedMonths.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted);">Belum ada bulan libur yang diatur.</div>';
    return;
  }

  const sorted = skippedMonths.slice().sort().reverse();
  sorted.forEach((mm) => {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--border);border-radius:8px;';
    const parts = mm.split('-');
    const label = parts.length === 2 ? `${NAMA_BULAN[parseInt(parts[0], 10) - 1]} ${parts[1]}` : mm;
    card.innerHTML = `<div style="font-weight:700;">${label}</div><div style="display:flex;gap:8px;"><button class="btn btn-outline admin-only" data-action="remove-skip" data-month="${mm}">Hapus</button></div>`;
    container.appendChild(card);
  });
};
