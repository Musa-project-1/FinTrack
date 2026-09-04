/**
 * @module state
 * Centralized application state with cache persistence.
 */

import { CACHE_KEY, ADMIN_PWD_KEY } from './config.js';

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
 * Save current state to localStorage.
 */
export const saveCache = () => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state));
};

/**
 * Load state from localStorage. Returns true if cache was found.
 * @returns {boolean}
 */
export const loadCache = () => {
  const cached = localStorage.getItem(CACHE_KEY);
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
