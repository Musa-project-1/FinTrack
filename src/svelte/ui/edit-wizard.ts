/**
 * @module ui/edit-wizard
 * 3-step guided correction flow ("Alur Bayar") for `#modal-edit-transaksi`.
 */

import { getInput, getSelect, showToast, getRawNominal, formatRp } from 'finkas/core/utils';
import { updateEditDelta } from './transaction-form';

const STEP_LABELS_ID = ['Nominal', 'Rincian', 'Tinjau'];
const STEP_LABELS_EN = ['Amount', 'Details', 'Review'];

let editStep = 1;
let origTipe = 'Masuk';
let origNominal = 0;
let activeId = '';

const isEnLang = () => typeof document !== 'undefined' && document.body?.dataset?.lang === 'en';

const setText = (id: string, text: string) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

const getSelectedLabel = (id: string, fallback = '-') => {
  const sel = getSelect(id);
  if (!sel || !sel.value || sel.value === '-') return fallback;
  const opt = sel.options?.[sel.selectedIndex];
  return (opt?.textContent || sel.value || '').trim() || fallback;
};

const formatReviewDate = (dateStr: string) => {
  if (!dateStr) return '';
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

const syncEditFlowPills = () => {
  const val = getSelect('edit-tipe')?.value || 'Masuk';
  document.querySelectorAll?.<HTMLInputElement>('input[name="edit-tipe-radio"]').forEach((radio) => {
    radio.checked = radio.value === val;
  });
};

const syncEditWizardReview = () => {
  const newTipe = getSelect('edit-tipe')?.value || origTipe;
  const newNom = getRawNominal('edit-nominal');
  updateEditDelta(origTipe, origNominal, newTipe, newNom);

  const isEn = isEnLang();
  const isMasuk = newTipe === 'Masuk';
  const flowText = isMasuk
    ? (isEn ? 'Inflow (+)' : 'Pemasukan (+)')
    : (isEn ? 'Outflow (−)' : 'Pengeluaran (−)');
  const katLabel = getSelectedLabel('edit-kategori', '-');

  const sign = (tipe: string) => (tipe === 'Masuk' ? 1 : -1);
  const diff = sign(newTipe) * newNom - sign(origTipe) * origNominal;
  const diffFooter = diff === 0
    ? (isEn ? 'Rp 0 (Unchanged)' : 'Rp 0 (Tetap)')
    : `${diff > 0 ? '+ ' : '− '}${formatRp(Math.abs(diff))}`;

  setText('edit-step2-sub', `${flowText} · ${katLabel} · ${formatRp(newNom)}`);
  setText('edit-footer-delta', diffFooter);

  setText('rev-edit-id', activeId || getInput('edit-id')?.value || '-');
  setText('rev-edit-kategori', katLabel);
  setText('rev-edit-anggota', getSelectedLabel('edit-anggota', isEn ? 'Not member-specific' : 'Bukan transaksi anggota'));

  const bulan = getSelect('edit-bulan')?.value || '';
  const tahun = getInput('edit-tahun')?.value || '';
  const tgl = formatReviewDate(getInput('edit-tanggal')?.value || '');
  const parts: string[] = [];
  if (bulan && bulan !== '-') parts.push(`${bulan} ${tahun !== '-' ? tahun : ''}`.trim());
  if (tgl) parts.push(tgl);
  setText('rev-edit-periode', parts.join(' · ') || (isEn ? 'Not set' : 'Belum diatur'));
  setText('rev-edit-keterangan', (getInput('edit-keterangan')?.value || '').trim() || '-');

  document
    .getElementById('modal-edit-transaksi')
    ?.querySelectorAll?.<HTMLElement>('[data-edit-preset]')
    ?.forEach((btn) => {
      btn.classList?.toggle('is-active', Number(btn.dataset?.editPreset) === newNom);
    });

  const footerPill = document.getElementById('edit-footer-pill');
  if (footerPill?.classList) {
    footerPill.classList.toggle('is-inflow', diff > 0);
    footerPill.classList.toggle('is-outflow', diff < 0);
  }

  const callout = document.getElementById('edit-rev-callout');
  if (callout?.classList) {
    callout.classList.toggle('is-inflow', diff > 0);
    callout.classList.toggle('is-outflow', diff < 0);
  }
  const calloutTitle =
    diff === 0
      ? (isEn ? 'Unchanged · No balance impact' : 'Nominal tetap · Tidak mengubah saldo')
      : diff > 0
        ? (isEn ? 'Increases cash balance' : 'Menambah saldo kas')
        : (isEn ? 'Reduces cash balance' : 'Mengurangi saldo kas');
  setText('edit-callout-title', calloutTitle);
  setText('edit-callout-sub', isEn ? 'Logged in audit trail' : 'Tercatat di log audit');
  setText('edit-callout-diff', diff === 0 ? 'Rp 0' : `${diff > 0 ? '+' : '−'}${formatRp(Math.abs(diff))}`);
};

const validateEditStep1 = () => {
  const katEl = getSelect('edit-kategori');
  const kat = katEl?.value;
  if (!kat || kat === '-') {
    if (katEl && typeof Event !== 'undefined') katEl.dispatchEvent?.(new Event('invalid'));
    showToast('Pilih kategori transaksi.', 'error');
    return false;
  }
  const nominal = getRawNominal('edit-nominal');
  if (Number.isNaN(nominal) || nominal <= 0) {
    showToast('Nominal transaksi harus lebih dari 0.', 'error');
    getInput('edit-nominal')?.focus?.();
    return false;
  }
  return true;
};

/** Set active step (1..3) for `#modal-edit-transaksi`. */
export const setEditWizardStep = (step: number, { focus = true }: { focus?: boolean } = {}) => {
  const modal = document.getElementById('modal-edit-transaksi');
  if (!modal) return;
  const prev = editStep;
  const next = Math.max(1, Math.min(3, Number(step) || 1));
  editStep = next;
  if (modal.dataset) {
    modal.dataset.stepDir = focus
      ? (next > prev ? 'forward' : next < prev ? 'backward' : 'none')
      : 'none';
  }

  const labels = isEnLang() ? STEP_LABELS_EN : STEP_LABELS_ID;
  labels.forEach((label, idx) => setText(`edit-step-label-${idx + 1}`, label));

  modal.querySelectorAll?.<HTMLElement>('[data-edit-step-item]')?.forEach((item) => {
    const n = Number(item.dataset.editStepItem);
    const btn = item.querySelector?.('.trx-step-btn');
    item.classList.toggle('is-done', n < next);
    item.classList.toggle('is-active', n === next);
    item.classList.toggle('is-upcoming', n > next);
    if (btn) {
      if (n === next) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    }
  });

  modal.querySelectorAll?.<HTMLElement>('[data-edit-step-sep]')?.forEach((sep) => {
    sep.classList.toggle('is-done', Number(sep.dataset.editStepSep) < next);
  });

  const form = document.getElementById('form-edit-transaksi');
  if (form) {
    form.querySelectorAll?.<HTMLElement>('.trx-step-panel')?.forEach((panel) => {
      panel.hidden = Number(panel.dataset.step) !== next;
    });
    form.querySelectorAll?.<HTMLElement>('[data-edit-show-steps]')?.forEach((el) => {
      const steps = String(el.dataset.editShowSteps || '').split(/\s+/);
      el.hidden = !steps.includes(String(next));
    });
  }

  syncEditWizardReview();

  if (focus && form) {
    const activePanel = form.querySelector?.(`.trx-step-panel[data-step="${next}"]`);
    const heading = activePanel?.querySelector?.<HTMLElement>('h3[tabindex="-1"]');
    if (heading?.focus) heading.focus({ preventScroll: true });
  }
};

/** Reset `#modal-edit-transaksi` wizard to Step 1 with transaction origin metadata. */
export const openEditWizard = (trx: { ID_Transaksi: string; Tipe_Arus: string; Nominal: number }) => {
  activeId = trx.ID_Transaksi || '';
  origTipe = trx.Tipe_Arus || 'Masuk';
  origNominal = Number(trx.Nominal) || 0;
  const isMasuk = origTipe === 'Masuk';
  setText('edit-origin-id', activeId || '-');
  setText('edit-origin-summary', `${isMasuk ? 'Pemasukan (+)' : 'Pengeluaran (−)'} · ${formatRp(origNominal)}`);
  syncEditFlowPills();
  setEditWizardStep(1, { focus: false });
};

/** Bind delegated flow cards, preset chips, step nav, and Enter key progression on `#modal-edit-transaksi`. */
export const initEditModalControls = () => {
  const modal = document.getElementById('modal-edit-transaksi') as HTMLDialogElement | null;
  if (!modal || modal.dataset?.editBound) return;
  if (modal.dataset) modal.dataset.editBound = '1';

  modal.addEventListener('change', (e) => {
    if (!(e.target instanceof Element)) return;
    const radio = e.target.closest<HTMLInputElement>('input[name="edit-tipe-radio"]');
    if (radio) {
      const select = getSelect('edit-tipe');
      if (select && select.value !== radio.value) {
        select.value = radio.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    syncEditWizardReview();
  });

  modal.addEventListener('input', () => {
    syncEditWizardReview();
  });

  modal.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('[data-edit-next]')) {
      if (editStep === 1 && !validateEditStep1()) return;
      setEditWizardStep(editStep + 1);
      return;
    }
    if (e.target.closest('[data-edit-prev]')) {
      if (editStep > 1) setEditWizardStep(editStep - 1);
      return;
    }
    const stepBtn = e.target.closest<HTMLElement>('[data-edit-step]');
    if (stepBtn) {
      const targetStep = Number(stepBtn.dataset.editStep) || 1;
      if (targetStep === editStep) return;
      if (targetStep > 1 && editStep === 1 && !validateEditStep1()) return;
      setEditWizardStep(targetStep);
      return;
    }
    const preset = e.target.closest<HTMLElement>('[data-edit-preset]');
    if (!preset) return;
    const input = getInput('edit-nominal');
    if (!input) return;
    input.value = new Intl.NumberFormat('id-ID').format(Number(preset.dataset.editPreset) || 0);
    syncEditWizardReview();
    input.focus?.();
  });

  modal.addEventListener('keydown', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.key !== 'Enter' || e.isComposing || editStep >= 3) return;
    if (e.target.closest('button, .cdrop-list, .dpick-pop, [role="listbox"], [type="file"]')) return;
    if (!e.target.closest('form')) return;
    e.preventDefault();
    if (editStep === 1 && !validateEditStep1()) return;
    setEditWizardStep(editStep + 1);
  });

  document.addEventListener('finkas:language-changed', () => {
    if (modal.open || modal.classList?.contains?.('active')) {
      setEditWizardStep(editStep, { focus: false });
    }
  });
};
