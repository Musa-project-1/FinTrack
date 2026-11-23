import type { AppState, Transaksi } from '../../types/finkas';
import { billingPeriod } from './dues';
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
  ADMIN_VIEW_MODE_KEY,
  GROUP_SESSIONS_KEY,
  ACTIVE_GROUP_KEY,
  DEFAULT_GROUP_ID
} from './config';

const emptyLedger = (): AppState => ({
  anggota: [],
  kategori: [],
  transaksi: [],
  skippedMonths: [],
  kasStart: '',
  paymentAccount: null
});

const state: AppState = emptyLedger();

/** Safe access to localStorage across browser and test environments. */
const getLocalStorage = () => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch {}
  return null;
};

/** Safe read helper shared by the session/cache accessors. */
const safelyRead = (key: string) => {
  try {
    const storage = getLocalStorage();
    return storage ? (storage.getItem(key) || '') : '';
  } catch (err) {
    return '';
  }
};

/* ── Active group ────────────────────────────────────────────────── */

let activeGroupId: string = safelyRead(ACTIVE_GROUP_KEY);

let groups: Array<{id: string, nama: string, dibuat?: string}> = [];

/** Get ID grup aktif dari sesi/localStorage. */
export const getActiveGroupId = () => activeGroupId;

/* ── Storage Status Tracking ─────────────────────────────────────── */

let storageStatus: { groupId: string, state: string, operation: string|null, error: string|null } = { groupId: activeGroupId, state: 'unknown', operation: null, error: null };

/** Snapshot of the last actual cache operation, never a tiny capacity probe. */
export const getStorageStatus = () => ({ ...storageStatus });

export function publishStorageStatus(status: string, operation: string, error: unknown = null, groupId: string = activeGroupId) {
  const errMsg = error instanceof Error ? error.message : ((error as {message?: string}|null)?.message || null);
  storageStatus = { groupId, state: status, operation, error: errMsg };
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

/** Replace the full application state (e.g. from cache or a fetch). */
export const setState = (newState: Partial<AppState>) => {
  if (newState.anggota) state.anggota = newState.anggota;
  if (newState.kategori) state.kategori = newState.kategori;
  if (newState.transaksi) state.transaksi = newState.transaksi;
  if (newState.skippedMonths) state.skippedMonths = newState.skippedMonths;
  // kasStart is a settable override: '' is a valid value (revert to fallback),
  // so guard on presence, not truthiness.
  if (newState.kasStart !== undefined) state.kasStart = newState.kasStart;
  if (newState.paymentAccount !== undefined) state.paymentAccount = newState.paymentAccount;
  notifyStateChange();
};

/** Read-only reference to the application state. */
export const getState = () => state;

/** Push a single transaction into state (optimistic UI). */
export const addTransaction = (trx: Transaksi) => {
  state.transaksi.push(trx);
  notifyStateChange();
};

/** Set grup aktif dan ingat di localStorage. */
export const setActiveGroupId = (id: string) => {
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
    Object.assign(state, emptyLedger());
    currentRekapYear = String(billingPeriod().year);
    currentHistoryFilter = 'semua';
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

/** Set daftar grup. */
export const setGroups = (list: Array<{id: string, nama: string, dibuat?: string}>) => { groups = Array.isArray(list) ? list : []; };

/** Display name for a group id, falling back to the id itself. */
export const getGroupName = (id: string) => groups.find((g) => g.id === id)?.nama || id;

/* ── Cache ───────────────────────────────────────────────────────── */

/** Save the current ledger; false means this snapshot was not persisted. */
export const saveCache = (targetGroupId: string = getActiveGroupId()) => {
  if (!targetGroupId) {
    publishStorageStatus('failed', 'save', new Error('ID grup aktif belum dipilih.'));
    return false;
  }
  try {
    const storage = getLocalStorage();
    if (!storage) throw new Error('Penyimpanan perangkat tidak tersedia.');
    storage.setItem(`${CACHE_KEY}:${targetGroupId}`, JSON.stringify(state));
    publishStorageStatus('saved', 'save', null, targetGroupId);
    return true;
  } catch (err) {
    publishStorageStatus('failed', 'save', err, targetGroupId);
    console.warn('[finkas] Cache write failed:', err?.message);
    return false;
  }
};

/** Load an actual ledger snapshot; missing or invalid data is never "saved". */
export const loadCache = (targetGroupId: string = getActiveGroupId()) => {
  if (!targetGroupId) {
    publishStorageStatus('unknown', 'load');
    return false;
  }
  try {
    const storage = getLocalStorage();
    if (!storage) throw new Error('Penyimpanan perangkat tidak tersedia.');
    const cached = storage.getItem(`${CACHE_KEY}:${targetGroupId}`)
      || (targetGroupId === DEFAULT_GROUP_ID ? storage.getItem(CACHE_KEY) : null);
    if (!cached) {
      publishStorageStatus('unknown', 'load', null, targetGroupId);
      return false;
    }
    const data = JSON.parse(cached);
    if (!data || !['anggota', 'kategori', 'transaksi'].every((key) => Array.isArray(data[key]))) {
      throw new Error('Cache pembukuan tidak valid.');
    }
    setState({ ...data, skippedMonths: data.skippedMonths || [], kasStart: data.kasStart || '', paymentAccount: data.paymentAccount || null });
    publishStorageStatus('saved', 'load', null, targetGroupId);
    return true;
  } catch (err) {
    publishStorageStatus('failed', 'load', err, targetGroupId);
    console.warn('[finkas] Cache load failed:', err?.message);
    return false;
  }
};

/* ── Session tokens ──────────────────────────────────────────────── */

let groupSessions: Record<string, string> = {};

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

/** Store the token that authorizes access to a group. */
export const setGroupSession = (gid: string, token: string) => {
  if (!gid || !token) return;
  groupSessions[gid] = token;
  persistGroupSessions();
};

/** Token authorizing access to a group, or '' when it has not been unlocked. */
export const getGroupSession = (gid: string | null | undefined) => groupSessions[gid || ''] || '';

/** Forget a group's token (on exit, or when the server rejects it). */
export const clearGroupSession = (gid: string) => {
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

let adminSessionToken: string = safelyRead(ADMIN_SESSION_KEY);

let adminRole: string = safelyRead(ADMIN_ROLE_KEY);

let adminUserEmail: string = safelyRead(ADMIN_EMAIL_KEY);

let adminViewMode: 'admin' | 'anggota' = safelyRead(ADMIN_VIEW_MODE_KEY) === 'anggota' ? 'anggota' : 'admin';

const persistSessionField = (key: string, value: string) => {
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

/** Store the admin session token and default the view mode back to Admin. */
export const setAdminSession = (token: string) => {
  adminSessionToken = token || '';
  persistSessionField(ADMIN_SESSION_KEY, adminSessionToken);
  setAdminViewMode('admin');
};

export const getIsSuperAdmin = () => adminRole === 'superadmin';

/** Whether an admin session is active. */
export const getIsAdminSession = () => Boolean(adminSessionToken);

/** Active UI view mode ('admin' | 'anggota'); non-admin sessions always resolve to 'anggota'. */
export const getAdminViewMode = () => (adminSessionToken && adminViewMode === 'anggota' ? 'anggota' : (adminSessionToken ? 'admin' : 'anggota'));

/** Switch the admin UI preview mode between 'admin' and 'anggota'. */
export const setAdminViewMode = (mode: 'admin' | 'anggota') => {
  adminViewMode = mode === 'anggota' ? 'anggota' : 'admin';
  persistSessionField(ADMIN_VIEW_MODE_KEY, adminViewMode === 'anggota' ? 'anggota' : '');
};

/** Whether the UI should display Admin controls (true only when session is active and not previewing member view). */
export const getIsAdminView = () => Boolean(adminSessionToken) && adminViewMode !== 'anggota';

/** Whether the UI should display Super Admin controls in the active view. */
export const getIsSuperAdminView = () => getIsSuperAdmin() && getIsAdminView();

export const getAdminRole = () => adminRole;

/** Set the admin role. */
export const setAdminRole = (role: string) => {
  adminRole = role || '';
  persistSessionField(ADMIN_ROLE_KEY, adminRole);
};

export const getAdminEmail = () => adminUserEmail;

/** Set the admin email. */
export const setAdminEmail = (email: string) => {
  adminUserEmail = email || '';
  persistSessionField(ADMIN_EMAIL_KEY, adminUserEmail);
};

/** Drop the admin session. Full logout also forgets every member session. */
export const clearAdminSession = ({ preserveGroupSessions = false } = {}) => {
  setAdminSession('');
  setAdminRole('');
  setAdminEmail('');
  setAdminViewMode('admin');
  if (!preserveGroupSessions) clearAllGroupSessions();
};

/** The token to present for a request against a group.
 *
 * Reads use the group's own token when present (least authority); writes use the
 * admin token, which covers every group for a superadmin and the admin's own
 * group otherwise. */
export const resolveSessionToken = (gid: string, needsWrite: boolean = false): string => {
  if (needsWrite) return adminSessionToken;
  return getGroupSession(gid) || adminSessionToken;
};

/* ── Current view state ────────────────────────────────────────── */

export let currentRekapYear = String(billingPeriod().year);
export let currentHistoryFilter = 'semua';

export const setCurrentRekapYear = (y: string | number) => { currentRekapYear = y.toString(); };
export const setCurrentHistoryFilter = (f: string) => { currentHistoryFilter = f; };

/* ── Chart instances ───────────────────────────────────────────── */

export let cashFlowChart: unknown = null;
export let expenseChart: unknown = null;
export let arrearsRankChart: unknown = null;
export const setCashFlowChart = (c: unknown) => { cashFlowChart = c; };
export const setExpenseChart = (c: unknown) => { expenseChart = c; };
export const setArrearsRankChart = (c: unknown) => { arrearsRankChart = c; };
export const getCashFlowChart = () => cashFlowChart;
export const getExpenseChart = () => expenseChart;
export const getArrearsRankChart = () => arrearsRankChart;
