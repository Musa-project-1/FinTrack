/**
 * @module ui/transaction-form
 * 3-step guided wizard state, form interactions, counters, and dues checkbox
 * rendering for `#modal-transaksi`.
 */

import { NAMA_BULAN } from '../core/config.js';
import { getState } from '../core/state.js';
import { showToast, getRawNominal, formatRp, escapeHtml, getInitials } from '../core/utils.js';
import { createDuesLedger, duesStatusLabel } from '../core/dues.js';

const MAX_REVIEW_CHIPS = 8;

const STEP_LABELS = {
  iuran: ['Detail', 'Anggota', 'Tinjau'],
  operasional: ['Jenis', 'Detail', 'Tinjau']
};

const BULAN_EN_MAP = {
  Januari: 'January', Februari: 'February', Maret: 'March', April: 'April',
  Mei: 'May', Juni: 'June', Juli: 'July', Agustus: 'August',
  September: 'September', Oktober: 'October', November: 'November', Desember: 'December'
};

let wizardTab = 'iuran';
let wizardStep = 1;

const isEnLang = () => typeof document !== 'undefined' && document.body?.dataset?.lang === 'en';

const getSelectedLabel = (id, fallback = '-') => {
  const sel = document.getElementById(id);
  if (!sel || !sel.value || sel.value === '-') return fallback;
  const opt = sel.options?.[sel.selectedIndex];
  const label = (opt?.textContent || sel.value || '').trim();
  return label || fallback;
};

const formatDisplayMonth = (bulan) => (isEnLang() ? (BULAN_EN_MAP[bulan] || bulan) : bulan);

const formatReviewDate = (dateStr) => {
  if (!dateStr) return isEnLang() ? 'Not set' : 'Belum diatur';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!match) return dateStr;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat(isEnLang() ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
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

/* ── Live Review & Context Sync ────────────────────────────────── */

const syncIuranReview = () => {
  const nominal = getRawNominal('iuran-nominal');
  const katLabel = getSelectedLabel('iuran-kategori', '-');
  const rawBulan = document.getElementById('iuran-bulan')?.value || '';
  const bulan = formatDisplayMonth(rawBulan);
  const tahun = document.getElementById('iuran-tahun')?.value || '';
  const tanggal = document.getElementById('iuran-tanggal')?.value || '';

  const checked = Array.from(document.querySelectorAll('.chk-iuran:not(:disabled):checked'));
  const totalChecked = checked.length;

  setText(
    'iuran-step2-sub',
    `${katLabel} · ${bulan} ${tahun} · ${formatRp(nominal)}/${isEnLang() ? 'member' : 'orang'}`
  );
  setText('rev-iuran-kategori', katLabel);
  setText('rev-iuran-periode', `${bulan} ${tahun}`.trim() || '-');
  setText('rev-iuran-tanggal', formatReviewDate(tanggal));
  setText('rev-iuran-member-count', String(totalChecked));
  setText(
    'rev-iuran-formula',
    `${totalChecked} ${isEnLang() ? (totalChecked === 1 ? 'member' : 'members') : 'anggota'} × ${formatRp(nominal)}`
  );

  const chipsWrap = document.getElementById('rev-iuran-chips');
  if (chipsWrap) {
    const visible = checked.slice(0, MAX_REVIEW_CHIPS).map((chk) => {
      const name = chk.dataset?.memberName || chk.closest?.('.checkbox-item')?.querySelector?.('.chk-name-pending, .chk-name-lunas')?.textContent?.trim() || chk.value;
      return `<span class="trx-rev-chip"><span class="trx-rev-chip-av" aria-hidden="true">${escapeHtml(getInitials(name))}</span><span>${escapeHtml(name)}</span></span>`;
    });
    if (checked.length > MAX_REVIEW_CHIPS) {
      const extra = checked.length - MAX_REVIEW_CHIPS;
      visible.push(`<span class="trx-rev-chip trx-rev-chip-more">+${extra} ${isEnLang() ? 'more' : 'lainnya'}</span>`);
    }
    chipsWrap.innerHTML = visible.join('');
  }
};

const syncOpsReview = () => {
  const tipe = document.getElementById('ops-tipe')?.value || 'Keluar';
  const isMasuk = tipe === 'Masuk';
  const isEn = isEnLang();
  const flowText = isMasuk
    ? (isEn ? 'Inflow (+)' : 'Pemasukan (+)')
    : (isEn ? 'Outflow (−)' : 'Pengeluaran (−)');
  const katLabel = getSelectedLabel('ops-kategori', '-');
  const tanggal = document.getElementById('ops-tanggal')?.value || '';
  const anggotaLabel = getSelectedLabel('ops-anggota', isEn ? 'Not member-specific' : 'Bukan transaksi anggota');
  const ket = (document.getElementById('ops-keterangan')?.value || '').trim() || '-';

  setText('ops-step2-sub', katLabel !== '-' ? `${flowText} · ${katLabel}` : flowText);
  setText('rev-ops-kategori', katLabel);
  setText('rev-ops-tanggal', formatReviewDate(tanggal));
  setText('rev-ops-anggota', anggotaLabel);
  setText('rev-ops-keterangan', ket);

  const callout = document.getElementById('ops-rev-callout');
  if (callout?.classList) {
    callout.classList.toggle('is-inflow', isMasuk);
    callout.classList.toggle('is-outflow', !isMasuk);
  }
};

/* ── Wizard Step Validation & Transitions ──────────────────────── */

const validateIuranStep = (step) => {
  if (step === 1) {
    const kat = document.getElementById('iuran-kategori')?.value;
    if (!kat || kat === '-') {
      showToast('Pilih kategori iuran terlebih dahulu.', 'error');
      return false;
    }
    const nominal = getRawNominal('iuran-nominal');
    if (Number.isNaN(nominal) || nominal <= 0) {
      showToast('Nominal iuran harus lebih dari 0.', 'error');
      document.getElementById('iuran-nominal')?.focus?.();
      return false;
    }
    const bln = document.getElementById('iuran-bulan')?.value;
    const thn = Number(document.getElementById('iuran-tahun')?.value);
    if (!bln || !Number.isFinite(thn) || thn < 2000 || thn > 2100) {
      showToast('Bulan dan tahun iuran wajib dipilih.', 'error');
      return false;
    }
    return true;
  }
  if (step === 2) {
    const checkedCount = document.querySelectorAll('.chk-iuran:not(:disabled):checked').length;
    if (checkedCount === 0) {
      showToast('Pilih minimal 1 anggota!', 'error');
      return false;
    }
    return true;
  }
  return true;
};

const validateOpsStep = (step) => {
  if (step === 1) {
    const kat = document.getElementById('ops-kategori')?.value;
    if (!kat || kat === '-') {
      showToast('Pilih kategori transaksi terlebih dahulu.', 'error');
      return false;
    }
    return true;
  }
  if (step === 2) {
    const nominal = getRawNominal('ops-nominal');
    if (Number.isNaN(nominal) || nominal <= 0) {
      showToast('Nominal transaksi harus lebih dari 0.', 'error');
      document.getElementById('ops-nominal')?.focus?.();
      return false;
    }
    const ket = (document.getElementById('ops-keterangan')?.value || '').trim();
    if (!ket) {
      showToast('Isi keterangan atau keperluan transaksi.', 'error');
      document.getElementById('ops-keterangan')?.focus?.();
      return false;
    }
    return true;
  }
  return true;
};

const validateCurrentStep = (step) =>
  (wizardTab === 'operasional' ? validateOpsStep(step) : validateIuranStep(step));

/**
 * Set the active step (1..3) for the active transaction wizard tab.
 * @param {number} step
 * @param {{ focus?: boolean }} [options]
 */
export const setTrxWizardStep = (step, { focus = true } = {}) => {
  const modal = document.getElementById('modal-transaksi');
  if (!modal) return;
  const nextStep = Math.max(1, Math.min(3, Number(step) || 1));
  wizardStep = nextStep;

  const isEn = isEnLang();
  const labels = wizardTab === 'operasional'
    ? (isEn ? ['Type', 'Details', 'Review'] : STEP_LABELS.operasional)
    : (isEn ? ['Details', 'Members', 'Review'] : STEP_LABELS.iuran);

  labels.forEach((label, idx) => {
    const labelEl = document.getElementById(`trx-step-label-${idx + 1}`);
    if (labelEl) labelEl.textContent = label;
  });

  modal.querySelectorAll?.('[data-step-item]').forEach((item) => {
    const n = Number(item.dataset.stepItem);
    const btn = item.querySelector?.('.trx-step-btn');
    item.classList.toggle('is-done', n < nextStep);
    item.classList.toggle('is-active', n === nextStep);
    item.classList.toggle('is-upcoming', n > nextStep);
    if (btn) {
      if (n === nextStep) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    }
  });

  modal.querySelectorAll?.('[data-step-sep]').forEach((sep) => {
    sep.classList.toggle('is-done', Number(sep.dataset.stepSep) < nextStep);
  });

  const tabsBar = document.getElementById('trx-tabs-bar');
  if (tabsBar) tabsBar.hidden = nextStep !== 1;

  const formId = wizardTab === 'operasional' ? 'form-operasional' : 'form-iuran';
  const form = document.getElementById(formId);
  if (form) {
    form.querySelectorAll?.('.trx-step-panel').forEach((panel) => {
      panel.hidden = Number(panel.dataset.step) !== nextStep;
    });
    form.querySelectorAll?.('[data-trx-show-steps]').forEach((el) => {
      const steps = String(el.dataset.trxShowSteps || '').split(/\s+/);
      el.hidden = !steps.includes(String(nextStep));
    });
  }

  updateCounterIuran();
  updateCounterOps();

  if (focus && form) {
    const activePanel = form.querySelector?.(`.trx-step-panel[data-step="${nextStep}"]`);
    const target = activePanel?.querySelector?.('h3[tabindex="-1"]');
    if (target?.focus) target.focus({ preventScroll: true });
  }
};

/**
 * Reset the `#modal-transaksi` wizard to a specific tab and starting step.
 * @param {'iuran'|'operasional'} [tab='iuran']
 * @param {number} [step=1]
 */
export const resetTrxWizard = (tab = 'iuran', step = 1) => {
  wizardTab = tab === 'operasional' ? 'operasional' : 'iuran';
  setTrxWizardStep(step, { focus: false });
};

/* ── Counter updates ───────────────────────────────────────────── */

/** Sync visible semantic flow radio cards with the hidden #ops-tipe select. */
export const syncOpsFlowPills = () => {
  const val = document.getElementById('ops-tipe')?.value || 'Keluar';
  document.querySelectorAll?.('input[name="ops-tipe-radio"]').forEach((radio) => {
    radio.checked = radio.value === val;
  });
};

/** Bind wizard navigation, operational flow cards, presets, and keyboard rules inside #modal-transaksi. */
export const initTransactionModalControls = () => {
  const modal = document.getElementById('modal-transaksi');
  if (!modal || modal.dataset?.trxBound) return;
  if (modal.dataset) modal.dataset.trxBound = '1';

  modal.addEventListener('change', (e) => {
    const radio = e.target?.closest?.('input[name="ops-tipe-radio"]');
    if (radio) {
      const select = document.getElementById('ops-tipe');
      if (select && select.value !== radio.value) {
        select.value = radio.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        updateCounterOps();
      }
      return;
    }
    syncIuranReview();
    syncOpsReview();
  });

  modal.addEventListener('input', (e) => {
    if (e.target?.id === 'ops-keterangan' || e.target?.id === 'iuran-tahun') {
      syncIuranReview();
      syncOpsReview();
    }
  });

  modal.addEventListener('click', (e) => {
    const tabBtn = e.target?.closest?.('#btn-tab-iuran, #btn-tab-operasional');
    if (tabBtn) {
      resetTrxWizard(tabBtn.dataset.tab === 'operasional' ? 'operasional' : 'iuran', 1);
      return;
    }

    const nextBtn = e.target?.closest?.('[data-trx-next]');
    if (nextBtn) {
      if (validateCurrentStep(wizardStep)) setTrxWizardStep(wizardStep + 1);
      return;
    }

    const prevBtn = e.target?.closest?.('[data-trx-prev]');
    if (prevBtn) {
      if (wizardStep > 1) setTrxWizardStep(wizardStep - 1);
      return;
    }

    const stepBtn = e.target?.closest?.('[data-trx-step]');
    if (stepBtn) {
      const targetStep = Number(stepBtn.dataset.trxStep) || 1;
      if (targetStep === wizardStep) return;
      if (targetStep < wizardStep) {
        setTrxWizardStep(targetStep);
        return;
      }
      for (let s = wizardStep; s < targetStep; s++) {
        if (!validateCurrentStep(s)) return;
      }
      setTrxWizardStep(targetStep);
      return;
    }

    const preset = e.target?.closest?.('[data-ops-preset]');
    if (!preset) return;
    const input = document.getElementById('ops-nominal');
    if (!input) return;
    const amount = Number(preset.dataset.opsPreset) || 0;
    input.value = new Intl.NumberFormat('id-ID').format(amount);
    updateCounterOps();
    input.focus?.();
  });

  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing || wizardStep >= 3) return;
    if (e.target?.closest?.('button, .cdrop-list, .dpick-pop, [role="listbox"]')) return;
    if (e.target?.id === 'search-anggota-iuran') {
      e.preventDefault();
      return;
    }
    if (!e.target?.closest?.('form')) return;
    e.preventDefault();
    if (validateCurrentStep(wizardStep)) setTrxWizardStep(wizardStep + 1);
  });

  document.addEventListener('finkas:language-changed', () => {
    if (modal.open || modal.classList?.contains?.('active')) {
      setTrxWizardStep(wizardStep, { focus: false });
    }
  });
};

/**
 * Update the operational transaction summary counter.
 */
export const updateCounterOps = () => {
  const nominal = getRawNominal('ops-nominal');
  const tipe = document.getElementById('ops-tipe')?.value || 'Keluar';
  const isMasuk = tipe === 'Masuk';
  const isEn = isEnLang();

  const summaryTipe = document.getElementById('summary-ops-tipe');
  const summaryLabel = document.getElementById('summary-ops-label');
  const summaryNom = document.getElementById('summary-ops-nominal');
  const summaryTotal = document.getElementById('summary-ops-total');
  const step2Summary = document.getElementById('ops-step2-summary');

  const flowLabel = isMasuk ? (isEn ? 'Inflow (+)' : 'Pemasukan (+)') : (isEn ? 'Outflow (−)' : 'Pengeluaran (−)');
  const formatted = formatRp(nominal);

  if (summaryNom) summaryNom.innerText = formatted;
  if (summaryTotal) {
    summaryTotal.innerText = nominal > 0 ? `${isMasuk ? '+ ' : '− '}${formatted}` : formatted;
    if (summaryTotal.style) summaryTotal.style.color = isMasuk ? 'var(--income-strong)' : 'var(--danger)';
  }
  if (summaryTipe) summaryTipe.innerText = flowLabel;
  if (summaryLabel) {
    summaryLabel.innerText = isMasuk
      ? (isEn ? 'Adds to cash balance' : 'Menambah saldo kas')
      : (isEn ? 'Reduces cash balance' : 'Mengurangi saldo kas');
  }
  if (step2Summary) step2Summary.textContent = `${flowLabel} · ${formatted}`;
  syncOpsFlowPills();
  syncOpsReview();
};

/**
 * Update the iuran (contribution) summary counter.
 */
export const updateCounterIuran = () => {
  const nominal = getRawNominal('iuran-nominal');
  const totalElements = document.querySelectorAll('.chk-iuran:not(:disabled)');
  const totalChecked = document.querySelectorAll('.chk-iuran:not(:disabled):checked').length;
  const totalAmount = formatRp(totalChecked * nominal);
  const isEn = isEnLang();

  const elTerpilih = document.getElementById('count-terpilih');
  const elCount = document.getElementById('summary-count');
  const elNom = document.getElementById('summary-nominal');
  const elTotal = document.getElementById('summary-total');
  const elStep2Total = document.getElementById('iuran-step2-total');

  if (elTerpilih) elTerpilih.innerText = `${totalChecked} dari ${totalElements.length}`;
  if (elCount) elCount.innerText = `${totalChecked} ${isEn ? 'selected' : 'dipilih'}`;
  if (elNom) elNom.innerText = formatRp(nominal);
  if (elTotal) elTotal.innerText = totalAmount;
  if (elStep2Total) elStep2Total.textContent = totalAmount;

  const btnPilihSemua = document.getElementById('btn-pilih-semua');
  if (btnPilihSemua) {
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
  }
  syncIuranReview();
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
      const safeId = escapeHtml(ang.ID_Anggota);
      const safeName = escapeHtml(ang.Nama_Anggota);
      const initials = escapeHtml(getInitials(ang.Nama_Anggota));

      if (isLunas) {
        htmlParts.push(`
          <label class="checkbox-item item-disabled-lunas" for="chk-iuran-${safeId}">
            <span class="chk-avatar" aria-hidden="true">${initials}</span>
            <div class="chk-info-col">
              <span class="chk-name-lunas">${safeName}</span>
              <div class="chk-badge-lunas"><i class="ph-fill ph-check-circle" aria-hidden="true"></i> LUNAS</div>
            </div>
            <input type="checkbox" id="chk-iuran-${safeId}" name="iuran-anggota" class="chk-iuran" value="${safeId}" data-member-name="${safeName}" disabled checked>
          </label>`);
      } else if (notOwed) {
        htmlParts.push(`
          <label class="checkbox-item item-disabled-lunas" for="chk-iuran-${safeId}">
            <span class="chk-avatar" aria-hidden="true">${initials}</span>
            <div class="chk-info-col">
              <span class="chk-name-lunas">${safeName}</span>
              <div class="chk-badge-pending">${escapeHtml(duesStatusLabel(month))}</div>
            </div>
            <input type="checkbox" id="chk-iuran-${safeId}" name="iuran-anggota" class="chk-iuran" value="${safeId}" data-member-name="${safeName}" disabled>
          </label>`);
      } else if (month.status === 'partial') {
        htmlParts.push(`
          <label class="checkbox-item item-partial" for="chk-iuran-${safeId}">
            <span class="chk-avatar" aria-hidden="true">${initials}</span>
            <div class="chk-info-col">
              <span class="chk-name-pending">${safeName}</span>
              <div class="chk-badge-pending">SEBAGIAN (Sisa ${escapeHtml(formatRp(month.remaining))})</div>
            </div>
            <input type="checkbox" id="chk-iuran-${safeId}" name="iuran-anggota" class="chk-iuran" value="${safeId}" data-member-name="${safeName}">
          </label>`);
      } else {
        htmlParts.push(`
          <label class="checkbox-item" for="chk-iuran-${safeId}">
            <span class="chk-avatar" aria-hidden="true">${initials}</span>
            <div class="chk-info-col">
              <span class="chk-name-pending">${safeName}</span>
              <div class="chk-badge-pending">BELUM BAYAR</div>
            </div>
            <input type="checkbox" id="chk-iuran-${safeId}" name="iuran-anggota" class="chk-iuran" value="${safeId}" data-member-name="${safeName}">
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
    const nameEl = item.querySelector?.('.chk-name-pending, .chk-name-lunas');
    const text = (nameEl?.textContent || item.innerText || '').toLowerCase();
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
