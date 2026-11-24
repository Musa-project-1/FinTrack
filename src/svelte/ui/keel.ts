/**
 * @module ui/keel
 * Interactive button state controllers: busy spinners and liquid-fill ("keel") animations.
 */

import { showToast } from 'finkas/core/utils';

/**
 * Run a task with a button in its busy state, restoring it afterwards.
 */
export const withBusyButton = async (buttonId: string, busyHtml: string, idleHtml: string, task: () => unknown) => {
  const btn = (document.getElementById(buttonId) as HTMLButtonElement|null);
  if (btn) {
    if (btn.disabled || btn.getAttribute("aria-busy") === "true") return;
    if (btn.offsetWidth && btn.offsetWidth > 0) btn.style?.setProperty?.("--btn-lock-w", `${btn.offsetWidth}px`);
    const holdLabel = btn.querySelector?.(".hold-label");
    if (holdLabel) holdLabel.innerHTML = busyHtml;
    else btn.innerHTML = busyHtml;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
  }
  try {
    await task();
  } finally {
    if (btn) {
      const holdLabel = btn.querySelector?.(".hold-label");
      if (holdLabel) holdLabel.innerHTML = idleHtml;
      else btn.innerHTML = idleHtml;
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.style?.removeProperty?.("--btn-lock-w");
    }
  }
};

/**
 * Run a save with the liquid-fill ("keel") button animation.
 *
 * The teal liquid crawls to ~90% while the request is in flight (honest
 * indeterminate wait — we cannot know the real byte progress of a JSON POST),
 * then on success it tops off to 100% and draws the checkmark before the
 * caller's side effects run; on failure it recedes. Progress is written to the
 * registered custom property `--p`, so CSS transitions do the animating — no
 * requestAnimationFrame loop. Honours `prefers-reduced-motion`.
 */
export type LiquidSaveResult = {
  outcome?: 'success' | 'error' | 'neutral';
  onSettled?: () => void;
  done?: () => unknown;
};

export type LiquidSaveHooks = {
  savingText?: string;
  doneText?: string;
  minSavingMs?: number;
  settleMs?: number;
  onSaving?: () => void;
  onCleanup?: () => void;
};

export const withLiquidSave = async (
  buttonOrId: string | HTMLButtonElement | null,
  task: () => Promise<LiquidSaveResult>,
  hooks?: LiquidSaveHooks
) => {
  const btn = typeof buttonOrId === 'string'
    ? (document.getElementById(buttonOrId) as HTMLButtonElement|null)
    : buttonOrId;
  if (btn && (btn.disabled || btn.classList.contains("is-saving"))) return;
  const labelEl = btn?.querySelector?.(".keel-label");
  const originalLabelHtml = labelEl ? labelEl.innerHTML : "";
  const reduce = typeof window !== 'undefined' && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const setP = (v: number, dur: number) => {
    if (!btn) return;
    btn.style.setProperty("--keel-dur", (reduce ? 0 : dur) + "ms");
    btn.style.setProperty("--p", String(v));
  };
  const wait = (ms: number) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const reset = () => {
    if (!btn) return;
    btn.classList.remove("is-saving", "is-done", "is-error");
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btn.style.removeProperty?.("--btn-lock-w");
    if (labelEl) labelEl.innerHTML = originalLabelHtml;
    setP(0, 0);
  };

  if (btn) {
    const lockedWidth = btn.offsetWidth;
    if (lockedWidth > 0) btn.style.setProperty("--btn-lock-w", `${lockedWidth}px`);
    btn.classList.remove("is-done", "is-error");
    btn.classList.add("is-saving");
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    if (labelEl) labelEl.textContent = hooks?.savingText || "Menyimpan…";
    setP(0.9, 1100);
  }
  hooks?.onSaving?.();

  const startedAt = Date.now();
  let res: LiquidSaveResult | undefined;
  try {
    res = await task();
  } catch (err) {
    console.error("[liquid-save]", err);
    res = { outcome: "error", done: () => showToast("Terjadi kesalahan saat menyimpan.", "error") };
  }
  const outcome = res?.outcome || "success";

  try {
    if (outcome === "success") {
      const elapsed = Date.now() - startedAt;
      const minSaving = hooks?.minSavingMs ?? 220;
      if (!reduce && elapsed < minSaving) await wait(minSaving - elapsed);
      setP(1, 220);
      if (btn) {
        btn.classList.remove("is-saving");
        btn.classList.add("is-done");
        btn.setAttribute("aria-busy", "false");
      }
      if (labelEl) labelEl.textContent = hooks?.doneText || "Tersimpan";
      try { if (!reduce) globalThis.navigator?.vibrate?.(18); } catch {}
      res?.onSettled?.();
      await wait(hooks?.settleMs ?? 520);
    } else {
      // error / neutral — immediately clear overlay & recede without the check
      hooks?.onCleanup?.();
      setP(0, 420);
      if (btn) {
        btn.classList.remove("is-saving");
        if (outcome === "error") btn.classList.add("is-error");
        btn.setAttribute("aria-busy", "false");
      }
      if (labelEl && outcome === "error") labelEl.textContent = "Gagal";
      await wait(outcome === "error" ? 700 : 180);
    }
    await res?.done?.();
    } finally {
    hooks?.onCleanup?.();
    reset();
  }
};

type CopyRestoreState = {
  timer: ReturnType<typeof setTimeout>;
  restore: () => void;
};

const copyRestoreMap = new WeakMap<HTMLElement, CopyRestoreState>();

/**
 * Briefly morph a copy button (width-locked) and optional surface into a Cobalt confirmed state.
 */
export const flashCopyFeedback = (
  btn?: HTMLElement | null,
  surfaceEl?: HTMLElement | null,
  copiedLabel = 'Tersalin',
  durationMs = 1450
) => {
  if (!btn || typeof globalThis.setTimeout !== 'function') return;

  const existing = copyRestoreMap.get(btn);
  if (existing) {
    globalThis.clearTimeout?.(existing.timer);
    existing.restore();
  }

  const locked = !btn.classList?.contains?.('export-card-btn') && (btn.offsetWidth ?? 0) > 0;
  if (locked) btn.style?.setProperty?.('--btn-lock-w', `${btn.offsetWidth}px`);

  const iconEl = btn.querySelector?.<HTMLElement>('.export-icon-box i, i') ?? null;
  const origIconClass = iconEl ? iconEl.className : '';
  if (iconEl) iconEl.className = 'ph-bold ph-check';

  const spanEl = btn.querySelector?.<HTMLElement>('.export-btn-title, span:not(.export-icon-box)') ?? null;
  let origSpanText: string | null = null;
  let textNode: ChildNode | null = null;
  let origNodeValue = '';

  if (spanEl && spanEl.textContent?.trim()) {
    origSpanText = spanEl.textContent;
    spanEl.textContent = copiedLabel;
  } else if (btn.childNodes) {
    const candidate = Array.from(btn.childNodes).find(
      (n) => n.nodeType === 3 && Boolean(n.nodeValue?.trim())
    ) ?? null;
    if (candidate) {
      textNode = candidate;
      origNodeValue = candidate.nodeValue ?? '';
      candidate.nodeValue = ` ${copiedLabel}`;
    }
  }

  btn.classList.add('is-copied');
  surfaceEl?.classList?.add?.('is-copied-surface');

  const restore = () => {
    if (iconEl) iconEl.className = origIconClass;
    if (spanEl && origSpanText !== null) spanEl.textContent = origSpanText;
    if (textNode) textNode.nodeValue = origNodeValue;
    btn.classList.remove('is-copied');
    surfaceEl?.classList?.remove?.('is-copied-surface');
    if (locked) btn.style?.removeProperty?.('--btn-lock-w');
    copyRestoreMap.delete(btn);
  };

  const timer = globalThis.setTimeout(restore, durationMs);
  copyRestoreMap.set(btn, { timer, restore });
};
