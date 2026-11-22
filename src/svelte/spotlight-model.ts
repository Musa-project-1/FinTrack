import type { DuesLedger, DuesMonth } from '../types/finkas';
import type { billingPeriod } from '../core/dues.js';
import { NAMA_BULAN } from '../core/config.js';
import { formatDisplayRp } from '../core/utils.js';
import { getDuesDisplayStatus } from 'finkas/dues-status';

export type Period = ReturnType<typeof billingPeriod>;
type Options = {
  groupId: string | null;
  isAdmin: boolean;
  pinnedId: string | null;
  selectedMonth?: number;
  stampStyle?: string;
};
export type DetailCta = {
  label: string;
  kind: 'receipt' | 'pay';
  memberId: string;
  monthIndex: number;
  year: number;
};

const appearances = {
  Lunas: ['paid', ''], Sebagian: ['pending', 'hourglass-medium'], Belum: ['unpaid', 'clock'],
  Nanti: ['upcoming', 'calendar'], Libur: ['holiday', 'calendar-x']
} as const;

export function detailFor(month: DuesMonth, memberId: string) {
  const { monthIndex, year } = month;
  let cta: DetailCta | undefined;
  if (month.status === 'paid') {
    cta = { label: 'Lihat Struk →', kind: 'receipt', memberId, monthIndex, year };
  } else if (month.owed && month.remaining) {
    cta = { label: 'Bayar Bulan Ini →', kind: 'pay', memberId, monthIndex, year };
  }
  return {
    monthIndex, head: `${NAMA_BULAN[monthIndex]} ${year} · ${getDuesDisplayStatus(month)}`,
    paid: month.paid ? formatDisplayRp(month.paid) : undefined,
    remaining: month.owed && month.remaining ? formatDisplayRp(month.remaining) : undefined, cta
  };
}

export function computeSpotlightViewModel(ledger: DuesLedger, current: Period, opts: Options) {
  const { year, monthIndex } = current;
  const monthName = NAMA_BULAN[monthIndex];
  const adminHidden = !opts.groupId || !opts.isAdmin;
  const members = ledger.members.map(({ ang }) => ({ id: ang.ID_Anggota, name: ang.Nama_Anggota }))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const memberHidden = !opts.groupId || opts.isAdmin || !members.length;
  const member = memberHidden ? undefined : ledger.members.find(({ ang }) => ang.ID_Anggota === opts.pinnedId);
  const pinnedId = member?.ang.ID_Anggota ?? '';
  const periods = member ? NAMA_BULAN.map((_, i) => ledger.getMonth(member.ang, i, year)) : [];
  const settled = member?.months.filter(m => m.status === 'paid').length ?? 0;
  const total = member?.months.length ?? 0;
  const arrearsCount = member?.unpaidMonths ?? 0;
  const selected = opts.selectedMonth === undefined ? undefined : periods[opts.selectedMonth];
  const pending = adminHidden ? [] : ledger.members.map(({ ang }) => ({ ang, month: ledger.getMonth(ang, monthIndex, year) }))
    .filter(({ month }) => month.due && month.remaining > 0)
    .sort((a, b) => b.month.remaining - a.month.remaining || a.ang.Nama_Anggota.localeCompare(b.ang.Nama_Anggota, 'id'));

  return {
    memberHidden, adminHidden, members, pinnedId, hasPinned: Boolean(member),
    memberName: member?.ang.Nama_Anggota ?? '', memberCode: pinnedId,
    settled, total, percent: total ? Math.round(100 * settled / total) : member ? 100 : 0,
    arrearsCount, arrearsText: member ? `${arrearsCount} Bulan Belum Lunas (${formatDisplayRp(member.arrears)})` : '',
    showPaidChip: total > 0 && !arrearsCount,
    summaryText: member ? `Sudah setor ${formatDisplayRp(member.paidTotal)} (${year})` : '',
    payLabel: periods.some(m => m.remaining > 0) ? 'Bayar Iuran' : 'Buku Iuran',
    stampStyle: opts.stampStyle ?? 'seal', selectedMonthIndex: selected?.monthIndex,
    months: periods.map((month, index) => {
      const name = NAMA_BULAN[index];
      const status = getDuesDisplayStatus(month);
      const [appearance, icon] = appearances[status];
      return { index, name, shortName: name.slice(0, 3), status, appearance, icon, owed: month.owed, ariaLabel: `${name}, ${status}` };
    }),
    detail: selected ? detailFor(selected, pinnedId) : null,
    priorityTitle: `Tunggakan Prioritas (${monthName} ${year})`,
    priorityPeriod: pending.length ? `${pending.length} anggota belum lunas ${monthName}` : 'Tidak ada tunggakan bulan ini',
    priorityItems: pending.slice(0, 4).map(({ ang, month }) => ({
      memberId: ang.ID_Anggota, memberName: ang.Nama_Anggota, remainingLabel: `Sisa ${formatDisplayRp(month.remaining)}`,
      monthName, monthShort: monthName.slice(0, 3), year
    }))
  };
}
