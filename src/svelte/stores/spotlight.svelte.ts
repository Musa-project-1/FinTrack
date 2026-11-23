import { flushSync } from 'svelte';
import { getActiveIndicatorStyle } from 'finkas/dues-status';
import { openMonthReceipt } from 'finkas/receipt';
import { openSelfPay } from 'finkas/self-pay';
import { NAMA_BULAN } from 'finkas/core/config';
import { billingPeriod, createDuesLedger } from 'finkas/core/dues';
import { getActiveGroupId, getIsAdminView, getState } from 'finkas/core/state';
import type { DuesLedger } from '../../types/finkas';
import { computeSpotlightViewModel, detailFor, type DetailCta, type Period } from './spotlight-model';

export { computeSpotlightViewModel };
const initialSpotlightState = (): ReturnType<typeof computeSpotlightViewModel> => ({
  memberHidden: true, adminHidden: true, members: [], hasPinned: false, pinnedId: '',
  memberName: '', memberCode: '', settled: 0, total: 0, percent: 0, arrearsCount: 0,
  arrearsText: '', showPaidChip: false, summaryText: '', payLabel: 'Bayar Iuran', stampStyle: 'seal',
  selectedMonthIndex: undefined, months: [], detail: null, priorityTitle: 'Tunggakan Prioritas',
  priorityPeriod: '', priorityItems: []
});
export const spotlightStore = $state(initialSpotlightState());

export function resetSpotlightGroupState() {
  selectedMonth = undefined;
  lastGroup = undefined;
  pinnedMember = null;
  Object.assign(spotlightStore, initialSpotlightState());
}

let selectedMonth: number | undefined;
let lastGroup: string | null | undefined;
let pinnedMember: string | null = null;
let mountDashboard: () => void;
export function registerSpotlightMount(mount: () => void) { mountDashboard = mount; }
export function initSpotlight() { mountDashboard(); }

const pinKey = (group: string) => `finkas_spotlight:${group}`;
function readPin(group: string) {
  try { return localStorage.getItem(pinKey(group)); }
  catch { return null; }
}
export function getPinnedMemberId() {
  const group = getActiveGroupId();
  if (!group || getIsAdminView()) return null;
  return group === lastGroup ? pinnedMember : readPin(group);
}

export function renderSpotlight(ledger: DuesLedger, current: Period) {
  const group = getActiveGroupId();
  if (group !== lastGroup) {
    lastGroup = group;
    selectedMonth = undefined;
    pinnedMember = group ? readPin(group) : null;
  }
  const model = computeSpotlightViewModel(ledger, current, {
    groupId: group, isAdmin: getIsAdminView(), pinnedId: pinnedMember,
    selectedMonth, stampStyle: getActiveIndicatorStyle()
  });
  Object.assign(spotlightStore, model);
  initSpotlight();
  flushSync();
  const member = globalThis.document?.getElementById?.('member-spotlight');
  const admin = globalThis.document?.getElementById?.('admin-priorities');
  if (member) member.hidden = model.memberHidden;
  if (admin) admin.hidden = model.adminHidden;
}

export function triggerSpotlightDetailCta(cta: DetailCta) {
  const open = cta.kind === 'receipt' ? openMonthReceipt : openSelfPay;
  open(cta.memberId, cta.monthIndex, cta.year);
}

export function showSpotlightDetail(index: number | 'pay', ledger?: DuesLedger, current = billingPeriod(), openPayment?: boolean) {
  if (!pinnedMember || lastGroup !== getActiveGroupId() || getIsAdminView() || !globalThis.document?.getElementById?.('spotlight-detail')) return;
  const dues = ledger ?? createDuesLedger(getState(), { year: current.year });
  const member = dues.members.find(({ ang }) => ang.ID_Anggota === pinnedMember);
  if (!member) return;
  if (index === 'pay') {
    if (NAMA_BULAN.some((_, i) => dues.getMonth(member.ang, i, current.year).remaining > 0)) {
      openSelfPay(pinnedMember);
    } else document.getElementById('spotlight-book')?.click();
    return;
  }
  if (!Number.isInteger(index) || index < 0 || index > 11) return;
  const shouldOpen = openPayment ?? selectedMonth === index;
  selectedMonth = index;
  const detail = detailFor(dues.getMonth(member.ang, index, current.year), pinnedMember);
  spotlightStore.selectedMonthIndex = index;
  spotlightStore.detail = detail;
  flushSync();
  if (shouldOpen && detail.cta) triggerSpotlightDetailCta(detail.cta);
}

export function setMemberPin(id: string, focusPicker = false) {
  const group = getActiveGroupId();
  if (!group || group !== lastGroup || getIsAdminView()) return;
  if (id && !getState().anggota.some(person => person.ID_Anggota === id && person.Status_Aktif === 'Aktif')) return;
  pinnedMember = id;
  selectedMonth = undefined;
  try {
    if (id) localStorage.setItem(pinKey(group), id);
    else localStorage.removeItem(pinKey(group));
  } catch {}
  const current = billingPeriod();
  renderSpotlight(createDuesLedger(getState(), { year: current.year }), current);
  const pin = document.getElementById('passbook-pin');
  if (pin?.dataset.id) {
    const isPinned = pin.dataset.id === id;
    pin.setAttribute('aria-pressed', String(isPinned));
    const label = document.getElementById('passbook-pin-label');
    if (label) label.textContent = isPinned ? 'Lepas' : 'Sematkan';
  }
  document.dispatchEvent(new Event('finkas:member-pin-changed'));
  for (const button of document.querySelectorAll<HTMLElement>('.dues-pin-btn[aria-pressed="true"]')) {
    if (button.dataset.id !== id) continue;
    button.classList.remove('bouncing');
    void button.offsetWidth;
    button.classList.add('bouncing');
    button.addEventListener('animationend', function ended(event) {
      if (event.target !== button || event.animationName !== 'pin-bounce') return;
      button.classList.remove('bouncing');
      button.removeEventListener('animationend', ended);
    });
  }
  if (focusPicker) document.getElementById(id ? 'spotlight-swap-select' : 'spotlight-picker')?.focus();
}

export const toggleMemberPin = (id: string) => setMemberPin(id === getPinnedMemberId() ? '' : id);

export function setSpotlightStampStyle(styleKey: string) {
  spotlightStore.stampStyle = styleKey;
}
