import { getActiveGroupId, getGroups, getGroupSession, getIsSuperAdmin, setGroups } from "../core/state.js";
import { fetchGroupsApi } from "../core/api.js";
import { countQueuedTransactions, countQueuedTransactionsByGroup } from "../core/offline.js";
import { escapeHtml } from "../core/utils.js";
import { openModal } from "../ui/modal.js";

let lastQueueCounts = {};
let renderGeneration = 0;
let badgeGeneration = 0;
let openGeneration = 0;
let pickerListenersController = null;

export const updateActiveGroupQueueBadge = async (count = null) => {
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

const applyQueueSummaryAndCounts = (counts) => {
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
export const renderGroupPicker = ({ loading = false, queueCounts = null } = {}) => {
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

  if (loading && !list.length) {
    box.innerHTML = `
      <div class="group-picker-skeleton" aria-busy="true" aria-label="Memuat daftar grup...">
        <div class="group-skel-row"></div>
        <div class="group-skel-row"></div>
      </div>`;
    return;
  }

  if (!list.length) {
    box.innerHTML = `
      <div class="group-picker-empty">
        <span class="group-empty-ico" aria-hidden="true"><i class="ph ph-folders"></i></span>
        <strong>Belum ada grup kas tersedia</strong>
        <p>Hubungi pengurus pemilik untuk membuat ruang kas baru.</p>
      </div>`;
    return;
  }

  const focusedId = box.contains(document.activeElement) ? document.activeElement.dataset.id : null;
  const isSA = getIsSuperAdmin();
  box.innerHTML = list.map((g) => {
    const rawName = g.nama || "?";
    const safeName = escapeHtml(rawName);
    const safeId = escapeHtml(g.id);
    const initial = escapeHtml((Array.from(String(rawName).trim())[0] || '?').toUpperCase());
    const isActive = g.id === active;
    const pendingCount = Math.max(0, Number(counts[g.id]) || 0);
    const isUnlocked = Boolean(getGroupSession(g.id));
    let subText = "Ketuk untuk masuk dengan PIN";
    let trailBadge = '<span class="group-pin-badge" aria-hidden="true"><i class="ph ph-lock-simple"></i><span>PIN</span></span>';
    if (isActive) {
      subText = "Grup aktif saat ini";
      trailBadge = '<span class="group-status-pill is-active"><span class="group-status-dot" aria-hidden="true"></span><span>Aktif</span></span>';
    } else if (isSA) {
      subText = "Akses langsung tanpa PIN";
      trailBadge = '<span class="group-status-pill is-direct"><i class="ph ph-lightning" aria-hidden="true"></i><span>Instan</span></span>';
    } else if (isUnlocked) {
      subText = "Sesi sudah terbuka — ketuk untuk masuk";
      trailBadge = '<span class="group-status-pill is-unlocked"><i class="ph ph-lock-open" aria-hidden="true"></i><span>Terbuka</span></span>';
    }
    if (pendingCount) subText += ` · ${pendingCount} antrean offline`;
    return `
    <button type="button" class="group-item${isActive ? " is-active" : ""}" data-action="request-group-pin" data-id="${safeId}" role="listitem"${isActive ? ' aria-current="true"' : ""}>
      <span class="group-item-avatar" aria-hidden="true">${initial}</span>
      <span class="group-item-meta">
        <span class="group-item-name">${safeName}</span>
        <span class="group-item-sub">${subText}</span>
      </span>
      <span class="group-item-trail">
        ${pendingCount ? `<span class="group-queue-badge" data-queue-group="${safeId}" title="${pendingCount} transaksi offline menunggu sinkronisasi"><i class="ph ph-cloud-arrow-up" aria-hidden="true"></i><span>${pendingCount}</span></span>` : ""}
        ${trailBadge}
        <i class="ph ph-caret-right group-item-chev" aria-hidden="true"></i>
      </span>
    </button>`;
  }).join("");
  if (focusedId) {
    Array.from(box.querySelectorAll(".group-item")).find(row => row.dataset.id === focusedId)?.focus();
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
    if (document.getElementById("modal-groups")?.open) renderGroupPicker();
  }, { signal });
  window.addEventListener("finkas:group-changed", () => { void updateActiveGroupQueueBadge(); }, { signal });
};
