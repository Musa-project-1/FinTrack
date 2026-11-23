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
    /* === HYBRID KINETIC ADMIN SIGN-IN SHEET (#modal-login) === */

    #modal-login:modal {
      overscroll-behavior: contain;
    }

    #modal-login::backdrop {
      overflow: hidden;
      overscroll-behavior: contain;
    }

    #modal-login .auth-login-sheet {
      width: min(440px, calc(100vw - 28px));
      max-width: 100%;
      padding: 0;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: var(--shadow-pop);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #modal-login .auth-sheet-header {
      padding: 18px 20px 16px;
      align-items: flex-start;
      gap: 12px;
      background:
        radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%),
        var(--surface);
    }

    #modal-login .auth-header-main {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 0;
    }

    #modal-login #badge-admin-login.auth-header-emblem {
      width: 42px;
      height: 42px;
      min-width: 42px;
      min-height: 42px;
      border-radius: 13px;
      background: var(--accent-tint);
      border: 1px solid var(--accent-border);
      color: var(--accent-strong);
      display: grid;
      place-items: center;
      font-size: 20px;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
      transition: transform 180ms var(--hybrid-ease-spring), background-color 180ms ease, border-color 180ms ease;
    }

    #modal-login #badge-admin-login.auth-header-emblem:hover {
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      border-color: var(--accent);
    }

    #modal-login #badge-admin-login.auth-header-emblem:active {
      transform: scale(0.93);
    }

    #modal-login .auth-header-copy {
      min-width: 0;
    }

    #modal-login .auth-header-copy h2 {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.25;
      color: var(--text-main);
      margin: 0;
    }

    #modal-login .auth-header-copy p {
      margin: 3px 0 0;
      font-size: 0.78125rem;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.45;
    }

    #modal-login .auth-sheet-header .close-modal-btn {
      min-width: 34px;
      min-height: 34px;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      margin-top: -1px;
    }

    #modal-login .auth-sheet-body {
      padding: 18px 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    #modal-login .auth-group-context {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 13px;
      border-radius: 13px;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }

    #modal-login .auth-group-context-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    #modal-login .auth-context-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-tint);
      flex-shrink: 0;
    }

    #modal-login .auth-group-context-meta {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    #modal-login .auth-context-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-muted);
      line-height: 1.2;
    }

    #modal-login .auth-context-name {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #modal-login .auth-role-pill {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 4px 9px;
      border-radius: 999px;
      background: var(--accent-tint);
      color: var(--accent-strong);
      border: 1px solid var(--accent-border);
      white-space: nowrap;
      flex-shrink: 0;
    }

    #modal-login .auth-inline-alert {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
      color: var(--danger);
      font-size: 12.5px;
      font-weight: 600;
      line-height: 1.45;
      animation: auth-alert-shake 280ms var(--hybrid-ease-spring);
    }

    #modal-login .auth-inline-alert[hidden] {
      display: none;
    }

    #modal-login .auth-inline-alert i {
      font-size: 16px;
      margin-top: 1px;
      flex-shrink: 0;
    }

    @keyframes auth-alert-shake {
      0%, 100% { translate: 0 0; }
      25% { translate: -4px 0; }
      65% { translate: 3px 0; }
    }

    #modal-login .auth-modal-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    #modal-login .auth-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    #modal-login .auth-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    #modal-login .auth-label-row label {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
      margin: 0;
    }

    #modal-login .auth-field-badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 3px 8px;
      line-height: 1.4;
    }

    #modal-login .auth-capslock-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: var(--warning);
      background: var(--warning-bg);
      border: 1px solid var(--warning-border);
      border-radius: 6px;
      padding: 3px 8px;
      line-height: 1.4;
    }

    #modal-login .auth-capslock-pill[hidden] {
      display: none;
    }

    #modal-login .auth-input-shell {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 0 6px 0 13px;
      border-radius: 13px;
      background: var(--surface-2);
      border: 1.5px solid var(--border);
      transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
    }

    #modal-login .auth-input-shell:hover:not(:focus-within) {
      border-color: var(--border-strong);
    }

    #modal-login .auth-input-shell:has(.auth-input:is(:autofill, :-webkit-autofill)) {
      background: var(--surface);
      border-color: var(--accent-border);
    }

    #modal-login .auth-input-shell:focus-within {
      background: var(--surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-tint);
    }

    #modal-login .auth-input-shell:has(input:user-invalid),
    #modal-login .auth-input-shell:has(input[aria-invalid="true"]) {
      border-color: var(--danger);
      box-shadow: 0 0 0 3px var(--danger-bg);
    }

    #modal-login .auth-input-icon {
      display: grid;
      place-items: center;
      font-size: 17px;
      color: var(--text-muted);
      flex-shrink: 0;
      transition: color 180ms ease;
    }

    #modal-login .auth-input-shell:focus-within .auth-input-icon {
      color: var(--accent-strong);
    }

    #modal-login .auth-input-shell:has(input[aria-invalid="true"]) .auth-input-icon {
      color: var(--danger);
    }

    #modal-login .auth-input {
      flex: 1;
      min-width: 0;
      width: 100%;
      min-height: 44px;
      padding: 10px 6px 10px 0;
      margin: 0;
      border: 0;
      box-shadow: none;
      background: transparent;
      color: var(--text-main);
      font: inherit;
      font-size: max(1rem, 1em);
      font-weight: 600;
      line-height: 1.4;
      outline: none;
    }

    #modal-login .auth-input:is(:focus, :focus-visible) {
      outline: none;
      box-shadow: none;
    }

    #modal-login .auth-input::placeholder {
      color: var(--text-faint);
      font-weight: 500;
    }

    #modal-login .auth-input:is(:autofill, :-webkit-autofill),
    #modal-login .auth-input:is(:autofill, :-webkit-autofill):is(:hover, :focus, :focus-visible) {
      border-radius: 8px;
      box-shadow: inset 0 0 0 100vmax var(--surface);
      -webkit-text-fill-color: var(--text-main);
      caret-color: var(--text-main);
      outline: none;
    }

    #modal-login .auth-pwd-toggle {
      position: static;
      transform: none;
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      border-radius: 10px;
      background: transparent;
      border: 0;
      color: var(--text-muted);
      display: grid;
      place-items: center;
      font-size: 18px;
      cursor: pointer;
      flex-shrink: 0;
      transition: background-color 150ms ease, color 150ms ease;
    }

    #modal-login .auth-pwd-toggle:hover {
      background: var(--surface-3);
      color: var(--text-main);
    }

    #modal-login .auth-pwd-toggle[aria-pressed="true"] {
      background: var(--accent-tint);
      color: var(--accent-strong);
    }

    #modal-login .auth-pwd-toggle:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    #modal-login .auth-submit-btn {
      width: 100%;
      min-height: 48px;
      margin-top: 2px;
      padding: 0 18px;
      border-radius: 13px;
      border: 1px solid var(--accent);
      background: var(--accent);
      color: var(--accent-ink);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.01em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--accent) 45%, transparent);
      transition: background-color 180ms ease, border-color 180ms ease, transform 180ms var(--hybrid-ease-spring), box-shadow 180ms ease;
    }

    #modal-login .auth-submit-btn:hover:not(:disabled) {
      background: var(--accent-strong);
      border-color: var(--accent-strong);
      box-shadow: 0 10px 24px -6px color-mix(in srgb, var(--accent-strong) 50%, transparent);
    }

    #modal-login .auth-submit-btn:active:not(:disabled) {
      transform: scale(0.985);
    }

    #modal-login .auth-submit-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    #modal-login .auth-submit-btn:disabled {
      opacity: 0.72;
      cursor: wait;
    }

    #modal-login .auth-sheet-footer {
      background: var(--surface-2);
      padding: 12px 20px;
      gap: 12px;
    }

    #modal-login .auth-footer-trust {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-muted);
    }

    #modal-login .auth-footer-trust i {
      font-size: 14px;
      color: var(--accent-strong);
      flex-shrink: 0;
    }

    #modal-login .auth-footer-trust span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #modal-login .auth-sheet-footer .auth-cancel-link {
      min-width: auto;
      min-height: 36px;
      padding: 0 12px;
      border-radius: 9px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
    }

    #modal-login .auth-sheet-footer .auth-cancel-link:hover {
      background: var(--surface-3);
      border-color: var(--border-strong);
      color: var(--text-main);
    }

    #modal-login .auth-sheet-footer .auth-cancel-link:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    @media (max-width: 768px) {
      #modal-login.hybrid-dialog[open] .auth-login-sheet {
        width: 100%;
        max-width: 100%;
        max-height: 92dvh;
        border-radius: 20px 20px 0 0;
      }

      #modal-login .auth-sheet-header {
        padding: 4px 16px 14px;
      }

      #modal-login .auth-sheet-header .close-modal-btn {
        min-width: 44px;
        min-height: 44px;
        width: 44px;
        height: 44px;
      }

      #modal-login .auth-sheet-body {
        padding: 16px;
        gap: 14px;
      }

      #modal-login .auth-input-shell,
      #modal-login .auth-submit-btn {
        min-height: 50px;
      }

      #modal-login .auth-pwd-toggle {
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
      }

      #modal-login .auth-sheet-footer {
        padding: 12px 16px;
      }

      #modal-login .auth-sheet-footer .auth-cancel-link {
        min-height: 44px;
        padding: 0 14px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #modal-login .auth-inline-alert {
        animation: none;
      }

      #modal-login #badge-admin-login.auth-header-emblem,
      #modal-login .auth-input-shell,
      #modal-login .auth-input-icon,
      #modal-login .auth-pwd-toggle,
      #modal-login .auth-submit-btn,
      #modal-login .auth-sheet-footer .auth-cancel-link {
        transition: none;
      }
    }
  }
</style>
