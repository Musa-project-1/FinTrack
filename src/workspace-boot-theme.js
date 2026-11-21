/* Apply the stored canvas and palette before the dashboard can be painted. */
(() => {
  const { body } = document;
  try {
    const theme = localStorage.getItem('theme');
    const palette = localStorage.getItem('finkas_palette');
    const canvas = localStorage.getItem('finkas_bg_texture');
    const legacyCanvas = { dots: 'aurora', grid: 'paper', solid: 'clean' };
    const dark = theme === 'dark' ||
      (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    body.classList.toggle('dark-mode', dark);
    if (['terracotta', 'cobalt', 'charcoal', 'indigo'].includes(palette)) body.dataset.palette = palette;
    if (['aurora', 'topo', 'paper', 'clean'].includes(canvas)) body.dataset.canvas = canvas;
    else if (Object.hasOwn(legacyCanvas, canvas)) body.dataset.canvas = legacyCanvas[canvas];
    if (!localStorage.getItem('finkas_active_group')) body.dataset.workspaceState = 'idle';
  } catch {
    // The HTML defaults remain usable when browser storage is unavailable.
  }
})();
