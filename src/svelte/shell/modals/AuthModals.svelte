<!-- 1. Modal Login Admin -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-login" aria-labelledby="modal-login-title">
    <div class="modal-content auth-login-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="hybrid-settings-header auth-sheet-header">
        <div class="auth-header-main">
          <button type="button" class="auth-header-emblem stealth-badge" id="badge-admin-login" data-action="stealth-badge-click" aria-label="Login Pengurus">
            <i class="ph ph-lock-key" aria-hidden="true"></i>
          </button>
          <div class="auth-header-copy">
            <h2 id="modal-login-title">Login Pengurus</h2>
            <p id="modal-login-subtitle">Masuk untuk mengelola pencatatan dan pengaturan kas grup</p>
          </div>
        </div>
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup">
          <i class="ph-bold ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <div class="auth-sheet-body">
        <div class="auth-group-context">
          <div class="auth-group-context-left">
            <span class="auth-context-dot" aria-hidden="true"></span>
            <div class="auth-group-context-meta">
              <span class="auth-context-label">Grup Aktif</span>
              <strong class="auth-context-name" id="auth-login-group-name">Finkas</strong>
            </div>
          </div>
          <span class="auth-role-pill">Akses Pengurus</span>
        </div>

        <form id="form-login-admin" class="auth-modal-form" method="post" aria-labelledby="modal-login-title">
          <div id="auth-login-error" class="auth-inline-alert" role="alert" aria-live="assertive" hidden>
            <i class="ph-fill ph-warning-circle" aria-hidden="true"></i>
            <span id="auth-login-error-text"></span>
          </div>

          <div class="auth-field">
            <div class="auth-label-row">
              <label for="input-admin-email">Email Pengurus</label>
              <span class="auth-field-badge">Opsional</span>
            </div>
            <div class="auth-input-shell">
              <span class="auth-input-icon" aria-hidden="true"><i class="ph ph-envelope-simple"></i></span>
              <input type="email" id="input-admin-email" name="admin-email" class="auth-input" placeholder="admin@finkas.id" autocomplete="username" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="next">
            </div>
          </div>

          <div class="auth-field">
            <div class="auth-label-row">
              <label for="input-admin-pwd">Kata Sandi</label>
              <span class="auth-capslock-pill" id="auth-capslock-hint" hidden>
                <i class="ph-bold ph-arrow-fat-up" aria-hidden="true"></i>
                <span>Caps Lock aktif</span>
              </span>
            </div>
            <div class="auth-input-shell">
              <span class="auth-input-icon" aria-hidden="true"><i class="ph ph-key"></i></span>
              <input type="password" id="input-admin-pwd" name="admin-pwd" class="auth-input auth-pwd-input" placeholder="Masukkan kata sandi..." required autofocus autocomplete="current-password" enterkeyhint="done">
              <button type="button" id="btn-toggle-pwd" class="btn-pwd-peek auth-pwd-toggle" aria-pressed="false" aria-label="Tampilkan kata sandi" aria-controls="input-admin-pwd">
                <i class="ph ph-eye" id="icon-toggle-pwd" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn auth-submit-btn" id="btn-submit-login">
            <i class="ph-bold ph-sign-in" aria-hidden="true"></i>
            <span>Masuk sebagai Pengurus</span>
          </button>
        </form>
      </div>

      <div class="hybrid-settings-footer auth-sheet-footer">
        <div class="auth-footer-trust">
          <i class="ph ph-lock-simple" aria-hidden="true"></i>
          <span>Sesi terenkripsi · Berlaku 12 jam</span>
        </div>
        <button type="button" class="auth-cancel-link" data-action="close-modal">Batal</button>
      </div>
    </div>
  </dialog>

  <!-- 2. Modal Logout Admin Confirmation -->
  <dialog class="modal-overlay hybrid-dialog hybrid-alert-dialog" id="modal-logout" aria-labelledby="modal-logout-title">
    <div class="modal-content modal-sm modal-center-dialog">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="modal-badge-icon slate">
        <i class="ph-bold ph-sign-out"></i>
      </div>
      <h2 id="modal-logout-title">Keluar Sesi Admin?</h2>
      <p>Anda perlu memasukkan password kembali untuk mencatat dan mengedit kas.</p>
      <div class="modal-dialog-actions">
        <button type="button" class="btn btn-outline btn-secondary" data-action="cancel-logout">Batal</button>
        <button type="button" class="btn btn-primary btn-slate-solid" data-action="confirm-logout" id="btn-logout-confirm">Ya, Keluar</button>
      </div>
    </div>
  </dialog>

  <!-- 2b. Modal About -->
  <dialog class="modal-overlay hybrid-dialog" id="modal-about" aria-labelledby="modal-about-title">
    <div class="modal-content about-sheet">
      <div class="hybrid-sheet-handle" aria-hidden="true"><span></span></div>
      <div class="about-hero">
        <button type="button" class="close-modal-btn" data-action="close-modal" aria-label="Tutup">
          <i class="ph-bold ph-x" aria-hidden="true"></i>
        </button>

        <div class="about-logo-frame">
          <img src="icons/icon-192.svg" alt="Logo Finkas" class="about-logo brand-logo-dark">
          <img src="icons/icon-light-192.svg" alt="Logo Finkas" class="about-logo brand-logo-light">
        </div>

        <div class="about-title-row">
          <h2 class="about-name" id="modal-about-title">Finkas</h2>
          <span class="about-ver-pill">v1.0.0</span>
        </div>
        <p class="about-tagline">Pembukuan kas kelompok yang sederhana dan jujur.</p>
      </div>

      <div class="about-body">
        <div class="about-pillars" role="list">
          <span class="about-pillar" role="listitem"><i class="ph ph-eye" aria-hidden="true"></i><span>Transparan</span></span>
          <span class="about-pillar" role="listitem"><i class="ph ph-arrows-clockwise" aria-hidden="true"></i><span>Sinkron Cloud</span></span>
          <span class="about-pillar" role="listitem"><i class="ph ph-wifi-slash" aria-hidden="true"></i><span>Siap Offline</span></span>
        </div>

        <dl class="about-meta">
          <div class="about-meta-row">
            <dt class="about-meta-label"><i class="ph ph-tag" aria-hidden="true"></i><span>Versi</span></dt>
            <dd class="about-meta-val">1.0.0</dd>
          </div>
          <div class="about-meta-row">
            <dt class="about-meta-label"><i class="ph ph-devices" aria-hidden="true"></i><span>Platform</span></dt>
            <dd class="about-meta-val">Progressive Web App</dd>
          </div>
          <div class="about-meta-row">
            <dt class="about-meta-label"><i class="ph ph-cloud-check" aria-hidden="true"></i><span>Backend</span></dt>
            <dd class="about-meta-val">Cloud Firestore</dd>
          </div>
        </dl>

        <p class="about-copy">&copy; 2025 Finkas. Dibuat dengan <i class="ph-fill ph-heart about-heart" aria-hidden="true"></i> untuk pengelolaan kas yang lebih baik.</p>
      </div>

      <div class="hybrid-settings-footer about-sheet-footer">
        <a class="about-footer-link" href="privacy.html">
          <i class="ph ph-shield-check" aria-hidden="true"></i>
          <span>Kebijakan Privasi</span>
          <i class="ph ph-arrow-up-right about-ext-ico" aria-hidden="true"></i>
        </a>
        <button type="button" class="about-close-pill" data-action="close-modal">Tutup</button>
      </div>
    </div>
  </dialog>

<style>
  :global {
    /* === CARDS — dashboard cash summary, header pills, chart cards ===
       One number leads: the balance is set in mono and carries the only accent
       moment on the screen. Inflows and outflows sit in a compact strip beneath. */

    /* === DASHBOARD === */
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
      margin-bottom: 20px;
    }

    /* --- Bento 3-Card Financial Strip (Polarity-Flipped Cobalt Vault + Dual Frosted Flow Cards) --- */
    .cash-summary {
      background: transparent;
      border: none;
      border-radius: 0;
      box-shadow: none;
      overflow: visible;
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .balance-hero {
      padding: 24px 28px;
      background: linear-gradient(135deg, #0045d8 0%, #061b31 100%);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      gap: 10px;
      min-width: 0;
      position: relative;
      overflow: hidden;
    }

    body.dark-mode .balance-hero {
      background: linear-gradient(135deg, #1d4ed8 0%, #0b162c 100%);
      border-color: rgba(96, 165, 250, 0.28);
    }

    .balance-hero .eyebrow {
      color: #dbeafe;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.20);
      padding: 4px 10px;
      border-radius: var(--r-pill);
      font-weight: 600;
      letter-spacing: 0.08em;
    }

    .balance-hero__value {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 2.5rem;
      line-height: 1.08;
      letter-spacing: -0.025em;
      font-variant-numeric: tabular-nums;
      -webkit-font-feature-settings: "tnum" 1;
      font-feature-settings: "tnum" 1;
      color: #ffffff;
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      align-self: stretch;
    }

    body.dark-mode .balance-hero__value {
      color: #ffffff;
    }

    /* --- Flow strip (inflow/outflow) — 2 detached frosted glass cards --- */
    .flow-strip {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      background: transparent;
      border-top: none;
      overflow: visible;
    }

    @media (min-width: 768px) {
      .cash-summary {
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.25fr);
        align-items: stretch;
        gap: 16px;
      }

      .flow-strip {
        border-top: none;
        border-left: none;
        gap: 16px;
      }

      .flow-strip__item {
        justify-content: center;
      }
    }

    .flow-strip__item {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
      padding: 20px 24px;
      min-width: 0;
      background: rgba(255, 255, 255, 0.84);
      -webkit-backdrop-filter: blur(18px) saturate(180%);
      backdrop-filter: blur(18px) saturate(180%);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow-card);
    }

    body.dark-mode .flow-strip__item {
      background: rgba(14, 23, 42, 0.82);
    }

    .flow-strip__item + .flow-strip__item {
      border-left: 1px solid var(--border);
    }

    .flow-strip__value {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }

    .flow-strip__label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: var(--tracking-eyebrow);
      color: var(--text-faint);
    }

    /* Inflow (Masuk) is strictly semantic financial green — independent of UI accent themes. */
    .flow-in .flow-strip__label { color: var(--income-strong); }
    .flow-in .flow-strip__label i { color: var(--income-strong); font-size: 13px; }
    .flow-in .flow-strip__value { color: var(--income-strong); }
    .flow-in .flow-strip__sign { color: var(--income-strong); }

    body.dark-mode .flow-in .flow-strip__label,
    body.dark-mode .flow-in .flow-strip__label i,
    body.dark-mode .flow-in .flow-strip__value,
    body.dark-mode .flow-in .flow-strip__sign {
      color: var(--income);
    }

    .flow-out .flow-strip__label { color: var(--danger); }
    .flow-out .flow-strip__label i { color: var(--danger); font-size: 13px; }
    .flow-out .flow-strip__value { color: var(--danger); }
    .flow-out .flow-strip__sign { color: var(--danger); }

    .flow-strip__sign {
      flex-shrink: 0;
      font-weight: 600;
    }

    /* Deterministic loading placeholders. Two separate things collapse them, and
       both are pinned here:
       1. The .skeleton-* helpers default to a percentage width, which resolves to
          0 inside these content-sized flex items.
       2. The flow-strip placeholders are <span>s — width/height are ignored on an
          inline box, so the bar must be blockified or it renders at zero size.
       Heights are set in `em` so the bar scales with the figure it stands in for. */
    .balance-hero__value .skeleton-title {
      display: block;
      width: 58%;
      min-width: 180px;
      height: 0.6em;
      margin-bottom: 0;
    }

    .flow-strip__value .skeleton-text {
      display: block;
      width: 88px;
      height: 0.85em;
      margin-bottom: 0;
    }

    .flow-out .flow-strip__sign { color: var(--text-muted); }

    /* === HEADER STATS (compact pills) === */
    .brand-name { font-size: 22px; font-weight: 600; letter-spacing: var(--tracking-tight); margin-left: 4px; }

    .header-stats {
      display: none;
      align-items: center;
      gap: var(--sp-2);
    }

    body.header-stats-active .header-stats {
      display: flex;
    }

    body.header-stats-active .dashboard {
      display: none !important;
    }

    .header-stat-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 10px;
      border-radius: var(--r-md);
      background: var(--surface-2);
      border: 1px solid var(--border);
      transition: background var(--t-fast), border-color var(--t-fast);
    }

    .header-stat-pill:hover {
      border-color: var(--border-strong);
    }

    .header-stat-pill i {
      font-size: 15px;
      flex-shrink: 0;
      color: var(--text-muted);
    }

    .header-stat-pill.pill-saldo i { color: var(--secondary); }
    .header-stat-pill.pill-masuk i { color: var(--accent); }
    .header-stat-pill.pill-keluar i { color: var(--danger); }

    .header-stat-content {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .header-stat-label {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: var(--tracking-eyebrow);
      /* Pill surface is --surface-2. Faint ink there is 5.95:1; weight 600 because
         the label is under 10px, where Lighthouse asks for 4.5:1 not 3:1. */
      color: var(--text-faint);
    }

    .header-stat-val {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-main);
      white-space: nowrap;
    }

    .header-stat-pill.pill-masuk .header-stat-val { color: var(--accent-strong); }
    .header-stat-pill.pill-keluar .header-stat-val { color: var(--danger); }

    @media (max-width: 900px) {
      .header-stats {
        gap: 6px;
      }
      .header-stat-pill {
        padding: 4px 8px;
        gap: 5px;
      }
      .header-stat-pill i {
        font-size: 13px;
      }
      .header-stat-label {
        display: none;
      }
      .header-stat-val {
        font-size: 12px;
      }
    }

    /* === CONNECTION STATUS DOT === */
    .brand-link {
      position: relative;
      display: inline-flex;
    }

    .status-dot {
      position: absolute;
      bottom: 1px;
      right: 1px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--accent);
      border: 2px solid var(--surface);
      pointer-events: none;
    }

    .connection-status.offline .status-dot {
      background: var(--danger);
    }

    .status-badge .queue-count {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      margin-left: 4px;
      color: var(--danger);
    }

    /* === PENDING ITEM (offline modal) === */
    .pending-item {
      padding: var(--sp-3) var(--sp-4);
      border-radius: var(--r-md);
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .pending-item + .pending-item { margin-top: var(--sp-2); }

    /* === CHART SECTION === */
    .chart-section { margin-bottom: var(--sp-8); }
    .chart-container-card { padding: var(--sp-6); }
    .chart-wrapper {
      height: 320px;
      position: relative;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      margin-top: var(--sp-4);
    }
    .chart-wrapper canvas {
      max-width: 100% !important;
    }

    .stats-overview {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--sp-4);
      margin-bottom: var(--sp-6);
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: var(--sp-6);
      box-shadow: none;
      min-height: 160px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .stat-card-body {
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
      flex: 1;
    }

    .stat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--sp-3);
      margin-bottom: var(--sp-3);
    }

    .stat-card-title,
    .stat-card-note {
      color: var(--text-muted);
      font-size: 13px;
    }

    .stat-card-value {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: var(--tracking-tight);
      color: var(--text-main);
    }

    .health-card {
      grid-column: 1 / -1;
      min-height: auto;
      padding: var(--sp-4) var(--sp-6);
    }

    .health-card .stat-card-header {
      margin-bottom: var(--sp-2);
    }

    .health-card .stat-card-body {
      gap: var(--sp-2);
    }

    .progress-bar {
      height: 8px;
      border-radius: var(--r-pill);
      background: var(--accent-tint);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      width: 0;
      border-radius: var(--r-pill);
      background: var(--accent);
      transform-origin: left center;
    }

    /* Stat card interactive (menunggak — clickable WA copy) */
    .stat-card-interactive {
      cursor: pointer;
    }

    .stat-card-interactive-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .stat-wa-badge {
      font-size: 10px;
      padding: 2px 6px;
      background: var(--accent-tint);
      color: var(--accent-strong);
    }

    .stat-arrears-val { color: var(--warning); }
    .stat-danger-val  { color: var(--danger); }

    .stat-card-note {
      font-size: 12.5px;
      line-height: 1.5;
    }

    /* === HERO METRIC UPDATE ANIMATION === */
    @keyframes valFlash {
      0% {
        opacity: 0.6;
        transform: scale(0.985);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    .val-flash {
      display: inline-block;
      animation: valFlash 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @media (prefers-reduced-motion: reduce) {
      .val-flash {
        animation: none !important;
      }
    }
  }
</style>
