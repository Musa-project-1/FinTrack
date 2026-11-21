export const getDuesDisplayStatus = (month) => {
  if (!month.owed) return 'Libur';
  if (month.status === 'paid') return 'Lunas';
  if (month.status === 'partial') return 'Sebagian';
  return month.due ? 'Belum' : 'Nanti';
};

export const STAMP_STYLES = Object.freeze(['seal', 'rosette', 'shield']);
let currentStyle;

export const getActiveIndicatorStyle = () => {
  if (currentStyle) return currentStyle;
  let saved;
  try { saved = localStorage.getItem('finkas_indicator_style'); }
  catch {}
  if (STAMP_STYLES.includes(saved)) return saved;
  return saved === 'star' || saved === 'round-star' ? 'rosette' : 'seal';
};

export const saveIndicatorStyle = (style) => {
  if (!STAMP_STYLES.includes(style)) return false;
  currentStyle = style;
  try { localStorage.setItem('finkas_indicator_style', style); }
  catch {}
  return true;
};

export const STAMP_META = Object.freeze({
  seal: { label: 'Segel Bulat', sub: 'Segel bundar kontras tinggi dan bersih' },
  rosette: { label: 'Lencana Roset', sub: 'Lencana 12 kelopak khas verifikasi resmi' },
  shield: { label: 'Perisai Sah', sub: 'Perisai arsip digital bergaya modern' }
});

const rosettePathAt = (cx, cy, radius, controlRadius, petals = 12) => {
  const point = (angle, r) => `${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`;
  const step = Math.PI / petals;
  const curves = Array.from({ length: petals }, (_, index) =>
    `Q ${point((index * 2 + 1) * step, controlRadius)} ${point((index + 1) * 2 * step, radius)}`);
  return `M ${point(0, radius)} ${curves.join(' ')} Z`;
};

const rosettePath = (radius, controlRadius) => rosettePathAt(20, 20, radius, controlRadius, 12);

const miniShapes = Object.freeze({
  seal: '<circle class="mini-seal-bg" cx="9" cy="9" r="7.8"/><path class="mini-seal-check" d="M5.5 9.2 L7.9 11.6 L12.7 6.5"/>',
  rosette: `<path class="mini-seal-bg" d="${rosettePathAt(9, 9, 6.8, 8.6, 8)}"/><path class="mini-seal-check" d="M5.6 9.2 L7.9 11.5 L12.6 6.6"/>`,
  shield: '<path class="mini-seal-bg" d="M9 1.4 L16 4.2 V9.1 C16 13.3 13 15.9 9 17.1 C5 15.9 2 13.3 2 9.1 V4.2 Z"/><path class="mini-seal-check" d="M5.7 9.1 L8 11.4 L12.5 6.6"/>'
});

export const renderMiniStamp = (style = getActiveIndicatorStyle()) => {
  const validStyle = STAMP_STYLES.includes(style) ? style : 'seal';
  return `<svg class="mini-stamp-ico" viewBox="0 0 18 18" aria-hidden="true" focusable="false">${miniShapes[validStyle]}</svg>`;
};

export const renderLunasHtml = (isNewlyPaid = false, style = getActiveIndicatorStyle()) => {
  const validStyle = STAMP_STYLES.includes(style) ? style : 'seal';
  return `
  <span class="dues-seal${isNewlyPaid ? ' is-newly-paid' : ''}" data-stamp="${validStyle}" data-status="Lunas">
    ${renderMiniStamp(validStyle)}
    <span class="dues-seal-label">Lunas</span>
    ${isNewlyPaid ? '<span class="stamp-ring" aria-hidden="true"></span>' : ''}
  </span>`;
};

const passbookEmblems = {
  seal: '<circle class="seal-halo" cx="20" cy="20" r="18"/><circle class="seal-track-ring" cx="20" cy="20" r="15"/><circle class="seal-core" cx="20" cy="20" r="12.2"/><path class="seal-check" d="M14.4 20.2 L18.2 24 L26 15.8"/>',
  rosette: `<path class="seal-halo" d="${rosettePath(15.8, 19)}"/><path class="seal-core" d="${rosettePath(12.6, 15.5)}"/><circle class="seal-core-ring" cx="20" cy="20" r="9.6"/><path class="seal-check" d="M14.6 20.2 L18.2 23.8 L25.6 16"/>`,
  shield: '<path class="seal-halo" d="M20 2.5 L34.5 8 V18.8 C34.5 28.2 28.3 34.2 20 37.2 C11.7 34.2 5.5 28.2 5.5 18.8 V8 Z"/><path class="seal-core" d="M20 5.8 L31.2 10.1 V18.6 C31.2 26 26.3 30.9 20 33.4 C13.7 30.9 8.8 26 8.8 18.6 V10.1 Z"/><path class="seal-check" d="M14.6 19.8 L18.3 23.5 L25.8 15.6"/>',
  pending: '<circle class="seal-pending-ring" cx="20" cy="20" r="14"/><path class="seal-pending-plane" d="M14.5 20.5 L25 15 L20.5 25.5 L18.5 21.5 Z"/>',
  upcoming: '<circle class="seal-upcoming-ring" cx="20" cy="20" r="13"/><circle class="seal-upcoming-dot" cx="20" cy="20" r="2.2"/>',
  holiday: '<circle class="seal-holiday-ring" cx="20" cy="20" r="13"/><path class="seal-holiday-bar" d="M15 20 H25"/>',
  unpaid: '<circle class="seal-unpaid-ring" cx="20" cy="20" r="14"/><path class="seal-unpaid-hand" d="M20 13.5 V20 L24 22.4"/>'
};

export const renderPassbookEmblem = (kind, style = getActiveIndicatorStyle()) => `
  <svg class="seal-svg" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    ${kind === 'paid' ? passbookEmblems[style] || passbookEmblems.seal : passbookEmblems[kind]}
  </svg>`;
