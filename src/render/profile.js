import { getPinnedMemberId } from '../ui/spotlight.js';
import { createDuesLedger } from '../core/dues.js';
import { getDuesDisplayStatus, renderPassbookEmblem } from '../ui/dues-status.js';
import { byNewestTimestamp, NAMA_BULAN } from '../core/config.js';
import { currentRekapYear, getIsAdminView, getState } from '../core/state.js';
import { formatRp, escapeHtml, calculateMemberContribution, showToast } from '../core/utils.js';
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
  document.getElementById('passbook-months').innerHTML = NAMA_BULAN.map((name, index) => {
    const month = ledger.getMonth(member, index, year);
    const status = getDuesDisplayStatus(month);
    const kind = stampKind[status];
    let action = '';
    if (status === 'Lunas') {
      action = `data-action="open-month-receipt" data-id="${escapeHtml(idAnggota)}" data-month="${index}" data-year="${year}"`;
    } else if (active && month.remaining > 0) {
      action = admin
        ? `data-action="quickpay-card" data-anggota="${escapeHtml(idAnggota)}" data-bulan="${name}" data-year="${year}"`
        : `data-action="open-self-pay" data-id="${escapeHtml(idAnggota)}" data-month="${index}" data-year="${year}"`;
    }
    const ariaLabel = `${name} ${year}, ${status}${month.paid ? `, setoran ${formatRp(month.paid)}` : ''}`;
    return `<button type="button" class="passbook-stamp-btn ${kind}" style="--pass-i:${index}" aria-label="${escapeHtml(ariaLabel)}" ${action || 'disabled'}>
      <span class="passbook-slot-head">
        <span class="passbook-slot-mon">${name.slice(0, 3)}</span>
        <span class="passbook-slot-num">${String(index + 1).padStart(2, '0')}</span>
      </span>
      <span class="passbook-slot-seal">${renderPassbookEmblem(kind)}</span>
      <span class="passbook-slot-tag">${status.toUpperCase()}</span>
    </button>`;
  }).join('');

  const deposits = transactions.filter((row) => row.Tipe_Arus === 'Masuk');
  document.getElementById('p-list-transaksi').innerHTML = deposits.length ? deposits.map((row) => {
    const parsedDate = new Date(row.Timestamp);
    const date = Number.isFinite(parsedDate.valueOf())
      ? parsedDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    const category = state.kategori.find((item) => item.ID_Kategori === row.ID_Kategori)?.Nama_Kategori || 'Setoran';
    const note = row.Keterangan || (row.Bulan_Iuran && row.Bulan_Iuran !== '-' ? `Iuran ${row.Bulan_Iuran} ${row.Tahun_Iuran}` : category);
    return `<button type="button" class="profil-history-row" data-action="open-receipt" data-id="${escapeHtml(row.ID_Transaksi)}">
      <span class="ledger-main">
        <span class="ledger-title">${escapeHtml(note)}</span>
        <span class="ledger-meta"><span class="mono tnum">${escapeHtml(date)}</span><span>${escapeHtml(row.ID_Transaksi)}</span></span>
      </span>
      <span class="ledger-amt inflow nominal-val sensitive-amt">+${escapeHtml(formatRp(row.Nominal))}</span>
    </button>`;
  }).join('') : '<div class="profile-history-empty">Belum ada riwayat setoran.</div>';

  openModal('modal-profil-anggota');
};
