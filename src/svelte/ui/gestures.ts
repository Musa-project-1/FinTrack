/**
 * @module ui/gestures
 * Direct manipulation & physics-driven gestures (Emil Kowalski standard):
 * 1. Mobile bottom sheet swipe-down to dismiss (.quickpay-sheet).
 * 2. Hold-to-confirm on destructive actions (.btn-danger-solid) with 1.1s linear fill and 200ms snapback.
 */

import { closeModal } from './modal';

const holdButton = (target: EventTarget | null) =>
  (target as Element | null)?.closest?.<HTMLButtonElement>('.btn-danger-solid');

/**
 * Check if the user prefers reduced motion.
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
};

/* ── 1. Mobile Bottom Sheet Swipe-Down to Dismiss ─────────────────── */

/**
 * Initialize swipe-down gestures on mobile bottom sheets.
 */
export const initBottomSheetGestures = () => {
  const sheets = document.querySelectorAll<HTMLElement>('.quickpay-sheet, .hybrid-dialog > .modal-content');
  sheets.forEach((sheet) => {
    if (sheet.dataset.gestureBound === '1') return;
    sheet.dataset.gestureBound = '1';

    const overlay = sheet.closest<HTMLDialogElement>('.modal-overlay');
    if (!overlay) return;
    const modalId = overlay.id;
    const hasDuesBackdrop = overlay.classList?.contains('dues-dialog');
    const fadeSheet = (opacity: string) => {
      overlay.style.setProperty('opacity', opacity, 'important');
      if (hasDuesBackdrop) overlay.style.setProperty('--dues-drag-opacity', opacity);
    };

    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let isDragging = false;
    let activePointer: number | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      sheet.style.removeProperty('transform');
      sheet.style.removeProperty('transition');
      overlay.style.removeProperty('opacity');
      if (hasDuesBackdrop) overlay.style.removeProperty('--dues-drag-opacity');
      overlay.style.removeProperty('transition');
    };

    // Draggable affordance: handle and header area
    const onPointerDown = (e: PointerEvent) => {
      if (isDragging) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if ((e.target as Element | null)?.closest?.('input, button, select, textarea, a, .close-modal-btn')) return;
      if (sheet.scrollTop > 0) return;

      clearTimeout(settleTimer);
      cleanup();
      activePointer = e.pointerId;
      startY = e.clientY;
      currentY = e.clientY;
      startTime = Date.now();
      isDragging = true;
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch (_) {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointer) return;
      currentY = e.clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        // Direct 1:1 tracking downwards
        sheet.style.setProperty('transition', 'none', 'important');
        sheet.style.setProperty('transform', `translateY(${deltaY}px)`, 'important');
        const progress = Math.min(1, deltaY / (sheet.offsetHeight || 300));
        fadeSheet(String(Math.max(0.1, 1 - progress * 0.75)));
      } else {
        // Rubber-band resistance upwards
        fadeSheet('1');
        const rubber = deltaY * 0.22;
        sheet.style.setProperty('transition', 'none', 'important');
        sheet.style.setProperty('transform', `translateY(${rubber}px)`, 'important');
      }
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointer) return;
      isDragging = false;
      activePointer = null;
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch (_) {}

      // A browser scroll takeover or interrupted pointer never dismisses.
      const instant = e.type !== 'pointerup' || prefersReducedMotion();
      const deltaY = currentY - startY;
      const elapsed = Date.now() - startTime;
      const velocity = deltaY / (elapsed || 1);

      const threshold = (sheet.offsetHeight || 300) * 0.32;
      const isFlick = deltaY > 40 && velocity > 0.35;

      if (e.type === 'pointerup' && (deltaY > threshold || isFlick)) {
        // Dismiss sheet downward with iOS curve
        sheet.style.setProperty('transition', instant ? 'none' : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)', 'important');
        overlay.style.setProperty('transition', instant ? 'none' : 'opacity 0.22s ease-out', 'important');
        sheet.style.setProperty('transform', 'translateY(100%)', 'important');
        fadeSheet('0');
        const dismiss = () => {
          closeModal(modalId);
          if (overlay.open && typeof overlay.addEventListener === 'function') {
            overlay.addEventListener('close', cleanup, { once: true });
          } else {
            cleanup();
          }
        };
        if (instant) dismiss();
        else settleTimer = setTimeout(dismiss, 220);
      } else {
        // Snap back
        sheet.style.setProperty('transition', instant ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)', 'important');
        overlay.style.setProperty('transition', instant ? 'none' : 'opacity 0.2s ease-out', 'important');
        sheet.style.setProperty('transform', 'translateY(0)', 'important');
        fadeSheet('1');
        if (instant) {
          // Commit the unanimated reset before restoring stylesheet transitions.
          void sheet.offsetHeight;
          void overlay.offsetHeight;
          cleanup();
        }
        else settleTimer = setTimeout(cleanup, 200);
      }
    };

    const dragZones = [
      sheet.querySelector<HTMLElement>('.quickpay-handle'),
      sheet.querySelector<HTMLElement>('.hybrid-sheet-handle'),
      sheet.classList?.contains('quickpay-sheet') ? sheet.querySelector<HTMLElement>('.modal-header-standard') : null
    ].filter(el => el != null);

    dragZones.forEach((zone) => {
      zone.style.setProperty('touch-action', 'pan-y');
      zone.addEventListener('pointerdown', onPointerDown);
      zone.addEventListener('pointermove', onPointerMove);
      zone.addEventListener('pointerup', onPointerEnd);
      zone.addEventListener('pointercancel', onPointerEnd);
      zone.addEventListener('lostpointercapture', onPointerEnd);
    });
  });
};

/* ── 2. Hold-to-Confirm on Destructive Actions ────────────────────── */

/**
 * Arm a destructive button with hold-to-confirm structure.
 * @param {HTMLElement} btn
 */
export const armHoldButton = (btn: HTMLElement) => {
  if (!btn || btn.dataset.holdArmed === '1') return;
  btn.dataset.holdArmed = '1';
  btn.classList.add('btn-hold-to-confirm');

  if (!btn.querySelector('.hold-fill')) {
    const fill = document.createElement('span');
    fill.className = 'hold-fill';
    const originalText = btn.innerHTML;
    btn.innerHTML = '';
    btn.appendChild(fill);

    const label = document.createElement('span');
    label.className = 'hold-label';
    label.innerHTML = originalText;
    btn.appendChild(label);
  }
};

/**
 * Initialize event-delegated hold-to-confirm on .btn-danger-solid.
 */
export const initHoldToConfirm = () => {
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let activeBtn: HTMLButtonElement | null = null;
  let hasFired = false;

  const startHold = (btn: HTMLButtonElement, pointerId: number) => {
    if (btn.disabled || btn.getAttribute('aria-disabled') === 'true' || btn.getAttribute('aria-busy') === 'true') {
      return;
    }
    armHoldButton(btn);

    if (prefersReducedMotion()) return;

    activeBtn = btn;
    hasFired = false;
    btn.classList.add('is-holding');
    const labelEl = btn.querySelector('.hold-label');
    if (labelEl && !btn.dataset.origText) {
      btn.dataset.origText = labelEl.innerHTML;
    }

    try { btn.setPointerCapture(pointerId); } catch (_) {}

    holdTimer = setTimeout(() => {
      if (activeBtn !== btn) return;
      hasFired = true;
      btn.classList.remove('is-holding');
      btn.classList.add('is-confirmed');
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(40);
      }
      btn.dataset.holdVerified = '1';
      btn.click();
      setTimeout(() => {
        btn.classList.remove('is-confirmed');
        delete btn.dataset.holdVerified;
        if (btn.dataset.origText && labelEl) {
          labelEl.innerHTML = btn.dataset.origText;
          delete btn.dataset.origText;
        }
      }, 500);
    }, 1100);
  };

  const cancelHold = (btn: HTMLButtonElement, pointerId: number) => {
    if (activeBtn && activeBtn === btn) {
      clearTimeout(holdTimer);
      btn.classList.remove('is-holding');
      try { btn.releasePointerCapture(pointerId); } catch (_) {}
      activeBtn = null;
    }
  };

  document.addEventListener('pointerdown', (e) => {
    const btn = holdButton(e.target);
    if (!btn) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    startHold(btn, e.pointerId);
  });

  document.addEventListener('pointerup', (e) => {
    const btn = holdButton(e.target) || activeBtn;
    if (btn) cancelHold(btn, e.pointerId);
  });

  document.addEventListener('pointercancel', (e) => {
    const btn = holdButton(e.target) || activeBtn;
    if (btn) cancelHold(btn, e.pointerId);
  });

  // Intercept accidental quick taps
  document.addEventListener('click', (e) => {
    const btn = holdButton(e.target);
    if (!btn) return;

    // Allow programmatic clicks (tests), keyboard navigation (Enter/Space), and reduced motion
    if (!e.isTrusted || prefersReducedMotion() || e.detail === 0) return;

    if (btn.dataset.holdVerified === '1') {
      delete btn.dataset.holdVerified;
      return;
    }

    // Accidental quick click: stop and advise
    e.preventDefault();
    e.stopImmediatePropagation();
    armHoldButton(btn);

    const labelEl = btn.querySelector('.hold-label');
    if (labelEl && !btn.dataset.origText) {
      btn.dataset.origText = labelEl.innerHTML;
      labelEl.textContent = 'Tahan 1 dtk untuk hapus';
      setTimeout(() => {
        if (btn.dataset.origText) {
          labelEl.innerHTML = btn.dataset.origText;
          delete btn.dataset.origText;
        }
      }, 1500);
    }
  }, true);

  // Arm visible destructive buttons upfront
  document.querySelectorAll<HTMLElement>('.btn-danger-solid').forEach(armHoldButton);
};

/* ── 3. Lifecycle Registry ────────────────────────────────────────── */

/**
 * Initialize all direct manipulation gesture controllers.
 */
export const initGestures = () => {
  initBottomSheetGestures();
  initHoldToConfirm();
};
