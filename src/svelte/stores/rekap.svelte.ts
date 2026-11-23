import { yearGliderStore } from './year-glider.svelte';
import { flushSync } from 'svelte';
import { createPagination } from 'finkas/pagination';
import { getActiveIndicatorStyle } from 'finkas/dues-status';
import { syncBulkDues } from 'finkas/bulk-dues';
import { NAMA_BULAN } from '../../core/config.js';
import { billingPeriod, createDuesLedger } from '../../core/dues.js';
import { currentRekapYear, getActiveGroupId, getIsAdminView, getState } from '../../core/state.js';
import type { Anggota } from '../../types/finkas';
import { getPinnedMemberId } from './spotlight.svelte';
import { buildMemberRowVM, computeRekapViewModel, paidCellKey, type RekapMemberRowVM } from './rekap-model';

const labels = { all: 'Semua', unpaid: 'Nunggak', paid: 'Lunas' };
let statusFilter: keyof typeof labels = 'all';
const newlyPaidCells = new Set<string>();
const expandedIds = new Set<string>();
const duesPagination = createPagination('dues-pagination', 'anggota', () => renderTableRekap());
export const initDuesPagination = duesPagination.init;
const searchIds = ['search-member-rekap', 'search-member-rekap-mobile'];

const initialView = { year: '', isAdmin: false, stampStyle: 'seal', hasActiveFilter: false };
const initialRekapState = () => ({
  ...initialView, rows: [] as RekapMemberRowVM[], mobileRows: [] as RekapMemberRowVM[],
  mobile: { ...initialView }, expandedIds: [] as string[]
});
export const rekapStore = $state(initialRekapState());

export function resetRekapGroupState() {
  statusFilter = 'all';
  newlyPaidCells.clear();
  expandedIds.clear();
  Object.assign(rekapStore, initialRekapState());
}

let mountDashboard: () => void;
export function registerRekapMount(mount: () => void) { mountDashboard = mount; }

export function filterDuesStatus(filter: string) {
  if (filter !== 'all' && filter !== 'paid' && filter !== 'unpaid') return;
  statusFilter = filter;
  renderTableRekap();
}

export function markNewlyPaidCells(ids: string | number | (string | number)[], bulan: string, tahun: string | number) {
  for (const id of Array.isArray(ids) ? ids : [ids]) {
    if (id && bulan && tahun) newlyPaidCells.add(paidCellKey(id, bulan, tahun));
  }
}

const searchInput = (id: string) => document.getElementById(id) as HTMLInputElement | null;
function searchValue() {
  return (searchInput(searchIds[0])?.value || searchInput(searchIds[1])?.value || '').trim().toLowerCase();
}

export function resetRekapFilter() {
  for (const id of searchIds) {
    const input = searchInput(id);
    if (input) input.value = '';
  }
  filterDuesStatus('all');
}

function readExpandedCards() {
  expandedIds.clear();
  for (const el of document.querySelectorAll('#iuran-cards-mobile .iuran-member-card.expanded .iuran-card-details')) {
    expandedIds.add(el.id);
  }
}

export function toggleIuranCard(card: HTMLElement | null) {
  const details = card?.querySelector<HTMLElement>('.iuran-card-details');
  if (!card || !details) return;
  const expand = !card.classList.contains('expanded');
  readExpandedCards();
  if (!card.closest('.bulk-selecting')) expandedIds.clear();
  if (expand) expandedIds.add(details.id);
  else expandedIds.delete(details.id);
  rekapStore.expandedIds = [...expandedIds];
  for (const row of rekapStore.mobileRows) row.expanded = expandedIds.has(row.detailsId);
  flushSync();
  // Also support cards supplied by callers outside the component mount.
  function syncCard(el: HTMLElement, open: boolean) {
    el.classList.toggle('expanded', open);
    el.querySelector('[data-action="toggle-card"]')?.setAttribute('aria-expanded', String(open));
    el.querySelector('.iuran-card-details')?.toggleAttribute('inert', !open);
  }
  if (!card.closest('.bulk-selecting')) {
    for (const other of document.querySelectorAll<HTMLElement>('.iuran-member-card.expanded')) {
      if (other !== card) syncCard(other, false);
    }
  }
  if (card.classList.contains('expanded') !== expand) syncCard(card, expand);
}

export function renderIuranMobileCards(members: Anggota[], ledger = createDuesLedger(getState()),
  stampStyle = getActiveIndicatorStyle(), pinnedId = getPinnedMemberId(), isAdmin = getIsAdminView()) {
  if (!globalThis.document?.getElementById?.('iuran-cards-mobile')) return;
  readExpandedCards();
  const year = String(currentRekapYear);
  const opts = { year, pinnedId, isAdmin, expandedIds, newlyPaidKeys: newlyPaidCells };
  rekapStore.mobile = { year, isAdmin, stampStyle, hasActiveFilter: statusFilter !== 'all' || Boolean(searchValue()) };
  rekapStore.mobileRows = (members || []).map(ang => buildMemberRowVM(ang, ledger, opts));
  rekapStore.expandedIds = [...expandedIds];
  mountDashboard();
  flushSync();
}

export function renderTableRekap() {
  const doc = globalThis.document;
  for (const group of doc?.querySelectorAll?.<HTMLElement>('.hybrid-year-glider:not([hidden])') ?? []) {
    const mobile = group.closest('.year-pill')?.querySelector('select')?.id.endsWith('-mobile');
    const state = yearGliderStore[mobile ? 'mobile' : 'desktop'];
    state.activeYear = currentRekapYear;
    group.style.setProperty('--year-index', String(Math.max(0, state.years.indexOf(currentRekapYear))));
  }
  const tbody = doc?.getElementById?.('ui-table-rekap');
  if (!tbody) return;
  readExpandedCards();
  const state = getState();
  const year = String(currentRekapYear);
  const searchVal = searchValue();
  const view = { year, isAdmin: getIsAdminView(), stampStyle: getActiveIndicatorStyle(),
    hasActiveFilter: statusFilter !== 'all' || Boolean(searchVal) };
  const opts = { ...view, statusFilter, searchVal, pinnedId: getPinnedMemberId(), newlyPaidKeys: newlyPaidCells, expandedIds };
  const { ledger, counts, filteredAnggota } = computeRekapViewModel(state, opts);
  for (const button of doc.querySelectorAll<HTMLElement>('[data-status-filter]')) {
    const key = button.dataset.statusFilter as keyof typeof labels;
    button.textContent = `${labels[key]} (${counts[key]})`;
    button.setAttribute('aria-pressed', String(key === statusFilter));
  }
  const members: Anggota[] = duesPagination.paginate(filteredAnggota,
    JSON.stringify([getActiveGroupId(), year, statusFilter, searchVal]));
  const rows = members.map(ang => buildMemberRowVM(ang, ledger, opts));
  const period = billingPeriod();
  const headers = tbody.closest?.('table')?.querySelector?.('thead tr')?.querySelectorAll('th');
  NAMA_BULAN.forEach((_, idx) => {
    const monthKey = `${String(idx + 1).padStart(2, '0')}-${year}`;
    headers?.[idx + 1]?.classList.toggle('th-skipped', state.skippedMonths?.includes(monthKey));
    headers?.[idx + 1]?.classList.toggle('is-current-month', Number(year) === period.year && idx === period.monthIndex);
  });
  Object.assign(rekapStore, view, { rows, mobileRows: rows, mobile: view, expandedIds: [...expandedIds] });
  mountDashboard();
  flushSync();
  newlyPaidCells.clear();
  if (rows.some(row => row.settledAny)) doc.dispatchEvent(new Event('finkas:dues-settled'));
  syncBulkDues();
}
