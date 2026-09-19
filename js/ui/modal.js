/**
 * @module modal
 * Modal open/close, tab switching, and form interactions.
 */

import { NAMA_BULAN } from '../core/config.js';
import { getState } from '../core/state.js';
import { showToast, handleNominalInput, getRawNominal, formatRp, escapeHtml } from '../core/utils.js';

/* ── Modal open / close ────────────────────────────────────────── */

const activeElementStack = [];

const trapFocus = (e, modalEl) => {
  if (e.key !== 'Tab') return;
  const focusables = Array.from(modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((el) => !el.disabled && el.offsetParent !== null);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
};

/**
 * Open a modal by its element ID.
 * @param {string} id
 */
export const openModal = (id) => {
  closeMobileMenu();
  if (id !== 'modal-menu') {
    closeModal('modal-menu');
  }
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
  if (document.activeElement) {
    activeElementStack.push(document.activeElement);
  }
  el.classList.add('active');
  document.body.classList.add('modal-open');

  if (el._focusHandler) el.removeEventListener('keydown', el._focusHandler);
  el._focusHandler = (e) => trapFocus(e, el);
  el.addEventListener('keydown', el._focusHandler);

  setTimeout(() => {
    const first = el.querySelector('input:not([disabled]), select:not([disabled]), button:not([disabled])');
    if (first) first.focus();
  }, 50);
};

/**
 * Close a modal by its element ID.
 * @param {string} id
 */
export const closeModal = (id) => {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active');
    if (el._focusHandler) {
      el.removeEventListener('keydown', el._focusHandler);
      delete el._focusHandler;
    }
  }
  if (!document.querySelector('.modal-overlay.active')) {
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.bottom-nav-item').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-action') === 'nav-home');
    });
    const targetEl = activeElementStack.pop();
    activeElementStack.length = 0;
    if (targetEl && typeof targetEl.focus === 'function') {
      targetEl.focus();
    }
  } else {
    const targetEl = activeElementStack.pop();
    if (targetEl && typeof targetEl.focus === 'function') {
      targetEl.focus();
    }
  }
};

/* ── Unified Database Confirmation Dialog ────────────────────────── */
let pendingConfirmAction = null;

/**
 * Buka dialog konfirmasi aksi database.
 * @param {object} options
 */
export const showConfirmDialog = ({
  title = 'Konfirmasi Perubahan',
  message = 'Apakah Anda yakin ingin menyimpan perubahan ini ke database?',
  icon = 'ph-fill ph-database',
  badgeClass = '',
  confirmText = 'Ya, Lanjutkan',
  confirmClass = 'btn-primary',
  onConfirm
}) => {
  const modal = document.getElementById('modal-confirm-action');
  if (!modal) {
    if (confirm(message)) onConfirm?.();
    return;
  }

  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const iconEl = document.getElementById('confirm-icon');
  const badgeEl = document.getElementById('confirm-badge-icon');
  const submitBtn = document.getElementById('btn-confirm-action-submit');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (iconEl) iconEl.className = icon;
  if (badgeEl) badgeEl.className = 'modal-badge-icon ' + (badgeClass || '');

  if (submitBtn) {
    submitBtn.textContent = confirmText;
    submitBtn.className = `btn ${confirmClass}`;
  }

  pendingConfirmAction = onConfirm;
  openModal('modal-confirm-action');
};

export const closeConfirmDialog = () => {
  pendingConfirmAction = null;
  closeModal('modal-confirm-action');
};

export const executeConfirmAction = async () => {
  const action = pendingConfirmAction;
  closeConfirmDialog();
  if (typeof action === 'function') {
    await action();
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
          <label class="checkbox-item item-disabled-lunas" for="chk-iuran-${escapeHtml(ang.ID_Anggota)}">
            <input type="checkbox" id="chk-iuran-${escapeHtml(ang.ID_Anggota)}" name="iuran-anggota" class="chk-iuran" value="${escapeHtml(ang.ID_Anggota)}" disabled checked>
            <div class="chk-info-col">
              <span class="chk-name-lunas">${escapeHtml(ang.Nama_Anggota)}</span>
              <div class="chk-badge-lunas"><i class="ph-fill ph-check-circle"></i> LUNAS</div>
            </div>
          </label>`);
      } else {
        htmlParts.push(`
          <label class="checkbox-item" for="chk-iuran-${escapeHtml(ang.ID_Anggota)}">
            <input type="checkbox" id="chk-iuran-${escapeHtml(ang.ID_Anggota)}" name="iuran-anggota" class="chk-iuran" value="${escapeHtml(ang.ID_Anggota)}">
            <div class="chk-info-col">
              <span class="chk-name-pending">${escapeHtml(ang.Nama_Anggota)}</span>
              <div class="chk-badge-pending">BELUM BAYAR</div>
            </div>
          </label>`);
      }
    }
  });
  const container = document.getElementById('iuran-checkbox-anggota') || document.getElementById('container-checkbox-anggota');
  if (container) {
    container.innerHTML = htmlParts.join('');
  }

  updateCounterIuran();
  window.__filterAnggotaIuran && window.__filterAnggotaIuran();
};

/* ── Search member filter in iuran checkbox grid ───────────────── */

/**
 * Filter the iuran checkbox list by search input.
 */
export const filterAnggotaIuran = () => {
  const input = document.getElementById('search-anggota-iuran')?.value.toLowerCase() || '';
  const items = document.querySelectorAll('.checkbox-grid .checkbox-item');
  items.forEach((item) => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(input) ? 'flex' : 'none';
  });
};

/* ── Mobile menu ───────────────────────────────────────────────── */

/**
 * Close the mobile menu.
 */
export const closeMobileMenu = () => {
  const headerActions = document.getElementById('header-actions');
  if (headerActions) headerActions.classList.remove('mobile-menu-open');
};

/* ── Header dropdown ───────────────────────────────────────────── */

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

/* ── Edit Delta Preview ─────────────────────────────────────────── */

/**
 * Compute and render the before/after balance delta in the edit modal.
 * Pure arithmetic — no side effects beyond DOM writes.
 *
 * @param {string} origTipe  - 'Masuk' | 'Keluar' (original)
 * @param {number} origNom   - original nominal (integer)
 * @param {string} newTipe   - 'Masuk' | 'Keluar' (current form value)
 * @param {number} newNom    - new nominal (integer, from getRawNominal)
 */
export const updateEditDelta = (origTipe, origNom, newTipe, newNom) => {
  const elTipe   = document.getElementById('edit-delta-tipe');
  const elBefore = document.getElementById('edit-delta-before');
  const elAfter  = document.getElementById('edit-delta-after');
  const elDiff   = document.getElementById('edit-delta-diff');
  if (!elTipe || !elBefore || !elAfter || !elDiff) return;

  // Signed contribution to balance: Masuk = +nom, Keluar = -nom
  const sign = (tipe) => tipe === 'Masuk' ? 1 : -1;
  const diff = (sign(newTipe) * newNom) - (sign(origTipe) * origNom);

  const isMasuk = newTipe === 'Masuk';
  elTipe.textContent = isMasuk ? 'PEMASUKAN' : 'PENGELUARAN';
  elTipe.className = `edit-delta-val ${isMasuk ? 'is-masuk' : 'is-keluar'}`;

  elBefore.textContent = formatRp(origNom);
  elBefore.className = `edit-delta-val ${origTipe === 'Masuk' ? 'is-masuk' : 'is-keluar'}`;

  elAfter.textContent = formatRp(newNom);
  elAfter.className = `edit-delta-val ${isMasuk ? 'is-masuk' : 'is-keluar'}`;

  const absDiff = Math.abs(diff);
  elDiff.textContent = `${diff >= 0 ? '+' : '-'}${formatRp(absDiff)}`;
  elDiff.className = `edit-delta-val ${diff >= 0 ? 'is-masuk' : 'is-keluar'}`;
};

/* ── Utility ───────────────────────────────────────────────────── */
