import { getActiveGroupId, getIsAdminView } from 'finkas/core/state';
import { formatDisplayRp } from 'finkas/core/utils';

const reducedMotion = () => typeof window === 'undefined' ||
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const counters: WeakMap<HTMLElement, { value: number, frame?: number }> = new WeakMap();
let lastOverview: string | undefined;
let activeWipe: ViewTransition | undefined;
let activeGroupTransition: ViewTransition | undefined;
let lastGroupDirection = 'group-forward';
let groupTransitionDepth = 0;
let fallbackSeq = 0;

export const resolveGroupDirection = (previousGroupId: string, nextGroupId: string, groups: Array<{id?: string}>) => {
  const list = Array.isArray(groups) ? groups : [];
  const prevIdx = list.findIndex(g => g?.id === previousGroupId);
  const nextIdx = list.findIndex(g => g?.id === nextGroupId);
  return prevIdx >= 0 && nextIdx >= 0 && nextIdx < prevIdx ? 'group-backward' : 'group-forward';
};

export const getLastGroupDirection = () => lastGroupDirection;
export const isGroupTransitionActive = () => groupTransitionDepth > 0;

export const enterHybridOverview = () => {
  const group = getActiveGroupId();
  if (!group) return;
  const overview = JSON.stringify([group, getIsAdminView()]);
  if (isGroupTransitionActive()) {
    lastOverview = overview;
    return;
  }
  if (overview === lastOverview || reducedMotion() || typeof requestAnimationFrame !== 'function') return;
  lastOverview = overview;
  const items = document.querySelectorAll<HTMLElement>('[data-cascade]');
  items.forEach((item) => item.classList.remove('cascade-enter'));
  requestAnimationFrame(() => {
    items.forEach((item) => {
      if (!item.getClientRects().length) return;
      item.style.setProperty('--cascade-i', item.dataset.cascade ?? '0');
      item.classList.add('cascade-enter');
      const onEnd = (event: AnimationEvent) => {
        if (event.target === item && event.animationName === 'cascade-spring') {
          item.classList.remove('cascade-enter');
          item.removeEventListener('animationend', onEnd);
        }
      };
      item.addEventListener('animationend', onEnd);
    });
  });
};

export const animateHybridAmount = (node: HTMLElement | null, amount: number, { format = formatDisplayRp, from }: { format?: (value: number) => string, from?: number } = {}) => {
  if (!node) return;
  const prefix = node.dataset?.amountPrefix || '';
  const previous = counters.get(node);
  if (previous?.frame) globalThis.cancelAnimationFrame?.(previous.frame);
  const start = from ?? previous?.value ?? 0;
  if (isGroupTransitionActive() || reducedMotion() || typeof requestAnimationFrame !== 'function' || typeof cancelAnimationFrame !== 'function' || start === amount) {
    node.textContent = prefix + format(amount);
    counters.set(node, { value: amount });
    return;
  }

  node.textContent = prefix + format(start);
  const animation: { value: number, frame?: number } = { value: start };
  counters.set(node, animation);
  const began = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - began) / 560);
    animation.value = progress === 1 ? amount : Math.round(start + (amount - start) * (1 - (1 - progress) ** 3));
    node.textContent = prefix + format(animation.value);
    animation.frame = progress < 1 ? requestAnimationFrame(step) : undefined;
  };
  animation.frame = requestAnimationFrame(step);
};

export const runHybridThemeWipe = (apply: () => void, event?: MouseEvent, trigger?: HTMLElement | null) => {
  if (activeGroupTransition) {
    activeGroupTransition.skipTransition?.();
    activeGroupTransition = undefined;
    delete document.documentElement.dataset.groupTransition;
  }
  if (reducedMotion() || typeof document.startViewTransition !== 'function') {
    apply();
    return;
  }

  activeWipe?.skipTransition?.();
  const root = document.documentElement;
  const bounds = trigger?.getBoundingClientRect();
  const x = event?.clientX || (bounds ? bounds.left + bounds.width / 2 : innerWidth / 2);
  const y = event?.clientY || (bounds ? bounds.top + bounds.height / 2 : 24);
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.dataset.themeWipe = 'true';
  const transition = document.startViewTransition(apply);
  activeWipe = transition;
  transition.ready.then(() => {
    if (activeWipe !== transition) return;
    root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
  transition.updateCallbackDone.catch(() => {});
  const finish = () => {
    if (activeWipe !== transition) return;
    activeWipe = undefined;
    delete root.dataset.themeWipe;
  };
  transition.finished.then(finish, finish);
};

// Ignore animation events bubbling from descendants.
const onAnimationDone = (node: HTMLElement, cleanup: () => void) => {
  if (node.getAnimations?.().length === 0) {
    cleanup();
    return;
  }
  const onEnd = (event: AnimationEvent) => {
    if (event.target !== node) return;
    node.removeEventListener('animationend', onEnd);
    cleanup();
  };
  node.addEventListener('animationend', onEnd);
};

const pulseGroupChip = () => {
  if (reducedMotion()) return;
  const chip = document.getElementById('app-group-name');
  if (!chip) return;
  chip.classList.remove('is-group-arrived');
  void chip.offsetWidth;
  chip.classList.add('is-group-arrived');
  onAnimationDone(chip, () => chip.classList.remove('is-group-arrived'));
};

export const runGroupSwitchTransition = (apply: () => void, { direction = 'group-forward', focusHeading = false }: { direction?: string, focusHeading?: boolean } = {}) => {
  lastGroupDirection = direction === 'group-backward' ? 'group-backward' : 'group-forward';
  const routeFocus = () => {
    if (!focusHeading) return;
    const overview = document.getElementById('group-overview');
    const heading = document.getElementById('group-overview-name');
    if (heading && !overview?.hidden && typeof heading.focus === 'function') heading.focus({ preventScroll: true });
  };

  if (reducedMotion()) {
    apply();
    routeFocus();
    return;
  }
  if (typeof document.startViewTransition !== 'function') {
    apply();
    const main = document.querySelector<HTMLElement>('main.container');
    if (main && document.body?.dataset?.workspaceState === 'ready') {
      const seq = ++fallbackSeq;
      main.classList.remove('group-switch-fallback');
      main.dataset.groupDir = lastGroupDirection;
      void main.offsetWidth;
      main.classList.add('group-switch-fallback');
      onAnimationDone(main, () => {
        if (seq !== fallbackSeq) return;
        main.classList.remove('group-switch-fallback');
        delete main.dataset.groupDir;
      });
    }
    pulseGroupChip();
    routeFocus();
    return;
  }

  activeWipe?.skipTransition?.();
  activeWipe = undefined;
  activeGroupTransition?.skipTransition?.();
  const root = document.documentElement;
  delete root.dataset.themeWipe;
  root.dataset.groupTransition = lastGroupDirection;
  const runUpdate = () => {
    groupTransitionDepth += 1;
    try {
      apply();
    } finally {
      groupTransitionDepth = Math.max(0, groupTransitionDepth - 1);
    }
  };
  const supportsTypes = typeof window !== 'undefined' && 'ViewTransitionTypeSet' in window;
  const transition = supportsTypes
    ? document.startViewTransition({ update: runUpdate, types: [lastGroupDirection] })
    : document.startViewTransition(runUpdate);
  activeGroupTransition = transition;
  transition.ready?.catch?.(() => {});
  transition.updateCallbackDone?.catch?.(() => {});
  const finish = () => {
    if (activeGroupTransition !== transition) return;
    activeGroupTransition = undefined;
    delete root.dataset.groupTransition;
    pulseGroupChip();
    routeFocus();
  };
  transition.finished?.then?.(finish, finish);
  return transition.updateCallbackDone;
};

const initializedCards = new WeakSet();

export const initHybridMotion = () => {
  const pointer = window.matchMedia?.('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  if (!pointer) return;
  const cards = document.querySelectorAll<HTMLElement>('.hybrid-card');
  cards.forEach((card) => {
    if (initializedCards.has(card)) return;
    initializedCards.add(card);
    const tilt = card.matches('.bento-balance, #spotlight-card');
    let frame: number | undefined;
    card.addEventListener('pointermove', (event) => {
      if (!pointer.matches || event.pointerType !== 'mouse') return;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        if (tilt) {
          card.classList.add('is-tilting');
          card.style.setProperty('--tilt-x', `${(.5 - y) * 4.6}deg`);
          card.style.setProperty('--tilt-y', `${(x - .5) * 4.6}deg`);
        }
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      if (frame) cancelAnimationFrame(frame);
      card.classList.remove('is-tilting');
      if (tilt) {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      }
    });
  });
};
