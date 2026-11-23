/**
 * @module ui/transaction-form
 * 3-step guided wizard state, form interactions, counters, and dues checkbox
 * rendering for `#modal-transaksi`.
 */

import { NAMA_BULAN } from 'finkas/core/config';
import { getState } from 'finkas/core/state';
import { getInput, getSelect, showToast, getRawNominal, formatRp, getInitials } from 'finkas/core/utils';
import { createDuesLedger, duesStatusLabel } from 'finkas/core/dues';

import type { IuranChecklistItem } from '../stores/transaction-form.svelte';
import { syncIuranChecklist, syncIuranChecklistFilter, syncIuranReviewChips } from '../mount';

const htmlElements = (root: HTMLElement, selector: string) =>
  root.querySelectorAll?.<HTMLElement>(selector);

const MAX_REVIEW_CHIPS = 8;

const STEP_LABELS = {
  iuran: ['Detail', 'Anggota', 'Tinjau'],
  operasional: ['Jenis', 'Detail', 'Tinjau']
};

const BULAN_EN_MAP: Record<string, string> = {
  Januari: 'January', Februari: 'February', Maret: 'March', April: 'April',
  Mei: 'May', Juni: 'June', Juli: 'July', Agustus: 'August',
  September: 'September', Oktober: 'October', November: 'November', Desember: 'December'
};

let wizardTab = 'iuran';
let wizardStep = 1;

const isEnLang = () => typeof document !== 'undefined' && document.body?.dataset?.lang === 'en';

const getSelectedLabel = (id: string, fallback = '-') => {
  const sel = getSelect(id);
  if (!sel || !sel.value || sel.value === '-') return fallback;
  const opt = sel.options?.[sel.selectedIndex];
  const label = (opt?.textContent || sel.value || '').trim();
  return label || fallback;
};

const formatDisplayMonth = (bulan: string) => (isEnLang() ? (BULAN_EN_MAP[bulan] || bulan) : bulan);

const formatReviewDate = (dateStr: string) => {
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

const setText = (id: string, text: string) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

/* ── Category filter ───────────────────────────────────────────── */

/**
 * Populate a category <select> based on selected type.
 */
export const filterKategori = (idTipe: string, idKat: string) => {
  const tipe = getSelect(idTipe)?.value;
  const elKategori = document.getElementById(idKat);
  if (!elKategori) return;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Pilih Kategori --';
  const options = getState().kategori.filter(kat => kat.Tipe === tipe).map(kat => {
    const option = document.createElement('option');
    option.value = kat.ID_Kategori;
    option.textContent = kat.Nama_Kategori;
    return option;
  });
  elKategori.replaceChildren(placeholder, ...options);
};

/* ── Live Review & Context Sync ────────────────────────────────── */

const syncIuranReview = () => {
  const nominal = getRawNominal('iuran-nominal');
  const katLabel = getSelectedLabel('iuran-kategori', '-');
  const rawBulan = getSelect('iuran-bulan')?.value || '';
  const bulan = formatDisplayMonth(rawBulan);
  const tahun = getInput('iuran-tahun')?.value || '';
  const tanggal = getInput('iuran-tanggal')?.value || '';

  const checked = Array.from((document.querySelectorAll('.chk-iuran:not(:disabled):checked') as NodeListOf<HTMLInputElement>));
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
      return { key: chk.value, initials: getInitials(name), name };
    });
    syncIuranReviewChips({ visible, extraCount: checked.length - visible.length, moreLabel: isEnLang() ? 'more' : 'lainnya' });
  }
};

const syncOpsReview = () => {
  const tipe = getSelect('ops-tipe')?.value || 'Keluar';
  const isMasuk = tipe === 'Masuk';
  const isEn = isEnLang();
  const flowText = isMasuk
    ? (isEn ? 'Inflow (+)' : 'Pemasukan (+)')
    : (isEn ? 'Outflow (−)' : 'Pengeluaran (−)');
  const katLabel = getSelectedLabel('ops-kategori', '-');
  const tanggal = getInput('ops-tanggal')?.value || '';
  const anggotaLabel = getSelectedLabel('ops-anggota', isEn ? 'Not member-specific' : 'Bukan transaksi anggota');
  const ket = (getInput('ops-keterangan')?.value || '').trim() || '-';

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

const markControlInvalid = (el: HTMLElement | null | undefined) => {
  if (el && typeof Event !== 'undefined') el.dispatchEvent?.(new Event('invalid'));
};

const validateIuranStep = (step: number) => {
  if (step === 1) {
    const katEl = getSelect('iuran-kategori');
    const kat = katEl?.value;
    if (!kat || kat === '-') {
      markControlInvalid(katEl);
      showToast('Pilih kategori iuran terlebih dahulu.', 'error');
      return false;
    }
    const nominal = getRawNominal('iuran-nominal');
    if (Number.isNaN(nominal) || nominal <= 0) {
      showToast('Nominal iuran harus lebih dari 0.', 'error');
      document.getElementById('iuran-nominal')?.focus?.();
      return false;
    }
    const blnEl = getSelect('iuran-bulan');
    const bln = blnEl?.value;
    const thn = Number(getInput('iuran-tahun')?.value);
    if (!bln || !Number.isFinite(thn) || thn < 2000 || thn > 2100) {
      if (!bln) markControlInvalid(blnEl);
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

const validateOpsStep = (step: number) => {
  if (step === 1) {
    const katEl = getSelect('ops-kategori');
    const kat = katEl?.value;
    if (!kat || kat === '-') {
      markControlInvalid(katEl);
      showToast('Pilih kategori transaksi terlebih dahulu.', 'error');
      return false;
    }
    return true;
  }
  if (step === 2) {
    const nominal = getRawNominal('ops-nominal');
    if (Number.isNaN(nominal) || nominal <= 0) {
      showToast('Nominal transaksi harus lebih dari 0.', 'error');
      getInput('ops-nominal')?.focus?.();
      return false;
    }
    const ket = (getInput('ops-keterangan')?.value || '').trim();
    if (!ket) {
      showToast('Isi keterangan atau keperluan transaksi.', 'error');
      getInput('ops-keterangan')?.focus?.();
      return false;
    }
    return true;
  }
  return true;
};

const validateCurrentStep = (step: number) =>
  (wizardTab === 'operasional' ? validateOpsStep(step) : validateIuranStep(step));

/**
 * Set the active step (1..3) for the active transaction wizard tab.
 */
export const setTrxWizardStep = (step: number, { focus = true }: { focus?: boolean } = {}) => {
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

  htmlElements(modal, '[data-step-item]')?.forEach((item) => {
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

  htmlElements(modal, '[data-step-sep]')?.forEach((sep) => {
    sep.classList.toggle('is-done', Number(sep.dataset.stepSep) < nextStep);
  });

  const tabsBar = document.getElementById('trx-tabs-bar');
  if (tabsBar) tabsBar.hidden = nextStep !== 1;

  const formId = wizardTab === 'operasional' ? 'form-operasional' : 'form-iuran';
  const form = document.getElementById(formId);
  if (form) {
    htmlElements(form, '.trx-step-panel')?.forEach((panel) => {
      panel.hidden = Number(panel.dataset.step) !== nextStep;
    });
    htmlElements(form, '[data-trx-show-steps]')?.forEach((el) => {
      const steps = String(el.dataset.trxShowSteps || '').split(/\s+/);
      el.hidden = !steps.includes(String(nextStep));
    });
  }

  updateCounterIuran();
  updateCounterOps();

  if (focus && form) {
    const activePanel = form.querySelector?.(`.trx-step-panel[data-step="${nextStep}"]`);
    const target = activePanel?.querySelector?.<HTMLElement>('h3[tabindex="-1"]');
    if (target?.focus) target.focus({ preventScroll: true });
  }
};

/**
 * Reset the `#modal-transaksi` wizard to a specific tab and starting step.
 */
export const resetTrxWizard = (tab: 'iuran'|'operasional' = 'iuran', step: number = 1) => {
  wizardTab = tab === 'operasional' ? 'operasional' : 'iuran';
  setTrxWizardStep(step, { focus: false });
};

/* ── Counter updates ───────────────────────────────────────────── */

/** Sync visible semantic flow radio cards with the hidden #ops-tipe select. */
export const syncOpsFlowPills = () => {
  const val = getSelect('ops-tipe')?.value || 'Keluar';
  const radios = document.querySelectorAll?.<HTMLInputElement>('input[name="ops-tipe-radio"]');
  radios?.forEach((radio) => {
    radio.checked = radio.value === val;
  });
};

/** Bind wizard navigation, operational flow cards, presets, and keyboard rules inside #modal-transaksi. */
export const initTransactionModalControls = () => {
  const modal = (document.getElementById('modal-transaksi') as HTMLDialogElement | null);
  if (!modal || modal.dataset?.trxBound) return;
  if (modal.dataset) modal.dataset.trxBound = '1';

  modal.addEventListener('change', (e) => {
    if (!(e.target instanceof Element)) return;
    const radio = e.target.closest<HTMLInputElement>('input[name="ops-tipe-radio"]');
    if (radio) {
      const select = getSelect('ops-tipe');
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
    if (!(e.target instanceof Element)) return;
    if (e.target.id === 'ops-keterangan' || e.target.id === 'iuran-tahun') {
      syncIuranReview();
      syncOpsReview();
    }
  });

  modal.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const tabBtn = e.target.closest<HTMLElement>('#btn-tab-iuran, #btn-tab-operasional');
    if (tabBtn) {
      resetTrxWizard(tabBtn.dataset.tab === 'operasional' ? 'operasional' : 'iuran', 1);
      return;
    }

    const nextBtn = e.target.closest('[data-trx-next]');
    if (nextBtn) {
      if (validateCurrentStep(wizardStep)) setTrxWizardStep(wizardStep + 1);
      return;
    }

    const prevBtn = e.target.closest('[data-trx-prev]');
    if (prevBtn) {
      if (wizardStep > 1) setTrxWizardStep(wizardStep - 1);
      return;
    }

    const stepBtn = e.target.closest<HTMLElement>('[data-trx-step]');
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

    const preset = e.target.closest<HTMLElement>('[data-ops-preset]');
    if (!preset) return;
    const input = getInput('ops-nominal');
    if (!input) return;
    const amount = Number(preset.dataset.opsPreset) || 0;
    input.value = new Intl.NumberFormat('id-ID').format(amount);
    updateCounterOps();
    input.focus?.();
  });

  modal.addEventListener('keydown', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.key !== 'Enter' || e.isComposing || wizardStep >= 3) return;
    if (e.target.closest('button, .cdrop-list, .dpick-pop, [role="listbox"]')) return;
    if (e.target.id === 'search-anggota-iuran') {
      e.preventDefault();
      return;
    }
    if (!e.target.closest('form')) return;
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
  const tipe = getSelect('ops-tipe')?.value || 'Keluar';
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

  const btnPilihSemua = (document.getElementById('btn-pilih-semua') as HTMLButtonElement | null);
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
  const checkboxes = (document.querySelectorAll('.chk-iuran:not(:disabled)') as NodeListOf<HTMLInputElement>);
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
  const bln = getSelect('iuran-bulan')?.value || '';
  const thn = Number(getInput('iuran-tahun')?.value || new Date().getFullYear());
  const monthIndex = NAMA_BULAN.indexOf(bln);
  const state = getState();
  const ledger = createDuesLedger(state, { year: Number.isFinite(thn) ? thn : undefined });

  const container = document.getElementById('iuran-checkbox-anggota') || document.getElementById('container-checkbox-anggota');
  if (container) {
    const items = (state.anggota || []).filter(ang => ang.Status_Aktif === 'Aktif').map(ang => {
      const month = monthIndex >= 0 ? ledger.getMonth(ang, monthIndex, thn) : { status: ('unpaid' as const), owed: true };
      let variant: IuranChecklistItem['variant'] = 'unpaid';
      let statusLabel = 'BELUM BAYAR';
      if (month.status === 'paid') {
        variant = 'lunas';
        statusLabel = 'LUNAS';
      } else if (!month.owed) {
        variant = 'not-owed';
        statusLabel = duesStatusLabel(month);
      } else if (month.status === 'partial') {
        variant = 'partial';
        statusLabel = `SEBAGIAN (Sisa ${formatRp(month.remaining)})`;
      }
      return {
        id: ang.ID_Anggota, name: ang.Nama_Anggota, initials: getInitials(ang.Nama_Anggota),
        variant, statusLabel, disabled: variant === 'lunas' || variant === 'not-owed', defaultChecked: variant === 'lunas'
      };
    });
    syncIuranChecklist({ items, query: getInput('search-anggota-iuran')?.value || '', target: container });
  }
  updateCounterIuran();
};

/* ── Search member filter in iuran checkbox grid ───────────────── */

/**
 * Filter the iuran checkbox list by search input.
 */
export const filterAnggotaIuran = () => {
  const input = getInput('search-anggota-iuran')?.value || '';
  const container = document.getElementById('iuran-checkbox-anggota') || document.getElementById('container-checkbox-anggota');
  syncIuranChecklistFilter(input, container);
};

/* ── Edit Delta Preview ─────────────────────────────────────────── */

/**
 * Compute and render the before/after balance delta in the edit modal.
 * Pure arithmetic — no side effects beyond DOM writes.
 */
export const updateEditDelta = (origTipe: string, origNom: number, newTipe: string, newNom: number) => {
  const elTipe   = document.getElementById('edit-delta-tipe');
  const elBefore = document.getElementById('edit-delta-before');
  const elAfter  = document.getElementById('edit-delta-after');
  const elDiff   = document.getElementById('edit-delta-diff');
  if (!elTipe || !elBefore || !elAfter || !elDiff) return;

  // Signed contribution to balance: Masuk = +nom, Keluar = -nom
  const sign = (tipe: string) => tipe === 'Masuk' ? 1 : -1;
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
