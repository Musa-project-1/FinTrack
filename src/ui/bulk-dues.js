import { NAMA_BULAN } from '../core/config.js';
import { createDuesLedger } from '../core/dues.js';
import { getActiveGroupId, getIsAdminView, getState } from '../core/state.js';
import { formatRp, showToast } from '../core/utils.js';

const cellSelector = '[data-bulk-month]';
const selected = new Set();
let active = false;
let period;
let drag;
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
  const selecting = active && getIsAdminView();
  matrix.classList.toggle('bulk-selecting', selecting);
  dock.hidden = !selecting;
  document.querySelectorAll('[data-action="bulk-toggle"][aria-pressed]').forEach((button) => {
    button.setAttribute('aria-pressed', String(selecting));
  });
  document.getElementById('bulk-status').textContent = period
    ? `${selected.size} anggota · ${NAMA_BULAN[period.month]} ${period.year} · ${formatRp(period.amount)} per anggota`
    : 'Pilih sel yang belum lunas. Satu bulan dan nominal sisa yang sama per pembayaran.';
  dock.querySelector('[data-action="bulk-review"]').disabled = selected.size === 0;
  matrix.querySelectorAll(cellSelector).forEach((cell) => {
    const checked = Boolean(selecting && period && cell.dataset.bulkMonth === String(period.month) &&
      cell.dataset.bulkYear === String(period.year) && selected.has(cell.dataset.anggota));
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

const selectCell = (cell, toggle) => {
  if (!cell || !getIsAdminView() || !getActiveGroupId()) return;
  const { anggota, bulkMonth, bulkYear, bulkRemaining } = cell.dataset;
  const month = Number(bulkMonth);
  const year = Number(bulkYear);
  const amount = Number(bulkRemaining);
  if (!amount) return;

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

export const toggleBulkMode = (switchWorkspace) => {
  if (!getIsAdminView()) return;
  if (active) clearSelection();
  else {
    active = true;
    switchWorkspace('iuran');
    document.getElementById('workspace-iuran').scrollIntoView({ block: 'start' });
  }
  updateBulkUI();
};

export const reviewBulkDues = (bukaModalTransaksi) => {
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
  const cellAtPointer = (event) => document.elementFromPoint(event.clientX, event.clientY)?.closest(cellSelector);

  matrix.addEventListener('click', (event) => {
    const cell = event.target.closest(cellSelector);
    if (!getIsAdminView() || (!active && !event.shiftKey) || (!cell && !suppressClick)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!suppressClick) selectCell(cell, true);
    suppressClick = false;
  }, true);

  matrix.addEventListener('pointerdown', (event) => {
    const cell = event.target.closest(cellSelector);
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
