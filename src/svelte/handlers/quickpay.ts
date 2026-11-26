import type { Transaksi } from '../../types/finkas';
/**
 * @module handlers/quickpay
 * Single-member Hybrid Kinetic quick pay flow (supports 1-month installment or multi-month atomic rapel).
 */

import { NAMA_BULAN, DEFAULT_MONTHLY_FEE } from "finkas/core/config";
import { getState, currentRekapYear, getIsAdminSession, getActiveGroupId, addTransaction, saveCache } from "finkas/core/state";
import { createDuesLedger } from "finkas/core/dues";
import { getInput, requiredField, closestHtml, formatRp, showToast, showDatabaseToast, getRawNominal, getInitials, dateInputToIso } from "finkas/core/utils";
import { classifySyncResponse } from "finkas/core/offline";
import { deliverMutation, generateOperationId } from "finkas/core/mutation";
import { withLiquidSave } from "../ui/keel";
import { openModal, closeModal, showConfirmDialog } from "../ui/modal";
import { syncQuickPayPresets } from "../mount";
import { syncDpick } from "../ui/dpick";
import { markNewlyPaidCells } from "../stores/workspace-sync";
import {
  refreshAppData,
  tempTransactionId,
  integrateServerTransaction,
  rerenderAfterLedgerChange
} from "./transaction-shared";

export interface PayableMonthOption {
  monthIndex: number;
  bulan: string;
  shortLabel: string;
  paid: number;
  remaining: number;
  isPartial: boolean;
  isOverdue: boolean;
}

interface QuickPayContext {
  idAnggota: string;
  nama: string;
  bulan: string;
  tahun: string;
  monthlyFee: number;
  paid: number;
  remaining: number;
  isPartial: boolean;
  baseBalance: number;
  payableMonths: PayableMonthOption[];
  selectedMonths: string[];
}

let qpContext: QuickPayContext | null = null;
let qpLangBound = false;
const boundQpModals = new WeakSet();

const computeCurrentBalance = (transaksi: Transaksi[] = []) =>
  transaksi.reduce((sum, trx) => {
    const amount = Number(trx?.Nominal) || 0;
    return sum + (trx?.Tipe_Arus === "Masuk" ? amount : -amount);
  }, 0);

const setText = (id: string, text: string) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

const formatCompactRp = (amount: number) => {
  if (amount >= 1000 && amount % 1000 === 0) return `${amount / 1000}rb`;
  return new Intl.NumberFormat("id-ID").format(amount);
};

const getSelectedMonthOptions = (): PayableMonthOption[] => {
  if (!qpContext) return [];
  const selectedSet = new Set(qpContext.selectedMonths);
  return qpContext.payableMonths.filter((m) => selectedSet.has(m.bulan));
};

const isRapelMode = () => (qpContext?.selectedMonths.length || 0) > 1;

const getOverduePresetTargets = (): string[] => {
  if (!qpContext) return [];
  const overdue = qpContext.payableMonths.filter((m) => m.isOverdue).map((m) => m.bulan);
  if (overdue.length > 1) return overdue;
  return qpContext.payableMonths.map((m) => m.bulan);
};

const renderQuickPayPresets = () => {
  const presetsWrap = document.getElementById("qp-presets");
  const lockHint = document.getElementById("qp-rapel-lock-hint");
  const nominalInput = getInput("qp-nominal");
  const nominalWrap = document.getElementById("qp-nominal-wrap");
  if (!qpContext) return;

  const rapel = isRapelMode();
  if (presetsWrap) presetsWrap.hidden = rapel;
  if (lockHint) lockHint.hidden = !rapel;
  if (nominalInput) nominalInput.readOnly = rapel;
  nominalWrap?.classList?.toggle?.("is-rapel-locked", rapel);
  setText("qp-nominal-label", rapel ? "Total Rapel (Otomatis)" : "Nominal Pembayaran");

  if (rapel || !presetsWrap) return;
  const selected = getSelectedMonthOptions()[0];
  const remaining = selected ? selected.remaining : qpContext.remaining;
  const isPartial = selected ? selected.isPartial : qpContext.isPartial;
  const fullLabel = isPartial ? "Lunasi Sisa" : "Lunasi";
  const chips = [{ amount: remaining, label: fullLabel }];
  if (remaining >= 2000) chips.push({ amount: Math.round(remaining / 2), label: "50%" });
  syncQuickPayPresets({ chips });
};

const renderQuickPayRapelStrip = () => {
  const wrap = document.getElementById("qp-rapel-wrap");
  const pillsEl = document.getElementById("qp-rapel-pills");
  const allBtn = document.getElementById("btn-qp-rapel-all");
  if (!wrap || !pillsEl || !qpContext) return;

  const { payableMonths, selectedMonths } = qpContext;
  if (payableMonths.length <= 1) {
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;
  const rapel = selectedMonths.length > 1;
  wrap.classList.toggle("is-rapel-active", rapel);
  setText("qp-rapel-title", rapel ? `Pilih Bulan (${selectedMonths.length} dipilih)` : "Pilih Bulan (Rapel)");

  const targetList = getOverduePresetTargets();
  const allTargetsSelected = targetList.length > 0 && targetList.every((b) => selectedMonths.includes(b));
  const overdueCount = payableMonths.filter((m) => m.isOverdue).length;
  const presetLabel = overdueCount > 1
    ? (allTargetsSelected ? "✓ Semua Tunggakan" : `Semua Tunggakan (${overdueCount})`)
    : (allTargetsSelected ? "✓ Semua Bulan" : `Semua Bulan (${payableMonths.length})`);
  if (allBtn) {
    allBtn.textContent = presetLabel;
    allBtn.setAttribute("aria-pressed", String(allTargetsSelected));
  }

  const selectedSet = new Set(selectedMonths);
  pillsEl.replaceChildren?.();
  for (const m of payableMonths) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "qp-rapel-pill";
    btn.setAttribute?.("data-qp-month", m.bulan);
    const active = selectedSet.has(m.bulan);
    btn.setAttribute?.("aria-pressed", String(active));
    btn.title = m.isPartial
      ? `${m.bulan}: sisa ${formatRp(m.remaining)} (sudah bayar ${formatRp(m.paid)})`
      : `${m.bulan}: ${formatRp(m.remaining)}`;
    btn.textContent = `${m.shortLabel} · ${formatCompactRp(m.remaining)}`;
    pillsEl.appendChild?.(btn);
  }
};

const syncNominalFromSelection = () => {
  if (!qpContext) return;
  const selected = getSelectedMonthOptions();
  const total = selected.reduce((sum, m) => sum + m.remaining, 0) || qpContext.remaining;
  const input = getInput("qp-nominal");
  if (input) input.value = new Intl.NumberFormat("id-ID").format(total);
  if (selected.length === 1) {
    qpContext.bulan = selected[0].bulan;
    qpContext.paid = selected[0].paid;
    qpContext.remaining = selected[0].remaining;
    qpContext.isPartial = selected[0].isPartial;
    const bulanInput = getInput("qp-bulan");
    if (bulanInput) bulanInput.value = selected[0].bulan;
  }
};

const resetQuickPaySettledState = () => {
  const modal = document.getElementById("modal-quickpay");
  modal?.removeAttribute?.("data-pay-state");
  modal?.removeAttribute?.("data-pay-tone");
  document.getElementById("qp-status-badge")?.classList?.remove?.("is-settled");
};

const startQuickPaySavingStage = (angName: string, periodLabel: string, nominal: number) => {
  const modal = document.getElementById("modal-quickpay");
  modal?.setAttribute?.("data-pay-state", "saving");
  modal?.setAttribute?.("data-pay-tone", "inflow");
  setText("qp-verified-title", "Mencatat Pembayaran…");
  setText("qp-verified-amount", `+ ${formatRp(nominal)}`);
  setText("qp-verified-sub", `${angName} · ${periodLabel}`);
};

const markQuickPaySettled = (nominal: number, count = 1) => {
  const full = count > 1 || !qpContext || nominal >= qpContext.remaining;
  document.getElementById("modal-quickpay")?.setAttribute?.("data-pay-state", "settled");
  setText(
    "qp-verified-title",
    count > 1 ? `${count} Bulan Iuran Lunas Tercatat` : (full ? "Iuran Lunas Tercatat" : "Cicilan Iuran Tercatat")
  );
  const badge = document.getElementById("qp-status-badge");
  if (badge) {
    badge.textContent = full ? "LUNAS" : "CICILAN TERCATAT";
    badge.classList?.toggle?.("is-settled", full);
    if (full) {
      badge.classList?.remove?.("is-partial");
      badge.classList?.remove?.("is-rapel");
    }
  }
  setText("qp-impact-status", count > 1 ? `${count} Bulan Lunas Tercatat` : (full ? "Lunas Tercatat" : "Cicilan Tercatat"));
};

const renderQuickPayMeta = () => {
  if (!qpContext) return;
  const { nama, tahun } = qpContext;
  const selected = getSelectedMonthOptions();
  const rapel = selected.length > 1;

  setText("qp-avatar", getInitials(nama));

  const badge = document.getElementById("qp-status-badge");
  if (rapel) {
    const shortList = selected.map((m) => m.shortLabel).join(", ");
    setText("qp-periode", `Rapel ${selected.length} Bulan · ${shortList} ${tahun}`);
    const partials = selected.filter((m) => m.isPartial);
    const fulls = selected.length - partials.length;
    const metaText = partials.length > 0
      ? `${partials.length} cicilan (${formatRp(partials.reduce((s, m) => s + m.remaining, 0))}) + ${fulls} bulan penuh`
      : `${selected.length} bulan × ${formatRp(qpContext.monthlyFee)}`;
    setText("qp-dues-meta", metaText);
    if (badge) {
      badge.textContent = `${selected.length} BULAN`;
      badge.classList?.remove?.("is-partial");
      badge.classList?.add?.("is-rapel");
    }
  } else {
    const m = selected[0];
    const paid = m ? m.paid : qpContext.paid;
    const remaining = m ? m.remaining : qpContext.remaining;
    const isPartial = m ? m.isPartial : qpContext.isPartial;
    const bulan = m ? m.bulan : qpContext.bulan;
    setText("qp-periode", `Iuran ${bulan} ${tahun}`);
    setText(
      "qp-dues-meta",
      isPartial
        ? `Sudah bayar ${formatRp(paid)} · Sisa ${formatRp(remaining)}`
        : `Tagihan bulanan ${formatRp(remaining)}`
    );
    if (badge) {
      badge.textContent = isPartial ? "SEBAGIAN" : "BELUM BAYAR";
      badge.classList?.toggle?.("is-partial", isPartial);
      badge.classList?.remove?.("is-rapel");
    }
  }

  renderQuickPayRapelStrip();
  renderQuickPayPresets();
};

const updateQuickPayPreview = () => {
  const selected = getSelectedMonthOptions();
  const rapel = selected.length > 1;
  const nominal = rapel
    ? selected.reduce((sum, m) => sum + m.remaining, 0)
    : Math.max(0, getRawNominal("qp-nominal") || 0);
  const remaining = rapel ? nominal : (qpContext?.remaining || 0);
  const baseBalance = qpContext?.baseBalance || 0;
  const isZero = nominal <= 0;
  const isFull = !isZero && nominal >= remaining;
  const isPartialPay = !isZero && !rapel && nominal < remaining;

  const callout = document.getElementById("qp-impact-callout");
  if (callout?.classList) {
    callout.classList.toggle("is-inflow", isFull);
    callout.classList.toggle("is-partial", isPartialPay);
  }

  let statusText = "Masukkan nominal pembayaran";
  if (rapel) statusText = `${selected.length} Bulan Akan Lunas`;
  else if (isFull) statusText = "Akan Lunas";
  else if (isPartialPay) statusText = `Bayar Sebagian (Sisa ${formatRp(remaining - nominal)})`;

  setText("qp-impact-status", statusText);
  setText("qp-impact-sub", `Saldo: ${formatRp(baseBalance)} → ${formatRp(baseBalance + nominal)}`);
  setText("qp-impact-label", rapel ? `Kas masuk (${selected.length} trx)` : "Kas masuk");
  setText("qp-impact-amount", isZero ? formatRp(0) : `+ ${formatRp(nominal)}`);
  setText("qp-submit-label", rapel ? `Simpan ${selected.length} Bulan (${formatRp(nominal)})` : "Simpan Pembayaran");

  document.querySelectorAll?.("#qp-presets [data-qp-preset]").forEach((btn) => {
    const presetVal = Number(btn.getAttribute('data-qp-preset')) || 0;
    btn.classList?.toggle?.("is-active", !rapel && nominal > 0 && nominal === presetVal);
  });
};

const toggleRapelMonth = (bulan: string) => {
  if (!qpContext) return;
  const exists = qpContext.payableMonths.some((m) => m.bulan === bulan);
  if (!exists) return;
  const current = new Set(qpContext.selectedMonths);
  if (current.has(bulan)) {
    if (current.size <= 1) return;
    current.delete(bulan);
  } else {
    current.add(bulan);
  }
  qpContext.selectedMonths = qpContext.payableMonths
    .filter((m) => current.has(m.bulan))
    .map((m) => m.bulan);
  syncNominalFromSelection();
  renderQuickPayMeta();
  updateQuickPayPreview();
};

const toggleRapelAllOverdue = () => {
  if (!qpContext) return;
  const targets = getOverduePresetTargets();
  if (targets.length === 0) return;
  const allSelected = targets.every((b) => qpContext!.selectedMonths.includes(b));
  qpContext.selectedMonths = allSelected ? [qpContext.bulan] : targets;
  syncNominalFromSelection();
  renderQuickPayMeta();
  updateQuickPayPreview();
};

const ensureQuickPayBound = () => {
  const modal = document.getElementById("modal-quickpay");
  if (modal && !boundQpModals.has(modal)) {
    boundQpModals.add(modal);
    modal.addEventListener?.("input", (e) => {
      if ((e.target as Element | null)?.id === "qp-nominal" && !isRapelMode()) updateQuickPayPreview();
    });
    modal.addEventListener?.("click", (e) => {
      const monthBtn = closestHtml(e.target, "[data-qp-month]");
      const monthName = monthBtn?.getAttribute?.("data-qp-month");
      if (monthName) {
        toggleRapelMonth(monthName);
        return;
      }
      if (closestHtml(e.target, "#btn-qp-rapel-all")) {
        toggleRapelAllOverdue();
        return;
      }
      const btn = closestHtml(e.target, "[data-qp-preset]");
      if (!btn || isRapelMode()) return;
      const input = getInput("qp-nominal");
      if (!input) return;
      const amount = Number(btn.getAttribute('data-qp-preset')) || 0;
      input.value = new Intl.NumberFormat("id-ID").format(amount);
      updateQuickPayPreview();
      input.focus?.();
    });
  }
  if (!qpLangBound && typeof document?.addEventListener === "function") {
    qpLangBound = true;
    document.addEventListener("finkas:language-changed", () => {
      const activeModal = (document.getElementById("modal-quickpay") as HTMLDialogElement | null);
      if (qpContext && (activeModal?.open || activeModal?.classList?.contains?.("active"))) {
        renderQuickPayMeta();
        updateQuickPayPreview();
      }
    });
  }
};

/**
 * Open the quick-pay sheet for one member/month (with optional multi-month rapel strip).
 */
export const openQuickPaySheet = (idAnggota: string, bulan: string, year = currentRekapYear) => {
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

  const payableMonths: PayableMonthOption[] = [];
  for (let idx = 0; idx < NAMA_BULAN.length; idx++) {
    const info = ledger.getMonth(ang, idx, year);
    if (info.status === "paid" || info.status === "exempt") continue;
    const rem = info.remaining > 0 ? info.remaining : (ledger.monthlyFee || DEFAULT_MONTHLY_FEE);
    payableMonths.push({
      monthIndex: idx,
      bulan: NAMA_BULAN[idx],
      shortLabel: NAMA_BULAN[idx].slice(0, 3),
      paid: Number(info.paid) || 0,
      remaining: rem,
      isPartial: info.status === "partial",
      isOverdue: Boolean(info.owed)
    });
  }

  requiredField("qp-id-anggota").value = idAnggota;
  requiredField("qp-bulan").value = bulan;
  requiredField("qp-tahun").value = year;
  (document.getElementById("qp-nama") as HTMLElement).innerText = ang.Nama_Anggota;
  (document.getElementById("qp-periode") as HTMLElement).innerText = `Iuran ${bulan} ${year}`;

  const defaultNominal = monthInfo.remaining > 0 ? monthInfo.remaining : DEFAULT_MONTHLY_FEE;
  requiredField("qp-nominal").value = new Intl.NumberFormat("id-ID").format(defaultNominal);

  const elTgl = getInput("qp-tanggal");
  if (elTgl) elTgl.value = "";
  syncDpick("qp-tanggal");
  const elKet = getInput("qp-keterangan");
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
    baseBalance: computeCurrentBalance(state.transaksi),
    payableMonths,
    selectedMonths: [bulan]
  };
  resetQuickPaySettledState();
  ensureQuickPayBound();
  renderQuickPayMeta();
  updateQuickPayPreview();
  openModal("modal-quickpay");
};

/**
 * Submit the quick-pay form (single-month `tambahTransaksi` or multi-month atomic `tambahTransaksiMassal`).
 */
export const submitQuickPay = async (e: Event) => {
  e.preventDefault();
  if (!getIsAdminSession()) return showToast("Hanya admin grup yang berwenang mencatat iuran.", "error");
  const idAnggota = requiredField("qp-id-anggota").value;
  const bulan = requiredField("qp-bulan").value;
  const tahun = requiredField("qp-tahun").value;
  const tanggalIso = dateInputToIso(getInput("qp-tanggal")?.value);
  const noteInput = (getInput("qp-keterangan")?.value || "").trim();
  const keterangan = noteInput || "Iuran Anggota";

  const selectedOptions = qpContext?.idAnggota === idAnggota && qpContext?.tahun === tahun
    ? getSelectedMonthOptions()
    : [];
  const rapel = selectedOptions.length > 1;
  const nominal = rapel
    ? selectedOptions.reduce((sum, m) => sum + m.remaining, 0)
    : getRawNominal("qp-nominal");

  if (!idAnggota || !bulan || !tahun) return showToast("Data iuran tidak lengkap.", "error");
  if (isNaN(nominal) || nominal <= 0) return showToast("Nominal harus lebih dari 0.", "error");

  const state = getState();
  const kategoriMasuk = state.kategori.find((k) => k.Tipe === "Masuk");
  if (!kategoriMasuk) return showToast("Buat kategori Masuk terlebih dahulu.", "error");

  const angName = state.anggota.find((a) => a.ID_Anggota === idAnggota)?.Nama_Anggota || "Anggota";
  const targetGroupId = getActiveGroupId();

  const periodLabel = rapel
    ? `${selectedOptions.map((m) => m.shortLabel).join(", ")} ${tahun}`
    : `${bulan} ${tahun}`;

  showConfirmDialog({
    title: rapel ? `Catat Rapel ${selectedOptions.length} Bulan?` : "Catat Iuran Kas?",
    message: rapel
      ? `Simpan rapel ${selectedOptions.length} bulan (${periodLabel}) untuk ${angName} sebesar ${formatRp(nominal)} ke database?`
      : `Simpan iuran ${bulan} ${tahun} untuk ${angName} sebesar ${formatRp(nominal)} ke database?`,
    icon: "ph-fill ph-hand-coins",
    badgeClass: "is-payment",
    confirmText: rapel ? `Ya, Simpan ${selectedOptions.length} Bulan` : "Ya, Simpan Iuran",
    onConfirm: () => {
      if (getActiveGroupId() !== targetGroupId) {
        showToast("Grup kas telah berganti. Operasi dibatalkan.", "warning");
        return;
      }
      return withLiquidSave("btn-submit-quickpay", async () => {
        const operationId = generateOperationId();

        if (rapel) {
          const listTrx = selectedOptions.map((m) => ({
            tipeArus: "Masuk",
            idKategori: kategoriMasuk.ID_Kategori,
            idAnggota,
            bulanIuran: m.bulan,
            tahunIuran: tahun,
            nominal: m.remaining,
            keterangan,
            timestamp: tanggalIso || undefined
          }));
          const payload = {
            action: "tambahTransaksiMassal",
            operationId,
            listTrx
          };

          const { delivered, result } = await deliverMutation(payload);
          if (getActiveGroupId() !== targetGroupId) return { outcome: "neutral", done: () => {} };

          if (!delivered) {
            return {
              outcome: "success",
              onSettled: () => {
                if (getActiveGroupId() === targetGroupId) markQuickPaySettled(nominal, selectedOptions.length);
              },
              done: () => {
                if (getActiveGroupId() !== targetGroupId) return;
                showDatabaseToast("Rapel Iuran Disimpan (Offline)", `${selectedOptions.length} bulan (${periodLabel}) untuk ${angName} disimpan lokal.`);
                closeModal("modal-quickpay");
                resetQuickPaySettledState();
                for (const m of selectedOptions) {
                  addTransaction({
                    ID_Transaksi: tempTransactionId(),
                    Timestamp: tanggalIso || new Date().toISOString(),
                    Tipe_Arus: "Masuk",
                    ID_Kategori: kategoriMasuk.ID_Kategori,
                    ID_Anggota: idAnggota,
                    Bulan_Iuran: m.bulan,
                    Tahun_Iuran: tahun,
                    Nominal: m.remaining,
                    Keterangan: keterangan,
                    groupId: targetGroupId,
                    operationId
                  });
                  markNewlyPaidCells(idAnggota, m.bulan, tahun);
                }
                saveCache();
                rerenderAfterLedgerChange();
              }
            };
          }

          if (classifySyncResponse(result) === "duplicate" || result?.data?.duplicate || result?.data?.isReplay) {
            return {
              outcome: "neutral",
              done: async () => {
                showToast(result?.message || `Rapel ${periodLabel} sudah tercatat.`, "warning");
                closeModal("modal-quickpay");
                resetQuickPaySettledState();
                await refreshAppData();
              }
            };
          }

          if (!result.status) {
            return { outcome: "error", done: () => showToast(result.message, "error") };
          }

          const serverRows: Transaksi[] = Array.isArray(result.data?.transactions)
            ? result.data.transactions
            : (Array.isArray(result.data?.rows) ? result.data.rows : []);
          const inserted = Number(result.data?.inserted ?? (serverRows.length || selectedOptions.length));
          return {
            outcome: "success",
            onSettled: () => {
              if (getActiveGroupId() === targetGroupId) markQuickPaySettled(nominal, inserted);
            },
            done: () => {
              if (getActiveGroupId() !== targetGroupId) return;
              showDatabaseToast("Rapel Iuran Disimpan", `${inserted} bulan (${periodLabel}) untuk ${angName} (${formatRp(nominal)}) berhasil dicatat.`);
              closeModal("modal-quickpay");
              resetQuickPaySettledState();
              if (serverRows.length > 0) {
                for (const row of serverRows) integrateServerTransaction(row);
              } else {
                refreshAppData();
              }
              for (const m of selectedOptions) markNewlyPaidCells(idAnggota, m.bulan, tahun);
              rerenderAfterLedgerChange();
            }
          };
        }

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
            onSettled: () => {
              if (getActiveGroupId() === targetGroupId) markQuickPaySettled(nominal);
            },
            done: () => {
              if (getActiveGroupId() !== targetGroupId) return;
              showDatabaseToast("Iuran Kas Disimpan (Offline)", `Iuran ${bulan} ${tahun} untuk ${angName} disimpan lokal.`);
              closeModal("modal-quickpay");
              resetQuickPaySettledState();
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
              resetQuickPaySettledState();
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
          onSettled: () => {
            if (getActiveGroupId() === targetGroupId) markQuickPaySettled(nominal);
          },
          done: () => {
            if (getActiveGroupId() !== targetGroupId) return;
            showDatabaseToast("Iuran Kas Disimpan", `Iuran ${bulan} ${tahun} untuk ${angName} (${formatRp(nominal)}) berhasil dicatat.`);
            closeModal("modal-quickpay");
            resetQuickPaySettledState();
            integrateServerTransaction(serverRow);
            markNewlyPaidCells(idAnggota, bulan, tahun);
            rerenderAfterLedgerChange();
          }
        };
      }, {
        onSaving: () => startQuickPaySavingStage(angName, periodLabel, nominal),
        onCleanup: resetQuickPaySettledState
      });
    }
  });
};
