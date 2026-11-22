import { flushSync } from 'svelte';
import { getState, currentRekapYear } from '../core/state.js';
import { billingPeriod } from '../core/dues.js';
import { computeStatsViewModel } from './stats-model';

export { computeStatsViewModel };
let selectedMonth: number | null = null;
let selectedYear: number | null = null;
let renderRevision = 0;
let mountStats: () => void;
export function registerStatsMount(mountFn: () => void) { mountStats = mountFn; }

type StatsStore = ReturnType<typeof computeStatsViewModel> & { ready: boolean; revision: number };
const initialStatsState = (): StatsStore => ({ ready: false, revision: 0, activeYear: 0,
  selectedMonth: 0, gridLines: [], months: [], curvePath: '', breakdownRows: [] });
export const statsStore = $state(initialStatsState());

export function resetStatsGroupState() {
  selectedMonth = null;
  selectedYear = null;
  renderRevision = 0;
  Object.assign(statsStore, initialStatsState());
}

export function selectStatsMonth(index: number) {
  if (!Number.isFinite(index)) return;
  selectedMonth = Math.max(0, Math.min(11, Math.trunc(index)));
  statsStore.selectedMonth = selectedMonth;
  flushSync();
}

export function renderHybridChart(state = getState()) {
  if (!globalThis.document?.getElementById?.('workspace-stats')) return;
  const current = billingPeriod();
  const activeYear = Number(currentRekapYear) || current.year;
  if (selectedYear !== activeYear || selectedMonth === null) {
    selectedYear = activeYear;
    selectedMonth = activeYear === current.year ? current.monthIndex : 11;
  }
  Object.assign(statsStore, computeStatsViewModel(state, { activeYear, selectedMonth }), {
    ready: true, revision: ++renderRevision
  });
  mountStats();
  flushSync();
}
