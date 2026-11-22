import { createPagination } from '../ui/pagination.js';
import { getDuesDisplayStatus, getActiveIndicatorStyle, renderLunasHtml, renderMiniStamp } from '../ui/dues-status.js';
import { getPinnedMemberId } from '../ui/spotlight.js';
import { syncBulkDues } from '../ui/bulk-dues.js';
import { GROUP_START_YEAR, NAMA_BULAN } from "../core/config.js";
import { getState, currentRekapYear, getIsAdminView, getActiveGroupId } from "../core/state.js";
import { formatRp, escapeHtml, parseKasStart } from "../core/utils.js";
import { billingPeriod, createDuesLedger } from "../core/dues.js";

export const populateTahunRekap = () => {
  const selects = [
    document.getElementById('ui-tahun-rekap-select'),
    document.getElementById('ui-tahun-rekap-select-mobile')
  ].filter(Boolean);

  const state = getState();
  const currentYear = billingPeriod().year;
  const startYear = parseKasStart(state.kasStart)?.year ?? GROUP_START_YEAR;
  const yearsSet = new Set([String(currentYear), currentRekapYear]);
  if (startYear < currentYear) yearsSet.add(String(currentYear - 1));
  state.transaksi.forEach((t) => {
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
    const group = select.closest('.year-pill')?.querySelector('.hybrid-year-glider');
    if (group) {
      const limit = select.id?.endsWith('-mobile') ? 2 : 3;
      group.hidden = sortedYears.length > limit;
      if (group.hidden) {
        group.replaceChildren();
        return;
      }
      const years = [...sortedYears].reverse();
      group.style.setProperty('--year-count', years.length);
      group.style.setProperty('--year-index', Math.max(0, years.indexOf(currentRekapYear)));
      group.innerHTML = '<span class="year-glider-indicator" aria-hidden="true"></span>' + years.map((year) => `<button type="button"
        data-action="select-rekap-year" data-year="${escapeHtml(year)}" aria-pressed="${year === currentRekapYear}">${escapeHtml(year)}</button>`).join('');
    }
  });
};

const newlyPaidCells = new Set();
const paidCellKey = (id, month, year) => JSON.stringify([String(id), month, String(year)]);

export const markNewlyPaidCells = (idAnggotaList, bulan, tahun) => {
  const ids = Array.isArray(idAnggotaList) ? idAnggotaList : [idAnggotaList];
  ids.forEach((id) => {
    if (id && bulan && tahun) newlyPaidCells.add(paidCellKey(id, bulan, tahun));
  });
};

const renderMonthStatus = (ang, bulan, month, stampStyle) => {
  const status = getDuesDisplayStatus(month);
  if (status === 'Lunas') return renderLunasHtml(newlyPaidCells.has(paidCellKey(ang.ID_Anggota, bulan, month.year)), stampStyle);
  const amount = status === 'Sebagian' ? `<small class="nominal-val">${escapeHtml(formatRp(month.paid))}</small>` : '';
  return `<span class="dues-month-status" data-status="${status}">${status}${amount}</span>`;
};

const monthTitle = (ang, bulan, month) => {
  const label = `${ang.Nama_Anggota}, ${bulan} ${month.year}: ${getDuesDisplayStatus(month)}`;
  if (!month.owed) return label;
  return `${label} · Setoran ${formatRp(month.paid)} · Sisa ${formatRp(month.remaining)}`;
};

const duesPagination = createPagination('dues-pagination', 'anggota', () => renderTableRekap());
export const initDuesPagination = duesPagination.init;

let statusFilter = 'all';

export const filterDuesStatus = (filter) => {
  if (!['all', 'unpaid', 'paid'].includes(filter)) return;
  statusFilter = filter;
  renderTableRekap();
};

const pinButton = (person, pinned) => {
  const selected = person.ID_Anggota === pinned;
  return `<button type="button" class="dues-pin-btn" data-action="toggle-member-pin" data-id="${escapeHtml(person.ID_Anggota)}"
    aria-pressed="${selected}" aria-label="${selected ? 'Lepas sematan' : 'Sematkan'} ${escapeHtml(person.Nama_Anggota)}">
    <i class="${selected ? 'ph-fill' : 'ph'} ph-push-pin" aria-hidden="true"></i></button>`;
};

/* ── Matrix dues table (rekap) ─────────────────────────────────── */

const hasActiveRekapFilter = () => {
  const desktop = document.getElementById('search-member-rekap')?.value || '';
  const mobile = document.getElementById('search-member-rekap-mobile')?.value || '';
  return statusFilter !== 'all' || Boolean((desktop || mobile).trim());
};

const emptyRekapHtml = () => (hasActiveRekapFilter()
  ? 'Tidak ada anggota ditemukan. <button type="button" class="btn btn-secondary btn-reset-rekap-filter">Reset Filter</button>'
  : 'Tidak ada anggota ditemukan.');

const bindFilterReset = (el) => {
  if (!el || el.dataset?.resetBound || typeof el.addEventListener !== 'function') return;
  if (el.dataset) el.dataset.resetBound = '1';
  el.addEventListener('click', (ev) => {
    if (!ev.target?.closest?.('.btn-reset-rekap-filter')) return;
    for (const id of ['search-member-rekap', 'search-member-rekap-mobile']) {
      const input = document.getElementById(id);
      if (input) input.value = '';
    }
    statusFilter = 'all';
    renderTableRekap();
  });
};

const initMatrixColumnHover = (table) => {
  if (!table || table.dataset?.colHoverBound || typeof table.addEventListener !== 'function') return;
  table.dataset.colHoverBound = '1';
  let activeCol = null;
  const setHoverCol = (colIdx) => {
    if (activeCol === colIdx) return;
    if (activeCol !== null) {
      table.querySelectorAll('.is-col-hover').forEach((el) => el.classList.remove('is-col-hover'));
    }
    activeCol = colIdx;
    if (colIdx !== null) {
      table.querySelectorAll(`[data-col-month="${colIdx}"]`).forEach((el) => el.classList.add('is-col-hover'));
    }
  };
  table.addEventListener('pointerover', (ev) => {
    const cell = ev.target?.closest?.('[data-col-month]');
    setHoverCol(cell ? cell.getAttribute('data-col-month') : null);
  });
  table.addEventListener('pointerleave', () => setHoverCol(null));
  table.addEventListener('keydown', (ev) => {
    const btn = ev.target?.closest?.('.matrix-dues-button');
    if (!btn || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(ev.key)) return;
    const row = btn.closest('tr');
    if (!row) return;
    ev.preventDefault();
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      const rowBtns = Array.from(row.querySelectorAll('.matrix-dues-button:not(:disabled)'));
      const pos = rowBtns.indexOf(btn);
      if (pos >= 0) rowBtns[pos + (ev.key === 'ArrowRight' ? 1 : -1)]?.focus();
      return;
    }
    const col = btn.closest('td')?.getAttribute('data-col-month');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const rowIdx = rows.indexOf(row);
    const delta = ev.key === 'ArrowDown' ? 1 : -1;
    for (let i = rowIdx + delta; i >= 0 && i < rows.length; i += delta) {
      const target = (col && rows[i].querySelector(`td[data-col-month="${col}"] .matrix-dues-button:not(:disabled)`)) ||
        rows[i].querySelector('.matrix-dues-button:not(:disabled)');
      if (target) { target.focus(); break; }
    }
  });
};

export const renderTableRekap = () => {
  for (const group of document.querySelectorAll('.hybrid-year-glider:not([hidden])')) {
    group.querySelectorAll('button').forEach((button, index) => {
      const active = button.dataset.year === currentRekapYear;
      button.setAttribute('aria-pressed', String(active));
      if (active) group.style.setProperty('--year-index', index);
    });
  }
  const tbody = document.getElementById('ui-table-rekap');
  if (!tbody) return;
  const state = getState();
  const fragment = document.createDocumentFragment();

  const ledger = createDuesLedger(state, { year: currentRekapYear });

  const skippedSet = new Set(state.skippedMonths || []);
  const stamp = getActiveIndicatorStyle();
  const pinned = getPinnedMemberId();
  const admin = getIsAdminView();
  const currentPeriod = billingPeriod();
  let settled = false;

  const searchInput = document.getElementById('search-member-rekap');
  const searchInputMobile = document.getElementById('search-member-rekap-mobile');
  const searchVal = (
    (searchInput && searchInput.value) ||
    (searchInputMobile && searchInputMobile.value) ||
    ''
  ).trim().toLowerCase();
  const searchable = ledger.members.filter(({ ang }) =>
    !searchVal || ang.Nama_Anggota.toLowerCase().includes(searchVal));
  const counts = {
    all: searchable.length,
    unpaid: searchable.filter((member) => member.arrears > 0).length,
    paid: searchable.filter((member) => member.months.length && member.arrears === 0).length
  };
  const labels = { all: 'Semua', unpaid: 'Nunggak', paid: 'Lunas' };
  for (const button of document.querySelectorAll('[data-status-filter]')) {
    const key = button.dataset.statusFilter;
    button.textContent = `${labels[key]} (${counts[key]})`;
    button.setAttribute('aria-pressed', String(key === statusFilter));
  }
  const filteredAnggota = searchable
    .filter((member) => statusFilter === 'all' || (statusFilter === 'unpaid'
      ? member.arrears > 0 : member.months.length && member.arrears === 0))
    .map(({ ang }) => ang)
    .sort((a, b) => a.Nama_Anggota.localeCompare(b.Nama_Anggota));

  const pageMembers = duesPagination.paginate(filteredAnggota,
    JSON.stringify([getActiveGroupId(), currentRekapYear, statusFilter, searchVal]));

  bindFilterReset(tbody);
  if (pageMembers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" class="td-muted-center">${emptyRekapHtml()}</td></tr>`;
  } else {
    pageMembers.forEach((ang) => {
      const tr = document.createElement('tr');
      const yearMonths = NAMA_BULAN.map((_, i) => ledger.getMonth(ang, i, currentRekapYear));
      const dueMonths = yearMonths.filter((m) => m.due);
      const paidCount = dueMonths.filter((m) => m.status === 'paid').length;
      const subText = dueMonths.length ? `${paidCount}/${dueMonths.length} lunas` : 'Belum jatuh tempo';

      const tdNama = document.createElement('th');
      tdNama.scope = 'row';
      tdNama.className = ang.ID_Anggota === pinned ? 'dues-name is-pinned' : 'dues-name';
      tdNama.innerHTML = `<div class="dues-person"><button type="button" class="clickable-name" data-action="profil" data-id="${escapeHtml(ang.ID_Anggota)}"><span class="dues-member-row"><span class="dues-member-name">${escapeHtml(ang.Nama_Anggota)}</span>${ang.ID_Anggota === pinned ? '<span class="self-pin-badge">Saya</span>' : ''}</span><span class="dues-member-sub">${escapeHtml(subText)}</span></button>${admin ? '' : pinButton(ang, pinned)}</div>`;
      tr.appendChild(tdNama);

      NAMA_BULAN.forEach((bulan, idx) => {
        const tdBulan = document.createElement('td');
        const month = yearMonths[idx];
        const payable = month.remaining > 0;
        tdBulan.className = month.owed ? 'text-center' : 'text-center td-skipped';
        if (tdBulan.dataset) tdBulan.dataset.colMonth = String(idx);
        tdBulan.title = monthTitle(ang, bulan, month);
        settled ||= month.status === 'paid' && newlyPaidCells.has(paidCellKey(ang.ID_Anggota, bulan, month.year));
        const content = renderMonthStatus(ang, bulan, month, stamp);
        if (month.status === 'paid') {
          tdBulan.innerHTML = `<button type="button" class="matrix-dues-button" data-action="open-month-receipt"
            data-id="${escapeHtml(ang.ID_Anggota)}" data-month="${idx}" data-year="${currentRekapYear}"
            aria-label="${escapeHtml(tdBulan.title)}">${content}</button>`;
        } else if (payable && !admin) {
          tdBulan.innerHTML = `<button type="button" class="matrix-dues-button" data-action="open-self-pay"
            data-id="${escapeHtml(ang.ID_Anggota)}" data-month="${idx}" data-year="${currentRekapYear}"
            aria-label="${escapeHtml(tdBulan.title)}">${content}</button>`;
        } else if (payable) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'matrix-dues-button';
          Object.assign(button.dataset, {
            action: 'quickpay', anggota: ang.ID_Anggota, bulan,
            bulkMonth: idx, bulkYear: currentRekapYear, bulkRemaining: month.remaining
          });
          button.setAttribute('aria-label', tdBulan.title);
          button.innerHTML = content;
          tdBulan.appendChild(button);
        } else {
          tdBulan.innerHTML = content;
        }
        tr.appendChild(tdBulan);
      });
      fragment.appendChild(tr);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }
  // Highlight skipped-month and current-month headers
  const matrixTable = tbody.closest('table');
  const headerRow = matrixTable?.querySelector('thead tr');
  if (headerRow) {
    const headerCells = headerRow.querySelectorAll('th');
    NAMA_BULAN.forEach((bulan, idx) => {
      const th = headerCells[idx + 1];
      if (!th) return;
      const monthKey = `${(idx + 1).toString().padStart(2, '0')}-${currentRekapYear}`;
      th.classList.toggle('th-skipped', skippedSet.has(monthKey));
      th.classList.toggle('is-current-month', Number(currentRekapYear) === currentPeriod.year && idx === currentPeriod.monthIndex);
    });
  }
  initMatrixColumnHover(matrixTable);

  // Render mobile card view
  renderIuranMobileCards(pageMembers, ledger, stamp, pinned, admin);
  newlyPaidCells.clear();
  if (settled) document.dispatchEvent(new Event('finkas:dues-settled'));
  syncBulkDues();
};

/* ── Mobile iuran cards ────────────────────────────────────────── */

export const renderIuranMobileCards = (
  members, ledger = createDuesLedger(getState()), stamp = getActiveIndicatorStyle(),
  pinned = getPinnedMemberId(), admin = getIsAdminView()
) => {
  const container = document.getElementById('iuran-cards-mobile');
  if (!container) return;
  bindFilterReset(container);
  if (!members?.length) {
    container.innerHTML = `<div class="iuran-cards-empty">${emptyRekapHtml()}</div>`;
    return;
  }

  const expandedCards = new Set(Array.from(
    container.querySelectorAll?.('.iuran-member-card.expanded .iuran-card-details') ?? [],
    (details) => details.id
  ));
  container.innerHTML = members.map((ang) => {
    const id = escapeHtml(ang.ID_Anggota);
    const name = escapeHtml(ang.Nama_Anggota);
    const yearMonths = NAMA_BULAN.map((_, i) => ledger.getMonth(ang, i, currentRekapYear));
    const dueMonths = yearMonths.filter((month) => month.due);
    const paid = dueMonths.filter((month) => month.status === 'paid').length;
    const count = dueMonths.length;
    const summary = count ? `${paid}/${count} lunas` : 'Belum jatuh tempo';
    const strip = yearMonths.map((month) =>
      `<span data-status="${getDuesDisplayStatus(month)}"></span>`).join('');

    const grid = yearMonths.map((month, index) => {
      const bulan = NAMA_BULAN[index];
      const shortMon = bulan.slice(0, 3);
      const status = getDuesDisplayStatus(month);
      const title = escapeHtml(monthTitle(ang, bulan, month));
      const payable = month.remaining > 0;
      const isPaid = month.status === 'paid';
      const tag = payable || isPaid ? 'button' : 'div';
      const action = isPaid
        ? `type="button" data-action="open-month-receipt" data-id="${id}" data-month="${index}" data-year="${currentRekapYear}" aria-label="${title}"`
        : !payable ? '' : admin
        ? `type="button" data-action="quickpay-card" data-anggota="${id}" data-bulan="${bulan}"
          data-bulk-month="${index}" data-bulk-year="${currentRekapYear}" data-bulk-remaining="${month.remaining}" aria-label="${title}"`
        : `type="button" data-action="open-self-pay" data-id="${id}" data-month="${index}" data-year="${currentRekapYear}" aria-label="${title}"`;
      let pillContent = `<span class="iuran-month-name">${shortMon}</span>`;
      if (status === 'Lunas') {
        pillContent = `${renderMiniStamp(stamp)}<span class="iuran-month-name">${shortMon}</span>`;
      } else if (status === 'Sebagian') {
        pillContent = `<i class="ph ph-hourglass-medium" aria-hidden="true"></i><span class="iuran-month-name">${shortMon}</span><span class="sr-only">Sebagian ${escapeHtml(formatRp(month.paid))}</span>`;
      } else if (status === 'Nanti') {
        pillContent = `<i class="ph ph-calendar" aria-hidden="true"></i><span class="iuran-month-name">${shortMon}</span>`;
      } else if (status === 'Libur') {
        pillContent = `<i class="ph ph-calendar-x" aria-hidden="true"></i><span class="iuran-month-name">${shortMon}</span>`;
      }
      return `<${tag} class="iuran-month-item" data-status="${status}" ${action}>${pillContent}</${tag}>`;
    }).join('');
    const firstDue = dueMonths.find((month) => month.remaining > 0);
    const bayar = admin && firstDue
      ? `<button type="button" class="iuran-btn-pay" data-action="quickpay-card" data-anggota="${id}" data-bulan="${NAMA_BULAN[firstDue.monthIndex]}"><i class="ph-bold ph-check-circle" aria-hidden="true"></i> Bayar</button>`
      : '';
    const detailsId = `dues-details-${encodeURIComponent(ang.ID_Anggota)}`;
    const expanded = expandedCards.has(detailsId);
    const arrears = count - paid;
    return `
      <article class="iuran-member-card${ang.ID_Anggota === pinned ? ' is-pinned' : ''}${expanded ? ' expanded' : ''}">
        <div class="iuran-card-header">
          <div class="iuran-card-main-info">
            <button type="button" class="iuran-card-name" data-action="profil" data-id="${id}">${name}${ang.ID_Anggota === pinned ? '<span class="self-pin-badge">Saya</span>' : ''}</button>
            <div class="iuran-progress-subtext">${summary}</div>
          </div>
          <span class="matrix-mobile-chip ${arrears ? 'amber' : 'paid'}">${arrears ? `${arrears} Nunggak` : `${paid}/${count} Lunas`}</span>
          ${admin ? '' : pinButton(ang, pinned)}
          <button type="button" class="iuran-card-toggle" data-action="toggle-card"
            aria-label="Status bulanan ${name}" aria-controls="${detailsId}" aria-expanded="${expanded}">
            <i class="ph-bold ph-caret-down" aria-hidden="true"></i>
          </button>
        </div>
        <div class="dues-mini-strip" aria-hidden="true">${strip}</div>
        <div class="iuran-card-details" id="${detailsId}"${expanded ? '' : ' inert'}>
          <div class="iuran-month-grid">${grid}</div>
          <div class="iuran-action-buttons">
            ${bayar}
            <button type="button" class="iuran-btn-detail" data-action="profil" data-id="${id}">Buku Iuran</button>
          </div>
        </div>
      </article>`;
  }).join('');
};

/* ── Toggle mobile card accordion ──────────────────────────────── */

const setCardExpanded = (card, expanded) => {
  card.classList.toggle('expanded', expanded);
  card.querySelector('[data-action="toggle-card"]').setAttribute('aria-expanded', String(expanded));
  card.querySelector('.iuran-card-details').inert = !expanded;
};

export const toggleIuranCard = (card) => {
  if (!card) return;
  const expanded = card.classList.contains('expanded');
  if (!card.closest('.bulk-selecting')) {
    document.querySelectorAll('.iuran-member-card.expanded').forEach((other) => {
      if (other !== card) setCardExpanded(other, false);
    });
  }
  setCardExpanded(card, !expanded);
};

/* ── Skipped months modal rendering ────────────────────────────── */

export const renderSkippedMonthsList = () => {
  const container = document.getElementById('skipped-months-list');
  const countBadge = document.getElementById('master-count-skipped');
  const { skippedMonths } = getState();
  if (countBadge) countBadge.textContent = String((skippedMonths || []).length);
  if (!container) return;
  container.innerHTML = '';

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
    card.innerHTML = `<span class="skip-month-label"><i class="ph ph-calendar-x" aria-hidden="true"></i><strong>${escapeHtml(label)}</strong></span><div class="flex-align-gap"><button type="button" class="btn btn-outline btn-master-action btn-danger-outline admin-only" data-action="remove-skip" data-month="${escapeHtml(mm)}">Hapus</button></div>`;
    container.appendChild(card);
  });
};
