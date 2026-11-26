/**
 * @module handlers/quickpay-motion
 * Interruptible number-roll and focus-pulse micro-animations for Quick Pay Rapel.
 */
import { getInput, formatRp } from "finkas/core/utils";

let qpRollRaf = 0;
let qpLastDisplayedNominal = 0;

export const canAnimateQuickPay = () =>
  typeof window !== "undefined" &&
  typeof requestAnimationFrame === "function" &&
  typeof window.matchMedia === "function" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  !/jsdom/i.test(window.navigator?.userAgent || "");

export const setQuickPayDisplayedNominal = (value: number) => {
  if (qpRollRaf) {
    cancelAnimationFrame(qpRollRaf);
    qpRollRaf = 0;
  }
  qpLastDisplayedNominal = value;
};

export const getQuickPayDisplayedNominal = () => qpLastDisplayedNominal;

export const triggerQuickPayPulse = (el: HTMLElement | null) => {
  if (!el || !canAnimateQuickPay()) return;
  el.classList?.remove?.("is-rapel-pulse");
  void el.offsetWidth;
  el.classList?.add?.("is-rapel-pulse");
};

export const rollQuickPayNumbers = (from: number, to: number) => {
  if (qpRollRaf) {
    cancelAnimationFrame(qpRollRaf);
    qpRollRaf = 0;
  }
  const input = getInput("qp-nominal");
  const amtEl = document.getElementById("qp-impact-amount");
  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(Math.max(0, Math.round(n)));

  if (!canAnimateQuickPay() || from === to) {
    qpLastDisplayedNominal = to;
    if (input) input.value = fmt(to);
    if (amtEl) amtEl.textContent = to <= 0 ? formatRp(0) : `+ ${formatRp(to)}`;
    return;
  }

  const duration = 240;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const cur = Math.round(from + (to - from) * eased);
    qpLastDisplayedNominal = cur;
    if (input) input.value = fmt(cur);
    if (amtEl) amtEl.textContent = cur <= 0 ? formatRp(0) : `+ ${formatRp(cur)}`;
    if (t < 1) {
      qpRollRaf = requestAnimationFrame(step);
    } else {
      qpRollRaf = 0;
      qpLastDisplayedNominal = to;
    }
  };
  qpRollRaf = requestAnimationFrame(step);
};
