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
import { queueOfflinePayload, isRetryableServerError } from './offline.js';
import { getActiveGroupId } from './state.js';

/**
 * Generate a client operation ID with at least 128 bits of cryptographic entropy.
 * Format: 'OP-' followed by 32 hexadecimal characters (16 random bytes).
 *
 * @param {string} [prefix='OP']
 * @returns {string} E.g. 'OP-3f8a1c9e...'
 */
export const generateOperationId = (prefix = 'OP') => {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${prefix}-${hex}`;
    }
    if (typeof crypto.randomUUID === 'function') {
      const uuid = crypto.randomUUID().replace(/-/g, '');
      return `${prefix}-${uuid}`;
    }
  }
  throw new Error('Lingkungan eksekusi tidak menyediakan CSPRNG ber-entropi tinggi (128-bit) yang aman.');
};

/**
 * Generate a standardized temporary ID for optimistic rows before server confirmation.
 *
 * @param {string} [prefix='TRX'] Entity prefix (e.g. 'TRX', 'ANGGOTA', 'KAT').
 * @returns {string} E.g. 'TRX-TEMP-A1B2C3D4'
 */
export const generateTempId = (prefix = 'TRX') => {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return `${prefix}-TEMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return `${prefix}-TEMP-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    }
  }
  throw new Error('Lingkungan eksekusi tidak menyediakan CSPRNG yang aman.');
};

/**
 * Deliver a mutation payload to the backend, falling back to the offline
 * IndexedDB queue if offline or if the backend request fails to deliver.
 *
 * @param {object} payload Must carry an 'action' property.
 * @returns {Promise<{delivered: boolean, result: object|null}>}
 */
export const stampMutation = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  const groupId = payload.groupId || (typeof getActiveGroupId === 'function' ? getActiveGroupId() : null);
  const operationId = payload.operationId || generateOperationId();
  const stamped = {
    ...payload,
    ...(groupId ? { groupId } : {}),
    operationId
  };
  if (stamped.dataForm && typeof stamped.dataForm === 'object') {
    stamped.dataForm = {
      ...stamped.dataForm,
      operationId
    };
  }
  return stamped;
};

export const deliverMutation = async (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { delivered: false, result: null };
  }

  // Synchronously stamp group and operation ID before any async gap
  const stamped = stampMutation(payload);

  if (!isOnline()) {
    await queueOfflinePayload(stamped);
    return { delivered: false, result: null };
  }

  const result = await postToBackend(stamped);
  if (!result || isRetryableServerError(result)) {
    await queueOfflinePayload(stamped);
    return { delivered: false, result };
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
