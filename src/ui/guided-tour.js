import { getActiveGroupId, getIsAdminView } from '../core/state.js';
import { getActiveModalId, openModal, closeModal } from './modal.js';
import { switchWorkspace } from './workspace.js';

const seenKey = 'finkas_tour_seen_v1';
const seenThisPage = new Set();
let step = 0;
let activeGroup;
let timer;
let frame;

const readSeen = () => {
  try {
    const data = JSON.parse(localStorage.getItem(seenKey) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const markSeen = (group) => {
  if (!group) return;
  seenThisPage.add(group);
  try { localStorage.setItem(seenKey, JSON.stringify([...new Set([...readSeen(), group])])); }
  catch {}
};

const stepsForRole = () => {
  const admin = getIsAdminView();
  return [
    ['.bento-balance', 'Ringkasan Saldo & Tren', 'Lihat saldo aktif dan geser penanda grafik untuk memeriksa saldo setiap bulan.'],
    [admin ? '#admin-priorities' : '#member-spotlight', admin ? 'Tunggakan Prioritas' : 'Kartu Pantauan Pribadi',
      admin ? 'Lunasi iuran bulan berjalan atau pilih beberapa sel untuk pembayaran massal.' : 'Sematkan nama untuk memeriksa status 12 bulan dan membuka kalkulator iuran.'],
    ['.dues-status-help', 'Status dan Arsip Tahun', 'Gunakan pilihan tahun untuk membuka arsip. Arti Status menjelaskan Lunas, Sebagian, Belum, Nanti, dan Libur.'],
    [admin ? '[data-action="nav-catat"], .group-overview-actions [data-action="buka-transaksi"]' : '#kasi-fab, [data-action="spotlight-pay"]',
      admin ? 'Catat Kas & Iuran Massal' : 'Kasi dan Bayar Mandiri',
      admin ? 'Catat setoran, pemasukan, dan pengeluaran melalui formulir kas grup.' : 'Elus Kasi atau buka Bayar Iuran untuk menghitung transfer dan menyiapkan pesan WhatsApp.'],
    ['.workspace-tabs', 'Tiga Tampilan Buku Kas', 'Berpindah antara Status Iuran, Riwayat Arus Kas, dan Kesehatan & Grafik Kas.']
  ];
};

const findTarget = (selector) => Array.from(document.querySelectorAll(selector))
  .find((element) => element.getClientRects().length) || document.querySelector('.workspace-tabs');

const placeTour = () => {
  frame = undefined;
  const dialog = document.getElementById('modal-guided-tour');
  if (!dialog?.open) return;
  const [selector] = stepsForRole()[step];
  const target = findTarget(selector);
  const rect = target.getBoundingClientRect();
  const headerBottom = document.querySelector('.hybrid-topbar')?.getBoundingClientRect().bottom || 58;
  const top = Math.max(headerBottom + 4, Math.min(innerHeight - 8, rect.top - 5));
  const left = Math.max(4, rect.left - 5);
  const width = Math.max(0, Math.min(innerWidth - left - 4, rect.right - left + 5));
  const height = Math.max(0, Math.min(innerHeight - 4, rect.bottom + 5) - top);
  const highlight = dialog.querySelector('.guided-tour-highlight');
  for (const [name, value] of Object.entries({ top, left, width, height })) highlight.style[name] = `${value}px`;
  const card = dialog.querySelector('.guided-tour-card');
  const cardHeight = card.offsetHeight;
  const below = top + height + 12;
  const above = top - cardHeight - 12;
  const minimum = 8;
  const maximum = Math.max(minimum, innerHeight - cardHeight - 12);
  const preferred = below <= maximum ? below : above;
  card.style.top = `${Math.max(minimum, Math.min(preferred, maximum))}px`;
  card.style.left = `${Math.max(8, Math.min(left, innerWidth - card.offsetWidth - 8))}px`;
};

const queuePlacement = () => {
  if (!frame) frame = requestAnimationFrame(placeTour);
};

const renderStep = () => {
  const steps = stepsForRole();
  const [selector, title, description] = steps[step];
  if (step === 2) switchWorkspace('iuran');
  const dialog = document.getElementById('modal-guided-tour');
  const heading = document.getElementById('guided-tour-title');
  heading.textContent = title;
  document.getElementById('guided-tour-count').textContent = `Langkah ${step + 1} dari ${steps.length}`;
  document.getElementById('guided-tour-description').textContent = description;
  dialog.querySelector('[data-step="back"]').hidden = step === 0;
  dialog.querySelector('[data-step="next"]').textContent = step === steps.length - 1 ? 'Selesai' : 'Lanjut';
  const target = findTarget(selector);
  const rect = target.getBoundingClientRect();
  if (rect.top < 72 || rect.bottom > innerHeight - 78) target.scrollIntoView({ block: 'center', behavior: 'instant' });
  placeTour();
  heading.focus({ preventScroll: true });
};

export const startGuidedTour = () => {
  if (!getActiveGroupId()) return;
  if (getActiveModalId() === 'modal-faq') closeModal('modal-faq');
  if (getActiveModalId()) return;
  activeGroup = getActiveGroupId();
  step = 0;
  openModal('modal-guided-tour');
  renderStep();
};

export const advanceGuidedTour = (action) => {
  if (!document.getElementById('modal-guided-tour')?.open) return;
  if (action === 'skip' || (action === 'next' && step === stepsForRole().length - 1)) {
    closeModal('modal-guided-tour');
    return;
  }
  step = Math.max(0, step + (action === 'next' ? 1 : -1));
  renderStep();
};

export const initGuidedTour = () => {
  const dialog = document.getElementById('modal-guided-tour');
  if (!dialog) return;
  dialog.addEventListener('close', () => {
    markSeen(activeGroup);
    activeGroup = undefined;
  });
  document.addEventListener('scroll', () => { if (dialog.open) queuePlacement(); }, { passive: true });
  window.addEventListener('resize', () => { if (dialog.open) queuePlacement(); });

  const schedule = () => {
    clearTimeout(timer);
    const group = getActiveGroupId();
    if (!group || activeGroup || seenThisPage.has(group) || readSeen().includes(group)) return;
    timer = setTimeout(() => {
      if (group !== getActiveGroupId()) return;
      if (getActiveModalId()) {
        schedule();
        return;
      }
      startGuidedTour();
    }, 650);
  };
  document.addEventListener('finkas:state-changed', schedule);
};
