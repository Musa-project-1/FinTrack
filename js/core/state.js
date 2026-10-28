/**
 * @module state
 * Centralized application state, cache persistence and session handling.
 *
 * Data reads and writes are authorized by short-lived signed session tokens
 * issued by the API. Tokens live in localStorage (persist across tabs/sessions)
 * and are sent as `sessionToken` on every request.
 */

import {
  CACHE_KEY,
  ADMIN_SESSION_KEY,
  ADMIN_ROLE_KEY,
  ADMIN_EMAIL_KEY,
  GROUP_SESSIONS_KEY,
  ACTIVE_GROUP_KEY,
  DEFAULT_GROUP_ID
} from './config.js';

/** @typedef {{ anggota: Array, kategori: Array, transaksi: Array, skippedMonths: string[], kasStart: string }} AppState */

/** @type {AppState} */
const state = {
  anggota: [],
  kategori: [],
  transaksi: [],
  skippedMonths: [],
  kasStart: ''
};

/** Safe access to localStorage across browser and test environments. */
const getLocalStorage = () => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch {}
  return null;
};

/** Safe read helper shared by the session/cache accessors. */
const safelyRead = (key) => {
  try {
    const storage = getLocalStorage();
    return storage ? (storage.getItem(key) || '') : '';
  } catch (err) {
    return '';
  }
};

/* ── Active group ────────────────────────────────────────────────── */

/** @type {string} ID grup aktif, tersimpan di localStorage. */
let activeGroupId = safelyRead(ACTIVE_GROUP_KEY);

/** @type {Array} Daftar grup yang tersedia. */
let groups = [];

/** Get ID grup aktif dari sesi/localStorage. */
export const getActiveGroupId = () => activeGroupId;

/* ── Storage Status Tracking ─────────────────────────────────────── */

let storageStatus = { groupId: activeGroupId, state: 'unknown', operation: null, error: null };

/** Snapshot of the last actual cache operation, never a tiny capacity probe. */
export const getStorageStatus = () => ({ ...storageStatus });

export function publishStorageStatus(status, operation, error = null) {
  storageStatus = { groupId: activeGroupId, state: status, operation, error: error?.message || null };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finkas:storage-status', { detail: getStorageStatus() }));
  }
}

/**
 * Dispatch an application state change event across modules.
 */
export const notifyStateChange = () => {
  // A previous cache write no longer proves that the current ledger is durable.
  publishStorageStatus('unknown', 'state-change');
  if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
    document.dispatchEvent(new CustomEvent('finkas:state-changed', { detail: { state } }));
  }
};

/**
 * Replace the full application state (e.g. from cache or a fetch).
 * @param {Partial<AppState>} newState
 */
export const setState = (newState) => {
  if (newState.anggota) state.anggota = newState.anggota;
  if (newState.kategori) state.kategori = newState.kategori;
  if (newState.transaksi) state.transaksi = newState.transaksi;
  if (newState.skippedMonths) state.skippedMonths = newState.skippedMonths;
  // kasStart is a settable override: '' is a valid value (revert to fallback),
  // so guard on presence, not truthiness.
  if (newState.kasStart !== undefined) state.kasStart = newState.kasStart;
  notifyStateChange();
};

/** Read-only reference to the application state. */
export const getState = () => state;

/**
 * Push a single transaction into state (optimistic UI).
 * @param {object} trx
 */
export const addTransaction = (trx) => {
  state.transaksi.push(trx);
  notifyStateChange();
};

/**
 * Set grup aktif dan ingat di localStorage.
 * @param {string} id
 */
export const setActiveGroupId = (id) => {
  const previousGroupId = activeGroupId;
  activeGroupId = id || '';
  try {
    const storage = getLocalStorage();
    if (activeGroupId) storage?.setItem(ACTIVE_GROUP_KEY, activeGroupId);
    else storage?.removeItem(ACTIVE_GROUP_KEY);
  } catch (err) {
    console.warn('[finkas] Cannot persist active group:', err?.message);
  }
  if (previousGroupId !== activeGroupId) {
    // The in-memory ledger still needs to be loaded for the newly selected group.
    publishStorageStatus('unknown', 'group-change');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finkas:group-changed', {
        detail: { groupId: activeGroupId, previousGroupId }
      }));
    }
  }
};

/** Get daftar grup. */
export const getGroups = () => groups;

/**
 * Set daftar grup.
 * @param {Array} list
 */
export const setGroups = (list) => { groups = Array.isArray(list) ? list : []; };

/** Display name for a group id, falling back to the id itself. */
export const getGroupName = (id) => groups.find((g) => g.id === id)?.nama || id;

/* ── Cache ───────────────────────────────────────────────────────── */

/** Save the current ledger; false means this snapshot was not persisted. */
export const saveCache = () => {
  try {
    const storage = getLocalStorage();
    if (!storage) throw new Error('Penyimpanan perangkat tidak tersedia.');
    storage.setItem(`${CACHE_KEY}:${getActiveGroupId()}`, JSON.stringify(state));
    publishStorageStatus('saved', 'save');
    return true;
  } catch (err) {
    publishStorageStatus('failed', 'save', err);
    console.warn('[finkas] Cache write failed:', err?.message);
    return false;
  }
};

/** Load an actual ledger snapshot; missing or invalid data is never "saved". */
export const loadCache = () => {
  try {
    const storage = getLocalStorage();
    if (!storage) throw new Error('Penyimpanan perangkat tidak tersedia.');
    const cached = storage.getItem(`${CACHE_KEY}:${getActiveGroupId()}`)
      || (getActiveGroupId() === DEFAULT_GROUP_ID ? storage.getItem(CACHE_KEY) : null);
    if (!cached) {
      publishStorageStatus('unknown', 'load');
      return false;
    }
    const data = JSON.parse(cached);
    if (!data || !['anggota', 'kategori', 'transaksi'].every((key) => Array.isArray(data[key]))) {
      throw new Error('Cache pembukuan tidak valid.');
    }
    setState({ ...data, skippedMonths: data.skippedMonths || [], kasStart: data.kasStart || '' });
    publishStorageStatus('saved', 'load');
    return true;
  } catch (err) {
    publishStorageStatus('failed', 'load', err);
    console.warn('[finkas] Cache load failed:', err?.message);
    return false;
  }
};

/* ── Session tokens ──────────────────────────────────────────────── */

/** @type {Record<string, string>} groupId → token authorizing that group. */
let groupSessions = {};

try {
  const raw = getLocalStorage()?.getItem(GROUP_SESSIONS_KEY);
  if (raw) groupSessions = JSON.parse(raw) || {};
} catch (err) {
  groupSessions = {};
}

const persistGroupSessions = () => {
  try {
    getLocalStorage()?.setItem(GROUP_SESSIONS_KEY, JSON.stringify(groupSessions));
  } catch (err) {
    console.warn('[finkas] Cannot persist group sessions:', err?.message);
  }
};

/**
 * Store the token that authorizes access to a group.
 * @param {string} gid
 * @param {string} token
 */
export const setGroupSession = (gid, token) => {
  if (!gid || !token) return;
  groupSessions[gid] = token;
  persistGroupSessions();
};

/** Token authorizing access to a group, or '' when it has not been unlocked. */
export const getGroupSession = (gid) => groupSessions[gid || ''] || '';

/**
 * Forget a group's token (on exit, or when the server rejects it).
 * @param {string} gid
 */
export const clearGroupSession = (gid) => {
  if (!gid) return;
  delete groupSessions[gid];
  persistGroupSessions();
};

/** Clear all stored group tokens. */
export const clearAllGroupSessions = () => {
  for (const k of Object.keys(groupSessions)) {
    delete groupSessions[k];
  }
  persistGroupSessions();
};

/** @type {string} Signed token for the signed-in admin (group admin or superadmin). */
let adminSessionToken = safelyRead(ADMIN_SESSION_KEY);

/** @type {string} Role: 'superadmin' | 'group_admin' | '' */
let adminRole = safelyRead(ADMIN_ROLE_KEY);

/** @type {string} Admin user email */
let adminUserEmail = safelyRead(ADMIN_EMAIL_KEY);

const persistSessionField = (key, value) => {
  try {
    const storage = getLocalStorage();
    if (value) storage?.setItem(key, value);
    else storage?.removeItem(key);
  } catch (err) {
    console.warn('[finkas] Cannot persist session field:', key, err?.message);
  }
};

/** The admin session token, or '' when not signed in. */
export const getAdminSession = () => adminSessionToken;

/**
 * Store the admin session token.
 * @param {string} token
 */
export const setAdminSession = (token) => {
  adminSessionToken = token || '';
  persistSessionField(ADMIN_SESSION_KEY, adminSessionToken);
};

export const getIsSuperAdmin = () => adminRole === 'superadmin';

/** Whether an admin session is active. */
export const getIsAdminSession = () => Boolean(adminSessionToken);

export const getAdminRole = () => adminRole;

/**
 * Set the admin role.
 * @param {string} role 'superadmin' | 'group_admin' | ''
 */
export const setAdminRole = (role) => {
  adminRole = role || '';
  persistSessionField(ADMIN_ROLE_KEY, adminRole);
};

export const getAdminEmail = () => adminUserEmail;

/**
 * Set the admin email.
 * @param {string} email
 */
export const setAdminEmail = (email) => {
  adminUserEmail = email || '';
  persistSessionField(ADMIN_EMAIL_KEY, adminUserEmail);
};

/** Drop the admin session and all group credentials. */
export const clearAdminSession = () => {
  setAdminSession('');
  setAdminRole('');
  setAdminEmail('');
  clearAllGroupSessions();
};

/**
 * The token to present for a request against a group.
 *
 * Reads use the group's own token when present (least authority); writes use the
 * admin token, which covers every group for a superadmin and the admin's own
 * group otherwise.
 * @param {string} gid
 * @param {boolean} [needsWrite]
 * @returns {string}
 */
export const resolveSessionToken = (gid, needsWrite = false) => {
  if (needsWrite) return adminSessionToken;
  return getGroupSession(gid) || adminSessionToken;
};

/* ── Current view state ────────────────────────────────────────── */

export let currentRekapYear = new Date().getFullYear().toString();
export let currentHistoryFilter = 'semua';
export let itemsToShow = 20;

export const setCurrentRekapYear = (y) => { currentRekapYear = y.toString(); };
export const setCurrentHistoryFilter = (f) => { currentHistoryFilter = f; };
export const setItemsToShow = (n) => { itemsToShow = n; };
export const incrementItemsToShow = (n) => { itemsToShow += n; };

/* ── Chart instances ───────────────────────────────────────────── */

export let cashFlowChart = null;
export let expenseChart = null;
export let arrearsRankChart = null;
export const setCashFlowChart = (c) => { cashFlowChart = c; };
export const setExpenseChart = (c) => { expenseChart = c; };
export const setArrearsRankChart = (c) => { arrearsRankChart = c; };
export const getCashFlowChart = () => cashFlowChart;
export const getExpenseChart = () => expenseChart;
export const getArrearsRankChart = () => arrearsRankChart;
