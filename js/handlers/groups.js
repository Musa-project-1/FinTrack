/**
 * @module handlers/groups
 * Multi-grup tahap 2: PIN 4 angka per grup + kunci 1 menit setelah 5x salah.
 * PIN disimpan sebagai hash SHA-256 di dokumen groups/{id} (field pin_hash).
 */

import { FIREBASE_CONFIG } from "../core/config.js";
import { getGroups, setGroups, getActiveGroupId, setActiveGroupId, getAdminPassword } from "../core/state.js";
import { fromFirestoreFields, hashText, escapeHtml } from "../core/utils.js";
import { showToast } from "../core/utils.js";
import { openModal, closeModal } from "../ui/modal.js";

/** Maksimal salah PIN sebelum dikunci. */
export const PIN_MAX_ATTEMPTS = 5;
/** Durasi kunci dalam ms (1 menit). */
export const PIN_LOCK_MS = 60 * 1000;
/** Kunci localStorage untuk info kunci per grup. */
const PIN_LOCK_PREFIX = "finkas_pin_lock_";
/** Grup yang sedang diminta PIN-nya. */
let pendingGroupId = "";

const PROJECT_ID = FIREBASE_CONFIG.projectId;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Ambil daftar grup dari koleksi `groups` (publik: id + nama saja).
 * @returns {Promise<Array>}
 */
export const fetchGroups = async () => {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/groups?pageSize=100`);
    const json = await res.json();
    if (json.error) return [];
    return (json.documents || []).map((d) => {
      const f = fromFirestoreFields(d.fields);
      return { id: d.name.split("/").pop(), nama: f.nama || "Grup", dibuat: f.dibuat || "" };
    });
  } catch (_) {
    return [];
  }
};

/**
 * Ambil hash PIN grup dari Firestore (tidak pernah tampilkan ke user).
 * @param {string} id
 * @returns {Promise<string>}
 */
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

/**
 * Cek apakah grup sedang dikunci (salah 5x).
 * @param {string} id
 * @returns {{locked: boolean, remainingSec: number}}
 */
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

/**
 * Catat 1x salah PIN; kunci 1 menit bila mencapai batas.
 * @param {string} id
 * @returns {{locked: boolean, attemptsLeft: number}}
 */
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

/**
 * Hapus catatan salah PIN (setelah berhasil masuk).
 * @param {string} id
 */
export const clearPinFail = (id) => {
  localStorage.removeItem(PIN_LOCK_PREFIX + id);
};

/**
 * Verifikasi PIN 4 angka: lewat endpoint server dulu (hash tak dibaca klien),
 * fallback baca hash langsung bila endpoint tak ada (hosting statis murni).
 * @param {string} id
 * @param {string} pin 4 digit
 * @returns {Promise<{status: boolean, message: string}>}
 */
export const verifyGroupPin = async (id, pin) => {
  const clean = String(pin || "").replace(/\D/g, "").slice(0, 4);
  if (clean.length !== 4) return { status: false, message: "Ketik 4 angka PIN grup." };
  const lock = checkPinLock(id);
  if (lock.locked) return { status: false, message: `Terkunci. Coba lagi ${lock.remainingSec} detik.` };
  try {
    const sRes = await fetch("/api/verify-group-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: id, pin: clean })
    });
    if (sRes.status !== 404) {
      const json = await sRes.json();
      if (json.status) {
        clearPinFail(id);
        return { status: true, message: json.message || "PIN benar." };
      }
      const r = recordPinFail(id);
      if (r.locked) return { status: false, message: "Salah 5 kali. Terkunci 1 menit." };
      return { status: false, message: `${json.message || "PIN salah."} Sisa ${r.attemptsLeft} kali.` };
    }
  } catch (_) {}
  const storedHash = await fetchGroupPinHash(id);
  if (!storedHash) {
    // Grup lama tanpa PIN: izinkan masuk sekali (migrasi tahap 5 pasang PIN).
    return { status: true, message: "Grup ini belum punya PIN — masuk langsung." };
  }
  const inputHash = await hashText(`finkas-pin:${id}:${clean}`);
  if (inputHash !== storedHash) {
    const r = recordPinFail(id);
    if (r.locked) return { status: false, message: "Salah 5 kali. Terkunci 1 menit." };
    return { status: false, message: `PIN salah. Sisa ${r.attemptsLeft} kali.` };
  }
  clearPinFail(id);
  return { status: true, message: "PIN benar." };
};

/**
 * Buka layar PIN untuk grup yang dipilih.
 * @param {string} id
 */
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
  setTimeout(() => document.getElementById("pin0")?.focus(), 120);
};

/**
 * Ambil PIN dari 4 kotak dan coba masuk grup.
 */
export const submitGroupPin = async () => {
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
/**
 * Muat daftar grup lalu tampilkan layar pilih grup.
 */
export const openGroupPicker = async () => {
  const list = await fetchGroups();
  setGroups(list);
  renderGroupPicker();
  openModal("modal-groups");
};

/**
 * Gambar daftar grup ke dalam modal pilih grup.
 */
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

/**
 * Masuk grup setelah PIN lolos: simpan aktif, ingat di HP, tutup modal.
 * @param {string} id
 */
export const enterGroup = (id) => {
  const found = getGroups().find((g) => g.id === id);
  if (!found) {
    showToast("Grup tidak ditemukan.", "error");
    return;
  }
  setActiveGroupId(id);
  closeModal("modal-groups");
  closeModal("modal-group-pin");
  document.getElementById("app-group-name")?.replaceChildren(document.createTextNode(found.nama));
  try { localStorage.setItem("finkas_active_group_name", found.nama); } catch (_) {}
  try { sessionStorage.setItem("finkas_group_open", "1"); } catch (_) {}
  showToast(`Masuk grup ${found.nama}.`, "success");
  window.dispatchEvent(new CustomEvent("finkas:group-changed", { detail: { id } }));
};

export const pickGroup = enterGroup;

/**
 * Keluar dari grup aktif (kembali ke layar pilih grup).
 */
export const exitGroup = () => {
  setActiveGroupId("");
  try { sessionStorage.removeItem("finkas_group_open"); } catch (_) {}
  openGroupPicker();
};

/* ── Admin pemilik: kelola grup (tahap 4) ────────────────────────── */

/**
 * Panggil endpoint admin grup (buat/hapus/atur PIN).
 * @param {object} body
 * @returns {Promise<{status: boolean, message: string, data: object|null}>}
 */
const callGroupAdmin = async (body) => {
  try {
    const res = await fetch("/api/create-group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, passwordHash: getAdminPassword() })
    });
    if (res.status === 404) {
      return { status: false, message: "Endpoint admin grup tak ada (butuh deploy Vercel).", data: null };
    }
    return await res.json();
  } catch (_) {
    return { status: false, message: "Gagal terhubung ke server.", data: null };
  }
};

/**
 * Buka modal kelola grup (khusus admin pemilik).
 */
export const openGroupAdmin = async () => {
  const list = await fetchGroups();
  setGroups(list);
  renderGroupAdmin();
  openModal("modal-group-admin");
};

/**
 * Gambar daftar grup + form buat di modal admin.
 */
export const renderGroupAdmin = () => {
  const box = document.getElementById("group-admin-list");
  if (!box) return;
  const list = getGroups();
  box.innerHTML = list.length ? list.map((g) => {
    const safeName = escapeHtml(g.nama || "?");
    const safeId = escapeHtml(g.id);
    return `
    <div class="group-admin-row" data-id="${safeId}">
      <span class="avatar">${safeName.charAt(0).toUpperCase()}</span>
      <span class="min-w-0"><h3>${safeName}</h3><small>${safeId}${g.id === "utama" ? " · bawaan (tak bisa dihapus)" : ""}</small></span>
      <span class="group-admin-ops">
        <input class="form-control pin-reset" inputmode="numeric" maxlength="4" placeholder="PIN" aria-label="PIN baru ${safeName}">
        <button class="btn btn-outline btn-compact-action" data-action="reset-group-pin" data-id="${safeId}">PIN</button>
        ${g.id === "utama" ? "" : `<button class="btn btn-danger btn-compact-action" data-action="remove-group" data-id="${safeId}" aria-label="Hapus ${safeName}"><i class="ph-bold ph-trash"></i></button>`}
      </span>
    </div>`;
  }).join("") : '<p class="text-muted" style="text-align:center;padding:12px">Belum ada grup.</p>';
};

/**
 * Buat grup baru dari form admin.
 * @param {Event} e
 */
export const submitCreateGroup = async (e) => {
  e?.preventDefault?.();
  const namaEl = document.getElementById("input-group-nama");
  const pinEl = document.getElementById("input-group-pin");
  const nama = (namaEl?.value || "").trim();
  const pin = (pinEl?.value || "").replace(/\D/g, "").slice(0, 4);
  if (nama.length < 3) {
    showToast("Nama grup minimal 3 huruf.", "error");
    return;
  }
  if (pin.length !== 4) {
    showToast("PIN harus 4 angka.", "error");
    return;
  }
  const res = await callGroupAdmin({ action: "create", nama, pin });
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    if (namaEl) namaEl.value = "";
    if (pinEl) pinEl.value = "";
    const list = await fetchGroups();
    setGroups(list);
    renderGroupAdmin();
  }
};

/**
 * Atur ulang PIN grup dari baris admin.
 * @param {string} id
 */
export const resetGroupPinAction = async (id) => {
  const row = document.querySelector(`.group-admin-row[data-id="${id}"] .pin-reset`);
  const pin = (row?.value || "").replace(/\D/g, "").slice(0, 4);
  if (pin.length !== 4) {
    showToast("Ketik 4 angka PIN baru di kolom grup itu.", "error");
    row?.focus();
    return;
  }
  const res = await callGroupAdmin({ action: "set-pin", groupId: id, pin });
  showToast(res.message, res.status ? "success" : "error");
  if (res.status && row) row.value = "";
};

/**
 * Hapus grup beserta isinya (konfirmasi 2 langkah).
 * @param {string} id
 */
export const removeGroupAction = async (id) => {
  const found = getGroups().find((g) => g.id === id);
  const label = found ? found.nama : id;
  if (!window.confirm(`Hapus grup "${label}" beserta SEMUA anggotanya? Tidak bisa dibatalkan.`)) return;
  if (!window.confirm(`Yakin hapus "${label}"? Ketuk OK untuk hapus permanen.`)) return;
  const res = await callGroupAdmin({ action: "remove", groupId: id });
  showToast(res.message, res.status ? "success" : "error");
  if (res.status) {
    if (getActiveGroupId() === id) setActiveGroupId("");
    const list = await fetchGroups();
    setGroups(list);
    renderGroupAdmin();
  }
};

/**
 * Init UI multi-grup saat boot: buka picker bila belum ada grup tersimpan,
 * refresh data saat grup berganti, dan pasang perilaku PIN 4 kotak
 * (ketik loncat otomatis, penuh langsung cek).
 * @param {() => void} onGroupChanged
 */
export const initGroupsUI = (onGroupChanged) => {
  window.addEventListener("finkas:group-changed", () => { onGroupChanged?.(); });
  // Selalu tampilkan picker saat aplikasi dibuka — tidak ada grup yang
  // otomatis dimasuki (data asli di Grup Utama tidak terbuka sendiri).
  // Pengecualian sekali jalan: baru dari halaman sambutan.
  let skipped = false;
  try {
    skipped = sessionStorage.getItem("finkas_skip_picker") === "1";
    if (skipped) sessionStorage.removeItem("finkas_skip_picker");
  } catch (_) {}
  if (skipped) {
    window.dispatchEvent(new CustomEvent("finkas:group-changed", { detail: { id: getActiveGroupId() } }));
  } else {
    openGroupPicker();
  }
  document.getElementById("form-create-group")?.addEventListener("submit", submitCreateGroup);
  try {
    const savedName = localStorage.getItem("finkas_active_group_name") || "";
    if (savedName) document.getElementById("app-group-name")?.replaceChildren(document.createTextNode(savedName));
  } catch (_) {}
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
