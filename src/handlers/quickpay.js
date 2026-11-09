/**
 * @module handlers/quickpay
 * Single-member, single-month quick pay flow.
 */

import { NAMA_BULAN, DEFAULT_MONTHLY_FEE } from "../core/config.js";
import { getState, currentRekapYear, getIsAdminSession, getActiveGroupId, addTransaction, saveCache } from "../core/state.js";
import { createDuesLedger } from "../core/dues.js";
import { formatRp, showToast, showDatabaseToast, getRawNominal, getInitials } from "../core/utils.js";
import { classifySyncResponse } from "../core/offline.js";
import { deliverMutation, generateOperationId } from "../core/mutation.js";
import { withBusyButton } from "../ui/keel.js";
import { openModal, closeModal, showConfirmDialog } from "../ui/modal.js";
import { markNewlyPaidCells } from "../render.js";
import {
  refreshAppData,
  tempTransactionId,
  integrateServerTransaction,
  rerenderAfterLedgerChange
} from "./transaction-shared.js";

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

/**
 * Submit the quick-pay form.
 * @param {Event} e
 */
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
            markNewlyPaidCells(idAnggota, bulan, tahun);
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
          markNewlyPaidCells(idAnggota, bulan, tahun);
          rerenderAfterLedgerChange();
        }
      );
    }
  });
};
