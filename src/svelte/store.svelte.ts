import type { AppState, DuesLedger } from '../types/finkas.d.ts';
import { GROUP_START_MONTH, GROUP_START_YEAR, NAMA_BULAN } from '../core/config.js';
import { billingPeriod } from '../core/dues.js';
import { formatRp, getDisplayRpFormatter, parseKasStart } from '../core/utils.js';

type Period = ReturnType<typeof billingPeriod>;
type Totals = { totalMasuk: number; totalKeluar: number };
export interface DashboardInput extends Partial<Totals> {
  state: AppState;
  ledger: DuesLedger;
  current: Period;
  deposits: number;
  expenses: ReadonlyMap<string, number>;
  groupName: string;
  firstRender: boolean;
}

const asOrdinal = ({ year, monthIndex }: Period) => year * 12 + monthIndex;
const clampMonth = (index: number) => Number.isFinite(index) ? Math.max(0, Math.min(11, Math.round(index))) : 11;

export function computeDashboardViewModel(
  state: AppState, ledger: DuesLedger, current: Period, deposits: number,
  expenses: ReadonlyMap<string, number>, groupName: string, firstRender: boolean,
  totals?: Totals, format = formatRp
) {
  const first = asOrdinal(current) - 11;
  const changes = Array<number>(12).fill(0);
  let balance = 0, income = 0, spending = 0;
  for (const trx of state.transaksi) {
    const nominal = Number(trx.Nominal) || 0;
    const delta = trx.Tipe_Arus === 'Masuk' ? nominal : trx.Tipe_Arus === 'Keluar' ? -nominal : 0;
    if (!totals) {
      if (trx.Tipe_Arus === 'Masuk') income += nominal;
      if (trx.Tipe_Arus === 'Keluar') spending += nominal;
    }
    const date = new Date(trx.Timestamp);
    if (!trx.Timestamp || !Number.isFinite(date.getTime())) continue;
    const index = asOrdinal(billingPeriod(date)) - first;
    if (index < 0) balance += delta;
    else if (index < 12) changes[index] += delta;
  }
  const sparkSeries = changes.map((delta, index) => {
    balance += delta;
    const month = first + index;
    return { year: Math.floor(month / 12), monthIndex: month % 12, balance };
  });
  const balances = sparkSeries.map(period => period.balance);
  const min = Math.min(...balances);
  const span = Math.max(...balances) - min;
  const sparkPoints = balances.map((value, i): [number, number] =>
    [4 + i * 108 / 11, span ? 36 - (value - min) * 28 / span : 22]);
  const sparkLinePath = 'M' + sparkPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
  const target = ledger.members.reduce((sum, member) => sum + member.expectedTotal, 0);
  const paid = ledger.members.reduce((sum, member) => sum + member.paidTotal, 0);
  let largest: [string, number] | undefined;
  for (const entry of expenses) {
    if (!largest || entry[1] > largest[1]) largest = entry;
  }
  const start = parseKasStart(state.kasStart) ?? { monthIndex: GROUP_START_MONTH - 1, year: GROUP_START_YEAR };
  const { totalMasuk, totalKeluar } = totals ?? { totalMasuk: income, totalKeluar: spending };
  const saldo = totalMasuk - totalKeluar;
  return {
    saldo, totalMasuk, totalKeluar, saldoLength: format(saldo).length, format,
    depositsCount: deposits, largestExpenseAmount: largest?.[1] ?? 0,
    largestExpenseCategory: largest ? state.kategori.find(k => k.ID_Kategori === largest[0])?.Nama_Kategori || 'Operasional' : '',
    monthlyFee: ledger.monthlyFee, activeMembersCount: ledger.members.length,
    kasStartLabel: `${NAMA_BULAN[start.monthIndex]} ${start.year}`, groupName,
    compliancePercent: target ? Math.round(100 * paid / target) : 0, hasDueTarget: Boolean(target),
    sparkSeries, sparkPoints, sparkLinePath, sparkAreaPath: `${sparkLinePath} L112,42 L4,42 Z`,
    selectedMonthIndex: 11, firstRender, visible: Boolean(groupName)
  };
}

export type DashboardViewModel = ReturnType<typeof computeDashboardViewModel>;
export const dashboardStore: DashboardViewModel = $state({
  saldo: 0, totalMasuk: 0, totalKeluar: 0, saldoLength: 4, format: formatRp,
  depositsCount: 0, largestExpenseCategory: '', largestExpenseAmount: 0,
  monthlyFee: 0, activeMembersCount: 0, kasStartLabel: '', groupName: '',
  compliancePercent: 0, hasDueTarget: false, sparkSeries: [], sparkPoints: [],
  sparkLinePath: '', sparkAreaPath: '', selectedMonthIndex: 11, firstRender: true, visible: false
});

export function updateDashboardStore({ state, ledger, current, deposits, expenses, groupName, firstRender, totalMasuk, totalKeluar }: DashboardInput) {
  const totals = totalMasuk !== undefined && totalKeluar !== undefined ? { totalMasuk, totalKeluar } : undefined;
  const model = computeDashboardViewModel(state, ledger, current, deposits, expenses, groupName, firstRender, totals, getDisplayRpFormatter());
  model.selectedMonthIndex = clampMonth(dashboardStore.selectedMonthIndex);
  Object.assign(dashboardStore, model);
  return dashboardStore;
}

export function setSelectedSparkMonth(index: number) {
  dashboardStore.selectedMonthIndex = clampMonth(index);
}
