/**
 * @module ui/transaction-form
 * Form interactions, counters, and dues checkbox rendering for cash transactions.
 */

import { NAMA_BULAN } from '../core/config.js';
import { getState } from '../core/state.js';
import { showToast, getRawNominal, formatRp, escapeHtml } from '../core/utils.js';
import { createDuesLedger, duesStatusLabel } from '../core/dues.js';

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
  const bln = document.getElementById('iuran-bulan')?.value || '';
  const thn = Number(document.getElementById('iuran-tahun')?.value || new Date().getFullYear());
  const monthIndex = NAMA_BULAN.indexOf(bln);
  const state = getState();
  const ledger = createDuesLedger(state, { year: Number.isFinite(thn) ? thn : undefined });

  const htmlParts = [];
  (state.anggota || []).forEach((ang) => {
    if (ang.Status_Aktif === 'Aktif') {
      const month = monthIndex >= 0 ? ledger.getMonth(ang, monthIndex, thn) : { status: 'unpaid', paid: 0, remaining: ledger.monthlyFee, owed: true };
      const isLunas = month.status === 'paid';
      const notOwed = !month.owed;

      if (isLunas) {
        htmlParts.push(`
          <label class="checkbox-item item-disabled-lunas" for="chk-iuran-${escapeHtml(ang.ID_Anggota)}">
            <input type="checkbox" id="chk-iuran-${escapeHtml(ang.ID_Anggota)}" name="iuran-anggota" class="chk-iuran" value="${escapeHtml(ang.ID_Anggota)}" disabled checked>
            <div class="chk-info-col">
              <span class="chk-name-lunas">${escapeHtml(ang.Nama_Anggota)}</span>
              <div class="chk-badge-lunas"><i class="ph-fill ph-check-circle"></i> LUNAS</div>
            </div>
          </label>`);
      } else if (notOwed) {
        htmlParts.push(`
          <label class="checkbox-item item-disabled-lunas" for="chk-iuran-${escapeHtml(ang.ID_Anggota)}">
            <input type="checkbox" id="chk-iuran-${escapeHtml(ang.ID_Anggota)}" name="iuran-anggota" class="chk-iuran" value="${escapeHtml(ang.ID_Anggota)}" disabled>
            <div class="chk-info-col">
              <span class="chk-name-lunas">${escapeHtml(ang.Nama_Anggota)}</span>
              <div class="chk-badge-pending">${escapeHtml(duesStatusLabel(month))}</div>
            </div>
          </label>`);
      } else if (month.status === 'partial') {
        htmlParts.push(`
          <label class="checkbox-item item-partial" for="chk-iuran-${escapeHtml(ang.ID_Anggota)}">
            <input type="checkbox" id="chk-iuran-${escapeHtml(ang.ID_Anggota)}" name="iuran-anggota" class="chk-iuran" value="${escapeHtml(ang.ID_Anggota)}">
            <div class="chk-info-col">
              <span class="chk-name-pending">${escapeHtml(ang.Nama_Anggota)}</span>
              <div class="chk-badge-pending">SEBAGIAN (Sisa ${escapeHtml(formatRp(month.remaining))})</div>
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
  filterAnggotaIuran();
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
