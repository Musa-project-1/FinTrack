/**
 * @module sync
 * Lightweight data-freshness signaling for Finkas.
 *
 * Three layers (cheapest to most expensive):
 *   1. BroadcastChannel — zero-cost, same-browser multi-tab instant signal
 *   2. visibilitychange  — fire-on-focus check when the user returns to the tab
 *   3. Heartbeat polling — 35-second interval while tab is visible (cross-device)
 *
 * All three only set the refresh badge to "merah" — they never auto-reload.
 * The user decides when to pull fresh data by clicking the badge.
 */

import { checkGroupUpdate } from './api.js';
import { isOnline } from './utils.js';

/* ── Constants ───────────────────────────────────────────────────── */

const CHANNEL_NAME = 'finkas_mutation';
const HEARTBEAT_MS = 35_000;
const VISIBILITY_THROTTLE_MS = 15_000;

/* ── State ───────────────────────────────────────────────────────── */

/** ISO timestamp of the last confirmed sync with the server. */
let lastSyncedAt = null;

/** Whether the badge is currently showing "ada data baru". */
let hasRemoteUpdate = false;

/** Timer id for the heartbeat interval. */
let heartbeatTimer = null;

/** Timestamp of last visibility check (throttle guard). */
let lastVisibilityCheck = 0;

/** Registered callback — called when update status changes. */
let onUpdateChange = null;

/* ── BroadcastChannel (same-browser, cross-tab) ──────────────────── */

const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel(CHANNEL_NAME)
  : null;

if (channel) {
  channel.onmessage = () => {
    // Another tab on this device just wrote data — mark as stale immediately.
    markHasUpdate();
  };
}

/* ── Own mutation success (this tab wrote) ───────────────────────── */

/**
 * When THIS tab writes successfully, api.js dispatches this event. We advance
 * our own freshness marker (so our own badge never falsely turns red) and
 * broadcast to sibling tabs so their badges turn red instead.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('finkas:mutation-success', (e) => {
    markUpToDate(e.detail?.updatedAt);
    channel?.postMessage({ type: 'mutation', timestamp: new Date().toISOString() });
  });
}

/* ── Badge state management ──────────────────────────────────────── */

function markHasUpdate() {
  if (hasRemoteUpdate) return; // already red, no re-render needed
  hasRemoteUpdate = true;
  onUpdateChange?.(true);
}

function markUpToDate(updatedAt) {
  hasRemoteUpdate = false;
  if (updatedAt) lastSyncedAt = updatedAt;
  onUpdateChange?.(false);
}

/* ── Server version check (1 Firestore read) ─────────────────────── */

async function checkForUpdate() {
  if (!isOnline()) return;
  const { hasUpdate, updatedAt } = await checkGroupUpdate(lastSyncedAt);
  if (hasUpdate) markHasUpdate();
  else if (updatedAt && !hasRemoteUpdate) lastSyncedAt = updatedAt;
}

/* ── Visibility change (fire-on-focus) ───────────────────────────── */

function onVisibilityChange() {
  if (document.visibilityState !== 'visible') return;
  const now = Date.now();
  if (now - lastVisibilityCheck < VISIBILITY_THROTTLE_MS) return;
  lastVisibilityCheck = now;
  checkForUpdate();
}

/* ── Heartbeat polling ───────────────────────────────────────────── */

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (document.visibilityState === 'visible') checkForUpdate();
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
 * Initialize sync listeners. Call once from app.js after group is opened.
 * @param {function(boolean): void} onChange Called with true = has update, false = up to date
 */
export const initSync = (onChange) => {
  onUpdateChange = onChange;
  document.addEventListener('visibilitychange', onVisibilityChange);
  startHeartbeat();
  // Initial check after a short delay to let the UI settle
  setTimeout(checkForUpdate, 3000);
};

/**
 * Stop all listeners. Call when group session ends.
 */
export const destroySync = () => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  stopHeartbeat();
  onUpdateChange = null;
  hasRemoteUpdate = false;
  lastSyncedAt = null;
};

/**
 * Mark data as freshly synced (call after a successful initApp).
 * @param {string} [isoTimestamp]
 */
export const notifySynced = (isoTimestamp) => {
  markUpToDate(isoTimestamp || new Date().toISOString());
};
