import { closestHtml } from '../core/utils.js';
/**
 * @module cdrop
 * Premium custom dropdown that enhances native <select class="cdrop">.
 * The native select stays as the data source (hidden) so every existing
 * populate/submit/change logic keeps working untouched.
 */

import { enhanceControl } from './control-a11y.js';

const registry = new Map();

const closeAll = (except = null) => {
  registry.forEach((ui, id) => {
    if (id !== except && ui.wrap.classList.contains('open')) setOpen(ui, false);
  });
};

const setOpen = (ui, open) => {
  if (open && ui.select.matches(':disabled')) return;
  ui.wrap.classList.toggle('open', open);
  ui.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  ui.list.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) {
    // Open upward when space below is tight and space above has more room
    const rect = ui.wrap.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const isPill = ui.wrap.closest('.year-pill');
    ui.wrap.classList.toggle('cdrop--up', !isPill && spaceBelow < 260 && spaceAbove > spaceBelow);
    if (isPill) {
      ui.list.style.left = 'auto';
      ui.list.style.right = '0';
      ui.list.style.minWidth = '112px';
    } else {
      // Align popup to trigger while keeping it inside the horizontal viewport bounds
      const parentRect = ui.list.offsetParent
        ? ui.list.offsetParent.getBoundingClientRect()
        : { left: 0 };
      const btnRect = ui.btn.getBoundingClientRect();
      const desiredLeft = Math.max(0, btnRect.left - parentRect.left);
      const clampedLeft = window.innerWidth > 0 && btnRect.width > 0
        ? Math.min(desiredLeft, Math.max(0, window.innerWidth - parentRect.left - btnRect.width - 8))
        : desiredLeft;
      ui.list.style.left = `${clampedLeft}px`;
      ui.list.style.right = 'auto';
      ui.list.style.minWidth = `${btnRect.width}px`;
    }
    if (ui.searchInput) {
      ui.searchInput.value = '';
      filterItems(ui, '');
      setTimeout(() => { if (ui.wrap.classList.contains('open')) ui.searchInput.focus(); }, 30);
    }
    highlightSelected(ui);
    if (!ui.searchInput) {
      const selected = ui.itemsBox.querySelector('.selected:not(:disabled)');
      (selected || ui.itemsBox.querySelector('.cdrop-item:not(:disabled)'))?.focus();
    }
  } else if (ui.searchInput) {
    ui.searchInput.value = '';
    filterItems(ui, '');
  }
};

const renderItems = (ui) => {
  const opts = Array.from(ui.select.options);
  ui.itemsBox.innerHTML = '';
  if (opts.length === 0) {
    ui.itemsBox.innerHTML = '<div class="cdrop-empty">Tidak ada pilihan.</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  opts.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cdrop-item';
    btn.id = `${ui.select.id}-option-${index}`;
    btn.setAttribute('role', 'option');
    btn.dataset.value = opt.value;
    btn.tabIndex = -1;
    btn.disabled = opt.disabled || opt.parentElement.disabled;
    btn.setAttribute('aria-disabled', String(btn.disabled));
    btn.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
    if (opt.selected) btn.classList.add('selected');
    const label = document.createElement('span');
    label.textContent = opt.text;
    btn.appendChild(label);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pick(ui, opt.value);
    });
    frag.appendChild(btn);
  });
  ui.itemsBox.appendChild(frag);
};

const syncValue = (ui) => {
  const selected = ui.select.selectedOptions[0];
  const label = selected ? selected.text : '';
  const isPlaceholder = !ui.select.value;
  ui.val.textContent = label;
  ui.val.classList.toggle('is-placeholder', isPlaceholder);
  ui.itemsBox.querySelectorAll('.cdrop-item').forEach((item) => {
    const active = item.dataset.value === ui.select.value;
    item.classList.toggle('selected', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
  });
};

const highlightSelected = (ui) => {
  const sel = ui.itemsBox.querySelector('.cdrop-item.selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
};

const filterItems = (ui, query) => {
  const q = query.trim().toLowerCase();
  ui.searchInput?.removeAttribute('aria-activedescendant');
  let visible = 0;
  ui.itemsBox.querySelectorAll('.cdrop-item').forEach((item) => {
    const hit = q === '' || item.textContent.toLowerCase().includes(q);
    item.style.display = hit ? '' : 'none';
    item.classList.remove('highlight');
    if (hit) visible += 1;
  });
  let empty = ui.itemsBox.querySelector('.cdrop-empty');
  if (visible === 0 && !empty) {
    empty = document.createElement('div');
    empty.className = 'cdrop-empty';
    empty.textContent = 'Tidak ditemukan.';
    ui.itemsBox.appendChild(empty);
  } else if (visible > 0 && empty) {
    empty.remove();
  }
};

const pick = (ui, value) => {
  const option = Array.from(ui.select.options).find(opt => opt.value === value);
  if (ui.select.matches(':disabled') || !option || option.disabled || option.parentElement.disabled) return;
  if (ui.select.value !== value) {
    ui.select.value = value;
    ui.select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  syncValue(ui);
  setOpen(ui, false);
  ui.btn.focus();
};

const setup = (select) => {
  if (!select.id || select.dataset.cdropInit === '1') return;
  select.dataset.cdropInit = '1';

  const wrap = document.createElement('div');
  wrap.className = 'cdrop';
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cdrop-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  const val = document.createElement('span');
  val.className = 'cdrop-val';
  const chevron = document.createElement('span');
  chevron.className = 'cdrop-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  btn.appendChild(val);
  btn.appendChild(chevron);

  const list = document.createElement('div');
  list.className = 'cdrop-list';
  list.id = `${select.id}-listbox`;
  btn.setAttribute('aria-controls', list.id);
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-hidden', 'true');

  const itemsBox = document.createElement('div');
  itemsBox.className = 'cdrop-items';

  /** @type {HTMLInputElement | null} */
  let searchInput = null;
  if (select.hasAttribute('data-search')) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'cdrop-search';
    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.setAttribute('role', 'combobox');
    searchInput.setAttribute('aria-controls', list.id);
    searchInput.setAttribute('aria-expanded', 'true');
    searchInput.setAttribute('aria-autocomplete', 'list');
    if (select.id) {
      searchInput.id = `${select.id}-search`;
      searchInput.name = `${select.id}-search`;
    }
    searchInput.placeholder = 'Cari...';
    searchInput.setAttribute('aria-label', 'Cari pilihan');
    searchInput.addEventListener('input', () => filterItems(ui, searchInput?.value || ''));
    searchInput.addEventListener('click', (e) => e.stopPropagation());
    searchInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(ui, false);
        btn.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveHighlight(ui, e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const hl = /** @type {HTMLElement|null} */ (itemsBox.querySelector('.cdrop-item.highlight'));
        const first = Array.from(/** @type {NodeListOf<HTMLButtonElement>} */ (itemsBox.querySelectorAll('.cdrop-item'))).find((i) => i.style.display !== 'none' && !i.disabled);
        if (hl) pick(ui, hl.dataset.value);
        else if (first) pick(ui, first.dataset.value);
      }
    });
    searchWrap.appendChild(searchInput);
    list.appendChild(searchWrap);
  }
  list.appendChild(itemsBox);

  wrap.appendChild(btn);
  wrap.appendChild(list);

  const ui = { select, wrap, btn, val, list, itemsBox, searchInput };
  registry.set(select.id, ui);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (select.matches(':disabled')) return;
    const willOpen = !wrap.classList.contains('open');
    closeAll(select.id);
    setOpen(ui, willOpen);
  });

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      closeAll(select.id);
      setOpen(ui, true);
      if (!searchInput) moveHighlight(ui, e.key === 'ArrowDown' ? 1 : -1);
    }
  });
  list.addEventListener('keydown', (e) => {
    if (e.target === searchInput) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(ui, e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      const item = closestHtml(e.target, '.cdrop-item');
      if (item) { e.preventDefault(); pick(ui, item.dataset.value); }
    }
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(ui, false); btn.focus(); }
    if (e.key === 'Tab') setOpen(ui, false);
  });
  wrap.addEventListener('focusout', () => {
    setTimeout(() => { if (!wrap.contains(document.activeElement)) setOpen(ui, false); }, 0);
  });
  ui.update = enhanceControl(select, btn, wrap, () => {
    renderItems(ui);
    syncValue(ui);
    list.setAttribute('aria-required', String(select.required));
    for (const attr of ['aria-label', 'aria-labelledby']) {
      if (btn.hasAttribute(attr)) list.setAttribute(attr, btn.getAttribute(attr) || '');
      else list.removeAttribute(attr);
    }
  }, () => setOpen(ui, false));
};

const moveHighlight = (ui, dir) => {
  const visible = Array.from(ui.itemsBox.querySelectorAll('.cdrop-item')).filter((i) => i.style.display !== 'none' && !i.disabled);
  if (visible.length === 0) return;
  let idx = visible.findIndex((i) => i.classList.contains('highlight'));
  if (idx === -1 && !ui.searchInput) idx = visible.findIndex(i => i === document.activeElement);
  idx = idx === -1 ? (dir === 1 ? 0 : visible.length - 1) : (idx + dir + visible.length) % visible.length;
  visible.forEach((i) => i.classList.remove('highlight'));
  visible[idx].classList.add('highlight');
  if (!ui.searchInput) visible[idx].focus();
  else ui.searchInput.setAttribute('aria-activedescendant', visible[idx].id);
  visible[idx].scrollIntoView({ block: 'nearest' });
};

/** Wrap every native select.cdrop on the page. Safe to call once. */
export const initCustomDropdowns = () => {
  document.querySelectorAll('select.cdrop').forEach(setup);
  document.addEventListener('click', (e) => {
    if (!closestHtml(e.target, '.cdrop')) closeAll();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
  // Measured alignment goes stale on layout change, so just close.
  window.addEventListener('resize', () => closeAll());
};

/** Re-read native select state into the custom UI. Call after programmatic .value sets. */
export const syncCdrop = (id = /** @type {string | null} */ (null)) => {
  if (id) {
    const ui = registry.get(id);
    if (ui) {
      ui.update();
    }
    return;
  }
  registry.forEach((ui) => {
    ui.update();
  });
};
