import { resetPinInput, syncPinInput, wirePinInput } from "../ui/pin-input.js";
/**
 * @module handlers/groups
 * Multi-group support: PIN entry, group isolation and the owner's group console.
 *
 * All group management is performed by the server (`/api/create-group`), which
 * authorizes every action against a signed Super Admin session. The client no
 * longer writes to Firestore directly and no longer reads credential hashes.
 */

import { API, ACTIVE_GROUP_NAME_KEY, ONBOARDING_SEEN_KEY, GROUP_OPEN_KEY } from "../core/config.js";
import {
  clearAdminSession,
  clearGroupSession,
  getActiveGroupId,
  getAdminSession,
  getGroups,
  getIsSuperAdmin,
  setActiveGroupId,
  setGroups,
  setGroupSession
} from "../core/state.js";
import {
  addSuperAdminApi,
  fetchGroupsApi,
  fetchSuperAdminsApi,
  removeSuperAdminApi
} from "../core/api.js";
import { apiPost } from "../core/api-client.js";
import { escapeHtml, showToast } from "../core/utils.js";
import { openModal, closeModal, switchTab } from "../ui/modal.js";
import { handleUI, renderAdminUI } from "./auth.js";

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!";
const MIN_ADMIN_PASSWORD = 6;

let pendingGroupId = "";
let latestCreds = { nama: "", pin: "", email: "", pwd: "" };

/**
 * Generate a cryptographically random admin password without modulo bias.
 * @param {number} [len]
 * @returns {string}
 */
export const generateRandomPassword = (len = 10) => {
  const max = 256 - (256 % PASSWORD_ALPHABET.length);
  const result = [];
  const buf = new Uint8Array(1);
  while (result.length < len) {
    crypto.getRandomValues(buf);
    if (buf[0] < max) {
      result.push(PASSWORD_ALPHABET[buf[0] % PASSWORD_ALPHABET.length]);
    }
  }
  return result.join("");
};

/* ── Group directory ─────────────────────────────────────────────── */

/**
 * Load the group directory (public endpoint — names only).
 * @returns {Promise<Array<{id: string, nama: string, dibuat: string}>>}
 */
export const fetchGroups = async () => {
  const list = await fetchGroupsApi();
  setGroups(list);
  return list;
};

/* ── PIN entry ───────────────────────────────────────────────────── */

/**
 * Verify a group PIN on the server.
 *
 * The server owns the attempt counter (per group and per IP) and returns a
 * signed session token on success, which unlocks reads for that group.
 *
 * @param {string} id
 * @param {string} pin
 * @returns {Promise<{status: boolean, message: string}>}
 */
export const verifyGroupPin = async (id, pin) => {
  const clean = String(pin || "").replace(/\D/g, "").slice(0, 4);
  if (clean.length !== 4) return { status: false, message: "Ketik 4 angka PIN grup." };

  const res = await apiPost(API.VERIFY_PIN, { groupId: id, pin: clean });
  if (!res) return { status: false, message: "Tidak dapat terhubung ke server." };
  if (res.status && res.data?.sessionToken) setGroupSession(id, res.data.sessionToken);
  return res;
};

/** Buka layar PIN untuk grup yang dipilih. Super Admin bypasses PIN. */
export const requestGroupPin = (id) => {
  const found = getGroups().find((g) => g.id === id);
  if (!found) {
    showToast("Grup tidak ditemukan.", "error");
    return;
  }

  // Super Admin masuk langsung tanpa PIN
  if (getIsSuperAdmin()) {
    enterGroup(id);
    return;
  }

  pendingGroupId = id;
  const nameEl = document.getElementById("group-pin-name");
  if (nameEl) nameEl.replaceChildren(document.createTextNode(found.nama));
  resetPinInput(document.getElementById("group-pin"));
  const msg = document.getElementById("group-pin-msg");
  if (msg) msg.replaceChildren();
  closeModal("modal-groups");
  openModal("modal-group-pin");
  setTimeout(() => { document.getElementById("group-pin")?.focus(); }, 120);
};

/** Kirim PIN yang diketik user. */
export const submitGroupPin = async () => {
  if (!pendingGroupId) return;
  const pin = document.getElementById("group-pin")?.value || "";
  const msg = document.getElementById("group-pin-msg");
  const res = await verifyGroupPin(pendingGroupId, pin);

  if (msg) msg.replaceChildren(document.createTextNode(res.message));
  if (!res.status) {
    showToast(res.message, "error");
    const firstPin = document.getElementById("group-pin");
    const pinRow = firstPin?.closest?.(".pin-row");
    if (pinRow) {
      pinRow.classList.remove("is-error");
      void pinRow.offsetWidth;
      pinRow.classList.add("is-error");
    }
    if (firstPin) {
      firstPin.value = "";
      firstPin.setAttribute("aria-invalid", "true");
      syncPinInput(firstPin);
    }
    firstPin?.focus();
    return;
  }
  enterGroup(pendingGroupId);
};

/* ── Group picker ────────────────────────────────────────────────── */

/** Muat daftar grup lalu tampilkan layar pilih grup. */
export const openGroupPicker = async () => {
  // Show modal instantly with cached data (or skeleton if empty), then refresh in background
  renderGroupPicker({ loading: !getGroups().length });
  openModal("modal-groups");
  await fetchGroups();
  renderGroupPicker();
};

/** Gambar daftar grup ke dalam modal pilih grup. */
export const renderGroupPicker = ({ loading = false } = {}) => {
  const box = document.getElementById("group-picker-list");
  if (!box) return;
  const list = getGroups();
  const active = getActiveGroupId();

  const exitBtn = document.getElementById("btn-exit-active-group");
  if (exitBtn) exitBtn.hidden = !active;

  const countEl = document.getElementById("group-picker-count");
  if (countEl) {
    if (loading || !list.length) {
      countEl.hidden = true;
    } else {
      countEl.hidden = false;
      countEl.textContent = `${list.length} grup`;
    }
  }

  if (loading && !list.length) {
    box.innerHTML = `
      <div class="group-picker-skeleton" aria-busy="true" aria-label="Memuat daftar grup...">
        <div class="group-skel-row"></div>
        <div class="group-skel-row"></div>
      </div>`;
    return;
  }

  if (!list.length) {
    box.innerHTML = `
      <div class="group-picker-empty">
        <span class="group-empty-ico" aria-hidden="true"><i class="ph ph-folders"></i></span>
        <strong>Belum ada grup kas tersedia</strong>
        <p>Hubungi pengurus pemilik untuk membuat ruang kas baru.</p>
      </div>`;
    return;
  }

  const isSA = getIsSuperAdmin();
  box.innerHTML = list.map((g) => {
    const rawName = g.nama || "?";
    const safeName = escapeHtml(rawName);
    const safeId = escapeHtml(g.id);
    const initial = escapeHtml((Array.from(String(rawName).trim())[0] || '?').toUpperCase());
    const isActive = g.id === active;
    const subText = isActive
      ? "Grup aktif saat ini"
      : isSA
        ? "Akses langsung tanpa PIN"
        : "Ketuk untuk masuk dengan PIN";
    const trailBadge = isActive
      ? '<span class="group-status-pill is-active"><span class="group-status-dot" aria-hidden="true"></span><span>Aktif</span></span>'
      : isSA
        ? '<span class="group-status-pill is-direct"><i class="ph ph-lightning" aria-hidden="true"></i><span>Instan</span></span>'
        : '<span class="group-pin-badge" aria-hidden="true"><i class="ph ph-lock-simple"></i><span>PIN</span></span>';
    return `
    <button type="button" class="group-item${isActive ? " is-active" : ""}" data-action="request-group-pin" data-id="${safeId}" role="listitem"${isActive ? ' aria-current="true"' : ""}>
      <span class="group-item-avatar" aria-hidden="true">${initial}</span>
      <span class="group-item-meta">
        <span class="group-item-name">${safeName}</span>
        <span class="group-item-sub">${subText}</span>
      </span>
      <span class="group-item-trail">
        ${trailBadge}
        <i class="ph ph-caret-right group-item-chev" aria-hidden="true"></i>
      </span>
    </button>`;
  }).join("");
};

/* ── Enter / exit ────────────────────────────────────────────────── */

/** Masuk grup setelah PIN lolos. */
export const enterGroup = (id) => {
  const currentActive = getActiveGroupId();
  const found = getGroups().find((g) => g.id === id);
  if (!found) return;

  // An admin session only covers its own group, so switching groups ends it.
  if (currentActive && currentActive !== id && !getIsSuperAdmin()) {
    clearAdminSession();
    handleUI();
    renderAdminUI();
  }

  setActiveGroupId(id);
  try {
    localStorage.setItem(GROUP_OPEN_KEY, "1");
    localStorage.setItem(ACTIVE_GROUP_NAME_KEY, found.nama);
  } catch (err) {
    console.warn("[finkas] Cannot persist group state:", err?.message);
  }

  closeModal("modal-groups");
  closeModal("modal-group-pin");
  const nameEl = document.getElementById("app-group-name");
  if (nameEl) nameEl.replaceChildren(document.createTextNode(found.nama));
  window.dispatchEvent(new CustomEvent("finkas:group-changed", { detail: { id } }));
};

/** Keluar dari grup aktif. */
export const exitGroup = () => {
  const currentGid = getActiveGroupId();
  if (currentGid) {
    clearGroupSession(currentGid);
  }
  if (!getIsSuperAdmin()) {
    clearAdminSession();
    handleUI();
    renderAdminUI();
  }
  setActiveGroupId("");
  document.body.dataset.workspaceState = "idle";
  delete document.body.dataset.workspaceGroup;
  try {
    localStorage.removeItem(GROUP_OPEN_KEY);
    localStorage.removeItem(ACTIVE_GROUP_NAME_KEY);
  } catch (err) {
    console.warn("[finkas] Cannot clear group state:", err?.message);
  }
  openGroupPicker();
};

/* ── Owner console ───────────────────────────────────────────────── */

/**
 * Call the group management endpoint with the current admin session.
 * @param {object} body Must include `action`.
 */
const callGroupAdmin = async (body) => {
  const res = await apiPost(API.GROUP_ADMIN, { ...body, sessionToken: getAdminSession() });
  if (!res) return { status: false, message: "Tidak dapat terhubung ke server." };
  return res;
};

/** Tampilkan modal kartu kredensial. */
export const showCredentialsModal = (info) => {
  latestCreds = { ...info };
  document.getElementById("cred-disp-nama")?.replaceChildren(document.createTextNode(info.nama || "-"));
  document.getElementById("cred-disp-pin")?.replaceChildren(document.createTextNode(info.pin || "-"));
  document.getElementById("cred-disp-email")?.replaceChildren(document.createTextNode(info.email || "-"));
  document.getElementById("cred-disp-pwd")?.replaceChildren(document.createTextNode(info.pwd || "-"));
  openModal("modal-group-credentials");
};

/** Salin format WhatsApp. */
export const copyGroupWhatsAppAction = async () => {
  const { nama, pin, email, pwd } = latestCreds;
  const origin = window.location.origin;

  const lines = [
    `*AKUN KAS & IURAN FINKAS*`,
    `Grup: ${nama || "Grup Kas"}`
  ];

  if (pin && pin !== '-' && pin !== '1234') {
    lines.push(`\n📌 *Akses Warga (Lihat Rekap & Kas)*\nPIN Masuk: ${pin}`);
  }

  const hasEmail = email && email !== '-';
  const hasPwd = pwd && pwd !== '-';
  if (hasEmail || hasPwd) {
    const adminLines = [`\n🔐 *Akses Pengurus (Catat & Edit Kas)*`];
    if (hasEmail) adminLines.push(`Email Admin: ${email}`);
    if (hasPwd) adminLines.push(`Password Admin: ${pwd}`);
    lines.push(adminLines.join('\n'));
  }

  lines.push(`\n🌐 Akses Aplikasi:\n${origin}`);
  const text = lines.join('\n');

  try {
    await navigator.clipboard.writeText(text);
    showToast("Format WhatsApp berhasil disalin ke clipboard!", "success");
  } catch (err) {
    showToast("Gagal menyalin, silakan salin teks secara manual.", "warning");
  }
};

/** Atur atau Reset Akun Admin Grup untuk grup tertentu. */
export const manageGroupCredsAction = async (id) => {
  const label = getGroups().find((g) => g.id === id)?.nama || id;
  const defaultSlug = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  const defaultEmail = `admin.${defaultSlug || "kas"}@finkas.id`;

  const emailInput = window.prompt(`Masukkan Email Admin untuk "${label}":`, defaultEmail);
  if (emailInput === null) return;
  const cleanEmail = emailInput.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) { showToast("Email tidak valid.", "error"); return; }

  const generatedPwd = generateRandomPassword(10);
  const pwdInput = window.prompt(`Masukkan Password Admin baru untuk "${label}":`, generatedPwd);
  if (pwdInput === null) return;
  const cleanPwd = pwdInput.trim();
  if (cleanPwd.length < MIN_ADMIN_PASSWORD) {
    showToast(`Password admin minimal ${MIN_ADMIN_PASSWORD} karakter.`, "error");
    return;
  }

  const res = await callGroupAdmin({
    action: "set-admin-credential", groupId: id, adminEmail: cleanEmail, adminPassword: cleanPwd
  });

  if (res.status) {
    showToast("Akun Admin Grup berhasil diset!", "success");
    showCredentialsModal({ nama: label, pin: "(PIN grup tetap sama)", email: cleanEmail, pwd: cleanPwd });
  } else {
    showToast(res.message, "error");
  }
};

/** Buka modal kelola grup. */
export const openGroupAdmin = async () => {
  const searchEl = document.getElementById("search-group-admin");
  if (searchEl) searchEl.value = "";
  switchTab("tab-group-list", "modal-group-admin");
  const chk = document.getElementById("chk-group-admin-auto");
  const box = document.getElementById("box-group-admin-creds");
  if (chk && box) box.hidden = !chk.checked;
  await fetchGroups();
  renderGroupAdmin();
  refreshAutoAdminCreds();
  if (getIsSuperAdmin()) {
    renderSuperAdminList();
  }
  openModal("modal-group-admin");
};

/** Refresh nilai auto kredensial di form tambah grup. */
export const refreshAutoAdminCreds = () => {
  const namaEl = document.getElementById("input-group-nama");
  const emailEl = document.getElementById("input-group-admin-email");
  const pwdEl = document.getElementById("input-group-admin-pwd");

  const nama = (namaEl?.value || "").trim();
  const slug = nama ? nama.toLowerCase().replace(/[^a-z0-9]/g, "") : "baru";
  if (emailEl) emailEl.value = `admin.${slug}@finkas.id`;
  if (pwdEl) pwdEl.value = generateRandomPassword(10);
};

/** Gambar daftar grup di modal admin. */
export const renderGroupAdmin = () => {
  const box = document.getElementById("group-admin-list");
  if (!box) return;
  const list = getGroups();
  const countEl = document.getElementById("group-admin-count");
  if (countEl) countEl.textContent = String(list.length);

  const query = (document.getElementById("search-group-admin")?.value || "").trim().toLowerCase();
  const filtered = query
    ? list.filter((g) => (g.nama || "").toLowerCase().includes(query) || (g.id || "").toLowerCase().includes(query))
    : list;

  const filterMeta = document.getElementById("group-admin-filter-meta");
  if (filterMeta) {
    filterMeta.textContent = query ? `${filtered.length} dari ${list.length} grup` : `${list.length} grup terdaftar`;
  }

  if (!list.length) {
    box.innerHTML = `
      <div class="group-empty-state">
        <i class="ph-fill ph-users-three" aria-hidden="true"></i>
        <p>Belum ada grup terdaftar. Buat grup pertama di atas.</p>
      </div>`;
    return;
  }

  if (!filtered.length) {
    box.innerHTML = `
      <div class="group-empty-state">
        <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
        <p>Tidak ada grup yang cocok dengan pencarian.</p>
      </div>`;
    return;
  }

  const activeId = getActiveGroupId();
  box.innerHTML = filtered.map((g, idx) => {
    const rawName = g.nama || "?";
    const safeName = escapeHtml(rawName);
    const safeId = escapeHtml(g.id);
    const isActive = g.id === activeId;
    const initial = escapeHtml((Array.from(String(rawName).trim())[0] || '?').toUpperCase());
    return `
    <div class="group-card-item${isActive ? " is-active" : ""}" data-id="${safeId}" role="listitem">
      <div class="group-card-main">
        <span class="group-card-avatar" data-index="${idx % 4}" aria-hidden="true">${initial}</span>
        <div class="group-card-details">
          <div class="group-card-title-row">
            <h3 class="group-card-title">${safeName}</h3>
            ${isActive ? '<span class="group-badge-active"><span class="group-status-dot" aria-hidden="true"></span><span>Aktif</span></span>' : ""}
          </div>
          <span class="group-card-id-pill"><i class="ph ph-hash" aria-hidden="true"></i> ${safeId}</span>
        </div>
      </div>
      <div class="group-card-actions">
        <button type="button" class="btn-group-chip" data-action="manage-group-creds" data-id="${safeId}" title="Atur Akun Admin Grup">
          <i class="ph-bold ph-user-gear" aria-hidden="true"></i>
          <span>Admin</span>
        </button>
        <button type="button" class="btn-group-chip" data-action="rename-group" data-id="${safeId}" title="Ubah Nama Grup">
          <i class="ph-bold ph-pencil-simple" aria-hidden="true"></i>
          <span>Nama</span>
        </button>
        <button type="button" class="btn-group-chip" data-action="reset-group-pin" data-id="${safeId}" title="Ubah PIN Grup">
          <i class="ph-bold ph-key" aria-hidden="true"></i>
          <span>PIN</span>
        </button>
        <button type="button" class="btn-group-chip danger" data-action="remove-group" data-id="${safeId}" title="Hapus Grup" aria-label="Hapus ${safeName}">
          <i class="ph-bold ph-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>`;
  }).join("");
};

/** Render daftar email Super Admin. */
export const renderSuperAdminList = async () => {
  const container = document.getElementById("superadmin-emails-list");
  const countEl = document.getElementById("superadmin-count");
  if (!container) return;
  container.innerHTML = '<span class="superadmin-empty-text">Memuat daftar superadmin...</span>';

  const res = await fetchSuperAdminsApi();
  if (!res.status || !Array.isArray(res.data)) {
    if (res.httpStatus === 403 || res.message?.includes("tidak valid") || res.message?.includes("berakhir")) {
      clearAdminSession();
      handleUI();
      closeModal("modal-group-admin");
      showToast("Sesi Super Admin telah berakhir. Silakan login kembali.", "warning");
      return;
    }
    if (countEl) countEl.textContent = "0";
    container.innerHTML = '<span class="superadmin-empty-text">Tidak dapat memuat daftar superadmin.</span>';
    return;
  }

  if (countEl) countEl.textContent = String(res.data.length);
  container.innerHTML = res.data.map((item) => {
    const isPrimary = item.isPrimary;
    const email = escapeHtml(item.email);
    return `
    <div class="superadmin-email-item" role="listitem">
      <div class="superadmin-email-meta">
        <span class="superadmin-avatar" aria-hidden="true"><i class="${isPrimary ? "ph-fill ph-crown" : "ph ph-shield-check"}"></i></span>
        <span class="superadmin-email-text"><strong>${email}</strong> ${isPrimary ? '<span class="superadmin-email-tag">Pemilik Utama</span>' : ""}</span>
      </div>
      ${!isPrimary ? `<button type="button" class="superadmin-email-del" data-action="remove-superadmin-email" data-email="${email}" title="Cabut akses" aria-label="Cabut akses ${email}"><i class="ph-bold ph-trash" aria-hidden="true"></i></button>` : ""}
    </div>`;
  }).join("");
};

/** Submit form tambah superadmin. */
export const submitAddSuperAdminAction = async (e) => {
  e?.preventDefault?.();
  const input = document.getElementById("input-add-superadmin");
  const email = (input?.value || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    showToast("Format email tidak valid.", "error");
    return;
  }

  const res = await addSuperAdminApi(email);
  if (res.httpStatus === 403 || res.message?.includes("tidak valid") || res.message?.includes("berakhir")) {
    clearAdminSession();
    handleUI();
    closeModal("modal-group-admin");
    showToast("Sesi Super Admin telah berakhir. Silakan login kembali.", "warning");
    return;
  }
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    if (input) input.value = "";
    renderSuperAdminList();
  }
};

/** Hapus email superadmin. */
export const removeSuperAdminAction = async (email) => {
  if (!window.confirm(`Cabut akses Super Admin untuk ${email}?`)) return;
  const res = await removeSuperAdminApi(email);
  if (res.httpStatus === 403 || res.message?.includes("tidak valid") || res.message?.includes("berakhir")) {
    clearAdminSession();
    handleUI();
    closeModal("modal-group-admin");
    showToast("Sesi Super Admin telah berakhir. Silakan login kembali.", "warning");
    return;
  }
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) renderSuperAdminList();
};

/** Buat grup baru dari form admin. */
export const submitCreateGroup = async (e) => {
  e?.preventDefault?.();
  const namaEl = document.getElementById("input-group-nama");
  const pinEl = document.getElementById("input-group-pin");
  const chkEl = document.getElementById("chk-group-admin-auto");
  const emailEl = document.getElementById("input-group-admin-email");
  const pwdEl = document.getElementById("input-group-admin-pwd");

  const nama = (namaEl?.value || "").trim().slice(0, 60);
  const rawPin = (pinEl?.value || "").trim();
  const skipAdmin = !chkEl?.checked;
  const adminEmail = (emailEl?.value || "").trim().toLowerCase();
  const adminPassword = (pwdEl?.value || "").trim();

  if (nama.length < 3) {
    showToast("Nama grup minimal 3 karakter.", "error");
    namaEl?.focus();
    return;
  }
  if (!/^\d{4}$/.test(rawPin)) {
    showToast("PIN wajib tepat 4 digit angka.", "error");
    pinEl?.focus();
    return;
  }
  if (!skipAdmin && (!adminEmail || adminPassword.length < MIN_ADMIN_PASSWORD)) {
    showToast(`Password admin minimal ${MIN_ADMIN_PASSWORD} karakter.`, "error");
    return;
  }

  const res = await callGroupAdmin({
    action: "create",
    nama,
    pin: rawPin,
    skipAdmin,
    adminEmail,
    adminPassword
  });

  showToast(res.message, res.status ? "success" : "error");
  if (!res.status) return;

  if (namaEl) namaEl.value = "";
  if (pinEl) pinEl.value = "";
  refreshAutoAdminCreds();
  await fetchGroups();
  renderGroupAdmin();

  if (!skipAdmin && !res.data?.adminPassword) {
    showCredentialsModal({ nama, pin: rawPin, email: adminEmail, pwd: adminPassword });
  } else if (res.data) {
    showCredentialsModal({
      nama,
      pin: res.data.pin || rawPin,
      email: res.data.adminEmail || adminEmail,
      pwd: res.data.adminPassword || ""
    });
  }
};

/** Ubah nama grup. */
export const renameGroupAction = async (id) => {
  const currentName = getGroups().find((g) => g.id === id)?.nama || "";
  const input = window.prompt(`Ubah nama grup "${currentName}":`, currentName);
  if (input === null) return;
  const newName = input.trim().slice(0, 60);
  if (!newName || newName === currentName) return;

  const res = await callGroupAdmin({ action: "rename", groupId: id, nama: newName });
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    await fetchGroups();
    renderGroupAdmin();
  }
};

/** Atur ulang PIN grup. */
export const resetGroupPinAction = async (id) => {
  const label = getGroups().find((g) => g.id === id)?.nama || id;
  const p1 = window.prompt(`Ketik 4 digit PIN baru untuk "${label}":`);
  if (p1 === null) return;
  const pin = p1.replace(/\D/g, "").slice(0, 4);
  if (pin.length !== 4) {
    showToast("PIN wajib berupa 4 angka.", "error");
    return;
  }
  const res = await callGroupAdmin({ action: "set-pin", groupId: id, pin });
  showToast(res.message, res.status ? "success" : "error");
};

/** Hapus grup. */
export const removeGroupAction = async (id) => {
  const label = getGroups().find((g) => g.id === id)?.nama || id;
  if (!window.confirm(`Seluruh data anggota, kas, dan transaksi "${label}" akan terhapus!\n\nLanjutkan?`)) return;
  const typed = window.prompt(`Ketik persis nama grup "${label}" untuk konfirmasi:`);
  if (typed === null || typed.trim().toLowerCase() !== label.trim().toLowerCase()) {
    showToast("Penghapusan dibatalkan.", "warning");
    return;
  }

  const res = await callGroupAdmin({ action: "remove", groupId: id });
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    if (getActiveGroupId() === id) exitGroup();
    await fetchGroups();
    renderGroupAdmin();
  }
};

/** Init UI multi-grup saat boot. */
export const initGroupsUI = (onGroupChanged) => {
  window.addEventListener("finkas:group-changed", () => { onGroupChanged?.(); });

  const activeGid = getActiveGroupId();
  const savedName = localStorage.getItem(ACTIVE_GROUP_NAME_KEY) || "";
  if (savedName) document.getElementById("app-group-name")?.replaceChildren(document.createTextNode(savedName));

  if (activeGid) {
    window.dispatchEvent(new CustomEvent("finkas:group-changed", { detail: { id: activeGid } }));
  } else {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_SEEN_KEY);
    if (!hasSeenOnboarding) {
      window.location.replace("onboarding.html");
      return;
    }
    openGroupPicker();
  }

  document.getElementById("form-create-group")?.addEventListener("submit", submitCreateGroup);
  document.getElementById("form-add-superadmin")?.addEventListener("submit", submitAddSuperAdminAction);
  document.getElementById("search-group-admin")?.addEventListener("input", renderGroupAdmin);

  document.getElementById("input-group-nama")?.addEventListener("input", (e) => {
    const emailEl = document.getElementById("input-group-admin-email");
    const val = (e.target.value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (emailEl) emailEl.value = `admin.${val || "baru"}@finkas.id`;
  });

  document.getElementById("chk-group-admin-auto")?.addEventListener("change", (e) => {
    const box = document.getElementById("box-group-admin-creds");
    if (box) box.hidden = !e.target.checked;
  });

  document.getElementById("btn-refresh-admin-pwd")?.addEventListener("click", () => {
    const pwdEl = document.getElementById("input-group-admin-pwd");
    if (pwdEl) pwdEl.value = generateRandomPassword(10);
  });

  wirePinInput(document.getElementById("group-pin"), submitGroupPin);
};
