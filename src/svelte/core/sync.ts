/**
 * @module sync
 * Lightweight, group-scoped data-freshness signaling for Finkas.
 *
 * Three layers (cheapest to most expensive):
 *   1. BroadcastChannel — zero-cost, same-browser multi-tab instant signal (group-scoped)
 *   2. visibilitychange  — fire-on-focus check when the user returns to the tab
 *   3. Heartbeat polling — 35-second interval while tab is visible (cross-device)
 *
 * Invariants:
 * - An own confirmed write must NEVER advance the read freshness marker (lastSyncedAt)
 *   or clear a known unread remote update.
 * - Only an actual data pull (notifySynced) updates the read freshness marker and clears
 *   the unread update indicator.
 * - Pending update checks must not falsely mark stale when a newer full read completes
 *   while the check is in-flight.
 * - Broadcasts and events are strictly group-scoped.
 */

import { checkGroupUpdate } from './api';
import { isOnline, showToast } from './utils';
import { getActiveGroupId, getState } from './state';

/* ── Constants ───────────────────────────────────────────────────── */

const CHANNEL_NAME = 'finkas_mutation';
const HEARTBEAT_MS = 35_000;
const VISIBILITY_THROTTLE_MS = 15_000;

/* ── State ───────────────────────────────────────────────────────── */

interface GroupSyncState {
  lastSyncedAt: string | null;
  lastConfirmedWriteAt: string | null;
  hasRemoteUpdate: boolean;
}

const groupSyncStates: Map<string, GroupSyncState> = new Map();

/** Get or create the sync state record for a given group. */
const getOrCreateGroupSyncState = (groupId: string|null): GroupSyncState => {
  const gid = groupId || '__default__';
  let s = groupSyncStates.get(gid);
  if (!s) {
    s = { lastSyncedAt: null, lastConfirmedWriteAt: null, hasRemoteUpdate: false };
    groupSyncStates.set(gid, s);
  }
  return s;
};

/** Active group id associated with the last sync listener registration. */
let lastSyncedGroupId: string|null = null;

/** Timer id for the heartbeat interval. */
let heartbeatTimer: ReturnType<typeof setInterval>|null = null;

/** Timestamp of last visibility check (throttle guard). */
let lastVisibilityCheck = 0;

/** Timer id for the initial check delay. */
let initialTimer: ReturnType<typeof setTimeout>|null = null;

/** Registered callback — called with boolean when update status changes. */
let onUpdateChange: ((hasUpdate: boolean) => void)|null = null;

/* ── BroadcastChannel (same-browser, cross-tab) ──────────────────── */

let channel: BroadcastChannel|null = null;

function openMutationChannel() {
  if (typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    const data = event?.data;
    if (!data || data.type !== 'mutation') return;

    const activeGroup = getActiveGroupId();
    const eventGroupId = data.groupId || activeGroup;

    if (eventGroupId && activeGroup && eventGroupId !== activeGroup) {
      // Record on that group's state so when user switches to it, status is known
      const targetState = getOrCreateGroupSyncState(eventGroupId);
      targetState.hasRemoteUpdate = true;
      return;
    }

    markHasUpdate(eventGroupId);
  };
  // Node also exposes BroadcastChannel when a DOM fixture supplies a window.
  if ('unref' in channel && typeof channel.unref === 'function') channel.unref();
}

/* ── Own mutation handling (this tab wrote) ──────────────────────── */

/**
 * Handle confirmation of a mutation from THIS tab.
 *
 * When this tab successfully writes data to the server:
 * 1. Verify the mutation belongs to the active group.
 * 2. Record the write timestamp (server confirmation for local write).
 * 3. Crucially: DO NOT advance `lastSyncedAt` (which tracks full read freshness).
 * 4. Crucially: DO NOT clear `hasRemoteUpdate` (an unread remote change remains unread).
 * 5. Broadcast to sibling tabs scoped with `groupId` so their indicators turn on.
 */
function handleMutationSuccess(e: CustomEvent<{groupId?: string, updatedAt?: string}>) {
  const detail = e?.detail;
  const activeGroup = getActiveGroupId();
  const targetGroup = detail?.groupId || activeGroup;

  const timestamp = detail?.updatedAt || new Date().toISOString();
  const state = getOrCreateGroupSyncState(targetGroup);
  state.lastConfirmedWriteAt = timestamp;

  if (detail?.groupId && activeGroup && detail.groupId !== activeGroup) {
    return;
  }

  // Broadcast to other tabs on this device with group id
  channel?.postMessage({
    type: 'mutation',
    groupId: targetGroup,
    updatedAt: timestamp,
    timestamp: new Date().toISOString()
  });

  dispatchSyncStatus();
}

let eventsBound = false;

export function initSyncEvents() {
  if (eventsBound || typeof globalThis.window?.addEventListener !== 'function') return;
  eventsBound = true;
  openMutationChannel();
  window.addEventListener('finkas:mutation-success', handleMutationSuccess);
  window.addEventListener('finkas:group-changed', (e) => {
    const newGroup = e.detail?.groupId || getActiveGroupId();
    lastSyncedGroupId = newGroup;
    const s = getOrCreateGroupSyncState(newGroup);
    onUpdateChange?.(s.hasRemoteUpdate);
    dispatchSyncStatus();
  });
}

/* ── Status events ───────────────────────────────────────────────── */

function dispatchSyncStatus() {
  if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
    document.dispatchEvent(new CustomEvent('finkas:sync-status', {
      detail: getSyncStatus()
    }));
  }
}

/* ── Badge / Freshness state management ──────────────────────────── */

function markHasUpdate(groupId?: string) {
  const activeGroup = getActiveGroupId();
  const targetGroup = groupId || activeGroup;
  const state = getOrCreateGroupSyncState(targetGroup);

  if (state.hasRemoteUpdate) return;
  state.hasRemoteUpdate = true;

  if (!activeGroup || targetGroup === activeGroup) {
    onUpdateChange?.(true);
    dispatchSyncStatus();
  }
}

function markUpToDate(groupId?: string, updatedAt?: string | null) {
  const activeGroup = getActiveGroupId();
  const targetGroup = groupId || activeGroup;
  const state = getOrCreateGroupSyncState(targetGroup);

  state.hasRemoteUpdate = false;
  if (updatedAt) state.lastSyncedAt = updatedAt;

  if (!activeGroup || targetGroup === activeGroup) {
    onUpdateChange?.(false);
    dispatchSyncStatus();
  }
}

/* ── Server version check (1 Firestore read) ─────────────────────── */

export async function checkForUpdate() {
  if (!isOnline()) return;
  const checkGroupId = getActiveGroupId();
  if (!checkGroupId) return;

  const groupState = getOrCreateGroupSyncState(checkGroupId);
  const since = groupState.lastSyncedAt;
  if (!since) return;

  const { hasUpdate, updatedAt } = await checkGroupUpdate(since, checkGroupId);

  // Guard against race condition 1: user switched groups while request was in-flight.
  if (getActiveGroupId() !== checkGroupId) return;

  // Guard against race condition 2: a newer full read occurred while this check was in-flight.
  // If the returned update timestamp is already <= the newer lastSyncedAt, this update was
  // already incorporated into the ledger and must NOT mark the group as stale.
  const currentState = getOrCreateGroupSyncState(checkGroupId);
  if (currentState.lastSyncedAt && currentState.lastSyncedAt > since) {
    if (updatedAt && currentState.lastSyncedAt >= updatedAt) {
      return;
    }
  }

  if (hasUpdate) {
    markHasUpdate(checkGroupId);
  }
}

/* ── Visibility change (fire-on-focus) ───────────────────────────── */

function onVisibilityChange() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  const now = Date.now();
  if (now - lastVisibilityCheck < VISIBILITY_THROTTLE_MS) return;
  lastVisibilityCheck = now;
  checkForUpdate();
}

/* ── Heartbeat polling ───────────────────────────────────────────── */

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      checkForUpdate();
    }
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/* ── Public API ──────────────────────────────────────────────────── */

/** Get current snapshot of sync state. */
export const getSyncStatus = (groupId?: string): GroupSyncState & { groupId: string | null, isOnline: boolean } => {
  const activeGroup = getActiveGroupId();
  const targetGroup = groupId !== undefined ? (groupId || null) : (activeGroup || null);
  const s = getOrCreateGroupSyncState(targetGroup);
  return {
    groupId: targetGroup,
    lastSyncedAt: s.lastSyncedAt,
    hasRemoteUpdate: s.hasRemoteUpdate,
    lastConfirmedWriteAt: s.lastConfirmedWriteAt,
    isOnline: Boolean(isOnline())
  };
};

export const getHasRemoteUpdate = () => getSyncStatus().hasRemoteUpdate;
export const getLastSyncedAt = () => getSyncStatus().lastSyncedAt;
export const getLastConfirmedWriteAt = () => getSyncStatus().lastConfirmedWriteAt;

/** Initialize sync listeners. Call once from app.js after group is opened. */
export const initSync = (onChange?: (hasUpdate: boolean) => void) => {
  initSyncEvents();
  onUpdateChange = onChange || null;
  lastSyncedGroupId = getActiveGroupId();
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  startHeartbeat();
  // Initial check after a short delay to let UI settle
  if (initialTimer) clearTimeout(initialTimer);
  initialTimer = setTimeout(checkForUpdate, 3000);
  dispatchSyncStatus();
};

/**
 * Stop all listeners and reset in-memory flags. Call when group session ends.
 */
export const destroySync = () => {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }
  stopHeartbeat();
  onUpdateChange = null;
  groupSyncStates.clear();
  lastSyncedGroupId = null;
  dispatchSyncStatus();
};

/** Mark data as freshly synced (call after a successful full fetch/initApp). */
export const notifySynced = (isoTimestamp?: string|null, groupId?: string) => {
  const activeGroup = getActiveGroupId();
  const targetGroup = groupId || activeGroup;
  if (!targetGroup) return;

  markUpToDate(targetGroup, isoTimestamp || null);
};

/* ── Sync badge & manual rekap reconciliation ───────────────────── */

const SYNC_BTNS = ['btn-sync-rekap', 'btn-sync-rekap-mobile'];

const SYNC_STATES = {
  'has-update': { text: 'Data Baru', label: 'Ada data baru — klik untuk muat ulang' },
  'is-syncing': { text: 'Memuat…', label: 'Sedang memuat data...' },
  'is-clean':   { text: 'Sinkron', label: 'Data sinkron — klik untuk muat ulang' }
};

/** Update the sync badge state and WIB timestamp across desktop and mobile controls. */
export const setSyncBadge = (state: 'has-update' | 'is-syncing' | 'is-clean') => {
  const cfg = SYNC_STATES[state] || SYNC_STATES['is-clean'];
  const syncing = state === 'is-syncing';
  let labelText = cfg.label;
  if (!state || state === 'is-clean') {
    const wib = new Date().toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit'
    });
    labelText = `Data sinkron · Diperbarui ${wib} WIB — klik untuk muat ulang`;
  }
  SYNC_BTNS.forEach((id) => {
    const btn = (document.getElementById(id) as HTMLButtonElement|null);
    if (!btn) return;
    btn.classList.remove('is-clean', 'has-update', 'is-syncing');
    btn.classList.add(SYNC_STATES[state] ? state : 'is-clean');
    btn.disabled = syncing;
    btn.setAttribute('aria-busy', syncing ? 'true' : 'false');
    btn.title = labelText;
    btn.setAttribute('aria-label', labelText);
    const labelEl = btn.querySelector('.sync-rekap-label');
    if (labelEl) labelEl.textContent = cfg.text;
  });
};

/** Trigger a user-initiated remote refresh and summarize record deltas. */
export const runManualSyncRekap = (initApp: (forceRemote?: boolean, isUserInitiated?: boolean) => Promise<boolean>, isBusyFn?: () => boolean) => {
  if (isBusyFn?.()) return;
  setSyncBadge('is-syncing');
  const prevTrx = [...(getState().transaksi || [])];
  const prevAnggotaCount = (getState().anggota || []).length;
  initApp(true, true).then((ok) => {
    if (!ok) {
      setSyncBadge('has-update');
      return;
    }
    setSyncBadge('is-clean');
    const nextTrx = getState().transaksi || [];
    const nextAnggotaCount = (getState().anggota || []).length;
    const prevIds = new Set(prevTrx.map((t) => t.ID_Transaksi));
    const newTrx = nextTrx.filter((t) => !prevIds.has(t.ID_Transaksi));
    const nextIds = new Set(nextTrx.map((t) => t.ID_Transaksi));
    const deletedTrx = prevTrx.filter((t) => !nextIds.has(t.ID_Transaksi));
    const diffAnggota = nextAnggotaCount - prevAnggotaCount;

    const changes: string[] = [];
    if (newTrx.length > 0) changes.push(`+${newTrx.length} transaksi baru`);
    if (deletedTrx.length > 0) changes.push(`${deletedTrx.length} transaksi dihapus`);
    if (diffAnggota > 0) changes.push(`+${diffAnggota} anggota baru`);
    if (diffAnggota < 0) changes.push(`${Math.abs(diffAnggota)} anggota dihapus`);

    if (changes.length > 0) {
      showToast(`Sinkron berhasil: ${changes.join(', ')}.`, 'success');
    } else {
      showToast('Data sudah yang paling baru.', 'info');
    }
  });
};
