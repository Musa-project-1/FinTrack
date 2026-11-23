import type { GroupPickerRowVM } from '../stores/group-picker.svelte';
import { htmlElements } from '../../core/utils.js';
import { getActiveGroupId, getGroups, getGroupSession, getIsSuperAdmin, setGroups } from "../../core/state.js";
import { fetchGroupsApi } from "../../core/api.js";
import { countQueuedTransactions, countQueuedTransactionsByGroup } from "../../core/offline.js";
import { syncGroupPickerList } from "../mount";
import { openModal } from "../ui/modal";

let lastQueueCounts: Record<string, number> = {};
let renderGeneration = 0;
let badgeGeneration = 0;
let openGeneration = 0;
let pickerListenersController: AbortController | null = null;

export const updateActiveGroupQueueBadge = async (count: number | null = null) => {
  const gen = ++badgeGeneration;
  const activeId = getActiveGroupId();
  const badge = document.getElementById("group-queue-badge");
  const label = document.getElementById("group-queue-badge-count");
  if (!badge || !label) return;
  if (count === null && activeId) {
    badge.hidden = true;
    count = await countQueuedTransactions(activeId);
    if (gen !== badgeGeneration || activeId !== getActiveGroupId() ||
        typeof document === "undefined" || document.getElementById("group-queue-badge") !== badge) return;
  }
  const n = count ?? 0;
  label.textContent = String(n);
  badge.hidden = !activeId || n <= 0;
  badge.title = `${n} transaksi offline menunggu sinkronisasi`;
  badge.setAttribute("aria-label", badge.title);
};

const applyQueueSummaryAndCounts = (counts: Record<string, number>) => {
  const summary = document.getElementById("group-picker-offline-summary");
  if (!summary) return;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  summary.hidden = total <= 0;
  if (summary.hidden) {
    summary.replaceChildren();
    return;
  }
  const other = total - (counts[getActiveGroupId()] || 0);
  const message = other > 0
    ? `${total} transaksi offline menunggu · ${other} ada di grup lain — masuk ke grup tersebut untuk sinkronkan`
    : `${total} transaksi offline menunggu sinkronisasi di grup aktif`;
  if (summary.textContent === message) return;
  const icon = document.createElement("i");
  icon.className = "groups-offline-summary-icon ph ph-cloud-arrow-up";
  icon.setAttribute("aria-hidden", "true");
  summary.replaceChildren(icon, message);
};

/** Gambar daftar grup ke dalam modal pilih grup. */
export const renderGroupPicker = ({ loading = false, queueCounts = null }: { loading?: boolean; queueCounts?: Record<string, number> | null } = {}) => {
  const box = document.getElementById("group-picker-list");
  if (!box) return;
  const list = getGroups();
  const active = getActiveGroupId();

  const gen = ++renderGeneration;
  if (queueCounts) lastQueueCounts = { ...queueCounts };
  const counts = lastQueueCounts;
  applyQueueSummaryAndCounts(counts);
  if (queueCounts === null && list.length) {
    void countQueuedTransactionsByGroup().then((fresh) => {
      if (gen === renderGeneration && typeof document !== "undefined" &&
          document.getElementById("group-picker-list") === box &&
          JSON.stringify(fresh) !== JSON.stringify(counts)) {
        renderGroupPicker({ queueCounts: fresh });
      }
    });
  }

  const exitBtn = document.getElementById("btn-exit-active-group");
  if (exitBtn) exitBtn.hidden = !active;

  const countEl = document.getElementById("group-picker-count");
  if (countEl) {
    if (loading || !list.length) {
      countEl.hidden = true;
    } else {
      countEl.hidden = false;
      countEl.textContent = `${list.length} grup`;
    }
  }

  if (!list.length) {
    syncGroupPickerList({ mode: loading ? "loading" : "empty", rows: [] });
    return;
  }

  const focusedId = document.activeElement instanceof HTMLElement && box.contains(document.activeElement) ? document.activeElement.dataset.id : null;
  const isSA = getIsSuperAdmin();
  const rows = list.map((g) => {
    const nama = g.nama || "?";
    const initial = (Array.from(String(nama).trim())[0] || '?').toUpperCase();
    const isActive = g.id === active;
    const pendingCount = Math.max(0, Number(counts[g.id]) || 0);
    const isUnlocked = Boolean(getGroupSession(g.id));
    let subText = "Ketuk untuk masuk dengan PIN";
    let badgeKind: GroupPickerRowVM['badgeKind'] = "pin";
    if (isActive) {
      subText = "Grup aktif saat ini";
      badgeKind = "active";
    } else if (isSA) {
      subText = "Akses langsung tanpa PIN";
      badgeKind = "direct";
    } else if (isUnlocked) {
      subText = "Sesi sudah terbuka — ketuk untuk masuk";
      badgeKind = "unlocked";
    }
    if (pendingCount) subText += ` · ${pendingCount} antrean offline`;
    return { id: g.id, nama, initial, isActive, subText, pendingCount, badgeKind };
  });
  syncGroupPickerList({ mode: "list", rows });
  if (focusedId) {
    Array.from(htmlElements(".group-item", box)).find(row => row.dataset.id === focusedId)?.focus();
  }
};

export const openGroupPicker = async () => {
  const gen = ++openGeneration;
  const pickerDocument = document;
  renderGroupPicker({ loading: !getGroups().length });
  const initialRender = renderGeneration;
  openModal("modal-groups");
  const [list, queueCounts] = await Promise.all([fetchGroupsApi(), countQueuedTransactionsByGroup()]);
  if (gen !== openGeneration || typeof document === "undefined" || document !== pickerDocument) return;
  setGroups(list);
  renderGroupPicker({ queueCounts: initialRender === renderGeneration ? queueCounts : null });
};

export const initGroupPickerListeners = () => {
  pickerListenersController?.abort();
  pickerListenersController = new window.AbortController();
  const { signal } = pickerListenersController;
  window.addEventListener("finkas:queue-changed", (e) => {
    const { groupId, pendingCount } = e.detail || {};
    if (groupId && Number.isFinite(pendingCount)) lastQueueCounts[groupId] = pendingCount;
    if (!groupId || groupId === getActiveGroupId()) {
      void updateActiveGroupQueueBadge(groupId && Number.isFinite(pendingCount) ? pendingCount : null);
    }
    if ((document.getElementById("modal-groups") as HTMLDialogElement | null)?.open) renderGroupPicker();
  }, { signal });
  window.addEventListener("finkas:group-changed", () => { void updateActiveGroupQueueBadge(); }, { signal });
};
