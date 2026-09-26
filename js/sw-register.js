if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js?v=132', { updateViaCache: 'none' })
      .then(reg => {
        console.log('Service Worker Registered');
        reg.update();
      })
      .catch(err => console.log('SW Registration Failed', err));
  });
}
