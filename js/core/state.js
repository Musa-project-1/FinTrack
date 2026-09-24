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

/** @typedef {{ anggota: Array, kategori: Array, transaksi: Array, skippedMonths: string[] }} AppState */

/** @type {AppState} */
const state = {
  anggota: [],
  kategori: [],
  transaksi: [],
  skippedMonths: []
};

/** Read-only reference to the application state. */
export const getState = () => state;

/**
 * Replace the full application state (e.g. from cache or a fetch).
 * @param {Partial<AppState>} newState
 */
export const setState = (newState) => {
  if (newState.anggota) state.anggota = newState.anggota;
  if (newState.kategori) state.kategori = newState.kategori;
  if (newState.transaksi) state.transaksi = newState.transaksi;
  if (newState.skippedMonths) state.skippedMonths = newState.skippedMonths;
};

/**
 * Push a single transaction into state (optimistic UI).
 * @param {object} trx
 */
export const addTransaction = (trx) => {
  state.transaksi.push(trx);
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

/**
 * Set grup aktif dan ingat di localStorage.
 * @param {string} id
 */
export const setActiveGroupId = (id) => {
  activeGroupId = id || '';
  try {
    const storage = getLocalStorage();
    if (activeGroupId) storage?.setItem(ACTIVE_GROUP_KEY, activeGroupId);
    else storage?.removeItem(ACTIVE_GROUP_KEY);
  } catch (err) {
    console.warn('[finkas] Cannot persist active group:', err?.message);
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

/** Save current state to localStorage, scoped to the active group. */
export const saveCache = () => {
  try {
    getLocalStorage()?.setItem(`${CACHE_KEY}:${getActiveGroupId()}`, JSON.stringify(state));
  } catch (err) {
    console.warn('[finkas] Cache write failed:', err?.message);
  }
};

/**
 * Load state from localStorage for the active group.
 * @returns {boolean} True when a cache was found and applied.
 */
export const loadCache = () => {
  let cached = null;
  try {
    const storage = getLocalStorage();
    cached = storage?.getItem(`${CACHE_KEY}:${getActiveGroupId()}`)
      // One-time migration: pre-scoping caches belong to the default group.
      || (getActiveGroupId() === DEFAULT_GROUP_ID ? storage?.getItem(CACHE_KEY) : null);
  } catch (err) {
    return false;
  }
  if (!cached) return false;

  try {
    setState(JSON.parse(cached));
    return true;
  } catch (err) {
    console.warn('[finkas] Cache parse failed:', err?.message);
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
