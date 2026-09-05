import { NAMA_BULAN } from "../config.js";
import { getState, currentHistoryFilter, setCurrentHistoryFilter, setItemsToShow } from "../state.js";
import { openModal, closeModal } from "../modal.js";
import { renderTableTransaksi, renderTableRekap } from "../render.js";

/* ── Bottom nav helpers ────────────────────────────────────────── */

export const setBottomNavActive = (action) => {
  document.querySelectorAll('.bottom-nav-item').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-action') === action);
  });
};

export const closeActiveModal = () => {
  const active = document.querySelector('.modal-overlay.active');
  if (active) closeModal(active.id);
};

/* ══════════════════════════════════════════════════════════════════
   ADMIN UI MANAGEMENT
   ══════════════════════════════════════════════════════════════════ */


export const setHistoryFilter = (filter, btn) => {
  setCurrentHistoryFilter(filter);
  document.querySelectorAll('#history-filter-chips .chip-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  setItemsToShow(20);
  renderTableTransaksi();
};

/* ── Quick presets: Bulan Ini / Bulan Lalu / Semua Waktu ───────── */

export const clearRiwayatPresetHighlight = () => {
  document.querySelectorAll('#history-filter-chips [data-preset]').forEach((b) => b.classList.remove('active'));
};

export const applyRiwayatPreset = (preset, btn) => {
  const now = new Date();
  let year = now.getFullYear();
  let monthIdx = now.getMonth();
  if (preset === 'last-month') {
    monthIdx -= 1;
    if (monthIdx < 0) { monthIdx = 11; year -= 1; }
  }

  const bulanSel = document.getElementById('filter-bulan');
  const tahunSel = document.getElementById('filter-tahun');
  if (!bulanSel || !tahunSel) return;

  if (preset === 'all-time') {
    bulanSel.value = 'all';
    tahunSel.value = 'all';
  } else {
    const yearStr = String(year);
    if (!Array.from(tahunSel.options).some((o) => o.value === yearStr)) {
      const opt = document.createElement('option');
      opt.value = yearStr;
      opt.text = yearStr;
      tahunSel.appendChild(opt);
    }
    bulanSel.value = String(monthIdx);
    tahunSel.value = yearStr;
  }

  clearRiwayatPresetHighlight();
  btn.classList.add('active');
  setItemsToShow(20);
  renderTableTransaksi();
};

/* ══════════════════════════════════════════════════════════════════
   SEARCH LISTENERS
   ══════════════════════════════════════════════════════════════════ */

let rekapSearchTimer = null;
export const setupRekapSearchListener = () => {
  const inputs = [
    document.getElementById('search-member-rekap'),
    document.getElementById('search-member-rekap-mobile')
  ].filter(Boolean);

  inputs.forEach((input) => {
    input.addEventListener('input', (e) => {
      // Keep desktop & mobile search inputs synchronized
      inputs.forEach((other) => { if (other !== input) other.value = input.value; });
      clearTimeout(rekapSearchTimer);
      rekapSearchTimer = setTimeout(() => renderTableRekap(), 150);
    });
  });
};

/* ══════════════════════════════════════════════════════════════════
   QUICK PAY (BOTTOM SHEET)
   ══════════════════════════════════════════════════════════════════ */

