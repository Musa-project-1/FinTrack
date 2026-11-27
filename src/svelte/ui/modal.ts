/**
 * @module modal
 * Modal open/close, tab switching, and dialog interactions.
 */

import { promoteToastLayer } from 'finkas/core/utils';

export {
  filterKategori, updateCounterOps, updateCounterIuran, pilihSemuaIuran,
  renderCheckboxIuran, filterAnggotaIuran, updateEditDelta
} from './transaction-form';

/* ── Modal open / close ────────────────────────────────────────── */

const activeModalStack: HTMLDialogElement[] = [];
const boundDialogs = new WeakSet<HTMLDialogElement>();
const duesExitAnimations = new WeakMap<HTMLDialogElement, Animation[]>();
let cachedDisplayTransition: boolean | undefined;

const canTransitionDisplay = () => {
  if (cachedDisplayTransition !== undefined) return cachedDisplayTransition;
  if (!globalThis.CSS?.supports?.('transition-behavior', 'allow-discrete') || !globalThis.document?.body?.appendChild) return false;
  const probe = document.createElement('div');
  if (!probe?.style || typeof globalThis.getComputedStyle !== 'function') return false;
  // Intentional transition shorthand probe for discrete display transitions (Firefox bug 1882408).
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  cachedDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove?.();
  return cachedDisplayTransition;
};

export const getActiveModalId = () => activeModalStack.at(-1)?.id;

const syncMenuButtonExpanded = (open: boolean) => {
  const menuBtn = document.getElementById('btn-header-menu');
  if (!menuBtn) return;
  menuBtn.setAttribute?.('aria-expanded', String(open));
  menuBtn.classList?.toggle?.('is-menu-open', open);
};

const finishClose = (el: HTMLDialogElement) => {
  const index = activeModalStack.indexOf(el);
  if (index === -1) return;
  activeModalStack.splice(index, 1);
  el.classList.remove('active');
  if (el.id === 'modal-menu') syncMenuButtonExpanded(false);
  if (el.id === 'modal-confirm-action') pendingConfirmAction = null;
  if (!activeModalStack.length) {
    document.body.classList.remove('modal-open');
    const panel = document.querySelector?.('.workspace-tabs [aria-selected="true"]')?.getAttribute('data-panel') ?? '';
    const action = panel === 'history' ? 'nav-riwayat' : panel === 'stats' ? 'nav-stats' : 'nav-rekap';
    document.querySelectorAll('.bottom-nav-item').forEach((b) => {
      const active = b.getAttribute('data-action') === action;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current', 'location');
      else b.removeAttribute('aria-current');
    });
  }
};

const bindDialog = (el: HTMLDialogElement) => {
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
export const openModal = (id: string) => {
  closeMobileMenu();
  if (id !== 'modal-menu') closeModal('modal-menu', true);
  const el = (document.getElementById(id) as HTMLDialogElement | null);
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
  if (id === 'modal-menu') syncMenuButtonExpanded(true);
  document.body.classList.add('modal-open');
  document.dispatchEvent(new CustomEvent('finkas:modal-opened', { detail: { id }, bubbles: true }));
};

/** Close a modal and synchronously synchronize application state. */
export const closeModal = (id: string, immediate = false) => {
  const el = (document.getElementById(id) as HTMLDialogElement | null);
  if (!el) return;
  if (immediate && duesExitAnimations.has(el)) {
    duesExitAnimations.delete(el);
    el.removeAttribute('data-dues-closing');
  }
  if (!immediate && el.open && (el.classList.contains('dues-dialog') || el.classList.contains('hybrid-dialog')) &&
      !(globalThis.CSS?.supports?.('overlay: auto') && canTransitionDisplay())) {
    if (el.hasAttribute('data-dues-closing')) return;
    el.setAttribute('data-dues-closing', '');
    const transitions = el.getAnimations?.().filter((animation) => 'transitionProperty' in animation && animation.transitionProperty === 'opacity') ?? [];
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
let pendingConfirmAction: (() => unknown) | null = null;

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
 */
export const showConfirmDialog = ({
  title = 'Konfirmasi Perubahan',
  message = 'Apakah Anda yakin ingin menyimpan perubahan ini ke database?',
  icon = 'ph-fill ph-database',
  badgeClass = '',
  confirmText = 'Ya, Lanjutkan',
  confirmClass = 'btn-primary',
  onConfirm
}: {title?: string, message?: string, icon?: string, badgeClass?: string, confirmText?: string, confirmClass?: string, onConfirm?: () => unknown}) => {
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

  pendingConfirmAction = onConfirm ?? null;
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
 */
export const switchTab = (tabName: string, modalId: string) => {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const buttons = Array.from(modal.querySelectorAll('.tab-btn'));
  const prevIdx = buttons.findIndex((b) => b.classList.contains('active'));
  let nextIdx = -1;
  buttons.forEach((btn, idx) => {
    const isTarget = btn.getAttribute('data-tab') === tabName || btn.id === `btn-tab-${tabName}`;
    if (isTarget) nextIdx = idx;
    btn.classList.toggle('active', isTarget);
    if (btn.getAttribute('role') === 'tab') btn.setAttribute('aria-selected', String(isTarget));
  });
  if (prevIdx !== -1 && nextIdx !== -1 && prevIdx !== nextIdx) {
    modal.setAttribute('data-tab-dir', nextIdx > prevIdx ? 'forward' : 'backward');
  }
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
