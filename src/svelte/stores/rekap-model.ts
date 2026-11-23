import { NAMA_BULAN } from '../../core/config.js';
import { createDuesLedger } from '../../core/dues.js';
import { formatRp } from '../../core/utils.js';
import { getDuesDisplayStatus } from 'finkas/dues-status';
import type { Anggota, AppState, DuesLedger } from '../../types/finkas';

interface RowOptions {
  year: string;
  pinnedId: string | null;
  isAdmin: boolean;
  newlyPaidKeys: ReadonlySet<string>;
  expandedIds: ReadonlySet<string>;
}

export const paidCellKey = (id: string | number, month: string, year: string | number) =>
  JSON.stringify([String(id), month, String(year)]);

export function buildMemberRowVM(ang: Anggota, ledger: DuesLedger, opts: RowOptions) {
  const { ID_Anggota: id, Nama_Anggota: name } = ang;
  const yearMonths = NAMA_BULAN.map((_, i) => ledger.getMonth(ang, i, opts.year));
  const dueMonths = yearMonths.filter(m => m.due);
  const paidCount = dueMonths.filter(m => m.status === 'paid').length;
  const dueCount = dueMonths.length;
  const arrearsCount = dueCount - paidCount;
  const firstDue = dueMonths.find(m => m.remaining > 0);
  const detailsId = `dues-details-${encodeURIComponent(id)}`;
  const cells = yearMonths.map((month, idx) => {
    const bulan = NAMA_BULAN[idx];
    const status = getDuesDisplayStatus(month);
    const isPaid = month.status === 'paid';
    return {
      idx, bulan, shortMon: bulan.slice(0, 3), status, owed: month.owed, remaining: month.remaining,
      payable: month.remaining > 0, isPaid,
      isNewlyPaid: isPaid && opts.newlyPaidKeys.has(paidCellKey(id, bulan, month.year)),
      title: `${name}, ${bulan} ${month.year}: ${status}` +
        (month.owed ? ` · Setoran ${formatRp(month.paid)} · Sisa ${formatRp(month.remaining)}` : ''),
      paidAmountText: status === 'Sebagian' ? formatRp(month.paid) : ''
    };
  });
  return {
    id, name, cells, detailsId, expanded: opts.expandedIds.has(detailsId), isPinned: id === opts.pinnedId,
    subText: dueCount ? `${paidCount}/${dueCount} lunas` : 'Belum jatuh tempo',
    chipClass: arrearsCount ? 'amber' : 'paid',
    chipText: arrearsCount ? `${arrearsCount} Nunggak` : `${paidCount}/${dueCount} Lunas`,
    firstDueMonthName: firstDue ? NAMA_BULAN[firstDue.monthIndex] : '',
    stripStatuses: cells.map(cell => cell.status), settledAny: cells.some(cell => cell.isNewlyPaid)
  };
}

export type RekapMemberRowVM = ReturnType<typeof buildMemberRowVM>;
export type RekapCell = RekapMemberRowVM['cells'][number];

export function monthAction(cell: RekapCell, id: string, year: string, admin: boolean, mobile: boolean) {
  if (!cell.isPaid && admin) return {
    'data-action': mobile ? 'quickpay-card' : 'quickpay', 'data-anggota': id, 'data-bulan': cell.bulan,
    'data-bulk-month': cell.idx, 'data-bulk-year': year, 'data-bulk-remaining': cell.remaining
  };
  return { 'data-action': cell.isPaid ? 'open-month-receipt' : 'open-self-pay',
    'data-id': id, 'data-month': cell.idx, 'data-year': year };
}

export function computeRekapViewModel(state: AppState, opts: RowOptions & {
  statusFilter: string; searchVal: string; stampStyle: string;
}) {
  const ledger = createDuesLedger(state, { year: opts.year });
  const search = opts.searchVal.trim().toLowerCase();
  const searchable = ledger.members.filter(({ ang }) => ang.Nama_Anggota.toLowerCase().includes(search));
  const paid = (m: DuesLedger['members'][number]) => m.months.length > 0 && m.arrears === 0;
  const unpaid = (m: DuesLedger['members'][number]) => m.arrears > 0;
  const counts = { all: searchable.length, unpaid: searchable.filter(unpaid).length, paid: searchable.filter(paid).length };
  const filteredAnggota = searchable.filter(m => opts.statusFilter === 'all' ||
    (opts.statusFilter === 'unpaid' ? unpaid(m) : paid(m)))
    .map(({ ang }) => ang).sort((a, b) => a.Nama_Anggota.localeCompare(b.Nama_Anggota));
  return { ledger, counts, filteredAnggota };
}
