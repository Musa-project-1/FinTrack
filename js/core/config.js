/**
 * @module config
 * Centralized configuration for Finkas.
 *
 * The client never holds Firestore credentials: all data access goes through
 * the serverless endpoints declared in `API`, authenticated with a signed
 * session token (see core/state.js).
 */

/** Serverless API endpoints (Vercel functions under /api). */
export const API = {
  DATA: '/api/data',
  LOGIN: '/api/login',
  LOGIN_GOOGLE: '/api/login-google',
  GROUP_ADMIN: '/api/create-group',
  VERIFY_PIN: '/api/verify-group-pin'
};

/** Indonesian month names (0-indexed: NAMA_BULAN[0] = "Januari") */
export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/** IndexedDB constants for offline queue */
export const OFFLINE_DB_NAME = 'finkas-offline-db';
export const OFFLINE_DB_VERSION = 1;
export const OFFLINE_STORE_NAME = 'offline-transactions';

/** Default monthly contribution amount (Rp) */
export const DEFAULT_MONTHLY_FEE = 10000;

/** WhatsApp group reminder date range start */
export const GROUP_START_YEAR = 2025;
export const GROUP_START_MONTH = 11;

/** Chart color palette for expense breakdown */
export const CHART_COLORS = [
  '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#3b82f6'
];

/* ── Storage keys ────────────────────────────────────────────────── */

/** localStorage: per-group data cache. */
export const CACHE_KEY = 'finkas_cache';
export const THEME_KEY = 'theme';
export const HEADER_STATS_KEY = 'finkas_header_stats';
export const ACTIVE_GROUP_KEY = 'finkas_active_group';
export const GA_ID_KEY = 'finkas_ga_id';

/**
 * sessionStorage: bearer session tokens. Scoped to the tab so they disappear
 * when it closes, instead of persisting indefinitely in localStorage.
 */
export const ADMIN_SESSION_KEY = 'finkas_admin_session';
export const ADMIN_ROLE_KEY = 'finkas_admin_role';
export const ADMIN_EMAIL_KEY = 'finkas_admin_email';
export const GROUP_SESSIONS_KEY = 'finkas_group_sessions';

/** ID grup bawaan untuk data lama sebelum multi-grup (fallback bila kosong). */
export const DEFAULT_GROUP_ID = 'utama';
export const DEFAULT_GROUP_NAME = 'Grup Utama';

/** Google OAuth Web Client ID (public by design). */
export const GOOGLE_CLIENT_ID = '837369279315-f8s1pp1c16gtoili3104bn5qv9nd0385.apps.googleusercontent.com';

/** Google Analytics 4 Measurement ID (kosongkan jika tanpa analitik) */
export const GA_MEASUREMENT_ID = '';
