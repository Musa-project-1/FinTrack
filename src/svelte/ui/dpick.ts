import { closestHtml } from '../../core/utils.js';
/**
 * @module dpick
 * Hybrid Kinetic calendar date picker. Enhances `<input type="date" class="dpick">`
 * while keeping the native input in the DOM as the value/constraint source.
 * Uses native Popover API + CSS Anchor Positioning with automatic fallbacks.
 */

import { enhanceControl } from './control-a11y';
import { NAMA_BULAN } from '../../core/config.js';

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
interface DatePicker {
  input: HTMLInputElement;
  wrap: HTMLDivElement;
  field: HTMLButtonElement;
  label: HTMLSpanElement;
  pop: HTMLDivElement;
  ymBtn: HTMLButtonElement;
  ymText: HTMLSpanElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  weekdaysRow: HTMLDivElement;
  grid: HTMLDivElement;
  monthsGrid: HTMLDivElement;
  clearBtn: HTMLButtonElement;
  todayBtn: HTMLButtonElement;
  view: string;
  viewYear: number;
  viewMonth: number;
  placeholder: string;
  update?: ()=>void;
}

const registry = new Map<string, DatePicker>();

const isEn = () => document.body?.dataset?.lang === 'en';
const hasPopover = () => typeof HTMLElement !== 'undefined' && Object.hasOwn(HTMLElement.prototype, 'popover');
const hasAnchor = () => typeof CSS !== 'undefined' && Boolean(CSS.supports?.('position-area: block-end'));
const pad2 = (n: number) => String(n).padStart(2, '0');
const monthsList = () => (isEn() ? EN_MONTHS : NAMA_BULAN);

const copy = () => (isEn() ? {
  placeholder: 'Select date...',
  clear: 'Clear',
  today: 'Today',
  dialogLabel: 'Select Date',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  prevYear: 'Previous year',
  nextYear: 'Next year',
  days: DAYS_EN
} : {
  placeholder: 'Pilih tanggal...',
  clear: 'Kosongkan',
  today: 'Hari ini',
  dialogLabel: 'Pilih Tanggal',
  prevMonth: 'Bulan sebelumnya',
  nextMonth: 'Bulan berikutnya',
  prevYear: 'Tahun sebelumnya',
  nextYear: 'Tahun berikutnya',
  days: DAYS_ID
});

const parseIsoDate = (val: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((val || '').trim());
  if (!m) return null;
  const year = Number(m[1]), monthIdx = Number(m[2]) - 1, day = Number(m[3]);
  const dt = new Date(year, monthIdx, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== monthIdx || dt.getDate() !== day) return null;
  return { year, monthIdx, day };
};

const formatIsoDate = (y: number, mIdx: number, d: number) => `${y}-${pad2(mIdx + 1)}-${pad2(d)}`;

const todayParts = () => {
  const n = new Date();
  return { year: n.getFullYear(), monthIdx: n.getMonth(), day: n.getDate(), iso: formatIsoDate(n.getFullYear(), n.getMonth(), n.getDate()) };
};

const formatDisplayDate = (val: string, placeholder: string) => {
  const p = parseIsoDate(val);
  if (!p) return { text: placeholder, empty: true };
  return { text: `${p.day} ${monthsList()[p.monthIdx].slice(0, 3)} ${p.year}`, empty: false };
};

const positionFallbackPop = (ui: DatePicker) => {
  if (hasPopover() && hasAnchor()) return;
  const r = ui.field.getBoundingClientRect();
  const pw = Math.min(276, window.innerWidth - 20);
  const ph = ui.pop.offsetHeight || 312;
  if (window.innerWidth <= 520) {
    Object.assign(ui.pop.style, {
      position: 'fixed',
      left: `${Math.max(10, Math.round((window.innerWidth - pw) / 2))}px`,
      top: `${Math.max(12, Math.round((window.innerHeight - ph) / 2))}px`,
      margin: '0'
    });
    return;
  }
  const spaceBelow = window.innerHeight - r.bottom;
  const spaceAbove = r.top;
  const openUp = spaceBelow < ph + 14 && spaceAbove > spaceBelow;
  const top = openUp ? Math.max(8, r.top - ph - 6) : Math.min(window.innerHeight - ph - 8, r.bottom + 6);
  const left = Math.max(10, Math.min(window.innerWidth - pw - 10, r.right - pw));
  Object.assign(ui.pop.style, { position: 'fixed', left: `${Math.round(left)}px`, top: `${Math.round(top)}px`, margin: '0' });
};

const syncLabel = (ui: DatePicker) => {
  const ph = isEn() ? copy().placeholder : ui.placeholder;
  const { text, empty } = formatDisplayDate(ui.input.value, ph);
  ui.label.textContent = text;
  ui.label.classList.toggle('is-placeholder', empty);
};

const isOpen = (ui: DatePicker) => (hasPopover() ? ui.pop.matches(':popover-open') : !ui.pop.hidden);

const closePop = (ui: DatePicker) => {
  if (!isOpen(ui)) return;
  if (hasPopover()) {
    try { ui.pop.hidePopover(); } catch {}
  } else {
    ui.pop.hidden = true;
    ui.wrap.classList.remove('open');
    ui.field.setAttribute('aria-expanded', 'false');
  }
};

const openPop = (ui: DatePicker) => {
  if (ui.input.matches(':disabled') || isOpen(ui)) return;
  if (hasPopover()) {
    try { ui.pop.showPopover(); } catch {}
  } else {
    ui.view = 'days';
    const cur = parseIsoDate(ui.input.value);
    const t = cur || todayParts();
    ui.viewYear = t.year;
    ui.viewMonth = t.monthIdx;
    renderView(ui);
    ui.pop.hidden = false;
    ui.wrap.classList.add('open');
    ui.field.setAttribute('aria-expanded', 'true');
    positionFallbackPop(ui);
    focusDay(ui);
  }
};

const closeAll = (except: string | null = null) => {
  registry.forEach((ui, id) => { if (id !== except) closePop(ui); });
};

const pick = (ui: DatePicker, iso: string) => {
  if (ui.input.value !== iso) {
    ui.input.value = iso;
    ui.input.dispatchEvent(new Event('input', { bubbles: true }));
    ui.input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  syncLabel(ui);
  closePop(ui);
  ui.field.focus();
};

const focusDay = (ui: DatePicker, targetIso: string | null = null) => {
  const target = (targetIso && ui.grid.querySelector<HTMLButtonElement>(`[data-iso="${targetIso}"]`))
    || ui.grid.querySelector<HTMLButtonElement>('.dpick-day.is-selected')
    || ui.grid.querySelector<HTMLButtonElement>('.dpick-day.is-today')
    || ui.grid.querySelector<HTMLButtonElement>('.dpick-day:not(.is-outside)');
  target?.focus({ preventScroll: true });
};

const shiftViewMonth = (ui: DatePicker, delta: number) => {
  const next = new Date(ui.viewYear, ui.viewMonth + delta, 1);
  ui.viewYear = next.getFullYear();
  ui.viewMonth = next.getMonth();
};

const renderView = (ui: DatePicker) => {
  const c = copy();
  const months = monthsList();
  const inMonths = ui.view === 'months';
  ui.pop.setAttribute('aria-label', c.dialogLabel);
  ui.ymText.textContent = inMonths ? String(ui.viewYear) : `${months[ui.viewMonth]} ${ui.viewYear}`;
  ui.ymBtn.classList.toggle('is-months-open', inMonths);
  ui.ymBtn.setAttribute('aria-expanded', String(inMonths));
  ui.prevBtn.setAttribute('aria-label', inMonths ? c.prevYear : c.prevMonth);
  ui.nextBtn.setAttribute('aria-label', inMonths ? c.nextYear : c.nextMonth);
  ui.clearBtn.textContent = c.clear;
  ui.todayBtn.textContent = c.today;

  ui.weekdaysRow.hidden = inMonths;
  ui.grid.hidden = inMonths;
  ui.monthsGrid.hidden = !inMonths;

  if (inMonths) {
    ui.monthsGrid.innerHTML = '';
    const cur = parseIsoDate(ui.input.value);
    const frag = document.createDocumentFragment();
    months.forEach((name, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dpick-m';
      if (cur && cur.year === ui.viewYear && cur.monthIdx === idx) btn.classList.add('is-selected');
      btn.textContent = name.slice(0, 3);
      btn.title = name;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        ui.viewMonth = idx;
        ui.view = 'days';
        renderView(ui);
        focusDay(ui);
      });
      frag.appendChild(btn);
    });
    ui.monthsGrid.appendChild(frag);
    return;
  }

  ui.weekdaysRow.innerHTML = c.days.map((d) => `<span>${d}</span>`).join('');
  ui.grid.innerHTML = '';
  const firstDow = new Date(ui.viewYear, ui.viewMonth, 1).getDay();
  const selectedIso = parseIsoDate(ui.input.value) ? ui.input.value : '';
  const todayIso = todayParts().iso;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < 42; i++) {
    const dt = new Date(ui.viewYear, ui.viewMonth, i - firstDow + 1);
    const y = dt.getFullYear(), m = dt.getMonth(), d = dt.getDate();
    const iso = formatIsoDate(y, m, d);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dpick-day';
    btn.dataset.iso = iso;
    btn.textContent = String(d);
    btn.setAttribute('aria-label', `${d} ${months[m]} ${y}`);
    if (m !== ui.viewMonth) btn.classList.add('is-outside');
    if (iso === todayIso) { btn.classList.add('is-today'); btn.setAttribute('aria-current', 'date'); }
    if (iso === selectedIso) { btn.classList.add('is-selected'); btn.setAttribute('aria-pressed', 'true'); }
    btn.addEventListener('click', (e) => { e.stopPropagation(); pick(ui, iso); });
    frag.appendChild(btn);
  }
  ui.grid.appendChild(frag);
};

const handleGridKey = (ui: DatePicker, e: KeyboardEvent) => {
  const btn = closestHtml(e.target, '.dpick-day');
  if (!btn) return;
  const p = parseIsoDate(btn.dataset.iso ?? '');
  if (!p) return;
  const cur = new Date(p.year, p.monthIdx, p.day);
  let target: Date | null = null;
  if (e.key === 'ArrowLeft') target = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - 1);
  else if (e.key === 'ArrowRight') target = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  else if (e.key === 'ArrowUp') target = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - 7);
  else if (e.key === 'ArrowDown') target = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
  else if (e.key === 'Home') target = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - cur.getDay());
  else if (e.key === 'End') target = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + (6 - cur.getDay()));
  else if (e.key === 'PageUp') { shiftViewMonth(ui, -1); renderView(ui); focusDay(ui); e.preventDefault(); return; }
  else if (e.key === 'PageDown') { shiftViewMonth(ui, 1); renderView(ui); focusDay(ui); e.preventDefault(); return; }
  if (!target) return;
  e.preventDefault();
  ui.viewYear = target.getFullYear();
  ui.viewMonth = target.getMonth();
  renderView(ui);
  focusDay(ui, formatIsoDate(target.getFullYear(), target.getMonth(), target.getDate()));
};

const setup = (input: HTMLInputElement) => {
  if (!input?.parentNode || !input.id || input.dataset.dpickInit === '1') return;
  input.dataset.dpickInit = '1';
  const placeholder = input.getAttribute('data-placeholder') || 'Pilih tanggal...';
  const wrap = document.createElement('div');
  wrap.className = 'dpick';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const field = document.createElement('button');
  field.type = 'button';
  field.className = 'dpick-field';
  field.setAttribute('aria-haspopup', 'dialog');
  field.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.className = 'dpick-label';
  const calIcon = document.createElement('i');
  calIcon.className = 'ph ph-calendar-blank dpick-cal';
  calIcon.setAttribute('aria-hidden', 'true');
  field.append(label, calIcon);

  const pop = document.createElement('div');
  pop.className = 'dpick-pop';
  pop.id = `${input.id}-dpick-dialog`;
  pop.setAttribute('role', 'dialog');
  field.setAttribute('aria-controls', pop.id);

  if (hasPopover()) {
    pop.setAttribute('popover', 'auto');
    field.setAttribute('popovertarget', pop.id);
    const anchorToken = `--dpick-${input.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    field.style.anchorName = anchorToken;
    pop.style.positionAnchor = anchorToken;
  } else {
    pop.hidden = true;
  }

  const head = document.createElement('div');
  head.className = 'dpick-head';
  const ymBtn = document.createElement('button');
  ymBtn.type = 'button';
  ymBtn.className = 'dpick-ym-btn';
  const ymText = document.createElement('span');
  const ymCaret = document.createElement('i');
  ymCaret.className = 'ph-bold ph-caret-down dpick-ym-caret';
  ymCaret.setAttribute('aria-hidden', 'true');
  ymBtn.append(ymText, ymCaret);

  const navGroup = document.createElement('div');
  navGroup.className = 'dpick-nav-group';
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'dpick-nav';
  prevBtn.innerHTML = '<i class="ph-bold ph-caret-left" aria-hidden="true"></i>';
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'dpick-nav';
  nextBtn.innerHTML = '<i class="ph-bold ph-caret-right" aria-hidden="true"></i>';
  navGroup.append(prevBtn, nextBtn);
  head.append(ymBtn, navGroup);

  const weekdaysRow = document.createElement('div');
  weekdaysRow.className = 'dpick-weekdays';
  weekdaysRow.setAttribute('aria-hidden', 'true');
  const grid = document.createElement('div');
  grid.className = 'dpick-grid';
  const monthsGrid = document.createElement('div');
  monthsGrid.className = 'dpick-months';
  monthsGrid.hidden = true;

  const foot = document.createElement('div');
  foot.className = 'dpick-foot';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'dpick-link is-clear';
  const todayBtn = document.createElement('button');
  todayBtn.type = 'button';
  todayBtn.className = 'dpick-link is-today';
  foot.append(clearBtn, todayBtn);

  pop.append(head, weekdaysRow, grid, monthsGrid, foot);
  wrap.append(field, pop);

  const t = todayParts();
  const ui: DatePicker = {
    input, wrap, field, label, pop, ymBtn, ymText, prevBtn, nextBtn,
    weekdaysRow, grid, monthsGrid, clearBtn, todayBtn,
    view: 'days', viewYear: t.year, viewMonth: t.monthIdx, placeholder
  };
  registry.set(input.id, ui);

  const update = enhanceControl(input, field, wrap, () => syncLabel(ui), () => closePop(ui));
  ui.update = update;

  if (hasPopover()) {
    pop.addEventListener('toggle', (e) => {
      const opening = e.newState === 'open';
      ui.wrap.classList.toggle('open', opening);
      ui.field.setAttribute('aria-expanded', String(opening));
      if (opening) {
        ui.view = 'days';
        const cur = parseIsoDate(ui.input.value) || todayParts();
        ui.viewYear = cur.year;
        ui.viewMonth = cur.monthIdx;
        renderView(ui);
        positionFallbackPop(ui);
        focusDay(ui);
      }
    });
  } else {
    field.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isOpen(ui)) closePop(ui);
      else { closeAll(input.id); openPop(ui); }
    });
  }

  ymBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ui.view = ui.view === 'months' ? 'days' : 'months';
    renderView(ui);
    if (ui.view === 'months') (monthsGrid.querySelector<HTMLElement>('.is-selected') || monthsGrid.querySelector('button'))?.focus();
    else focusDay(ui);
  });
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.view === 'months') ui.viewYear -= 1;
    else shiftViewMonth(ui, -1);
    renderView(ui);
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ui.view === 'months') ui.viewYear += 1;
    else shiftViewMonth(ui, 1);
    renderView(ui);
  });
  grid.addEventListener('keydown', (e) => handleGridKey(ui, e));
  clearBtn.addEventListener('click', (e) => { e.stopPropagation(); pick(ui, ''); });
  todayBtn.addEventListener('click', (e) => { e.stopPropagation(); pick(ui, todayParts().iso); });
  pop.addEventListener('click', (e) => e.stopPropagation());
  wrap.addEventListener('focusout', (e) => {
    if (e.relatedTarget instanceof Node && !wrap.contains(e.relatedTarget)) closePop(ui);
  });
  if (!hasPopover()) {
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(ui); field.focus(); }
    });
  }
};

/** Wrap every `<input type="date" class="dpick">` on the page. Safe to call once. */
export const initDatePickers = () => {
  document.querySelectorAll('input.dpick').forEach(setup);
  document.addEventListener('finkas:language-changed', () => {
    registry.forEach((ui) => { syncLabel(ui); if (isOpen(ui)) renderView(ui); });
  });
  document.addEventListener('finkas:modal-opened', () => closeAll());
  if (!hasPopover()) {
    document.addEventListener('click', (e) => { if (!closestHtml(e.target, '.dpick')) closeAll(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  }
  window.addEventListener('resize', () => registry.forEach((ui) => {
    if (isOpen(ui) && !(hasPopover() && hasAnchor())) positionFallbackPop(ui);
  }));
};

/** Re-read native input value into custom trigger label after programmatic writes. */
export const syncDpick = (id: string | null = null) => {
  if (id) {
    registry.get(id)?.update?.();
    return;
  }
  registry.forEach((ui) => ui.update?.());
};
