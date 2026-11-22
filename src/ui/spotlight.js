import { openMonthReceipt } from '../render/receipt.js';
import { openSelfPay } from '../handlers/self-pay.js';
import { getDuesDisplayStatus, renderMiniStamp } from './dues-status.js';
import { NAMA_BULAN } from '../core/config.js';
import { billingPeriod, createDuesLedger } from '../core/dues.js';
import { getActiveGroupId, getIsAdminView, getState } from '../core/state.js';
import { escapeHtml, formatDisplayRp } from '../core/utils.js';

let selectedMonth;
let lastGroup;
let pinnedMember;
const monthAppearance = Object.freeze({
  Lunas: ['paid', ''],
  Sebagian: ['pending', 'hourglass-medium'],
  Belum: ['unpaid', 'clock'],
  Nanti: ['upcoming', 'calendar'],
  Libur: ['holiday', 'calendar-x']
});
const pinKey = (group) => `finkas_spotlight:${group}`;
export const getPinnedMemberId = () => {
  const group = getActiveGroupId();
  if (!group || getIsAdminView()) return null;
  if (group === lastGroup) return pinnedMember;
  try { return localStorage.getItem(pinKey(group)); }
  catch { return null; }
};

const renderMember = (card, ledger, current) => {
  const members = [...ledger.members].sort((a, b) => a.ang.Nama_Anggota.localeCompare(b.ang.Nama_Anggota, 'id'));
  card.hidden = !getActiveGroupId() || getIsAdminView() || members.length === 0;
  if (card.hidden) return;

  const member = members.find(({ ang }) => ang.ID_Anggota === pinnedMember);
  const picker = document.getElementById('spotlight-picker');
  const swap = document.getElementById('spotlight-swap-select');
  const options = members.map(({ ang }) => new Option(ang.Nama_Anggota, ang.ID_Anggota));
  picker.replaceChildren(new Option('Pilih nama Anda...', ''), ...options.map((option) => option.cloneNode(true)));
  swap.replaceChildren(...options);
  picker.value = swap.value = member?.ang.ID_Anggota || '';
  document.getElementById('quick-cek-bar').hidden = Boolean(member);
  document.getElementById('spotlight-card').hidden = !member;
  const detail = document.getElementById('spotlight-detail');
  detail.hidden = true;
  if (!member) return;

  const progress = document.getElementById('spotlight-progress');
  const months = document.getElementById('spotlight-months');
  const book = document.getElementById('spotlight-book');
  const paidMonths = member.months.filter((month) => month.status === 'paid').length;
  const percent = member.months.length ? Math.round(100 * paidMonths / member.months.length) : 100;
  const periods = NAMA_BULAN.map((_, index) => ledger.getMonth(member.ang, index, current.year));
  const payable = periods.some((month) => month.remaining > 0);
  progress.setAttribute('aria-valuenow', percent);
  document.getElementById('spotlight-ring-arc').setAttribute('stroke-dashoffset', 100 - percent);
  document.getElementById('spotlight-pct').textContent = `${percent}%`;
  document.getElementById('spotlight-frac').textContent = `${paidMonths}/${member.months.length}`;
  const arrears = document.getElementById('spotlight-arrears-chip');
  arrears.hidden = member.unpaidMonths === 0;
  arrears.textContent = `${member.unpaidMonths} Bulan Belum Lunas (${formatDisplayRp(member.arrears)})`;
  const settledChip = document.getElementById('spotlight-paid-chip');
  settledChip.hidden = member.months.length === 0 || member.unpaidMonths > 0;
  settledChip.textContent = 'Iuran Jatuh Tempo Lunas';
  const code = document.getElementById('spotlight-member-code');
  code.textContent = member.ang.ID_Anggota;
  code.hidden = !code.textContent;
  document.getElementById('spotlight-name').textContent = member.ang.Nama_Anggota;
  document.getElementById('spotlight-summary').textContent =
    `Sudah setor ${formatDisplayRp(member.paidTotal)} (${current.year})`;
  document.getElementById('spotlight-pay-label').textContent = payable ? 'Bayar Iuran' : 'Buku Iuran';
  book.dataset.id = member.ang.ID_Anggota;

  months.innerHTML = NAMA_BULAN.map((name, index) => {
    const month = periods[index];
    const status = getDuesDisplayStatus(month);
    const [appearance, icon] = monthAppearance[status];
    return `<button type="button" class="mini-month-pill ${appearance}" style="--i:${index}" data-action="spotlight-month" data-index="${index}"
      data-status="${status}" aria-label="${name}, ${status}" aria-pressed="false"${month.owed ? '' : ' disabled'}>
      ${icon ? `<i class="ph ph-${icon}" aria-hidden="true"></i>` : renderMiniStamp()}<span>${name.slice(0, 3)}</span>
    </button>`;
  }).join('');
};

const renderPriorities = (card, ledger, current) => {
  card.hidden = !getActiveGroupId() || !getIsAdminView();
  if (card.hidden) return;

  const { year, monthIndex } = current;
  const monthName = NAMA_BULAN[monthIndex];
  const pending = ledger.members.map(({ ang }) => ({ ang, month: ledger.getMonth(ang, monthIndex, year) }))
    .filter(({ month }) => month.due && month.remaining > 0)
    .sort((a, b) => b.month.remaining - a.month.remaining || a.ang.Nama_Anggota.localeCompare(b.ang.Nama_Anggota, 'id'));
  document.getElementById('priority-title').textContent = `Tunggakan Prioritas (${monthName} ${year})`;
  document.getElementById('priority-period').textContent = pending.length
    ? `${pending.length} anggota belum lunas ${monthName}` : 'Tidak ada tunggakan bulan ini';
  document.getElementById('priority-members').innerHTML = pending.slice(0, 4).map(({ ang, month }) => `
    <li>
      <span title="Sisa ${escapeHtml(formatDisplayRp(month.remaining))}">${escapeHtml(ang.Nama_Anggota)}</span>
      <button type="button" class="btn" data-action="quickpay-card" data-anggota="${escapeHtml(ang.ID_Anggota)}"
        data-bulan="${monthName}" data-year="${year}" aria-label="Lunasi iuran ${escapeHtml(monthName)} untuk ${escapeHtml(ang.Nama_Anggota)}">Lunasi ${monthName.slice(0, 3)}</button>
    </li>`).join('');
};

export const renderSpotlight = (ledger, current) => {
  const member = document.getElementById('member-spotlight');
  const admin = document.getElementById('admin-priorities');
  if (!member || !admin) return;
  const group = getActiveGroupId();
  if (group !== lastGroup) {
    lastGroup = group;
    selectedMonth = undefined;
    try { pinnedMember = group ? localStorage.getItem(pinKey(group)) : null; }
    catch { pinnedMember = null; }
  }
  renderMember(member, ledger, current);
  renderPriorities(admin, ledger, current);
  if (!member.hidden && selectedMonth !== undefined) showSpotlightDetail(selectedMonth, ledger, current, false);
};

const appendSpotlightCta = (output, label, onClick) => {
  if (typeof document.createElement !== 'function') return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'spotlight-detail-cta';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  output.append(' ', btn);
};

export const showSpotlightDetail = (index, ledger = createDuesLedger(getState(), { year: billingPeriod().year }), current = billingPeriod(), openPayment) => {
  const member = ledger.members.find(({ ang }) => ang.ID_Anggota === pinnedMember);
  const output = document.getElementById('spotlight-detail');
  if (!member || !output || getIsAdminView()) return;
  const isRepeatClick = openPayment === undefined && selectedMonth === index;
  const shouldOpen = openPayment === true || isRepeatClick;
  if (index !== 'pay') selectedMonth = index;
  document.querySelectorAll('[data-action="spotlight-month"]').forEach((button) => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.index) === index));
  });
  const nominal = (value) => {
    const span = document.createElement('span');
    span.className = 'nominal-val';
    span.textContent = formatDisplayRp(value);
    return span;
  };
  if (index === 'pay') {
    const payable = NAMA_BULAN.some((_, month) => ledger.getMonth(member.ang, month, current.year).remaining > 0);
    if (payable) openSelfPay(member.ang.ID_Anggota);
    else document.getElementById('spotlight-book').click();
    return;
  }
  const month = ledger.getMonth(member.ang, index, current.year);
  output.replaceChildren(`${NAMA_BULAN[index]} ${current.year} · ${getDuesDisplayStatus(month)}`);
  if (month.paid) output.append(' · Setoran ', nominal(month.paid));
  if (month.status === 'paid') {
    appendSpotlightCta(output, 'Lihat Struk →', () => openMonthReceipt(member.ang.ID_Anggota, index, current.year));
    if (shouldOpen) openMonthReceipt(member.ang.ID_Anggota, index, current.year);
  }
  if (month.owed && month.remaining) {
    output.append(' · Sisa ', nominal(month.remaining));
    appendSpotlightCta(output, 'Bayar Bulan Ini →', () => openSelfPay(member.ang.ID_Anggota, index, current.year));
    if (shouldOpen) openSelfPay(member.ang.ID_Anggota, index, current.year);
  }
  output.hidden = false;
};

export const setMemberPin = (id, focusPicker = false) => {
  const group = getActiveGroupId();
  if (!group || group !== lastGroup || getIsAdminView()) return;
  if (id && !getState().anggota.some((person) => person.ID_Anggota === id && person.Status_Aktif === 'Aktif')) return;
  pinnedMember = id;
  selectedMonth = undefined;
  try {
    if (pinnedMember) localStorage.setItem(pinKey(group), pinnedMember);
    else localStorage.removeItem(pinKey(group));
  } catch {}
  const current = billingPeriod();
  renderSpotlight(createDuesLedger(getState(), { year: current.year }), current);
  const pin = document.getElementById('passbook-pin');
  if (pin?.dataset.id) {
    const isPinned = pin.dataset.id === id;
    pin.setAttribute('aria-pressed', String(isPinned));
    document.getElementById('passbook-pin-label').textContent = isPinned ? 'Lepas' : 'Sematkan';
  }
  document.dispatchEvent(new Event('finkas:member-pin-changed'));
  document.querySelectorAll('.dues-pin-btn[aria-pressed="true"]').forEach((button) => {
    if (button.dataset.id !== pinnedMember) return;
    button.classList.remove('bouncing');
    void button.offsetWidth;
    button.classList.add('bouncing');
    const onPinBounceEnd = (event) => {
      if (event.target === button && event.animationName === 'pin-bounce') {
        button.classList.remove('bouncing');
        button.removeEventListener('animationend', onPinBounceEnd);
      }
    };
    button.addEventListener('animationend', onPinBounceEnd);
  });
  if (focusPicker) document.getElementById(pinnedMember ? 'spotlight-swap-select' : 'spotlight-picker')?.focus();
};

export const toggleMemberPin = (id) => setMemberPin(id === getPinnedMemberId() ? '' : id);

export const initSpotlight = () => {
  for (const id of ['spotlight-picker', 'spotlight-swap-select']) {
    document.getElementById(id)?.addEventListener('change', (event) => setMemberPin(event.target.value, true));
  }
  const months = document.getElementById('spotlight-months');
  months?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const pill = event.target?.closest?.('.mini-month-pill');
    if (!pill) return;
    const pills = Array.from(months.querySelectorAll('.mini-month-pill:not(:disabled)'));
    const idx = pills.indexOf(pill);
    if (idx < 0 || !pills.length) return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    pills[(idx + delta + pills.length) % pills.length]?.focus();
  });
};
