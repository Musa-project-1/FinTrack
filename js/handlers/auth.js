/**
 * @module handlers/auth
 * Admin session UI: login, logout, Google Super Admin, and admin visibility.
 *
 * The server issues a signed session token on a successful login (see
 * core/api-auth.js). This module only reflects that session in the interface —
 * it never holds or compares credentials.
 */

import { getIsAdminSession, getIsSuperAdmin, getActiveGroupId, clearAdminSession } from "../core/state.js";
import { loginAdminApi, loginGoogleSuperAdminApi, logoutAdminApi } from "../core/api.js";
import { GOOGLE_CLIENT_ID } from "../core/config.js";
import { showToast } from "../core/utils.js";
import { closeModal } from "../ui/modal.js";
import { renderAll, renderChart } from "../render.js";

const GOOGLE_SDK_SRC = "https://accounts.google.com/gsi/client";

/**
 * Apply the current session to the interface.
 *
 * Admin controls are a presentation concern only — the server authorizes every
 * request independently, so hiding them is convenience, not security.
 */
export const handleUI = () => {
  const isAdmin = getIsAdminSession();
  const isSuper = getIsSuperAdmin();

  document.body.classList.toggle("admin-mode", isAdmin);
  document.body.classList.toggle("superadmin-mode", isSuper);

  document.querySelectorAll(".admin-only").forEach((el) => {
    el.style.display = isAdmin ? "" : "none";
  });
  document.querySelectorAll(".superadmin-only").forEach((el) => {
    el.style.display = isSuper ? "" : "none";
  });
  document.querySelectorAll(".non-admin-only").forEach((el) => {
    el.style.display = isAdmin ? "none" : "";
  });

  renderAdminUI();
};

/** Reflect admin state in the header actions and login buttons. */
export const renderAdminUI = () => {
  const isAdmin = getIsAdminSession();

  const btn = document.getElementById("btn-login-admin");
  if (btn) {
    btn.style.display = isAdmin ? "none" : "";
    btn.innerHTML = '<i class="ph ph-lock-key"></i> Login Admin';
  }

  const btnSheet = document.getElementById("btn-login-menu-sheet");
  if (btnSheet) btnSheet.style.display = isAdmin ? "none" : "";

  const logoutBtn = document.getElementById("btn-logout-admin");
  if (logoutBtn) logoutBtn.style.display = isAdmin ? "" : "none";

  const waBtn = document.getElementById("btn-copy-wa-reminder");
  if (waBtn) waBtn.style.display = isAdmin ? "" : "none";

  const waBtnMobile = document.getElementById("btn-copy-wa-reminder-mobile");
  if (waBtnMobile) waBtnMobile.style.display = isAdmin ? "" : "none";
};

/* ── Password login ──────────────────────────────────────────────── */

/**
 * Submit the admin login form.
 *
 * @param {Event} e
 */
export const submitLoginAdmin = async (e) => {
  e?.preventDefault?.();
  const emailInput = document.getElementById("input-admin-email");
  const pwdInput = document.getElementById("input-admin-pwd");
  const email = (emailInput?.value || "").trim();
  const password = (pwdInput?.value || "").trim();

  if (!password) {
    showToast("Masukkan password admin terlebih dahulu.", "error");
    pwdInput?.focus();
    return;
  }

  const btn = e?.target?.querySelector?.('button[type="submit"]')
    || document.getElementById("btn-submit-login");
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Mengecek...';
    btn.disabled = true;
  }

  try {
    const res = await loginAdminApi(email, password, getActiveGroupId());

    if (res && res.status) {
      if (emailInput) emailInput.value = "";
      if (pwdInput) pwdInput.value = "";
      closeModal("modal-login");
      handleUI();
      renderAll();
      renderChart();

      const roleLabel = getIsSuperAdmin() ? "Super Admin" : "Admin Grup";
      showToast(`Berhasil Login sebagai ${roleLabel}!`, "success");
      return;
    }

    showToast(res ? res.message : "Gagal terhubung ke server.", "error");
    if (pwdInput) {
      pwdInput.value = "";
      pwdInput.focus();
    }
  } finally {
    if (btn) {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }
};

/* ── Google Super Admin ──────────────────────────────────────────── */

/**
 * Load the Google Identity Services SDK on demand.
 * @returns {Promise<void>}
 */
const loadGoogleGsiScript = () => new Promise((resolve, reject) => {
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
  const stealthBtn = document.getElementById("btn-login-google-stealth");
  const originalText = stealthBtn ? stealthBtn.innerText : "";
  if (stealthBtn) {
    stealthBtn.innerText = "Menghubungkan Google...";
    stealthBtn.disabled = true;
  }

  try {
    await loadGoogleGsiScript();

    if (!window.google?.accounts?.oauth2) {
      showToast("Layanan Google Sign-In tidak dapat dimuat. Periksa koneksi internet Anda.", "error");
      return;
    }

    await new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
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
            showToast(res ? res.message : "Gagal login via Google.", "error");
            reject(new Error(res?.message || "Login Google ditolak."));
            return;
          }

          closeModal("modal-login");
          handleUI();
          renderAll();
          renderChart();
          showToast("Selamat datang, Super Admin!", "success");
          resolve(res);
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
let stealthBadgeTimer = null;

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
