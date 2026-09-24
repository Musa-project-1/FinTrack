/**
 * @module handlers/transactions
 * Recording, editing and deleting cash transactions.
 *
 * Every write goes through `postToBackend`, which carries the admin session
 * token. When the device is offline (or the request never leaves the browser)
 * the payload is queued in IndexedDB and replayed later.
 */

import { NAMA_BULAN, DEFAULT_MONTHLY_FEE } from "../core/config.js";
import { getState, addTransaction, currentRekapYear } from "../core/state.js";
import { postToBackend } from "../core/api.js";
import { formatRp, showToast, showDatabaseToast, isOnline, getRawNominal, getInitials, dateInputToIso, isoToDateInput } from "../core/utils.js";
import { queueOfflinePayload, isUnsyncedTempId } from "../core/offline.js";
import { openModal, closeModal, switchTab, renderCheckboxIuran, filterKategori, showConfirmDialog, updateEditDelta } from "../ui/modal.js";
import { syncCdrop } from "../ui/cdrop.js";
import {
  renderDashboard,
  renderTableTransaksi,
  renderTableRekap,
  renderChart,
  populateTahunRekap
} from "../render.js";

const DEFAULT_FEE_DISPLAY = new Intl.NumberFormat("id-ID").format(DEFAULT_MONTHLY_FEE);

const refreshAppData = async () => { if (window.__initApp) await window.__initApp(); };

/** Optimistic rows get a clearly temporary id until the server confirms. */
const tempTransactionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `TRX-TEMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `TRX-TEMP-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

/**
 * Deliver a mutation, queueing it when the device is offline or unreachable.
 *
 * @param {object} payload
 * @returns {Promise<{delivered: boolean, result: object|null}>}
 */
const deliverMutation = async (payload) => {
  if (!isOnline()) {
    await queueOfflinePayload(payload);
    return { delivered: false, result: null };
  }

  const result = await postToBackend(payload);
  if (!result) {
    await queueOfflinePayload(payload);
    return { delivered: false, result: null };
  }

  return { delivered: true, result };
};

/**
 * Run a task with a button in its busy state, restoring it afterwards.
 *
 * @param {string} buttonId
 * @param {string} busyHtml
 * @param {string} idleHtml
 * @param {Function} task
 */
const withBusyButton = async (buttonId, busyHtml, idleHtml, task) => {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.innerHTML = busyHtml;
    btn.disabled = true;
  }
  try {
    await task();
  } finally {
    if (btn) {
      btn.innerHTML = idleHtml;
      btn.disabled = false;
    }
  }
};

/**
 * Run a save with the liquid-fill ("keel") button animation.
 *
 * The teal liquid crawls to ~90% while the request is in flight (honest
 * indeterminate wait — we cannot know the real byte progress of a JSON POST),
 * then on success it tops off to 100% and draws the checkmark before the
 * caller's side effects run; on failure it recedes. Progress is written to the
 * registered custom property `--p`, so CSS transitions do the animating — no
 * requestAnimationFrame loop. Honours `prefers-reduced-motion`.
 *
 * @param {string} buttonId
 * @param {() => Promise<{outcome?: 'success'|'error'|'neutral', done?: Function}>} task
 *   Resolves the network call and returns the visual outcome plus a `done`
 *   callback holding the modal-close / optimistic-update side effects.
 */
const withLiquidSave = async (buttonId, task) => {
  const btn = document.getElementById(buttonId);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const setP = (v, dur) => {
    if (!btn) return;
    btn.style.setProperty("--keel-dur", (reduce ? 0 : dur) + "ms");
    btn.style.setProperty("--p", String(v));
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const reset = () => {
    if (!btn) return;
    btn.classList.remove("is-saving", "is-done", "is-error");
    btn.disabled = false;
    setP(0, 0);
  };

  if (btn) {
    btn.classList.remove("is-done", "is-error");
    btn.classList.add("is-saving");
    btn.disabled = true;
    setP(0.9, 1100);
  }

  let res;
  try {
    res = await task();
  } catch (err) {
    console.error("[liquid-save]", err);
    res = { outcome: "error", done: () => showToast("Terjadi kesalahan saat menyimpan.", "error") };
  }
  const outcome = res?.outcome || "success";

  if (outcome === "success") {
    setP(1, 340);
    if (btn) { btn.classList.remove("is-saving"); btn.classList.add("is-done"); }
    await wait(560);
    await res?.done?.();
    reset();
    return;
  }

  // error / neutral — recede without the check
  setP(0, 420);
  if (btn) {
    btn.classList.remove("is-saving");
    if (outcome === "error") btn.classList.add("is-error");
  }
  await wait(outcome === "error" ? 700 : 180);
  await res?.done?.();
  reset();
};

/* ══════════════════════════════════════════════════════════════════
   QUICK PAY (single member, single month)
   ══════════════════════════════════════════════════════════════════ */

/**
 * Open the quick-pay sheet for one member/month.
 * @param {string} idAnggota
 * @param {string} bulan
 */
export const openQuickPaySheet = (idAnggota, bulan) => {
  if (!idAnggota || !bulan) return;

  const anggotaList = getState().anggota || [];
  const ang = anggotaList.find((a) => a.ID_Anggota === idAnggota);
  if (!ang) {
    showToast("Anggota tidak ditemukan.", "error");
    return;
  }

  document.getElementById("qp-id-anggota").value = idAnggota;
  document.getElementById("qp-bulan").value = bulan;
  document.getElementById("qp-tahun").value = currentRekapYear;
  document.getElementById("qp-nama").innerText = ang.Nama_Anggota;
  document.getElementById("qp-periode").innerText = `Iuran ${bulan} ${currentRekapYear}`;

  const avatar = document.getElementById("qp-avatar");
  avatar.innerText = getInitials(ang.Nama_Anggota);

  document.getElementById("qp-nominal").value = DEFAULT_FEE_DISPLAY;
  openModal("modal-quickpay");
};

/** Submit the quick-pay form. */
export const submitQuickPay = async (e) => {
  e.preventDefault();
  const idAnggota = document.getElementById("qp-id-anggota").value;
  const bulan = document.getElementById("qp-bulan").value;
  const tahun = document.getElementById("qp-tahun").value;
  const nominal = getRawNominal("qp-nominal");

  if (!idAnggota || !bulan || !tahun) return showToast("Data iuran tidak lengkap.", "error");
  if (isNaN(nominal) || nominal <= 0) return showToast("Nominal harus lebih dari 0.", "error");

  const state = getState();
  const kategoriMasuk = state.kategori.find((k) => k.Tipe === "Masuk");
  if (!kategoriMasuk) return showToast("Buat kategori Masuk terlebih dahulu.", "error");

  const angName = state.anggota.find((a) => a.ID_Anggota === idAnggota)?.Nama_Anggota || "Anggota";

  showConfirmDialog({
    title: "Catat Iuran Kas?",
    message: `Simpan iuran ${bulan} ${tahun} untuk ${angName} sebesar ${formatRp(nominal)} ke database?`,
    icon: "ph-fill ph-hand-coins",
    confirmText: "Ya, Simpan Iuran",
    onConfirm: () => withBusyButton(
      "btn-submit-quickpay",
      '<i class="ph ph-spinner-gap ph-spin"></i> Menyimpan...',
      '<i class="ph-bold ph-check-circle"></i> SIMPAN PEMBAYARAN',
      async () => {
        const payload = {
          action: "tambahTransaksi",
          dataForm: {
            tipeArus: "Masuk",
            idKategori: kategoriMasuk.ID_Kategori,
            idAnggota,
            bulanIuran: bulan,
            tahunIuran: tahun,
            nominal,
            keterangan: "Iuran Anggota"
          }
        };

        const { delivered, result } = await deliverMutation(payload);

        if (!delivered) {
          showDatabaseToast("Iuran Kas Disimpan (Offline)", `Iuran ${bulan} ${tahun} untuk ${angName} disimpan lokal.`);
        } else if (!result.status) {
          showToast(result.message, "error");
          return;
        } else {
          showDatabaseToast("Iuran Kas Disimpan", `Iuran ${bulan} ${tahun} untuk ${angName} (${formatRp(nominal)}) berhasil dicatat.`);
        }

        closeModal("modal-quickpay");
        addTransaction({
          ID_Transaksi: tempTransactionId(),
          Timestamp: new Date().toISOString(),
          Tipe_Arus: "Masuk",
          ID_Kategori: kategoriMasuk.ID_Kategori,
          ID_Anggota: idAnggota,
          Bulan_Iuran: bulan,
          Tahun_Iuran: tahun,
          Nominal: nominal,
          Keterangan: "Iuran Anggota"
        });
        renderDashboard();
        renderTableTransaksi();
        renderTableRekap();
        renderChart();
      }
    )
  });
};

/* ══════════════════════════════════════════════════════════════════
   MAIN TRANSACTION MODAL (bulk iuran + operasional)
   ══════════════════════════════════════════════════════════════════ */

/** Open the main transaction modal on the iuran tab, reset to defaults. */
export const bukaModalTransaksi = () => {
  switchTab("iuran", "modal-transaksi");
  document.getElementById("search-anggota-iuran").value = "";
  document.getElementById("iuran-tahun").value = new Date().getFullYear();
  document.getElementById("iuran-bulan").value = NAMA_BULAN[new Date().getMonth()];
  syncCdrop("iuran-bulan");
  syncCdrop("iuran-kategori");
  renderCheckboxIuran();

  document.getElementById("tab-operasional").querySelector("form").reset();
  document.getElementById("ops-anggota").value = "-";
  document.getElementById("ops-tipe").value = "Keluar";
  filterKategori("ops-tipe", "ops-kategori");
  syncCdrop("ops-anggota");
  syncCdrop("ops-tipe");
  syncCdrop("ops-kategori");

  document.getElementById("iuran-nominal").value = DEFAULT_FEE_DISPLAY;
  // Date fields default to empty → backend stamps "today".
  const iuranTgl = document.getElementById("iuran-tanggal");
  if (iuranTgl) iuranTgl.value = "";
  const opsTgl = document.getElementById("ops-tanggal");
  if (opsTgl) opsTgl.value = "";
  openModal("modal-transaksi");
};

/* ── Bulk iuran ──────────────────────────────────────────────────── */

/** Submit contributions for every checked member. */
export const submitIuran = async (e) => {
  e?.preventDefault?.();
  const checkboxes = document.querySelectorAll(".chk-iuran:not(:disabled):checked");
  if (checkboxes.length === 0) return showToast("Pilih minimal 1 anggota!", "error");

  const formNominal = getRawNominal("iuran-nominal");
  const formKategori = document.getElementById("iuran-kategori").value;
  const formBulan = document.getElementById("iuran-bulan").value;
  const formTahun = document.getElementById("iuran-tahun").value;
  const formTanggalIso = dateInputToIso(document.getElementById("iuran-tanggal")?.value);

  if (isNaN(formNominal) || formNominal <= 0) return showToast("Nominal iuran harus lebih dari 0.", "error");
  if (!formKategori || formKategori === "-") return showToast("Pilih kategori iuran terlebih dahulu.", "error");
  if (!formBulan || !formTahun) return showToast("Bulan dan tahun iuran wajib dipilih.", "error");

  const arrIdAnggota = Array.from(checkboxes).map((chk) => chk.value);
  const totalNominal = formNominal * arrIdAnggota.length;

  showConfirmDialog({
    title: "Simpan Iuran Kas?",
    message: `Catat iuran ${formBulan} ${formTahun} untuk ${arrIdAnggota.length} anggota terpilih (Total: ${formatRp(totalNominal)}) ke database?`,
    icon: "ph-fill ph-hand-coins",
    confirmText: "Ya, Simpan Iuran",
    onConfirm: () => withLiquidSave(
      "btn-submit-iuran",
      async () => {
        const payload = {
          action: "tambahTransaksiMassal",
          dataForm: {
            tipeArus: "Masuk",
            idKategori: formKategori,
            arrIdAnggota,
            bulanIuran: formBulan,
            tahunIuran: formTahun,
            nominal: formNominal,
            keterangan: "Iuran Anggota",
            timestamp: formTanggalIso || undefined
          }
        };

        const { delivered, result } = await deliverMutation(payload);

        if (!delivered) {
          return { outcome: "success", done: () => {
            showDatabaseToast("Iuran Kas Disimpan (Offline)", `Iuran untuk ${arrIdAnggota.length} anggota disimpan lokal.`);
            closeModal("modal-transaksi");
            applyIuranOptimistically(arrIdAnggota, formKategori, formBulan, formTahun, formNominal, formTanggalIso);
          }};
        }

        if (!result.status) {
          return { outcome: "error", done: () => showToast(result.message, "error") };
        }

        const inserted = Number(result.data?.inserted ?? arrIdAnggota.length);
        const skipped = Array.isArray(result.data?.skipped) ? result.data.skipped : [];

        if (inserted === 0) {
          return { outcome: "neutral", done: async () => {
            showToast(result.message || "Semua anggota yang dipilih sudah lunas.", "warning");
            closeModal("modal-transaksi");
            await refreshAppData();
          }};
        }

        return { outcome: "success", done: () => {
          showDatabaseToast("Iuran Kas Disimpan", `${inserted} data iuran (${formBulan} ${formTahun}) berhasil dicatat.`);
          closeModal("modal-transaksi");
          applyIuranOptimistically(
            arrIdAnggota.filter((id) => !skipped.includes(id)),
            formKategori, formBulan, formTahun, formNominal, formTanggalIso
          );
        }};
      }
    )
  });
};

/** Add optimistic rows for freshly recorded contributions. */
const applyIuranOptimistically = (ids, idKategori, bulan, tahun, nominal, timestampIso) => {
  const timestamp = timestampIso || new Date().toISOString();
  ids.forEach((idAnggota) => {
    addTransaction({
      ID_Transaksi: tempTransactionId(),
      Timestamp: timestamp,
      Tipe_Arus: "Masuk",
      ID_Kategori: idKategori,
      ID_Anggota: idAnggota,
      Bulan_Iuran: bulan,
      Tahun_Iuran: tahun,
      Nominal: nominal,
      Keterangan: "Iuran Anggota"
    });
  });

  populateTahunRekap();
  renderDashboard();
  renderTableTransaksi();
  renderTableRekap();
  renderChart();
  renderCheckboxIuran();
  document.getElementById("iuran-nominal").value = DEFAULT_FEE_DISPLAY;
};

/* ── Operasional ─────────────────────────────────────────────────── */

/** Submit a single operational (non-iuran) transaction. */
export const submitOperasional = async (e) => {
  e?.preventDefault?.();
  const formTipe = document.getElementById("ops-tipe")?.value;
  const formKategori = document.getElementById("ops-kategori")?.value;
  const formNominal = getRawNominal("ops-nominal");
  const formAnggota = document.getElementById("ops-anggota")?.value || "-";
  const formKeterangan = (document.getElementById("ops-keterangan")?.value || "").trim();
  const formTanggalIso = dateInputToIso(document.getElementById("ops-tanggal")?.value);

  if (!formTipe || !["Masuk", "Keluar"].includes(formTipe)) {
    return showToast("Pilih tipe transaksi yang valid (Masuk/Keluar).", "error");
  }
  if (!formKategori || formKategori === "-" || formKategori === "") {
    return showToast("Pilih kategori transaksi.", "error");
  }
  if (isNaN(formNominal) || formNominal <= 0) {
    return showToast("Nominal operasional harus lebih dari 0.", "error");
  }

  showConfirmDialog({
    title: `Catat ${formTipe === "Masuk" ? "Pemasukan" : "Pengeluaran"}?`,
    message: `Simpan transaksi ${formTipe} sebesar ${formatRp(formNominal)} ke database kas?`,
    icon: formTipe === "Masuk" ? "ph-fill ph-trend-up" : "ph-fill ph-trend-down",
    badgeClass: formTipe === "Masuk" ? "" : "warning",
    confirmText: "Ya, Simpan Transaksi",
    onConfirm: () => withLiquidSave(
      "btn-submit-ops",
      async () => {
        const payload = {
          action: "tambahTransaksi",
          dataForm: {
            tipeArus: formTipe,
            idKategori: formKategori,
            idAnggota: formAnggota,
            bulanIuran: "-",
            tahunIuran: "-",
            nominal: formNominal,
            keterangan: formKeterangan,
            timestamp: formTanggalIso || undefined
          }
        };

        const { delivered, result } = await deliverMutation(payload);

        if (delivered && !result.status) {
          return { outcome: "error", done: () => showToast(result.message, "error") };
        }

        return { outcome: "success", done: () => {
          if (!delivered) {
            showDatabaseToast("Operasional Disimpan (Offline)", `${formTipe} ${formatRp(formNominal)} disimpan lokal.`);
          } else {
            showDatabaseToast("Transaksi Kas Dicatat", `${formTipe}: ${formatRp(formNominal)} berhasil disimpan.`);
          }

          closeModal("modal-transaksi");
          addTransaction({
            ID_Transaksi: tempTransactionId(),
            Timestamp: formTanggalIso || new Date().toISOString(),
            Tipe_Arus: formTipe,
            ID_Kategori: formKategori,
            ID_Anggota: formAnggota,
            Bulan_Iuran: "-",
            Tahun_Iuran: "-",
            Nominal: formNominal,
            Keterangan: formKeterangan
          });
          populateTahunRekap();
          renderDashboard();
          renderTableTransaksi();
          renderTableRekap();
          renderChart();

          document.getElementById("tab-operasional").querySelector("form").reset();
          document.getElementById("ops-anggota").value = "-";
          document.getElementById("ops-tipe").value = "Keluar";
          filterKategori("ops-tipe", "ops-kategori");
          syncCdrop("ops-anggota");
          syncCdrop("ops-tipe");
          syncCdrop("ops-kategori");
        }};
      }
    )
  });
};

/* ══════════════════════════════════════════════════════════════════
   EDIT / DELETE
   ══════════════════════════════════════════════════════════════════ */

/**
 * Open the edit modal prefilled from a transaction.
 * @param {string} idTrx
 */
export const bukaModalEdit = (idTrx) => {
  const trx = getState().transaksi.find((t) => t.ID_Transaksi === idTrx);
  if (!trx) return;

  document.getElementById("edit-id").value = trx.ID_Transaksi;
  document.getElementById("edit-tipe").value = trx.Tipe_Arus;
  filterKategori("edit-tipe", "edit-kategori");
  syncCdrop("edit-tipe");
  syncCdrop("edit-kategori");
  setTimeout(() => {
    document.getElementById("edit-kategori").value = trx.ID_Kategori;
    syncCdrop("edit-kategori");
  }, 50);

  document.getElementById("edit-nominal").value = new Intl.NumberFormat("id-ID").format(trx.Nominal || 0);
  document.getElementById("edit-anggota").value = trx.ID_Anggota || "-";
  document.getElementById("edit-bulan").value = trx.Bulan_Iuran || "-";
  syncCdrop("edit-anggota");
  syncCdrop("edit-bulan");
  document.getElementById("edit-tahun").value = trx.Tahun_Iuran || "";
  document.getElementById("edit-keterangan").value = trx.Keterangan || "";

  const editTanggal = document.getElementById("edit-tanggal");
  if (editTanggal) editTanggal.value = isoToDateInput(trx.Timestamp);

  // Populate delta preview with original values and bind live update
  const _originalNominal = trx.Nominal || 0;
  const _originalTipe = trx.Tipe_Arus;
  updateEditDelta(_originalTipe, _originalNominal, _originalTipe, _originalNominal);

  const _rebind = () => {
    const newTipe = document.getElementById("edit-tipe")?.value || _originalTipe;
    const newNominal = getRawNominal("edit-nominal");
    updateEditDelta(_originalTipe, _originalNominal, newTipe, newNominal);
  };
  // Remove previous listeners if any then attach
  const nomEl = document.getElementById("edit-nominal");
  const tipeEl = document.getElementById("edit-tipe");
  if (nomEl) { nomEl.removeEventListener("input", nomEl._deltaHandler); nomEl._deltaHandler = _rebind; nomEl.addEventListener("input", _rebind); }
  if (tipeEl) { tipeEl.removeEventListener("change", tipeEl._deltaHandler); tipeEl._deltaHandler = _rebind; tipeEl.addEventListener("change", _rebind); }

  document.getElementById("modal-riwayat").classList.remove("active");
  openModal("modal-edit-transaksi");
};

/** Submit the edit form. */
export const submitEditTransaksi = async (e) => {
  e?.preventDefault?.();
  const idTransaksi = (document.getElementById("edit-id")?.value || "").trim();
  const tipeArus = document.getElementById("edit-tipe")?.value;
  const idKategori = document.getElementById("edit-kategori")?.value;
  const nominal = getRawNominal("edit-nominal");

  if (!idTransaksi) return showToast("ID transaksi tidak ditemukan.", "error");
  if (!["Masuk", "Keluar"].includes(tipeArus)) return showToast("Pilih tipe transaksi yang valid.", "error");
  if (!idKategori || idKategori === "-") return showToast("Pilih kategori transaksi.", "error");
  if (isNaN(nominal) || nominal <= 0) return showToast("Nominal transaksi harus lebih dari 0.", "error");

  // A temp id belongs to an optimistic row whose create has not been confirmed
  // by the server yet (its create may still be queued). The server has no such
  // document, so editing it would fail to sync or create a duplicate. Block it
  // until the create has synced and the row carries a real id.
  if (isUnsyncedTempId(idTransaksi)) {
    return showToast("Transaksi ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum mengeditnya.", "warning");
  }

  showConfirmDialog({
    title: "Perbarui Data Transaksi?",
    message: `Simpan pembaruan transaksi ${idTransaksi} (${formatRp(nominal)}) ke database?`,
    icon: "ph-fill ph-pencil-simple",
    confirmText: "Ya, Perbarui",
    onConfirm: () => withBusyButton(
      "btn-submit-edit",
      '<i class="ph ph-spinner-gap ph-spin"></i> Updating...',
      "UPDATE DATA",
      async () => {
        const dataForm = {
          idTransaksi,
          tipeArus,
          idKategori,
          idAnggota: document.getElementById("edit-anggota")?.value || "-",
          bulanIuran: document.getElementById("edit-bulan")?.value || "-",
          tahunIuran: document.getElementById("edit-tahun")?.value || "-",
          nominal,
          keterangan: (document.getElementById("edit-keterangan")?.value || "").trim(),
          timestamp: dateInputToIso(document.getElementById("edit-tanggal")?.value) || undefined
        };

        const { delivered, result } = await deliverMutation({ action: "editTransaksi", idTransaksi, dataForm });

        if (!delivered) {
          // Offline (or unreachable) — the payload is queued. Reflect the edit
          // locally so the UI stays consistent until the sync replays it.
          applyEditOptimistically(idTransaksi, dataForm);
          rerenderAfterLedgerChange();
          closeModal("modal-edit-transaksi");
          showDatabaseToast("Perubahan Disimpan (Offline)", `Transaksi ${idTransaksi} akan disinkronkan saat online.`);
          return;
        }

        if (!result.status) return showToast(result.message, "error");

        const finalId = result.data?.idTransaksi || idTransaksi;
        showDatabaseToast("Transaksi Diperbarui", `Data transaksi ${finalId} berhasil diperbarui.`);
        closeModal("modal-edit-transaksi");
        await refreshAppData();
      }
    )
  });
};

/**
 * Open the delete confirmation for a transaction.
 * @param {string} idTrx
 */
export const konfirmasiHapus = (idTrx) => {
  document.getElementById("hapus-id-target").value = idTrx;
  document.getElementById("modal-hapus").style.zIndex = "110";
  openModal("modal-hapus");
};

/** Delete the transaction awaiting confirmation. */
export const eksekusiHapus = async () => {
  const idTarget = (document.getElementById("hapus-id-target")?.value || "").trim();
  if (!idTarget) return showToast("ID transaksi tidak ditemukan.", "error");

  // A temp id is an optimistic row whose create has not been confirmed yet;
  // there is nothing on the server to delete and its create may still be
  // queued. Block until it has synced and carries a real id.
  if (isUnsyncedTempId(idTarget)) {
    return showToast("Transaksi ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum menghapusnya.", "warning");
  }

  await withBusyButton("btn-hapus", "...", "Ya, Hapus", async () => {
    const { delivered, result } = await deliverMutation({ action: "hapusTransaksi", idTransaksi: idTarget });

    if (!delivered) {
      // Offline — the delete is queued. Drop it from the local ledger now so the
      // UI matches; the queued mutation replays against the server later.
      removeTransactionOptimistically(idTarget);
      rerenderAfterLedgerChange();
      closeModal("modal-hapus");
      showDatabaseToast("Penghapusan Disimpan (Offline)", `Transaksi ${idTarget} akan dihapus saat online.`);
      return;
    }

    if (!result.status) return showToast(result.message, "error");

    showDatabaseToast("Transaksi Dihapus", `Data transaksi ${idTarget} telah dihapus dari database.`);
    closeModal("modal-hapus");
    await refreshAppData();
    renderChart();
  });
};
