import type { ProfileInput } from '../stores/profile.svelte';
import { syncMemberProfile } from '../mount';
import { getPinnedMemberId } from '../stores/spotlight.svelte';
import { createDuesLedger } from 'finkas/core/dues';
import { getDuesDisplayStatus, getActiveIndicatorStyle } from '../ui/dues-status';
import { byNewestTimestamp, NAMA_BULAN } from 'finkas/core/config';
import { currentRekapYear, getIsAdminView, getState } from 'finkas/core/state';
import { formatRp, calculateMemberContribution, showToast } from 'finkas/core/utils';
import { animateHybridAmount } from '../ui/hybrid-motion';
import { openModal } from '../ui/modal';

const stampKind = ({
  Lunas: 'paid', Sebagian: 'pending', Belum: 'unpaid', Nanti: 'upcoming', Libur: 'holiday'
} as const);

const setText = (id: string, text: string) => {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
};

export const copyPassbook = async () => {
  const text = ['p-nama-anggota', 'passbook-meta', 'p-total-kontribusi', 'passbook-paid-chip', 'passbook-unpaid-chip']
    .map((id) => document.getElementById(id)).filter(element => element !== null).filter(element => !element.hidden)
    .map((element) => element.id === 'p-total-kontribusi' ? `Total kontribusi: ${element.dataset.fullValue}` : element.textContent)
    .join('\n');
  const dialog = document.getElementById('modal-profil-anggota');
  try {
    await navigator.clipboard.writeText(text);
    showToast('Ringkasan Buku Iuran disalin.');
  } catch {
    const existing = dialog?.querySelector<HTMLTextAreaElement>('.passbook-copy-field');
    const field = existing || document.createElement('textarea');
    field.className = 'passbook-copy-field form-control';
    field.readOnly = true;
    field.value = text;
    field.setAttribute('aria-label', 'Ringkasan Buku Iuran untuk disalin');
    if (!existing) dialog?.querySelector('.dlg-body')?.append(field);
    field.select();
    showToast('Ringkasan dipilih. Gunakan perintah Salin di perangkatmu.', 'info');
  }
};

export const bukaProfilAnggota = (idAnggota: string) => {
  const state = getState();
  const member = state.anggota.find((item) => item.ID_Anggota === idAnggota);
  if (!member) return;

  const total = document.getElementById('p-total-kontribusi');
  const unpaid = document.getElementById('passbook-unpaid-chip');
  const pay = (document.getElementById('passbook-pay') as HTMLButtonElement | null);
  const pin = (document.getElementById('passbook-pin') as HTMLButtonElement | null);
  if (!total || !unpaid || !pay || !pin) return;

  const year = Number(currentRekapYear);
  const admin = getIsAdminView();
  const active = member.Status_Aktif === 'Aktif';
  const pinned = getPinnedMemberId() === idAnggota;
  const transactions = state.transaksi.filter((item) => item.ID_Anggota === idAnggota).sort(byNewestTimestamp);
  const ledger = createDuesLedger(state, { year });
  const summary = ledger.summarize(member);
  const paid = summary.months.filter((month) => month.status === 'paid').length;
  setText('p-nama-anggota', member.Nama_Anggota);
  setText('passbook-meta', `${member.ID_Anggota} · ${member.Status_Aktif} · ${year}`);
  const contribution = calculateMemberContribution(transactions, idAnggota);
  total.dataset.fullValue = formatRp(contribution);
  animateHybridAmount(total, contribution, { format: formatRp, from: 0 });
  setText('passbook-paid-chip', `${paid}/${summary.months.length} Lunas`);
  unpaid.hidden = summary.unpaidMonths === 0;
  unpaid.textContent = `${summary.unpaidMonths} Tunggakan`;
  pay.dataset.id = idAnggota;
  pay.disabled = !active;
  pin.dataset.id = idAnggota;
  pin.disabled = !active;
  pin.setAttribute('aria-pressed', String(pinned));
  setText('passbook-pin-label', pinned ? 'Lepas' : 'Sematkan');
  document.querySelector('#modal-profil-anggota .passbook-copy-field')?.remove();

  setText('passbook-year', `Kartu Cap Iuran ${year}`);
  const months = NAMA_BULAN.map((name, index) => {
    const month = ledger.getMonth(member, index, year);
    const status = getDuesDisplayStatus(month);
    const kind = stampKind[status];
    let action: ProfileInput['months'][number]['action'] = '';
    if (status === 'Lunas') {
      action = 'open-month-receipt';
    } else if (active && month.remaining > 0) {
      action = admin ? 'quickpay-card' : 'open-self-pay';
    }
    const ariaLabel = `${name} ${year}, ${status}${month.paid ? `, setoran ${formatRp(month.paid)}` : ''}`;
    return {
      index, shortName: name.slice(0, 3), numLabel: String(index + 1).padStart(2, '0'),
      kind, statusUpper: status.toUpperCase(), ariaLabel, action, memberId: idAnggota,
      monthName: name, year: String(year), disabled: !action
    };
  });

  const deposits = transactions.filter((row) => row.Tipe_Arus === 'Masuk').map((row) => {
    const parsedDate = new Date(row.Timestamp);
    const date = Number.isFinite(parsedDate.valueOf())
      ? parsedDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    const category = state.kategori.find((item) => item.ID_Kategori === row.ID_Kategori)?.Nama_Kategori || 'Setoran';
    const note = row.Keterangan || (row.Bulan_Iuran && row.Bulan_Iuran !== '-' ? `Iuran ${row.Bulan_Iuran} ${row.Tahun_Iuran}` : category);
    return { id: row.ID_Transaksi, note, date, formattedAmount: formatRp(row.Nominal) };
  });
  syncMemberProfile({ stampStyle: getActiveIndicatorStyle(), months, deposits });

  openModal('modal-profil-anggota');
};
