/**
 * @module config
 * Centralized configuration for Finkas.
 */

/** Firebase Configuration */
export const FIREBASE_CONFIG = {
  projectId: "finkas-kas",
  appId: "1:837369279315:web:82a31208be2afc179ae7a6",
  storageBucket: "finkas-kas.firebasestorage.app",
  apiKey: "AIzaSy...l3z8",
  authDomain: "finkas-kas.firebaseapp.com",
  messagingSenderId: "837369279315"
};

/** Indonesian month names (0-indexed: namaBulan[0] = "Januari") */
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

/** localStorage keys */
export const CACHE_KEY = 'finkas_cache';
export const THEME_KEY = 'theme';
export const ADMIN_PWD_KEY = 'finkas_admin_pwd';
export const SUPERADMIN_KEY = 'finkas_is_superadmin';
export const ADMIN_ROLE_KEY = 'finkas_admin_role';
export const ADMIN_EMAIL_KEY = 'finkas_admin_email';
export const HEADER_STATS_KEY = 'finkas_header_stats';
export const ACTIVE_GROUP_KEY = 'finkas_active_group';
/** ID grup bawaan untuk data lama sebelum multi-grup (fallback bila kosong). */
export const DEFAULT_GROUP_ID = 'utama';
export const DEFAULT_GROUP_NAME = 'Grup Utama';

/** Google OAuth Web Client ID */
export const GOOGLE_CLIENT_ID = '837369279315-f8s1pp1c16gtoili3104bn5qv9nd0385.apps.googleusercontent.com';

/** Google Analytics 4 Measurement ID (kosongkan jika tanpa analitik) */
export const GA_MEASUREMENT_ID = '';
export const GA_ID_KEY = 'finkas_ga_id';

