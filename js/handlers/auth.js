import {
  getState,
  setState,
  getIsAdminSession,
  setIsAdminSession,
  getIsSuperAdmin,
  setIsSuperAdmin,
  getAdminRole,
  setAdminRole,
  setAdminEmail,
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,
  getActiveGroupId
} from "../core/state.js";
import { loginAdminApi, loginGoogleSuperAdminApi, logoutAdminApi } from "../core/api.js";
import { GOOGLE_CLIENT_ID } from "../core/config.js";
import { showToast, hashText } from "../core/utils.js";
import { openModal, closeModal } from "../ui/modal.js";
import { renderAll, renderChart } from "../render.js";

export const handleUI = (isAdmin) => {
  setIsAdminSession(!!isAdmin);
  const isSuper = getIsSuperAdmin();
  document.body.classList.toggle('admin-mode', getIsAdminSession());
  document.body.classList.toggle('superadmin-mode', isSuper);

  document.querySelectorAll('.admin-only').forEach((el) => {
    el.style.display = getIsAdminSession() ? '' : 'none';
  });
  document.querySelectorAll('.superadmin-only').forEach((el) => {
    el.style.display = isSuper ? '' : 'none';
  });
  document.querySelectorAll('.non-admin-only').forEach((el) => {
    el.style.display = getIsAdminSession() ? 'none' : '';
  });

  const btn = document.getElementById('btn-login-admin');
  if (btn) {
    btn.style.display = getIsAdminSession() ? 'none' : '';
    btn.innerHTML = '<i class="ph ph-lock-key"></i> Login Admin';
  }
  const btnSheet = document.getElementById('btn-login-menu-sheet');
  if (btnSheet) {
    btnSheet.style.display = getIsAdminSession() ? 'none' : '';
  }
  const logoutBtn = document.getElementById('btn-logout-admin');
  if (logoutBtn) logoutBtn.style.display = getIsAdminSession() ? '' : 'none';
};

export const renderAdminUI = () => {
  const isSuper = getIsSuperAdmin();
  const isAdmin = getIsAdminSession();
  const btn = document.getElementById('btn-login-admin');
  if (btn) {
    btn.style.display = isAdmin ? 'none' : '';
    btn.innerHTML = '<i class="ph ph-lock-key"></i> Login Admin';
  }
  const btnSheet = document.getElementById('btn-login-menu-sheet');
  if (btnSheet) {
    btnSheet.style.display = isAdmin ? 'none' : '';
  }
  document.body.classList.toggle('admin-mode', isAdmin);
  document.body.classList.toggle('superadmin-mode', isSuper);

  const waBtn = document.getElementById('btn-copy-wa-reminder');
  if (waBtn) waBtn.style.display = isAdmin ? '' : 'none';
  const waBtnMobile = document.getElementById('btn-copy-wa-reminder-mobile');
  if (waBtnMobile) waBtnMobile.style.display = isAdmin ? '' : 'none';
};

/* ══════════════════════════════════════════════════════════════════
   ADMIN LOGIN / LOGOUT
   ══════════════════════════════════════════════════════════════════ */

export const submitLoginAdmin = async (e) => {
  const emailInput = document.getElementById('input-admin-email');
  const pwdInput = document.getElementById('input-admin-pwd');
  const email = (emailInput?.value || '').trim();
  const pwd = (pwdInput?.value || '').trim();

  if (!pwd) {
    showToast('Masukkan password admin terlebih dahulu.', 'error');
    pwdInput?.focus();
    return;
  }

  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Mengecek...';
  btn.disabled = true;

  const hashedPwd = await hashText(pwd);
  const activeGid = getActiveGroupId();
  const resJSON = await loginAdminApi(email, pwd, activeGid);

  if (resJSON && resJSON.status) {
    const isSuper = resJSON.data?.role === 'superadmin' || !!resJSON.data?.isSuperAdmin;
    setIsSuperAdmin(isSuper);
    setAdminRole(isSuper ? 'superadmin' : 'group_admin');
    if (resJSON.data?.email) setAdminEmail(resJSON.data.email);
    setAdminPassword(hashedPwd);

    handleUI(true);
    renderAdminUI();
    closeModal('modal-login');
    if (emailInput) emailInput.value = '';
    if (pwdInput) pwdInput.value = '';
    renderAll();
    renderChart();

    const roleLabel = isSuper ? 'Super Admin' : 'Admin Grup';
    showToast(`Berhasil Login sebagai ${roleLabel}!`, 'success');
  } else {
    showToast(resJSON ? resJSON.message : 'Gagal terhubung ke server.', 'error');
    if (pwdInput) {
      pwdInput.value = '';
      pwdInput.focus();
    }
  }

  btn.innerHTML = originalText;
  btn.disabled = false;
};

/**
 * Helper untuk memuat SDK Google Identity Services secara dinamis jika belum ada.
 */
const loadGoogleGsiScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Gagal memuat script Google')));
      if (window.google?.accounts?.oauth2) return resolve();
      setTimeout(resolve, 1500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Google Sign-In SDK.'));
    document.head.appendChild(script);
  });
};

/**
 * Stealth Google Login Action untuk Super Admin pemilik.
 * Membuka jendela pop-up resmi pemilih akun Google.
 */
export const loginGoogleSuperAdminAction = async () => {
  const stealthBtn = document.getElementById('btn-login-google-stealth');
  const origText = stealthBtn ? stealthBtn.innerText : '';
  if (stealthBtn) {
    stealthBtn.innerText = 'Menghubungkan Google...';
    stealthBtn.disabled = true;
  }

  try {
    if (!window.google?.accounts?.oauth2) {
      await loadGoogleGsiScript();
    }

    if (!window.google?.accounts?.oauth2) {
      showToast('Layanan Google Sign-In tidak dapat dimuat. Periksa koneksi internet Anda.', 'error');
      return;
    }

    await new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse?.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }
          if (!tokenResponse?.access_token) {
            reject(new Error('Token otentikasi tidak diterima dari Google.'));
            return;
          }

          try {
            const res = await loginGoogleSuperAdminApi(tokenResponse.access_token);
            if (res.status) {
              handleUI(true);
              renderAdminUI();
              closeModal('modal-login');
              renderAll();
              renderChart();
              showToast('Selamat datang, Super Admin!', 'success');
              resolve(res);
            } else {
              showToast(res.message, 'error');
              reject(new Error(res.message));
            }
          } catch (e) {
            showToast('Gagal memproses login Google: ' + e.message, 'error');
            reject(e);
          }
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'Jendela Google ditutup atau dibatalkan.'));
        }
      });

      // Buka popup resmi Google (aman & privat, tidak membocorkan email pemilik ke orang lain)
      client.requestAccessToken({ prompt: 'select_account' });
    });
  } catch (err) {
    const msg = err?.message || '';
    if (!msg.includes('user_cancel') && !msg.includes('closed')) {
      showToast(msg ? `Otentikasi Google: ${msg}` : 'Otentikasi Google dibatalkan.', 'info');
    }
  } finally {
    if (stealthBtn) {
      stealthBtn.innerText = origText;
      stealthBtn.disabled = false;
    }
  }
};

let stealthBadgeClicks = 0;
let stealthBadgeTimer = null;

/**
 * Trigger stealth login jika ikon gembok modal login diketuk 3x berturut-turut.
 */
export const handleStealthBadgeClick = () => {
  stealthBadgeClicks++;
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

export const logoutAdminAction = async () => {
  closeModal('modal-logout');
  const res = await logoutAdminApi();
  if (res && res.status) {
    setIsAdminSession(false);
    clearAdminPassword();
    renderAdminUI();
    handleUI(false);
    renderAll();
    showToast('Berhasil logout.', 'success');
  } else {
    showToast('Gagal logout dari server.', 'error');
  }
};
