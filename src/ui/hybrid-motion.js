import { getActiveGroupId, getIsAdminView } from '../core/state.js';
import { formatDisplayRp } from '../core/utils.js';

const reducedMotion = () => typeof window === 'undefined' ||
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const counters = new WeakMap();
let lastOverview;
let activeWipe;

export const enterHybridOverview = () => {
  const group = getActiveGroupId();
  if (!group) return;
  const overview = JSON.stringify([group, getIsAdminView()]);
  if (overview === lastOverview || reducedMotion() || typeof requestAnimationFrame !== 'function') return;
  lastOverview = overview;
  const items = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('[data-cascade]'));
  items.forEach((item) => item.classList.remove('cascade-enter'));
  requestAnimationFrame(() => {
    items.forEach((item) => {
      if (!item.getClientRects().length) return;
      item.style.setProperty('--cascade-i', item.dataset.cascade ?? '0');
      item.classList.add('cascade-enter');
      const onEnd = (event) => {
        if (event.target === item && event.animationName === 'cascade-spring') {
          item.classList.remove('cascade-enter');
          item.removeEventListener('animationend', onEnd);
        }
      };
      item.addEventListener('animationend', onEnd);
    });
  });
};

/**
 * @param {HTMLElement | null} node
 * @param {number} amount
 * @param {{ format?: (value: number) => string, from?: number }} options
 */
export const animateHybridAmount = (node, amount, { format = formatDisplayRp, from } = {}) => {
  if (!node) return;
  const prefix = node.dataset?.amountPrefix || '';
  const previous = counters.get(node);
  if (previous?.frame) globalThis.cancelAnimationFrame?.(previous.frame);
  const start = from ?? previous?.value ?? 0;
  if (reducedMotion() || typeof requestAnimationFrame !== 'function' || typeof cancelAnimationFrame !== 'function' || start === amount) {
    node.textContent = prefix + format(amount);
    counters.set(node, { value: amount });
    return;
  }

  node.textContent = prefix + format(start);
  const animation = { value: start };
  counters.set(node, animation);
  const began = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - began) / 560);
    animation.value = progress === 1 ? amount : Math.round(start + (amount - start) * (1 - (1 - progress) ** 3));
    node.textContent = prefix + format(animation.value);
    animation.frame = progress < 1 ? requestAnimationFrame(step) : undefined;
  };
  animation.frame = requestAnimationFrame(step);
};

export const runHybridThemeWipe = (apply, event, trigger) => {
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

const initializedCards = new WeakSet();

export const initHybridMotion = () => {
  const pointer = window.matchMedia?.('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  if (!pointer) return;
  const cards = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.hybrid-card'));
  cards.forEach((card) => {
    if (initializedCards.has(card)) return;
    initializedCards.add(card);
    const tilt = card.matches('.bento-balance, #spotlight-card');
    let frame;
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
