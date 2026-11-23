<style>
  :global {
    /* === BASE — canvas, scrollbars, focus, brand ===
       No dot pattern (a soft-UI tell) and no blurred card elevation: a card is a
       hairline plus one surface contrast step. */

    html {
      scrollbar-gutter: stable;
      -webkit-tap-highlight-color: transparent;
      -webkit-text-size-adjust: 100%;
    }

    button,
    [role="button"],
    .btn,
    .chip-btn,
    .mobile-nav-btn,
    .matrix-dues-button,
    .mini-month-pill {
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }

    body {
      background-color: var(--bg-color);
      background-image:
        radial-gradient(circle at 10% 8%, rgba(0, 82, 255, 0.14), transparent 40%),
        radial-gradient(circle at 90% 12%, rgba(14, 165, 233, 0.12), transparent 38%),
        radial-gradient(circle at 50% 85%, rgba(59, 130, 246, 0.08), transparent 45%);
      background-attachment: fixed;
      color: var(--text-main);
      padding: 20px 24px 40px;
      min-height: 100vh;
      overflow-x: hidden;
      overscroll-behavior-y: none;
    }

    body.dark-mode {
      background-image:
        radial-gradient(circle at 10% 8%, rgba(37, 99, 235, 0.22), transparent 42%),
        radial-gradient(circle at 90% 12%, rgba(14, 165, 233, 0.15), transparent 38%),
        radial-gradient(circle at 50% 85%, rgba(29, 78, 216, 0.14), transparent 45%);
    }

    /* === FOCUS — one sharp accent ring, visible in both themes === */
    :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    button:focus:not(:focus-visible),
    a:focus:not(:focus-visible) {
      outline: none;
    }

    ::selection {
      background: var(--accent-tint);
      color: var(--text-main);
    }

    /* === CARDS — frosted glass frame, soft atmospheric elevation === */
    .table-card {
      background: rgba(255, 255, 255, 0.80) !important;
      -webkit-backdrop-filter: blur(22px) saturate(180%);
      backdrop-filter: blur(22px) saturate(180%);
      border: 1px solid var(--border) !important;
    }

    body.dark-mode .table-card {
      background: rgba(14, 23, 42, 0.80) !important;
    }

    /* === MODALS — solid surface. A translucent panel over the dimmed overlay
       reads grey, while its sticky header/footer stack a second translucent
       layer and read white: a false "shadow" band. One opaque surface keeps
       header, body and footer the same tone. === */
    .modal-content {
      background: var(--surface) !important;
      border: 1px solid var(--border) !important;
    }

    .table-card {
      box-shadow: var(--shadow-card) !important;
    }

    /* A modal genuinely floats, so it is the one surface allowed a shadow.
       Never an inset glow. */
    .modal-content {
      box-shadow: var(--shadow-pop) !important;
    }

    body.modal-open {
      overflow: hidden;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    /* === SCROLLBARS — standards-first, palette-harmonized, accessible === */
    * {
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb) transparent;
    }

    /* Legacy fallback for browsers without scrollbar-color */
    @supports not (scrollbar-color: auto) {
      * {
        scrollbar-width: auto;
      }

      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track,
      ::-webkit-scrollbar-corner {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb);
        border-radius: var(--r-pill);
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      ::-webkit-scrollbar-thumb:hover {
        background-color: var(--scrollbar-thumb-hover, var(--scrollbar-thumb));
        border-radius: var(--r-pill);
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      ::-webkit-scrollbar-thumb:active {
        background-color: var(--accent);
      }
    }

    /* Keep the mobile canvas and its bottom sheets the same width. */
    @media (max-width: 768px) {
      html { scrollbar-width: none; }
    }

    /* === SCROLLABILITY AFFORDANCE HINTS === */
    @property --fade-start {
      syntax: "<length>";
      inherits: false;
      initial-value: 0px;
    }

    @property --fade-end {
      syntax: "<length>";
      inherits: false;
      initial-value: 0px;
    }

    @keyframes reveal-fade-start {
      to {
        --fade-start: var(--fade-size);
      }
    }

    @keyframes hide-fade-end {
      from {
        --fade-end: var(--fade-size);
      }
    }

    @keyframes scroll-edge-shadow {
      to {
        opacity: 1;
      }
    }

    .hybrid-settings-body,
    .command-hub-body,
    .groups-sheet-body {
      --scroll-pad-top: 16px;
      --scroll-pad-bottom: 16px;
      --scroll-pad-x: 18px;
      --scroll-gap: 16px;
      container-type: scroll-state;
    }

    #modal-menu .command-hub-body {
      --scroll-pad-top: 14px;
      --scroll-pad-bottom: 18px;
      --scroll-pad-x: 18px;
      --scroll-gap: 16px;
    }

    #modal-groups .groups-sheet-body {
      --scroll-pad-top: 16px;
      --scroll-pad-bottom: 18px;
      --scroll-pad-x: 20px;
      --scroll-gap: 14px;
    }

    @media (max-width: 768px) {
      .hybrid-settings-body {
        --scroll-pad-x: 12px;
      }

      #modal-menu .command-hub-body {
        --scroll-pad-top: 12px;
        --scroll-pad-bottom: 16px;
        --scroll-pad-x: 14px;
      }

      #modal-groups .groups-sheet-body {
        --scroll-pad-top: 14px;
        --scroll-pad-bottom: 16px;
        --scroll-pad-x: 16px;
      }
    }

    .hybrid-settings-body::before,
    .hybrid-settings-body::after,
    .command-hub-body::before,
    .command-hub-body::after,
    .groups-sheet-body::before,
    .groups-sheet-body::after {
      content: "";
      display: block;
      flex-shrink: 0;
      position: sticky;
      block-size: 12px;
      z-index: 2;
      pointer-events: none;
      opacity: 0;
      transition: opacity 180ms ease;
      margin-inline: calc(-1 * var(--scroll-pad-x, 18px));
    }

    .hybrid-settings-body::before,
    .command-hub-body::before,
    .groups-sheet-body::before {
      inset-block-start: 0;
      margin-block-start: calc(-1 * var(--scroll-pad-top, 16px));
      margin-block-end: calc(var(--scroll-pad-top, 16px) - 12px - var(--scroll-gap, 16px));
      background: radial-gradient(farthest-side at 50% 0, var(--scrollbar-edge-shadow, rgb(0 0 0 / 0.14)), transparent);
    }

    .hybrid-settings-body::after,
    .command-hub-body::after,
    .groups-sheet-body::after {
      inset-block-end: 0;
      margin-block-start: calc(var(--scroll-pad-bottom, 16px) - 12px - var(--scroll-gap, 16px));
      margin-block-end: calc(-1 * var(--scroll-pad-bottom, 16px));
      background: radial-gradient(farthest-side at 50% 100%, var(--scrollbar-edge-shadow, rgb(0 0 0 / 0.14)), transparent);
    }

    @container scroll-state(scrollable: block-start) {
      .hybrid-settings-body::before,
      .command-hub-body::before,
      .groups-sheet-body::before {
        opacity: 1;
      }
    }

    @container scroll-state(scrollable: block-end) {
      .hybrid-settings-body::after,
      .command-hub-body::after,
      .groups-sheet-body::after {
        opacity: 1;
      }
    }

    @supports not (container-type: scroll-state) {
      .hybrid-settings-body::before,
      .hybrid-settings-body::after,
      .command-hub-body::before,
      .command-hub-body::after,
      .groups-sheet-body::before,
      .groups-sheet-body::after {
        animation: scroll-edge-shadow linear both;
        animation-timeline: scroll();
      }

      .hybrid-settings-body::before,
      .command-hub-body::before,
      .groups-sheet-body::before {
        animation-range: 0 2rem;
      }

      .hybrid-settings-body::after,
      .command-hub-body::after,
      .groups-sheet-body::after {
        animation-direction: reverse;
        animation-range: calc(100% - 2rem) 100%;
      }
    }

    /* === BRAND === */
    .brand-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: inherit;
    }

    .brand-logo-img {
      width: 40px;
      height: 40px;
      border-radius: var(--r-md);
      object-fit: cover;
    }

    .brand-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 600;
      letter-spacing: var(--tracking-tight);
      color: var(--text-main);
    }

    .brand-logo-light { display: block; }
    .brand-logo-dark { display: none; }

    body.dark-mode .brand-logo-light { display: none !important; }
    body.dark-mode .brand-logo-dark { display: block !important; }

    /* Fallback monogram tile when no logo image is present. */
    .brand-icon-box {
      background: var(--surface-2);
      color: var(--accent);
      border: 1px solid var(--border);
      width: 40px;
      height: 40px;
      padding: 8px;
      border-radius: var(--r-md);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: none;
    }

    /* === VIEWPORT HELPERS === */
    .desktop-only { display: flex !important; }
    span.desktop-only { display: inline !important; }
    button.desktop-only { display: inline-flex !important; }
    .mobile-only { display: none !important; }

    @media (max-width: 768px) {
      .desktop-only { display: none !important; }
      .mobile-only { display: flex !important; }
    }

    /* === STATUS TEXT === */
    .status-text { display: inline; }

    /* === PRIVACY MASK (SENSOR SALDO) === */
    body.privacy-mode .sensitive-amt {
      filter: blur(7px);
      user-select: none;
    }

    .sensitive-amt {
      transition: filter 220ms var(--hybrid-ease-out);
    }

    /* === DENSITY COMPACT (TAMPILAN RINGKAS) === */
    body.density-compact .dashboard { gap: 10px; margin-bottom: 18px; }
    body.density-compact .card { padding: 12px 14px; gap: 10px; border-radius: var(--r-md); }
    body.density-compact .card-icon { width: 36px; height: 36px; font-size: 18px; border-radius: var(--r-sm); }
    body.density-compact .nominal-val { font-size: 20px; }
    body.density-compact td,
    body.density-compact th { padding: 8px 10px; font-size: 13.5px; }
    body.density-compact .table-matriks td,
    body.density-compact .table-matriks th { padding: 6px 8px; }
    body.density-compact .master-row { padding: 8px 12px; }

    /* === NUMBER FONT VARIANT (MONO VS SANS) === */
    body.font-mono-numbers .nominal-val,
    body.font-mono-numbers .header-stat-val,
    body.font-mono-numbers .td-nominal-col,
    body.font-mono-numbers .stat-hero-number,
    body.font-mono-numbers #rw-masuk,
    body.font-mono-numbers #rw-keluar,
    body.font-mono-numbers .profile-trx-nominal {
      font-family: var(--font-mono) !important;
      letter-spacing: -0.02em;
    }

    /* === CANVAS BACKGROUND TEXTURE === */
    body.bg-texture-dots {
      background-image: radial-gradient(rgba(74, 106, 128, 0.12) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    body.dark-mode.bg-texture-dots {
      background-image: radial-gradient(rgba(56, 189, 248, 0.10) 1px, transparent 1px);
    }

    body.bg-texture-grid {
      background-image: 
        linear-gradient(to right, rgba(74, 106, 128, 0.08) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(74, 106, 128, 0.08) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    body.dark-mode.bg-texture-grid {
      background-image: 
        linear-gradient(to right, rgba(56, 189, 248, 0.06) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(56, 189, 248, 0.06) 1px, transparent 1px);
    }

    body.bg-texture-solid {
      background-image: none !important;
    }

    /* === PROGRESS SUMMARY FORMAT === */
    body.progress-format-ratio .dues-mini-strip {
      display: none !important;
    }
    body.progress-format-ratio .iuran-progress-subtext {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--accent-strong);
    }

    /* === REDUCED MOTION (HORMATI PREFERENSI SISTEM) ===
       Aktif hanya bila user menyalakan "Kurangi Gerakan" di OS/HP.
       Menetralkan animasi berulang (pulse status, sync spinner, toast) &
       transisi masuk agar tidak memicu mabuk gerak/vertigo. User biasa tak terpengaruh. */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      .btn:active,
      .btn-icon:active,
      .btn-wa-reminder:active,
      .btn-wa-reminder-icon:active,
      .btn-sync-rekap:active,
      .btn-load-more:hover,
      .btn-load-more:active,
      .chip-btn:active,
      .cdrop-btn:active,
      .mpick-field:active,
      .iuran-month-item:active,
      .bottom-nav-item:active i {
        transform: none !important;
      }

      .pin-row.is-error {
        animation: none !important;
      }

      /* Modal overlay & dropdown: kill the visibility delay so close is instant */
      .modal-overlay,
      .cdrop-list {
        transition-delay: 0s !important;
      }

      .hybrid-settings-body::before,
      .hybrid-settings-body::after,
      .command-hub-body::before,
      .command-hub-body::after,
      .groups-sheet-body::before,
      .groups-sheet-body::after {
        transition: none;
      }
    }
  }
</style>
