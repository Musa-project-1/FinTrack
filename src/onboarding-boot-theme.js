/* Apply saved theme before first paint (CSP-clean, defaults to light). */
(() => {
  try {
    const raw = localStorage.getItem('theme') ?? localStorage.getItem('finkas-hybrid-theme');
    const dark = raw === 'dark' ||
      (raw === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (_) {
    document.documentElement.dataset.theme = 'light';
  }
})();
