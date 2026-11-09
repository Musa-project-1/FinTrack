/**
 * @module core/analytics
 * Lightweight, privacy-first event tracking & analytics abstraction.
 */

let isInitialized = false;

/**
 * Inisialisasi Google Analytics 4 secara dinamis jika measurement ID diberikan.
 * @param {string} [measurementId]
 */
export const initAnalytics = (measurementId) => {
  if (isInitialized || !measurementId || typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, { anonymize_ip: true });

  isInitialized = true;
};

/**
 * Lacak interaksi pengguna (salin WA, ekspor data, dsb.) secara aman tanpa bocor data pribadi.
 * @param {string} eventName
 * @param {Record<string, any>} [params]
 */
export const trackEvent = (eventName, params = {}) => {
  if (typeof window === 'undefined') return;

  // 1. Kirim ke GA4 jika terpasang
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }

  // 2. Dispatch custom event lokal untuk debugging atau integrasi internal
  window.dispatchEvent(new CustomEvent('finkas:event', {
    detail: { event: eventName, params, timestamp: Date.now() }
  }));
};
