/**
 * @module modal
 * Modal open/close, tab switching, and dialog interactions.
 */

import { promoteToastLayer } from '../core/utils.js';

export {
  filterKategori, updateCounterOps, updateCounterIuran, pilihSemuaIuran,
  renderCheckboxIuran, filterAnggotaIuran, updateEditDelta
} from './transaction-form.js';

/* ── Modal open / close ────────────────────────────────────────── */

const activeModalStack = [];
const boundDialogs = new WeakSet();
const duesExitAnimations = new WeakMap();

export const getActiveModalId = () => activeModalStack.at(-1)?.id;

const finishClose = (el) => {
  const index = activeModalStack.indexOf(el);
  if (index === -1) return;
  activeModalStack.splice(index, 1);
  el.classList.remove('active');
  if (el.id === 'modal-confirm-action') pendingConfirmAction = null;
  if (!activeModalStack.length) {
    document.body.classList.remove('modal-open');
    const panel = document.querySelector?.('.workspace-tabs [aria-selected="true"]')?.dataset?.panel;
    const action = { history: 'nav-riwayat', stats: 'nav-stats' }[panel] || 'nav-rekap';
    document.querySelectorAll('.bottom-nav-item').forEach((b) => {
      const active = b.getAttribute('data-action') === action;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current', 'location');
      else b.removeAttribute('aria-current');
    });
  }
};

const bindDialog = (el) => {
  if (boundDialogs.has(el)) return;
  boundDialogs.add(el);
  el.addEventListener('cancel', (event) => {
    // Native cancel targets the top-layer dialog; route it through shared cleanup.
    event.preventDefault();
    if (getActiveModalId() === el.id) closeModal(el.id);
  });
  el.addEventListener('close', () => {
    // close events are queued: an older event must not clean up a reopened dialog.
    if (!el.open) finishClose(el);
  });
  let pressedOverlay = false;
  el.addEventListener('pointerdown', (event) => {
    pressedOverlay = event.target === el;
  });
  el.addEventListener('pointercancel', () => { pressedOverlay = false; });
  el.addEventListener('click', (event) => {
    // The dialog fills the viewport; its empty area is the visual backdrop.
    // Require the press outside too, so a drag out of the content cannot dismiss.
    if (pressedOverlay && event.target === el && getActiveModalId() === el.id) {
      closeModal(el.id);
    }
    pressedOverlay = false;
  });
};

/** Open a native modal by its element ID. */
export const openModal = (id) => {
  closeMobileMenu();
  if (id !== 'modal-menu') closeModal('modal-menu');
  const el = document.getElementById(id);
  if (!el) {
    console.error('openModal: Element not found with id:', id);
    return;
  }
  if (el.open) {
    duesExitAnimations.delete(el);
    el.removeAttribute?.('data-dues-closing');
    return;
  }
  bindDialog(el);
  const isMobile = typeof window !== 'undefined' && (
    window.innerWidth < 768 ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
  );
  // Choose the close button before showModal runs its synchronous focusing steps,
  // avoiding even a brief focus on search that would summon the mobile keyboard.
  const safeFocus = isMobile && id === 'modal-menu'
    ? el.querySelector('[data-action="close-modal"]') : null;
  const hadAutofocus = safeFocus?.hasAttribute('autofocus');
  safeFocus?.setAttribute('autofocus', '');
  el.showModal();
  if (safeFocus && !hadAutofocus) safeFocus.removeAttribute('autofocus');
  promoteToastLayer();
  activeModalStack.push(el);
  el.classList.add('active');
  document.body.classList.add('modal-open');
  document.dispatchEvent(new CustomEvent('finkas:modal-opened', { detail: { id }, bubbles: true }));
};

/** Close a modal and synchronously synchronize application state. */
export const closeModal = (id, immediate = false) => {
  const el = document.getElementById(id);
  if (!el) return;
  if (immediate && duesExitAnimations.has(el)) {
    duesExitAnimations.delete(el);
    el.removeAttribute('data-dues-closing');
  }
  if (!immediate && el.open && el.classList.contains('dues-dialog') &&
      !(globalThis.CSS?.supports('overlay: auto') && globalThis.CSS.supports('transition-behavior: allow-discrete'))) {
    if (el.hasAttribute('data-dues-closing')) return;
    el.setAttribute('data-dues-closing', '');
    const transitions = el.getAnimations().filter((animation) => animation.transitionProperty === 'opacity');
    if (transitions.length) {
      duesExitAnimations.set(el, transitions);
      Promise.allSettled(transitions.map((animation) => animation.finished)).then(() => {
        if (duesExitAnimations.get(el) === transitions && el.open) {
          duesExitAnimations.delete(el);
          el.removeAttribute('data-dues-closing');
          el.close();
          finishClose(el);
        }
      });
      return;
    }
    el.removeAttribute('data-dues-closing');
  }
  if (el.open) el.close();
  finishClose(el);
};

/* ── Unified Database Confirmation Dialog ────────────────────────── */
let pendingConfirmAction = null;

const GLOBAL_SAFE_MODALS = new Set([
  'modal-groups', 'modal-group-pin', 'modal-group-admin', 'modal-group-credentials',
  'modal-login', 'modal-logout', 'modal-tampilan', 'modal-about', 'modal-faq', 'modal-menu'
]);

export const closeGroupScopedModals = () => {
  pendingConfirmAction = null;
  for (const el of [...activeModalStack]) {
    if (el.id && !GLOBAL_SAFE_MODALS.has(el.id)) closeModal(el.id, true);
  }
};

/**
 * Buka dialog konfirmasi aksi database.
 * @param {object} options
 */
export const showConfirmDialog = ({
  title = 'Konfirmasi Perubahan',
  message = 'Apakah Anda yakin ingin menyimpan perubahan ini ke database?',
  icon = 'ph-fill ph-database',
  badgeClass = '',
  confirmText = 'Ya, Lanjutkan',
  confirmClass = 'btn-primary',
  onConfirm
}) => {
  const modal = document.getElementById('modal-confirm-action');
  if (!modal) {
    if (confirm(message)) onConfirm?.();
    return;
  }

  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const iconEl = document.getElementById('confirm-icon');
  const badgeEl = document.getElementById('confirm-badge-icon');
  const submitBtn = document.getElementById('btn-confirm-action-submit');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (iconEl) iconEl.className = icon;
  if (badgeEl) badgeEl.className = 'modal-badge-icon ' + (badgeClass || '');

  if (submitBtn) {
    if (submitBtn.dataset) {
      delete submitBtn.dataset.holdArmed;
      delete submitBtn.dataset.origText;
      delete submitBtn.dataset.holdVerified;
    }
    submitBtn.textContent = confirmText;
    submitBtn.className = `btn ${confirmClass}`;
  }

  pendingConfirmAction = onConfirm;
  openModal('modal-confirm-action');
};

export const closeConfirmDialog = () => {
  pendingConfirmAction = null;
  closeModal('modal-confirm-action');
};

export const executeConfirmAction = async () => {
  const action = pendingConfirmAction;
  closeConfirmDialog();
  if (typeof action === 'function') {
    await action();
  }
};

/* ── Tab switching ─────────────────────────────────────────────── */

/**
 * Switch tabs inside a modal.
 * @param {string} tabName - 'iuran' or 'operasional'
 * @param {string} modalId
 */
export const switchTab = (tabName, modalId) => {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.querySelectorAll('.tab-btn').forEach((btn) => {
    const isTarget = btn.getAttribute('data-tab') === tabName || btn.id === `btn-tab-${tabName}`;
    btn.classList.toggle('active', isTarget);
    if (btn.getAttribute('role') === 'tab') btn.setAttribute('aria-selected', String(isTarget));
  });
  modal.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === tabName || content.id === `tab-${tabName}`);
  });
};

/* ── Mobile menu ───────────────────────────────────────────────── */

/**
 * Close the mobile menu.
 */
export const closeMobileMenu = () => {
  const headerActions = document.getElementById('header-actions');
  if (headerActions) headerActions.classList.remove('mobile-menu-open');
};

/* ── Header dropdown ───────────────────────────────────────────── */

/**
 * Close the header dropdown menu.
 */
export const closeHeaderDropdown = () => {
  const dd = document.getElementById('header-dropdown');
  if (!dd) return;
  dd.classList.remove('open');
  const btn = document.getElementById('btn-header-menu');
  if (btn) btn.setAttribute('aria-expanded', 'false');
};
