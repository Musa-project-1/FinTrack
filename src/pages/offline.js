const bindRetry = () => {
  document.querySelector('.btn-retry')?.addEventListener('click', () => {
    window.location.reload();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindRetry, { once: true });
} else {
  bindRetry();
}
