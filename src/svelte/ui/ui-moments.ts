/**
 * @module ui/ui-moments
 * Physical/metaphorical micro-interaction primitives inspired by "UI Moments":
 * #29 Odometer, #21 Download Ring, #09 Paper Plane, plus reduced-motion guard.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

type RestoreEntry = {
  timers: ReturnType<typeof setTimeout>[];
  restore: () => void;
};

const activeRings = new WeakMap<HTMLElement, RestoreEntry>();
const activePlanes = new WeakMap<HTMLElement, RestoreEntry>();

/** Strict reduced-motion guard matching stress & accessibility environments. */
export const isReducedMotion = () =>
  typeof window === 'undefined' ||
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const unrefTimer = (timer: ReturnType<typeof setTimeout>) => {
  (timer as unknown as { unref?: () => void })?.unref?.();
  return timer;
};

const createSvgNode = (tag: string, attrs: Record<string, string>) => {
  const el = typeof document.createElementNS === 'function'
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute?.(k, v);
  }
  return el;
};

const buildOdoStrip = (fromDigit: string, toDigit: string, dir: 'up' | 'down', minSteps = 1) => {
  const a = Number(fromDigit);
  const b = Number(toDigit);
  if (dir === 'up') {
    const raw = (b - a + 10) % 10;
    const steps = minSteps > 1 ? minSteps : (raw || 1);
    const startNum = minSteps > 1 ? ((b - (steps % 10)) + 10) % 10 : a;
    const lines = Array.from({ length: steps }, (_, k) => String((startNum + k) % 10));
    return { strip: lines.join('\n'), steps, prev: String(startNum) };
  }
  const raw = (a - b + 10) % 10;
  const steps = minSteps > 1 ? minSteps : (raw || 1);
  const startNum = minSteps > 1 ? (b + (steps % 10)) % 10 : a;
  const lines = Array.from({ length: steps }, (_, k) => String((b + k + 1) % 10));
  return { strip: lines.join('\n'), steps, prev: String(startNum) };
};

/**
 * Render an odometer digit-reel readout where `node.textContent` ALWAYS equals `nextStr`.
 * Previous digit strips live only in `data-prev` / `data-strip` attributes painted via CSS `::before`.
 */
export const renderOdometerValue = (
  node: HTMLElement | null,
  nextStr: string,
  prevStr = '',
  dir: 'up' | 'down' = 'up',
  options?: { forceSpin?: boolean }
) => {
  if (!node || typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  const nextChars = Array.from(nextStr);
  const nextDigits = nextChars.filter((ch) => ch >= '0' && ch <= '9');
  const nextDigitsCount = nextDigits.length;
  const prevDigits = Array.from(prevStr).filter((ch) => ch >= '0' && ch <= '9');
  const hasNonZeroNext = nextDigits.some((d) => d !== '0');
  const prevIsZeroOrEmpty = prevDigits.length === 0 || prevDigits.every((d) => d === '0');
  const isBootSpin = hasNonZeroNext && (Boolean(options?.forceSpin) || prevIsZeroOrEmpty);

  const parts: Node[] = [];
  let seenDigits = 0;

  for (const ch of nextChars) {
    if (ch < '0' || ch > '9') {
      if (typeof document.createTextNode === 'function') {
        parts.push(document.createTextNode(ch));
      } else {
        const sym = document.createElement('span');
        sym.className = 'odo-sym';
        sym.textContent = ch;
        parts.push(sym);
      }
      continue;
    }

    const fromRight = nextDigitsCount - 1 - seenDigits;
    const prevIdx = prevDigits.length - 1 - fromRight;
    const prevDigit = prevIdx >= 0 ? prevDigits[prevIdx] : '0';
    const changed = isBootSpin || prevDigit !== ch;

    const col = document.createElement('span');
    col.className = changed ? `odo-col is-${dir}` : 'odo-col';

    const reel = document.createElement('span');
    reel.className = 'odo-reel';
    reel.textContent = ch;

    if (changed) {
      const minSteps = isBootSpin ? 5 + (seenDigits % 3) : 1;
      const { strip, steps, prev } = buildOdoStrip(prevDigit, ch, dir, minSteps);
      col.style?.setProperty?.('--odo-i', String(seenDigits));
      col.style?.setProperty?.('--odo-steps', String(steps));
      reel.setAttribute?.('data-prev', prevIdx >= 0 && !isBootSpin ? prevDigit : prev);
      reel.setAttribute?.('data-strip', strip);
      reel.addEventListener?.('animationend', () => {
        col.classList?.remove?.('is-up', 'is-down');
        reel.removeAttribute?.('data-strip');
      }, { once: true });
    }

    col.appendChild(reel);
    parts.push(col);
    seenDigits += 1;
  }

  if (typeof node.replaceChildren === 'function') {
    node.replaceChildren(...parts);
  } else {
    node.textContent = nextStr;
  }
};

/**
 * #21 Download Ring: morphs a button's icon into a sweeping progress ring + drawn check,
 * while preserving exact button width and original child nodes upon completion.
 */
export const flashDownloadRing = (
  btn?: HTMLElement | null,
  doneLabel = 'Terunduh',
  durationMs = 1350
) => {
  if (!btn || typeof document === 'undefined' || typeof globalThis.setTimeout !== 'function') return;

  const existing = activeRings.get(btn);
  if (existing) {
    existing.timers.forEach((id) => globalThis.clearTimeout?.(id));
    existing.restore();
  }

  const isCardBtn = Boolean(btn.classList?.contains?.('export-card-btn'));
  const locked = !isCardBtn && (btn.offsetWidth ?? 0) > 0;
  if (locked) btn.style?.setProperty?.('--btn-lock-w', `${btn.offsetWidth}px`);

  const svg = createSvgNode('svg', {
    class: 'dl-ring-svg',
    viewBox: '0 0 20 20',
    'aria-hidden': 'true',
    focusable: 'false'
  });
  svg.appendChild(createSvgNode('circle', { class: 'dl-ring-track', cx: '10', cy: '10', r: '7.5' }));
  svg.appendChild(createSvgNode('circle', { class: 'dl-ring-arc', cx: '10', cy: '10', r: '7.5', pathLength: '100' }));
  svg.appendChild(createSvgNode('path', { class: 'dl-ring-check', d: 'M6.2 10.3l2.4 2.4L13.8 7.3', pathLength: '1' }));

  const iconBox = btn.querySelector?.<HTMLElement>('.export-icon-box') ?? null;
  const rawIcon = iconBox ? null : (btn.querySelector?.<HTMLElement>('i') ?? null);
  const savedBoxChildren = iconBox ? Array.from(iconBox.childNodes) : null;

  if (iconBox) {
    iconBox.replaceChildren(svg);
  } else if (rawIcon && rawIcon.parentNode) {
    rawIcon.parentNode.replaceChild(svg, rawIcon);
  } else {
    btn.prepend?.(svg);
  }

  const labelEl = !isCardBtn
    ? (btn.querySelector?.<HTMLElement>('.export-btn-title, span:not(.export-icon-box)') ?? null)
    : null;
  const origLabel = labelEl ? labelEl.textContent : null;
  if (labelEl && doneLabel) labelEl.textContent = doneLabel;

  btn.classList?.add?.('is-dl-ringing');

  const restore = () => {
    btn.classList?.remove?.('is-dl-ringing');
    if (locked) btn.style?.removeProperty?.('--btn-lock-w');
    if (iconBox && savedBoxChildren) {
      iconBox.replaceChildren(...savedBoxChildren);
    } else if (rawIcon && svg.parentNode) {
      svg.parentNode.replaceChild(rawIcon, svg);
    } else {
      svg.remove?.();
    }
    if (labelEl && origLabel !== null) labelEl.textContent = origLabel;
    activeRings.delete(btn);
  };

  const timer = unrefTimer(globalThis.setTimeout(restore, durationMs));
  activeRings.set(btn, { timers: [timer], restore });
};

/**
 * #09 Paper Plane: diagonal takeoff anticipation + confirm checkmark settle on send/WA triggers.
 */
export const flashPaperPlane = (
  el?: HTMLElement | null,
  sentLabel = 'Siap di WhatsApp ✓',
  durationMs = 1500
) => {
  if (!el || typeof globalThis.setTimeout !== 'function') return;

  const existing = activePlanes.get(el);
  if (existing) {
    existing.timers.forEach((id) => globalThis.clearTimeout?.(id));
    existing.restore();
  }

  const locked = (el.offsetWidth ?? 0) > 0;
  if (locked) el.style?.setProperty?.('--btn-lock-w', `${el.offsetWidth}px`);

  const icon = el.querySelector?.<HTMLElement>('i') ?? null;
  const origIconClass = icon ? icon.className : '';
  const labelEl = el.querySelector?.<HTMLElement>('.wa-plane-label, span') ?? null;
  const origText = labelEl ? labelEl.textContent : null;

  const toSent = () => {
    el.classList?.remove?.('is-plane-flying');
    el.classList?.add?.('is-plane-sent');
    if (icon) icon.className = 'ph-bold ph-check-circle';
    if (labelEl && sentLabel) labelEl.textContent = sentLabel;
  };

  const restore = () => {
    el.classList?.remove?.('is-plane-flying', 'is-plane-sent');
    if (locked) el.style?.removeProperty?.('--btn-lock-w');
    if (icon) icon.className = origIconClass;
    if (labelEl && origText !== null) labelEl.textContent = origText;
    activePlanes.delete(el);
  };

  const timers: ReturnType<typeof setTimeout>[] = [];
  if (isReducedMotion()) {
    toSent();
  } else {
    el.classList?.add?.('is-plane-flying');
    timers.push(unrefTimer(globalThis.setTimeout(toSent, 260)));
  }
  timers.push(unrefTimer(globalThis.setTimeout(restore, durationMs)));
  activePlanes.set(el, { timers, restore });
};
