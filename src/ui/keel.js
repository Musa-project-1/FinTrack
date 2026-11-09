/**
 * @module ui/keel
 * Interactive button state controllers: busy spinners and liquid-fill ("keel") animations.
 */

import { showToast } from '../core/utils.js';

/**
 * Run a task with a button in its busy state, restoring it afterwards.
 *
 * @param {string} buttonId
 * @param {string} busyHtml
 * @param {string} idleHtml
 * @param {Function} task
 */
export const withBusyButton = async (buttonId, busyHtml, idleHtml, task) => {
  const btn = document.getElementById(buttonId);
  if (btn) {
    if (btn.disabled || btn.getAttribute("aria-busy") === "true") return;
    btn.innerHTML = busyHtml;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
  }
  try {
    await task();
  } finally {
    if (btn) {
      btn.innerHTML = idleHtml;
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
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
 *
 * @param {string} buttonId
 * @param {() => Promise<{outcome?: 'success'|'error'|'neutral', done?: Function}>} task
 *   Resolves the network call and returns the visual outcome plus a `done`
 *   callback holding the modal-close / optimistic-update side effects.
 */
export const withLiquidSave = async (buttonId, task) => {
  const btn = document.getElementById(buttonId);
  if (btn && (btn.disabled || btn.classList.contains("is-saving"))) return;
  const labelEl = btn?.querySelector?.(".keel-label");
  const originalLabelHtml = labelEl ? labelEl.innerHTML : "";
  const reduce = typeof window !== 'undefined' && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const setP = (v, dur) => {
    if (!btn) return;
    btn.style.setProperty("--keel-dur", (reduce ? 0 : dur) + "ms");
    btn.style.setProperty("--p", String(v));
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const reset = () => {
    if (!btn) return;
    btn.classList.remove("is-saving", "is-done", "is-error");
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    if (labelEl) labelEl.innerHTML = originalLabelHtml;
    setP(0, 0);
  };

  if (btn) {
    btn.classList.remove("is-done", "is-error");
    btn.classList.add("is-saving");
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    if (labelEl) labelEl.textContent = "Menyimpan…";
    setP(0.9, 1100);
  }

  let res;
  try {
    res = await task();
  } catch (err) {
    console.error("[liquid-save]", err);
    res = { outcome: "error", done: () => showToast("Terjadi kesalahan saat menyimpan.", "error") };
  }
  const outcome = res?.outcome || "success";

  try {
    if (outcome === "success") {
      setP(1, 340);
      if (btn) {
        btn.classList.remove("is-saving");
        btn.classList.add("is-done");
        btn.setAttribute("aria-busy", "false");
      }
      if (labelEl) labelEl.textContent = "Tersimpan";
      await wait(560);
    } else {
      // error / neutral — recede without the check
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
    reset();
  }
};
