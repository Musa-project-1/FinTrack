/**
 * @module handlers/quickpay
 * Single-member, single-month Hybrid Kinetic quick pay flow.
 */

import { NAMA_BULAN, DEFAULT_MONTHLY_FEE } from "../core/config.js";
import { getState, currentRekapYear, getIsAdminSession, getActiveGroupId, addTransaction, saveCache } from "../core/state.js";
import { createDuesLedger } from "../core/dues.js";
import { formatRp, showToast, showDatabaseToast, getRawNominal, getInitials, dateInputToIso } from "../core/utils.js";
import { classifySyncResponse } from "../core/offline.js";
import { deliverMutation, generateOperationId } from "../core/mutation.js";
import { withLiquidSave } from "../ui/keel.js";
import { openModal, closeModal, showConfirmDialog } from "../ui/modal.js";
import { syncDpick } from "../ui/dpick.js";
import { markNewlyPaidCells } from "../render.js";
import {
  refreshAppData,
  tempTransactionId,
  integrateServerTransaction,
  rerenderAfterLedgerChange
} from "./transaction-shared.js";

let qpContext = null;
let qpLangBound = false;
const boundQpModals = new WeakSet();

const computeCurrentBalance = (transaksi = []) =>
  transaksi.reduce((sum, trx) => {
    const amount = Number(trx?.Nominal) || 0;
    return sum + (trx?.Tipe_Arus === "Masuk" ? amount : -amount);
  }, 0);

const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

const renderQuickPayPresets = () => {
  const presetsWrap = document.getElementById("qp-presets");
  if (!presetsWrap || !qpContext) return;
  const { remaining, isPartial } = qpContext;
  const fullLabel = isPartial ? "Lunasi Sisa" : "Lunasi";
  const chips = [
    `<button type="button" class="qp-preset-chip" data-qp-preset="${remaining}">${fullLabel}</button>`
  ];
  const half = Math.round(remaining / 2);
  if (remaining >= 2000 && half > 0 && half < remaining) {
    chips.push(`<button type="button" class="qp-preset-chip" data-qp-preset="${half}">50%</button>`);
  }
  presetsWrap.innerHTML = chips.join("");
};

const renderQuickPayMeta = () => {
  if (!qpContext) return;
  const { nama, paid, remaining, isPartial } = qpContext;
  setText("qp-avatar", getInitials(nama));

  setText(
    "qp-dues-meta",
    isPartial
      ? `Sudah bayar ${formatRp(paid)} · Sisa ${formatRp(remaining)}`
      : `Tagihan bulanan ${formatRp(remaining)}`
  );

  const badge = document.getElementById("qp-status-badge");
  if (badge) {
    badge.textContent = isPartial ? "SEBAGIAN" : "BELUM BAYAR";
    badge.classList?.toggle?.("is-partial", isPartial);
  }
  renderQuickPayPresets();
};

const updateQuickPayPreview = () => {
  const nominal = Math.max(0, getRawNominal("qp-nominal") || 0);
  const remaining = qpContext?.remaining || 0;
  const baseBalance = qpContext?.baseBalance || 0;
  const isZero = nominal <= 0;
  const isFull = !isZero && nominal >= remaining;
  const isPartialPay = !isZero && nominal < remaining;

  const callout = document.getElementById("qp-impact-callout");
  if (callout?.classList) {
    callout.classList.toggle("is-inflow", isFull);
    callout.classList.toggle("is-partial", isPartialPay);
  }

  let statusText = "Masukkan nominal pembayaran";
  if (isFull) statusText = "Akan Lunas";
  else if (isPartialPay) statusText = `Bayar Sebagian (Sisa ${formatRp(remaining - nominal)})`;

  setText("qp-impact-status", statusText);
  setText("qp-impact-sub", `Saldo: ${formatRp(baseBalance)} → ${formatRp(baseBalance + nominal)}`);
  setText("qp-impact-amount", isZero ? formatRp(0) : `+ ${formatRp(nominal)}`);

  document.querySelectorAll?.("#qp-presets [data-qp-preset]").forEach((btn) => {
    const presetVal = Number(btn.dataset?.qpPreset) || 0;
    btn.classList?.toggle?.("is-active", nominal > 0 && nominal === presetVal);
  });
};

const ensureQuickPayBound = () => {
  const modal = document.getElementById("modal-quickpay");
  if (modal && !boundQpModals.has(modal)) {
    boundQpModals.add(modal);
    modal.addEventListener?.("input", (e) => {
      if (e.target?.id === "qp-nominal") updateQuickPayPreview();
    });
    modal.addEventListener?.("click", (e) => {
      const btn = e.target?.closest?.("[data-qp-preset]");
      if (!btn) return;
      const input = document.getElementById("qp-nominal");
      if (!input) return;
      const amount = Number(btn.dataset?.qpPreset) || 0;
      input.value = new Intl.NumberFormat("id-ID").format(amount);
      updateQuickPayPreview();
      input.focus?.();
    });
  }
  if (!qpLangBound && typeof document?.addEventListener === "function") {
    qpLangBound = true;
    document.addEventListener("finkas:language-changed", () => {
      const activeModal = document.getElementById("modal-quickpay");
      if (qpContext && (activeModal?.open || activeModal?.classList?.contains?.("active"))) {
        renderQuickPayMeta();
        updateQuickPayPreview();
      }
    });
  }
};

/**
 * Open the quick-pay sheet for one member/month.
 * @param {string} idAnggota
 * @param {string} bulan
 */
export const openQuickPaySheet = (idAnggota, bulan, year = currentRekapYear) => {
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

  const ledger = createDuesLedger(state, { year: Number(year) });
  const monthInfo = ledger.getMonth(ang, monthIndex, year);

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
  document.getElementById("qp-tahun").value = year;
  document.getElementById("qp-nama").innerText = ang.Nama_Anggota;
  document.getElementById("qp-periode").innerText = `Iuran ${bulan} ${year}`;

  const defaultNominal = monthInfo.remaining > 0 ? monthInfo.remaining : DEFAULT_MONTHLY_FEE;
  document.getElementById("qp-nominal").value = new Intl.NumberFormat("id-ID").format(defaultNominal);

  const elTgl = document.getElementById("qp-tanggal");
  if (elTgl) elTgl.value = "";
  syncDpick("qp-tanggal");
  const elKet = document.getElementById("qp-keterangan");
  if (elKet) elKet.value = "";

  qpContext = {
    idAnggota,
    nama: ang.Nama_Anggota,
    bulan,
    tahun: year,
    monthlyFee: ledger.monthlyFee || DEFAULT_MONTHLY_FEE,
    paid: Number(monthInfo.paid) || 0,
    remaining: defaultNominal,
    isPartial: monthInfo.status === "partial",
    baseBalance: computeCurrentBalance(state.transaksi)
  };
  ensureQuickPayBound();
  renderQuickPayMeta();
  updateQuickPayPreview();
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
  const tanggalIso = dateInputToIso(document.getElementById("qp-tanggal")?.value);
  const noteInput = (document.getElementById("qp-keterangan")?.value || "").trim();
  const keterangan = noteInput || "Iuran Anggota";

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
      return withLiquidSave("btn-submit-quickpay", async () => {
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
            keterangan,
            timestamp: tanggalIso || undefined,
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
              showDatabaseToast("Iuran Kas Disimpan (Offline)", `Iuran ${bulan} ${tahun} untuk ${angName} disimpan lokal.`);
              closeModal("modal-quickpay");
              addTransaction({
                ID_Transaksi: tempTransactionId(),
                Timestamp: tanggalIso || new Date().toISOString(),
                Tipe_Arus: "Masuk",
                ID_Kategori: kategoriMasuk.ID_Kategori,
                ID_Anggota: idAnggota,
                Bulan_Iuran: bulan,
                Tahun_Iuran: tahun,
                Nominal: nominal,
                Keterangan: keterangan,
                groupId: targetGroupId,
                operationId: payload.operationId || payload.dataForm?.operationId
              });
              saveCache();
              markNewlyPaidCells(idAnggota, bulan, tahun);
              rerenderAfterLedgerChange();
            }
          };
        }

        if (classifySyncResponse(result) === "duplicate" || result?.data?.duplicate || result?.data?.isReplay) {
          return {
            outcome: "neutral",
            done: async () => {
              showToast(result?.message || `Iuran ${bulan} ${tahun} sudah tercatat.`, "warning");
              closeModal("modal-quickpay");
              await refreshAppData();
            }
          };
        }

        if (!result.status) {
          return { outcome: "error", done: () => showToast(result.message, "error") };
        }

        const serverRow = result.data?.transaction || (result.data?.ID_Transaksi ? result.data : null);
        return {
          outcome: "success",
          done: () => {
            if (getActiveGroupId() !== targetGroupId) return;
            showDatabaseToast("Iuran Kas Disimpan", `Iuran ${bulan} ${tahun} untuk ${angName} (${formatRp(nominal)}) berhasil dicatat.`);
            closeModal("modal-quickpay");
            integrateServerTransaction(serverRow);
            markNewlyPaidCells(idAnggota, bulan, tahun);
            rerenderAfterLedgerChange();
          }
        };
      });
    }
  });
};
