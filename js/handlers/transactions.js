/**
 * @module handlers/transactions
 * Recording, editing and deleting cash transactions.
 *
 * Every write goes through `postToBackend`, which carries the admin session
 * token. When the device is offline (or the request never leaves the browser)
 * the payload is queued in IndexedDB and replayed later.
 */

import { NAMA_BULAN, DEFAULT_MONTHLY_FEE } from "../core/config.js";
import { getState, addTransaction, currentRekapYear, getIsAdminSession, getActiveGroupId, saveCache, notifyStateChange } from "../core/state.js";
import { createDuesLedger, billingPeriod } from "../core/dues.js";
import { formatRp, showToast, showDatabaseToast, getRawNominal, getInitials, dateInputToIso, isoToDateInput } from "../core/utils.js";
import { isUnsyncedTempId, classifySyncResponse } from "../core/offline.js";
import { deliverMutation, generateTempId, generateOperationId, requestAppRefresh } from "../core/mutation.js";
import { withBusyButton, withLiquidSave } from "../ui/keel.js";
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
const refreshAppData = async () => { requestAppRefresh(); };
const tempTransactionId = () => generateTempId('TRX');

/**
 * Add confirmed server transaction row to state and persist cache, or trigger
 * full refresh if row already exists or was not returned.
 */
const integrateServerTransaction = (serverRow) => {
  if (!serverRow) {
    refreshAppData();
    return;
  }
  const alreadyExists = (getState().transaksi || []).some((t) => t.ID_Transaksi === serverRow.ID_Transaksi);
  if (!alreadyExists) {
    addTransaction(serverRow);
    saveCache();
  } else {
    refreshAppData();
  }
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
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mencatat iuran.", "error");
  if (!idAnggota || !bulan) return;

  const state = getState();
  const anggotaList = state.anggota || [];
  const ang = anggotaList.find((a) => a.ID_Anggota === idAnggota);
  if (!ang) {
    showToast("Anggota tidak ditemukan.", "error");
    return;
  }

  const monthIndex = NAMA_BULAN.indexOf(bulan);
  if (monthIndex < 0) {
    showToast("Bulan iuran tidak valid.", "error");
    return;
  }

  const ledger = createDuesLedger(state, { year: Number(currentRekapYear) });
  const monthInfo = ledger.getMonth(ang, monthIndex, currentRekapYear);

  if (monthInfo.status === "paid") {
    showToast("Iuran periode ini sudah lunas.", "info");
    return;
  }
  if (monthInfo.status === "exempt") {
    showToast("Bulan ini tidak ditagih untuk anggota ini.", "info");
    return;
  }

  document.getElementById("qp-id-anggota").value = idAnggota;
  document.getElementById("qp-bulan").value = bulan;
  document.getElementById("qp-tahun").value = currentRekapYear;
  document.getElementById("qp-nama").innerText = ang.Nama_Anggota;
  document.getElementById("qp-periode").innerText = `Iuran ${bulan} ${currentRekapYear}`;

  const avatar = document.getElementById("qp-avatar");
  avatar.innerText = getInitials(ang.Nama_Anggota);

  const defaultNominal = monthInfo.remaining > 0 ? monthInfo.remaining : DEFAULT_MONTHLY_FEE;
  document.getElementById("qp-nominal").value = new Intl.NumberFormat("id-ID").format(defaultNominal);
  openModal("modal-quickpay");
};

/** Submit the quick-pay form. */
export const submitQuickPay = async (e) => {
  e.preventDefault();
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mencatat iuran.", "error");
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
  const targetGroupId = getActiveGroupId();

  showConfirmDialog({
    title: "Catat Iuran Kas?",
    message: `Simpan iuran ${bulan} ${tahun} untuk ${angName} sebesar ${formatRp(nominal)} ke database?`,
    icon: "ph-fill ph-hand-coins",
    confirmText: "Ya, Simpan Iuran",
    onConfirm: () => {
      if (getActiveGroupId() !== targetGroupId) {
        showToast("Grup kas telah berganti. Operasi dibatalkan.", "warning");
        return;
      }
      return withBusyButton(
        "btn-submit-quickpay",
        '<i class="ph ph-spinner-gap ph-spin"></i> Menyimpan...',
        '<i class="ph-bold ph-check-circle"></i> SIMPAN PEMBAYARAN',
        async () => {
          const operationId = generateOperationId();
          const payload = {
            action: "tambahTransaksi",
            operationId,
            dataForm: {
              tipeArus: "Masuk",
              idKategori: kategoriMasuk.ID_Kategori,
              idAnggota,
              bulanIuran: bulan,
              tahunIuran: tahun,
              nominal,
              keterangan: "Iuran Anggota",
              operationId
            }
          };

          const { delivered, result } = await deliverMutation(payload);

          if (getActiveGroupId() !== targetGroupId) return;

          if (!delivered) {
            showDatabaseToast("Iuran Kas Disimpan (Offline)", `Iuran ${bulan} ${tahun} untuk ${angName} disimpan lokal.`);
            closeModal("modal-quickpay");
            const offlineRow = {
              ID_Transaksi: tempTransactionId(),
              Timestamp: new Date().toISOString(),
              Tipe_Arus: "Masuk",
              ID_Kategori: kategoriMasuk.ID_Kategori,
              ID_Anggota: idAnggota,
              Bulan_Iuran: bulan,
              Tahun_Iuran: tahun,
              Nominal: nominal,
              Keterangan: "Iuran Anggota",
              groupId: targetGroupId,
              operationId: payload.operationId || payload.dataForm?.operationId
            };
            addTransaction(offlineRow);
            saveCache();
            rerenderAfterLedgerChange();
            return;
          }

          if (classifySyncResponse(result) === "duplicate" || result?.data?.duplicate || result?.data?.isReplay) {
            showToast(result?.message || `Iuran ${bulan} ${tahun} sudah tercatat.`, "warning");
            closeModal("modal-quickpay");
            await refreshAppData();
            return;
          }

          if (!result.status) {
            showToast(result.message, "error");
            return;
          }

          showDatabaseToast("Iuran Kas Disimpan", `Iuran ${bulan} ${tahun} untuk ${angName} (${formatRp(nominal)}) berhasil dicatat.`);
          closeModal("modal-quickpay");

          const serverRow = result.data?.transaction || (result.data?.ID_Transaksi ? result.data : null);
          integrateServerTransaction(serverRow);
          rerenderAfterLedgerChange();
        }
      );
    }
  });
};

/* ══════════════════════════════════════════════════════════════════
   MAIN TRANSACTION MODAL (bulk iuran + operasional)
   ══════════════════════════════════════════════════════════════════ */

/** Open the main transaction modal on the iuran tab, reset to defaults. */
export const bukaModalTransaksi = () => {
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mencatat transaksi.", "error");
  switchTab("iuran", "modal-transaksi");
  document.getElementById("search-anggota-iuran").value = "";
  const defaultPeriod = billingPeriod(new Date());
  document.getElementById("iuran-tahun").value = defaultPeriod.year;
  document.getElementById("iuran-bulan").value = NAMA_BULAN[defaultPeriod.monthIndex];
  syncCdrop("iuran-bulan");
  syncCdrop("iuran-kategori");
  renderCheckboxIuran();

  document.getElementById("tab-operasional")?.querySelector("form")?.reset?.();
  document.getElementById("ops-anggota").value = "-";
  document.getElementById("ops-tipe").value = "Keluar";
  filterKategori("ops-tipe", "ops-kategori");
  syncCdrop("ops-anggota");
  syncCdrop("ops-tipe");
  syncCdrop("ops-kategori");

  document.getElementById("iuran-nominal").value = DEFAULT_FEE_DISPLAY;
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
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mencatat iuran.", "error");
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
  const targetGroupId = getActiveGroupId();

  showConfirmDialog({
    title: "Simpan Iuran Kas?",
    message: `Catat iuran ${formBulan} ${formTahun} untuk ${arrIdAnggota.length} anggota terpilih (Total: ${formatRp(totalNominal)}) ke database?`,
    icon: "ph-fill ph-hand-coins",
    confirmText: "Ya, Simpan Iuran",
    onConfirm: () => {
      if (getActiveGroupId() !== targetGroupId) {
        showToast("Grup kas telah berganti. Operasi dibatalkan.", "warning");
        return;
      }
      return withLiquidSave("btn-submit-iuran", async () => {
        const operationId = generateOperationId();
        const payload = {
          action: "tambahTransaksiMassal",
          operationId,
          dataForm: {
            tipeArus: "Masuk",
            idKategori: formKategori,
            arrIdAnggota,
            bulanIuran: formBulan,
            tahunIuran: formTahun,
            nominal: formNominal,
            keterangan: "Iuran Anggota",
            timestamp: formTanggalIso || undefined,
            operationId
          }
        };

        const { delivered, result } = await deliverMutation(payload);
        if (getActiveGroupId() !== targetGroupId) return { outcome: "neutral", done: () => {} };

        if (!delivered) {
          return {
            outcome: "success",
            done: () => {
              if (getActiveGroupId() !== targetGroupId) return;
              showDatabaseToast("Iuran Kas Disimpan (Offline)", `Iuran untuk ${arrIdAnggota.length} anggota disimpan lokal.`);
              closeModal("modal-transaksi");
              applyIuranOptimistically(arrIdAnggota, formKategori, formBulan, formTahun, formNominal, formTanggalIso, targetGroupId, payload.operationId);
            }
          };
        }

        if (!result.status) return { outcome: "error", done: () => showToast(result.message, "error") };

        if (classifySyncResponse(result) === "duplicate" || result.data?.duplicate || result.data?.isReplay) {
          return {
            outcome: "neutral",
            done: async () => {
              showToast(result.message || "Transaksi iuran sudah tercatat.", "warning");
              closeModal("modal-transaksi");
              await refreshAppData();
            }
          };
        }

        const inserted = Number(result.data?.inserted ?? arrIdAnggota.length);
        const skipped = Array.isArray(result.data?.skipped) ? result.data.skipped : [];

        if (inserted === 0 && skipped.length > 0) {
          return {
            outcome: "neutral",
            done: async () => {
              showToast(result.message || "Semua anggota yang dipilih sudah lunas.", "warning");
              closeModal("modal-transaksi");
              await refreshAppData();
            }
          };
        }

        const serverRows = result.data?.transactions || result.data?.rows;
        return {
          outcome: "success",
          done: () => {
            if (getActiveGroupId() !== targetGroupId) return;
            showDatabaseToast("Iuran Kas Disimpan", `${inserted} data iuran (${formBulan} ${formTahun}) berhasil dicatat.`);
            closeModal("modal-transaksi");
            if (Array.isArray(serverRows) && serverRows.length > 0) {
              const existingIds = new Set((getState().transaksi || []).map((t) => t.ID_Transaksi));
              let added = 0;
              for (const row of serverRows) {
                if (row && row.ID_Transaksi && !existingIds.has(row.ID_Transaksi)) {
                  addTransaction(row);
                  existingIds.add(row.ID_Transaksi);
                  added++;
                }
              }
              if (added > 0) saveCache();
              else refreshAppData();
              rerenderAfterLedgerChange();
              renderCheckboxIuran();
              const nomInput = document.getElementById("iuran-nominal");
              if (nomInput) nomInput.value = DEFAULT_FEE_DISPLAY;
            } else {
              applyIuranOptimistically(
                arrIdAnggota.filter((id) => !skipped.includes(id)),
                formKategori, formBulan, formTahun, formNominal, formTanggalIso, targetGroupId, payload.operationId
              );
            }
          }
        };
      });
    }
  });
};

/** Add optimistic rows for freshly recorded contributions. */
const applyIuranOptimistically = (ids, idKategori, bulan, tahun, nominal, timestampIso, groupId, operationId) => {
  const timestamp = timestampIso || new Date().toISOString();
  ids.forEach((idAnggota, idx) => {
    addTransaction({
      ID_Transaksi: tempTransactionId(),
      Timestamp: timestamp,
      Tipe_Arus: "Masuk",
      ID_Kategori: idKategori,
      ID_Anggota: idAnggota,
      Bulan_Iuran: bulan,
      Tahun_Iuran: tahun,
      Nominal: nominal,
      Keterangan: "Iuran Anggota",
      ...(groupId ? { groupId } : {}),
      ...(operationId ? { operationId: `${operationId}-${idx}` } : {})
    });
  });
  saveCache();
  rerenderAfterLedgerChange();
  renderCheckboxIuran();
  const nomInput = document.getElementById("iuran-nominal");
  if (nomInput) nomInput.value = DEFAULT_FEE_DISPLAY;
};

/** Re-render every ledger-derived view after a local (offline) mutation. */
const rerenderAfterLedgerChange = () => {
  populateTahunRekap();
  renderDashboard();
  renderTableTransaksi();
  renderTableRekap();
  renderChart();
};

/**
 * Apply an edit to the matching local ledger row so the offline UI reflects the
 * change until the queued mutation replays. Field names map dataForm → stored
 * transaction shape. No-op when the row is not in local state.
 * @param {string} idTransaksi
 * @param {object} dataForm
 */
const applyEditOptimistically = (idTransaksi, dataForm) => {
  const trx = getState().transaksi.find((t) => t.ID_Transaksi === idTransaksi);
  if (!trx) return;
  trx.Tipe_Arus = dataForm.tipeArus;
  trx.ID_Kategori = dataForm.idKategori;
  trx.ID_Anggota = dataForm.idAnggota;
  trx.Bulan_Iuran = dataForm.bulanIuran;
  trx.Tahun_Iuran = dataForm.tahunIuran;
  trx.Nominal = dataForm.nominal;
  trx.Keterangan = dataForm.keterangan;
  if (dataForm.timestamp) trx.Timestamp = dataForm.timestamp;
  notifyStateChange();
  saveCache();
};

/**
 * Drop a transaction from the local ledger so the offline UI matches until the
 * queued delete replays. No-op when the row is not in local state.
 * @param {string} idTarget
 */
const removeTransactionOptimistically = (idTarget) => {
  const arr = getState().transaksi;
  const idx = arr.findIndex((t) => t.ID_Transaksi === idTarget);
  if (idx !== -1) {
    arr.splice(idx, 1);
    notifyStateChange();
    saveCache();
  }
};

/* ── Operasional ─────────────────────────────────────────────────── */

/** Submit a single operational (non-iuran) transaction. */
export const submitOperasional = async (e) => {
  e?.preventDefault?.();
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mencatat transaksi.", "error");
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

  const targetGroupId = getActiveGroupId();

  showConfirmDialog({
    title: `Catat ${formTipe === "Masuk" ? "Pemasukan" : "Pengeluaran"}?`,
    message: `Simpan transaksi ${formTipe} sebesar ${formatRp(formNominal)} ke database kas?`,
    icon: formTipe === "Masuk" ? "ph-fill ph-trend-up" : "ph-fill ph-trend-down",
    badgeClass: formTipe === "Masuk" ? "" : "warning",
    confirmText: "Ya, Simpan Transaksi",
    onConfirm: () => {
      if (getActiveGroupId() !== targetGroupId) {
        showToast("Grup kas telah berganti. Operasi dibatalkan.", "warning");
        return;
      }
      return withLiquidSave("btn-submit-ops", async () => {
        const operationId = generateOperationId();
        const payload = {
          action: "tambahTransaksi",
          operationId,
          dataForm: {
            tipeArus: formTipe,
            idKategori: formKategori,
            idAnggota: formAnggota,
            bulanIuran: "-",
            tahunIuran: "-",
            nominal: formNominal,
            keterangan: formKeterangan,
            timestamp: formTanggalIso || undefined,
            operationId
          }
        };

        const { delivered, result } = await deliverMutation(payload);
        if (getActiveGroupId() !== targetGroupId) return { outcome: "neutral", done: () => {} };

        if (delivered && !result.status) {
          return { outcome: "error", done: () => showToast(result.message, "error") };
        }

        if (delivered && (classifySyncResponse(result) === "duplicate" || result?.data?.duplicate || result?.data?.isReplay)) {
          return {
            outcome: "neutral",
            done: async () => {
              showToast(result.message || "Transaksi sudah tercatat.", "warning");
              closeModal("modal-transaksi");
              await refreshAppData();
            }
          };
        }

        return {
          outcome: "success",
          done: () => {
            if (getActiveGroupId() !== targetGroupId) return;
            if (!delivered) {
              showDatabaseToast("Operasional Disimpan (Offline)", `${formTipe} ${formatRp(formNominal)} disimpan lokal.`);
              const offlineRow = {
                ID_Transaksi: tempTransactionId(),
                Timestamp: formTanggalIso || new Date().toISOString(),
                Tipe_Arus: formTipe,
                ID_Kategori: formKategori,
                ID_Anggota: formAnggota,
                Bulan_Iuran: "-",
                Tahun_Iuran: "-",
                Nominal: formNominal,
                Keterangan: formKeterangan,
                groupId: targetGroupId,
                operationId: payload.operationId || payload.dataForm?.operationId
              };
              addTransaction(offlineRow);
              saveCache();
            } else {
              showDatabaseToast("Transaksi Kas Dicatat", `${formTipe}: ${formatRp(formNominal)} berhasil disimpan.`);
              const serverRow = result?.data?.transaction || (result?.data?.ID_Transaksi ? result.data : null);
              integrateServerTransaction(serverRow);
            }

            closeModal("modal-transaksi");
            rerenderAfterLedgerChange();

            document.getElementById("tab-operasional")?.querySelector("form")?.reset?.();
            const opsAnggota = document.getElementById("ops-anggota");
            if (opsAnggota) opsAnggota.value = "-";
            const opsTipe = document.getElementById("ops-tipe");
            if (opsTipe) opsTipe.value = "Keluar";
            filterKategori("ops-tipe", "ops-kategori");
            syncCdrop("ops-anggota");
            syncCdrop("ops-tipe");
            syncCdrop("ops-kategori");
          }
        };
      });
    }
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
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mengedit transaksi.", "error");
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
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mengedit transaksi.", "error");
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

  const targetGroupId = getActiveGroupId();

  showConfirmDialog({
    title: "Perbarui Data Transaksi?",
    message: `Simpan pembaruan transaksi ${idTransaksi} (${formatRp(nominal)}) ke database?`,
    icon: "ph-fill ph-pencil-simple",
    confirmText: "Ya, Perbarui",
    onConfirm: () => {
      if (getActiveGroupId() !== targetGroupId) {
        showToast("Grup kas telah berganti. Operasi dibatalkan.", "warning");
        return;
      }
      return withBusyButton(
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

          if (getActiveGroupId() !== targetGroupId) return;

          if (!delivered) {
            applyEditOptimistically(idTransaksi, dataForm);
            rerenderAfterLedgerChange();
            closeModal("modal-edit-transaksi");
            showDatabaseToast("Perubahan Disimpan (Offline)", `Transaksi ${idTransaksi} akan disinkronkan saat online.`);
            return;
          }

          if (!result.status) return showToast(result.message, "error");

          const finalId = result.data?.idTransaksi || idTransaksi;
          if (finalId !== idTransaksi) {
            removeTransactionOptimistically(idTransaksi);
          }
          applyEditOptimistically(finalId, dataForm);
          rerenderAfterLedgerChange();

          showDatabaseToast("Transaksi Diperbarui", `Data transaksi ${finalId} berhasil diperbarui.`);
          closeModal("modal-edit-transaksi");
          await refreshAppData();
        }
      );
    }
  });
};

/**
 * Open the delete confirmation for a transaction.
 * @param {string} idTrx
 */
export const konfirmasiHapus = (idTrx) => {
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang menghapus transaksi.", "error");
  document.getElementById("hapus-id-target").value = idTrx;
  document.getElementById("modal-hapus").style.zIndex = "110";
  openModal("modal-hapus");
};

/** Delete the transaction awaiting confirmation. */
export const eksekusiHapus = async () => {
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang menghapus transaksi.", "error");
  const idTarget = (document.getElementById("hapus-id-target")?.value || "").trim();
  if (!idTarget) return showToast("ID transaksi tidak ditemukan.", "error");

  // A temp id is an optimistic row whose create has not been confirmed yet;
  // there is nothing on the server to delete and its create may still be
  // queued. Block until it has synced and carries a real id.
  if (isUnsyncedTempId(idTarget)) {
    return showToast("Transaksi ini belum tersimpan ke server. Tunggu sinkronisasi selesai sebelum menghapusnya.", "warning");
  }

  const targetGroupId = getActiveGroupId();

  await withBusyButton("btn-hapus", "...", "Ya, Hapus", async () => {
    if (getActiveGroupId() !== targetGroupId) {
      showToast("Grup kas telah berganti. Operasi dibatalkan.", "warning");
      return;
    }
    const { delivered, result } = await deliverMutation({ action: "hapusTransaksi", idTransaksi: idTarget });

    if (getActiveGroupId() !== targetGroupId) return;

    if (!delivered) {
      removeTransactionOptimistically(idTarget);
      rerenderAfterLedgerChange();
      closeModal("modal-hapus");
      showDatabaseToast("Penghapusan Disimpan (Offline)", `Transaksi ${idTarget} akan dihapus saat online.`);
      return;
    }

    if (!result.status) return showToast(result.message, "error");

    removeTransactionOptimistically(idTarget);
    rerenderAfterLedgerChange();
    showDatabaseToast("Transaksi Dihapus", `Data transaksi ${idTarget} telah dihapus dari database.`);
    closeModal("modal-hapus");
    await refreshAppData();
  });
};
