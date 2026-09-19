/**
 * @module mpick
 * Universal custom month/year picker. Enhance any
 * <input class="mpick" value="YYYY-MM"> — the native input stays hidden
 * as the data source, so existing submit logic keeps working untouched.
 * Multiple instances per page are fully independent (registry by id).
 */

import { NAMA_BULAN } from '../core/config.js';

const SHORT = NAMA_BULAN.map((m) => m.slice(0, 3));

const registry = new Map();

const pad2 = (n) => String(n).padStart(2, '0');

const parseValue = (value) => {
  const m = /^(-?\d{4})-(\d{2})$/.exec(value || '');
  if (!m) return null;
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return { year: Number(m[1]), monthIdx };
};

const labelFor = (value, placeholder) => {
  const p = parseValue(value);
  if (!p) return { text: placeholder, empty: true };
  return { text: `${NAMA_BULAN[p.monthIdx]} ${p.year}`, empty: false };
};

const closeAll = (except = null) => {
  registry.forEach((ui, id) => {
    if (id !== except && ui.wrap.classList.contains('open')) setOpen(ui, false);
  });
};

const setOpen = (ui, open) => {
  ui.wrap.classList.toggle('open', open);
  ui.field.setAttribute('aria-expanded', open ? 'true' : 'false');
  ui.pop.hidden = !open;
  if (open) {
    renderGrid(ui);
  }
};

const renderGrid = (ui) => {
  ui.yearEl.textContent = String(ui.year);
  const current = parseValue(ui.input.value);
  ui.grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  SHORT.forEach((short, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mpick-m';
    btn.textContent = short;
    btn.title = NAMA_BULAN[idx];
    if (current && current.year === ui.year && current.monthIdx === idx) {
      btn.classList.add('selected');
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pick(ui, idx);
    });
    frag.appendChild(btn);
  });
  ui.grid.appendChild(frag);
};

const syncLabel = (ui) => {
  const { text, empty } = labelFor(ui.input.value, ui.placeholder);
  ui.label.textContent = text;
  ui.label.classList.toggle('is-placeholder', empty);
};

const pick = (ui, monthIdx) => {
  const next = `${ui.year}-${pad2(monthIdx + 1)}`;
  if (ui.input.value !== next) {
    ui.input.value = next;
    ui.input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  syncLabel(ui);
  setOpen(ui, false);
  ui.field.focus();
};

const setup = (input) => {
  if (!input.id || input.dataset.mpickInit === '1') return;
  input.dataset.mpickInit = '1';
  const placeholder = input.getAttribute('data-placeholder') || 'Pilih bulan...';

  const wrap = document.createElement('div');
  wrap.className = 'mpick';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const field = document.createElement('button');
  field.type = 'button';
  field.className = 'mpick-field';
  field.setAttribute('aria-haspopup', 'dialog');
  field.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.className = 'mpick-label';
  const calIcon = document.createElement('i');
  calIcon.className = 'ph ph-calendar-blank mpick-cal';
  calIcon.setAttribute('aria-hidden', 'true');
  field.appendChild(label);
  field.appendChild(calIcon);

  const pop = document.createElement('div');
  pop.className = 'mpick-pop';
  pop.hidden = true;

  const head = document.createElement('div');
  head.className = 'mpick-head';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'mpick-nav';
  prev.setAttribute('aria-label', 'Tahun sebelumnya');
  prev.innerHTML = '<i class="ph-bold ph-caret-left"></i>';
  const yearEl = document.createElement('strong');
  yearEl.className = 'mpick-year';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'mpick-nav';
  next.setAttribute('aria-label', 'Tahun berikutnya');
  next.innerHTML = '<i class="ph-bold ph-caret-right"></i>';
  head.appendChild(prev);
  head.appendChild(yearEl);
  head.appendChild(next);

  const grid = document.createElement('div');
  grid.className = 'mpick-grid';

  const foot = document.createElement('div');
  foot.className = 'mpick-foot';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'mpick-link';
  clearBtn.textContent = 'Clear';
  const thisBtn = document.createElement('button');
  thisBtn.type = 'button';
  thisBtn.className = 'mpick-link';
  thisBtn.textContent = 'This month';
  foot.appendChild(clearBtn);
  foot.appendChild(thisBtn);

  pop.appendChild(head);
  pop.appendChild(grid);
  pop.appendChild(foot);

  wrap.appendChild(field);
  wrap.appendChild(pop);

  const now = new Date();
  const ui = {
    input, wrap, field, label, pop, grid, yearEl,
    year: now.getFullYear(), placeholder,
  };
  registry.set(input.id, ui);

  const start = parseValue(input.value);
  if (start) ui.year = start.year;
  syncLabel(ui);

  field.addEventListener('click', (e) => {
    e.stopPropagation();
    const parsed = parseValue(input.value);
    ui.year = parsed ? parsed.year : new Date().getFullYear();
    const willOpen = !wrap.classList.contains('open');
    closeAll(input.id);
    setOpen(ui, willOpen);
  });

  prev.addEventListener('click', (e) => { e.stopPropagation(); ui.year -= 1; renderGrid(ui); });
  next.addEventListener('click', (e) => { e.stopPropagation(); ui.year += 1; renderGrid(ui); });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.input.value !== '') {
      ui.input.value = '';
      ui.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    syncLabel(ui);
    setOpen(ui, false);
    field.focus();
  });

  thisBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const t = new Date();
    ui.year = t.getFullYear();
    pick(ui, t.getMonth());
  });

  pop.addEventListener('click', (e) => e.stopPropagation());
};

/** Wrap every input.mpick on the page. Safe to call once. */
export const initMonthPickers = () => {
  document.querySelectorAll('input.mpick').forEach(setup);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mpick')) closeAll();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
  window.addEventListener('resize', () => closeAll());
};

/** Re-read a hidden input value into its picker label. */
const syncMpick = (id = null) => {
  if (id) {
    const ui = registry.get(id);
    if (ui) syncLabel(ui);
    return;
  }
  registry.forEach(syncLabel);
};
