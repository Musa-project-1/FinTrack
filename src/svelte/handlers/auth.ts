/**
 * @module handlers/auth
 * Admin session UI: login, logout, Google Super Admin, and admin visibility.
 *
 * The server issues a signed session token on a successful login (see
 * core/api-auth.js). This module only reflects that session in the interface —
 * it never holds or compares credentials.
 */

import {
  getIsAdminSession,
  getIsSuperAdmin,
  getIsAdminView,
  getIsSuperAdminView,
  getAdminViewMode,
  setAdminViewMode,
  getActiveGroupId,
  clearAdminSession
} from "../../core/state.js";
import { loginAdminApi, loginGoogleSuperAdminApi, logoutAdminApi } from "../../core/api.js";
import { GOOGLE_CLIENT_ID } from "../../core/config.js";
import { getInput, htmlElements, buttonIcon, showToast } from "../../core/utils.js";
import { closeModal } from "../ui/modal";
import { syncBulkDues } from "../ui/bulk-dues";
import { syncWorkspaceGliders } from "../ui/workspace";
import { renderAll, renderChart } from "../render/index";

const GOOGLE_SDK_SRC = "https://accounts.google.com/gsi/client";

const syncRoleAdminTitle = () => {
  const roleAdminBtn = document.getElementById("role-btn-admin");
  if (!roleAdminBtn) return;
  const isSuperSession = getIsSuperAdmin();
  roleAdminBtn.title = isSuperSession
    ? (isEnglish() ? "Super Admin Mode" : "Mode Super Admin")
    : (isEnglish() ? "Admin Mode" : "Mode Admin");
};

const syncRoleSwitcherUI = (isAdminView: boolean) => {
  const memberBtn = document.getElementById("role-btn-anggota");
  const adminBtn = document.getElementById("role-btn-admin");
  if (memberBtn) {
    memberBtn.setAttribute("aria-selected", String(!isAdminView));
    memberBtn.tabIndex = !isAdminView ? 0 : -1;
  }
  if (adminBtn) {
    adminBtn.setAttribute("aria-selected", String(isAdminView));
    adminBtn.tabIndex = isAdminView ? 0 : -1;
  }
  syncRoleAdminTitle();

  const switcherTrack = document.getElementById("role-switcher");
  const activeRoleBtn = isAdminView ? adminBtn : memberBtn;
  if (switcherTrack && activeRoleBtn?.offsetWidth) {
    switcherTrack.style.setProperty("--glider-left", `${activeRoleBtn.offsetLeft}px`);
    switcherTrack.style.setProperty("--glider-width", `${activeRoleBtn.offsetWidth}px`);
  }
  syncWorkspaceGliders();
};

/**
 * Apply the current session and active view mode to the interface.
 *
 * Admin controls are a presentation concern only — the server authorizes every
 * request independently, so toggling preview mode is convenience, not security.
 */
export const handleUI = () => {
  const hasSession = getIsAdminSession();
  const isAdminView = getIsAdminView();
  const isSuperView = getIsSuperAdminView();

  document.body.classList.toggle("admin-session", hasSession);
  document.body.classList.toggle("admin-mode", isAdminView);
  document.body.classList.toggle("superadmin-mode", isSuperView);
  document.documentElement.dataset.role = isAdminView ? "admin" : "anggota";

  htmlElements(".admin-session-only").forEach((el) => {
    el.style.display = hasSession ? "" : "none";
  });
  htmlElements(".admin-only").forEach((el) => {
    el.style.display = isAdminView ? "" : "none";
  });
  htmlElements(".superadmin-only").forEach((el) => {
    el.style.display = isSuperView ? "" : "none";
  });
  htmlElements(".non-admin-only").forEach((el) => {
    el.style.display = isAdminView ? "none" : "";
  });

  syncRoleSwitcherUI(isAdminView);
  renderAdminUI();
};

/** Switch between Admin View and Member Preview View without ending the admin session. */
export const setAdminViewModeAction = (mode?: string) => {
  if (!getIsAdminSession()) return;
  const nextMode = mode === "anggota" ? "anggota" : "admin";
  if (getAdminViewMode() === nextMode) return;

  setAdminViewMode(nextMode);
  handleUI();
  syncBulkDues();
  renderAll();

  if (nextMode === "anggota") {
    showToast(
      isEnglish() ? "Switched to Member View (Preview)." : "Beralih ke Tampilan Anggota (Pratinjau).",
      "info"
    );
    return;
  }

  const isSuper = getIsSuperAdmin();
  showToast(
    isSuper
      ? (isEnglish() ? "Switched back to Super Admin Mode." : "Kembali ke Mode Super Admin.")
      : (isEnglish() ? "Switched back to Admin Mode." : "Kembali ke Mode Admin."),
    "success"
  );
};

/** Wire keyboard navigation (ArrowLeft/Right, Home, End) and i18n title sync for #role-switcher. */
export const initRoleSwitcher = () => {
  const switcher = document.getElementById("role-switcher");
  if (!switcher) return;

  const tabs = [...htmlElements('[role="tab"]', switcher)];
  switcher.addEventListener("keydown", (event) => {
    const current = tabs.findIndex(tab => tab === event.target);
    if (current < 0) return;
    const last = tabs.length - 1;
    const next = {
      ArrowLeft: current === 0 ? last : current - 1,
      ArrowRight: current === last ? 0 : current + 1,
      Home: 0,
      End: last
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    tabs[next].focus();
    setAdminViewModeAction(tabs[next].dataset.role);
  });

  document.addEventListener("finkas:language-changed", syncRoleAdminTitle);
};

/** Reflect admin state in the header actions and login buttons. */
export const renderAdminUI = () => {
  const isAdmin = getIsAdminSession();

  const btn = document.getElementById("btn-login-admin");
  if (btn) {
    btn.style.display = isAdmin ? "none" : "";
    btn.replaceChildren(buttonIcon("ph ph-lock-key"), document.createTextNode(" Login Admin"));
  }

  const btnSheet = document.getElementById("btn-login-menu-sheet");
  if (btnSheet) btnSheet.style.display = isAdmin ? "none" : "";

  const logoutBtn = document.getElementById("btn-logout-admin");
  if (logoutBtn) logoutBtn.style.display = isAdmin ? "" : "none";
};

/* ── Login Modal UI Helpers ──────────────────────────────────────── */

const isEnglish = () => document.body?.dataset?.lang === "en";

const syncLoginGroupContext = () => {
  const groupEl = document.getElementById("auth-login-group-name");
  if (!groupEl) return;
  const activeGroupName = document.getElementById("app-group-name")?.textContent?.trim() || "Finkas";
  groupEl.textContent = activeGroupName;
};

const clearLoginError = () => {
  const errEl = document.getElementById("auth-login-error");
  const errTextEl = document.getElementById("auth-login-error-text");
  if (errEl) errEl.hidden = true;
  if (errTextEl) errTextEl.textContent = "";
  for (const id of ["input-admin-email", "input-admin-pwd"]) {
    const input = document.getElementById(id);
    if (!input) continue;
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
};

const showLoginError = (message: string | undefined, targetInput: HTMLElement | null) => {
  const errEl = document.getElementById("auth-login-error");
  const errTextEl = document.getElementById("auth-login-error-text");
  if (errTextEl) errTextEl.textContent = message ?? "";
  if (errEl) {
    errEl.hidden = false;
    if (errEl.style) {
      errEl.style.animation = "none";
      void errEl.offsetWidth;
      errEl.style.animation = "";
    }
  }
  const target = targetInput || document.getElementById("input-admin-pwd");
  if (target) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-describedby", "auth-login-error");
  }
};

const resetPasswordVisibility = () => {
  const pwdInput = getInput("input-admin-pwd");
  const toggleBtn = document.getElementById("btn-toggle-pwd");
  const icon = document.getElementById("icon-toggle-pwd");
  const capsHint = document.getElementById("auth-capslock-hint");
  if (pwdInput) pwdInput.type = "password";
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-pressed", "false");
    toggleBtn.setAttribute("aria-label", isEnglish() ? "Show password" : "Tampilkan kata sandi");
  }
  if (icon) icon.className = "ph ph-eye";
  if (capsHint) capsHint.hidden = true;
};

const prepareLoginModal = () => {
  syncLoginGroupContext();
  clearLoginError();
  resetPasswordVisibility();
};

/** Wire login modal UX helpers (group context, inline alerts, password toggle, Caps Lock). */
export const initLoginModal = () => {
  const modal = document.getElementById("modal-login");
  if (!modal) return;

  document.addEventListener("finkas:modal-opened", (e) => {
    if (e.detail?.id === "modal-login") prepareLoginModal();
  });
  window.addEventListener("finkas:group-changed", syncLoginGroupContext);
  modal.addEventListener("close", () => {
    resetPasswordVisibility();
    clearLoginError();
  });

  const btnTogglePwd = document.getElementById("btn-toggle-pwd");
  btnTogglePwd?.addEventListener("click", () => {
    const pwdInput = getInput("input-admin-pwd");
    const icon = document.getElementById("icon-toggle-pwd");
    if (!pwdInput) return;
    const nextVisible = pwdInput.type === "password";
    pwdInput.type = nextVisible ? "text" : "password";
    btnTogglePwd.setAttribute("aria-pressed", String(nextVisible));
    btnTogglePwd.setAttribute(
      "aria-label",
      nextVisible
        ? (isEnglish() ? "Hide password" : "Sembunyikan kata sandi")
        : (isEnglish() ? "Show password" : "Tampilkan kata sandi")
    );
    if (icon) icon.className = nextVisible ? "ph ph-eye-slash" : "ph ph-eye";
  });

  const emailInput = document.getElementById("input-admin-email");
  const pwdInput = document.getElementById("input-admin-pwd");
  const capsHint = document.getElementById("auth-capslock-hint");
  emailInput?.addEventListener("input", clearLoginError);
  pwdInput?.addEventListener("input", clearLoginError);

  const syncCapsLock = (e: KeyboardEvent) => {
    if (!capsHint || typeof e?.getModifierState !== "function") return;
    capsHint.hidden = !e.getModifierState("CapsLock");
  };
  pwdInput?.addEventListener("keydown", syncCapsLock);
  pwdInput?.addEventListener("keyup", syncCapsLock);
  pwdInput?.addEventListener("blur", () => {
    if (capsHint) capsHint.hidden = true;
  });
};

/* ── Password login ──────────────────────────────────────────────── */

/**
 * Submit the admin login form.
 */
export const submitLoginAdmin = async (e: Event) => {
  e?.preventDefault?.();
  clearLoginError();

  const emailInput = getInput("input-admin-email");
  const pwdInput = getInput("input-admin-pwd");
  const email = (emailInput?.value || "").trim();
  const password = (pwdInput?.value || "").trim();

  if (email && emailInput?.checkValidity && !emailInput.checkValidity()) {
    showLoginError("Format email tidak valid.", emailInput);
    emailInput.focus();
    return;
  }

  if (!password) {
    showLoginError("Masukkan kata sandi pengurus terlebih dahulu.", pwdInput);
    pwdInput?.focus();
    return;
  }

  const form = (e?.target as HTMLFormElement | null);
  const btn = form?.querySelector?.<HTMLButtonElement>('button[type="submit"]')
    || (document.getElementById("btn-submit-login") as HTMLButtonElement | null);
  const savedChildren = btn ? Array.from(btn.childNodes) : [];
  if (btn) {
    const label = document.createElement("span");
    label.textContent = "Mengecek...";
    btn.replaceChildren(buttonIcon("ph ph-spinner-gap ph-spin"), label);
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
  }

  try {
    const res = await loginAdminApi(email, password, getActiveGroupId());

    if (res && res.status) {
      if (emailInput) emailInput.value = "";
      if (pwdInput) pwdInput.value = "";
      resetPasswordVisibility();
      closeModal("modal-login");
      handleUI();
      renderAll();
      renderChart();

      const roleLabel = getIsSuperAdmin() ? "Super Admin" : "Admin Grup";
      showToast(`Berhasil Login sebagai ${roleLabel}!`, "success");
      return;
    }

    showLoginError(res ? res.message : "Gagal terhubung ke server.", pwdInput);
    if (pwdInput) {
      pwdInput.value = "";
      pwdInput.focus();
    }
  } finally {
    if (btn) {
      btn.replaceChildren(...savedChildren);
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  }
};

/* ── Google Super Admin ──────────────────────────────────────────── */

/**
 * Load the Google Identity Services SDK on demand.
 */
const loadGoogleGsiScript = () => new Promise<void>((resolve, reject) => {
  if (window.google?.accounts?.oauth2) {
    resolve();
    return;
  }

  const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
  if (existing) {
    existing.addEventListener("load", () => resolve());
    existing.addEventListener("error", () => reject(new Error("Gagal memuat script Google")));
    if (window.google?.accounts?.oauth2) resolve();
    return;
  }

  const script = document.createElement("script");
  script.src = GOOGLE_SDK_SRC;
  script.async = true;
  script.defer = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("Gagal memuat Google Sign-In SDK."));
  document.head.appendChild(script);
});

/**
 * Stealth Super Admin login: opens the official Google account picker, then
 * exchanges the returned token for a Super Admin session on the server.
 */
export const loginGoogleSuperAdminAction = async () => {
  const stealthBtn = (document.getElementById("btn-login-google-stealth") as HTMLButtonElement | null);
  const originalText = stealthBtn ? stealthBtn.innerText : "";
  if (stealthBtn) {
    stealthBtn.innerText = "Menghubungkan Google...";
    stealthBtn.disabled = true;
  }

  try {
    await loadGoogleGsiScript();

    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      showToast("Layanan Google Sign-In tidak dapat dimuat. Periksa koneksi internet Anda.", "error");
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const client = oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "email profile openid",
        callback: async (tokenResponse) => {
          if (tokenResponse?.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }
          if (!tokenResponse?.access_token) {
            reject(new Error("Token otentikasi tidak diterima dari Google."));
            return;
          }

          const res = await loginGoogleSuperAdminApi(tokenResponse.access_token);
          if (!res?.status) {
            showToast(res?.message || "Gagal login via Google.", "error");
            reject(new Error(res?.message || "Login Google ditolak."));
            return;
          }

          closeModal("modal-login");
          handleUI();
          renderAll();
          renderChart();
          showToast("Selamat datang, Super Admin!", "success");
          resolve();
        },
        error_callback: (err) => {
          reject(new Error(err?.message || "Jendela Google ditutup atau dibatalkan."));
        }
      });

      client.requestAccessToken({ prompt: "select_account" });
    });
  } catch (err) {
    const message = err?.message || "";
    if (!message.includes("user_cancel") && !message.includes("closed")) {
      showToast(message ? `Otentikasi Google: ${message}` : "Otentikasi Google dibatalkan.", "info");
    }
  } finally {
    if (stealthBtn) {
      stealthBtn.innerText = originalText;
      stealthBtn.disabled = false;
    }
  }
};

let stealthBadgeClicks = 0;
let stealthBadgeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Trigger the stealth login when the login modal's lock badge is tapped 3×.
 */
export const handleStealthBadgeClick = () => {
  stealthBadgeClicks += 1;
  if (stealthBadgeTimer) clearTimeout(stealthBadgeTimer);

  if (stealthBadgeClicks >= 3) {
    stealthBadgeClicks = 0;
    loginGoogleSuperAdminAction();
    return;
  }

  stealthBadgeTimer = setTimeout(() => {
    stealthBadgeClicks = 0;
  }, 1200);
};

/* ── Logout ──────────────────────────────────────────────────────── */

/** End the admin session. */
export const logoutAdminAction = async () => {
  closeModal("modal-logout");

  const res = await logoutAdminApi();
  if (res?.status) {
    handleUI();
    renderAll();
    showToast("Berhasil logout.", "success");
    return;
  }

  // Even if the audit note failed, the local session must not survive.
  clearAdminSession();
  handleUI();
  renderAll();
  showToast("Berhasil logout.", "success");
};
