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

import { checkGroupUpdate } from './api.js';
import { isOnline } from './utils.js';
import { getActiveGroupId } from './state.js';

/* ── Constants ───────────────────────────────────────────────────── */

const CHANNEL_NAME = 'finkas_mutation';
const HEARTBEAT_MS = 35_000;
const VISIBILITY_THROTTLE_MS = 15_000;

/* ── State ───────────────────────────────────────────────────────── */

/**
 * @typedef {{
 *   lastSyncedAt: string|null,
 *   lastConfirmedWriteAt: string|null,
 *   hasRemoteUpdate: boolean
 * }} GroupSyncState
 */

/** @type {Map<string, GroupSyncState>} */
const groupSyncStates = new Map();

/**
 * Get or create the sync state record for a given group.
 * @param {string|null} groupId
 * @returns {GroupSyncState}
 */
const getOrCreateGroupSyncState = (groupId) => {
  const gid = groupId || '__default__';
  let s = groupSyncStates.get(gid);
  if (!s) {
    s = { lastSyncedAt: null, lastConfirmedWriteAt: null, hasRemoteUpdate: false };
    groupSyncStates.set(gid, s);
  }
  return s;
};

/** Active group id associated with the last sync listener registration. */
let lastSyncedGroupId = null;

/** Timer id for the heartbeat interval. */
let heartbeatTimer = null;

/** Timestamp of last visibility check (throttle guard). */
let lastVisibilityCheck = 0;

/** Timer id for the initial check delay. */
let initialTimer = null;

/** Registered callback — called with boolean when update status changes. */
let onUpdateChange = null;

/* ── BroadcastChannel (same-browser, cross-tab) ──────────────────── */

const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel(CHANNEL_NAME)
  : null;

if (channel) {
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
function handleMutationSuccess(e) {
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

if (typeof window !== 'undefined') {
  window.addEventListener('finkas:mutation-success', handleMutationSuccess);
  window.addEventListener('finkas:group-changed', (e) => {
    const newGroup = e?.detail?.groupId || getActiveGroupId();
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

function markHasUpdate(groupId) {
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

function markUpToDate(groupId, updatedAt) {
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

/**
 * Get current snapshot of sync state.
 * @param {string} [groupId] Optional group ID, defaults to active group
 * @returns {{
 *   groupId: string|null,
 *   lastSyncedAt: string|null,
 *   hasRemoteUpdate: boolean,
 *   lastConfirmedWriteAt: string|null,
 *   isOnline: boolean
 * }}
 */
export const getSyncStatus = (groupId) => {
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

/**
 * Initialize sync listeners. Call once from app.js after group is opened.
 * @param {function(boolean): void} [onChange] Called with true = has update, false = up to date
 */
export const initSync = (onChange) => {
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

/**
 * Mark data as freshly synced (call after a successful full fetch/initApp).
 * @param {string|null} [isoTimestamp]
 * @param {string} [groupId]
 */
export const notifySynced = (isoTimestamp, groupId) => {
  const activeGroup = getActiveGroupId();
  const targetGroup = groupId || activeGroup;
  if (!targetGroup) return;

  markUpToDate(targetGroup, isoTimestamp || null);
};
