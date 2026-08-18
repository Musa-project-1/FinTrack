/**
 * @module api
 * All HTTP communication with the Google Apps Script backend.
 */

import { GAS_URL } from './config.js';
import { getAdminPassword } from './state.js';

/**
 * Send a POST payload to the GAS backend.
 * @param {object} payload - The action + data to send.
 * @returns {Promise<{status: boolean, message: string, data: object|null}>|null}
 */
export const postToBackend = async (payload) => {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: JSON.stringify(payload) })
    });
    return await response.json();
  } catch (e) {
    return null;
  }
};

/**
 * Send a POST that includes the admin password hash for auth.
 * @param {object} payload
 * @returns {Promise<{status: boolean, message: string, data: object|null}>|null}
 */
export const sendAdminPayload = async (payload) => {
  return await postToBackend({ ...payload, adminPassword: getAdminPassword() });
};

/**
 * Fetch initial data (anggota, kategori, transaksi, settings).
 * @returns {Promise<{status: boolean, data: object, message: string}|null>}
 */
export const fetchInitialData = async () => {
  try {
    const response = await fetch(`${GAS_URL}?action=getDataAwal`);
    return await response.json();
  } catch (error) {
    return null;
  }
};

/**
 * Login admin with plaintext password (client hashes it, backend validates).
 * @param {string} pwd - Plaintext password entered by user.
 * @returns {Promise<{status: boolean, message: string, data: object|null}>|null}
 */
export const loginAdminApi = async (pwd) => {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        data: JSON.stringify({ action: 'loginAdmin', password: pwd })
      })
    });
    return await response.json();
  } catch (error) {
    return null;
  }
};

/**
 * Check if admin session is currently active on server.
 * @returns {Promise<{status: boolean, data: {isAdmin: boolean}}|null>}
 */
export const checkAdminSessionApi = async () => {
  return await postToBackend({ action: 'checkAdminSession' });
};

/**
 * Logout admin session on server.
 * @returns {Promise<{status: boolean}|null>}
 */
export const logoutAdminApi = async () => {
  return await postToBackend({ action: 'logoutAdmin' });
};
