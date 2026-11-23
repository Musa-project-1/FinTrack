import { syncMemberProfile } from '../ui/svelte-dashboard.js';
import { getPinnedMemberId } from '../ui/spotlight.js';
import { createDuesLedger } from '../core/dues.js';
import { getDuesDisplayStatus, getActiveIndicatorStyle } from '../ui/dues-status.js';
import { byNewestTimestamp, NAMA_BULAN } from '../core/config.js';
import { currentRekapYear, getIsAdminView, getState } from '../core/state.js';
import { formatRp, calculateMemberContribution, showToast } from '../core/utils.js';
import { animateHybridAmount } from '../ui/hybrid-motion.js';
import { openModal } from '../ui/modal.js';

const stampKind = {
  Lunas: 'paid', Sebagian: 'pending', Belum: 'unpaid', Nanti: 'upcoming', Libur: 'holiday'
};

export const copyPassbook = async () => {
  const text = ['p-nama-anggota', 'passbook-meta', 'p-total-kontribusi', 'passbook-paid-chip', 'passbook-unpaid-chip']
    .map((id) => document.getElementById(id)).filter((element) => element && !element.hidden)
    .map((element) => element.id === 'p-total-kontribusi' ? `Total kontribusi: ${element.dataset.fullValue}` : element.textContent)
    .join('\n');
  const dialog = document.getElementById('modal-profil-anggota');
  try {
    await navigator.clipboard.writeText(text);
    showToast('Ringkasan Buku Iuran disalin.');
  } catch {
    const existing = dialog?.querySelector('.passbook-copy-field');
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

export const bukaProfilAnggota = (idAnggota) => {
  const state = getState();
  const member = state.anggota.find((item) => item.ID_Anggota === idAnggota);
  if (!member) return;

  const year = Number(currentRekapYear);
  const admin = getIsAdminView();
  const active = member.Status_Aktif === 'Aktif';
  const pinned = getPinnedMemberId() === idAnggota;
  const transactions = state.transaksi.filter((item) => item.ID_Anggota === idAnggota).sort(byNewestTimestamp);
  const ledger = createDuesLedger(state, { year });
  const summary = ledger.summarize(member);
  const paid = summary.months.filter((month) => month.status === 'paid').length;
  document.getElementById('p-nama-anggota').textContent = member.Nama_Anggota;
  document.getElementById('passbook-meta').textContent = `${member.ID_Anggota} · ${member.Status_Aktif} · ${year}`;
  const contribution = calculateMemberContribution(transactions, idAnggota);
  const total = document.getElementById('p-total-kontribusi');
  total.dataset.fullValue = formatRp(contribution);
  animateHybridAmount(total, contribution, { format: formatRp, from: 0 });
  document.getElementById('passbook-paid-chip').textContent = `${paid}/${summary.months.length} Lunas`;
  const unpaid = document.getElementById('passbook-unpaid-chip');
  unpaid.hidden = summary.unpaidMonths === 0;
  unpaid.textContent = `${summary.unpaidMonths} Tunggakan`;
  const pay = document.getElementById('passbook-pay');
  pay.dataset.id = idAnggota;
  pay.disabled = !active;
  const pin = document.getElementById('passbook-pin');
  pin.dataset.id = idAnggota;
  pin.disabled = !active;
  pin.setAttribute('aria-pressed', String(pinned));
  document.getElementById('passbook-pin-label').textContent = pinned ? 'Lepas' : 'Sematkan';
  document.querySelector('#modal-profil-anggota .passbook-copy-field')?.remove();

  document.getElementById('passbook-year').textContent = `Kartu Cap Iuran ${year}`;
  const months = NAMA_BULAN.map((name, index) => {
    const month = ledger.getMonth(member, index, year);
    const status = getDuesDisplayStatus(month);
    const kind = stampKind[status];
    let action = '';
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
