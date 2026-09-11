/**
 * @module state
 * Centralized application state with cache persistence.
 */

import { CACHE_KEY, ADMIN_PWD_KEY, ACTIVE_GROUP_KEY, DEFAULT_GROUP_ID } from './config.js';

/** @typedef {{ anggota: Array, kategori: Array, transaksi: Array, skippedMonths: string[] }} AppState */

/** @type {AppState} */
const state = {
  anggota: [],
  kategori: [],
  transaksi: [],
  skippedMonths: []
};

/**
 * Get a read-only reference to the application state.
 * @returns {AppState}
 */
export const getState = () => state;

/**
 * Replace the full application state (e.g. from cache).
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

/**
 * Save current state to localStorage (per grup aktif — cache grup A
 * tidak terbaca di grup B).
 */
export const saveCache = () => {
  localStorage.setItem(`${CACHE_KEY}:${getActiveGroupId()}`, JSON.stringify(state));
};

/**
 * Load state from localStorage (cache grup aktif). Returns true if found.
 * @returns {boolean}
 */
export const loadCache = () => {
  const cached = localStorage.getItem(`${CACHE_KEY}:${getActiveGroupId()}`)
    // Sekali migrasi: cache lama tanpa sufiks grup milik Grup Utama.
    || (getActiveGroupId() === 'utama' ? localStorage.getItem(CACHE_KEY) : null);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      setState(parsed);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
};

/* ── Active group (multi-grup tahap 1: pilih + ingat) ─────────────── */

/** @type {string} ID grup aktif, tersimpan di localStorage. */
let activeGroupId = localStorage.getItem(ACTIVE_GROUP_KEY) || '';

/** @type {Array} Daftar grup yang tersedia. */
let groups = [];

/**
 * Get ID grup aktif. Fallback ke Grup Utama bila belum pernah pilih
 * (misal user lama yang localStorage-nya format sebelum multi-grup).
 * @returns {string}
 */
export const getActiveGroupId = () => activeGroupId || DEFAULT_GROUP_ID;

/**
 * Set grup aktif dan ingat di localStorage.
 * @param {string} id
 */
export const setActiveGroupId = (id) => {
  activeGroupId = id || '';
  if (activeGroupId) localStorage.setItem(ACTIVE_GROUP_KEY, activeGroupId);
  else localStorage.removeItem(ACTIVE_GROUP_KEY);
};

/**
 * Get daftar grup.
 * @returns {Array}
 */
export const getGroups = () => groups;

/**
 * Set daftar grup.
 * @param {Array} list
 */
export const setGroups = (list) => { groups = Array.isArray(list) ? list : []; };

/* ── Admin password (client-side session) ──────────────────────── */

/** @type {string} The SHA-256 hash of the admin password, stored in localStorage. */
let adminPassword = localStorage.getItem(ADMIN_PWD_KEY) || '';

/** @type {boolean} Whether the current session is admin. */
let isAdminSession = false;

/**
 * Get the current admin password hash.
 * @returns {string}
 */
export const getAdminPassword = () => adminPassword;

/**
 * Set the admin password hash in state and persist to localStorage.
 * @param {string} hash
 */
export const setAdminPassword = (hash) => {
  adminPassword = hash;
  localStorage.setItem(ADMIN_PWD_KEY, hash);
};

/**
 * Clear the admin password hash from state and localStorage.
 */
export const clearAdminPassword = () => {
  adminPassword = '';
  localStorage.removeItem(ADMIN_PWD_KEY);
};

/**
 * Get the current admin session status.
 * @returns {boolean}
 */
export const getIsAdminSession = () => isAdminSession;

/**
 * Set the admin session status.
 * @param {boolean} val
 */
export const setIsAdminSession = (val) => {
  isAdminSession = !!val;
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
export const setCashFlowChart = (c) => { cashFlowChart = c; };
export const setExpenseChart = (c) => { expenseChart = c; };
export const getCashFlowChart = () => cashFlowChart;
export const getExpenseChart = () => expenseChart;
