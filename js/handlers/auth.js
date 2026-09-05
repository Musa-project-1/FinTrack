import { getState, setState, getIsAdminSession, setIsAdminSession, getAdminPassword, setAdminPassword, clearAdminPassword } from "../state.js";
import { loginAdminApi, logoutAdminApi } from "../api.js";
import { showToast, hashText } from "../utils.js";
import { openModal, closeModal } from "../modal.js";
import { renderAll, renderChart } from "../render.js";

export const handleUI = (isAdmin) => {
  setIsAdminSession(!!isAdmin);
  document.body.classList.toggle('admin-mode', getIsAdminSession());
  document.querySelectorAll('.admin-only').forEach((el) => {
    el.style.display = getIsAdminSession() ? '' : 'none';
  });
  document.querySelectorAll('.non-admin-only').forEach((el) => {
    el.style.display = getIsAdminSession() ? 'none' : '';
  });
  const btn = document.getElementById('btn-login-admin');
  if (btn) {
    btn.style.display = getIsAdminSession() ? 'none' : '';
    btn.innerHTML = '<i class="ph ph-lock-key"></i> Login Admin';
  }
  const logoutBtn = document.getElementById('btn-logout-admin');
  if (logoutBtn) logoutBtn.style.display = getIsAdminSession() ? '' : 'none';
};

export const renderAdminUI = () => {
  const btn = document.getElementById('btn-login-admin');
  if (btn) {
    btn.innerHTML = getIsAdminSession()
      ? '<i class="ph-fill ph-lock-key-open"></i> Admin Aktif'
      : '<i class="ph ph-lock-key"></i> Login';
  }
  document.body.classList.toggle('admin-mode', getIsAdminSession());
  const waBtn = document.getElementById('btn-copy-wa-reminder');
  if (waBtn) waBtn.style.display = getIsAdminSession() ? '' : 'none';
};

/* ══════════════════════════════════════════════════════════════════
   ADMIN LOGIN / LOGOUT
   ══════════════════════════════════════════════════════════════════ */

export const submitLoginAdmin = async (e) => {
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Mengecek...';
  btn.disabled = true;

  const pwd = document.getElementById('input-admin-pwd').value;
  const hashedPwd = await hashText(pwd);
  const resJSON = await loginAdminApi(pwd);

  if (resJSON && resJSON.status) {
    setAdminPassword(hashedPwd);
    handleUI(true);
    renderAdminUI();
    closeModal('modal-login');
    document.getElementById('input-admin-pwd').value = '';
    renderAll();
    renderChart();
    showToast('Berhasil Login sebagai Admin!', 'success');
  } else {
    showToast(resJSON ? resJSON.message : 'Gagal terhubung ke server.', 'error');
    document.getElementById('input-admin-pwd').value = '';
    document.getElementById('input-admin-pwd').focus();
  }

  btn.innerHTML = originalText;
  btn.disabled = false;
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

/* ══════════════════════════════════════════════════════════════════
   HISTORY FILTER
   ══════════════════════════════════════════════════════════════════ */

