/**
 * @module modal
 * Modal open/close, tab switching, and form interactions.
 */

import { NAMA_BULAN } from './config.js';
import { getState } from './state.js';
import { showToast, handleNominalInput, getRawNominal, formatRp, escapeHtml } from './utils.js';

/* ── Modal open / close ────────────────────────────────────────── */

/**
 * Open a modal by its element ID.
 * @param {string} id
 */
export const openModal = (id) => {
  closeMobileMenu();
  const el = document.getElementById(id);
  if (!el) {
    console.error('openModal: Element not found with id:', id);
    return;
  }
  if (id === 'modal-riwayat') {
    // Reset items-to-show when opening history
    window.__resetItemsToShow && window.__resetItemsToShow();
    window.__renderTableTransaksi && window.__renderTableTransaksi();
  }
  el.classList.add('active');
  document.body.classList.add('modal-open');
};

/**
 * Close a modal by its element ID.
 * @param {string} id
 */
export const closeModal = (id) => {
  document.getElementById(id).classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) {
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.bottom-nav-item').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-action') === 'nav-home');
    });
  }
};

/* ── Tab switching ─────────────────────────────────────────────── */

/**
 * Switch tabs inside a modal.
 * @param {string} tabName - 'iuran' or 'operasional'
 * @param {string} modalId
 */
export const switchTab = (tabName, modalId) => {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.querySelectorAll('.tab-btn').forEach((btn) => {
    const isTarget = btn.getAttribute('data-tab') === tabName || btn.id === `btn-tab-${tabName}`;
    btn.classList.toggle('active', isTarget);
  });
  modal.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === tabName || content.id === `tab-${tabName}`);
  });
};

/* ── Nominal chip quick-picks ─────────────────────────────────── */

/**
 * Select a quick-pick nominal chip.
 * @param {number} nilai
 * @param {HTMLElement} btnElement
 * @param {Function} updateCounterFn
 */
export const pilihNominalCepat = (nilai, btnElement, updateCounterFn) => {
  const el = document.getElementById('iuran-nominal');
  el.value = new Intl.NumberFormat('id-ID').format(nilai);
  document.querySelectorAll('#chip-group-iuran .chip-btn').forEach((btn) => btn.classList.remove('active'));
  btnElement.classList.add('active');
  updateCounterFn();
};

/**
 * Reset all active chips in the iuran nominal group.
 */
export const resetChipAktif = () => {
  document.querySelectorAll('#chip-group-iuran .chip-btn').forEach((btn) => btn.classList.remove('active'));
};

/* ── Category filter ───────────────────────────────────────────── */

/**
 * Populate a category <select> based on selected type.
 * @param {string} idTipe - ID of the type <select>.
 * @param {string} idKat - ID of the category <select>.
 */
export const filterKategori = (idTipe, idKat) => {
  const tipe = document.getElementById(idTipe).value;
  const elKategori = document.getElementById(idKat);
  const options = ['<option value="">-- Pilih Kategori --</option>'];
  getState().kategori.forEach((kat) => {
    if (kat.Tipe === tipe) {
      options.push(`<option value="${escapeHtml(kat.ID_Kategori)}">${escapeHtml(kat.Nama_Kategori)}</option>`);
    }
  });
  elKategori.innerHTML = options.join('');
};

/* ── Counter updates ───────────────────────────────────────────── */

/**
 * Update the operational transaction summary counter.
 */
export const updateCounterOps = () => {
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

/**
 * Update the iuran (contribution) summary counter.
 */
export const updateCounterIuran = () => {
  const nominal = getRawNominal('iuran-nominal');
  const totalElements = document.querySelectorAll('.chk-iuran:not(:disabled)');
  const totalChecked = document.querySelectorAll('.chk-iuran:not(:disabled):checked').length;

  document.getElementById('count-terpilih').innerText = `${totalChecked} dari ${totalElements.length}`;
  document.getElementById('summary-count').innerText = `${totalChecked} Orang`;
  document.getElementById('summary-nominal').innerText = formatRp(nominal);
  document.getElementById('summary-total').innerText = formatRp(totalChecked * nominal);

  const btnPilihSemua = document.getElementById('btn-pilih-semua');
  if (totalElements.length === 0) {
    btnPilihSemua.innerText = 'Lunas Semua!';
    btnPilihSemua.disabled = true;
  } else if (totalChecked === totalElements.length) {
    btnPilihSemua.innerText = 'Kosongkan';
    btnPilihSemua.disabled = false;
  } else {
    btnPilihSemua.innerText = 'Pilih Semua';
    btnPilihSemua.disabled = false;
  }
};

/**
 * Toggle select-all / deselect-all for iuran checkboxes.
 */
export const pilihSemuaIuran = () => {
  const checkboxes = document.querySelectorAll('.chk-iuran:not(:disabled)');
  if (checkboxes.length === 0) return showToast('Semua anggota sudah lunas bulan ini!', 'success');

  const isAllChecked = Array.from(checkboxes).every((chk) => chk.checked);
  checkboxes.forEach((chk) => (chk.checked = !isAllChecked));
  updateCounterIuran();
};

/* ── Smart Iuran checkbox rendering ────────────────────────────── */

/**
 * Render the checkbox list of members for iuran, marking paid members.
 */
export const renderCheckboxIuran = () => {
  const bln = document.getElementById('iuran-bulan').value;
  const thn = document.getElementById('iuran-tahun').value;

  const mapLunas = {};
  getState().transaksi.forEach((t) => {
    if (t.Bulan_Iuran === bln && String(t.Tahun_Iuran) === String(thn) && t.Tipe_Arus === 'Masuk' && t.ID_Anggota !== '-') {
      mapLunas[t.ID_Anggota] = true;
    }
  });

  const htmlParts = [];
  getState().anggota.forEach((ang) => {
    if (ang.Status_Aktif === 'Aktif') {
      const isLunas = mapLunas[ang.ID_Anggota];
      if (isLunas) {
        htmlParts.push(`
          <label class="checkbox-item item-disabled-lunas">
            <input type="checkbox" class="chk-iuran" value="${escapeHtml(ang.ID_Anggota)}" disabled checked>
            <div class="chk-info-col">
              <span class="chk-name-lunas">${escapeHtml(ang.Nama_Anggota)}</span>
              <div class="chk-badge-lunas"><i class="ph-fill ph-check-circle"></i> LUNAS</div>
            </div>
          </label>`);
      } else {
        htmlParts.push(`
          <label class="checkbox-item">
            <input type="checkbox" class="chk-iuran" value="${escapeHtml(ang.ID_Anggota)}" onchange="window.__updateCounterIuran && window.__updateCounterIuran()">
            <div class="chk-info-col">
              <span class="chk-name-pending">${escapeHtml(ang.Nama_Anggota)}</span>
              <div class="chk-badge-pending">BELUM BAYAR</div>
            </div>
          </label>`);
      }
    }
  });
  const container = document.getElementById('iuran-checkbox-anggota');
  container.innerHTML = htmlParts.join('');

  updateCounterIuran();
  window.__filterAnggotaIuran && window.__filterAnggotaIuran();
};

/* ── Search member filter in iuran checkbox grid ───────────────── */

/**
 * Filter the iuran checkbox list by search input.
 */
export const filterAnggotaIuran = () => {
  const input = document.getElementById('search-anggota-iuran').value.toLowerCase();
  const items = document.querySelectorAll('#iuran-checkbox-anggota .checkbox-item');
  items.forEach((item) => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(input) ? 'flex' : 'none';
  });
};

/* ── Mobile menu ───────────────────────────────────────────────── */

/**
 * Toggle the mobile dropdown menu.
 * Also auto-opens the header dropdown so items are visible without a second click.
 */
export const toggleMobileMenu = () => {
  const headerActions = document.getElementById('header-actions');
  if (!headerActions) return;
  const isOpening = !headerActions.classList.contains('mobile-menu-open');
  headerActions.classList.toggle('mobile-menu-open');

  const dropdown = document.getElementById('header-dropdown');
  if (dropdown) {
    if (isOpening) {
      dropdown.classList.add('open');
    } else {
      dropdown.classList.remove('open');
    }
  }
};

/**
 * Close the mobile menu.
 */
export const closeMobileMenu = () => {
  const headerActions = document.getElementById('header-actions');
  if (headerActions) headerActions.classList.remove('mobile-menu-open');
};

/* ── Header dropdown ───────────────────────────────────────────── */

/**
 * Toggle the header dropdown menu.
 */
export const toggleHeaderDropdown = () => {
  const el = document.getElementById('header-dropdown');
  if (!el) return;
  const isOpen = el.classList.toggle('open');
  const btn = document.getElementById('btn-header-menu');
  if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
};

/**
 * Close the header dropdown menu.
 */
export const closeHeaderDropdown = () => {
  const dd = document.getElementById('header-dropdown');
  if (!dd) return;
  dd.classList.remove('open');
  const btn = document.getElementById('btn-header-menu');
  if (btn) btn.setAttribute('aria-expanded', 'false');
};

/* ── Utility ───────────────────────────────────────────────────── */
