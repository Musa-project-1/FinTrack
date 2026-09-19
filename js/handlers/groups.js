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
  getActiveGroupId,
  getAdminEmail,
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
import { openModal, closeModal } from "../ui/modal.js";
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

/** Buka layar PIN untuk grup yang dipilih. */
export const requestGroupPin = (id) => {
  const found = getGroups().find((g) => g.id === id);
  if (!found) {
    showToast("Grup tidak ditemukan.", "error");
    return;
  }
  pendingGroupId = id;
  const nameEl = document.getElementById("group-pin-name");
  if (nameEl) nameEl.replaceChildren(document.createTextNode(found.nama));
  ["pin0", "pin1", "pin2", "pin3"].forEach((p) => {
    const el = document.getElementById(p);
    if (el) el.value = "";
  });
  const msg = document.getElementById("group-pin-msg");
  if (msg) msg.replaceChildren();
  closeModal("modal-groups");
  openModal("modal-group-pin");
  setTimeout(() => { document.getElementById("pin0")?.focus(); }, 120);
};

/** Kirim PIN yang diketik user. */
export const submitGroupPin = async () => {
  if (!pendingGroupId) return;
  const pin = ["pin0", "pin1", "pin2", "pin3"].map((p) => document.getElementById(p)?.value || "").join("");
  const msg = document.getElementById("group-pin-msg");
  const res = await verifyGroupPin(pendingGroupId, pin);

  if (msg) msg.replaceChildren(document.createTextNode(res.message));
  if (!res.status) {
    showToast(res.message, "error");
    ["pin0", "pin1", "pin2", "pin3"].forEach((p) => {
      const el = document.getElementById(p);
      if (el) el.value = "";
    });
    document.getElementById("pin0")?.focus();
    return;
  }
  enterGroup(pendingGroupId);
};

/* ── Group picker ────────────────────────────────────────────────── */

/** Muat daftar grup lalu tampilkan layar pilih grup. */
export const openGroupPicker = async () => {
  // Show modal instantly with cached data, then refresh in background
  renderGroupPicker();
  openModal("modal-groups");
  await fetchGroups();
  renderGroupPicker();
};

/** Gambar daftar grup ke dalam modal pilih grup. */
export const renderGroupPicker = () => {
  const box = document.getElementById("group-picker-list");
  if (!box) return;
  const list = getGroups();
  const active = getActiveGroupId();

  if (!list.length) {
    box.innerHTML = '<div class="group-empty-state"><p class="text-muted">Belum ada grup. Minta admin pemilik membuatkan grup.</p></div>';
    return;
  }

  box.innerHTML = list.map((g) => {
    const safeName = escapeHtml(g.nama || "?");
    const safeId = escapeHtml(g.id);
    return `
    <button class="group-item${g.id === active ? " is-active" : ""}" data-action="request-group-pin" data-id="${safeId}">
      <span class="avatar">${safeName.charAt(0).toUpperCase()}</span>
      <span><h3>${safeName}</h3><small>${g.id === active ? "Grup aktif" : "Ketuk untuk masuk"}</small></span>
      <span class="chev">›</span>
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
  if (!getIsSuperAdmin()) {
    clearAdminSession();
    handleUI();
    renderAdminUI();
  }
  setActiveGroupId("");
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
  document.getElementById("cred-disp-pin")?.replaceChildren(document.createTextNode(info.pin || "1234"));
  document.getElementById("cred-disp-email")?.replaceChildren(document.createTextNode(info.email || "-"));
  document.getElementById("cred-disp-pwd")?.replaceChildren(document.createTextNode(info.pwd || "-"));
  openModal("modal-group-credentials");
};

/** Salin format WhatsApp. */
export const copyGroupWhatsAppAction = async () => {
  const { nama, pin, email, pwd } = latestCreds;
  const origin = window.location.origin;
  const text = `*AKUN KAS & IURAN FINKAS*
Grup: ${nama || "Grup Kas"}

📌 *Akses Warga (Lihat Rekap & Kas)*
PIN Masuk: ${pin || "1234"}

🔐 *Akses Pengurus (Catat & Edit Kas)*
Email Admin: ${email || "-"}
Password Admin: ${pwd || "-"}

🌐 Akses Aplikasi:
${origin}`;

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
  await fetchGroups();
  renderGroupAdmin();
  refreshAutoAdminCreds();
  renderSuperAdminList();
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
  if (countEl) countEl.textContent = `${list.length} Grup`;

  if (!list.length) {
    box.innerHTML = `
      <div class="group-empty-state">
        <i class="ph-fill ph-users-three"></i>
        <p>Belum ada grup terdaftar. Buat grup pertama di atas.</p>
      </div>`;
    return;
  }

  const activeId = getActiveGroupId();
  box.innerHTML = list.map((g, idx) => {
    const safeName = escapeHtml(g.nama || "?");
    const safeId = escapeHtml(g.id);
    const isActive = g.id === activeId;
    const initial = safeName.charAt(0).toUpperCase();
    return `
    <div class="group-card-item${isActive ? " is-active" : ""}" data-id="${safeId}">
      <div class="group-card-main">
        <span class="group-card-avatar" data-index="${idx % 4}">${initial}</span>
        <div class="group-card-details">
          <div class="group-card-title-row">
            <h3 class="group-card-title">${safeName}</h3>
            ${isActive ? '<span class="group-badge-active"><i class="ph-fill ph-check-circle"></i> Aktif</span>' : ""}
          </div>
          <span class="group-card-id-pill"><i class="ph ph-hash"></i> ${safeId}</span>
        </div>
      </div>
      <div class="group-card-actions">
        <button class="btn-group-chip" data-action="manage-group-creds" data-id="${safeId}" title="Atur Akun Admin Grup">
          <i class="ph-bold ph-user-gear"></i>
          <span>Admin</span>
        </button>
        <button class="btn-group-chip" data-action="rename-group" data-id="${safeId}" title="Ubah Nama Grup">
          <i class="ph-bold ph-pencil-simple"></i>
          <span>Nama</span>
        </button>
        <button class="btn-group-chip" data-action="reset-group-pin" data-id="${safeId}" title="Ubah PIN Grup">
          <i class="ph-bold ph-key"></i>
          <span>PIN</span>
        </button>
        <button class="btn-group-chip danger" data-action="remove-group" data-id="${safeId}" title="Hapus Grup" aria-label="Hapus ${safeName}">
          <i class="ph-bold ph-trash"></i>
        </button>
      </div>
    </div>`;
  }).join("");
};

/** Render daftar email Super Admin. */
export const renderSuperAdminList = async () => {
  const container = document.getElementById("superadmin-emails-list");
  if (!container) return;
  container.innerHTML = '<span class="superadmin-empty-text">Memuat daftar superadmin...</span>';

  const res = await fetchSuperAdminsApi();
  if (!res.status || !Array.isArray(res.data)) {
    container.innerHTML = '<span class="superadmin-empty-text">Tidak dapat memuat daftar superadmin.</span>';
    return;
  }

  container.innerHTML = res.data.map((item) => {
    const isPrimary = item.isPrimary;
    const email = escapeHtml(item.email);
    return `
    <div class="superadmin-email-item">
      <span class="superadmin-email-text"><strong>${email}</strong> ${isPrimary ? '<span class="superadmin-email-tag">(Pemilik Utama)</span>' : ""}</span>
      ${!isPrimary ? `<button type="button" class="superadmin-email-del" data-action="remove-superadmin-email" data-email="${email}" aria-label="Cabut akses ${email}"><i class="ph-bold ph-trash"></i></button>` : ""}
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

  document.getElementById("input-group-nama")?.addEventListener("input", (e) => {
    const emailEl = document.getElementById("input-group-admin-email");
    const val = (e.target.value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (emailEl) emailEl.value = `admin.${val || "baru"}@finkas.id`;
  });

  document.getElementById("chk-group-admin-auto")?.addEventListener("change", (e) => {
    const box = document.getElementById("box-group-admin-creds");
    if (box) box.style.display = e.target.checked ? "flex" : "none";
  });

  document.getElementById("btn-refresh-admin-pwd")?.addEventListener("click", () => {
    const pwdEl = document.getElementById("input-group-admin-pwd");
    if (pwdEl) pwdEl.value = generateRandomPassword(10);
  });

  document.querySelectorAll(".pin-box").forEach((box) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(0, 1);
      const idx = Number(box.getAttribute("data-pin"));
      if (box.value && idx < 3) document.getElementById(`pin${idx + 1}`)?.focus();
      const pin = ["pin0", "pin1", "pin2", "pin3"].map((p) => document.getElementById(p)?.value || "").join("");
      if (pin.length === 4) submitGroupPin();
    });
    box.addEventListener("keydown", (e) => {
      const idx = Number(box.getAttribute("data-pin"));
      if (e.key === "Backspace" && !box.value && idx > 0) document.getElementById(`pin${idx - 1}`)?.focus();
    });
  });
};
