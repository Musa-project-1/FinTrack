/**
 * @module api-scope
 * Multi-grup tahap 3: helper scoping jalur Firestore per grup + audit log.
 * Grup 'utama' = koleksi top-level (kompatibel data lama pra-migrasi).
 * Grup lain = sub-koleksi groups/{gid}/... (isolasi penuh).
 */

import { FIREBASE_CONFIG, DEFAULT_GROUP_ID } from './config.js';
import { getActiveGroupId } from './state.js';
import { toFirestoreFields } from './utils.js';

const PROJECT_ID = FIREBASE_CONFIG.projectId;
export { PROJECT_ID };
export const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Grup pemilik payload; fallback ke grup aktif.
 * @param {object} payload
 * @returns {string}
 */
export const resolveGroupId = (payload) => (payload && payload.groupId) || getActiveGroupId() || DEFAULT_GROUP_ID;

/**
 * Path koleksi scoped grup (tahap 5: seragam — Grup Utama pun sub-koleksi).
 * @param {string} col
 * @param {string} gid
 * @returns {string}
 */
export const scopedCol = (col, gid) => `groups/${gid}/${col}`;

/**
 * URL dokumen scoped grup.
 * @param {string} col
 * @param {string} id
 * @param {string} gid
 * @returns {string}
 */
export const scopedDoc = (col, id, gid) => `${FIRESTORE_BASE}/${scopedCol(col, gid)}/${id}`;

/**
 * Path dokumen settings scoped grup (bulan libur per grup, seragam tahap 5).
 * @param {string} gid
 * @returns {string}
 */
export const scopedSettingsPath = (gid) => `groups/${gid}/settings/app_config`;

/**
 * Log administrative activity to grup-scoped audit_log collection.
 * @param {string} aksi - Activity tag
 * @param {string} detail - Description
 */
export const logAuditEvent = (aksi, detail) => {
  const idLog = 'LOG-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const doc = { ID_Log: idLog, Timestamp: new Date().toISOString(), Aksi: aksi, Detail: detail || '' };
  const gid = getActiveGroupId() || DEFAULT_GROUP_ID;
  fetch(scopedDoc('audit_log', idLog, gid), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(doc) })
  }).catch(() => {});
};
