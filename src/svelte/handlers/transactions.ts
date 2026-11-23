import type { ArusTipe, Transaksi } from '../../types/finkas';

/**
 * @module handlers/transactions
 * Recording, editing and deleting cash transactions.
 *
 * Every write goes through `postToBackend`, which carries the admin session
 * token. When the device is offline (or the request never leaves the browser)
 * the payload is queued in IndexedDB and replayed later.
 */

import { NAMA_BULAN, DEFAULT_MONTHLY_FEE } from "finkas/core/config";
import { getState, addTransaction, getIsAdminSession, getActiveGroupId, saveCache, notifyStateChange } from "finkas/core/state";
import { billingPeriod } from "finkas/core/dues";
import { getInput, getSelect, requiredField, formatRp, showToast, showDatabaseToast, getRawNominal, dateInputToIso, isoToDateInput } from "finkas/core/utils";
import { isUnsyncedTempId, classifySyncResponse } from "finkas/core/offline";
import { deliverMutation, generateOperationId } from "finkas/core/mutation";
import { withBusyButton, withLiquidSave } from "../ui/keel";
import { openModal, closeModal, switchTab, showConfirmDialog } from "../ui/modal";
import { renderCheckboxIuran, filterKategori, updateEditDelta, updateCounterIuran, updateCounterOps, resetTrxWizard } from "../ui/transaction-form";
import { syncCdrop } from "../ui/cdrop";
import { syncDpick } from "../ui/dpick";
import { markNewlyPaidCells } from "../render/index";
import {
  refreshAppData,
  tempTransactionId,
  integrateServerTransaction,
  rerenderAfterLedgerChange
} from "./transaction-shared";

export { openQuickPaySheet, submitQuickPay } from "./quickpay";
export {
  refreshAppData,
  tempTransactionId,
  integrateServerTransaction,
  rerenderAfterLedgerChange
} from "./transaction-shared";

interface EditedTransaction {
  tipeArus: ArusTipe;
  idKategori: string;
  idAnggota: string;
  bulanIuran: string;
  tahunIuran: string;
  nominal: number;
  keterangan: string;
  timestamp?: string;
}

const DEFAULT_FEE_DISPLAY = new Intl.NumberFormat("id-ID").format(DEFAULT_MONTHLY_FEE);

/* ══════════════════════════════════════════════════════════════════
   MAIN TRANSACTION MODAL (bulk iuran + operasional)
   ══════════════════════════════════════════════════════════════════ */

/** Open the main transaction modal on the iuran tab, reset to defaults. */
export const bukaModalTransaksi = (selection?: { month: number; year: number; amount: number; memberIds: string[] }) => {
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mencatat transaksi.", "error");
  switchTab("iuran", "modal-transaksi");
  requiredField("search-anggota-iuran").value = "";
  const defaultPeriod = billingPeriod(new Date());
  const yearField: { value: number | string } = requiredField("iuran-tahun");
  yearField.value = selection?.year ?? defaultPeriod.year;
  requiredField("iuran-bulan").value = NAMA_BULAN[selection?.month ?? defaultPeriod.monthIndex];
  syncCdrop("iuran-bulan");
  syncCdrop("iuran-kategori");
  renderCheckboxIuran();

  document.getElementById("tab-operasional")?.querySelector("form")?.reset?.();
  requiredField("ops-anggota").value = "-";
  requiredField("ops-tipe").value = "Keluar";
  filterKategori("ops-tipe", "ops-kategori");
  syncCdrop("ops-anggota");
  syncCdrop("ops-kategori");
  updateCounterOps();

  requiredField("iuran-nominal").value = selection
    ? new Intl.NumberFormat("id-ID").format(selection.amount) : DEFAULT_FEE_DISPLAY;
  if (selection) {
    const selectedMembers = new Set(selection.memberIds);
    (document.querySelectorAll(".chk-iuran:not(:disabled)") as NodeListOf<HTMLInputElement>).forEach((input) => {
      input.checked = selectedMembers.has(input.value);
    });
  }
  updateCounterIuran();
  const iuranTgl = getInput("iuran-tanggal");
  if (iuranTgl) iuranTgl.value = "";
  const opsTgl = getInput("ops-tanggal");
  if (opsTgl) opsTgl.value = "";
  syncDpick("iuran-tanggal");
  syncDpick("ops-tanggal");
  const hasPreselected = Boolean(
    (selection?.memberIds.length ?? 0) > 0 &&
    (document.querySelectorAll(".chk-iuran:not(:disabled):checked") as NodeListOf<HTMLInputElement>).length > 0 &&
    getSelect("iuran-kategori")?.value
  );
  resetTrxWizard("iuran", hasPreselected ? 3 : 1);
  openModal("modal-transaksi");
};

/* ── Bulk iuran ──────────────────────────────────────────────────── */

/** Submit contributions for every checked member. */
export const submitIuran = async (e: Event) => {
  e?.preventDefault?.();
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mencatat iuran.", "error");
  const checkboxes = (document.querySelectorAll(".chk-iuran:not(:disabled):checked") as NodeListOf<HTMLInputElement>);
  if (checkboxes.length === 0) return showToast("Pilih minimal 1 anggota!", "error");

  const formNominal = getRawNominal("iuran-nominal");
  const formKategori = requiredField("iuran-kategori").value;
  const formBulan = requiredField("iuran-bulan").value;
  const formTahun = requiredField("iuran-tahun").value;
  const formTanggalIso = dateInputToIso(getInput("iuran-tanggal")?.value);

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
              markNewlyPaidCells(arrIdAnggota, formBulan, formTahun);
              rerenderAfterLedgerChange();
              renderCheckboxIuran();
              const nomInput = getInput("iuran-nominal");
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
const applyIuranOptimistically = (ids: string[], idKategori: string, bulan: string, tahun: string, nominal: number, timestampIso: string, groupId: string, operationId: string) => {
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
  markNewlyPaidCells(ids, bulan, tahun);
  rerenderAfterLedgerChange();
  renderCheckboxIuran();
  const nomInput = getInput("iuran-nominal");
  if (nomInput) nomInput.value = DEFAULT_FEE_DISPLAY;
};

/**
 * Apply an edit to the matching local ledger row so the offline UI reflects the
 * change until the queued mutation replays. Field names map dataForm → stored
 * transaction shape. No-op when the row is not in local state.
 */
const applyEditOptimistically = (idTransaksi: string, dataForm: EditedTransaction) => {
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
 */
const removeTransactionOptimistically = (idTarget: string) => {
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
export const submitOperasional = async (e: Event) => {
  e?.preventDefault?.();
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mencatat transaksi.", "error");
  const formTipe = getSelect("ops-tipe")?.value;
  const formKategori = getSelect("ops-kategori")?.value;
  const formNominal = getRawNominal("ops-nominal");
  const formAnggota = getSelect("ops-anggota")?.value || "-";
  const formKeterangan = (getInput("ops-keterangan")?.value || "").trim();
  const formTanggalIso = dateInputToIso(getInput("ops-tanggal")?.value);

  if (formTipe !== "Masuk" && formTipe !== "Keluar") {
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
              const offlineRow: Transaksi = {
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
            const opsAnggota = getSelect("ops-anggota");
            if (opsAnggota) opsAnggota.value = "-";
            const opsTipe = getSelect("ops-tipe");
            if (opsTipe) opsTipe.value = "Keluar";
            filterKategori("ops-tipe", "ops-kategori");
            syncCdrop("ops-anggota");
            syncCdrop("ops-kategori");
            syncDpick("ops-tanggal");
            updateCounterOps();
          }
        };
      });
    }
  });
};

/* ══════════════════════════════════════════════════════════════════
   EDIT / DELETE
   ══════════════════════════════════════════════════════════════════ */

const editPreviewListeners: WeakMap<HTMLElement, EventListener> = new WeakMap();

const bindEditPreview = (field: HTMLElement | null, event: string, listener: EventListener) => {
  if (!field) return;
  const previous = editPreviewListeners.get(field);
  if (previous) field.removeEventListener(event, previous);
  field.addEventListener(event, listener);
  editPreviewListeners.set(field, listener);
};

/**
 * Open the edit modal prefilled from a transaction.
 */
export const bukaModalEdit = (idTrx: string) => {
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mengedit transaksi.", "error");
  const trx = getState().transaksi.find((t) => t.ID_Transaksi === idTrx);
  if (!trx) return;

  requiredField("edit-id").value = trx.ID_Transaksi;
  requiredField("edit-tipe").value = trx.Tipe_Arus;
  filterKategori("edit-tipe", "edit-kategori");
  requiredField("edit-kategori").value = trx.ID_Kategori;
  syncCdrop("edit-tipe");
  syncCdrop("edit-kategori");

  requiredField("edit-nominal").value = new Intl.NumberFormat("id-ID").format(trx.Nominal || 0);
  requiredField("edit-anggota").value = trx.ID_Anggota || "-";
  requiredField("edit-bulan").value = trx.Bulan_Iuran || "-";
  syncCdrop("edit-anggota");
  syncCdrop("edit-bulan");
  requiredField("edit-tahun").value = String(trx.Tahun_Iuran || "");
  requiredField("edit-keterangan").value = trx.Keterangan || "";

  const editTanggal = getInput("edit-tanggal");
  if (editTanggal) editTanggal.value = isoToDateInput(trx.Timestamp);
  syncDpick("edit-tanggal");

  // Populate delta preview with original values and bind live update
  const _originalNominal = trx.Nominal || 0;
  const _originalTipe = trx.Tipe_Arus;
  updateEditDelta(_originalTipe, _originalNominal, _originalTipe, _originalNominal);

  const refreshPreview = () => {
    const newTipe = getSelect("edit-tipe")?.value || _originalTipe;
    const newNominal = getRawNominal("edit-nominal");
    updateEditDelta(_originalTipe, _originalNominal, newTipe, newNominal);
  };
  bindEditPreview(getInput("edit-nominal"), "input", refreshPreview);
  bindEditPreview(getSelect("edit-tipe"), "change", refreshPreview);

  openModal("modal-edit-transaksi");
};

/** Submit the edit form. */
export const submitEditTransaksi = async (e: Event) => {
  e?.preventDefault?.();
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mengedit transaksi.", "error");
  const idTransaksi = (getInput("edit-id")?.value || "").trim();
  const tipeArus = getSelect("edit-tipe")?.value;
  const idKategori = getSelect("edit-kategori")?.value;
  const nominal = getRawNominal("edit-nominal");

  if (!idTransaksi) return showToast("ID transaksi tidak ditemukan.", "error");
  if (tipeArus !== "Masuk" && tipeArus !== "Keluar") return showToast("Pilih tipe transaksi yang valid.", "error");
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
          const dataForm: EditedTransaction & { idTransaksi: string } = {
            idTransaksi,
            tipeArus,
            idKategori,
            idAnggota: getSelect("edit-anggota")?.value || "-",
            bulanIuran: getSelect("edit-bulan")?.value || "-",
            tahunIuran: getInput("edit-tahun")?.value || "-",
            nominal,
            keterangan: (getInput("edit-keterangan")?.value || "").trim(),
            timestamp: dateInputToIso(getInput("edit-tanggal")?.value) || undefined
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
 */
export const konfirmasiHapus = (idTrx: string) => {
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang menghapus transaksi.", "error");
  requiredField("hapus-id-target").value = idTrx;
  (document.getElementById("modal-hapus") as HTMLDialogElement).style.zIndex = "110";
  openModal("modal-hapus");
};

/** Delete the transaction awaiting confirmation. */
export const eksekusiHapus = async () => {
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang menghapus transaksi.", "error");
  const idTarget = (getInput("hapus-id-target")?.value || "").trim();
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
