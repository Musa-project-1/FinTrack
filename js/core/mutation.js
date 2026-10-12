/**
 * @module mutation
 * Unified mutation pipeline and optimistic ID handling for Finkas.
 *
 * Provides a single deep interface for delivering mutations either online
 * through the API gateway or safely queueing into IndexedDB when offline or
 * unreachable.
 */

import { isOnline } from './utils.js';
import { postToBackend } from './api.js';
import { queueOfflinePayload } from './offline.js';

/**
 * Generate a standardized temporary ID for optimistic rows before server confirmation.
 *
 * @param {string} [prefix='TRX'] Entity prefix (e.g. 'TRX', 'ANGGOTA', 'KAT').
 * @returns {string} E.g. 'TRX-TEMP-A1B2C3D4'
 */
export const generateTempId = (prefix = 'TRX') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-TEMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return `${prefix}-TEMP-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }
  return `${prefix}-TEMP-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
};

/**
 * Deliver a mutation payload to the backend, falling back to the offline
 * IndexedDB queue if offline or if the backend request fails to deliver.
 *
 * @param {object} payload Must carry an 'action' property.
 * @returns {Promise<{delivered: boolean, result: object|null}>}
 */
export const deliverMutation = async (payload) => {
  if (!isOnline()) {
    await queueOfflinePayload(payload);
    return { delivered: false, result: null };
  }

  const result = await postToBackend(payload);
  if (!result) {
    await queueOfflinePayload(payload);
    return { delivered: false, result: null };
  }

  return { delivered: true, result };
};

/**
 * Dispatch an application refresh request event across modules.
 */
export const requestAppRefresh = () => {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('finkas:request-refresh'));
  }
};
