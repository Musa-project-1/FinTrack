<style>
  :global {
    /* =========================================================================
       FINKAS — Interactive Landing Sections (Split Ledger Dossier, Matrix, Simulator)
       Loaded ONLY by onboarding.html.
       ========================================================================= */

    /* ── Shared Section Layout & Header Atmosphere ─────────────────────────── */
    .landing-section {
      max-width: var(--lp-content-max);
      margin: 0 auto;
      padding: 76px 20px;
    }

    .section-header {
      position: relative;
      z-index: 1;
      text-align: center;
      max-width: 620px;
      margin: 0 auto 36px;
      padding: 14px 20px;
    }

    .section-header::before {
      content: '';
      position: absolute;
      inset: -38px -64px;
      background: radial-gradient(
        ellipse closest-side at 50% 50%,
        rgba(var(--lp-header-mist-rgb), 0.78) 0%,
        rgba(var(--lp-header-mist-rgb), 0.56) 34%,
        rgba(var(--lp-header-mist-rgb), 0.22) 66%,
        rgba(var(--lp-header-mist-rgb), 0) 100%
      );
      pointer-events: none;
      z-index: -1;
    }

    @media (max-width: 720px) {
      .section-header::before {
        inset: -24px -10px;
      }
    }

    .section-header h2 {
      font-family: var(--lp-font-display);
      font-size: clamp(28px, 3.8vw, 40px);
      font-weight: 300;
      line-height: 1.08;
      letter-spacing: var(--lp-tracking-display);
      color: var(--lp-ink);
      margin-bottom: 10px;
      text-shadow: 0 1px 14px var(--lp-text-halo);
    }

    .section-header p {
      font-size: 15px;
      color: var(--lp-body-onstage);
      line-height: 1.6;
      text-shadow: 0 1px 14px var(--lp-text-halo);
    }

    /* ── Split Ledger Dossier — Indeks Kemampuan (#fitur) ───────────────────── */
    .dossier-shell {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
      background: var(--lp-footer-glass);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid var(--lp-line);
      border-radius: var(--lp-r-stage);
      box-shadow: inset 0 1px 0 var(--lp-inner-highlight), var(--lp-card-shadow);
      overflow: hidden;
    }

    .dossier-list {
      position: relative;
      padding: 10px 0;
      display: flex;
      flex-direction: column;
    }

    .dossier-indicator {
      position: absolute;
      left: 0;
      top: 0;
      width: 2.5px;
      height: var(--ind-h, 64px);
      background: var(--lp-paid);
      border-radius: 0 2px 2px 0;
      pointer-events: none;
      transform: translate3d(0, var(--ind-y, 10px), 0);
      transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), height 0.34s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .dossier-row {
      width: 100%;
      padding: 19px 26px 19px 28px;
      border: none;
      border-bottom: 1px solid var(--lp-line-soft);
      background: transparent;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0;
      transition: background-color 0.2s ease;
    }

    .dossier-row:last-of-type {
      border-bottom: none;
    }

    .dossier-row:hover {
      background: rgba(128, 128, 128, 0.04);
    }

    .dossier-row-head {
      display: flex;
      align-items: baseline;
      gap: 14px;
    }

    .dossier-num {
      font-family: var(--lp-font-mono);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.12em;
      color: var(--lp-ink-faint);
      flex-shrink: 0;
      transition: color 0.2s ease;
    }

    .dossier-title {
      font-family: var(--lp-font-display);
      font-size: clamp(19px, 2.1vw, 24px);
      font-weight: 300;
      line-height: 1.2;
      letter-spacing: var(--lp-tracking-tight);
      color: var(--lp-ink);
      opacity: 0.68;
      transition: opacity 0.22s ease;
    }

    .dossier-row:hover .dossier-title {
      opacity: 0.86;
    }

    .dossier-row.is-active .dossier-title {
      opacity: 1;
    }

    .dossier-row.is-active .dossier-num {
      color: var(--lp-paid);
    }

    .dossier-body {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.30s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .dossier-row.is-active .dossier-body {
      grid-template-rows: 1fr;
    }

    .dossier-body-inner {
      overflow: hidden;
      min-height: 0;
      padding-left: 29px;
    }

    .dossier-desc {
      margin-top: 9px;
      font-size: 13.5px;
      line-height: 1.58;
      color: var(--lp-ink-2);
    }

    .dossier-tag {
      display: inline-block;
      margin-top: 8px;
      font-family: var(--lp-font-mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.11em;
      text-transform: uppercase;
      color: var(--lp-paid);
    }

    .dossier-tag.is-warm {
      color: var(--lp-warm);
    }

    .dossier-stage {
      position: relative;
      border-left: 1px solid var(--lp-line-soft);
      background: var(--lp-surface-solid);
      padding: 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 20px;
      min-height: 410px;
    }

    .specimen-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--lp-line-soft);
      font-family: var(--lp-font-mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: var(--lp-tracking-eyebrow);
      text-transform: uppercase;
      color: var(--lp-ink-faint);
    }

    .specimen-counter {
      color: var(--lp-ink-2);
    }

    .specimen-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .specimen-pane {
      display: none;
      flex-direction: column;
      gap: 16px;
    }

    .specimen-pane.is-active {
      display: flex;
      animation: lp-specimen-in 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes lp-specimen-in {
      0% {
        opacity: 0;
        transform: translate3d(0, 10px, 0);
      }
      100% {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    .specimen-heading {
      font-family: var(--lp-font-display);
      font-size: 22px;
      font-weight: 300;
      line-height: 1.2;
      color: var(--lp-ink);
    }

    .specimen-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .specimen-step-btn {
      padding: 6px 11px;
      border-radius: var(--lp-r-pill);
      border: 1px solid var(--lp-line);
      background: transparent;
      color: var(--lp-ink-2);
      font-family: var(--lp-font-mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
    }

    .specimen-step-btn.is-active {
      background: var(--lp-paid-bg);
      border-color: var(--lp-paid-border);
      color: var(--lp-paid);
    }

    .specimen-lines {
      display: flex;
      flex-direction: column;
      border-top: 1px solid var(--lp-line-soft);
    }

    .specimen-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 11px 0;
      border-bottom: 1px solid var(--lp-line-soft);
      font-size: 13px;
      color: var(--lp-ink);
    }

    .specimen-line.is-double {
      border-top: 2px solid var(--lp-line);
      border-bottom: 2px solid var(--lp-line);
      font-weight: 600;
      padding: 13px 0;
    }

    .specimen-mono {
      font-family: var(--lp-font-mono);
      font-size: 11.5px;
      color: var(--lp-ink-2);
    }

    .specimen-val {
      font-family: var(--lp-font-mono);
      font-size: 12.5px;
      font-weight: 500;
      color: var(--lp-ink);
    }

    .specimen-val.is-paid { color: var(--lp-paid); }
    .specimen-val.is-warm { color: var(--lp-warm); }
    .specimen-val.is-danger { color: var(--lp-danger); }

    .specimen-wa-pre {
      margin: 0;
      padding: 16px;
      border-radius: var(--lp-r-btn);
      background: var(--lp-surface);
      border: 1px solid var(--lp-line-soft);
      font-family: var(--lp-font-mono);
      font-size: 11.5px;
      line-height: 1.65;
      color: var(--lp-ink);
      white-space: pre-wrap;
    }

    .specimen-action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    .specimen-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 36px;
      padding: 0 14px;
      border-radius: var(--lp-r-btn);
      border: 1px solid var(--lp-line);
      background: var(--lp-surface);
      color: var(--lp-ink);
      font-family: var(--lp-font-mono);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
    }

    .specimen-btn:hover {
      background: var(--lp-surface-2);
    }

    .specimen-btn.is-done {
      background: var(--lp-paid-bg);
      border-color: var(--lp-paid-border);
      color: var(--lp-paid);
    }

    .specimen-status-tag {
      font-family: var(--lp-font-mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.1em;
      padding: 3px 9px;
      border-radius: var(--lp-r-pill);
      border: 1px solid var(--lp-warm-border);
      background: var(--lp-warm-bg);
      color: var(--lp-warm);
      transition: background-color 0.24s ease, border-color 0.24s ease, color 0.24s ease;
    }

    .specimen-status-tag.is-synced {
      border-color: var(--lp-paid-border);
      background: var(--lp-paid-bg);
      color: var(--lp-paid);
    }

    .specimen-foot-note {
      padding-top: 12px;
      border-top: 1px solid var(--lp-line-soft);
      font-family: var(--lp-font-mono);
      font-size: 10.5px;
      letter-spacing: 0.08em;
      color: var(--lp-ink-2);
    }

    /* ── 12-Month Matrix (#matriks) ────────────────────────────────────────── */
    .matrix-scroll-wrap {
      position: relative;
    }

    .matrix-card {
      background: var(--lp-footer-glass);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--lp-line-soft);
      border-radius: var(--lp-r-card);
      box-shadow: inset 0 1px 0 var(--lp-inner-highlight), var(--lp-card-shadow);
      padding: 24px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .matrix-scroll-hint {
      display: none;
      text-align: center;
      font-family: var(--lp-font-mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--lp-ink);
      background: var(--lp-nav-glass);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--lp-line-soft);
      border-radius: var(--lp-r-pill);
      padding: 6px 14px;
      width: fit-content;
      margin: 12px auto 0;
    }

    .matrix-table {
      width: 100%;
      min-width: 720px;
      border-collapse: collapse;
      font-size: 12px;
    }

    .matrix-table th,
    .matrix-table td {
      padding: 10px 6px;
      border: 1px solid var(--lp-line-soft);
      text-align: center;
      transition: background-color 0.18s ease, color 0.18s ease;
    }

    .matrix-table th {
      background: var(--lp-surface-2);
      font-family: var(--lp-font-mono);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: var(--lp-tracking-eyebrow);
      color: var(--lp-ink-2);
    }

    .matrix-table th.is-col-active {
      background: var(--lp-surface-solid);
      color: var(--lp-ink);
    }

    .matrix-table td:first-child {
      text-align: left;
      font-family: var(--lp-font-sans);
      font-weight: 500;
      color: var(--lp-ink);
      padding-left: 12px;
      min-width: 148px;
      background: var(--lp-surface);
    }

    .matrix-table td.is-col-active,
    .matrix-table tr.is-row-active td {
      background: color-mix(in oklab, var(--lp-surface-2) 55%, transparent);
    }

    .matrix-table tr.is-row-active td:first-child {
      background: color-mix(in oklab, var(--lp-surface-2) 68%, var(--lp-surface));
      color: var(--lp-ink);
    }

    .stamp-btn {
      position: relative;
      overflow: visible;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 52px;
      height: 24px;
      padding: 0 8px;
      border-radius: var(--lp-r-pill);
      font-family: var(--lp-font-mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: opacity var(--lp-t-state), background-color var(--lp-t-state), color var(--lp-t-state), border-color var(--lp-t-state), transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .stamp-btn::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: inherit;
      border: 1.5px solid currentColor;
      opacity: 0;
      pointer-events: none;
    }

    .stamp-btn.is-paid {
      background: var(--lp-paid-bg);
      color: var(--lp-paid);
      border: 1px solid var(--lp-paid-border);
    }

    .stamp-btn.is-unpaid {
      background: transparent;
      color: var(--lp-danger);
      border: 1px solid var(--lp-danger-border);
      font-size: 12px;
    }

    .stamp-btn.is-toggled {
      animation: lp-stamp-fade 0.2s ease both;
    }

    .stamp-btn.is-ink-ripple {
      animation: lp-stamp-press 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .stamp-btn.is-stamped-in {
      animation: lp-stamp-thud 340ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .stamp-btn.is-ink-ripple::after,
    .stamp-btn.is-stamped-in::after {
      animation: lp-ink-ring 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    @keyframes lp-ink-ring {
      0% { transform: scale(0.82); opacity: 0.48; }
      100% { transform: scale(1.62); opacity: 0; }
    }

    @keyframes lp-stamp-press {
      0% { transform: scale(0.92); }
      100% { transform: scale(1); }
    }

    @keyframes lp-stamp-thud {
      0% { transform: scale(1.55) rotate(-10deg); opacity: 0.45; }
      65% { transform: scale(0.95) rotate(1deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }

    .ledger-impulse-dot {
      position: fixed;
      left: 0;
      top: 0;
      width: 9px;
      height: 9px;
      margin: -4.5px 0 0 -4.5px;
      border-radius: var(--lp-r-pill);
      background: var(--lp-paid);
      pointer-events: none;
      z-index: 90;
    }

    .ledger-impulse-dot.is-neg {
      background: var(--lp-danger);
    }

    .stamp-libur {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 52px;
      height: 24px;
      padding: 0 8px;
      border-radius: var(--lp-r-pill);
      font-family: var(--lp-font-mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: var(--lp-surface-2);
      color: var(--lp-ink-faint);
    }
  }
</style>
