import { NAMA_BULAN } from "../config.js";
import { getState, currentHistoryFilter, itemsToShow, setItemsToShow, incrementItemsToShow, getAdminPassword } from "../state.js";
import { formatRp, escapeHtml } from "../utils.js";

/* ── Transaction history table ─────────────────────────────────── */

export const renderTableTransaksi = () => {
  const tbody = document.getElementById('table-riwayat-data') || document.getElementById('ui-table-trx');
  if (!tbody) return;
  const state = getState();

  const searchInput = document.getElementById('search-trx');
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
  const filterBulan = document.getElementById('filter-bulan')?.value || 'all';
  const filterTahun = document.getElementById('filter-tahun')?.value || 'all';
  const loadMoreBtn = document.getElementById('btn-load-more') || document.getElementById('load-more-container');

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

  // Update quick summary statistics for filtered dataset
  const rwCountEl = document.getElementById('rw-count');
  const rwMasukEl = document.getElementById('rw-masuk');
  const rwKeluarEl = document.getElementById('rw-keluar');
  if (rwCountEl && rwMasukEl && rwKeluarEl) {
    let totalMasuk = 0;
    let totalKeluar = 0;
    filteredTrx.forEach((t) => {
      const nom = Number(t.Nominal) || 0;
      if (t.Tipe_Arus === 'Masuk') totalMasuk += nom;
      else if (t.Tipe_Arus === 'Keluar') totalKeluar += nom;
    });
    rwCountEl.innerText = `${filteredTrx.length} transaksi`;
    rwMasukEl.innerText = `+${formatRp(totalMasuk)}`;
    rwKeluarEl.innerText = `-${formatRp(totalKeluar)}`;
  }

  if (filteredTrx.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="td-muted-center">Tidak ada transaksi ditemukan.</td></tr>';
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
      headerRow.innerHTML = `<td colspan="5" class="td-date-group-header">${dateHeader}</td>`;
      fragment.appendChild(headerRow);
      lastDateStr = dateStr;
    }

    const isMasuk = trx.Tipe_Arus === 'Masuk';
    const nominalColor = isMasuk ? 'var(--primary)' : 'var(--danger)';
    const badgeClass = isMasuk ? 'badge-masuk' : 'badge-keluar';
    const iconPh = isMasuk ? 'ph-arrow-down-left' : 'ph-arrow-up-right';

    let ketExtra = trx.Keterangan || '';
    if (trx.ID_Anggota && trx.ID_Anggota !== '-') {
      const angObj = state.anggota.find((a) => a.ID_Anggota === trx.ID_Anggota);
      const namaAnggota = angObj ? angObj.Nama_Anggota : trx.ID_Anggota;
      ketExtra = `<strong class="clickable-name" data-action="profil" data-id="${escapeHtml(trx.ID_Anggota)}">${escapeHtml(namaAnggota)}</strong> (Iuran ${escapeHtml(trx.Bulan_Iuran)} ${escapeHtml(trx.Tahun_Iuran)}) <br> <span class="trx-subnote">${escapeHtml(ketExtra)}</span>`;
    } else {
      const objKat = state.kategori.find((k) => k.ID_Kategori === trx.ID_Kategori);
      const namaKat = objKat ? objKat.Nama_Kategori : 'Operasional';
      ketExtra = `<strong class="trx-category-title">${escapeHtml(namaKat)}</strong> <br> <span class="trx-subnote">${escapeHtml(ketExtra)}</span>`;
    }

    const tglTime = `${tglObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • ${tglObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

    const isAdmin = !!getAdminPassword();
    const aksiHtml = isAdmin ? `
          <button class="btn-icon admin-only text-muted" data-action="cetak" data-id="${trx.ID_Transaksi}" title="Cetak Struk"><i class="ph-bold ph-printer fs-16"></i></button>
          <button class="btn-icon admin-only text-warning" data-action="edit" data-id="${trx.ID_Transaksi}" title="Edit Data"><i class="ph-bold ph-pencil-simple fs-16"></i></button>
          <button class="btn-icon admin-only text-danger" data-action="hapus" data-id="${trx.ID_Transaksi}" title="Hapus Data"><i class="ph-bold ph-trash fs-16"></i></button>
        ` : '';
    const aksiTd = isAdmin
      ? `<td data-label="Aksi" class="td-center-nowrap">${aksiHtml}</td>`
      : '<td data-label="Aksi"></td>';

    const tr = document.createElement('tr');
    tr.className = isMasuk ? 'row-masuk' : 'row-keluar';
    tr.setAttribute('data-tipe', isMasuk ? 'Masuk' : 'Keluar');
    tr.setAttribute('data-nominal', trx.Nominal);
    tr.setAttribute('data-is-iuran', trx.ID_Anggota !== '-' ? 'true' : 'false');

    tr.innerHTML = `
        <td data-label="Waktu" class="td-time-col">
          ${tglTime}
        </td>
        <td data-label="Keterangan">${ketExtra}</td>
        <td data-label="Nominal" class="td-nominal-col ${isMasuk ? 'text-primary' : 'text-danger'}">${formatRp(trx.Nominal)}</td>
        <td data-label="Tipe Arus" class="va-middle"><span class="badge ${badgeClass}"><i class="ph-bold ${iconPh}"></i> ${trx.Tipe_Arus}</span></td>
        ${aksiTd}
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

