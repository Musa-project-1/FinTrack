import { resetPinInput, syncPinInput, wirePinInput } from "../ui/pin-input";
/**
 * @module handlers/groups
 * Multi-group support: PIN entry, group isolation and the owner's group console.
 *
 * All group management is performed by the server (`/api/create-group`), which
 * authorizes every action against a signed Super Admin session. The client no
 * longer writes to Firestore directly and no longer reads credential hashes.
 */

import { API, ACTIVE_GROUP_NAME_KEY, ONBOARDING_SEEN_KEY, GROUP_OPEN_KEY, DEFAULT_GROUP_ID } from "finkas/core/config";
import {
  clearAdminSession,
  clearCache,
  clearGroupSession,
  getActiveGroupId,
  getAdminSession,
  getGroups,
  getGroupSession,
  getIsAdminSession,
  getIsSuperAdmin,
  resetLedgerState,
  setActiveGroupId,
  setGroups,
  setGroupSession
} from "finkas/core/state";
import {
  addSuperAdminApi,
  fetchGroupsApi,
  fetchSuperAdminsApi,
  removeSuperAdminApi
} from "finkas/core/api";
import { initSyncEvents } from "finkas/core/sync";
import { apiPost } from "finkas/core/api-client";
import { syncGroupAdminList, syncSuperAdminList } from "../mount";
import { getInput, showToast } from "finkas/core/utils";
import { resolveGroupDirection, runGroupSwitchTransition } from "../ui/hybrid-motion";
import { flashCopyFeedback } from "../ui/keel";
import { openModal, closeModal, switchTab } from "../ui/modal";
import { handleUI, renderAdminUI, onAdminLogout } from "./auth";

import { openGroupPicker, initGroupPickerListeners, updateActiveGroupQueueBadge } from "./group-picker";
export { openGroupPicker, renderGroupPicker, initGroupPickerListeners, updateActiveGroupQueueBadge } from "./group-picker";

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!";
const MIN_ADMIN_PASSWORD = 6;

let pendingGroupId = "";
let submittingGroupPin = false;
let latestCreds = { nama: "", pin: "", email: "", pwd: "" };

const scrubCredEditForm = () => {
  if (typeof document === "undefined") return;
  for (const id of ["edit-group-cred-id", "edit-group-cred-email", "edit-group-cred-pwd"]) {
    const field = getInput(id);
    if (field) field.value = "";
  }
  document.getElementById("cred-edit-group-label")?.replaceChildren(document.createTextNode("-"));
};

/** Clear cached plaintext credentials and reset credential modal DOM nodes. */
export const clearLatestCreds = () => {
  latestCreds = { nama: "", pin: "", email: "", pwd: "" };
  if (typeof document === "undefined") return;
  for (const id of ["cred-disp-nama", "cred-disp-pin", "cred-disp-email", "cred-disp-pwd"]) {
    document.getElementById(id)?.replaceChildren(document.createTextNode("-"));
  }
  scrubCredEditForm();
};

const bindCredModalCleanup = () => {
  if (typeof document === "undefined") return;
  const bind = (id: string, fn: () => void) => {
    const dlg = document.getElementById(id);
    if (!dlg || dlg.dataset?.credCloseBound) return;
    if (dlg.dataset) dlg.dataset.credCloseBound = "1";
    dlg.addEventListener("close", fn);
  };
  bind("modal-group-credentials", clearLatestCreds);
  bind("modal-group-cred-edit", scrubCredEditForm);
};

if (typeof onAdminLogout === "function") onAdminLogout(clearLatestCreds);

/**
 * Generate a cryptographically random admin password without modulo bias.
 * @param {number} [len]
 * @returns {string}
 */
export const generateRandomPassword = (len = 10) => {
  const max = 256 - (256 % PASSWORD_ALPHABET.length);
  const result: string[] = [];
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
 * @returns {Promise<Array<{id: string, nama: string, dibuat?: string}>>}
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
 * @returns {Promise<{status: boolean, message?: string}>}
 */
export const verifyGroupPin = async (id: string, pin: string) => {
  const clean = String(pin || "").replace(/\D/g, "").slice(0, 4);
  if (clean.length !== 4) return { status: false, message: "Ketik 4 angka PIN grup." };

  const res = await apiPost<{ sessionToken?: string }>(API.VERIFY_PIN, { groupId: id, pin: clean });
  if (!res) return { status: false, message: "Tidak dapat terhubung ke server." };
  if (res.status && res.data?.sessionToken) setGroupSession(id, res.data.sessionToken);
  return res;
};

const resetGroupPinCelebration = () => {
  getInput("group-pin")?.closest?.<HTMLElement>(".pin-row")?.classList?.remove("is-unlocked", "is-error");
  document.getElementById("group-pin-badge")?.classList?.remove("is-unlocked");
  const lockIcon = document.getElementById("group-pin-lock-icon");
  if (lockIcon) lockIcon.className = "ph-fill ph-lock-key";
};

/** Buka layar PIN untuk grup yang dipilih. Super Admin bypasses PIN. */
export const requestGroupPin = (id: string) => {
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

  if (getGroupSession(id)) {
    if (id === getActiveGroupId()) closeModal("modal-groups");
    else enterGroup(id);
    return;
  }

  pendingGroupId = id;
  const nameEl = document.getElementById("group-pin-name");
  if (nameEl) nameEl.replaceChildren(document.createTextNode(found.nama));
  resetPinInput(getInput("group-pin"));
  resetGroupPinCelebration();
  const msg = document.getElementById("group-pin-msg");
  if (msg) msg.replaceChildren();
  closeModal("modal-groups", true);
  openModal("modal-group-pin");
  setTimeout(() => { getInput("group-pin")?.focus(); }, 120);
};

/** Kirim PIN yang diketik user. */
export const submitGroupPin = async () => {
  if (!pendingGroupId || submittingGroupPin) return;
  submittingGroupPin = true;
  const submitBtn = typeof document.querySelector === "function"
    ? document.querySelector<HTMLButtonElement>('#modal-group-pin [data-action="submit-group-pin"]')
    : null;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const pin = getInput("group-pin")?.value || "";
    const msg = document.getElementById("group-pin-msg");
    const res = await verifyGroupPin(pendingGroupId, pin);

    if (msg) msg.replaceChildren(document.createTextNode(res.message || ""));
    if (!res.status) {
      showToast(res.message ?? "", "error");
      const firstPin = getInput("group-pin");
      const pinRow = firstPin?.closest<HTMLElement>(".pin-row");
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
    const unlockedGroupId = pendingGroupId;
    const pinRow = getInput("group-pin")?.closest<HTMLElement>(".pin-row");
    pinRow?.classList?.remove("is-error");
    pinRow?.classList?.add("is-unlocked");
    document.getElementById("group-pin-badge")?.classList?.add("is-unlocked");
    const lockIcon = document.getElementById("group-pin-lock-icon");
    if (lockIcon) lockIcon.className = "ph-fill ph-lock-key-open";
    if (globalThis.window?.matchMedia?.("(prefers-reduced-motion: no-preference)")?.matches && typeof globalThis.setTimeout === "function") {
      await new Promise<void>((resolve) => { globalThis.setTimeout(resolve, 420); });
    }
    enterGroup(unlockedGroupId);
    resetGroupPinCelebration();
  } finally {
    submittingGroupPin = false;
    if (submitBtn) submitBtn.disabled = false;
  }
};

/* ── Enter / exit ────────────────────────────────────────────────── */

/** Masuk grup setelah PIN lolos. */
export const enterGroup = (id: string) => {
  const currentActive = getActiveGroupId();
  const found = getGroups().find((g) => g.id === id);
  if (!found) return;
  initSyncEvents();

  // An admin session only covers its own group, so switching groups ends it.
  if (currentActive && currentActive !== id && getIsAdminSession() && !getIsSuperAdmin()) {
    const adminToken = getAdminSession();
    if (adminToken && getGroupSession(currentActive) === adminToken) {
      clearGroupSession(currentActive);
    }
    clearAdminSession({ preserveGroupSessions: true });
    handleUI();
    renderAdminUI();
  }

  try {
    localStorage.setItem(GROUP_OPEN_KEY, "1");
    localStorage.setItem(ACTIVE_GROUP_NAME_KEY, found.nama);
  } catch (err) {
    console.warn("[finkas] Cannot persist group state:", (err instanceof Error ? err.message : String(err)));
  }

  closeModal("modal-groups");
  closeModal("modal-group-pin");
  const applySwitch = () => {
    const nameEl = document.getElementById("app-group-name");
    if (nameEl) nameEl.replaceChildren(document.createTextNode(found.nama));
    setActiveGroupId(id);
    if (currentActive === id) {
      window.dispatchEvent(new CustomEvent("finkas:group-changed", { detail: { groupId: id, previousGroupId: currentActive } }));
    }
  };
  if (currentActive !== id) {
    const label = document.getElementById("workspace-startup-label");
    if (label) label.textContent = `Membuka ${found.nama}…`;
  }
  if (currentActive && currentActive !== id) {
    runGroupSwitchTransition(applySwitch, {
      direction: resolveGroupDirection(currentActive, id, getGroups()), focusHeading: true
    });
  } else {
    applySwitch();
  }
};

/** Keluar dari grup aktif dan bersihkan cache/kredensial grup dari browser. */
export const exitGroup = () => {
  const currentGid = getActiveGroupId();
  if (currentGid) {
    clearGroupSession(currentGid);
    clearCache(currentGid);
  } else {
    clearCache(DEFAULT_GROUP_ID);
  }
  if (getIsAdminSession() && !getIsSuperAdmin()) {
    clearAdminSession({ preserveGroupSessions: true });
    handleUI();
    renderAdminUI();
  }
  clearLatestCreds();
  const nameEl = document.getElementById("app-group-name");
  if (nameEl) nameEl.textContent = "Finkas";
  document.body.dataset.workspaceState = "idle";
  delete document.body.dataset.workspaceGroup;
  resetLedgerState();
  openGroupPicker();
};

/* ── Owner console ───────────────────────────────────────────────── */

type AdminCredentials = { pin?: string; adminEmail?: string; adminPassword?: string };

/** Call the group management endpoint with the current admin session. */
const callGroupAdmin = async (body: { action: string; [key: string]: unknown }): Promise<{
  status: boolean;
  message?: string;
  data?: AdminCredentials | null;
}> => {
  const res = await apiPost<AdminCredentials>(API.GROUP_ADMIN, { ...body, sessionToken: getAdminSession() });
  if (!res) return { status: false, message: "Tidak dapat terhubung ke server." };
  return res;
};

/** Tampilkan modal kartu kredensial. */
export const showCredentialsModal = (info: typeof latestCreds) => {
  bindCredModalCleanup();
  latestCreds = { ...info };
  document.getElementById("cred-disp-nama")?.replaceChildren(document.createTextNode(info.nama || "-"));
  document.getElementById("cred-disp-pin")?.replaceChildren(document.createTextNode(info.pin || "-"));
  document.getElementById("cred-disp-email")?.replaceChildren(document.createTextNode(info.email || "-"));
  document.getElementById("cred-disp-pwd")?.replaceChildren(document.createTextNode(info.pwd || "-"));
  openModal("modal-group-credentials");
};

/** Salin format WhatsApp (hanya Super Admin; minta konfirmasi eksplisit sebelum menyalin sandi polos). */
export const copyGroupWhatsAppAction = async (btn?: HTMLElement | null, options?: { includePassword?: boolean }) => {
  if (!getIsSuperAdmin()) {
    showToast("Hanya Super Admin yang dapat menyalin kredensial grup.", "error");
    return;
  }
  const { nama, pin, email, pwd } = latestCreds;
  const origin = window.location.origin;

  const lines = [
    `*AKUN KAS & IURAN FINKAS*`,
    `Grup: ${nama || "Grup Kas"}`
  ];

  if (pin && pin !== "-" && pin !== "1234") {
    lines.push(`\n📌 *Akses Warga (Lihat Rekap & Kas)*\nPIN Masuk: ${pin}`);
  }

  const hasEmail = Boolean(email && email !== "-");
  const hasPwd = Boolean(pwd && pwd !== "-");
  let includePwd = false;
  if (hasPwd) {
    if (options?.includePassword === true) {
      includePwd = true;
    } else if (typeof window !== "undefined" && typeof window.confirm === "function") {
      includePwd = window.confirm(
        "Sertakan kata sandi admin dalam teks polos ke clipboard?\n\nPilih OK untuk menyertakan password, atau Batal untuk menyalin tanpa password."
      );
    }
  }
  if (hasEmail || hasPwd) {
    const adminLines = [`\n🔐 *Akses Pengurus (Catat & Edit Kas)*`];
    if (hasEmail) adminLines.push(`Email Admin: ${email}`);
    if (hasPwd) {
      adminLines.push(includePwd ? `Password Admin: ${pwd}` : "Password Admin: [tidak disalin — kirim terpisah secara aman]");
    }
    lines.push(adminLines.join("\n"));
  }

  lines.push(`\n🌐 Akses Aplikasi:\n${origin}`);
  const text = lines.join("\n");

  try {
    await navigator.clipboard.writeText(text);
    flashCopyFeedback(btn, document.querySelector<HTMLElement>("#modal-group-credentials .cred-card-box"));
    showToast("Format WhatsApp berhasil disalin ke clipboard!", "success");
  } catch (err) {
    showToast("Gagal menyalin, silakan salin teks secara manual.", "warning");
  }
};

/** Buka modal masked form untuk mengatur/mengatur ulang Akun Admin Grup. */
export const manageGroupCredsAction = async (id: string) => {
  if (!getIsSuperAdmin()) {
    showToast("Hanya Super Admin yang dapat mengatur akun admin grup.", "error");
    return;
  }
  const label = getGroups().find((g) => g.id === id)?.nama || id;
  const defaultSlug = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  const defaultEmail = `admin.${defaultSlug || "kas"}@finkas.id`;

  bindCredModalCleanup();
  const idInput = getInput("edit-group-cred-id");
  const emailInput = getInput("edit-group-cred-email");
  const pwdInput = getInput("edit-group-cred-pwd");
  if (idInput) idInput.value = id;
  document.getElementById("cred-edit-group-label")?.replaceChildren(document.createTextNode(label));
  if (emailInput) emailInput.value = defaultEmail;
  if (pwdInput) pwdInput.value = "";
  openModal("modal-group-cred-edit");
  setTimeout(() => { getInput("edit-group-cred-pwd")?.focus?.(); }, 80);
};

/** Simpan perubahan Email & Password Admin Grup dari modal `#modal-group-cred-edit`. */
export const submitEditGroupCreds = async (e?: Event) => {
  e?.preventDefault?.();
  if (!getIsSuperAdmin()) {
    showToast("Hanya Super Admin yang dapat mengatur akun admin grup.", "error");
    return;
  }
  const id = (getInput("edit-group-cred-id")?.value || "").trim();
  const cleanEmail = (getInput("edit-group-cred-email")?.value || "").trim().toLowerCase();
  const pwdEl = getInput("edit-group-cred-pwd");
  const cleanPwd = (pwdEl?.value || "").trim();

  if (!id) { showToast("ID grup tidak ditemukan.", "error"); return; }
  if (!cleanEmail || !cleanEmail.includes("@")) { showToast("Email tidak valid.", "error"); return; }
  if (cleanPwd.length < MIN_ADMIN_PASSWORD) {
    showToast(`Password admin minimal ${MIN_ADMIN_PASSWORD} karakter.`, "error");
    return;
  }

  const label = getGroups().find((g) => g.id === id)?.nama || id;
  const submitBtn = document.getElementById("btn-submit-edit-group-creds") as HTMLButtonElement | null;
  if (submitBtn) submitBtn.disabled = true;
  try {
    const res = await callGroupAdmin({
      action: "set-admin-credential", groupId: id, adminEmail: cleanEmail, adminPassword: cleanPwd
    });
    if (res.status) {
      closeModal("modal-group-cred-edit");
      showToast("Akun Admin Grup berhasil diset!", "success");
      showCredentialsModal({ nama: label, pin: "(PIN grup tetap sama)", email: cleanEmail, pwd: cleanPwd });
    } else {
      showToast(res.message ?? "", "error");
    }
  } finally {
    if (pwdEl) pwdEl.value = "";
    if (submitBtn) submitBtn.disabled = false;
  }
};

/** Buka modal kelola grup. */
export const openGroupAdmin = async () => {
  const searchEl = getInput("search-group-admin");
  if (searchEl) searchEl.value = "";
  switchTab("tab-group-list", "modal-group-admin");
  const chk = getInput("chk-group-admin-auto");
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
  const namaEl = getInput("input-group-nama");
  const emailEl = getInput("input-group-admin-email");
  const pwdEl = getInput("input-group-admin-pwd");

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

  const query = (getInput("search-group-admin")?.value || "").trim().toLowerCase();
  const filtered = query
    ? list.filter((g) => (g.nama || "").toLowerCase().includes(query) || (g.id || "").toLowerCase().includes(query))
    : list;

  const filterMeta = document.getElementById("group-admin-filter-meta");
  if (filterMeta) {
    filterMeta.textContent = query ? `${filtered.length} dari ${list.length} grup` : `${list.length} grup terdaftar`;
  }

  const activeId = getActiveGroupId();
  const rows = filtered.map((g, idx) => {
    const nama = g.nama || "?";
    const initial = (Array.from(String(nama).trim())[0] || '?').toUpperCase();
    return { id: g.id, nama, initial, isActive: g.id === activeId, colorIndex: idx % 4 };
  });
  syncGroupAdminList({ emptyReason: !list.length ? 'none' : !rows.length ? 'search' : '', rows });
};

/** Render daftar email Super Admin. */
export const renderSuperAdminList = async () => {
  const container = document.getElementById("superadmin-emails-list");
  const countEl = document.getElementById("superadmin-count");
  if (!container) return;
  syncSuperAdminList({ status: "loading", items: [] });

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
    syncSuperAdminList({ status: "error", items: [] });
    return;
  }

  if (countEl) countEl.textContent = String(res.data.length);
  syncSuperAdminList({
    status: "ready",
    items: res.data.map(({ email, isPrimary }) => ({ email, isPrimary }))
  });
};

/** Submit form tambah superadmin. */
export const submitAddSuperAdminAction = async (e?: Event) => {
  e?.preventDefault?.();
  const input = getInput("input-add-superadmin");
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
  showToast(res.message ?? "", res.status ? "success" : "error");
  if (res.status) {
    if (input) input.value = "";
    renderSuperAdminList();
  }
};

/** Hapus email superadmin. */
export const removeSuperAdminAction = async (email: string | null) => {
  if (!window.confirm(`Cabut akses Super Admin untuk ${email}?`)) return;
  const res = await removeSuperAdminApi(email ?? "");
  if (res.httpStatus === 403 || res.message?.includes("tidak valid") || res.message?.includes("berakhir")) {
    clearAdminSession();
    handleUI();
    closeModal("modal-group-admin");
    showToast("Sesi Super Admin telah berakhir. Silakan login kembali.", "warning");
    return;
  }
  showToast(res.message ?? "", res.status ? "success" : "error");
  if (res.status) renderSuperAdminList();
};

/** Buat grup baru dari form admin. */
export const submitCreateGroup = async (e?: Event) => {
  e?.preventDefault?.();
  const namaEl = getInput("input-group-nama");
  const pinEl = getInput("input-group-pin");
  const chkEl = getInput("chk-group-admin-auto");
  const emailEl = getInput("input-group-admin-email");
  const pwdEl = getInput("input-group-admin-pwd");

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

  showToast(res.message ?? "", res.status ? "success" : "error");
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
export const renameGroupAction = async (id: string) => {
  const currentName = getGroups().find((g) => g.id === id)?.nama || "";
  const input = window.prompt(`Ubah nama grup "${currentName}":`, currentName);
  if (input === null) return;
  const newName = input.trim().slice(0, 60);
  if (!newName || newName === currentName) return;

  const res = await callGroupAdmin({ action: "rename", groupId: id, nama: newName });
  showToast(res.message ?? "", res.status ? "success" : "error");
  if (res.status) {
    await fetchGroups();
    renderGroupAdmin();
  }
};

/** Atur ulang PIN grup. */
export const resetGroupPinAction = async (id: string) => {
  const label = getGroups().find((g) => g.id === id)?.nama || id;
  const p1 = window.prompt(`Ketik 4 digit PIN baru untuk "${label}":`);
  if (p1 === null) return;
  const pin = p1.replace(/\D/g, "").slice(0, 4);
  if (pin.length !== 4) {
    showToast("PIN wajib berupa 4 angka.", "error");
    return;
  }
  const res = await callGroupAdmin({ action: "set-pin", groupId: id, pin });
  showToast(res.message ?? "", res.status ? "success" : "error");
};

/** Hapus grup. */
export const removeGroupAction = async (id: string) => {
  const label = getGroups().find((g) => g.id === id)?.nama || id;
  if (!window.confirm(`Seluruh data anggota, kas, dan transaksi "${label}" akan terhapus!\n\nLanjutkan?`)) return;
  const typed = window.prompt(`Ketik persis nama grup "${label}" untuk konfirmasi:`);
  if (typed === null || typed.trim().toLowerCase() !== label.trim().toLowerCase()) {
    showToast("Penghapusan dibatalkan.", "warning");
    return;
  }

  const res = await callGroupAdmin({ action: "remove", groupId: id });
  showToast(res.message ?? "", res.status ? "success" : "error");
  if (res.status) {
    if (getActiveGroupId() === id) exitGroup();
    await fetchGroups();
    renderGroupAdmin();
  }
};

/** Init UI multi-grup saat boot. */
export const initGroupsUI = (onGroupChanged?: () => void) => {
  window.addEventListener("finkas:group-changed", () => { onGroupChanged?.(); });

  const activeGid = getActiveGroupId();
  const savedName = localStorage.getItem(ACTIVE_GROUP_NAME_KEY) || "";
  if (savedName) document.getElementById("app-group-name")?.replaceChildren(document.createTextNode(savedName));

  if (activeGid) {
    void updateActiveGroupQueueBadge();
    window.dispatchEvent(new CustomEvent("finkas:group-changed", { detail: { groupId: activeGid, previousGroupId: "" } }));
  } else {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_SEEN_KEY);
    if (!hasSeenOnboarding) {
      window.location.replace("onboarding.html");
      return;
    }
    openGroupPicker();
  }

  initGroupPickerListeners();
  bindCredModalCleanup();
  document.getElementById("form-create-group")?.addEventListener("submit", submitCreateGroup);
  document.getElementById("form-edit-group-creds")?.addEventListener("submit", submitEditGroupCreds);
  document.getElementById("form-add-superadmin")?.addEventListener("submit", submitAddSuperAdminAction);
  document.getElementById("search-group-admin")?.addEventListener("input", renderGroupAdmin);

  document.getElementById("input-group-nama")?.addEventListener("input", (e) => {
    const emailEl = getInput("input-group-admin-email");
    const val = ((e.currentTarget as HTMLInputElement).value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (emailEl) emailEl.value = `admin.${val || "baru"}@finkas.id`;
  });

  document.getElementById("chk-group-admin-auto")?.addEventListener("change", (e) => {
    const box = document.getElementById("box-group-admin-creds");
    if (box) box.hidden = !(e.currentTarget as HTMLInputElement).checked;
  });

  document.getElementById("btn-refresh-admin-pwd")?.addEventListener("click", () => {
    const pwdEl = getInput("input-group-admin-pwd");
    if (pwdEl) pwdEl.value = generateRandomPassword(10);
  });

  wirePinInput(getInput("group-pin"), submitGroupPin);
};
