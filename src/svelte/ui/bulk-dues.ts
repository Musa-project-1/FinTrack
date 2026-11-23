import { NAMA_BULAN } from 'finkas/core/config';
import { createDuesLedger } from 'finkas/core/dues';
import { getActiveGroupId, getIsAdminView, getState } from 'finkas/core/state';
import { htmlElements, closestHtml, formatRp, showToast } from 'finkas/core/utils';

const cellSelector = '[data-bulk-month]';
const selected = new Set<string>();
let active = false;
let period: { month: number; year: number; amount: number; group: ReturnType<typeof getActiveGroupId> } | undefined;
let drag: { pointerId: number; cell: HTMLElement; x: number; y: number; moved: boolean; last?: HTMLElement } | undefined;
let suppressClick = false;

export const syncBulkDues = () => {
  if (!active) return;
  updateBulkUI();
};

const updateBulkUI = () => {
  const dock = document.getElementById('bulk-dock');
  if (!dock) return;
  if (!getIsAdminView() || (period && period.group !== getActiveGroupId())) clearSelection();
  const matrix = document.getElementById('workspace-iuran');
  if (!matrix) return;
  const selecting = active && getIsAdminView();
  matrix.classList.toggle('bulk-selecting', selecting);
  dock.hidden = !selecting;
  document.querySelectorAll('[data-action="bulk-toggle"][aria-pressed]').forEach((button) => {
    button.setAttribute('aria-pressed', String(selecting));
  });
  const status = document.getElementById('bulk-status');
  if (status) status.textContent = period
    ? `${selected.size} anggota · ${NAMA_BULAN[period.month]} ${period.year} · ${formatRp(period.amount)} per anggota`
    : 'Pilih sel yang belum lunas. Satu bulan dan nominal sisa yang sama per pembayaran.';
  const review = dock.querySelector<HTMLButtonElement>('[data-action="bulk-review"]');
  if (review) review.disabled = selected.size === 0;
  htmlElements(cellSelector, matrix).forEach((cell) => {
    const checked = Boolean(selecting && period && cell.dataset.bulkMonth === String(period.month) &&
      cell.dataset.bulkYear === String(period.year) && selected.has(cell.dataset.anggota ?? ''));
    cell.classList.toggle('bulk-cell-selected', checked);
    if (selecting) cell.setAttribute('aria-pressed', String(checked));
    else cell.removeAttribute('aria-pressed');
  });
};

const clearSelection = () => {
  active = false;
  period = undefined;
  drag = undefined;
  selected.clear();
};

const selectCell = (cell: HTMLElement | null, toggle: boolean) => {
  if (!cell || !getIsAdminView() || !getActiveGroupId()) return;
  const { anggota, bulkMonth, bulkYear, bulkRemaining } = cell.dataset;
  const month = Number(bulkMonth);
  const year = Number(bulkYear);
  const amount = Number(bulkRemaining);
  if (!anggota || !amount) return;

  active = true;
  if (period && (period.month !== month || period.year !== year || period.amount !== amount)) {
    if (toggle) showToast('Pilih anggota pada bulan dan sisa iuran yang sama untuk satu pembayaran.', 'info');
    return;
  }

  period ||= { month, year, amount, group: getActiveGroupId() };
  if (selected.has(anggota) && toggle) selected.delete(anggota);
  else selected.add(anggota);
  if (selected.size === 0) period = undefined;
  updateBulkUI();
};

export const toggleBulkMode = (switchWorkspace: (tab: 'iuran') => void) => {
  if (!getIsAdminView()) return;
  if (active) clearSelection();
  else {
    active = true;
    switchWorkspace('iuran');
    (document.getElementById('workspace-iuran') as HTMLElement).scrollIntoView({ block: 'start' });
  }
  updateBulkUI();
};

export const reviewBulkDues = (bukaModalTransaksi: (selection: { month: number; year: number; amount: number; memberIds: string[] }) => void) => {
  if (!getIsAdminView() || !period || period.group !== getActiveGroupId()) return;
  const { month, year, amount } = period;
  const ledger = createDuesLedger(getState(), { year });
  const valid = ledger.members.filter(({ ang }) => {
    const current = ledger.getMonth(ang, month, year);
    return selected.has(ang.ID_Anggota) && current.owed && current.remaining === amount;
  }).map(({ ang }) => ang.ID_Anggota);
  if (valid.length !== selected.size) {
    selected.clear();
    valid.forEach((id) => selected.add(id));
    if (selected.size === 0) period = undefined;
    syncBulkDues();
    showToast('Status iuran berubah. Periksa pilihan kembali.', 'info');
    return;
  }
  bukaModalTransaksi({ month, year, amount, memberIds: valid });
  clearSelection();
  updateBulkUI();
};

export const initBulkDues = () => {
  const matrix = document.getElementById('workspace-iuran');
  if (!matrix) return;
  const cellAtPointer = (event: PointerEvent) => document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(cellSelector);

  matrix.addEventListener('click', (event) => {
    const cell = closestHtml(event.target, cellSelector);
    if (!getIsAdminView() || (!active && !event.shiftKey) || (!cell && !suppressClick)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!suppressClick) selectCell(cell, true);
    suppressClick = false;
  }, true);

  matrix.addEventListener('pointerdown', (event) => {
    const cell = closestHtml(event.target, cellSelector);
    suppressClick = false;
    if (cell && active && getIsAdminView() && event.isPrimary && event.button === 0) {
      drag = { pointerId: event.pointerId, cell, x: event.clientX, y: event.clientY, moved: false };
    }
  });

  document.addEventListener('pointermove', (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      selectCell(drag.cell, false);
    }
    const cell = cellAtPointer(event);
    if (cell && cell !== drag.last) {
      drag.last = cell;
      selectCell(cell, false);
    }
  });

  document.addEventListener('pointerup', (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    suppressClick = drag.moved;
    drag = undefined;
    if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
  });
  document.addEventListener('pointercancel', (event) => {
    if (drag?.pointerId === event.pointerId) drag = undefined;
  });
  window.addEventListener('finkas:group-changed', () => {
    if (!active) return;
    clearSelection();
    updateBulkUI();
  });
};
