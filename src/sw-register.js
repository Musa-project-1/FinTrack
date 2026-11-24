if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js?v=324', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update();
      })
      .catch((err) => console.warn('SW registration failed:', err));
  });
}
