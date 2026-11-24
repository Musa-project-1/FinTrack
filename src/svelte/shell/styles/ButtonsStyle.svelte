<style>
  :global {
    /* === BUTTONS ===
       Tactile precision: hover changes surface/border tone, it never lifts the
       element. No gradients, no drop shadows, one accent, one danger. */

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      border: 1px solid transparent;
      border-radius: var(--r-md);
      cursor: pointer;
      text-align: center;
      min-height: 40px;
      transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform 0.18s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .btn:active:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      transform: scale(0.97);
      transition-duration: 0.1s;
    }

    .btn:disabled,
    .btn[aria-disabled="true"] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn[aria-busy="true"] {
      min-width: var(--btn-lock-w, 0px);
      opacity: 1;
      cursor: wait;
    }

    .btn-inline-spin {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, currentColor 32%, transparent);
      border-top-color: currentColor;
      flex-shrink: 0;
      animation: keel-spin 560ms linear infinite;
    }

    .btn:disabled:hover,
    .btn[aria-disabled="true"]:hover,
    .btn[aria-busy="true"]:hover,
    .btn:disabled:active,
    .btn[aria-disabled="true"]:active,
    .btn[aria-busy="true"]:active {
      transform: none !important;
    }

    /* --- Primary: the single accent, solid --- */
    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-ink);
    }

    .btn-primary:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--accent-strong);
      border-color: var(--accent-strong);
    }

    /* --- Secondary: raised neutral --- */
    .btn-secondary {
      background: var(--surface-2);
      border-color: var(--border);
      color: var(--text-main);
    }

    .btn-secondary:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--surface-3);
      border-color: var(--border-strong);
    }

    /* --- Outline: hairline frame --- */
    .btn-outline {
      background: transparent;
      border-color: var(--border-strong);
      color: var(--text-main);
    }

    .btn-outline:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--surface-2);
      border-color: var(--text-muted);
    }

    /* --- Destructive, inline: coral outline (e.g. inside the edit modal) --- */
    .btn-danger {
      background: transparent;
      border-color: var(--danger-border);
      color: var(--danger);
      padding: 6px 12px;
      font-size: 13px;
    }

    .btn-danger:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--danger-bg);
      border-color: var(--danger);
    }

    .btn-danger-outline {
      background: transparent;
      border-color: var(--danger-border);
      color: var(--danger);
    }

    .btn-danger-outline:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--danger-bg);
      border-color: var(--danger);
    }

    /* --- Destructive, terminal: coral solid. The ONLY filled coral in the app. --- */
    .btn-danger-solid {
      background: var(--danger);
      border-color: var(--danger);
      color: var(--danger-ink);
    }

    .btn-danger-solid:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--danger-strong);
      border-color: var(--danger-strong);
    }

    /* --- Hold to Confirm on Destructive Terminal Actions --- */
    .btn-hold-to-confirm {
      position: relative;
      overflow: hidden;
      isolation: isolate;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }

    .btn-hold-to-confirm .hold-fill {
      position: absolute;
      inset: 0;
      background: var(--danger-strong);
      clip-path: inset(0 100% 0 0);
      transition: clip-path 0.2s cubic-bezier(0.23, 1, 0.32, 1);
      z-index: 1;
      pointer-events: none;
    }

    .btn-hold-to-confirm.is-holding .hold-fill {
      clip-path: inset(0 0 0 0);
      transition: clip-path 1.1s linear;
    }

    .btn-hold-to-confirm .hold-label {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      pointer-events: none;
      width: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
      .btn-hold-to-confirm .hold-fill {
        transition: none !important;
      }
    }

    .btn-slate-solid {
      background: var(--surface-3);
      border-color: var(--border-strong);
      color: var(--text-main);
    }

    .btn-slate-solid:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--surface-2);
    }

    .btn-full-submit {
      width: 100%;
    }

    /* --- Password peek: a quiet in-field affordance --- */
    .btn-pwd-peek {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: var(--r-sm);
      color: var(--text-muted);
      cursor: pointer;
      transition: color var(--t-fast), background var(--t-fast);
    }

    .btn-pwd-peek:hover {
      color: var(--text-main);
      background: var(--surface-2);
    }

    /* === WHATSAPP REMINDER ===
       Deliberately NOT WhatsApp green — the glyph carries the meaning, and the
       neutral hairline keeps the single-accent discipline intact. */
    .btn-wa-reminder {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--surface-2);
      color: var(--text-main);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      cursor: pointer;
      font-weight: 600;
      transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform 0.18s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .btn-wa-reminder i {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }

    .btn-wa-reminder:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--accent-tint);
      border-color: var(--accent-border);
      color: var(--accent-strong);
    }

    .btn-wa-reminder:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) i {
      color: var(--accent-strong);
    }

    .btn-wa-reminder:active:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      transform: scale(0.97);
      transition-duration: 0.1s;
    }

    /* Compact icon-only variant (card header) */
    .btn-wa-reminder-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      width: 40px;
      height: 40px;
      flex: 0 0 40px;
      box-sizing: border-box;
      background: var(--surface-2);
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      cursor: pointer;
      transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform 0.18s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .btn-wa-reminder-icon:hover:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      background: var(--accent-tint);
      border-color: var(--accent-border);
      color: var(--accent-strong);
    }

    .btn-wa-reminder-icon:active:not(:disabled):not([aria-disabled="true"]):not([aria-busy="true"]) {
      transform: scale(0.97);
      transition-duration: 0.1s;
    }

    .btn-wa-reminder-icon i {
      font-size: 18px;
      line-height: 1;
    }

    /* === QUIET TEXT LINKS === */
    .btn-stealth-link,
    .btn-stealth-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 14px;
      border-radius: var(--r-pill);
      transition: color var(--t-fast), background var(--t-fast), border-color var(--t-fast);
      opacity: 0.85;
      text-decoration: none;
    }

    .btn-stealth-link:hover,
    .btn-stealth-pill:hover {
      opacity: 1;
      color: var(--text-main);
      background: var(--surface-2);
      border-color: var(--border);
    }

    /* === ROLE VISIBILITY === */
    body:not(.admin-session) .admin-session-only { display: none !important; }
    body:not(.admin-mode) .admin-only { display: none !important; }
    body:not(.superadmin-mode) .superadmin-only { display: none !important; }

    /* === TABLE CARD HEADER ===
       Kept here so the single-row header layout wins over the responsive
       overrides in tables.css / responsive-*.css. */
    .table-card .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-header-controls {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      flex-wrap: nowrap;
      flex-shrink: 0;
    }

    /* === LIQUID SAVE BUTTON (keel) ===
       Teal liquid rises during the save, tops off + draws a check on success,
       recedes on failure. Progress lives in the registered custom property --p
       (0..1) so a single JS write animates via CSS transition — no rAF loop. */
    @property --p {
      syntax: "<number>";
      inherits: true;
      initial-value: 0;
    }

    .btn-liquid {
      position: relative;
      overflow: hidden;
      isolation: isolate;
      gap: 7px;
      --p: 0;
      --keel-dur: 600ms;
    }

    /* Hide legacy fluid overlay cleanly; states switch via polarity flip & center medallion. */
    .btn-liquid .keel-fill {
      display: none;
    }

    /* Lock outer button width across states so shorter labels never shrink the button. */
    .btn.btn-liquid:is(.is-saving, .is-done, .is-error):disabled,
    .btn.btn-liquid:is(.is-saving, .is-done, .is-error)[aria-busy="true"] {
      opacity: 1;
      min-width: var(--btn-lock-w, 0px);
    }
    .btn.btn-liquid.is-saving:disabled,
    .btn.btn-liquid.is-saving[aria-busy="true"] {
      cursor: wait;
    }

    /* High-contrast polarity flip while saving: light recessed outlined pill. */
    .btn-liquid.is-saving {
      background: var(--surface-2);
      border: 1.5px solid var(--accent);
      color: var(--accent-strong);
    }
    body.dark-mode .btn-liquid.is-saving {
      background: var(--surface-3);
      border-color: #60a5fa;
      color: #93c5fd;
    }

    /* Solid Royal Cobalt vault + ring halo on success. */
    .btn-liquid.is-done {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
      border-color: transparent;
      color: #ffffff;
      box-shadow: 0 0 0 4px var(--accent-tint);
    }

    .btn-liquid.is-error {
      background: var(--danger);
      border-color: var(--danger);
      color: var(--danger-ink);
    }

    .btn-liquid .keel-label {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      white-space: nowrap;
    }

    .btn-liquid.is-saving .keel-label::before {
      content: "";
      width: 15px;
      height: 15px;
      border-radius: 50%;
      border: 2px solid var(--accent-border);
      border-top-color: var(--accent);
      flex-shrink: 0;
      animation: keel-spin 560ms linear infinite;
    }
    body.dark-mode .btn-liquid.is-saving .keel-label::before {
      border-top-color: #60a5fa;
    }

    /* Solid white circle disc drawing Royal Blue checkmark inline on .is-done. */
    .btn-liquid .keel-check {
      display: none;
      order: -1;
      position: relative;
      z-index: 2;
      width: 19px;
      height: 19px;
      padding: 3px;
      border-radius: 999px;
      background: #ffffff;
      flex-shrink: 0;
      pointer-events: none;
    }
    .btn-liquid.is-done .keel-check {
      display: inline-grid;
      place-items: center;
    }
    .btn-liquid .keel-check svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .btn-liquid .keel-check path {
      fill: none;
      stroke: var(--accent-strong);
      stroke-width: 3.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 24;
      stroke-dashoffset: 24;
    }
    .btn-liquid.is-done .keel-check path {
      animation: keel-draw 220ms 30ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
    }

    /* Coral danger polarity flip for destructive terminal confirmations (.btn-danger-solid.btn-liquid). */
    .btn-danger-solid.btn-liquid.is-saving,
    body.dark-mode .btn-danger-solid.btn-liquid.is-saving {
      background: var(--danger-bg);
      border: 1.5px solid var(--danger);
      color: var(--danger);
    }
    .btn-danger-solid.btn-liquid.is-saving .keel-label::before,
    body.dark-mode .btn-danger-solid.btn-liquid.is-saving .keel-label::before {
      border-color: var(--danger-border);
      border-top-color: var(--danger);
    }
    .btn-danger-solid.btn-liquid.is-done {
      background: var(--danger);
      border-color: transparent;
      color: #ffffff;
      box-shadow: 0 0 0 4px var(--danger-bg);
    }
    .btn-danger-solid.btn-liquid .keel-check path {
      stroke: var(--danger);
    }

    /* Center-sheet Apple Pay / Wise verification medallion stage. */
    .pay-verified-stage {
      position: absolute;
      inset: 0;
      z-index: 30;
      display: grid;
      place-items: center;
      padding: 24px;
      border-radius: inherit;
      background: color-mix(in srgb, var(--surface) 88%, transparent);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 200ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 200ms;
    }
    :is(#modal-quickpay, #modal-transaksi, #modal-hapus, #modal-edit-transaksi, #modal-login)[data-pay-state] .pay-verified-stage {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transition: opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s;
    }
    .pay-verified-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
      max-width: 280px;
    }
    .pay-verified-medallion {
      position: relative;
      width: 64px;
      height: 64px;
      margin: 0 auto 6px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--surface-2);
      border: 2px solid var(--accent-border);
      transition: background-color 200ms ease, border-color 200ms ease, box-shadow 220ms ease;
    }
    .pay-verified-orbit {
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      border: 3px solid transparent;
      border-top-color: var(--accent);
      border-right-color: var(--accent);
      opacity: 0;
      pointer-events: none;
    }
    [data-pay-state="saving"] .pay-verified-orbit {
      opacity: 1;
      animation: keel-spin 620ms linear infinite;
    }
    .pay-verified-halo {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid var(--accent);
      opacity: 0;
      pointer-events: none;
    }
    .pay-verified-check {
      width: 30px;
      height: 30px;
      opacity: 0;
      display: block;
    }
    .pay-verified-check path {
      fill: none;
      stroke: #ffffff;
      stroke-width: 3.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 32;
      stroke-dashoffset: 32;
    }
    [data-pay-state="settled"] .pay-verified-orbit {
      opacity: 0;
      animation: none;
    }
    [data-pay-state="settled"] .pay-verified-medallion {
      background: linear-gradient(145deg, var(--accent) 0%, var(--accent-strong) 100%);
      border-color: transparent;
      box-shadow: 0 0 0 8px var(--accent-tint);
    }
    [data-pay-state="settled"][data-pay-tone="outflow"] .pay-verified-medallion {
      background: var(--text-main);
      box-shadow: 0 0 0 8px var(--surface-3);
    }
    [data-pay-tone="danger"] .pay-verified-medallion {
      border-color: var(--danger-border);
    }
    [data-pay-tone="danger"] .pay-verified-orbit {
      border-top-color: var(--danger);
      border-right-color: var(--danger);
    }
    [data-pay-tone="danger"] .pay-verified-halo {
      border-color: var(--danger);
    }
    [data-pay-state="settled"][data-pay-tone="danger"] .pay-verified-medallion {
      background: var(--danger);
      border-color: transparent;
      box-shadow: 0 0 0 8px var(--danger-bg);
    }
    [data-pay-state="settled"] .pay-verified-check {
      opacity: 1;
    }
    [data-pay-state="settled"] .pay-verified-check path {
      animation: keel-draw 280ms 50ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
    }
    .pay-verified-title {
      font-family: var(--font-display);
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-main);
    }
    .pay-verified-amount {
      display: inline-flex;
      padding: 4px 12px;
      border-radius: var(--r-pill);
      background: var(--income-bg);
      border: 1px solid var(--income-border);
      color: var(--income-strong);
      font-size: 14px;
      font-weight: 800;
    }
    [data-pay-tone="outflow"] .pay-verified-amount {
      background: var(--surface-2);
      border-color: var(--border-strong);
      color: var(--text-main);
    }
    [data-pay-tone="danger"] .pay-verified-amount {
      background: var(--danger-bg);
      border-color: var(--danger-border);
      color: var(--danger);
    }
    .pay-verified-sub {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
    }

    @media (prefers-reduced-motion: no-preference) {
      .btn-liquid.is-saving .keel-label {
        animation: keel-slot-up 180ms cubic-bezier(0.23, 1, 0.32, 1) both;
      }
      .btn-liquid.is-done {
        animation: btn-verified-pop 260ms cubic-bezier(0.23, 1, 0.32, 1) both;
      }
      .btn-liquid.is-done :is(.keel-check, .keel-label) {
        animation: keel-slot-settled 200ms cubic-bezier(0.23, 1, 0.32, 1) both;
      }
      [data-pay-state="settled"] .pay-verified-medallion {
        animation: medallion-pop 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      [data-pay-state="settled"] .pay-verified-halo {
        animation: medallion-halo 540ms cubic-bezier(0.22, 1, 0.36, 1) 40ms both;
      }
    }

    @keyframes keel-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes keel-draw {
      to { stroke-dashoffset: 0; }
    }
    @keyframes keel-slot-up {
      from { opacity: 0; transform: translateY(6px); filter: blur(1.5px); }
      to { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
    @keyframes keel-slot-settled {
      from { opacity: 0; transform: translateY(-6px) scale(0.95); filter: blur(1.5px); }
      to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    @keyframes btn-verified-pop {
      0% { transform: scale(0.95); }
      55% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }
    @keyframes medallion-pop {
      0% { transform: scale(0.88); }
      58% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    @keyframes medallion-halo {
      0% { opacity: 0.78; transform: scale(0.84); }
      100% { opacity: 0; transform: scale(1.56); }
    }

    @media (prefers-reduced-motion: reduce) {
      .btn-liquid.is-saving .keel-label::before,
      [data-pay-state="saving"] .pay-verified-orbit { animation-duration: 1.4s; }
      .btn-liquid .keel-check path,
      [data-pay-state="settled"] .pay-verified-check path { animation: none; }
      .btn-liquid.is-done .keel-check path,
      [data-pay-state="settled"] .pay-verified-check path { stroke-dashoffset: 0; }
      .pay-verified-halo { display: none; }
    }
  }
</style>
