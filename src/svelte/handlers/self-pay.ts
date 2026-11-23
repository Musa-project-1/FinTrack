import type { Anggota, DuesLedger, DuesMonth } from '../../types/finkas';
import type { SelfPayInput } from '../stores/self-pay.svelte';
import { syncSelfPayMonths } from '../mount';
import { getDuesDisplayStatus } from '../ui/dues-status';
import { NAMA_BULAN } from '../../core/config.js';
import { billingPeriod, createDuesLedger } from '../../core/dues.js';
import { normalizePaymentAccount } from '../../core/payment-account.js';
import { getActiveGroupId, getGroupName, getIsAdminView, getState } from '../../core/state.js';
import { getSelect, requiredField, closestHtml, formatRp, showToast } from '../../core/utils.js';
import { animateHybridAmount } from '../ui/hybrid-motion';
import { openModal, closeModal } from '../ui/modal';

type Period = Pick<DuesMonth, 'year' | 'monthIndex'>;
let selection: { groupId: string; id: string; period: Period | null } | null = null;
let summary = '';
let selectedPeriods = new Set<string>();
let transferAmount = 0;
let accountNumber = '';
const periodKey = (month: Period) => `${month.year}:${month.monthIndex}`;
const describe = (period: Period) => `${NAMA_BULAN[period.monthIndex]} ${period.year}`;
const periodAfter = (current: Period, offset: number) => {
  const total = current.year * 12 + current.monthIndex + offset;
  return { year: Math.floor(total / 12), monthIndex: total % 12 };
};

export const calculateSelfPay = (ledger: DuesLedger, member: Anggota, current: Period, preset: string, selected = current) => {
  if (preset === 'current' || preset === 'selected') {
    const period = preset === 'current' ? current : selected;
    const month = ledger.getMonth(member, period.monthIndex, period.year);
    return month.remaining > 0 ? [month] : [];
  }

  const periods = ledger.summarize(member).months.filter((month) => month.remaining > 0);
  if (preset === 'advance') {
    let added = 0;
    const limit = 144;
    for (let offset = 1; offset <= limit && added < 2; offset++) {
      const { monthIndex, year } = periodAfter(current, offset);
      const month = ledger.getMonth(member, monthIndex, year);
      if (month.owed && month.remaining > 0) {
        periods.push(month);
        added++;
      }
    }
  }
  return periods;
};

export const selectSelfPayPreset = (preset = 'due') => {
  const state = getState();
  if (!selection || selection.groupId !== getActiveGroupId() || getIsAdminView()) return;
  const member = state.anggota.find((person) => person.ID_Anggota === selection?.id && person.Status_Aktif === 'Aktif');
  if (!member) return;
  const current = billingPeriod();
  const ledger = createDuesLedger(state);
  const year = selection.period?.year || current.year;
  const choices = new Map<string, DuesMonth>();
  for (const month of [...ledger.summarize(member).months,
    ...NAMA_BULAN.map((_, index) => ledger.getMonth(member, index, year)),
    ...calculateSelfPay(ledger, member, current, 'advance')]) {
    choices.set(periodKey(month), month);
  }
  if (preset !== 'manual') {
    selectedPeriods = new Set(calculateSelfPay(ledger, member, current, preset, selection.period ?? current).map(periodKey));
  }
  const sorted = [...choices.values()].sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex);
  const periods = sorted.filter((month) => month.remaining > 0 && selectedPeriods.has(periodKey(month)));
  const picker = getSelect('self-pay-member');
  if (!picker) return;
  if (!picker.options.length || picker.value !== member.ID_Anggota) {
    picker.replaceChildren(...ledger.members.map(({ ang }) => new Option(ang.Nama_Anggota, ang.ID_Anggota)));
    picker.value = member.ID_Anggota;
  }
  const years = new Map<number, SelfPayInput['years'][number]['months']>();
  for (const month of sorted) {
    if (!years.has(month.year)) years.set(month.year, []);
    const key = periodKey(month);
    const status = getDuesDisplayStatus(month);
    years.get(month.year)!.push({
      periodKey: key, shortLabel: NAMA_BULAN[month.monthIndex].slice(0, 3),
      status, statusUpper: status.toUpperCase(), disabled: month.remaining === 0,
      pressed: selectedPeriods.has(key),
      ariaLabel: `${describe(month)}, ${status}${month.remaining ? `, sisa ${formatRp(month.remaining)}` : ''}`
    });
  }
  syncSelfPayMonths({
    showYearHeading: years.size > 1,
    years: [...years].map(([year, months]) => ({ year, months }))
  });
  const account = normalizePaymentAccount(state.paymentAccount);
  const transfer = account.bank && account.number
    ? `${account.bank} · ${account.number}${account.holder ? ` · a.n. ${account.holder}` : ''}` : '';
  const total = periods.reduce((sum, month) => sum + month.remaining, 0);
  document.querySelector('#modal-bayar-anggota .self-pay-copy-field')?.remove();
  const breakdown = document.getElementById('self-pay-periods');
  const shortMonths = periods.map((month) => NAMA_BULAN[month.monthIndex].slice(0, 3) + (years.size > 1 ? ` ${month.year}` : ''));
  const equalAmounts = periods.every((month) => month.remaining === ledger.monthlyFee);
  if (breakdown) breakdown.textContent = total
    ? `${periods.length} bulan${equalAmounts ? ` × ${formatRp(ledger.monthlyFee)}` : ' sesuai sisa iuran'} (${shortMonths.join(', ')})`
    : 'Pilih minimal 1 bulan di atas (BELUM, SEBAGIAN, atau NANTI).';
  animateHybridAmount(document.getElementById('self-pay-total'), total, { format: formatRp });
  (document.getElementById('self-pay-total-announcement') as HTMLElement).textContent = formatRp(total);
  transferAmount = total;
  accountNumber = transfer ? account.number : '';
  (document.getElementById('self-pay-account-title') as HTMLElement).textContent = transfer ? account.bank : 'Bank Tujuan';
  (document.getElementById('self-pay-account') as HTMLElement).textContent = transfer ? account.number : '—';
  (document.getElementById('self-pay-account-holder') as HTMLElement).textContent = transfer
    ? (account.holder ? `a.n. ${account.holder}` : '')
    : 'Rekening belum diatur. Hubungi bendahara.';
  const group = document.getElementById('app-group-name')?.textContent || getGroupName(selection.groupId);
  summary = total ? [
    `Konfirmasi pembayaran iuran — ${group}`,
    `Nama: ${member.Nama_Anggota}`,
    ...periods.map((month) => `• ${describe(month)}: ${formatRp(month.remaining)}`),
    `Total transfer: ${formatRp(total)}`,
    ...(transfer ? [`Rekening kas: ${transfer}`] : []),
    'Mohon periksa transfer dan catat pembayaran saya. Terima kasih.'
  ].join('\n') : '';
  requiredField('self-pay-preview').value = summary || 'Pilih bulan pembayaran untuk menyiapkan draf konfirmasi.';
  const whatsapp = (document.getElementById('self-pay-whatsapp') as HTMLAnchorElement | null);
  whatsapp?.setAttribute('aria-disabled', String(!summary));
  (document.querySelectorAll('#modal-bayar-anggota [data-action="self-pay-copy"]') as NodeListOf<HTMLButtonElement>).forEach((button) => {
    button.disabled = button.dataset.copy === 'account' ? !accountNumber : !summary;
  });
  if (summary && whatsapp) whatsapp.href = `https://wa.me/${account.whatsapp}?text=${encodeURIComponent(summary)}`;
  else whatsapp?.removeAttribute('href');
  (document.querySelectorAll('[data-action="self-pay-preset"]') as NodeListOf<HTMLButtonElement>).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.preset === preset));
  });
};

export const openSelfPay = (id?: string, monthIndex?: number, year?: number) => {
  const groupId = getActiveGroupId();
  if (!id || !groupId || getIsAdminView() || !getState().anggota.some((member) => member.ID_Anggota === id && member.Status_Aktif === 'Aktif')) return;
  const period = monthIndex !== undefined && Number.isInteger(monthIndex) && monthIndex >= 0 && monthIndex < 12 && year !== undefined && Number.isInteger(year) ? { monthIndex, year } : null;
  selection = { groupId, id, period };
  const picker = document.getElementById('self-pay-member');
  picker?.replaceChildren();
  selectSelfPayPreset(period ? 'selected' : 'due');
  openModal('modal-bayar-anggota');
};

export const copySelfPay = async (kind?: string) => {
  if (selection?.groupId !== getActiveGroupId()) return;
  const text = kind === 'account' ? accountNumber : kind === 'amount' && transferAmount ? String(transferAmount) : summary;
  if (!text) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    showToast('Rincian pembayaran disalin.', 'success');
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    const dialog = document.getElementById('modal-bayar-anggota');
    dialog?.querySelector('.self-pay-copy-field')?.remove();
    field.className = 'self-pay-copy-field form-control';
    field.setAttribute('aria-label', 'Rincian pembayaran untuk disalin');
    dialog?.querySelector('.hybrid-self-pay-body')?.append(field);
    field.select();
    showToast('Rincian dipilih. Gunakan perintah Salin di perangkatmu.', 'info');
  }
};

export const initSelfPay = () => {
  document.getElementById('self-pay-member')?.addEventListener('change', (event) => {
    if (!selection) return;
    selection.id = (event.currentTarget as HTMLSelectElement).value;
    selection.period = null;
    selectSelfPayPreset('due');
  });
  document.getElementById('self-pay-months')?.addEventListener('click', (event) => {
    const choice = (closestHtml(event.target, 'button[data-payment-period]') as HTMLButtonElement | null);
    if (!selection || !choice || choice.disabled) return;
    const key = choice.dataset.paymentPeriod;
    if (!key) return;
    if (selectedPeriods.has(key)) selectedPeriods.delete(key);
    else selectedPeriods.add(key);
    selectSelfPayPreset('manual');
  });
  window.addEventListener('finkas:group-changed', () => {
    selection = null;
    selectedPeriods.clear();
    summary = '';
    closeModal('modal-bayar-anggota');
  });
};
