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

/** Google Sheets database (admin backup view) */
export const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1_cvppK9zmuXXQ9oZcH66zwOzwCYWJ_nP411M9W09zGo/edit';

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

/** Avatar gradient presets for member cards */
export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
];

/** Chart color palette for expense breakdown */
export const CHART_COLORS = [
  '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#3b82f6'
];

/** localStorage keys */
export const CACHE_KEY = 'finkas_cache';
export const THEME_KEY = 'theme';
export const ADMIN_PWD_KEY = 'finkas_admin_pwd';
