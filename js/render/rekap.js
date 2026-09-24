import { NAMA_BULAN, DEFAULT_MONTHLY_FEE } from "../core/config.js";
import { getState, currentRekapYear, getIsAdminSession } from "../core/state.js";
import { formatCompactRp, escapeHtml, calculateMemberRekapProgress, isMonthOwedByMember } from "../core/utils.js";

export const populateTahunRekap = () => {
  const selects = [
    document.getElementById('ui-tahun-rekap-select'),
    document.getElementById('ui-tahun-rekap-select-mobile')
  ].filter(Boolean);

  const yearsSet = new Set();
  yearsSet.add(new Date().getFullYear().toString());
  getState().transaksi.forEach((t) => {
    if (t.Tahun_Iuran && t.Tahun_Iuran !== '-') yearsSet.add(t.Tahun_Iuran.toString());
  });

  const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

  selects.forEach((select) => {
    select.innerHTML = '';
    sortedYears.forEach((y) => {
      const option = document.createElement('option');
      option.value = y;
      option.text = y;
      if (y === currentRekapYear) option.selected = true;
      select.appendChild(option);
    });
  });
};

export const getActiveIndicatorStyle = () => {
  try {
    return localStorage.getItem('finkas_indicator_style') || 'paid';
  } catch (e) {
    return 'paid';
  }
};

export const renderLunasHtml = () => {
  const style = getActiveIndicatorStyle();
  switch (style) {
    case 'check':
      return '<div class="status-lunas-dot style-check" title="Lunas"><i class="ph-bold ph-check"></i></div>';
    case 'star':
      return '<div class="status-lunas-dot style-star" title="Lunas"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></svg></div>';
    case 'round-star':
      return '<div class="status-lunas-dot style-round-star" title="Lunas"><i class="ph-fill ph-star"></i></div>';
    case 'nominal':
      return `<div class="status-lunas-dot style-nominal" title="Lunas">${escapeHtml(formatCompactRp(DEFAULT_MONTHLY_FEE))}</div>`;
    case 'paid':
    default:
      return '<div class="status-lunas-dot style-paid" title="Lunas (PAID)"><span>PAID</span></div>';
  }
};

/* ── Matrix dues table (rekap) ─────────────────────────────────── */

export const renderTableRekap = () => {
  const tbody = document.getElementById('ui-table-rekap');
  if (!tbody) return;
  const state = getState();
  const fragment = document.createDocumentFragment();

  const mapPembayaran = {};
  state.transaksi.forEach((t) => {
    if (t.Tipe_Arus === 'Masuk' && t.Tahun_Iuran && t.Tahun_Iuran.toString() === currentRekapYear) {
      mapPembayaran[`${t.ID_Anggota}_${t.Bulan_Iuran}`] = true;
    }
  });

  const searchInput = document.getElementById('search-member-rekap');
  const searchInputMobile = document.getElementById('search-member-rekap-mobile');
  const searchVal = (
    (searchInput && searchInput.value) ||
    (searchInputMobile && searchInputMobile.value) ||
    ''
  ).trim().toLowerCase();
  const filteredAnggota = state.anggota
    .filter((ang) => ang.Status_Aktif === 'Aktif')
    .filter((ang) => !searchVal || ang.Nama_Anggota.toLowerCase().includes(searchVal))
    .sort((a, b) => a.Nama_Anggota.localeCompare(b.Nama_Anggota));

  if (!filteredAnggota || filteredAnggota.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" class="td-muted-center">Tidak ada anggota ditemukan.</td></tr>';
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
        // Months before this member joined are not owed, so they must not look
        // like an unpaid debt (keeps the matrix consistent with dashboard/WA
        // arrears, which skip pre-join months).
        const notOwed = !isMonthOwedByMember(idx, currentRekapYear, ang.Tanggal_Gabung);

        if (isSkipped) {
          tdBulan.className = 'text-center td-skipped';
          tdBulan.innerHTML = '<span class="skipped-month-label">-</span>';
          tdBulan.title = 'Bulan Libur (tidak dihitung sebagai tunggakan)';
        } else if (notOwed && !isLunas) {
          tdBulan.className = 'text-center td-skipped';
          tdBulan.innerHTML = '<span class="skipped-month-label">-</span>';
          tdBulan.title = 'Belum bergabung (tidak dihitung sebagai tunggakan)';
        } else {
          tdBulan.className = 'text-center td-clickable';
          if (isLunas) {
            tdBulan.innerHTML = renderLunasHtml();
          } else {
            tdBulan.title = `Klik untuk bayar ${bulan}`;
            if (getIsAdminSession()) {
              tdBulan.setAttribute('data-action', 'quickpay');
              tdBulan.setAttribute('data-anggota', escapeHtml(ang.ID_Anggota));
              tdBulan.setAttribute('data-bulan', escapeHtml(bulan));
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
    container.innerHTML = '<div class="iuran-cards-empty">Tidak ada anggota ditemukan.</div>';
    return;
  }

  const state = getState();
  const cardsHTML = filteredAnggota.map((ang, index) => {
    const { lunasBulan, totalOwedMonths, progressPercent, isFullPaid } = calculateMemberRekapProgress(
      ang.ID_Anggota,
      mapPembayaran,
      state.skippedMonths,
      currentRekapYear,
      NAMA_BULAN,
      ang.Tanggal_Gabung
    );
    const nomorUrut = String(index + 1).padStart(2, '0');

    const monthGridHTML = NAMA_BULAN.map((bulan, idx) => {
      const isLunas = mapPembayaran[`${ang.ID_Anggota}_${bulan}`];
      const monthKey = `${(idx + 1).toString().padStart(2, '0')}-${currentRekapYear}`;
      const isSkipped = (state.skippedMonths || []).indexOf(monthKey) !== -1;
      // Pre-join months are not a debt — render them like skipped months so the
      // mobile grid matches the desktop matrix and the arrears math.
      const notOwed = !isMonthOwedByMember(idx, currentRekapYear, ang.Tanggal_Gabung);
      const classes = isSkipped ? 'skipped' : isLunas ? 'lunas' : notOwed ? 'skipped' : 'belum';
      const title = isSkipped ? 'Bulan Libur (tidak dihitung)' : isLunas ? 'Lunas' : notOwed ? 'Belum bergabung' : 'Klik untuk bayar';
      const allowAction = getIsAdminSession() && !isSkipped && !isLunas && !notOwed;
      const onclick = allowAction
        ? `data-action="quickpay-card" data-anggota="${escapeHtml(ang.ID_Anggota)}" data-bulan="${escapeHtml(bulan)}"`
        : '';
      return `
        <div class="iuran-month-item ${classes}" ${onclick} title="${title} ${bulan}">
          <div class="iuran-month-name">${bulan.substring(0, 3)}</div>
          <div class="iuran-month-icon"></div>
        </div>
      `;
    }).join('');

    const firstUnpaidMonth = NAMA_BULAN.find((b, idx) =>
      !mapPembayaran[`${ang.ID_Anggota}_${b}`] &&
      !(state.skippedMonths || []).includes(`${(idx + 1).toString().padStart(2, '0')}-${currentRekapYear}`) &&
      isMonthOwedByMember(idx, currentRekapYear, ang.Tanggal_Gabung)
    ) || NAMA_BULAN[0];

    return `
      <div class="iuran-member-card" data-action="toggle-card" tabindex="0" role="button" aria-expanded="false">
        <div class="iuran-card-header">
          <div class="iuran-card-index">${nomorUrut}</div>
          <div class="iuran-card-main-info">
            <div class="iuran-card-name" data-action="profil" data-id="${escapeHtml(ang.ID_Anggota)}">${escapeHtml(ang.Nama_Anggota)}</div>
            <div class="iuran-progress-subtext">${lunasBulan}/${totalOwedMonths} Bulan Lunas</div>
          </div>
          <div class="iuran-card-status">
            <span class="iuran-card-badge ${isFullPaid ? 'lunas' : 'pending'}">${isFullPaid ? 'LUNAS' : `${lunasBulan}/${totalOwedMonths}`}</span>
            <div class="iuran-card-toggle"><i class="ph-bold ph-caret-down"></i></div>
          </div>
        </div>
        <div class="iuran-progress-bar">
          <div class="iuran-progress-fill ${isFullPaid ? 'fill-lunas' : ''}" style="width: ${progressPercent}%"></div>
        </div>
        <div class="iuran-card-details">
          <div class="iuran-month-grid">${monthGridHTML}</div>
          <div class="iuran-action-buttons">
            <button class="iuran-btn-pay admin-only" data-action="quickpay-card" data-anggota="${escapeHtml(ang.ID_Anggota)}" data-bulan="${escapeHtml(firstUnpaidMonth)}"><i class="ph-bold ph-check-circle"></i> Bayar</button>
            <button class="iuran-btn-detail" data-action="profil" data-id="${escapeHtml(ang.ID_Anggota)}"><i class="ph-bold ph-info"></i> Detail</button>
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


/* ── Skipped months modal rendering ────────────────────────────── */

export const renderSkippedMonthsList = () => {
  const container = document.getElementById('skipped-months-list');
  if (!container) return;
  container.innerHTML = '';
  const { skippedMonths } = getState();

  if (!skippedMonths || skippedMonths.length === 0) {
    container.innerHTML = '<div class="text-muted">Belum ada bulan libur yang diatur.</div>';
    return;
  }

  const sorted = skippedMonths.slice().sort().reverse();
  sorted.forEach((mm) => {
    const card = document.createElement('div');
    card.className = 'skip-month-card';
    const parts = mm.split('-');
    const label = parts.length === 2 ? `${NAMA_BULAN[parseInt(parts[0], 10) - 1]} ${parts[1]}` : mm;
    card.innerHTML = `<div class="fw-700">${escapeHtml(label)}</div><div class="flex-align-gap"><button class="btn btn-outline admin-only" data-action="remove-skip" data-month="${escapeHtml(mm)}">Hapus</button></div>`;
    container.appendChild(card);
  });
};
