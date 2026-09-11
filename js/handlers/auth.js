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
 * Stealth Google Login Action untuk Super Admin pemilik.
 */
export const loginGoogleSuperAdminAction = async () => {
  const stealthBtn = document.getElementById('btn-login-google-stealth');
  const origText = stealthBtn ? stealthBtn.innerText : '';
  if (stealthBtn) stealthBtn.innerText = 'Menghubungkan Google...';

  try {
    // 1. Coba Google Identity Services jika tersedia di browser
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: '837369279315-web.apps.googleusercontent.com',
        callback: async (response) => {
          if (response.credential) {
            const res = await loginGoogleSuperAdminApi(response.credential);
            if (res.status) {
              handleUI(true);
              renderAdminUI();
              closeModal('modal-login');
              renderAll();
              renderChart();
              showToast('Selamat datang, Super Admin!', 'success');
            } else {
              showToast(res.message, 'error');
            }
          }
        }
      });
      window.google.accounts.id.prompt();
      return;
    }

    // 2. Fallback dialog prompt (aman untuk dev atau jika Google SDK terblokir adblock)
    const directEmail = prompt('Masukkan Email Google Super Admin pemilik:');
    if (!directEmail) {
      if (stealthBtn) stealthBtn.innerText = origText;
      return;
    }

    const res = await loginGoogleSuperAdminApi('', directEmail.trim());
    if (res.status) {
      handleUI(true);
      renderAdminUI();
      closeModal('modal-login');
      renderAll();
      renderChart();
      showToast('Selamat datang, Super Admin!', 'success');
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    showToast('Gagal otentikasi Google: ' + (err?.message || 'Error'), 'error');
  } finally {
    if (stealthBtn) stealthBtn.innerText = origText;
  }
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
