/**
 * @module handlers/groups
 * Multi-grup: PIN 4 angka per grup, auto-kredensial admin grup,
 * isolasi data per grup, dan panel kelola Super Admin.
 */

import { FIREBASE_CONFIG } from "../core/config.js";
import {
  getGroups,
  setGroups,
  getActiveGroupId,
  setActiveGroupId,
  getAdminPassword,
  getIsSuperAdmin,
  getAdminEmail,
  clearAdminPassword
} from "../core/state.js";
import {
  fetchSuperAdminsApi,
  addSuperAdminApi,
  removeSuperAdminApi
} from "../core/api.js";
import { fromFirestoreFields, hashText, escapeHtml, showToast } from "../core/utils.js";
import { openModal, closeModal } from "../ui/modal.js";
import { handleUI, renderAdminUI } from "./auth.js";

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 60 * 1000;
const PIN_LOCK_PREFIX = "finkas_pin_lock_";
let pendingGroupId = "";
let latestCreds = { nama: "", pin: "", email: "", pwd: "" };

const PROJECT_ID = FIREBASE_CONFIG.projectId;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Generate password acak 8 karakter untuk admin grup. */
export const generateRandomPassword = (len = 8) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!";
  let res = "";
  for (let i = 0; i < len; i += 1) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

/** Ambil daftar grup dari Firestore. */
export const fetchGroups = async () => {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/groups?pageSize=100`);
    const json = await res.json();
    if (json.error) return [];
    return (json.documents || []).map((d) => {
      const f = fromFirestoreFields(d.fields);
      return {
        id: d.name.split("/").pop(),
        nama: f.nama || "Grup",
        dibuat: f.dibuat || "",
        admin_email: f.admin_email || ""
      };
    });
  } catch (_) {
    return [];
  }
};

/** Ambil hash PIN grup dari Firestore. */
export const fetchGroupPinHash = async (id) => {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(id)}`);
    const json = await res.json();
    if (json.error) return "";
    return fromFirestoreFields(json.fields).pin_hash || "";
  } catch (_) {
    return "";
  }
};

/** Cek apakah grup sedang dikunci (salah 5x). */
export const checkPinLock = (id) => {
  try {
    const raw = localStorage.getItem(PIN_LOCK_PREFIX + id);
    if (!raw) return { locked: false, remainingSec: 0 };
    const info = JSON.parse(raw);
    const until = Number(info.lockUntil) || 0;
    const left = Math.ceil((until - Date.now()) / 1000);
    if (left <= 0) {
      localStorage.removeItem(PIN_LOCK_PREFIX + id);
      return { locked: false, remainingSec: 0 };
    }
    return { locked: true, remainingSec: left };
  } catch (_) {
    return { locked: false, remainingSec: 0 };
  }
};

/** Catat 1x salah PIN; kunci 1 menit bila mencapai batas. */
export const recordPinFail = (id) => {
  let fails = 0;
  try {
    fails = Number(JSON.parse(localStorage.getItem(PIN_LOCK_PREFIX + id) || "{}").fails) || 0;
  } catch (_) { fails = 0; }
  fails += 1;
  if (fails >= PIN_MAX_ATTEMPTS) {
    localStorage.setItem(PIN_LOCK_PREFIX + id, JSON.stringify({ fails, lockUntil: Date.now() + PIN_LOCK_MS }));
    return { locked: true, attemptsLeft: 0 };
  }
  localStorage.setItem(PIN_LOCK_PREFIX + id, JSON.stringify({ fails, lockUntil: 0 }));
  return { locked: false, attemptsLeft: PIN_MAX_ATTEMPTS - fails };
};

/** Hapus catatan salah PIN. */
export const clearPinFail = (id) => {
  localStorage.removeItem(PIN_LOCK_PREFIX + id);
};

/** Verifikasi PIN 4 angka. */
export const verifyGroupPin = async (id, pin) => {
  const clean = String(pin || "").replace(/\D/g, "").slice(0, 4);
  if (clean.length !== 4) return { status: false, message: "Ketik 4 angka PIN grup." };
  const lock = checkPinLock(id);
  if (lock.locked) return { status: false, message: `Terkunci. Coba lagi ${lock.remainingSec} detik.` };
  try {
    const sRes = await fetch("/api/verify-group-pin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: id, pin: clean })
    });
    if (sRes.status !== 404) {
      const json = await sRes.json();
      if (json.status) { clearPinFail(id); return { status: true, message: json.message || "PIN benar." }; }
      const r = recordPinFail(id);
      if (r.locked) return { status: false, message: "Salah 5 kali. Terkunci 1 menit." };
      return { status: false, message: `${json.message || "PIN salah."} Sisa ${r.attemptsLeft} kali.` };
    }
  } catch (_) {}

  const storedHash = await fetchGroupPinHash(id);
  if (!storedHash) return { status: true, message: "Grup ini belum punya PIN, langsung masuk." };
  const inputHash = await hashText(`finkas-pin:${id}:${clean}`);
  if (inputHash !== storedHash) {
    const r = recordPinFail(id);
    if (r.locked) return { status: false, message: "Salah 5 kali. Terkunci 1 menit." };
    return { status: false, message: `PIN salah. Sisa ${r.attemptsLeft} kali.` };
  }
  clearPinFail(id);
  return { status: true, message: "PIN benar." };
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
    return;
  }
  enterGroup(pendingGroupId);
};

/** Muat daftar grup lalu tampilkan layar pilih grup. */
export const openGroupPicker = async () => {
  const list = await fetchGroups();
  setGroups(list);
  renderGroupPicker();
  openModal("modal-groups");
};

/** Gambar daftar grup ke dalam modal pilih grup. */
export const renderGroupPicker = () => {
  const box = document.getElementById("group-picker-list");
  if (!box) return;
  const list = getGroups();
  const active = getActiveGroupId();
  if (!list.length) {
    box.innerHTML = '<p class="text-muted" style="text-align:center;padding:12px">Belum ada grup. Minta admin pemilik membuatkan grup.</p>';
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

/** Masuk grup setelah PIN lolos. */
export const enterGroup = (id) => {
  const currentActive = getActiveGroupId();
  const found = getGroups().find((g) => g.id === id);
  if (!found) return;

  if (currentActive && currentActive !== id && !getIsSuperAdmin()) {
    clearAdminPassword();
    handleUI(false);
    renderAdminUI();
  }

  setActiveGroupId(id);
  try {
    sessionStorage.setItem("finkas_group_open", "1");
    localStorage.setItem("finkas_active_group_name", found.nama);
  } catch (_) {}

  closeModal("modal-groups");
  closeModal("modal-group-pin");
  const nameEl = document.getElementById("app-group-name");
  if (nameEl) nameEl.replaceChildren(document.createTextNode(found.nama));
  window.dispatchEvent(new CustomEvent("finkas:group-changed", { detail: { id } }));
};

/** Keluar dari grup aktif. */
export const exitGroup = () => {
  if (!getIsSuperAdmin()) {
    clearAdminPassword();
    handleUI(false);
    renderAdminUI();
  }
  setActiveGroupId("");
  try {
    sessionStorage.removeItem("finkas_group_open");
    localStorage.removeItem("finkas_active_group_name");
  } catch (_) {}
  openGroupPicker();
};

/* ── Admin pemilik: kelola grup ────────────────────────── */

const callGroupAdmin = async (body) => {
  const action = body?.action;
  const superAdminEmail = getAdminEmail();
  try {
    const res = await fetch("/api/create-group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, superAdminEmail, passwordHash: getAdminPassword(), isSuperAdmin: getIsSuperAdmin() })
    });
    if (res.status !== 404) {
      const json = await res.json();
      if (json && typeof json.status === "boolean") return json;
    }
  } catch (_) {}

  // Fallback direct Firestore
  try {
    if (action === "create") {
      const nama = String(body?.nama || "").trim().slice(0, 60);
      const pin = String(body?.pin || "").replace(/\D/g, "").slice(0, 4);
      const skipAdmin = !!body?.skipAdmin;
      const adminEmail = String(body?.adminEmail || "").trim().toLowerCase();
      const adminPassword = String(body?.adminPassword || "").trim();

      if (nama.length < 3) return { status: false, message: "Nama grup minimal 3 huruf.", data: null };
      if (pin.length !== 4) return { status: false, message: "PIN harus 4 angka.", data: null };

      const id = "GRP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const pinHash = await hashText(`finkas-pin:${id}:${pin}`);
      const fields = {
        nama: { stringValue: nama },
        dibuat: { stringValue: new Date().toISOString() },
        pin_hash: { stringValue: pinHash }
      };
      if (!skipAdmin && adminPassword) {
        fields.admin_email = { stringValue: adminEmail };
        fields.admin_password_hash = { stringValue: await hashText(`finkas-admin:${id}:${adminPassword}`) };
      }
      const gRes = await fetch(`${FIRESTORE_BASE}/groups/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
      if (!gRes.ok) return { status: false, message: "Gagal menyimpan grup ke Firestore.", data: null };
      await fetch(`${FIRESTORE_BASE}/groups/${id}/settings/app_config`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: { skippedMonths: { arrayValue: { values: [] } } } }) });
      return { status: true, message: `Grup "${nama}" berhasil dibuat.`, data: { id, nama, pin, adminEmail, adminPassword } };
    }
    if (action === "set-admin-credential") {
      const groupId = String(body?.groupId || "").trim();
      const adminEmail = String(body?.adminEmail || "").trim().toLowerCase();
      const adminPassword = String(body?.adminPassword || "").trim();
      const adminHash = await hashText(`finkas-admin:${groupId}:${adminPassword}`);
      const patchFields = { admin_email: { stringValue: adminEmail }, admin_password_hash: { stringValue: adminHash } };
      const res = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(groupId)}?updateMask.fieldPaths=admin_email&updateMask.fieldPaths=admin_password_hash`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: patchFields })
      });
      return { status: res.ok, message: res.ok ? "Kredensial Admin Grup diperbarui." : "Gagal update kredensial.", data: { groupId, adminEmail, adminPassword } };
    }
    if (action === "rename") {
      const groupId = String(body?.groupId || "").trim();
      const nama = String(body?.nama || "").trim().slice(0, 60);
      const res = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(groupId)}?updateMask.fieldPaths=nama`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: { nama: { stringValue: nama } } }) });
      return { status: res.ok, message: res.ok ? `Nama diubah menjadi "${nama}".` : "Gagal ubah nama.", data: null };
    }
    if (action === "set-pin") {
      const groupId = String(body?.groupId || "").trim();
      const pin = String(body?.pin || "").replace(/\D/g, "").slice(0, 4);
      const pinHash = await hashText(`finkas-pin:${groupId}:${pin}`);
      const res = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(groupId)}?updateMask.fieldPaths=pin_hash`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: { pin_hash: { stringValue: pinHash } } }) });
      return { status: res.ok, message: res.ok ? "PIN grup berhasil diperbarui." : "Gagal update PIN.", data: null };
    }
    if (action === "remove") {
      const groupId = String(body?.groupId || "").trim();
      const res = await fetch(`${FIRESTORE_BASE}/groups/${encodeURIComponent(groupId)}`, { method: "DELETE" });
      return { status: res.ok, message: res.ok ? "Grup berhasil dihapus." : "Gagal menghapus grup.", data: null };
    }
  } catch (err) {
    return { status: false, message: err?.message || "Gagal memproses data grup.", data: null };
  }
  return { status: false, message: "Aksi grup tidak dikenal.", data: null };
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
  } catch (_) {
    showToast("Gagal menyalin, silakan salin teks secara manual.", "warning");
  }
};

/** Atur atau Reset Akun Admin Grup untuk grup tertentu. */
export const manageGroupCredsAction = async (id) => {
  const found = getGroups().find((g) => g.id === id);
  const label = found ? found.nama : id;
  const defaultSlug = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  const defaultEmail = `admin.${defaultSlug || "kas"}@finkas.id`;

  const emailInput = window.prompt(`Masukkan Email Admin untuk "${label}":`, defaultEmail);
  if (emailInput === null) return;
  const cleanEmail = emailInput.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) { showToast("Email tidak valid.", "error"); return; }

  const generatedPwd = generateRandomPassword(8);
  const pwdInput = window.prompt(`Masukkan Password Admin baru untuk "${label}":`, generatedPwd);
  if (pwdInput === null) return;
  const cleanPwd = pwdInput.trim();
  if (cleanPwd.length < 6) { showToast("Password admin minimal 6 karakter.", "error"); return; }

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
  const list = await fetchGroups();
  setGroups(list);
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
  if (pwdEl) pwdEl.value = generateRandomPassword(8);
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
            ${isActive ? `<span class="group-badge-active"><i class="ph-fill ph-check-circle"></i> Aktif</span>` : ""}
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
  container.innerHTML = '<span style="font-size:11px;color:var(--text-muted)">Memuat daftar superadmin...</span>';

  const res = await fetchSuperAdminsApi(getAdminEmail());
  if (!res.status || !Array.isArray(res.data)) {
    container.innerHTML = '<span style="font-size:11px;color:var(--text-muted)">musabakhtiar0@gmail.com (Pemilik Utama)</span>';
    return;
  }

  container.innerHTML = res.data.map((item) => {
    const isPrimary = item.isPrimary;
    const email = escapeHtml(item.email);
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.7);border-radius:6px;font-size:11px">
      <span><strong>${email}</strong> ${isPrimary ? '<span style="color:#10b981;font-weight:600">(Pemilik Utama)</span>' : ''}</span>
      ${!isPrimary ? `<button type="button" data-action="remove-superadmin-email" data-email="${email}" style="border:none;background:transparent;color:#ef4444;cursor:pointer;padding:2px 6px"><i class="ph-bold ph-trash"></i></button>` : ''}
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

  const res = await addSuperAdminApi(getAdminEmail(), email);
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    if (input) input.value = "";
    renderSuperAdminList();
  }
};

/** Hapus email superadmin. */
export const removeSuperAdminAction = async (email) => {
  if (!window.confirm(`Cabut akses Super Admin untuk ${email}?`)) return;
  const res = await removeSuperAdminApi(getAdminEmail(), email);
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    renderSuperAdminList();
  }
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
  const pin = rawPin.replace(/\D/g, "").slice(0, 4);
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
  if (!skipAdmin && (!adminEmail || adminPassword.length < 6)) {
    showToast("Password admin minimal 6 karakter.", "error");
    return;
  }

  const res = await callGroupAdmin({
    action: "create",
    nama,
    pin,
    skipAdmin,
    adminEmail,
    adminPassword
  });

  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    if (namaEl) namaEl.value = "";
    if (pinEl) pinEl.value = "";
    refreshAutoAdminCreds();

    const list = await fetchGroups();
    setGroups(list);
    renderGroupAdmin();

    if (!skipAdmin) {
      showCredentialsModal({
        nama,
        pin,
        email: adminEmail,
        pwd: adminPassword
      });
    }
  }
};

/** Ubah nama grup. */
export const renameGroupAction = async (id) => {
  const found = getGroups().find((g) => g.id === id);
  const currentName = found ? found.nama : "";
  const input = window.prompt(`Ubah nama grup "${currentName}":`, currentName);
  if (input === null) return;
  const newName = input.trim().slice(0, 60);
  if (!newName || newName === currentName) return;
  const res = await callGroupAdmin({ action: "rename", groupId: id, nama: newName });
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    const list = await fetchGroups();
    setGroups(list);
    renderGroupAdmin();
  }
};

/** Atur ulang PIN grup. */
export const resetGroupPinAction = async (id) => {
  const found = getGroups().find((g) => g.id === id);
  const label = found ? found.nama : id;
  const p1 = window.prompt(`Ketik 4 digit PIN baru untuk "${label}":`);
  if (p1 === null) return;
  const pin1 = p1.replace(/\D/g, "").slice(0, 4);
  if (pin1.length !== 4) {
    showToast("PIN wajib berupa 4 angka.", "error");
    return;
  }
  const res = await callGroupAdmin({ action: "set-pin", groupId: id, pin: pin1 });
  showToast(res.message, res.status ? "success" : "error");
};

/** Hapus grup. */
export const removeGroupAction = async (id) => {
  const found = getGroups().find((g) => g.id === id);
  const label = found ? found.nama : id;
  if (!window.confirm(`Seluruh data anggota, kas, dan transaksi "${label}" akan terhapus!\n\nLanjutkan?`)) return;
  const typed = window.prompt(`Ketik persis nama grup "${label}" untuk konfirmasi:`);
  if (typed === null || typed.trim().toLowerCase() !== label.trim().toLowerCase()) {
    showToast("Penghapusan dibatalkan.", "warning");
    return;
  }
  const res = await callGroupAdmin({ action: "remove", groupId: id });
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    if (getActiveGroupId() === id) {
      exitGroup();
    }
    const list = await fetchGroups();
    setGroups(list);
    renderGroupAdmin();
  }
};

/** Init UI multi-grup saat boot. */
export const initGroupsUI = (onGroupChanged) => {
  window.addEventListener("finkas:group-changed", () => { onGroupChanged?.(); });
  const activeGid = getActiveGroupId();
  const savedName = localStorage.getItem("finkas_active_group_name") || "";
  if (savedName) document.getElementById("app-group-name")?.replaceChildren(document.createTextNode(savedName));
  if (activeGid) {
    window.dispatchEvent(new CustomEvent("finkas:group-changed", { detail: { id: activeGid } }));
  } else {
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
    if (pwdEl) pwdEl.value = generateRandomPassword(8);
  });

  document.querySelectorAll(".pin-box").forEach((box) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/\D/g, "").slice(0, 1);
      const idx = Number(box.getAttribute("data-pin"));
      if (box.value && idx < 3) document.getElementById("pin" + (idx + 1))?.focus();
      const pin = ["pin0", "pin1", "pin2", "pin3"].map((p) => document.getElementById(p)?.value || "").join("");
      if (pin.length === 4) submitGroupPin();
    });
    box.addEventListener("keydown", (e) => {
      const idx = Number(box.getAttribute("data-pin"));
      if (e.key === "Backspace" && !box.value && idx > 0) document.getElementById("pin" + (idx - 1))?.focus();
    });
  });
};
